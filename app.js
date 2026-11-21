/* 트립메이트 — 여행 계획 + 실시간 환율 계산 */
(() => {
  "use strict";

  const CODES = Object.keys(CURRENCY_INFO);
  const FRANKFURTER_CODES = ["JPY", "THB", "IDR", "SGD", "EUR", "USD"]; // ECB 제공 통화
  const COLORS = ["#2f6fed", "#ff7a45", "#1f9d63", "#a259ff", "#f2c94c", "#667085"];
  const $ = (s) => document.querySelector(s);

  // ---------- 저장소 ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
  };

  // ---------- 날짜/숫자 ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diffDays = (a, b) => Math.round((b - a) / 86400000);
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];

  const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}원`;
  const man = (n) => {
    const a = Math.abs(n);
    if (a >= 100000000) return `${(n / 100000000).toFixed(2)}억원`;
    if (a >= 10000) return `${(n / 10000).toFixed(a >= 1000000 ? 0 : 1)}만원`;
    return won(n);
  };
  const local = (n, cur) => `${CURRENCY_INFO[cur]?.symbol ?? ""}${Math.round(n).toLocaleString("ko-KR")}`;
  const rateText = (krwPer1, cur) => {
    // 엔/동/루피아는 100단위로 보는 게 익숙함
    const unit = ["JPY", "VND", "IDR"].includes(cur) ? 100 : 1;
    const v = krwPer1 * unit;
    return { unit, text: `${v.toLocaleString("ko-KR", { maximumFractionDigits: v < 10 ? 3 : 2 })}원` };
  };
  const signed = (n, f = won) => (n > 0 ? "▲ " : n < 0 ? "▼ " : "") + f(Math.abs(n));
  const cls = (n) => (n > 0 ? "up" : n < 0 ? "down" : "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- 환율 ----------
  const Rates = {
    today: { ...FALLBACK_RATES },   // 1 통화 = ? KRW
    yesterday: {},
    series: {},                     // 코드별 최근 30여일 값 배열
    updated: null,
    source: "기본값(오프라인)",
    live: false,
  };

  async function fetchJSON(url, ms = 8000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  async function loadRates() {
    const todayIso = iso(TODAY);
    let current = null;

    // 1) 오늘 환율 (모든 통화)
    try {
      const r = await fetchJSON("https://open.er-api.com/v6/latest/KRW");
      if (r.result === "success") {
        current = {};
        CODES.forEach((c) => { if (r.rates[c]) current[c] = 1 / r.rates[c]; });
        Rates.updated = new Date(r.time_last_update_unix * 1000);
        Rates.source = "open.er-api.com";
      }
    } catch { /* 다음 소스로 */ }

    // 2) 최근 35일 시계열 (ECB 통화)
    let fxDates = [];
    try {
      const start = iso(addDays(TODAY, -35));
      const s = await fetchJSON(`https://api.frankfurter.app/${start}..?from=KRW&to=${FRANKFURTER_CODES.join(",")}`);
      fxDates = Object.keys(s.rates).sort();
      FRANKFURTER_CODES.forEach((c) => {
        Rates.series[c] = fxDates.map((d) => 1 / s.rates[d][c]).filter(Number.isFinite);
      });
      // 어제(오늘 이전 가장 최근 영업일) 환율
      const prev = fxDates.filter((d) => d < todayIso).pop();
      if (prev) FRANKFURTER_CODES.forEach((c) => { Rates.yesterday[c] = 1 / s.rates[prev][c]; });
      if (!current) {
        current = {};
        const last = fxDates[fxDates.length - 1];
        FRANKFURTER_CODES.forEach((c) => { current[c] = 1 / s.rates[last][c]; });
        Rates.updated = parse(last);
        Rates.source = "frankfurter.app";
      }
    } catch { /* 시계열 없음 */ }

    // 3) 브라우저에 매일 환율 기록 → ECB 미제공 통화(VND, TWD)의 어제 대비/추이 계산
    const hist = store.get("tm_rate_hist", {});
    if (current) hist[todayIso] = current;
    const keep = Object.keys(hist).sort().slice(-40);
    const trimmed = {}; keep.forEach((k) => (trimmed[k] = hist[k]));
    store.set("tm_rate_hist", trimmed);

    const pastDays = keep.filter((d) => d < todayIso);
    CODES.forEach((c) => {
      if (Rates.yesterday[c] == null) {
        const d = [...pastDays].reverse().find((k) => trimmed[k][c]);
        if (d) Rates.yesterday[c] = trimmed[d][c];
      }
      if (!Rates.series[c] || Rates.series[c].length < 2) {
        Rates.series[c] = keep.map((k) => trimmed[k][c]).filter(Number.isFinite);
      }
    });

    if (current) {
      Rates.today = { ...FALLBACK_RATES, ...current };
      Rates.live = true;
    }
  }

  const rate = (c, set = Rates.today) => (c === "KRW" ? 1 : set[c] ?? Rates.today[c] ?? FALLBACK_RATES[c]);

  function ratePosition(c) {
    const s = [...(Rates.series[c] || []), Rates.today[c]].filter(Number.isFinite);
    if (s.length < 5) return null;
    const min = Math.min(...s), max = Math.max(...s);
    if (max - min < 1e-12) return 0.5;
    return (Rates.today[c] - min) / (max - min);
  }

  // ---------- 계획 상태 ----------
  const destById = (id) => DESTINATIONS.find((d) => d.id === id) || DESTINATIONS[0];
  const topHotelIdx = (d) => d.hotels.reduce((b, h, i, a) => (h.share > a[b].share ? i : b), 0);

  function defaultPlan(destId = "tokyo") {
    const d = destById(destId);
    const start = addDays(TODAY, 45);
    return {
      destId: d.id, start: iso(start), end: iso(addDays(start, 3)), people: 2, rooms: 1,
      flightPrice: d.flight.avg, hotelIdx: topHotelIdx(d), level: 1, days: [], extras: [],
    };
  }

  let plan = store.get("tm_plan", null) || defaultPlan();
  const nightsOf = (p) => Math.max(0, diffDays(parse(p.start), parse(p.end)));

  function syncDays() {
    const n = nightsOf(plan) + 1;
    while (plan.days.length < n) plan.days.push([]);
    plan.days.length = n;
  }

  // ---------- 비용 계산 ----------
  function costItems(p, rateSet = Rates.today) {
    const d = destById(p.destId);
    const nights = nightsOf(p), days = nights + 1;
    const cur = d.currency;
    const hotel = d.hotels[p.hotelIdx] || d.hotels[0];
    const attrLocal = p.days.flat().reduce((s, i) => s + (d.attractions[i]?.cost || 0), 0) * p.people;
    const dailyLocal = (d.daily.food + d.daily.transport + d.daily.misc) * p.level * days * p.people;

    const items = [
      { label: "항공권", krw: p.flightPrice * p.people, note: `${won(p.flightPrice)} × ${p.people}명` },
      { label: "숙소", localAmt: hotel.price * nights * p.rooms, cur, note: `${nights}박 × ${p.rooms}실` },
      { label: "관광·입장료", localAmt: attrLocal, cur, note: `${p.days.flat().length}곳 × ${p.people}명` },
      { label: "현지 생활비", localAmt: dailyLocal, cur, note: `${days}일 × ${p.people}명` },
    ];
    const extraKrw = p.extras.reduce((s, e) => s + e.amount * rate(e.cur, rateSet), 0);
    if (p.extras.length) items.push({ label: "기타", krw: extraKrw, note: `${p.extras.length}건` });

    items.forEach((it) => { if (it.localAmt != null) it.krw = it.localAmt * rate(it.cur, rateSet); });
    const total = items.reduce((s, it) => s + it.krw, 0);
    const localTotal = items.reduce((s, it) => s + (it.localAmt || 0), 0);
    return { items, total, localTotal, cur };
  }

  // ---------- 렌더: 여행지 ----------
  function renderDestinations() {
    const m = parse(plan.start).getMonth() + 1;
    $("#destGrid").innerHTML = DESTINATIONS.map((d) => {
      const season = d.bestMonths.includes(m) ? `<span class="badge good">${m}월 추천 시즌</span>`
        : d.peakMonths.includes(m) ? `<span class="badge peak">${m}월 성수기</span>` : `<span class="badge">${m}월 비수기</span>`;
      return `<button class="dest ${d.id === plan.destId ? "on" : ""}" data-id="${d.id}">
        <div class="flag">${d.flag}</div>
        <div class="nm">${d.name}</div><div class="ct">${d.country} · ${d.flight.hours}</div>
        <div class="pr">항공권 평균 <b>${man(d.flight.avg)}</b></div>${season}
      </button>`;
    }).join("");
  }

  function renderDestInfo() {
    const d = destById(plan.destId);
    const top = d.hotels[topHotelIdx(d)];
    const dayLocal = d.daily.food + d.daily.transport + d.daily.misc;
    const rt = rateText(rate(d.currency), d.currency);
    $("#plannerTitle").textContent = `${d.flag} ${d.name}`;
    $("#destInfo").innerHTML = `
      <div class="info-head"><div class="flag">${d.flag}</div>
        <div><h3 style="margin:0">${d.name}, ${d.country}</h3>
        <div class="hint" style="margin:0">인천 출발 비행 ${d.flight.hours} · 통화 ${CURRENCY_INFO[d.currency].name}</div></div></div>
      <div class="info-stats">
        <div class="stat"><div class="k">항공권 시세(1인 왕복)</div><div class="v">${man(d.flight.low)}~${man(d.flight.high)}</div></div>
        <div class="stat"><div class="k">가장 많이 고른 숙소</div><div class="v">${top.type} · ${top.share}%</div></div>
        <div class="stat"><div class="k">하루 생활비(1인)</div><div class="v">약 ${man(dayLocal * rate(d.currency))}</div></div>
        <div class="stat"><div class="k">오늘 환율</div><div class="v">${rt.unit}${CURRENCY_INFO[d.currency].symbol} = ${rt.text}</div></div>
      </div>
      <div class="months">${Array.from({ length: 12 }, (_, i) => i + 1).map((mm) =>
        `<span class="${d.bestMonths.includes(mm) ? "good" : d.peakMonths.includes(mm) ? "peak" : ""}">${mm}월</span>`).join("")}</div>
      <p class="hint">초록 = 날씨 좋은 추천 시즌 · 주황 = 성수기(항공·숙소 가격 상승)</p>`;
  }

  // ---------- 렌더: 폼 ----------
  function renderForm() {
    const d = destById(plan.destId);
    $("#startDate").value = plan.start;
    $("#endDate").value = plan.end;
    $("#startDate").min = iso(TODAY);
    $("#endDate").min = plan.start;
    $("#people").value = plan.people;
    $("#rooms").value = plan.rooms;
    $("#flightPrice").value = plan.flightPrice;
    document.querySelectorAll("#levelSeg button").forEach((b) => b.classList.toggle("on", Number(b.dataset.level) === plan.level));
    $("#extraCur").innerHTML = `<option value="KRW">원</option><option value="${d.currency}">${d.currency}</option>`;

    const s = parse(plan.start), e = parse(plan.end), n = nightsOf(plan);
    $("#dateHint").textContent = `${s.getMonth() + 1}/${s.getDate()}(${DOW[s.getDay()]}) ~ ${e.getMonth() + 1}/${e.getDate()}(${DOW[e.getDay()]}) · ${n}박 ${n + 1}일 · 출발까지 D-${diffDays(TODAY, s)}`;

    renderFlight(); renderHotels(); renderDays(); renderDaily(); renderExtras();
  }

  function renderFlight() {
    const f = destById(plan.destId).flight;
    const lo = f.low * 0.8, hi = f.high * 1.1;
    const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
    $("#flightBar").innerHTML = `
      <div class="track"></div>
      <div class="mark tick" style="left:${pos(f.low)}%">최저 ${man(f.low)}</div>
      <div class="mark tick" style="left:${pos(f.avg)}%">평균 ${man(f.avg)}</div>
      <div class="mark tick" style="left:${pos(f.high)}%">성수기 ${man(f.high)}</div>
      <div class="pin" style="left:${pos(plan.flightPrice)}%"></div>
      <div class="mark" style="left:${pos(plan.flightPrice)}%">내 가격</div>`;
    const diff = plan.flightPrice - f.avg;
    const h = $("#flightHint");
    h.className = "hint" + (diff > f.avg * 0.15 ? " warn" : "");
    h.textContent = diff === 0 ? "평균 시세로 계산 중입니다. 실제로 찾은 가격을 입력하면 더 정확해져요."
      : diff < 0 ? `평균보다 1인 ${won(-diff)} 저렴해요 👍`
      : `평균보다 1인 ${won(diff)} 비싸요. 날짜를 바꾸거나 경유편을 비교해 보세요.`;
  }

  function renderHotels() {
    const d = destById(plan.destId);
    const top = topHotelIdx(d);
    const order = d.hotels.map((h, i) => i).sort((a, b) => d.hotels[b].share - d.hotels[a].share);
    $("#hotelList").innerHTML = order.map((i) => {
      const h = d.hotels[i];
      return `<label class="hotel ${i === plan.hotelIdx ? "on" : ""}">
        <input type="radio" name="hotel" value="${i}" ${i === plan.hotelIdx ? "checked" : ""}/>
        <div><div class="hn">${h.name}${i === top ? '<span class="top-pick">최다 선택</span>' : ""}</div>
          <div class="hm">${h.type} · ★${h.rating} · ${h.note}</div>
          <div class="share" title="선호도 ${h.share}%"><i style="width:${h.share * 2}%"></i></div>
          <div class="hm">여행자 ${h.share}%가 선택</div></div>
        <div class="hp">${man(h.price * rate(d.currency))}<small>${local(h.price, d.currency)} / 박</small></div>
      </label>`;
    }).join("");
  }

  function renderDays() {
    const d = destById(plan.destId);
    const s = parse(plan.start);
    $("#dayList").innerHTML = plan.days.map((list, di) => {
      const date = addDays(s, di);
      const tag = di === 0 ? "출국일" : di === plan.days.length - 1 ? "귀국일" : "";
      const chips = list.map((ai, ci) => {
        const a = d.attractions[ai];
        return `<span class="chip">${esc(a.name)} · ${a.cost ? local(a.cost, d.currency) : "무료"}
          <button data-day="${di}" data-chip="${ci}" aria-label="삭제">×</button></span>`;
      }).join("");
      const options = d.attractions.map((a, i) => `<option value="${i}">${esc(a.name)} (${a.cost ? man(a.cost * rate(d.currency)) : "무료"})</option>`).join("");
      return `<div class="day">
        <div class="day-head">${di + 1}일차 <span>${date.getMonth() + 1}/${date.getDate()}(${DOW[date.getDay()]}) ${tag}</span></div>
        <div class="chips">${chips || '<span class="hint" style="margin:0">아직 일정이 없어요</span>'}</div>
        <div class="day-add"><select data-day="${di}"><option value="">+ 관광지 추가</option>${options}</select></div>
      </div>`;
    }).join("");
  }

  function renderDaily() {
    const d = destById(plan.destId);
    const x = d.daily, l = plan.level, r = rate(d.currency);
    $("#dailyHint").textContent = `1인 1일 기준 식비 ${man(x.food * l * r)} · 교통 ${man(x.transport * l * r)} · 기타 ${man(x.misc * l * r)}`;
  }

  function renderExtras() {
    $("#extraList").innerHTML = plan.extras.map((e, i) =>
      `<div class="extra"><span>${esc(e.name)}</span><span>${e.cur === "KRW" ? won(e.amount) : `${local(e.amount, e.cur)} ≈ ${won(e.amount * rate(e.cur))}`}
        <button data-extra="${i}" aria-label="삭제">✕</button></span></div>`).join("");
  }

  // ---------- 요약 / 제안 ----------
  function renderSummary() {
    const d = destById(plan.destId);
    const now = costItems(plan);
    const hasY = Rates.yesterday[d.currency] != null;
    const yest = hasY ? costItems(plan, { ...Rates.today, ...Rates.yesterday }) : null;
    const delta = yest ? now.total - yest.total : 0;
    const max = Math.max(...now.items.map((i) => i.krw), 1);

    $("#summary").innerHTML = `
      <div class="total-label">${d.flag} ${d.name} ${nightsOf(plan)}박 ${nightsOf(plan) + 1}일 · ${plan.people}명 예상 총 경비</div>
      <div class="total">${won(now.total)}</div>
      <div class="per">1인당 약 ${man(now.total / plan.people)} · 현지통화 지출 ${local(now.localTotal, d.currency)}</div>
      <div class="delta">${hasY
        ? `어제 환율 기준 대비 <b class="${cls(delta)}">${delta === 0 ? "변동 없음" : signed(delta)}</b>
           <div class="hint" style="margin:2px 0 0">환율이 1% 오르면 약 ${won(now.localTotal * rate(d.currency) * 0.01)} 더 들어요</div>`
        : "어제 환율 데이터가 없어 변동을 계산할 수 없어요. 내일 다시 오면 비교돼요."}</div>
      <div class="breakdown">${now.items.map((it, i) => `
        <div class="bd"><span>${it.label} <span class="hint" style="margin:0;font-size:.78rem">${it.note}</span></span>
          <span class="amt">${won(it.krw)}</span>
          <div class="bar"><i style="width:${(it.krw / max) * 100}%;background:${COLORS[i % COLORS.length]}"></i></div></div>`).join("")}
      </div>
      <button class="btn block" id="savePlan">이 계획 저장하기</button>
      <p class="hint">${Rates.live ? `환율 출처: ${Rates.source}` : "⚠️ 실시간 환율을 불러오지 못해 기본 환율로 계산 중"}</p>`;
    $("#savePlan").onclick = savePlan;
    renderSuggestions(now);
  }

  function renderSuggestions(now) {
    const d = destById(plan.destId);
    const s = parse(plan.start);
    const m = s.getMonth() + 1;
    const out = [];
    const add = (type, html) => out.push(`<li class="${type}">${html}</li>`);

    // 출발 요일
    const dow = s.getDay();
    if ([5, 6, 0].includes(dow)) {
      add("warn", `<b>${DOW[dow]}요일 출발</b>은 항공권이 비싼 편이에요. 화~목 출발로 옮기면 약 <b>${man(plan.flightPrice * 0.12 * plan.people)}</b> 절약할 수 있어요.`);
    } else if ([2, 3, 4].includes(dow)) {
      add("good", `${DOW[dow]}요일 출발은 항공권이 저렴한 요일이에요 👍`);
    }

    // 시즌
    if (d.peakMonths.includes(m)) add("warn", `${m}월은 ${d.name} <b>성수기</b>예요. 숙소를 최대한 빨리 예약하고, 가능하면 ${d.bestMonths.filter((x) => !d.peakMonths.includes(x)).slice(0, 3).join("·")}월을 고려해 보세요.`);
    else if (d.bestMonths.includes(m)) add("good", `${m}월은 ${d.name} 여행하기 가장 좋은 시즌이에요. 인기 일정이니 예약은 서둘러 주세요.`);
    else add("", `${m}월은 비수기라 항공·숙소가 저렴한 대신 날씨를 한 번 확인하세요.`);

    // 예약 시점
    const lead = diffDays(TODAY, s);
    const long = d.flight.avg >= 800000;
    const [lo, hi] = long ? [90, 150] : [30, 60];
    if (lead < lo) add("warn", `출발까지 <b>${lead}일</b> 남았어요. ${long ? "장거리" : "단거리"} 노선은 보통 ${lo}~${hi}일 전이 가장 저렴하니 항공권부터 바로 예약하세요.`);
    else if (lead > hi) add("", `출발까지 ${lead}일 남았어요. 가격 알림을 켜두고 출발 ${hi}일 전쯤부터 집중적으로 비교하면 좋아요.`);
    else add("good", `지금(출발 ${lead}일 전)이 항공권 예약하기 좋은 타이밍이에요.`);

    // 항공권 가격
    if (plan.flightPrice > d.flight.avg * 1.15) add("warn", `입력한 항공권이 평균보다 ${Math.round((plan.flightPrice / d.flight.avg - 1) * 100)}% 비싸요. 1회 경유편이나 인근 공항 도착편도 비교해 보세요.`);

    // 숙소
    const top = topHotelIdx(d);
    const chosen = d.hotels[plan.hotelIdx];
    const nights = nightsOf(plan);
    if (plan.hotelIdx !== top) {
      const t = d.hotels[top];
      const gap = (chosen.price - t.price) * nights * plan.rooms * rate(d.currency);
      add("", `여행자들이 가장 많이 고른 숙소는 <b>${t.name}</b>(${t.share}%)예요.${gap > 0 ? ` 바꾸면 약 <b>${man(gap)}</b> 절약돼요.` : ""}`);
    }
    if (plan.rooms * 3 < plan.people) add("warn", `${plan.people}명에 객실 ${plan.rooms}개는 부족할 수 있어요. 객실 수를 확인해 주세요.`);

    // 일정 밀도
    const used = new Set(plan.days.flat());
    const unused = d.attractions.filter((_, i) => !used.has(i));
    const emptyDays = plan.days.map((l, i) => (l.length === 0 && i > 0 && i < plan.days.length - 1 ? i + 1 : null)).filter(Boolean);
    if (emptyDays.length && unused.length) add("", `${emptyDays.join(", ")}일차가 비어 있어요. 추천: <b>${unused.slice(0, 2).map((a) => a.name).join(", ")}</b>`);
    const packed = plan.days.map((l, i) => (l.length > 3 ? i + 1 : null)).filter(Boolean);
    if (packed.length) add("warn", `${packed.join(", ")}일차에 일정이 4개 이상이에요. 이동 시간을 고려해 나눠 보세요.`);
    if (plan.days.length > 1 && (plan.days[0].length > 2 || plan.days[plan.days.length - 1].length > 2)) add("warn", "출국일·귀국일은 공항 이동 때문에 일정을 1~2개로 가볍게 잡는 게 좋아요.");

    // 환율
    const pos = ratePosition(d.currency);
    const curName = CURRENCY_INFO[d.currency].name;
    if (pos != null) {
      if (pos <= 0.3) add("good", `${curName} 환율이 최근 한 달 중 <b>저렴한 편</b>이에요. 지금 환전하거나 트래블카드에 미리 충전해 두면 유리해요.`);
      else if (pos >= 0.7) add("warn", `${curName} 환율이 최근 한 달 중 <b>높은 편</b>이에요. 여러 번 나눠 환전(분할 환전)하면 위험을 줄일 수 있어요.`);
      else add("", `${curName} 환율은 최근 한 달 평균 수준이에요.`);
    }
    const yd = Rates.yesterday[d.currency];
    if (yd) {
      const pct = (Rates.today[d.currency] / yd - 1) * 100;
      if (Math.abs(pct) >= 0.3) add(pct > 0 ? "warn" : "good", `어제보다 ${curName}가 ${Math.abs(pct).toFixed(2)}% ${pct > 0 ? "올랐어요" : "내렸어요"}.`);
    }

    // 예산 비중
    const big = now.items.reduce((a, b) => (b.krw > a.krw ? b : a));
    add("", `가장 큰 지출은 <b>${big.label}</b>(${Math.round((big.krw / now.total) * 100)}%)이에요. 여기부터 줄이면 효과가 커요.`);

    $("#suggestions").innerHTML = out.join("");
  }

  // ---------- 환율 섹션 ----------
  function sparkline(arr) {
    if (arr.length < 2) return "";
    const min = Math.min(...arr), max = Math.max(...arr), w = 240, h = 44;
    const pts = arr.map((v, i) => `${((i / (arr.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - min) / (max - min || 1)) * (h - 8)).toFixed(1)}`);
    const up = arr[arr.length - 1] >= arr[0];
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="var(${up ? "--up" : "--down"})" stroke-width="2" points="${pts.join(" ")}"/></svg>`;
  }

  function renderRates() {
    const dCur = destById(plan.destId).currency;
    const order = [dCur, ...CODES.filter((c) => c !== dCur)];
    $("#rateGrid").innerHTML = order.map((c) => {
      const t = Rates.today[c], y = Rates.yesterday[c];
      const { unit, text } = rateText(t, c);
      const ch = y ? (t - y) * unit : null;
      const pct = y ? (t / y - 1) * 100 : null;
      const series = [...(Rates.series[c] || []), t];
      const pos = ratePosition(c);
      return `<div class="rate">
        <div class="rh"><span>${CURRENCY_INFO[c].name} (${c})</span><span>${unit} ${c}</span></div>
        <div class="rv">${text}</div>
        <div class="rc ${cls(ch)}">${ch == null ? '<span class="hint" style="margin:0">어제 데이터 없음</span>'
          : `어제 대비 ${signed(ch, (v) => `${v.toFixed(unit > 1 ? 2 : 2)}원`)} (${pct > 0 ? "+" : ""}${pct.toFixed(2)}%)`}</div>
        ${sparkline(series)}
        <div class="rn">${pos == null ? "추이 데이터 수집 중" : pos <= 0.3 ? "🟢 최근 한 달 중 저렴한 편" : pos >= 0.7 ? "🔴 최근 한 달 중 비싼 편" : "⚪ 최근 한 달 평균 수준"}</div>
      </div>`;
    }).join("");
    $("#rateUpdated").textContent = Rates.live
      ? `${Rates.updated ? Rates.updated.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : ""} 기준`
      : "실시간 환율을 불러오지 못해 기본값 표시 중";

    $("#ticker").innerHTML = CODES.map((c) => {
      const { unit, text } = rateText(Rates.today[c], c);
      const y = Rates.yesterday[c];
      const p = y ? (Rates.today[c] / y - 1) * 100 : null;
      return `<span>${unit} ${c} <b>${text}</b> ${p == null ? "" : `<em class="${cls(p)}" style="font-style:normal">${p > 0 ? "▲" : p < 0 ? "▼" : ""}${Math.abs(p).toFixed(2)}%</em>`}</span>`;
    }).join("");
  }

  // ---------- 저장한 계획 ----------
  function savePlan() {
    const d = destById(plan.destId);
    const list = store.get("tm_saved", []);
    const c = costItems(plan);
    const name = prompt("계획 이름을 입력하세요", `${d.name} ${nightsOf(plan)}박 ${nightsOf(plan) + 1}일 (${plan.start})`);
    if (name === null) return;
    list.unshift({
      id: Date.now(), name: name || `${d.name} 여행`, savedAt: new Date().toISOString(),
      plan: JSON.parse(JSON.stringify(plan)), totalAtSave: c.total, rateAtSave: Rates.today[d.currency],
    });
    store.set("tm_saved", list);
    renderSaved();
    toast("계획을 저장했어요. 매일 환율에 따른 가격 변동을 확인할 수 있어요!");
  }

  function renderSaved() {
    const list = store.get("tm_saved", []);
    if (!list.length) {
      $("#savedList").innerHTML = `<div class="empty">아직 저장한 계획이 없어요. 계획을 짜고 <b>이 계획 저장하기</b>를 눌러보세요.</div>`;
      return;
    }
    $("#savedList").innerHTML = list.map((s) => {
      const d = destById(s.plan.destId);
      const nowTotal = costItems(s.plan).total;
      const diff = nowTotal - s.totalAtSave;
      const days = Math.max(0, diffDays(new Date(s.savedAt).setHours(0, 0, 0, 0), TODAY));
      return `<div class="saved">
        <div class="st">${d.flag} ${esc(s.name)}</div>
        <div class="sm">${new Date(s.savedAt).toLocaleDateString("ko-KR")} 저장 (${days}일 전) · ${s.plan.people}명</div>
        <div class="sp">저장 당시 ${won(s.totalAtSave)}<br/>오늘 환율 <b>${won(nowTotal)}</b>
          <span class="${cls(diff)}">${diff === 0 ? "" : signed(diff)}</span></div>
        <div class="actions">
          <button class="btn ghost" data-load="${s.id}">불러오기</button>
          <button class="btn ghost" data-del="${s.id}">삭제</button>
        </div></div>`;
    }).join("");
  }

  // ---------- 팁 ----------
  function renderTips() {
    const d = destById(plan.destId);
    $("#destTips").innerHTML = `<div class="card dest-tips"><h3>${d.flag} ${d.name} 현지 꿀팁</h3>
      <ul>${d.tips.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
    $("#generalTips").innerHTML = GENERAL_TIPS.map((t) =>
      `<div class="tip"><div class="ti">${t.icon}</div><div class="tt">${t.title}</div><div class="tb">${t.body}</div></div>`).join("");
  }

  // ---------- 전체 렌더 ----------
  function save() { store.set("tm_plan", plan); }
  function renderAll() {
    syncDays();
    renderDestinations(); renderDestInfo(); renderForm(); renderSummary(); renderRates(); renderSaved(); renderTips();
    save();
  }
  function update() { syncDays(); renderForm(); renderSummary(); renderDestinations(); save(); }

  // ---------- 이벤트 ----------
  function bind() {
    $("#destGrid").addEventListener("click", (e) => {
      const b = e.target.closest(".dest"); if (!b || b.dataset.id === plan.destId) return;
      const keep = { start: plan.start, end: plan.end, people: plan.people, rooms: plan.rooms, level: plan.level };
      plan = { ...defaultPlan(b.dataset.id), ...keep };
      renderAll();
      document.getElementById("planner").scrollIntoView();
    });

    $("#startDate").addEventListener("change", (e) => {
      if (!e.target.value) return;
      const n = nightsOf(plan);
      plan.start = e.target.value;
      if (parse(plan.end) <= parse(plan.start)) plan.end = iso(addDays(parse(plan.start), n || 3));
      update(); renderTips();
    });
    $("#endDate").addEventListener("change", (e) => {
      if (!e.target.value) return;
      plan.end = parse(e.target.value) < parse(plan.start) ? plan.start : e.target.value;
      update();
    });
    $("#people").addEventListener("change", (e) => {
      plan.people = Math.max(1, Math.min(20, Number(e.target.value) || 1));
      if (plan.rooms * 2 < plan.people) plan.rooms = Math.ceil(plan.people / 2);
      update();
    });
    $("#rooms").addEventListener("change", (e) => { plan.rooms = Math.max(1, Number(e.target.value) || 1); update(); });
    $("#flightPrice").addEventListener("change", (e) => { plan.flightPrice = Math.max(0, Number(e.target.value) || 0); update(); });

    $("#hotelList").addEventListener("change", (e) => {
      if (e.target.name === "hotel") { plan.hotelIdx = Number(e.target.value); update(); }
    });

    $("#dayList").addEventListener("change", (e) => {
      if (e.target.tagName !== "SELECT" || e.target.value === "") return;
      plan.days[Number(e.target.dataset.day)].push(Number(e.target.value));
      update();
    });
    $("#dayList").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-chip]"); if (!b) return;
      plan.days[Number(b.dataset.day)].splice(Number(b.dataset.chip), 1);
      update();
    });

    $("#levelSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      plan.level = Number(b.dataset.level); update();
    });

    $("#addExtra").addEventListener("click", () => {
      const name = $("#extraName").value.trim();
      const amount = Number($("#extraAmount").value);
      if (!name || !(amount > 0)) { toast("항목 이름과 금액을 입력해 주세요"); return; }
      plan.extras.push({ name, amount, cur: $("#extraCur").value });
      $("#extraName").value = ""; $("#extraAmount").value = "";
      update();
    });
    $("#extraList").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-extra]"); if (!b) return;
      plan.extras.splice(Number(b.dataset.extra), 1); update();
    });

    $("#savedList").addEventListener("click", (e) => {
      const list = store.get("tm_saved", []);
      const load = e.target.closest("[data-load]"), del = e.target.closest("[data-del]");
      if (load) {
        const s = list.find((x) => String(x.id) === load.dataset.load);
        if (s) { plan = JSON.parse(JSON.stringify(s.plan)); renderAll(); document.getElementById("planner").scrollIntoView(); toast("계획을 불러왔어요"); }
      } else if (del) {
        store.set("tm_saved", list.filter((x) => String(x.id) !== del.dataset.del)); renderSaved();
      }
    });
  }

  // ---------- 시작 ----------
  // 저장된 계획이 과거 날짜면 다시 기본값으로
  if (parse(plan.start) < TODAY) plan = { ...plan, ...(({ start, end }) => ({ start, end }))(defaultPlan(plan.destId)) };
  bind();
  renderAll();
  loadRates().then(() => { renderAll(); if (Rates.live) toast("오늘 환율을 반영했어요"); });
  // 페이지를 켜둔 채로 날이 바뀌거나 시간이 지나도 최신 환율 반영 (1시간마다)
  setInterval(() => loadRates().then(renderAll), 60 * 60 * 1000);
})();
