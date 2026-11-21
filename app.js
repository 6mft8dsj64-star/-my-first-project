/* 트립노트 — 여행 계획 + 실시간 환율 계산 (다국어·표시 통화 지원) */
(() => {
  "use strict";

  const CODES = [...new Set(DESTINATIONS.map((d) => d.currency))];
  const MAJOR = ["USD", "EUR", "JPY", "CNY", "GBP", "VND", "THB"].filter((c) => CODES.includes(c));
  const ECB = "AUD,BRL,CAD,CHF,CNY,CZK,DKK,EUR,GBP,HKD,HUF,IDR,INR,ISK,JPY,MXN,MYR,NOK,NZD,PHP,PLN,RON,SEK,SGD,THB,TRY,USD,ZAR".split(",");
  const FRANKFURTER_CODES = CODES.filter((c) => ECB.includes(c)); // ECB 제공 통화(30일 추이 가능)
  const DISPLAY_CODES = ["KRW", ...CODES.filter((c) => c !== "KRW")];
  const DEP = (code) => DEPARTURES.find((x) => x.code === code) || DEPARTURES[0];
  const regionOf = (id) => REGIONS.find((r) => r.id === id);
  const COLORS = ["#2f6fed", "#ff7a45", "#1f9d63", "#a259ff", "#f2c94c", "#667085"];
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => I18N.t(k, v);
  const EN = () => I18N.lang !== "ko"; // 한국어가 아니면 영어 데이터(도시·명소·팁)를 써요
  const LOC = () => I18N.locale();

  // ---------- 저장소 ----------
  // 계정별 데이터(계획·저장 목록·가격 기록)는 로그인한 사용자마다 따로 저장되고, auth.js가 클라우드와 동기화해요.
  const USER_KEYS = ["tm_plan", "tm_saved", "tm_price_log"];
  const keyOf = (k) => (USER_KEYS.includes(k) ? (window.TM_USER_PREFIX || "") + k : k);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(keyOf(k)); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) {
      try { localStorage.setItem(keyOf(k), JSON.stringify(v)); } catch { /* 저장 불가 환경 */ }
      if (USER_KEYS.includes(k)) window.TMAuth?.onLocalChange?.(k, v);
    },
  };

  // ---------- 날짜 ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diffDays = (a, b) => Math.round((b - a) / 86400000);
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const dow = (d) => new Intl.DateTimeFormat(LOC(), { weekday: "short" }).format(d);
  const dayLabel = (d) => (EN()
    ? new Intl.DateTimeFormat(LOC(), { weekday: "short", month: "short", day: "numeric" }).format(d)
    : `${d.getMonth() + 1}/${d.getDate()}(${dow(d)})`);
  const monthName = (m) => (EN() ? new Intl.DateTimeFormat(LOC(), { month: "short" }).format(new Date(2026, m - 1, 1)) : `${m}월`);
  const monthList = (ms) => (EN() ? ms.map(monthName).join(", ") : `${ms.join("·")}월`);
  const intlName = (type, code) => { try { return new Intl.DisplayNames([LOC()], { type }).of(code); } catch { return null; } };

  // ---------- 이름 번역 ----------
  const regionNames = {};
  const countryCode = (id) => ({ ca_: "CA", sa_: "SA" }[id] || id.toUpperCase());
  const N = {
    city: (d) => (EN() ? CITY_EN[d.id]?.[0] ?? d.name : d.name),
    country(id) {
      const c = COUNTRIES.find((x) => x.id === id);
      if (!EN()) return c.name;
      const code = countryCode(id);
      if (I18N.lang === "en" && code === "HK") return "Hong Kong";
      if (I18N.lang === "en" && code === "MO") return "Macau";
      return intlName("region", code) || c.name;
    },
    region: (r) => (EN() ? (I18N.dict[I18N.lang]?.[`region.${r.id}`] || REGION_EN[r.id]) : r.name),
    attr: (d, i) => (EN() ? CITY_EN[d.id]?.[1].split("|")[i] ?? d.attractions[i].name : d.attractions[i].name),
    visa: (v) => (EN() ? VISA_EN[v] ?? v : v),
    hotel(d, i) {
      const h = d.hotels[i];
      if (!EN()) return [h.name, h.note];
      if (d.detailed) return DETAILED_EN[d.id]?.hotels[i] ?? [h.name, h.note];
      const tpl = HOTEL_TPL_EN[h.tpl];
      return tpl ? [tpl[0].replace("{c}", N.city(d).split(" (")[0]), tpl[1]] : [h.name, h.note];
    },
    type: (x) => (EN() ? HOTEL_TYPE_EN[x] ?? x : x),
    airline: (c) => (EN() ? AIRLINE_EN[c] : AIRLINES[c]?.[0]) || c,
    dep: (x) => (EN() ? DEP_EN[x.code]?.[0] : x.name) || x.name,
    depShort: (x) => (EN() ? DEP_EN[x.code]?.[0].replace(/ International Airport| Airport/, "") : x.name.replace("국제공항", "")),
    depCity: (x) => (EN() ? DEP_EN[x.code]?.[1] : x.city) || x.city,
    toICN: (x) => (EN() ? DEP_EN[x.code]?.[2] : x.toICN) || x.toICN,
    depNote: (x) => (EN() ? DEP_EN[x.code]?.[3] : x.note) || "",
    hours: (s) => (EN() ? hoursEN(s) : s),
    cur(c) {
      if (!EN()) return c === "KRW" ? "대한민국 원" : CURRENCY_INFO[c]?.name || c;
      return intlName("currency", c) || c;
    },
    tips(d) {
      const visa = `${t("visa.label")}: ${N.visa(d.visa)}`;
      if (!EN()) return d.detailed ? [visa, ...d.tips, ...(REGION_TIPS[d.region] || [])] : d.tips;
      return [visa, ...(d.detailed ? DETAILED_EN[d.id]?.tips || [] : []), ...(REGION_TIPS_EN[d.region] || [])];
    },
  };

  // ---------- 숫자·통화 표시 ----------
  const disp = () => I18N.settings.cur;
  const ZERO_DEC = ["KRW", "JPY", "VND", "IDR", "CLP", "ISK", "HUF", "KZT", "UZS", "MNT", "LAK", "TZS", "KES", "ARS", "COP"];
  function fmt(amount, cur, { compact = false, narrow = false } = {}) {
    if (!Number.isFinite(amount)) amount = 0;
    if (cur === "KRW" && !EN()) {
      const a = Math.abs(amount);
      if (compact && a >= 100000000) return `${(amount / 100000000).toFixed(2)}억원`;
      if (compact && a >= 10000) return `${(amount / 10000).toFixed(a >= 1000000 ? 0 : 1)}만원`;
      return `${Math.round(amount).toLocaleString("ko-KR")}원`;
    }
    const small = Math.abs(amount) < 100 && !ZERO_DEC.includes(cur);
    const o = { style: "currency", currency: cur, currencyDisplay: narrow ? "narrowSymbol" : "symbol", maximumFractionDigits: small ? 2 : 0, minimumFractionDigits: 0 };
    if (compact && Math.abs(amount) >= 10000) { o.notation = "compact"; o.maximumFractionDigits = 1; }
    try { return new Intl.NumberFormat(LOC(), o).format(amount); } catch { return `${Math.round(amount).toLocaleString(LOC())} ${cur}`; }
  }
  const money = (krw, set) => fmt(krw / rate(disp(), set), disp());          // 원화 금액 → 표시 통화
  const short = (krw, set) => fmt(krw / rate(disp(), set), disp(), { compact: true });
  const local = (n, cur) => fmt(n, cur, { narrow: true });                    // 현지 통화 그대로
  const signed = (n, f) => (n > 0 ? "▲ " : n < 0 ? "▼ " : "") + f(Math.abs(n));
  const cls = (n) => (n > 0 ? "up" : n < 0 ? "down" : "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v, max = 2) => v.toLocaleString(LOC(), { maximumFractionDigits: v < 1 ? 4 : max });

  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ---------- 환율 ----------
  const Rates = { today: { ...FALLBACK_RATES }, yesterday: {}, series: {}, updated: null, source: "", live: false };

  async function fetchJSON(url, ms = 8000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  async function loadRates() {
    const todayIso = iso(TODAY);
    let current = null;
    try {
      const r = await fetchJSON("https://open.er-api.com/v6/latest/KRW");
      if (r.result === "success") {
        current = {};
        CODES.forEach((c) => { if (r.rates[c]) current[c] = 1 / r.rates[c]; });
        Rates.updated = new Date(r.time_last_update_unix * 1000);
        Rates.source = "open.er-api.com";
      }
    } catch { /* 다음 소스로 */ }

    try {
      const start = iso(addDays(TODAY, -35));
      const s = await fetchJSON(`https://api.frankfurter.app/${start}..?from=KRW&to=${FRANKFURTER_CODES.join(",")}`);
      const fxDates = Object.keys(s.rates).sort();
      FRANKFURTER_CODES.forEach((c) => { Rates.series[c] = fxDates.map((d) => 1 / s.rates[d][c]).filter(Number.isFinite); });
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

    // 브라우저에 매일 환율 기록 → ECB 미제공 통화의 어제 대비/추이 계산
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
      if (!Rates.series[c] || Rates.series[c].length < 2) Rates.series[c] = keep.map((k) => trimmed[k][c]).filter(Number.isFinite);
    });
    if (current) { Rates.today = { ...FALLBACK_RATES, ...current }; Rates.live = true; }
  }

  const rate = (c, set = Rates.today) => (c === "KRW" ? 1 : set?.[c] ?? Rates.today[c] ?? FALLBACK_RATES[c]);
  const ySet = () => ({ ...Rates.today, ...Rates.yesterday });
  const hasY = (c) => c === "KRW" || Rates.yesterday[c] != null;
  // 현지 통화 1단위의 값(표시 통화 기준)과 그 추이
  const cost = (c, set) => rate(c, set) / rate(disp(), set);
  function costSeries(c) {
    const a = Rates.series[c] || [];
    if (disp() === "KRW") return a;
    const b = Rates.series[disp()] || [];
    return a.length && a.length === b.length ? a.map((v, i) => v / b[i]) : [];
  }
  function ratePosition(c) {
    const s = [...costSeries(c), cost(c)].filter(Number.isFinite);
    if (s.length < 5) return null;
    const min = Math.min(...s), max = Math.max(...s);
    if (max - min < 1e-12) return 0.5;
    return (cost(c) - min) / (max - min);
  }
  // "100엔 = 930원" 또는 "1 USD = 150 JPY"
  function rateLabel(c) {
    if (disp() === "KRW") {
      const unit = ["JPY", "VND", "IDR"].includes(c) ? 100 : 1;
      return { head: `${unit} ${c}`, value: fmt(rate(c) * unit, "KRW", { narrow: true }), unit };
    }
    if (c === disp()) return { head: `1 ${c}`, value: fmt(rate(c), "KRW"), unit: 1, inverse: "KRW" };
    return { head: `1 ${disp()}`, value: `${num(1 / cost(c))} ${c}`, unit: 1 };
  }

  // ---------- 계획 상태 ----------
  const destById = (id) => DESTINATIONS.find((d) => d.id === id) || DESTINATIONS[0];
  const topHotelIdx = (d) => d.hotels.reduce((b, h, i, a) => (h.share > a[b].share ? i : b), 0);

  function routeInfo(d, depCode) {
    const dep = DEP(depCode);
    const addKrw = dep.add * 10000;
    if (d.routes[depCode]) return { mode: "direct", airlines: d.routes[depCode], price: d.flight.avg };
    if (depCode !== "ICN" && d.routes.ICN) return { mode: "transfer", airlines: d.routes.ICN, price: d.flight.avg + addKrw, dep };
    const sib = DESTINATIONS.find((x) => x.countryId === d.countryId && x.id !== d.id && (x.routes[depCode] || x.routes.ICN));
    return { mode: "via", airlines: VIA[d.region].split(","), price: d.flight.avg + addKrw, dep: depCode !== "ICN" ? dep : null, sib };
  }
  const routeLabel = (r) => t(`route.${r.mode}`);

  function defaultPlan(destId = "tokyo", dep = "ICN") {
    const d = destById(destId);
    const start = addDays(TODAY, 45);
    return {
      destId: d.id, dep, start: iso(start), end: iso(addDays(start, 3)), people: 2, rooms: 1,
      flightPrice: routeInfo(d, dep).price, hotelIdx: topHotelIdx(d), level: 1, days: [], extras: [],
    };
  }

  function loadPlan() {
    let p = store.get("tm_plan", null) || defaultPlan();
    if (!DESTINATIONS.some((d) => d.id === p.destId)) p = defaultPlan();
    if (!DEPARTURES.some((x) => x.code === p.dep)) p.dep = "ICN";
    if (parse(p.start) < TODAY) { const f = defaultPlan(p.destId, p.dep); p.start = f.start; p.end = f.end; }
    return p;
  }
  let plan = loadPlan();
  const ui = { region: destById(plan.destId).region, country: destById(plan.destId).countryId, query: "", allRates: false };
  const nightsOf = (p) => Math.max(0, diffDays(parse(p.start), parse(p.end)));
  const tripLen = (n) => t("trip.len", { n, d: n + 1 });

  function syncDays() {
    const n = nightsOf(plan) + 1;
    while (plan.days.length < n) plan.days.push([]);
    plan.days.length = n;
  }

  // ---------- 비용 계산 (원화 기준으로 계산하고, 표시할 때 표시 통화로 바꿔요) ----------
  function costItems(p, rateSet = Rates.today) {
    const d = destById(p.destId);
    const nights = nightsOf(p), days = nights + 1;
    const cur = d.currency;
    const hotel = d.hotels[p.hotelIdx] || d.hotels[0];
    const attrLocal = p.days.flat().reduce((s, i) => s + (d.attractions[i]?.cost || 0), 0) * p.people;
    const dailyLocal = (d.daily.food + d.daily.transport + d.daily.misc) * p.level * days * p.people;
    const items = [
      { key: "flight", krw: p.flightPrice * p.people, note: () => `${money(p.flightPrice)} × ${t("unit.people", { n: p.people })}` },
      { key: "hotel", localAmt: hotel.price * nights * p.rooms, cur, note: () => t("note.hotel", { n: nights, r: p.rooms }) },
      { key: "attr", localAmt: attrLocal, cur, note: () => t("note.attr", { n: p.days.flat().length, p: p.people }) },
      { key: "daily", localAmt: dailyLocal, cur, note: () => t("note.daily", { n: days, p: p.people }) },
    ];
    if (p.extras.length) items.push({ key: "extra", krw: p.extras.reduce((s, e) => s + e.amount * rate(e.cur, rateSet), 0), note: () => t("note.extra", { n: p.extras.length }) });
    items.forEach((it) => { if (it.localAmt != null) it.krw = it.localAmt * rate(it.cur, rateSet); });
    const total = items.reduce((s, it) => s + it.krw, 0);
    const localTotal = items.reduce((s, it) => s + (it.localAmt || 0), 0);
    return { items, total, localTotal, cur };
  }

  // ---------- 렌더: 여행지 (지역 → 나라 → 도시) ----------
  function seasonBadge(d, m) {
    const k = d.bestMonths.includes(m) ? "good" : d.peakMonths.includes(m) ? "peak" : "";
    return `<span class="badge ${k}">${t(k === "good" ? "season.best" : k === "peak" ? "season.peak" : "season.off", { m: monthName(m) })}</span>`;
  }
  function cityButton(d, m, withCountry) {
    const r = routeInfo(d, plan.dep);
    return `<button class="city ${d.id === plan.destId ? "on" : ""}" data-city="${d.id}">
      <div class="nm">${withCountry ? `${d.flag} ` : ""}${esc(N.city(d))}</div>
      <div class="ct">${withCountry ? `${esc(N.country(d.countryId))} · ` : ""}${routeLabel(r)}${r.mode === "direct" ? ` · ${t("city.airlines", { n: r.airlines.length })}` : ""} · ${esc(N.hours(d.flight.hours))}</div>
      <div class="pr">${t("city.rt")} <b>${short(r.price)}</b></div>${seasonBadge(d, m)}
    </button>`;
  }

  function renderDestinations() {
    const m = parse(plan.start).getMonth() + 1;
    const cur = destById(plan.destId);
    $("#crumb").innerHTML = `${t("pick.current")}: <b>${N.region(regionOf(cur.region))} › ${cur.flag} ${esc(N.country(cur.countryId))} › ${esc(N.city(cur))}</b>`;

    const q = ui.query.trim().toLowerCase();
    if (q) {
      const hits = DESTINATIONS.filter((d) => [d.name, d.country, regionOf(d.region).name, CITY_EN[d.id]?.[0] || "", REGION_EN[d.region], N.region(regionOf(d.region)), N.country(d.countryId), (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode(d.countryId)); } catch { return ""; } })()]
        .join(" ").toLowerCase().includes(q));
      $("#regionTabs").hidden = $("#countryGrid").hidden = true;
      $("#cityHead").textContent = t("pick.results", { q: ui.query.trim(), n: hits.length });
      $("#cityGrid").innerHTML = hits.map((d) => cityButton(d, m, true)).join("") || `<div class="empty">${t("pick.none")}</div>`;
      return;
    }
    $("#regionTabs").hidden = $("#countryGrid").hidden = false;
    $("#regionTabs").innerHTML = REGIONS.map((r) => {
      const n = COUNTRIES.filter((c) => c.region === r.id).length;
      return `<button class="tab ${r.id === ui.region ? "on" : ""}" data-region="${r.id}">${r.icon} ${N.region(r)} <small>${n}</small></button>`;
    }).join("");

    const countries = COUNTRIES.filter((c) => c.region === ui.region);
    if (!countries.some((c) => c.id === ui.country)) ui.country = countries[0].id;
    $("#countryGrid").innerHTML = countries.map((c) => {
      const cities = DESTINATIONS.filter((d) => d.countryId === c.id);
      const minP = Math.min(...cities.map((d) => routeInfo(d, plan.dep).price));
      const direct = cities.some((d) => d.routes[plan.dep]);
      return `<button class="country ${c.id === ui.country ? "on" : ""}" data-country="${c.id}">
        <span class="flag">${c.flag}</span><span><span class="nm">${esc(N.country(c.id))}</span>
        <span class="ct">${t("country.cities", { n: cities.length })} · ${t("country.from", { p: short(minP) })}</span>
        ${direct ? `<span class="ct"><i class="dot"></i>${t("country.direct", { a: esc(N.depCity(DEP(plan.dep))) })}</span>` : ""}</span>
      </button>`;
    }).join("");

    const country = COUNTRIES.find((c) => c.id === ui.country);
    $("#cityHead").innerHTML = `${country.flag} ${t("pick.cityHead", { c: esc(N.country(country.id)) })} <small>${t("visa.label")}: ${esc(N.visa(country.visa))}</small>`;
    $("#cityGrid").innerHTML = DESTINATIONS.filter((d) => d.countryId === ui.country).map((d) => cityButton(d, m, false)).join("");
  }

  function renderDestInfo() {
    const d = destById(plan.destId);
    const top = d.hotels[topHotelIdx(d)];
    const dayLocal = d.daily.food + d.daily.transport + d.daily.misc;
    const rl = rateLabel(d.currency);
    $("#plannerTitle").textContent = `${d.flag} ${N.city(d)}`;
    $("#destInfo").innerHTML = `
      <div class="info-head"><div class="flag">${d.flag}</div>
        <div><h3 style="margin:0">${esc(N.city(d))}, ${esc(N.country(d.countryId))}</h3>
        <div class="hint" style="margin:0">${N.region(regionOf(d.region))} · ${t("info.flight")} ${esc(N.hours(d.flight.hours))} · ${t("info.currency")} ${esc(N.cur(d.currency))}</div></div></div>
      <div class="visa">🛂 ${t("visa.label")}: ${esc(N.visa(d.visa))}${d.detailed ? "" : ` <span class="badge">${t("info.estimate")}</span>`}</div>
      <div class="info-stats">
        <div class="stat"><div class="k">${t("info.fare")}</div><div class="v">${short(d.flight.low)}~${short(d.flight.high)}</div></div>
        <div class="stat"><div class="k">${t("info.topHotel")}</div><div class="v">${esc(N.type(top.type))} · ${top.share}%</div></div>
        <div class="stat"><div class="k">${t("info.daily")}</div><div class="v">${t("approx")} ${short(dayLocal * rate(d.currency))}</div></div>
        <div class="stat"><div class="k">${t("info.rate")}</div><div class="v">${rl.head} = ${rl.value}</div></div>
      </div>
      <div class="months">${Array.from({ length: 12 }, (_, i) => i + 1).map((mm) =>
        `<span class="${d.bestMonths.includes(mm) ? "good" : d.peakMonths.includes(mm) ? "peak" : ""}">${monthName(mm)}</span>`).join("")}</div>
      <p class="hint">${t("info.legend")}</p>`;
  }

  // ---------- 렌더: 폼 ----------
  function renderForm() {
    const d = destById(plan.destId);
    $("#startDate").value = plan.start;
    $("#endDate").value = plan.end;
    $("#startDate").min = iso(TODAY);
    $("#endDate").min = plan.start;
    $("#people").value = plan.people;
    const groups = [["intl", t("dep.intl")], ["dom", t("dep.dom")]];
    $("#dep").innerHTML = groups.map(([type, label]) => `<optgroup label="${label}">${DEPARTURES.filter((x) => x.type === type)
      .map((x) => `<option value="${x.code}" ${x.code === plan.dep ? "selected" : ""}>${esc(N.dep(x))} (${esc(N.depCity(x))})</option>`).join("")}</optgroup>`).join("");
    $("#depHint").textContent = N.depNote(DEP(plan.dep));
    $("#rooms").value = plan.rooms;
    $("#flightPrice").value = Math.round(plan.flightPrice / rate(disp()));
    $("#flightPrice").step = disp() === "KRW" ? 10000 : "any";
    $("#flightUnit").textContent = disp() === "KRW" && !EN() ? "원" : disp();
    document.querySelectorAll("#levelSeg button").forEach((b) => b.classList.toggle("on", Number(b.dataset.level) === plan.level));
    const curs = [...new Set([disp(), d.currency, "KRW"])];
    $("#extraCur").innerHTML = curs.map((c) => `<option value="${c}">${c === "KRW" && !EN() ? "원" : c}</option>`).join("");

    const s = parse(plan.start), e = parse(plan.end), n = nightsOf(plan);
    $("#dateHint").textContent = `${dayLabel(s)} ~ ${dayLabel(e)} · ${tripLen(n)} · ${t("date.dminus", { n: diffDays(TODAY, s) })}`;
    renderFlight(); renderHotels(); renderDays(); renderDaily(); renderExtras();
  }

  function airlineChips(codes) {
    const order = { K: 0, L: 1, F: 2 };
    return codes.slice().sort((a, b) => order[AIRLINES[a]?.[1] ?? "F"] - order[AIRLINES[b]?.[1] ?? "F"])
      .map((c) => `<span class="al al-${AIRLINES[c]?.[1] || "F"}" title="${c}">${esc(N.airline(c))}</span>`).join("");
  }

  function renderRoute() {
    const d = destById(plan.destId), dep = DEP(plan.dep), r = routeInfo(d, plan.dep);
    let html = `<div class="route-head"><b>${esc(N.dep(dep))}</b> → <b>${d.flag} ${esc(N.city(d))}</b> <span class="badge ${r.mode === "direct" ? "good" : ""}">${routeLabel(r)}</span></div>`;
    if (r.mode === "direct") html += `<div class="route-row">${airlineChips(r.airlines)}</div>`;
    else if (r.mode === "transfer") html += `<div class="route-row">${t("route.transferMsg", { a: esc(N.dep(dep)), how: esc(N.toICN(dep)) })}<br/>${airlineChips(r.airlines)}</div>`;
    else {
      html += `<div class="route-row">${r.dep ? t("route.viaFrom", { how: esc(N.toICN(r.dep)) }) : t("route.viaMsg")}<br/>${airlineChips(r.airlines)}</div>`;
      if (r.sib) {
        const sr = r.sib.routes[plan.dep] || r.sib.routes.ICN;
        html += `<div class="route-row">💡 ${t("route.sib", { c: esc(N.city(r.sib)) })} ${airlineChips(sr)}
          <button class="chip-btn" data-city-jump="${r.sib.id}">${t("route.see", { c: esc(N.city(r.sib)) })}</button></div>`;
      }
    }
    const others = DEPARTURES.filter((x) => x.code !== plan.dep && d.routes[x.code]);
    if (others.length) html += `<div class="route-other">${t("route.others")}: ${others.map((x) =>
      `<button class="chip-btn" data-dep="${x.code}">✈️ ${esc(N.depShort(x))} (${d.routes[x.code].length})</button>`).join("")}</div>`;
    html += `<p class="hint">${t("route.legend")}</p>`;
    $("#routeInfo").innerHTML = html;

    const log = store.get("tm_price_log", []).filter((x) => x.dest === d.id && x.dep === plan.dep).slice(-5).reverse();
    $("#priceLog").innerHTML = log.length ? `📒 ${t("route.myPrices")}: ${log.map((x) => `${x.date.slice(5)} <b>${short(x.price)}</b>`).join(" · ")}` : "";
  }

  function renderFlight() {
    renderRoute();
    const f = { ...destById(plan.destId).flight };
    const rp = routeInfo(destById(plan.destId), plan.dep).price;
    const shift = rp - f.avg;
    f.low = Math.max(0, f.low + shift); f.avg = rp; f.high += shift;
    const lo = f.low * 0.8, hi = f.high * 1.1;
    const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
    $("#flightBar").innerHTML = `
      <div class="track"></div>
      <div class="mark tick" style="left:${pos(f.low)}%">${t("fare.low")} ${short(f.low)}</div>
      <div class="mark tick" style="left:${pos(f.avg)}%">${t("fare.avg")} ${short(f.avg)}</div>
      <div class="mark tick" style="left:${pos(f.high)}%">${t("fare.high")} ${short(f.high)}</div>
      <div class="pin" style="left:${pos(plan.flightPrice)}%"></div>
      <div class="mark" style="left:${pos(plan.flightPrice)}%">${t("fare.mine")}</div>`;
    const diff = plan.flightPrice - f.avg;
    const h = $("#flightHint");
    h.className = "hint" + (diff > f.avg * 0.15 ? " warn" : "");
    h.textContent = Math.abs(diff) < 1 ? t("fare.isAvg") : diff < 0 ? t("fare.cheaper", { p: money(-diff) }) : t("fare.pricier", { p: money(diff) });
  }

  function renderHotels() {
    const d = destById(plan.destId);
    const top = topHotelIdx(d);
    const order = d.hotels.map((h, i) => i).sort((a, b) => d.hotels[b].share - d.hotels[a].share);
    $("#hotelList").innerHTML = order.map((i) => {
      const h = d.hotels[i];
      const [name, note] = N.hotel(d, i);
      return `<label class="hotel ${i === plan.hotelIdx ? "on" : ""}">
        <input type="radio" name="hotel" value="${i}" ${i === plan.hotelIdx ? "checked" : ""}/>
        <div><div class="hn">${esc(name)}${i === top ? `<span class="top-pick">${t("hotel.top")}</span>` : ""}</div>
          <div class="hm">${esc(N.type(h.type))} · ★${h.rating} · ${esc(note)}</div>
          <div class="share" title="${h.share}%"><i style="width:${h.share * 2}%"></i></div>
          <div class="hm">${t("hotel.share", { n: h.share })}</div></div>
        <div class="hp">${short(h.price * rate(d.currency))}<small>${local(h.price, d.currency)} / ${t("hotel.night")}</small></div>
      </label>`;
    }).join("");
  }

  function renderDays() {
    const d = destById(plan.destId);
    const s = parse(plan.start);
    $("#dayList").innerHTML = plan.days.map((list, di) => {
      const date = addDays(s, di);
      const tag = di === 0 ? t("day.depart") : di === plan.days.length - 1 ? t("day.return") : "";
      const chips = list.map((ai, ci) => {
        const a = d.attractions[ai];
        return `<span class="chip">${esc(N.attr(d, ai))} · ${a.cost ? local(a.cost, d.currency) : t("free")}
          <button data-day="${di}" data-chip="${ci}" aria-label="${t("remove")}">×</button></span>`;
      }).join("");
      const options = d.attractions.map((a, i) => `<option value="${i}">${esc(N.attr(d, i))} (${a.cost ? short(a.cost * rate(d.currency)) : t("free")})</option>`).join("");
      return `<div class="day">
        <div class="day-head">${t("day.n", { n: di + 1 })} <span>${dayLabel(date)} ${tag}</span></div>
        <div class="chips">${chips || `<span class="hint" style="margin:0">${t("day.empty")}</span>`}</div>
        <div class="day-add"><select data-day="${di}" aria-label="${t("day.add")}"><option value="">${t("day.add")}</option>${options}</select></div>
      </div>`;
    }).join("");
  }

  function renderDaily() {
    const d = destById(plan.destId);
    const x = d.daily, l = plan.level, r = rate(d.currency);
    $("#dailyHint").textContent = t("daily.hint", { f: short(x.food * l * r), t: short(x.transport * l * r), m: short(x.misc * l * r) });
  }

  function renderExtras() {
    $("#extraList").innerHTML = plan.extras.map((e, i) => {
      const amt = e.cur === disp() ? fmt(e.amount, e.cur) : `${local(e.amount, e.cur)} ≈ ${money(e.amount * rate(e.cur))}`;
      return `<div class="extra"><span>${esc(e.name)}</span><span>${amt}
        <button data-extra="${i}" aria-label="${t("remove")}">✕</button></span></div>`;
    }).join("");
  }

  // ---------- 요약 / 제안 ----------
  function renderSummary() {
    const d = destById(plan.destId);
    const now = costItems(plan);
    const canY = hasY(d.currency) && hasY(disp());
    const ys = ySet();
    const yest = canY ? costItems(plan, ys) : null;
    const delta = yest ? now.total / rate(disp()) - yest.total / rate(disp(), ys) : 0;
    const max = Math.max(...now.items.map((i) => i.krw), 1);
    const fmtD = (v) => fmt(v, disp());

    $("#summary").innerHTML = `
      <div class="total-label">${t("sum.label", { c: `${d.flag} ${esc(N.city(d))}`, len: tripLen(nightsOf(plan)), p: plan.people })}</div>
      <div class="total">${money(now.total)}</div>
      <div class="per">${t("sum.per", { p: short(now.total / plan.people) })} · ${t("sum.local", { p: local(now.localTotal, d.currency) })}</div>
      ${disp() !== "KRW" ? `<div class="per">≈ ${fmt(now.total, "KRW")}</div>` : ""}
      <div class="delta">${canY
        ? `${t("sum.vsY")} <b class="${cls(delta)}">${Math.abs(delta) < 0.5 ? t("sum.nochange") : signed(delta, fmtD)}</b>
           <div class="hint" style="margin:2px 0 0">${t("sum.sens", { p: money(now.localTotal * rate(d.currency) * 0.01) })}</div>`
        : t("sum.noY")}</div>
      <div class="breakdown">${now.items.map((it, i) => `
        <div class="bd"><span>${t(`item.${it.key}`)} <span class="hint" style="margin:0;font-size:.78rem">${it.note()}</span></span>
          <span class="amt">${money(it.krw)}</span>
          <div class="bar"><i style="width:${(it.krw / max) * 100}%;background:${COLORS[i % COLORS.length]}"></i></div></div>`).join("")}
      </div>
      <label class="plan-name">${t("sum.planName")}<input type="text" id="planName" placeholder="${esc(defaultPlanName())}" /></label>
      <button class="btn block" id="savePlan">${t("sum.save")}</button>
      <p class="hint">${Rates.live ? t("sum.source", { s: Rates.source }) : t("sum.offline")}</p>`;
    $("#savePlan").onclick = savePlan;
    renderSuggestions(now);
  }
  const defaultPlanName = () => `${N.city(destById(plan.destId))} ${tripLen(nightsOf(plan))} (${plan.start})`;

  function renderSuggestions(now) {
    const d = destById(plan.destId);
    const s = parse(plan.start);
    const m = s.getMonth() + 1;
    const city = esc(N.city(d));
    const out = [];
    const add = (type, html) => out.push(`<li class="${type}">${html}</li>`);

    const wd = s.getDay();
    const dayName = EN() ? new Intl.DateTimeFormat(LOC(), { weekday: "long" }).format(s) : dow(s);
    if ([5, 6, 0].includes(wd)) add("warn", t("sg.weekend", { d: dayName, p: short(plan.flightPrice * 0.12 * plan.people) }));
    else if ([2, 3, 4].includes(wd)) add("good", t("sg.weekday", { d: dayName }));

    if (d.peakMonths.includes(m)) add("warn", t("sg.peak", { m: monthName(m), c: city, alt: monthList(d.bestMonths.filter((x) => !d.peakMonths.includes(x)).slice(0, 3)) }));
    else if (d.bestMonths.includes(m)) add("good", t("sg.best", { m: monthName(m), c: city }));
    else add("", t("sg.off", { m: monthName(m) }));

    const lead = diffDays(TODAY, s);
    const long = d.flight.avg >= 800000;
    const [lo, hi] = long ? [90, 150] : [30, 60];
    if (lead < lo) add("warn", t("sg.late", { n: lead, kind: t(long ? "sg.long" : "sg.short"), lo, hi }));
    else if (lead > hi) add("", t("sg.early", { n: lead, hi }));
    else add("good", t("sg.ontime", { n: lead }));

    if (plan.flightPrice > d.flight.avg * 1.15) add("warn", t("sg.fare", { n: Math.round((plan.flightPrice / d.flight.avg - 1) * 100) }));

    const top = topHotelIdx(d);
    const chosen = d.hotels[plan.hotelIdx];
    if (plan.hotelIdx !== top) {
      const tp = d.hotels[top];
      const gap = (chosen.price - tp.price) * nightsOf(plan) * plan.rooms * rate(d.currency);
      add("", t("sg.hotel", { h: esc(N.hotel(d, top)[0]), n: tp.share }) + (gap > 0 ? " " + t("sg.hotelSave", { p: short(gap) }) : ""));
    }
    if (plan.rooms * 3 < plan.people) add("warn", t("sg.rooms", { p: plan.people, r: plan.rooms }));

    const used = new Set(plan.days.flat());
    const unused = d.attractions.map((_, i) => i).filter((i) => !used.has(i));
    const emptyDays = plan.days.map((l, i) => (l.length === 0 && i > 0 && i < plan.days.length - 1 ? i + 1 : null)).filter(Boolean);
    if (emptyDays.length && unused.length) add("", t("sg.empty", { d: emptyDays.join(", "), a: unused.slice(0, 2).map((i) => esc(N.attr(d, i))).join(", ") }));
    const packed = plan.days.map((l, i) => (l.length > 3 ? i + 1 : null)).filter(Boolean);
    if (packed.length) add("warn", t("sg.packed", { d: packed.join(", ") }));
    if (plan.days.length > 1 && (plan.days[0].length > 2 || plan.days[plan.days.length - 1].length > 2)) add("warn", t("sg.edge"));

    if (d.currency !== disp()) {
      const pos = ratePosition(d.currency);
      const curName = esc(N.cur(d.currency));
      if (pos != null) {
        if (pos <= 0.3) add("good", t("sg.rateLow", { c: curName }));
        else if (pos >= 0.7) add("warn", t("sg.rateHigh", { c: curName }));
        else add("", t("sg.rateMid", { c: curName }));
      }
      if (hasY(d.currency) && hasY(disp())) {
        const pct = (cost(d.currency) / cost(d.currency, ySet()) - 1) * 100;
        if (Math.abs(pct) >= 0.3) add(pct > 0 ? "warn" : "good", t(pct > 0 ? "sg.rateUp" : "sg.rateDown", { c: curName, n: Math.abs(pct).toFixed(2) }));
      }
    }

    const big = now.items.reduce((a, b) => (b.krw > a.krw ? b : a));
    add("", t("sg.big", { k: t(`item.${big.key}`), n: Math.round((big.krw / now.total) * 100) }));
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
    const base = disp();
    const list = [dCur, ...(ui.allRates ? CODES : MAJOR), ...(base !== "KRW" ? ["KRW"] : [])].filter((c, i, a) => a.indexOf(c) === i && (c !== base || c === "KRW"));
    $("#toggleRates").textContent = ui.allRates ? t("rates.fewer") : t("rates.all", { n: CODES.length });
    $("#rateBase").textContent = t("rates.base", { c: base === "KRW" && !EN() ? "원화(KRW)" : `${N.cur(base)} (${base})` });
    $("#rateGrid").innerHTML = list.map((c) => {
      let head, value, pct = null, series = [], pos = null;
      if (c === "KRW") { // 표시 통화가 외화일 때: 1 표시통화 = ?원
        head = `1 ${base}`; value = fmt(rate(base), "KRW");
        if (hasY(base)) pct = (rate(base) / rate(base, ySet()) - 1) * 100;
        series = [...(Rates.series[base] || []), rate(base)];
      } else {
        const rl = rateLabel(c); head = rl.head; value = rl.value;
        if (hasY(c) && hasY(base)) pct = (cost(c) / cost(c, ySet()) - 1) * 100;
        series = [...costSeries(c), cost(c)];
        pos = ratePosition(c);
      }
      return `<div class="rate">
        <div class="rh"><span>${esc(N.cur(c))} (${c})</span><span>${head}</span></div>
        <div class="rv">${value}</div>
        <div class="rc ${cls(pct)}">${pct == null ? `<span class="hint" style="margin:0">${t("rates.noY")}</span>`
          : `${t("rates.vsY")} ${pct > 0 ? "▲" : pct < 0 ? "▼" : ""} ${Math.abs(pct).toFixed(2)}%`}</div>
        ${sparkline(series)}
        <div class="rn">${c === "KRW" ? t("rates.krwNote") : pos == null ? t("rates.collect") : pos <= 0.3 ? t("rates.low") : pos >= 0.7 ? t("rates.high") : t("rates.mid")}</div>
      </div>`;
    }).join("");
    $("#rateUpdated").textContent = Rates.live
      ? t("rates.updated", { d: Rates.updated ? Rates.updated.toLocaleString(LOC(), { dateStyle: "medium", timeStyle: "short" }) : "" })
      : t("rates.offline");

    const tick = [dCur, ...MAJOR, ...(base !== "KRW" ? ["KRW"] : [])].filter((c, i, a) => a.indexOf(c) === i && c !== base).map((c) => {
      const val = c === "KRW" ? fmt(rate(base), "KRW") : base === "KRW" ? rateLabel(c).value : `${num(1 / cost(c))} ${c}`;
      const head = base === "KRW" ? rateLabel(c).head : "";
      const p = c === "KRW" ? (hasY(base) ? (rate(base) / rate(base, ySet()) - 1) * 100 : null)
        : hasY(c) && hasY(base) ? (cost(c) / cost(c, ySet()) - 1) * 100 : null;
      return `<span>${head} <b>${val}</b> ${p == null ? "" : `<em class="${cls(p)}" style="font-style:normal">${p > 0 ? "▲" : p < 0 ? "▼" : ""}${Math.abs(p).toFixed(2)}%</em>`}</span>`;
    }).join("");
    $("#ticker").innerHTML = (base === "KRW" ? "" : `<span><b>1 ${base} =</b></span>`) + tick;
  }

  // ---------- 저장한 계획 ----------
  function savePlan() {
    const d = destById(plan.destId);
    const list = store.get("tm_saved", []);
    const c = costItems(plan);
    const name = $("#planName").value.trim() || defaultPlanName();
    list.unshift({ id: Date.now(), name, savedAt: new Date().toISOString(), plan: JSON.parse(JSON.stringify(plan)), totalAtSave: c.total, rateAtSave: Rates.today[d.currency] });
    store.set("tm_saved", list);
    renderSaved();
    toast(t("toast.saved"));
  }

  function renderSaved() {
    const list = store.get("tm_saved", []);
    if (!list.length) { $("#savedList").innerHTML = `<div class="empty">${t("saved.empty")}</div>`; return; }
    $("#savedList").innerHTML = list.map((s) => {
      const d = destById(s.plan.destId);
      const nowTotal = costItems(s.plan).total;
      const diff = nowTotal - s.totalAtSave;
      const days = Math.max(0, diffDays(new Date(s.savedAt).setHours(0, 0, 0, 0), TODAY));
      return `<div class="saved">
        <div class="st">${d.flag} ${esc(s.name)}</div>
        <div class="sm">${t("saved.meta", { d: new Date(s.savedAt).toLocaleDateString(LOC()), n: days, p: s.plan.people })}</div>
        <div class="sp">${t("saved.then")} ${money(s.totalAtSave)}<br/>${t("saved.now")} <b>${money(nowTotal)}</b>
          <span class="${cls(diff)}">${Math.abs(diff) < 1 ? "" : signed(diff, (v) => money(v))}</span></div>
        <div class="actions">
          <button class="btn ghost" data-load="${s.id}">${t("saved.load")}</button>
          <button class="btn ghost" data-del="${s.id}">${t("saved.del")}</button>
        </div></div>`;
    }).join("");
  }

  // ---------- 팁 ----------
  function renderTips() {
    const d = destById(plan.destId);
    $("#destTips").innerHTML = `<div class="card dest-tips"><h3>${d.flag} ${t("tips.local", { c: esc(N.city(d)) })}</h3>
      <ul>${N.tips(d).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    $("#generalTips").innerHTML = GENERAL_TIPS.map((g, i) => {
      const x = EN() ? GENERAL_TIPS_EN[i] : g;
      return `<div class="tip"><div class="ti">${g.icon}</div><div class="tt">${esc(x.title)}</div><div class="tb">${esc(x.body)}</div></div>`;
    }).join("");
  }

  // ---------- 설정 (테마 · 언어 · 표시 통화) ----------
  function renderSettings() {
    const s = I18N.settings;
    document.querySelectorAll(".lang-select").forEach((el) => {
      if (el.options.length !== I18N.LANGS.length) el.innerHTML = I18N.LANGS.map((l) => `<option value="${l.code}">${l.name}</option>`).join("");
    });
    document.querySelectorAll("[data-theme-set]").forEach((b) => b.classList.toggle("on", b.dataset.themeSet === s.theme));
    document.querySelectorAll(".lang-select").forEach((el) => { el.value = s.lang; });
    $("#curSelect").innerHTML = DISPLAY_CODES.map((c) => `<option value="${c}" ${c === s.cur ? "selected" : ""}>${c} · ${esc(N.cur(c))}</option>`).join("");
    $("#settingsBtn").title = t("set.title");
  }

  // ---------- 전체 렌더 ----------
  function save() { store.set("tm_plan", plan); }
  function renderAll() {
    syncDays();
    I18N.apply();
    renderDestinations(); renderDestInfo(); renderForm(); renderSummary(); renderRates(); renderSaved(); renderTips(); renderSettings();
    save();
  }
  function update() { syncDays(); renderForm(); renderSummary(); renderDestinations(); save(); }

  // ---------- 이벤트 ----------
  function bind() {
    const pickCity = (id) => {
      const keep = { start: plan.start, end: plan.end, people: plan.people, rooms: plan.rooms, level: plan.level };
      plan = { ...defaultPlan(id, plan.dep), ...keep };
      const d = destById(id); ui.region = d.region; ui.country = d.countryId;
      renderAll();
      document.getElementById("planner").scrollIntoView();
    };
    $("#regionTabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-region]"); if (!b) return;
      ui.region = b.dataset.region; ui.country = null; renderDestinations();
    });
    $("#countryGrid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-country]"); if (!b) return;
      ui.country = b.dataset.country; renderDestinations();
      $("#cityHead").scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    $("#cityGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-city]"); if (b) pickCity(b.dataset.city); });
    $("#destSearch").addEventListener("input", (e) => { ui.query = e.target.value; renderDestinations(); });
    const setDep = (code) => { plan.dep = code; plan.flightPrice = routeInfo(destById(plan.destId), code).price; update(); };
    $("#dep").addEventListener("change", (e) => setDep(e.target.value));
    $("#routeInfo").addEventListener("click", (e) => {
      const b = e.target.closest("[data-dep]"); if (b) setDep(b.dataset.dep);
      const j = e.target.closest("[data-city-jump]"); if (j) pickCity(j.dataset.cityJump);
    });
    $("#toggleRates").addEventListener("click", () => { ui.allRates = !ui.allRates; renderRates(); });

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
    $("#flightPrice").addEventListener("change", (e) => {
      plan.flightPrice = Math.round(Math.max(0, Number(e.target.value) || 0) * rate(disp())); // 표시 통화로 입력 → 원화로 저장
      const log = store.get("tm_price_log", []);
      log.push({ dest: plan.destId, dep: plan.dep, price: plan.flightPrice, date: iso(new Date()) });
      store.set("tm_price_log", log.slice(-200));
      update();
    });
    $("#hotelList").addEventListener("change", (e) => { if (e.target.name === "hotel") { plan.hotelIdx = Number(e.target.value); update(); } });
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
    $("#levelSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; plan.level = Number(b.dataset.level); update(); });
    $("#addExtra").addEventListener("click", () => {
      const name = $("#extraName").value.trim();
      const amount = Number($("#extraAmount").value);
      if (!name || !(amount > 0)) { toast(t("toast.extraNeed")); return; }
      plan.extras.push({ name, amount, cur: $("#extraCur").value });
      $("#extraName").value = ""; $("#extraAmount").value = "";
      update();
    });
    $("#extraList").addEventListener("click", (e) => { const b = e.target.closest("button[data-extra]"); if (!b) return; plan.extras.splice(Number(b.dataset.extra), 1); update(); });
    $("#savedList").addEventListener("click", (e) => {
      const list = store.get("tm_saved", []);
      const load = e.target.closest("[data-load]"), del = e.target.closest("[data-del]");
      if (load) {
        const s = list.find((x) => String(x.id) === load.dataset.load);
        if (!s) return;
        plan = JSON.parse(JSON.stringify(s.plan));
        if (!DEPARTURES.some((x) => x.code === plan.dep)) plan.dep = "ICN";
        ui.region = destById(plan.destId).region; ui.country = destById(plan.destId).countryId;
        renderAll(); document.getElementById("planner").scrollIntoView(); toast(t("toast.loaded"));
      } else if (del) {
        store.set("tm_saved", list.filter((x) => String(x.id) !== del.dataset.del)); renderSaved();
      }
    });

    // 설정
    const modal = $("#settingsModal");
    const open = (v) => { modal.hidden = !v; document.body.classList.toggle("locked", v || !$("#authScreen").hidden); };
    $("#settingsBtn").addEventListener("click", () => { renderSettings(); open(true); });
    modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => open(false)));
    modal.addEventListener("click", (e) => { if (e.target === modal) open(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) open(false); });
    document.querySelectorAll("[data-theme-set]").forEach((b) => b.addEventListener("click", () => { I18N.setTheme(b.dataset.themeSet); renderSettings(); }));
    document.querySelectorAll(".lang-select").forEach((el) => el.addEventListener("change", async () => {
      if (!(await I18N.setLang(el.value))) { toast("Language file could not be loaded."); renderSettings(); return; }
      renderAll(); window.TMAuth?.relabel?.(); window.TMContact?.relabel?.();
    }));
    $("#curSelect").addEventListener("change", (e) => { I18N.setCur(e.target.value); renderAll(); toast(t("toast.cur", { c: e.target.value })); });
  }

  // ---------- 시작 ----------
  window.TripApp = {
    reload() {
      plan = loadPlan();
      ui.region = destById(plan.destId).region; ui.country = destById(plan.destId).countryId;
      renderAll();
    },
    toast,
    current: () => plan.destId,
  };
  bind();
  I18N.ready.then(() => {
    renderAll();
    loadRates().then(() => { renderAll(); if (Rates.live) toast(t("toast.rates")); });
    setInterval(() => loadRates().then(renderAll), 60 * 60 * 1000);
  });
})();
