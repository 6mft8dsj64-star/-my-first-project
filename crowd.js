/* TripMate — 여행자 공유 시세
   로그인한 사용자가 "내가 찾은 가격"을 입력하면 (공유에 체크된 경우) 이름 없이 fares 컬렉션에 저장해요.
   한 사람은 노선(도시 + 출발 공항)마다 가격 1개만 가질 수 있어서(문서 ID = uid_도시_공항),
   같은 사람이 여러 번 입력해도 평균이 쏠리지 않아요.
   읽기는 나라 단위로 한 번(최대 300개)만 하고 30분 동안 이 탭에 저장해 둬서 읽기 횟수를 아껴요. */
(function () {
  const t = (k, v) => I18N.t(k, v);
  const TTL = 30 * 60 * 1000, MIN_N = 3, LIMIT = 300;
  const MIN_P = 30000, MAX_P = 20000000;
  const mem = {};        // countryId → { at, docs: [{ id, dest, dep, price }] }
  const loading = {};    // countryId → Promise
  let lastSend = 0;

  const db = () => window.TMAuth?.db || null;
  const user = () => window.TMAuth?.user || null;
  const key = (c) => `tm_crowd:${c}`;

  function readCache(c) {
    if (mem[c] && Date.now() - mem[c].at < TTL) return mem[c];
    try {
      const v = JSON.parse(sessionStorage.getItem(key(c)) || "null");
      if (v && Date.now() - v.at < TTL && Array.isArray(v.docs)) return (mem[c] = v);
    } catch { /* 무시 */ }
    return null;
  }
  function writeCache(c, v) {
    mem[c] = v;
    try { sessionStorage.setItem(key(c), JSON.stringify(v)); } catch { /* 무시 */ }
  }

  // DB가 준비될 때까지 잠깐 기다려요 (auth.js가 Firestore를 나중에 켜요)
  function waitDb(ms = 10000) {
    return new Promise((ok) => {
      const start = Date.now();
      (function tick() {
        if (db()) return ok(db());
        if (Date.now() - start > ms) return ok(null);
        setTimeout(tick, 250);
      })();
    });
  }

  // 나라 하나의 공유 가격을 불러오고, 다 되면 onLoad를 불러요
  function want(countryId, onLoad) {
    if (!countryId || readCache(countryId) || loading[countryId]) return;
    loading[countryId] = (async () => {
      const d = await waitDb();
      if (!d) return;
      try {
        const snap = await Promise.race([
          d.collection("fares").where("country", "==", countryId).limit(LIMIT).get(),
          new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 8000)),
        ]);
        const docs = snap.docs.map((x) => { const v = x.data(); return { id: x.id, dest: v.dest, dep: v.dep, price: Number(v.price) }; })
          .filter((v) => v.price >= MIN_P && v.price <= MAX_P);
        writeCache(countryId, { at: Date.now(), docs });
        onLoad?.(countryId);
      } catch (e) {
        console.warn("공유 시세를 불러오지 못했어요", e);
        writeCache(countryId, { at: Date.now() - TTL + 2 * 60 * 1000, docs: readCache(countryId)?.docs || [] }); // 2분 뒤 다시 시도
      }
    })().finally(() => { delete loading[countryId]; });
  }

  const q = (arr, p) => {               // 분위수 (정렬된 배열)
    const i = (arr.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return arr[lo] + (arr[hi] - arr[lo]) * (i - lo);
  };
  function summarize(list, ref) {
    // 너무 엉뚱한 값(평소 시세의 1/4 미만, 4배 초과)은 빼요 — 오타나 장난 입력 방지
    let ps = list.map((x) => x.price).filter((p) => !ref || (p >= ref / 4 && p <= ref * 4)).sort((a, b) => a - b);
    if (ps.length >= 5) { const m = q(ps, 0.5); ps = ps.filter((p) => p >= m / 2.5 && p <= m * 2.5); }
    if (!ps.length) return { n: 0 };
    const r = (v) => Math.round(v / 1000) * 1000;
    return { n: ps.length, med: r(q(ps, 0.5)), lo: r(q(ps, 0.25)), hi: r(q(ps, 0.75)), avg: r(ps.reduce((a, b) => a + b, 0) / ps.length) };
  }

  // 도시(+출발 공항)의 통계. 공항별 3명 이상이면 그 공항 기준, 아니면 전체 공항 기준
  function stats(dest, countryId, dep, ref) {
    const c = readCache(countryId);
    if (!c) return null;
    const all = c.docs.filter((x) => x.dest === dest);
    const byDep = summarize(all.filter((x) => x.dep === dep), ref);
    if (byDep.n >= MIN_N) return { ...byDep, scope: "dep" };
    const s = summarize(all, ref);
    return { ...s, scope: "all", depN: byDep.n };
  }

  function sharing() { try { return localStorage.getItem("tm_crowd_share") !== "0"; } catch { return true; } }
  function setSharing(v) { try { localStorage.setItem("tm_crowd_share", v ? "1" : "0"); } catch { /* 무시 */ } }

  // 내 가격 공유 (로그인 + 공유 체크일 때만)
  // 10초에 한 번만 보내요. 그 사이에 또 입력하면 마지막 값만 10초 뒤에 보내요.
  let pending = null, pendingTimer = null;
  function submit(entry) {
    const u = user(), d = db();
    if (!u || !d || !sharing()) return Promise.resolve(false);
    const price = Math.round(Number(entry.price) || 0);
    if (price < MIN_P || price > MAX_P) return Promise.resolve(false);
    const wait = 10000 - (Date.now() - lastSend);
    if (wait <= 0) return send({ ...entry, price });
    return new Promise((ok) => {
      if (pending) pending.ok(false);
      pending = { entry: { ...entry, price }, ok };
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { const p = pending; pending = null; send(p.entry).then(p.ok); }, wait);
    });
  }
  async function send({ dest, country, dep, price, month }) {
    const u = user(), d = db();
    if (!u || !d || !sharing()) return false;
    lastSend = Date.now();
    const id = `${u.uid}_${dest}_${dep}`;
    try {
      await d.collection("fares").doc(id).set({
        dest, country, dep, price, month: Math.min(12, Math.max(1, month | 0)),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const c = readCache(country);
      if (c) writeCache(country, { at: c.at, docs: [...c.docs.filter((x) => x.id !== id), { id, dest, dep, price }] });
      return true;
    } catch (e) {
      console.warn("가격 공유 실패", e);
      return false;
    }
  }

  // ---------- 여행자 하루 생활비 (spend 컬렉션) ----------
  // 문서 ID = uid_도시 → 한 사람은 도시마다 금액 1개. 소비 스타일(절약·보통·여유)과 1인 하루 금액(원화)을 저장해요.
  const SP_MIN = 3000, SP_MAX = 2000000;
  const spKey = (c) => `sp:${c}`;
  function wantSpend(countryId, onLoad) {
    const k = spKey(countryId);
    if (!countryId || readCache(k) || loading[k]) return;
    loading[k] = (async () => {
      const d = await waitDb();
      if (!d) return;
      try {
        const snap = await Promise.race([
          d.collection("spend").where("country", "==", countryId).limit(LIMIT).get(),
          new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 8000)),
        ]);
        const docs = snap.docs.map((x) => { const v = x.data(); return { id: x.id, dest: v.dest, style: v.style, amount: Number(v.amount) }; })
          .filter((v) => v.amount >= SP_MIN && v.amount <= SP_MAX);
        writeCache(k, { at: Date.now(), docs });
        onLoad?.(countryId);
      } catch (e) {
        console.warn("공유 생활비를 불러오지 못했어요", e);
        writeCache(k, { at: Date.now() - TTL + 2 * 60 * 1000, docs: readCache(k)?.docs || [] });
      }
    })().finally(() => { delete loading[k]; });
  }
  // 가장 많은 사람이 입력한 금액대(최빈 구간). 평균이 아니라서 아주 큰 금액 몇 개에 흔들리지 않아요.
  function modeRange(list, ref) {
    let xs = list.map((x) => x.amount).filter((a) => !ref || (a >= ref / 5 && a <= ref * 5)).sort((a, b) => a - b);
    if (xs.length >= 5) { const m = q(xs, 0.5); xs = xs.filter((a) => a >= m / 3 && a <= m * 3); }
    if (!xs.length) return { n: 0 };
    const med = q(xs, 0.5);
    const step = [1000, 2000, 5000, 10000, 20000, 50000, 100000].filter((v) => v <= Math.max(1000, med * 0.25)).pop();
    const cnt = {};
    xs.forEach((a) => { const b = Math.floor(a / step); cnt[b] = (cnt[b] || 0) + 1; });
    const best = Object.entries(cnt).sort((a, b) => b[1] - a[1] || Math.abs(a[0] * step - med) - Math.abs(b[0] * step - med))[0];
    const lo = Number(best[0]) * step;
    return { n: xs.length, lo, hi: lo + step, cnt: best[1], mid: lo + step / 2, med: Math.round(med / 1000) * 1000 };
  }
  function spendStats(dest, countryId, style, ref) {
    const c = readCache(spKey(countryId));
    if (!c) return null;
    const all = c.docs.filter((x) => x.dest === dest);
    const mine = modeRange(all.filter((x) => x.style === style), ref);
    if (mine.n >= MIN_N) return { ...mine, scope: "style" };
    return { ...modeRange(all, ref), scope: "all", styleN: mine.n };
  }
  let spPending = null, spTimer = null, spLast = 0;
  function submitSpend(entry) {
    const u = user(), d = db();
    if (!u || !d || !sharing()) return Promise.resolve(false);
    const amount = Math.round(Number(entry.amount) || 0);
    if (amount < SP_MIN || amount > SP_MAX || !["save", "normal", "comfort"].includes(entry.style)) return Promise.resolve(false);
    const go = async (en) => {
      spLast = Date.now();
      const id = `${u.uid}_${en.dest}`;
      try {
        await d.collection("spend").doc(id).set({ dest: en.dest, country: en.country, style: en.style, amount: en.amount, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        const k = spKey(en.country), c = readCache(k);
        if (c) writeCache(k, { at: c.at, docs: [...c.docs.filter((x) => x.id !== id), { id, dest: en.dest, style: en.style, amount: en.amount }] });
        return true;
      } catch (e) { console.warn("생활비 공유 실패", e); return false; }
    };
    const wait = 10000 - (Date.now() - spLast);
    if (wait <= 0) return go({ ...entry, amount });
    return new Promise((ok) => {
      if (spPending) spPending.ok(false);
      spPending = { entry: { ...entry, amount }, ok };
      clearTimeout(spTimer);
      spTimer = setTimeout(() => { const p = spPending; spPending = null; go(p.entry).then(p.ok); }, wait);
    });
  }

  // 탈퇴할 때 내가 공유한 가격·생활비도 지워요
  async function deleteMine(uid) {
    const d = db();
    if (!d || !uid) return;
    const F = firebase.firestore.FieldPath.documentId();
    for (const col of ["fares", "spend"]) {
      const snap = await d.collection(col).where(F, ">=", `${uid}_`).where(F, "<", `${uid}_`).limit(LIMIT).get();
      await Promise.all(snap.docs.map((x) => x.ref.delete()));
    }
    Object.keys(mem).forEach((k) => delete mem[k]);
    try { Object.keys(sessionStorage).filter((k) => k.startsWith("tm_crowd:")).forEach((k) => sessionStorage.removeItem(k)); } catch { /* 무시 */ }
  }

  window.TMCrowd = { want, stats, submit, wantSpend, spendStats, submitSpend, sharing, setSharing, deleteMine, MIN_N, label: () => t("crowd.title") };
})();
