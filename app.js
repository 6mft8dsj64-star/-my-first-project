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
  // 로그인 없이 하기(게스트)는 이 탭에만 잠깐 보관해요(sessionStorage) → 브라우저를 닫으면 사라져요.
  const keyOf = (k) => (USER_KEYS.includes(k) ? (window.TM_USER_PREFIX || "") + k : k);
  const areaOf = (k) => (USER_KEYS.includes(k) && !window.TM_USER_PREFIX ? sessionStorage : localStorage);
  const store = {
    get(k, d) { try { const v = areaOf(k).getItem(keyOf(k)); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) {
      try { areaOf(k).setItem(keyOf(k), JSON.stringify(v)); } catch { /* 저장 불가 환경 */ }
      if (USER_KEYS.includes(k)) window.TMAuth?.onLocalChange?.(k, v);
    },
  };
  // 예전 방식으로 브라우저에 남아 있던 게스트 데이터는 이 탭으로 옮겨요 (로그인하면 계정으로 옮겨짐)
  try {
    USER_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) { if (sessionStorage.getItem(k) === null) sessionStorage.setItem(k, v); localStorage.removeItem(k); }
    });
  } catch { /* 무시 */ }

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
  // 한국어가 아니면: 그 언어 데이터(lang/data/*.js) → 없으면 영어 데이터 순으로 써요
  const LD = () => (I18N.lang === "ko" || I18N.lang === "en" ? null : I18N.data[I18N.lang]);
  const N = {
    city: (d) => (EN() ? LD()?.cities?.[d.id]?.[0] || CITY_EN[d.id]?.[0] || d.name : d.name),
    country(id) {
      const c = COUNTRIES.find((x) => x.id === id);
      if (!EN()) return c.name;
      const code = countryCode(id);
      if (I18N.lang === "en" && code === "HK") return "Hong Kong";
      if (I18N.lang === "en" && code === "MO") return "Macau";
      return LD()?.countries?.[id] || intlName("region", code) || c.name;
    },
    region: (r) => (EN() ? (I18N.dict[I18N.lang]?.[`region.${r.id}`] || REGION_EN[r.id]) : r.name),
    attr: (d, i) => (EN() ? LD()?.cities?.[d.id]?.[1]?.[i] || CITY_EN[d.id]?.[1].split("|")[i] || d.attractions[i].name : d.attractions[i].name),
    visa(v) {
      if (!EN()) return v;
      const k = Object.keys(VISA_EN).indexOf(v);
      return (k >= 0 && LD()?.visa?.[k]) || VISA_EN[v] || v;
    },
    hotel(d, i) {
      const h = d.hotels[i];
      if (!EN()) return [h.name, h.note];
      if (d.detailed) return LD()?.detailed?.[d.id]?.hotels?.[i] || DETAILED_EN[d.id]?.hotels[i] || [h.name, h.note];
      const tpl = LD()?.hotelTpl?.[h.tpl] || HOTEL_TPL_EN[h.tpl];
      return tpl ? [tpl[0].replace("{c}", N.city(d).split(" (")[0].split("（")[0]), tpl[1]] : [h.name, h.note];
    },
    type: (x) => (EN() ? LD()?.hotelType?.[x] || HOTEL_TYPE_EN[x] || x : x),
    airline: (c) => (EN() ? AIRLINE_EN[c] : AIRLINES[c]?.[0]) || c,
    depF: (x, k) => LD()?.dep?.[x.code]?.[k] || DEP_EN[x.code]?.[k],
    dep: (x) => (EN() ? N.depF(x, 0) : x.name) || x.name,
    // 짧은 공항 이름: 각 언어의 "국제공항" 같은 말을 떼어 내요
    depShort: (x) => {
      if (!EN()) return x.name.replace("국제공항", "");
      const full = LD()?.dep?.[x.code]?.[0];
      if (!full) return DEP_EN[x.code]?.[0].replace(/ International Airport| Airport/, "") || x.code;
      return full.replace(/ International Airport| Airport|Aeropuerto Internacional de |Aeropuerto de |Aéroport international d'|Aéroport international de |Aéroport d'|Aéroport de |Internationaler Flughafen |Flughafen |Aeroporto internazionale di |Aeroporto di |Aeroporto Internacional de |Aeroporto de |Bandara Internasional |Bandara | Uluslararası Havalimanı| Havalimanı|Sân bay quốc tế |Sân bay |ท่าอากาศยานนานาชาติ|ท่าอากาศยาน|^مطار | الدولي$|国際空港|空港|国际机场|机场|國際機場|機場/g, "").trim() || full;
    },
    depCity: (x) => (EN() ? N.depF(x, 1) : x.city) || x.city,
    toICN: (x) => (EN() ? N.depF(x, 2) : x.toICN) || x.toICN,
    depNote: (x) => (EN() ? N.depF(x, 3) : x.note) || "",
    hours: (s) => (EN() ? hoursFmt(s, LD()?.hours ? { ...H_EN, ...LD().hours } : H_EN) : s),
    cur(c) {
      if (!EN()) return c === "KRW" ? "대한민국 원" : CURRENCY_INFO[c]?.name || c;
      return intlName("currency", c) || c;
    },
    tips(d) {
      const visa = `${t("visa.label")}: ${N.visa(d.visa)}`;
      if (!EN()) return d.detailed ? [visa, ...d.tips, ...(REGION_TIPS[d.region] || [])] : d.tips;
      const local = d.detailed ? (LD()?.detailed?.[d.id]?.tips || DETAILED_EN[d.id]?.tips || []) : [];
      return [visa, ...local, ...(LD()?.regionTips?.[d.tipKey || d.region] || REGION_TIPS_EN[d.tipKey || d.region] || [])];
    },
    general: (i) => {
      const x = LD()?.generalTips?.[i];
      return x ? { title: x[0], body: x[1] } : EN() ? GENERAL_TIPS_EN[i] : GENERAL_TIPS[i];
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
    // 아랍어(오른쪽→왼쪽): 가격은 왼쪽→오른쪽 숫자 표기로 묶어서 순서가 뒤집히지 않게 해요
    if (I18N.rtl) return `\u2066${fmtIntl(amount, cur, { compact, narrow }, "en-US")}\u2069`;
    return fmtIntl(amount, cur, { compact, narrow }, LOC());
  }
  function fmtIntl(amount, cur, { compact, narrow }, loc) {
    const small = Math.abs(amount) < 100 && !ZERO_DEC.includes(cur);
    const o = { style: "currency", currency: cur, currencyDisplay: narrow ? "narrowSymbol" : "symbol", maximumFractionDigits: small ? 2 : 0, minimumFractionDigits: 0 };
    if (compact && Math.abs(amount) >= 10000) { o.notation = "compact"; o.maximumFractionDigits = 1; }
    try { return new Intl.NumberFormat(loc, o).format(amount); } catch { return `${Math.round(amount).toLocaleString(loc)} ${cur}`; }
  }
  const money = (krw, set) => fmt(krw / rate(disp(), set), disp());          // 원화 금액 → 표시 통화
  const short = (krw, set) => fmt(krw / rate(disp(), set), disp(), { compact: true });
  const local = (n, cur) => fmt(n, cur, { narrow: true });                    // 현지 통화 그대로
  const signed = (n, f) => (n > 0 ? "▲ " : n < 0 ? "▼ " : "") + f(Math.abs(n));
  const cls = (n) => (n > 0 ? "up" : n < 0 ? "down" : "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v, max = 2) => v.toLocaleString(I18N.rtl ? "en-US" : LOC(), { maximumFractionDigits: v < 1 ? 4 : max });

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
      const r = await fetch(url, { signal: ctl.signal, cache: "no-store" }); // 브라우저 캐시 말고 항상 새로 받기
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }
  const firstOk = async (urls) => { for (const u of urls) { try { return await fetchJSON(u); } catch { /* 다음 주소 */ } } return null; };

  // 환율 출처 3곳에서 받아 가장 최신 값을 써요. (1 통화 = ? 원)
  async function srcErApi() {
    const r = await firstOk(["https://open.er-api.com/v6/latest/KRW"]);
    if (r?.result !== "success") return null;
    const rates = {}; CODES.forEach((c) => { if (r.rates[c]) rates[c] = 1 / r.rates[c]; });
    return { name: "open.er-api.com", time: new Date(r.time_last_update_unix * 1000), rates };
  }
  // fawazahmed0 currency-api: 매일 갱신, 날짜별 과거 값도 있어 '어제 대비'를 모든 통화로 계산할 수 있어요
  const caUrls = (tag) => [
    `https://${tag}.currency-api.pages.dev/v1/currencies/krw.min.json`,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${tag}/v1/currencies/krw.min.json`,
  ];
  const caRates = (r) => { const rates = {}; CODES.forEach((c) => { const v = r?.krw?.[c.toLowerCase()]; if (v) rates[c] = 1 / v; }); return rates; };
  async function srcCurrencyApi() {
    const r = await firstOk(caUrls("latest"));
    if (!r?.date) return null;
    return { name: "currency-api", time: new Date(`${r.date}T00:00:00Z`), date: r.date, rates: caRates(r) };
  }
  async function srcFrankfurter(start) {
    const sym = FRANKFURTER_CODES.join(",");
    const r = await firstOk([
      `https://api.frankfurter.dev/v1/${start}..?base=KRW&symbols=${sym}`,
      `https://api.frankfurter.app/${start}..?from=KRW&to=${sym}`,
    ]);
    if (!r?.rates) return null;
    const dates = Object.keys(r.rates).sort();
    const series = {};
    FRANKFURTER_CODES.forEach((c) => { series[c] = dates.map((d) => 1 / r.rates[d][c]).filter(Number.isFinite); });
    const last = dates[dates.length - 1];
    const rates = {}; FRANKFURTER_CODES.forEach((c) => { if (r.rates[last]?.[c]) rates[c] = 1 / r.rates[last][c]; });
    return { name: "frankfurter", time: new Date(`${last}T15:00:00Z`), rates, dates, raw: r.rates, series };
  }

  // 은행 기준 환율: GitHub Actions가 받아 둔 rates-bank.json (한국수출입은행 → 나중에 하나은행)
  async function srcBank() {
    try {
      const j = await fetchJSON(`rates-bank.json?t=${Date.now()}`, 5000);
      if (!j?.rates || !j.date || diffDays(parse(j.date), TODAY) > 7) return null; // 일주일 넘게 지난 자료는 안 써요
      return j;
    } catch { return null; }
  }

  async function loadRates() {
    const todayIso = iso(TODAY);
    const [er, ca, fr, bank] = await Promise.all([srcErApi(), srcCurrencyApi(), srcFrankfurter(iso(addDays(TODAY, -35))), srcBank()]);
    const srcs = [er, ca, fr].filter((x) => x && Object.keys(x.rates).length).sort((a, b) => b.time - a.time);
    let current = null;
    if (srcs.length) {
      // 가장 최신 출처를 기준으로, 빠진 통화는 다른 출처로 채워요
      current = {};
      [...srcs].reverse().forEach((x) => Object.assign(current, x.rates));
      Object.assign(current, srcs[0].rates);
      Rates.updated = srcs[0].time;
      Rates.source = srcs.map((x) => x.name).join(" · ");
    }
    // 은행이 고시한 통화는 은행 매매기준율로 계산해요
    Rates.bank = null;
    if (bank) {
      current = current || {};
      Object.entries(bank.rates).forEach(([c, v]) => { if (v?.base > 0 && FALLBACK_RATES[c] != null) current[c] = v.base; });
      Rates.bank = bank;
      Rates.source = [bank.name, Rates.source].filter(Boolean).join(" · ");
      if (!Rates.updated) Rates.updated = new Date(`${bank.date}T${bank.time || "11:00"}:00+09:00`); // 다른 출처가 모두 실패했을 때
    }

    Rates.yesterday = {}; Rates.series = {};
    if (fr) {
      Object.assign(Rates.series, fr.series);
      const prev = fr.dates.filter((d) => d < todayIso).pop();
      if (prev) FRANKFURTER_CODES.forEach((c) => { if (fr.raw[prev]?.[c]) Rates.yesterday[c] = 1 / fr.raw[prev][c]; });
    }
    // 어제 값: currency-api의 하루 전 날짜 파일 (모든 통화)
    if (ca) {
      const d = new Date(`${ca.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
      const y = await firstOk(caUrls(d.toISOString().slice(0, 10)));
      if (y?.krw) Object.assign(Rates.yesterday, caRates(y));
    }
    // 은행 통화의 "어제 대비"는 은행의 이전 고시와 비교해요
    if (bank?.prev?.rates) Object.entries(bank.prev.rates).forEach(([c, v]) => { if (v?.base > 0 && FALLBACK_RATES[c] != null) Rates.yesterday[c] = v.base; });

    // 브라우저에 매일 기록해서 추이가 없는 통화도 점점 그래프가 생겨요
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
    if (current) { Rates.today = { ...FALLBACK_RATES, ...current }; Rates.live = true; Rates.checked = new Date(); }
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
  // 숙소 성급: 0=1~2성급, 1=3성급, 2=4성급, 3=5성급 (stay.js·season.js)
  const tierOf = (p) => Math.min(3, Math.max(0, p.stayTier ?? 1));
  // 묵는 밤마다 비수기·평소·성수기 요금을 따로 적용해요
  function stayLocal(d, tier, p) {
    const base = d.stay.tiers[tier].local, s = parse(p.start), n = nightsOf(p);
    let sum = 0; const cnt = { off: 0, good: 0, peak: 0 };
    for (let i = 0; i < n; i++) { const k = SEASON.kind(d, addDays(s, i)); cnt[k]++; sum += base * SEASON.MUL[k]; }
    return { sum, cnt, avg: n ? sum / n : base };
  }
  const dailyRefLocal = (d) => d.daily.food + d.daily.transport; // 1인 1일 식비 + 교통 (현지 통화)
  const blankRow = () => ({ from: "", to: "", text: "", amt: 0 });
  // 예전 형식 계획(관광지 번호 일정 · 소비 수준 배수 · 숙소 번호)을 새 형식으로 바꿔요
  function migrate(p) {
    if (!p) return p;
    const d = destById(p.destId) || DESTINATIONS[0];
    if (p.stayTier == null) p.stayTier = 1;
    if (!["save", "normal", "comfort"].includes(p.style)) p.style = p.level < 1 ? "save" : p.level > 1 ? "comfort" : "normal";
    delete p.level; delete p.hotelIdx;
    if (p.dailyMine === undefined || (p.dailyMine != null && !(p.dailyMine >= 0))) p.dailyMine = null;
    p.days = (p.days || []).map((list) => (Array.isArray(list) ? list : []).map((x) => (typeof x === "number"
      ? { from: "", to: "", text: d.attractions[x] ? N.attr(d, x) : "", amt: Math.round((d.attractions[x]?.cost || 0) * (FALLBACK_RATES[d.currency] || 1)) }
      : { from: String(x.from || "").slice(0, 5), to: String(x.to || "").slice(0, 5), text: String(x.text || "").slice(0, 200), amt: Math.max(0, Number(x.amt) || 0) })));
    return p;
  }

  function routeInfo(d, depCode) {
    const dep = DEP(depCode);
    if (d.countryId === "kr") { // 국내 여행: 같은 지역 → 국내선 → KTX·버스 → 다른 공항에서 국내선
      if ((d.home || []).includes(depCode)) return { mode: "local", airlines: [], price: 0 };
      if (d.routes[depCode]) return { mode: "direct", airlines: d.routes[depCode], price: d.flight.avg };
      if (d.ground) return { mode: "ground", airlines: [], price: d.ground };
      return { mode: "domvia", airlines: [], price: d.flight.avg + 60000 };
    }
    const addKrw = dep.add * 10000;
    if (d.routes[depCode]) return { mode: "direct", airlines: d.routes[depCode], price: d.flight.avg };
    if (depCode !== "ICN" && d.routes.ICN) return { mode: "transfer", airlines: d.routes.ICN, price: d.flight.avg + addKrw, dep };
    const sib = DESTINATIONS.find((x) => x.countryId === d.countryId && x.id !== d.id && (x.routes[depCode] || x.routes.ICN));
    return { mode: "via", airlines: VIA[d.region].split(","), price: d.flight.avg + addKrw, dep: depCode !== "ICN" ? dep : null, sib };
  }
  const routeLabel = (r) => t(`route.${r.mode}`);
  // ---------- 외교부 여행경보 (safety.js) ----------
  const safetyOf = (d) => (d.countryId === "kr" ? null : SAFETY[d.countryId] || { main: null, max: null });
  const lvKey = (l) => ({ 0: "l0", 1: "l1", 2: "l2", 2.5: "l25", 3: "l3", 4: "l4" }[l] || "unknown");
  const lvCls = (l) => (l == null ? "unk" : l >= 4 ? "l4" : l >= 3 ? "l3" : l >= 2.5 ? "l25" : l >= 2 ? "l2" : l >= 1 ? "l1" : "l0");
  const safeUrl = (sf) => (sf?.id ? `https://www.0404.go.kr/ntnSafetyInfo/${sf.id}/detail` : "https://www.0404.go.kr/ntnSafetyInfo/list");
  // 카드에 붙이는 경고 (주요 도시가 특별여행주의보 이상이거나, 나라 안에 3단계 이상 지역이 있으면)
  function safeBadge(d, forCountry) {
    const sf = safetyOf(d);
    if (!sf) return "";
    if (sf.main != null && sf.main >= 2.5) return `<span class="badge safe-b ${lvCls(sf.main)}">${sf.main >= 4 ? "⛔" : "⚠️"} ${t(`safe.${lvKey(sf.main)}`)}</span>`;
    if (forCountry && sf.max >= 3) return `<span class="badge safe-b part">⚠️ ${t("safe.partsBadge", { l: t(`safe.${lvKey(sf.max)}`) })}</span>`;
    return "";
  }
  function safeBlock(d) {
    const sf = safetyOf(d);
    if (!sf) return `<div class="safe l0"><b>${t("safe.title")}</b> · ${t("safe.domestic")}</div>`;
    const lang = I18N.lang;
    // 더 높은 단계 지역이 있으면 "높은 단계 지역", 나라 전체 경보면 "참고"로 설명해요 (지역 설명은 한국어·영어만)
    const higher = sf.max != null && sf.max > (sf.main ?? -1);
    let parts = "";
    if (sf.parts && (lang === "ko" || lang === "en")) parts = t(higher ? "safe.parts" : "safe.note", { p: esc(sf.parts[lang === "ko" ? 0 : 1]) });
    else if (higher && sf.max >= 1) parts = t("safe.partsGen", { l: t(`safe.${lvKey(sf.max)}`) });
    const date = new Intl.DateTimeFormat(LOC(), { year: "numeric", month: "short", day: "numeric" }).format(parse(SAFETY_CHECKED));
    return `<div class="safe ${lvCls(sf.main)}">
      <div><b>${t("safe.title")}</b> · <span class="safe-lv">${t(`safe.${sf.main == null ? "unknown" : lvKey(sf.main)}`)}</span></div>
      <div class="safe-d">${t(`safe.d${sf.main == null ? "Unknown" : lvKey(sf.main).slice(1)}`)}</div>
      ${parts ? `<div class="safe-d">${parts}</div>` : ""}
      <div class="safe-src">${t("safe.src", { d: esc(date) })} <a href="${safeUrl(sf)}" target="_blank" rel="noopener">${t("safe.link")}</a></div>
    </div>`;
  }
  const isFlight = (r) => !["local", "ground"].includes(r.mode);
  const routeHours = (d, r) => (r.mode === "ground" && d.groundTime ? d.groundTime : r.mode === "local" ? "" : d.flight.hours);

  function defaultPlan(destId = "tokyo", dep = "ICN") {
    const d = destById(destId);
    const start = addDays(TODAY, 45);
    return {
      destId: d.id, dep, start: iso(start), end: iso(addDays(start, 3)), people: 2, rooms: 1,
      flightPrice: routeInfo(d, dep).price, stayTier: 1, style: "normal", dailyMine: null, days: [], extras: [],
    };
  }

  function loadPlan() {
    let p = store.get("tm_plan", null) || defaultPlan();
    if (!DESTINATIONS.some((d) => d.id === p.destId)) p = defaultPlan();
    migrate(p);
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
    plan.days.forEach((l) => { if (!l.length) l.push(blankRow()); }); // 날마다 적을 칸 1줄은 항상 보여요
  }

  // ---------- 비용 계산 (원화 기준으로 계산하고, 표시할 때 표시 통화로 바꿔요) ----------
  function costItems(p0, rateSet = Rates.today) {
    const p = migrate(JSON.parse(JSON.stringify(p0)));
    const d = destById(p.destId);
    const nights = nightsOf(p), days = nights + 1;
    const cur = d.currency;
    const st = stayLocal(d, tierOf(p), p);
    const rows = p.days.flat().filter((e) => e.amt > 0);
    const items = [
      { key: "flight", lk: { ground: "ground", local: "ground" }[routeInfo(d, p.dep).mode], krw: p.flightPrice * p.people, note: () => `${money(p.flightPrice)} × ${t("unit.people", { n: p.people })}` },
      { key: "hotel", localAmt: st.sum * p.rooms, cur, note: () => t("note.hotel", { n: nights, r: p.rooms }) },
      { key: "attr", krw: rows.reduce((s, e) => s + e.amt, 0) * p.people, note: () => t("note.sched", { n: rows.length, p: p.people }) },
      p.dailyMine != null
        ? { key: "daily", krw: p.dailyMine * days * p.people, note: () => t("note.dailyMine", { n: days, p: p.people }) }
        : { key: "daily", localAmt: dailyRefLocal(d) * days * p.people, cur, note: () => t("note.daily", { n: days, p: p.people }) },
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
  // ---------- 여행자 공유 시세 ----------
  function crowd(d) {
    const C = window.TMCrowd;
    if (!C) return null;
    C.want(d.countryId, onCrowd);
    const st = C.stats(d.id, d.countryId, plan.dep, routeInfo(d, plan.dep).price);
    return st && st.n >= C.MIN_N ? st : st ? { ...st, few: true } : null;
  }
  let crowdTimer = null;
  function onCrowd() { // 불러오기가 끝나면 시세가 보이는 곳만 다시 그려요 (입력칸은 건드리지 않음)
    clearTimeout(crowdTimer);
    crowdTimer = setTimeout(() => { renderDestinations(); renderDestInfo(); renderFlight(); renderDaily(); renderSuggestions(costItems(plan)); }, 50);
  }
  function cityButton(d, m, withCountry) {
    const r = routeInfo(d, plan.dep);
    const cs = crowd(d);
    return `<button class="city ${d.id === plan.destId ? "on" : ""}" data-city="${d.id}">
      <div class="nm">${withCountry ? `${d.flag} ` : ""}${esc(N.city(d))}</div>
      <div class="ct">${withCountry ? `${esc(N.country(d.countryId))} · ` : ""}${routeLabel(r)}${r.mode === "direct" && r.airlines.length ? ` · ${t("city.airlines", { n: r.airlines.length })}` : ""}${routeHours(d, r) ? ` · ${esc(N.hours(routeHours(d, r)))}` : ""}</div>
      <div class="pr">${r.mode === "local" ? t("route.localShort") : `${t(r.mode === "ground" ? "city.rtGround" : "city.rt")} <b>${short(r.price)}</b>`}</div>${safeBadge(d, false)}${cs && !cs.few ? `<div class="crowd-pr">👥 ${t("crowd.card", { p: `<b>${short(cs.med)}</b>`, n: cs.n })}</div>` : ""}${seasonBadge(d, m)}
    </button>`;
  }

  function renderDestinations() {
    const m = parse(plan.start).getMonth() + 1;
    const cur = destById(plan.destId);
    $("#crumb").innerHTML = `${t("pick.current")}: <b>${N.region(regionOf(cur.region))} › ${cur.flag} ${esc(N.country(cur.countryId))} › ${esc(N.city(cur))}</b>`;

    const q = ui.query.trim().toLowerCase();
    if (q) {
      const hits = DESTINATIONS.filter((d) => [d.name, d.country, regionOf(d.region).name, CITY_EN[d.id]?.[0] || "", N.city(d), REGION_EN[d.region], N.region(regionOf(d.region)), N.country(d.countryId), (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode(d.countryId)); } catch { return ""; } })()]
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
      const minP = Math.min(...cities.map((d) => routeInfo(d, plan.dep).price).filter((v) => v > 0), Infinity); // 교통비 0원(같은 지역)은 빼요
      const direct = cities.some((d) => d.routes[plan.dep]);
      return `<button class="country ${c.id === ui.country ? "on" : ""}" data-country="${c.id}">
        <span class="flag">${c.flag}</span><span><span class="nm">${esc(N.country(c.id))}</span>
        <span class="ct">${t("country.cities", { n: cities.length })} · ${Number.isFinite(minP) ? t("country.from", { p: short(minP) }) : t("route.localShort")}</span>
        ${direct ? `<span class="ct"><i class="dot"></i>${t("country.direct", { a: esc(N.depCity(DEP(plan.dep))) })}</span>` : ""}${safeBadge(cities[0], true)}</span>
      </button>`;
    }).join("");

    const country = COUNTRIES.find((c) => c.id === ui.country);
    $("#cityHead").innerHTML = `${country.flag} ${t("pick.cityHead", { c: esc(N.country(country.id)) })} <small>${t("visa.label")}: ${esc(N.visa(country.visa))}</small>`;
    $("#cityGrid").innerHTML = DESTINATIONS.filter((d) => d.countryId === ui.country).map((d) => cityButton(d, m, false)).join("");
  }

  function renderDestInfo() {
    const d = destById(plan.destId);
    const dayLocal = dailyRefLocal(d);
    const r0 = routeInfo(d, plan.dep);
    const domestic = d.countryId === "kr";
    const rl = rateLabel(d.currency);
    const cs = crowd(d);
    $("#plannerTitle").textContent = `${d.flag} ${N.city(d)}`;
    $("#destInfo").innerHTML = `
      <div class="info-head"><div class="flag">${d.flag}</div>
        <div><h3 style="margin:0">${esc(N.city(d))}, ${esc(N.country(d.countryId))}</h3>
        <div class="hint" style="margin:0">${N.region(regionOf(d.region))}${routeHours(d, r0) ? ` · ${t(isFlight(r0) ? "info.flight" : "info.move")} ${esc(N.hours(routeHours(d, r0)))}` : ""} · ${t("info.currency")} ${esc(N.cur(d.currency))}</div></div></div>
      <div class="visa">🛂 ${t("visa.label")}: ${esc(N.visa(d.visa))}${d.detailed ? "" : ` <span class="badge">${t("info.estimate")}</span>`}</div>
      ${safeBlock(d)}
      <div class="info-stats">
        ${domestic ? `<div class="stat"><div class="k">${t("info.trans")}</div><div class="v">${r0.mode === "local" ? t("route.localShort") : short(r0.price)}</div></div>`
          : `<div class="stat"><div class="k">${t("info.fare")}</div><div class="v">${short(d.flight.low)}~${short(d.flight.high)}</div></div>`}
        ${cs && !cs.few ? `<div class="stat crowd"><div class="k">👥 ${t("crowd.title")}</div><div class="v">${short(cs.med)} <small>(${t("crowd.people", { n: cs.n })})</small></div></div>` : ""}
        <div class="stat"><div class="k">${t("info.stay3")}</div><div class="v">${t("approx")} ${short(d.stay.tiers[1].local * rate(d.currency))}</div></div>
        <div class="stat"><div class="k">${t("info.daily")}</div><div class="v">${t("approx")} ${short(dayLocal * rate(d.currency))}</div></div>
        <div class="stat"><div class="k">${t("info.rate")}</div><div class="v">${d.currency === "KRW" && disp() === "KRW" ? t("info.noFx") : `${rl.head} = ${rl.value}`}</div></div>
      </div>
      <div class="months">${Array.from({ length: 12 }, (_, i) => i + 1).map((mm) =>
        `<span class="${d.bestMonths.includes(mm) ? "good" : d.peakMonths.includes(mm) ? "peak" : ""}">${monthName(mm)}</span>`).join("")}</div>
      <p class="hint">${t("info.legend")}${d.stay.cm && d.stay.em ? `<br />🏨 ${t("stay.months", { c: monthName(d.stay.cm), e: monthName(d.stay.em) })}` : ""}</p>`;
  }

  // ---------- 렌더: 폼 ----------
  function renderForm() {
    const d = destById(plan.destId);
    const dShort = (d) => new Intl.DateTimeFormat(LOC(), { year: "2-digit", month: "numeric", day: "numeric", weekday: "short" }).format(d);
    $("#startBtn").textContent = dShort(parse(plan.start));
    $("#endBtn").textContent = dShort(parse(plan.end));
    $("#startBtn").title = dateFull(parse(plan.start)); $("#endBtn").title = dateFull(parse(plan.end));
    $("#people").value = plan.people;
    const groups = [["intl", t("dep.intl")], ["dom", t("dep.dom")]];
    $("#dep").innerHTML = groups.map(([type, label]) => `<optgroup label="${label}">${DEPARTURES.filter((x) => x.type === type)
      .map((x) => `<option value="${x.code}" ${x.code === plan.dep ? "selected" : ""}>${esc(N.dep(x))} (${esc(N.depCity(x))})</option>`).join("")}</optgroup>`).join("");
    $("#depHint").textContent = N.depNote(DEP(plan.dep));
    $("#rooms").value = plan.rooms;
    $("#flightPrice").value = Math.round(plan.flightPrice / rate(disp()));
    $("#flightPrice").step = disp() === "KRW" ? 10000 : "any";
    $("#flightUnit").textContent = disp() === "KRW" && !EN() ? "원" : disp();
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
    if (r.mode === "local") html += `<div class="route-row">${t("route.localMsg", { a: esc(N.dep(dep)), c: esc(N.city(d)) })}</div>`;
    else if (r.mode === "ground") html += `<div class="route-row">${t("route.groundMsg", { c: esc(N.city(d)), h: esc(N.hours(d.groundTime || "")) })}</div>`;
    else if (r.mode === "domvia") html += `<div class="route-row">${t("route.domviaMsg", { a: esc(N.dep(dep)), c: esc(N.city(d)) })}</div>`;
    else if (r.mode === "direct") html += `<div class="route-row">${r.airlines.length ? airlineChips(r.airlines) : t("route.noAirline")}</div>`;
    else if (r.mode === "transfer") html += `<div class="route-row">${t("route.transferMsg", { a: esc(N.dep(dep)), how: esc(N.toICN(dep)) })}<br/>${airlineChips(r.airlines)}</div>`;
    else {
      html += `<div class="route-row">${r.dep ? t("route.viaFrom", { how: esc(N.toICN(r.dep)) }) : t("route.viaMsg")}<br/>${airlineChips(r.airlines)}</div>`;
      if (r.sib) {
        const sr = r.sib.routes[plan.dep] || r.sib.routes.ICN;
        html += `<div class="route-row">💡 ${t("route.sib", { c: esc(N.city(r.sib)) })} ${airlineChips(sr)}
          <button class="chip-btn" data-city-jump="${r.sib.id}">${t("route.see", { c: esc(N.city(r.sib)) })}</button></div>`;
      }
    }
    const others = DEPARTURES.filter((x) => x.code !== plan.dep && (d.routes[x.code] || (d.home || []).includes(x.code)));
    if (others.length) html += `<div class="route-other">${t("route.others")}: ${others.map((x) =>
      `<button class="chip-btn" data-dep="${x.code}">✈️ ${esc(N.depShort(x))}${d.routes[x.code]?.length ? ` (${d.routes[x.code].length})` : ""}</button>`).join("")}</div>`;
    html += `<p class="hint">${t("route.legend")}</p>`;
    $("#routeInfo").innerHTML = html;

    const log = store.get("tm_price_log", []).filter((x) => x.dest === d.id && x.dep === plan.dep).slice(-5).reverse();
    $("#priceLog").innerHTML = log.length ? `📒 ${t("route.myPrices")}: ${log.map((x) => `${x.date.slice(5)} <b>${short(x.price)}</b>`).join(" · ")}` : "";
  }

  function renderFlight() {
    renderRoute();
    // 국내 여행에서 같은 지역·KTX로 가는 경우에는 항공 시세 막대와 공유 시세를 숨겨요
    const rr = routeInfo(destById(plan.destId), plan.dep), fl = isFlight(rr);
    ["#flightBar", "#crowdStat", "#crowdShareRow"].forEach((s) => { const el = $(s); if (el) el.hidden = !fl; });
    if (!fl) { const h = $("#flightHint"); h.className = "hint"; h.textContent = t(rr.mode === "local" ? "fare.localHint" : "fare.groundHint"); return; }
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
    const d0 = destById(plan.destId), cs = crowd(d0);
    $("#flightBar").classList.toggle("has-crowd", !!(cs && !cs.few));
    if (cs && !cs.few) {
      const x = pos(cs.med), edge = x < 12 ? " start" : x > 88 ? " end" : "";
      $("#flightBar").insertAdjacentHTML("beforeend", `<div class="pin crowd" style="left:${x}%"></div><div class="mark tick crowd${edge}" style="left:${x}%">👥 ${short(cs.med)}</div>`);
    }
    const ce = $("#crowdStat");
    if (ce) {
      ce.innerHTML = !cs || !cs.n ? `👥 ${t("crowd.none")}`
        : cs.few ? `👥 ${t("crowd.few", { n: cs.n })}`
        : `👥 ${t(cs.scope === "dep" ? "crowd.stat" : "crowd.statAll", { p: `<b>${short(cs.med)}</b>`, n: cs.n, lo: short(cs.lo), hi: short(cs.hi), a: esc(N.depShort(DEP(plan.dep))) })}`;
    }
    const sh = $("#crowdShareRow");
    if (sh) {
      const logged = !!window.TMAuth?.user;
      $("#crowdShare").checked = window.TMCrowd?.sharing() ?? true;
      $("#crowdShare").disabled = !logged;
      $("#crowdShareText").textContent = logged ? t("crowd.share") : t("crowd.loginToShare");
    }
    const diff = plan.flightPrice - f.avg;
    const h = $("#flightHint");
    h.className = "hint" + (diff > f.avg * 0.15 ? " warn" : "");
    h.textContent = Math.abs(diff) < 1 ? t("fare.isAvg") : diff < 0 ? t("fare.cheaper", { p: money(-diff) }) : t("fare.pricier", { p: money(diff) });
  }

  function renderHotels() {
    const d = destById(plan.destId), r = rate(d.currency), tier = tierOf(plan);
    $("#hotelList").innerHTML = d.stay.tiers.map((x, i) => {
      const b = x.local * r, st = stayLocal(d, i, plan);
      return `<label class="hotel ${i === tier ? "on" : ""}">
        <input type="radio" name="hotel" value="${i}" ${i === tier ? "checked" : ""}/>
        <div><div class="hn">${t(`stay.${x.k}`)}</div>
          <div class="hm">${t("stay.seasons", { o: short(b * SEASON.MUL.off), a: short(b), p: short(b * SEASON.MUL.peak) })}</div></div>
        <div class="hp">${short(st.avg * r)}<small>${t("stay.thisTrip")}</small></div>
      </label>`;
    }).join("");
    const st = stayLocal(d, tier, plan), n = nightsOf(plan);
    const srcName = d.stay.src === "city" ? N.city(d) : N.country(d.countryId);
    $("#stayNote").innerHTML = [
      n ? `🗓️ ${t("stay.nights", { n, p: st.cnt.peak, g: st.cnt.good, o: st.cnt.off })}` : "",
      t("stay.note"),
      `${t(`stay.src.${d.stay.src}`, { c: esc(srcName) })}${d.stay.url ? ` · <a href="${d.stay.url}" target="_blank" rel="noopener">${t("stay.srcLink")}</a>` : ""}`,
      tier === 0 ? t("stay.t12note") : "",
      d.stay.fix ? t("stay.fix") : "",
    ].filter(Boolean).map((x) => `<span>${x}</span>`).join("");
  }

  const unitLabel = () => (disp() === "KRW" && !EN() ? "원" : disp());
  function daySum(list) { return list.reduce((a, e) => a + (e.amt || 0), 0); }
  function renderDays() {
    const d = destById(plan.destId);
    const s = parse(plan.start);
    const ex = d.attractions.length ? N.attr(d, 0) : "";
    $("#dayList").innerHTML = plan.days.map((list, di) => {
      const date = addDays(s, di);
      const tag = di === 0 ? t("day.depart") : di === plan.days.length - 1 ? t("day.return") : "";
      const rows = list.map((e, ri) => `<div class="sched-row" data-day="${di}" data-row="${ri}">
          <div class="sched-time"><input type="time" data-f="from" value="${esc(e.from)}" aria-label="${t("sched.from")}" /><span>~</span><input type="time" data-f="to" value="${esc(e.to)}" aria-label="${t("sched.to")}" /></div>
          <input type="text" class="sched-text" data-f="text" value="${esc(e.text)}" maxlength="200" dir="auto" placeholder="${esc(t("sched.ph", { ex }))}" aria-label="${t("sched.what")}" />
          <div class="sched-amt"><input type="number" data-f="amt" min="0" step="any" inputmode="decimal" value="${e.amt ? Math.round(e.amt / rate(disp())) : ""}" placeholder="${t("sched.amt")}" aria-label="${t("sched.amt")}" /><span>${unitLabel()}</span></div>
          <button type="button" class="sched-del" data-del-row aria-label="${t("remove")}">✕</button>
        </div>`).join("");
      const sum = daySum(list);
      return `<div class="day" data-day-box="${di}">
        <div class="day-head">${t("day.n", { n: di + 1 })} <span>${dayLabel(date)} ${tag}</span><b class="day-sum" data-sum="${di}">${sum ? t("sched.daySum", { p: short(sum) }) : ""}</b></div>
        <div class="sched-list">${rows}</div>
        <button type="button" class="chip-btn" data-add-row="${di}">${t("sched.add")}</button>
      </div>`;
    }).join("");
  }

  function renderDaily() {
    const d = destById(plan.destId), r = rate(d.currency);
    document.querySelectorAll("#styleSeg button").forEach((b) => b.classList.toggle("on", b.dataset.style === plan.style));
    const refKrw = dailyRefLocal(d) * r;
    const inp = $("#dailyMine");
    if (document.activeElement !== inp) inp.value = plan.dailyMine != null ? Math.round(plan.dailyMine / rate(disp())) : "";
    inp.placeholder = String(Math.round(refKrw / rate(disp())));
    inp.step = disp() === "KRW" ? 1000 : "any";
    $("#dailyUnit").textContent = unitLabel();
    $("#dailyRef").innerHTML = t("daily.ref", { f: short(d.daily.food * r), t: short(d.daily.transport * r), s: short(refKrw) })
      + (plan.dailyMine == null ? ` ${t("daily.usingRef")}` : ` <button type="button" class="link" id="dailyReset">${t("daily.reset")}</button>`);
    const C = window.TMCrowd;
    C?.wantSpend(d.countryId, onCrowd);
    const st = C?.spendStats(d.id, d.countryId, plan.style, refKrw);
    const box = $("#dailyCrowd");
    if (!st || !st.n) box.innerHTML = t("daily.crowdNone");
    else if (st.n < (C?.MIN_N || 3)) box.innerHTML = t("daily.crowdFew", { n: st.n });
    else {
      box.innerHTML = `${t(st.scope === "style" ? "daily.crowdStyle" : "daily.crowdAll", { s: t(`level.${plan.style === "comfort" ? "comfort" : plan.style}`), n: st.n, c: st.cnt, lo: short(st.lo), hi: short(st.hi) })}
        <button type="button" class="chip-btn" id="useCrowdDaily" data-amt="${st.mid}">${t("daily.use", { p: short(st.mid) })}</button>
        <span class="hint" style="display:block">${t("daily.crowdNote")}</span>`;
    }
    const logged = !!window.TMAuth?.user;
    $("#spendShare").checked = C?.sharing() ?? true;
    $("#spendShare").disabled = !logged;
    $("#spendShareText").textContent = logged ? t("daily.share") : t("crowd.loginToShare");
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
        <div class="bd"><span>${t(`item.${it.lk || it.key}`)} <span class="hint" style="margin:0;font-size:.78rem">${it.note()}</span></span>
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
    if ([5, 6, 0].includes(wd) && plan.flightPrice > 0) add("warn", t("sg.weekend", { d: dayName, p: short(plan.flightPrice * 0.12 * plan.people) }));
    else if ([2, 3, 4].includes(wd)) add("good", t("sg.weekday", { d: dayName }));

    if (d.peakMonths.includes(m)) add("warn", t("sg.peak", { m: monthName(m), c: city, alt: monthList(d.bestMonths.filter((x) => !d.peakMonths.includes(x)).slice(0, 3)) }));
    else if (d.bestMonths.includes(m)) add("good", t("sg.best", { m: monthName(m), c: city }));
    else add("", t("sg.off", { m: monthName(m) }));

    const sf = safetyOf(d);
    if (sf?.main >= 4) add("warn", t("sg.safe4", { c: city }));
    else if (sf?.main >= 3) add("warn", t("sg.safe3", { c: city }));
    else if (sf?.main >= 2.5) add("warn", t("sg.safe25", { c: city }));
    else if (sf && sf.max >= 3) add("", t("sg.safeParts", { c: city, l: t(`safe.${lvKey(sf.max)}`) }));

    const lead = diffDays(TODAY, s);
    const long = d.flight.avg >= 800000;
    const [lo, hi] = long ? [90, 150] : [30, 60];
    if (lead < lo) add("warn", t("sg.late", { n: lead, kind: t(long ? "sg.long" : "sg.short"), lo, hi }));
    else if (lead > hi) add("", t("sg.early", { n: lead, hi }));
    else add("good", t("sg.ontime", { n: lead }));

    if (isFlight(routeInfo(d, plan.dep)) && plan.flightPrice > d.flight.avg * 1.15) add("warn", t("sg.fare", { n: Math.round((plan.flightPrice / d.flight.avg - 1) * 100) }));
    const cs = crowd(d);
    if (cs && !cs.few && plan.flightPrice > cs.med * 1.15) add("warn", t("sg.crowd", { n: cs.n, p: short(cs.med), d: short(plan.flightPrice - cs.med) }));

    const stc = stayLocal(d, tierOf(plan), plan).cnt;
    if (stc.peak) add("warn", t("sg.stayPeak", { n: stc.peak }));
    else if (nightsOf(plan) && stc.off === nightsOf(plan)) add("good", t("sg.stayOff"));
    if (plan.rooms * 3 < plan.people) add("warn", t("sg.rooms", { p: plan.people, r: plan.rooms }));

    const filled = (l) => l.filter((e) => e.text.trim() || e.amt > 0 || e.from);
    const emptyDays = plan.days.map((l, i) => (!filled(l).length && i > 0 && i < plan.days.length - 1 ? i + 1 : null)).filter(Boolean);
    if (emptyDays.length && d.attractions.length) add("", t("sg.empty", { d: emptyDays.join(", "), a: d.attractions.slice(0, 2).map((_, i) => esc(N.attr(d, i))).join(", ") }));
    const packed = plan.days.map((l, i) => (filled(l).length > 3 ? i + 1 : null)).filter(Boolean);
    if (packed.length) add("warn", t("sg.packed", { d: packed.join(", ") }));
    if (plan.days.length > 1 && (filled(plan.days[0]).length > 2 || filled(plan.days[plan.days.length - 1]).length > 2)) add("warn", t("sg.edge"));
    // 시간 확인: 끝 시간이 더 빠른 줄, 겹치는 줄
    const bad = [], over = [];
    plan.days.forEach((l, i) => {
      const timed = l.filter((e) => e.from && e.to);
      if (timed.some((e) => e.to <= e.from)) bad.push(i + 1);
      const ok = timed.filter((e) => e.to > e.from).sort((a, b) => (a.from < b.from ? -1 : 1));
      if (ok.some((e, k) => k > 0 && e.from < ok[k - 1].to)) over.push(i + 1);
    });
    if (bad.length) add("warn", t("sg.timeBad", { d: bad.join(", ") }));
    if (over.length) add("warn", t("sg.overlap", { d: over.join(", ") }));

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

  // 은행 송금 환율 한 줄 (원화 기준, 100엔처럼 단위를 맞춰요)
  function bankLine(c) {
    const b = Rates.bank?.rates?.[c];
    if (!b || c === "KRW" || !(b.tts > 0 && b.ttb > 0)) return "";
    const unit = ["JPY", "VND", "IDR"].includes(c) ? 100 : 1;
    const w = (v) => fmt(v * unit, "KRW", { narrow: true });
    return `<div class="rbank">🏦 ${unit} ${c} · ${t("rates.bankCard", { s: w(b.tts), b: w(b.ttb) })}</div>`;
  }
  function renderRates() {
    const dCur = destById(plan.destId).currency;
    const base = disp();
    const list = [dCur, ...(ui.allRates ? CODES : MAJOR), ...(base !== "KRW" ? ["KRW"] : [])].filter((c, i, a) => a.indexOf(c) === i && (c !== base || c === "KRW"));
    $("#toggleRates").textContent = ui.allRates ? t("rates.fewer") : t("rates.all", { n: CODES.length });
    $("#rateBase").textContent = t("rates.base", { c: base === "KRW" && !EN() ? "원화(KRW)" : `${N.cur(base)} (${base})` });
    const rb = $("#rateBank");
    if (rb) {
      rb.hidden = !Rates.bank;
      if (Rates.bank) rb.textContent = t("rates.bank", { s: t(`rates.src.${Rates.bank.provider}`), d: new Intl.DateTimeFormat(LOC(), { month: "long", day: "numeric", weekday: "short" }).format(parse(Rates.bank.date)), n: Object.keys(Rates.bank.rates).length });
    }
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
        ${bankLine(c)}
        <div class="rn">${c === "KRW" ? t("rates.krwNote") : pos == null ? t("rates.collect") : pos <= 0.3 ? t("rates.low") : pos >= 0.7 ? t("rates.high") : t("rates.mid")}</div>
      </div>`;
    }).join("");
    $("#rateUpdated").textContent = Rates.live
      ? t("rates.updated", { d: Rates.updated ? Rates.updated.toLocaleString(LOC(), { dateStyle: "medium", timeStyle: "short" }) : "" })
        + (Rates.checked ? ` · ${t("rates.checked", { d: Rates.checked.toLocaleTimeString(LOC(), { hour: "2-digit", minute: "2-digit" }) })}` : "")
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
    // 로그인 없이 하기에서는 계획을 저장하지 않아요 → 로그인 창을 열어요
    if (!window.TMAuth?.user) { toast(t("save.needLogin")); window.TMAuth?.openLogin?.(); return; }
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
      const x = N.general(i);
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

  // ---------- 날짜 선택 (큰 달력 창) ----------
  // 출발일 → 귀국일 순서로 고르면 창이 닫혀요. 날마다 성수기·추천·비수기 색으로 보여 줘요.
  const dateFull = (d) => new Intl.DateTimeFormat(LOC(), { year: "numeric", month: "short", day: "numeric", weekday: "short" }).format(d);
  const cal = { mode: "start", view: null, start: null, end: null };
  const MAX_AHEAD = 730;
  const calMonths = () => (window.innerWidth >= 760 ? 2 : 1);
  function openCal(mode) {
    cal.mode = mode; cal.start = plan.start; cal.end = plan.end;
    const base = parse(mode === "end" ? plan.end : plan.start);
    cal.view = new Date(base.getFullYear(), base.getMonth(), 1);
    renderCal();
    const m = $("#dateModal"); m.hidden = false; document.body.classList.add("locked");
    m.querySelector(".cal-wrap button:not(:disabled)")?.focus({ preventScroll: true });
  }
  function closeCal() {
    $("#dateModal").hidden = true;
    document.body.classList.toggle("locked", !$("#authScreen").hidden || !$("#welcome").hidden);
  }
  function renderCal() {
    const d = destById(plan.destId);
    $("#dateTitle").textContent = t(cal.mode === "start" ? "date.pickStart" : "date.pickEnd");
    const wk = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOC(), { weekday: "narrow" }).format(new Date(2024, 0, 7 + i)));
    const max = addDays(TODAY, MAX_AHEAD);
    const first = new Date(cal.view.getFullYear(), cal.view.getMonth(), 1);
    $("#calPrev").disabled = first <= new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    $("#calNext").disabled = new Date(first.getFullYear(), first.getMonth() + calMonths(), 1) > max;
    const months = [];
    for (let k = 0; k < calMonths(); k++) {
      const m0 = new Date(first.getFullYear(), first.getMonth() + k, 1);
      const label = new Intl.DateTimeFormat(LOC(), { year: "numeric", month: "long" }).format(m0);
      const pad0 = m0.getDay(), dim = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
      let cells = "";
      for (let i = 0; i < pad0; i++) cells += `<span class="cal-blank"></span>`;
      for (let day = 1; day <= dim; day++) {
        const dt = new Date(m0.getFullYear(), m0.getMonth(), day), v = iso(dt);
        const kind = SEASON.kind(d, dt), tg = SEASON.tags(d, dt);
        const off = dt < TODAY || dt > max;
        const sel = v === cal.start ? " sel-start" : v === cal.end ? " sel-end" : (cal.start && cal.end && v > cal.start && v < cal.end ? " in-range" : "");
        const why = tg.map((x) => t(`tag.${x}`)).join(", ") || (kind === "peak" ? t("tag.month") : "");
        cells += `<button type="button" class="cal-day k-${kind}${sel}${v === iso(TODAY) ? " today" : ""}${tg.length ? " holi" : ""}" data-date="${v}" ${off ? "disabled" : ""}
          title="${esc(why)}" aria-label="${esc(dateFull(dt))}${why ? ` · ${esc(why)}` : ""}">${day}</button>`;
      }
      months.push(`<div class="cal-month"><div class="cal-mlabel">${esc(label)}</div>
        <div class="cal-grid">${wk.map((w) => `<span class="cal-wk">${w}</span>`).join("")}${cells}</div></div>`);
    }
    $("#calWrap").innerHTML = months.join("");
    // 선택한 기간 요약 (밤마다 성수기·평소·비수기)
    const s = parse(cal.start), e = parse(cal.end), n = Math.max(0, diffDays(s, e));
    const cnt = { peak: 0, good: 0, off: 0 }, reasons = new Set();
    for (let i = 0; i <= n; i++) { const dt = addDays(s, i); cnt[SEASON.kind(d, dt)]++; SEASON.tags(d, dt).forEach((x) => reasons.add(t(`tag.${x}`))); }
    $("#dateSel").innerHTML = `<b>${esc(dateFull(s))}</b> ~ <b>${esc(dateFull(e))}</b> · ${tripLen(n)}<br />${t("date.sum", { p: cnt.peak, g: cnt.good, o: cnt.off })}${reasons.size ? ` · ${t("date.why", { w: esc([...reasons].join(", ")) })}` : ""}`;
  }
  function pickDate(v) {
    if (cal.mode === "start" || v < cal.start) {
      const n = Math.max(1, nightsOf(plan) || 3);
      cal.start = v;
      if (cal.end <= v) cal.end = iso(addDays(parse(v), n));
      cal.mode = "end"; renderCal();
      return;
    }
    cal.end = v === cal.start ? iso(addDays(parse(v), 1)) : v;
    plan.start = cal.start; plan.end = cal.end;
    closeCal(); update(); renderTips(); renderDestInfo();
  }
  function bindCal() {
    const m = $("#dateModal");
    $("#calWrap").addEventListener("click", (e) => { const b = e.target.closest("[data-date]"); if (b && !b.disabled) pickDate(b.dataset.date); });
    $("#calPrev").addEventListener("click", () => { cal.view = new Date(cal.view.getFullYear(), cal.view.getMonth() - 1, 1); renderCal(); });
    $("#calNext").addEventListener("click", () => { cal.view = new Date(cal.view.getFullYear(), cal.view.getMonth() + 1, 1); renderCal(); });
    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeCal));
    m.addEventListener("click", (e) => { if (e.target === m) closeCal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !m.hidden) closeCal(); });
    window.addEventListener("resize", () => { if (!m.hidden) renderCal(); });
  }

  // ---------- 이벤트 ----------
  function bind() {
    const pickCity = (id) => {
      const keep = { start: plan.start, end: plan.end, people: plan.people, rooms: plan.rooms, style: plan.style, stayTier: plan.stayTier };
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
    const setDep = (code) => { plan.dep = code; plan.flightPrice = routeInfo(destById(plan.destId), code).price; update(); renderDestInfo(); };
    $("#dep").addEventListener("change", (e) => setDep(e.target.value));
    $("#routeInfo").addEventListener("click", (e) => {
      const b = e.target.closest("[data-dep]"); if (b) setDep(b.dataset.dep);
      const j = e.target.closest("[data-city-jump]"); if (j) pickCity(j.dataset.cityJump);
    });
    $("#toggleRates").addEventListener("click", () => { ui.allRates = !ui.allRates; renderRates(); });

    // 날짜: 큰 달력 창
    $("#startBtn").addEventListener("click", () => openCal("start"));
    $("#endBtn").addEventListener("click", () => openCal("end"));
    bindCal();
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
      const d = destById(plan.destId);
      if (isFlight(routeInfo(d, plan.dep))) window.TMCrowd?.submit({ dest: d.id, country: d.countryId, dep: plan.dep, price: plan.flightPrice, month: parse(plan.start).getMonth() + 1 })
        .then((ok) => { if (ok) { toast(t("crowd.shared")); onCrowd(); } });
      update();
    });
    $("#crowdShare").addEventListener("change", (e) => { window.TMCrowd?.setSharing(e.target.checked); renderDaily(); });
    $("#hotelList").addEventListener("change", (e) => { if (e.target.name === "hotel") { plan.stayTier = Number(e.target.value); update(); } });
    // 일자별 일정: 칸을 고치면 계획과 합계만 바꿔요 (입력 중인 칸이 다시 그려지지 않게)
    $("#dayList").addEventListener("change", (e) => {
      const row = e.target.closest(".sched-row"), f = e.target.dataset.f;
      if (!row || !f) return;
      const di = Number(row.dataset.day), ri = Number(row.dataset.row), en = plan.days[di]?.[ri];
      if (!en) return;
      if (f === "amt") en.amt = Math.round(Math.max(0, Number(e.target.value) || 0) * rate(disp()));
      else if (f === "text") en.text = e.target.value.slice(0, 200);
      else en[f] = e.target.value;
      const sumEl = document.querySelector(`[data-sum="${di}"]`);
      if (sumEl) sumEl.textContent = daySum(plan.days[di]) ? t("sched.daySum", { p: short(daySum(plan.days[di])) }) : "";
      save(); renderSummary();
    });
    $("#dayList").addEventListener("click", (e) => {
      const add = e.target.closest("[data-add-row]"), del = e.target.closest("[data-del-row]");
      if (add) {
        const di = Number(add.dataset.addRow);
        if (plan.days[di].length >= 20) return;
        plan.days[di].push(blankRow()); save(); renderDays();
        document.querySelector(`[data-day="${di}"][data-row="${plan.days[di].length - 1}"] .sched-text`)?.focus();
      } else if (del) {
        const row = del.closest(".sched-row"), di = Number(row.dataset.day);
        plan.days[di].splice(Number(row.dataset.row), 1);
        if (!plan.days[di].length) plan.days[di].push(blankRow());
        save(); renderDays(); renderSummary();
      }
    });
    // 현지 생활비: 스타일은 계산에 쓰지 않고, 같은 스타일 여행자 금액을 보여 줄 때 써요
    $("#styleSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-style]"); if (!b) return;
      plan.style = b.dataset.style; save(); renderDaily();
      if (plan.dailyMine != null) shareSpend();
    });
    const shareSpend = () => {
      const d = destById(plan.destId);
      window.TMCrowd?.submitSpend({ dest: d.id, country: d.countryId, style: plan.style, amount: plan.dailyMine })
        .then((ok) => { if (ok) { toast(t("daily.shared")); onCrowd(); } });
    };
    $("#dailyMine").addEventListener("change", (e) => {
      const v = e.target.value.trim();
      plan.dailyMine = v === "" ? null : Math.min(5000000, Math.round(Math.max(0, Number(v) || 0) * rate(disp())));
      save(); renderSummary(); renderDaily();
      if (plan.dailyMine != null) shareSpend();
    });
    $("#dailyCrowd").addEventListener("click", (e) => {
      const b = e.target.closest("#useCrowdDaily"); if (!b) return;
      plan.dailyMine = Number(b.dataset.amt); save(); renderSummary(); renderDaily(); // 다른 사람 금액은 다시 공유하지 않아요
    });
    $("#dailyRef").addEventListener("click", (e) => { if (e.target.closest("#dailyReset")) { plan.dailyMine = null; save(); renderSummary(); renderDaily(); } });
    $("#spendShare").addEventListener("change", (e) => { window.TMCrowd?.setSharing(e.target.checked); renderFlight(); });
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
        plan = migrate(JSON.parse(JSON.stringify(s.plan)));
        if (!DEPARTURES.some((x) => x.code === plan.dep)) plan.dep = "ICN";
        ui.region = destById(plan.destId).region; ui.country = destById(plan.destId).countryId;
        renderAll(); document.getElementById("planner").scrollIntoView(); toast(t("toast.loaded"));
      } else if (del) {
        store.set("tm_saved", list.filter((x) => String(x.id) !== del.dataset.del)); renderSaved();
      }
    });

    // 설정
    const modal = $("#settingsModal");
    const open = (v) => { modal.hidden = !v; document.body.classList.toggle("locked", v || !$("#authScreen").hidden || !$("#welcome").hidden); };
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
    // 환율은 사이트를 열 때 한 번만 받아요 (은행 기준 환율은 GitHub Actions가 평일 매시간 갱신)
    loadRates().then(() => { renderAll(); if (Rates.live) toast(t("toast.rates")); });
  });
})();
