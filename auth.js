/* 트립노트 — 로그인(구글·애플·이메일)과 계정별 데이터 동기화 (Firebase) */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const SYNC_KEYS = { tm_plan: "plan", tm_saved: "saved", tm_price_log: "priceLog" };
  const cfg = window.FIREBASE_CONFIG;
  const GID = (window.GOOGLE_CLIENT_ID || "").trim();
  let gisReady = null, gisMode = "login", reauthed = false;

  let auth = null, db = null, user = null, pushTimer = null, mode = "login", deleting = false;
  const t = (k, v) => I18N.t(k, v);
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 화면 ----------
  const screen = $("#authScreen");   // 로그인 창 (사이트 위에 어둡게 띄움)
  const welcome = $("#welcome");      // 로그인 전 첫 화면
  const lock = () => document.body.classList.toggle("locked",
    !welcome.hidden || !screen.hidden || [...document.querySelectorAll(".modal")].some((m) => !m.hidden));
  const showWelcome = (v) => { welcome.hidden = !v; if (v) welcome.scrollTop = 0; lock(); };
  const showLogin = (v) => {
    screen.hidden = !v; lock();
    if (v) {
      // 창이 보일 때 구글 버튼 폭을 창에 맞춰 다시 그려요
      if (gisReady && !$("#gisBtn").hidden) gisReady.then((ok) => ok && renderGis($("#gisBtn")));
      setTimeout(() => (screen.querySelector("#authEmail"))?.focus({ preventScroll: true }), 50);
    }
  };
  const showAuth = (v) => { if (!v) { showLogin(false); showWelcome(false); } else showWelcome(true); };
  let fatal = ""; // 로그인 서비스를 못 불러왔을 때 로그인 창에 계속 보여 줄 안내
  const openLogin = (m = "login") => { setMode(m); msg(fatal); showLogin(true); };
  const msg = (text, ok = false) => { const m = $("#authMsg"); m.textContent = text; m.className = "auth-msg" + (ok ? " ok" : text ? " err" : ""); };
  const busy = (v) => screen.querySelectorAll("button, input").forEach((el) => { if (!el.dataset.keep) el.disabled = v || (!cfg && !el.dataset.guest); });

  function setMode(m, keepMsg = false) {
    mode = m;
    $("#authTitle").textContent = t(`auth.title.${m}`);
    $("#authBig").textContent = t(`login.big.${m}`);
    $("#authLead").innerHTML = t("auth.lead").replace(/\s*<br\s*\/?>\s*/g, /^(ja|zh)/.test(I18N.lang) ? "" : " ");
    $("#keepRow").hidden = m === "reset";
    $("#linkSep").hidden = m !== "login";
    $("#authPw").placeholder = m === "signup" ? `${t("auth.pw")} (${t("auth.pwPh")})` : t("auth.pw");
    $("#nameRow").hidden = m !== "signup";
    $("#pwRow").hidden = m === "reset";
    $("#pw2Row").hidden = m !== "signup";
    $("#emailSubmit").textContent = m === "login" ? t("auth.login") : t(`auth.submit.${m}`);
    $("#toSignup").hidden = m === "signup";
    $("#toLogin").hidden = m === "login";
    $("#toReset").hidden = m !== "login";
    $("#authPw").autocomplete = m === "signup" ? "new-password" : "current-password";
    if (!keepMsg) msg("");
  }

  function renderUser() {
    const area = $("#userArea");
    $("#setAccountRow").hidden = !user; // 설정 창의 로그아웃 버튼은 로그인했을 때만
    if (user) {
      const name = user.displayName || (user.email || "").split("@")[0] || t("auth.traveler");
      const avatar = user.photoURL
        ? `<img src="${user.photoURL}" alt="" referrerpolicy="no-referrer" />`
        : `<span class="avatar-txt">${name.slice(0, 1).toUpperCase()}</span>`;
      area.innerHTML = `<button class="user-chip" id="accountBtn" type="button" title="${t("auth.myAccount")}">${avatar}<span class="user-name">${esc(name)}</span></button>`;
      $("#accountBtn").onclick = openAccount;
    } else {
      area.innerHTML = `<button class="btn sm" id="loginBtn">${t("auth.login")}</button>`;
      $("#loginBtn").onclick = () => openLogin();
    }
  }

  const errText = (e) => {
    const k = `err.${e?.code}`;
    return e && I18N.dict.ko[k] !== undefined ? t(k) : t("err.generic", { c: e?.code || e?.message || "?" });
  };

  // ---------- 클라우드 동기화 ----------
  const local = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : undefined; } catch { return undefined; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 무시 */ } },
  };

  async function pullUserData(u) {
    const prefix = `u:${u.uid}:`;
    window.TM_USER_PREFIX = prefix;
    let doc = {};
    try {
      // 데이터베이스 첫 연결이 느릴 때 화면이 멈춰 보이지 않게 최대 8초만 기다려요
      const snap = await Promise.race([
        db.collection("users").doc(u.uid).get(),
        new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 8000)),
      ]);
      doc = snap.exists ? snap.data() : {};
    } catch (e) { console.warn("클라우드 데이터를 불러오지 못했어요", e); }

    let needPush = false;
    Object.entries(SYNC_KEYS).forEach(([k, field]) => {
      if (doc[field] !== undefined) local.set(prefix + k, doc[field]);
      else {
        // 처음 로그인: 둘러보기 중 만든 데이터가 있으면 계정으로 옮겨요
        // (로그인 없이 하기 데이터는 이 탭에만 있어요: sessionStorage)
        let guest; try { const v = sessionStorage.getItem(k); guest = v ? JSON.parse(v) : undefined; } catch { /* 무시 */ }
        if (guest === undefined) guest = local.get(k); // 예전 방식(브라우저에 남은 데이터)
        if (guest !== undefined && local.get(prefix + k) === undefined) {
          local.set(prefix + k, guest); needPush = true;
        }
        try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch { /* 무시 */ } // 다른 계정에 또 옮겨지지 않게
      }
    });
    if (needPush || !doc.profile) pushNow();
  }

  function pushNow() {
    if (!user || !db || deleting) return;
    const prefix = `u:${user.uid}:`;
    const data = {
      profile: { name: user.displayName || "", email: user.email || "", provider: user.providerData[0]?.providerId || "password" },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    Object.entries(SYNC_KEYS).forEach(([k, field]) => { const v = local.get(prefix + k); if (v !== undefined) data[field] = v; });
    db.collection("users").doc(user.uid).set(data, { merge: true })
      .then(() => { $("#syncState").textContent = t("sync.saved"); })
      .catch((e) => { $("#syncState").textContent = t("sync.fail"); console.warn(e); });
  }

  window.TMAuth = {
    openLogin() { openLogin(); },
    get db() { return db; },
    get user() { return user; },
    // 언어를 바꾸면 로그인 화면·헤더 문구를 다시 그려요
    relabel() {
      setMode(mode, true);
      renderUser();
      if (auth) auth.languageCode = I18N.lang;
      if (gisReady && !$("#gisBtn").hidden) gisReady.then((ok) => ok && renderGis($("#gisBtn")));
      if ($("#syncState").textContent) $("#syncState").textContent = t("sync.saved");
    },
    onLocalChange() {
      if (!user || deleting) return;
      $("#syncState").textContent = t("sync.saving");
      clearTimeout(pushTimer);
      pushTimer = setTimeout(pushNow, 1200);
    },
  };

  // ---------- 로그인 유지 ----------
  // 체크하면 브라우저를 닫아도 로그인이 유지되고, 끄면 브라우저(탭)를 닫을 때 로그아웃돼요
  const KEEP = "tm_keep_login";
  const keepOn = () => { try { return localStorage.getItem(KEEP) !== "0"; } catch { return true; } };
  const applyKeep = () => auth?.setPersistence(keepOn() ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION).catch(() => {});

  // ---------- 로그인 동작 ----------
  async function social(kind) {
    msg(""); busy(true);
    try {
      const provider = kind === "google" ? new firebase.auth.GoogleAuthProvider() : new firebase.auth.OAuthProvider("apple.com");
      if (kind === "apple") { provider.addScope("email"); provider.addScope("name"); provider.setCustomParameters({ locale: I18N.locale().replace("-", "_") }); }
      else provider.setCustomParameters({ prompt: "select_account" });
      // 사파리 등은 '페이지 이동(redirect)' 방식 로그인 결과를 막아서 첫 화면으로 돌아와요.
      // 그래서 팝업 방식만 써요. 팝업이 막히면 안내 문구를 보여 줘요.
      await auth.signInWithPopup(provider);
      showAuth(false);
      watchSignIn();
    } catch (e) { msg(errText(e)); }
    busy(false);
  }

  async function emailSubmit(ev) {
    ev.preventDefault();
    const email = $("#authEmail").value.trim(), pw = $("#authPw").value;
    msg(""); busy(true);
    try {
      if (mode === "reset") {
        await auth.sendPasswordResetEmail(email);
        msg(t("auth.resetSent"), true);
      } else if (mode === "signup") {
        if (pw !== $("#authPw2").value) throw { code: "x", message: "", text: t("auth.pwMismatch") };
        const name = $("#authName").value.trim();
        const cred = await auth.createUserWithEmailAndPassword(email, pw);
        if (name) await cred.user.updateProfile({ displayName: name });
        cred.user.sendEmailVerification().catch(() => {});
        renderUser();
        window.TripApp?.toast(t("auth.welcome"));
      } else {
        await auth.signInWithEmailAndPassword(email, pw);
      }
    } catch (e) { msg(e.text || errText(e)); }
    busy(false);
  }

  // ---------- 내 계정 · 회원 탈퇴 ----------
  const modal = $("#accountModal");
  const providerOf = (u) => u?.providerData[0]?.providerId || "password";
  const delMsg = (t, ok = false) => { const m = $("#delMsg"); m.textContent = t; m.className = "auth-msg" + (t ? (ok ? " ok" : " err") : ""); };

  function openAccount() {
    if (!user) return;
    const p = providerOf(user);
    const how = t(p === "google.com" ? "acc.with.google" : p === "apple.com" ? "acc.with.apple" : "acc.with.email");
    $("#accountWho").innerHTML = `<b>${esc(user.displayName || t("auth.traveler"))}</b><br>${esc(user.email || "")}<br><small>${how}</small>`;
    showDelete(false);
    modal.hidden = false;
    document.body.classList.add("locked");
  }
  function closeAccount() {
    if (deleting) return;
    gisMode = "login";
    modal.hidden = true;
    document.body.classList.remove("locked");
  }
  function showDelete(v) {
    $("#accountMain").hidden = v;
    $("#deleteForm").hidden = !v;
    if (v) {
      const isPw = providerOf(user) === "password";
      const useGis = providerOf(user) === "google.com" && GID;
      reauthed = false;
      $("#delPwRow").hidden = !isPw;
      $("#delSocialHint").hidden = isPw || useGis;
      $("#delGoogleRow").hidden = !useGis;
      $("#delGoogleOk").hidden = true;
      if (useGis) { gisMode = "reauth"; loadGis().then((ok) => ok && renderGis($("#delGisBtn"))); }
      $("#delPw").value = ""; $("#delConfirm").value = ""; delMsg("");
      (isPw ? $("#delPw") : $("#delConfirm")).focus();
    }
  }

  async function reauth() {
    const p = providerOf(user);
    if (p === "google.com" && GID) {
      if (!reauthed) throw { code: "x", text: t("del.needGoogle") };
      return;
    }
    if (p === "password") {
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, $("#delPw").value);
      await user.reauthenticateWithCredential(cred);
    } else {
      const provider = p === "google.com" ? new firebase.auth.GoogleAuthProvider() : new firebase.auth.OAuthProvider("apple.com");
      await user.reauthenticateWithPopup(provider);
    }
  }

  async function deleteAccount(ev) {
    ev.preventDefault();
    const word = $("#delConfirm").value.trim();
    const okWords = [t("del.word"), I18N.dict.ko["del.word"], I18N.dict.en["del.word"]].map((w) => w.toUpperCase());
    if (!okWords.includes(word.toUpperCase())) { delMsg(t("del.needWord")); return; }
    if (providerOf(user) === "password" && !$("#delPw").value) { delMsg(t("del.needPw")); return; }
    const btns = $("#deleteForm").querySelectorAll("button, input");
    btns.forEach((b) => (b.disabled = true));
    delMsg(t("del.deleting"), true);
    const uid = user.uid;
    try {
      await reauth();                       // 1) 본인 확인
      deleting = true; clearTimeout(pushTimer);
      await db.collection("users").doc(uid).delete();  // 2) 저장된 데이터 삭제
      try { await window.TMCrowd?.deleteMine(uid); } catch (e) { console.warn("공유 가격 삭제 실패", e); } // 공유한 가격도 삭제
      await user.delete();                  // 3) 로그인 계정 삭제
      try {                                  // 4) 이 브라우저에 남은 계정 데이터 삭제
        Object.keys(localStorage).filter((k) => k.startsWith(`u:${uid}:`)).forEach((k) => localStorage.removeItem(k));
        sessionStorage.removeItem("tm_guest");
      } catch { /* 무시 */ }
      deleting = false;
      closeAccount();
      window.TripApp?.toast(t("del.done"));
    } catch (e) {
      deleting = false;
      const code = e?.code || "";
      if (e?.text) { delMsg(e.text); btns.forEach((b) => (b.disabled = false)); return; }
      delMsg(
        code === "auth/wrong-password" || code === "auth/invalid-credential" ? t("del.wrongPw") :
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ? t("del.popupClosed") :
        code === "auth/popup-blocked" ? t("del.popupBlocked") :
        code === "auth/user-mismatch" ? t("del.mismatch") :
        code === "auth/too-many-requests" ? t("err.auth/too-many-requests") :
        code === "auth/network-request-failed" ? t("err.auth/network-request-failed") :
        t("del.generic", { c: code || e?.message || "?" })
      );
    }
    btns.forEach((b) => (b.disabled = false));
  }

  function bindAccountUI() {
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeAccount));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeAccount(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeAccount(); });
    $("#accountLogout").onclick = () => { closeAccount(); auth.signOut(); };
    $("#toDelete").onclick = () => showDelete(true);
    $("#delCancel").onclick = () => showDelete(false);
    $("#deleteForm").addEventListener("submit", deleteAccount);
  }

  // ---------- Google 공식 버튼 (아이폰 사파리 대응) ----------
  // 사파리는 다른 사이트(firebaseapp.com)를 거치는 로그인 결과를 막아요.
  // Google Identity Services 버튼으로 받은 토큰을 Firebase에 넘기면 사파리에서도 로그인돼요.
  function loadGis() {
    if (!GID) return Promise.resolve(false);
    if (!gisReady) {
      gisReady = loadScript("https://accounts.google.com/gsi/client").then(() => {
        google.accounts.id.initialize({ client_id: GID, callback: onGoogleCredential, ux_mode: "popup", auto_select: false, cancel_on_tap_outside: true });
        return true;
      }).catch(() => false);
    }
    return gisReady;
  }
  function renderGis(el) {
    const w = Math.min(Math.max(el.parentElement.clientWidth || 320, 220), 400);
    el.innerHTML = "";
    google.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width: w, locale: I18N.lang, logo_alignment: "center" });
  }
  async function onGoogleCredential(resp) {
    const cred = firebase.auth.GoogleAuthProvider.credential(resp.credential);
    if (gisMode === "reauth") {
      try {
        await user.reauthenticateWithCredential(cred);
        reauthed = true;
        $("#delGoogleOk").hidden = false;
        delMsg("");
      } catch (e) {
        delMsg(e.code === "auth/user-mismatch" ? t("del.gMismatch") : t("del.gFail", { c: e.code || e.message }));
      }
      return;
    }
    msg(""); busy(true);
    try { await auth.signInWithCredential(cred); showAuth(false); watchSignIn(); }
    catch (e) { msg(errText(e)); }
    busy(false);
  }

  // ---------- 시작 ----------
  function bindUI() {
    $("#googleBtn").onclick = () => social("google");
    $("#appleBtn").onclick = () => social("apple");
    $("#emailForm").addEventListener("submit", emailSubmit);
    $("#authKeep").checked = keepOn();
    $("#authKeep").onchange = (e) => { try { localStorage.setItem(KEEP, e.target.checked ? "1" : "0"); } catch { /* 무시 */ } applyKeep(); };
    $("#welLogin").onclick = () => openLogin();
    $("#authClose").onclick = () => showLogin(false);
    screen.addEventListener("click", (e) => { if (e.target === screen) showLogin(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !screen.hidden) showLogin(false); });
    $("#toSignup").onclick = () => setMode("signup");
    $("#toLogin").onclick = () => setMode("login");
    $("#toReset").onclick = () => setMode("reset");
    bindAccountUI();
    $("#settingsLogout").onclick = () => { $("#settingsModal").hidden = true; document.body.classList.remove("locked"); auth?.signOut(); };
    $("#guestBtn").onclick = () => {
      try { sessionStorage.setItem("tm_guest", "1"); } catch { /* 무시 */ }
      showAuth(false);
      window.scrollTo(0, 0);
    };
    setMode("login");
  }

  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  // ---------- 로그인 상태를 화면에 반영 ----------
  const HAD = "tm_had_login"; // 이 기기에서 로그인한 적이 있으면 처음부터 로그인 화면을 띄우지 않아요
  const had = { get() { try { return localStorage.getItem(HAD) === "1"; } catch { return false; } },
    set(v) { try { v ? localStorage.setItem(HAD, "1") : localStorage.removeItem(HAD); } catch { /* 무시 */ } } };
  let applying = null, firstState = true;

  async function applyUser(u) {
    if (u === user && !firstState) return;           // 이미 반영됨
    const wasUser = !!user;
    const initial = firstState; firstState = false;
    if (!u && !modal.hidden) { deleting = false; closeAccount(); }
    user = u;
    renderUser();
    if (u) {
      had.set(true);
      // 로그인되면 바로 로그인 화면을 닫고 맨 위(여행지 고르기)부터 보여줘요. 내 데이터는 뒤에서 불러와요.
      const wasShown = !screen.hidden || !welcome.hidden;
      showAuth(false);
      if (wasShown) window.scrollTo(0, 0);
      $("#syncState").textContent = t("sync.loading");
      await pullUserData(u);
      if (user !== u) return;
      window.TripApp?.reload();
      $("#syncState").textContent = t("sync.saved");
      window.TMContact?.onUser?.(u);
    } else {
      window.TMContact?.onUser?.(null);
      // 로그아웃했거나, 로그인했던 기기인데 로그인이 풀려 있으면 로그인 화면을 보여줘요
      // → 첫 화면을 보여줘요 (로그인 창은 닫아요)
      if (wasUser || (initial && had.get() && !guestMode())) { showLogin(false); showWelcome(true); setMode("login"); }
      if (wasUser) had.set(false);
      window.TM_USER_PREFIX = "";
      $("#syncState").textContent = "";
      window.TripApp?.reload();
    }
  }
  const syncNow = () => { if (auth && auth.currentUser !== user) applyUser(auth.currentUser); };

  // 로그인 시도 뒤 15초 동안 로그인 상태를 계속 확인 (새 탭 로그인 후 결과를 놓쳐도 화면이 바뀌게)
  let watchTimer = null;
  function watchSignIn() {
    clearInterval(watchTimer);
    const until = Date.now() + 15000;
    watchTimer = setInterval(() => { syncNow(); if (user || Date.now() > until) clearInterval(watchTimer); }, 500);
  }
  const guestMode = () => { try { return sessionStorage.getItem("tm_guest") === "1"; } catch { return false; } };

  async function init() {
    bindUI();
    renderUser();
    // 로그인한 적 있는 기기는 로그인 확인이 끝날 때까지 로그인 화면 대신 사이트를 바로 보여줘요
    showAuth(!guestMode() && !had.get());
    if (had.get()) $("#syncState").textContent = t("sync.loading");

    if (!cfg) {
      $("#authNotice").hidden = false;
      showAuth(!guestMode());
      busy(false);
      return;
    }
    try {
      await loadScript(SDK + "firebase-app-compat.js");
      await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js"),
        window.RECAPTCHA_SITE_KEY ? loadScript(SDK + "firebase-app-check-compat.js").catch(() => null) : null]);
    } catch {
      showAuth(!guestMode());
      fatal = t("auth.sdkFail"); msg(fatal);
      return;
    }
    firebase.initializeApp(cfg);
    // App Check: 우리 사이트에서 온 요청인지 reCAPTCHA로 확인해서, 봇이 데이터베이스에 직접 보내는 스팸을 막아요
    // (다른 Firebase 기능보다 먼저 켜야 해요)
    // reCAPTCHA를 불러올 수 없는 환경(광고 차단, 구글 접속 제한 지역 등)에서 켜면 로그인이 30초 멈추므로,
    // 먼저 5초 안에 reCAPTCHA가 불러와지는지 확인하고 될 때만 켜요.
    if (window.RECAPTCHA_SITE_KEY && firebase.appCheck) {
      const ok = await Promise.race([
        loadScript(`https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(window.RECAPTCHA_SITE_KEY)}`).then(() => true).catch(() => false),
        new Promise((r) => setTimeout(() => r(false), 5000)),
      ]);
      if (ok) {
        try { firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(window.RECAPTCHA_SITE_KEY), true); }
        catch (e) { console.warn("App Check를 켜지 못했어요", e); }
      } else console.warn("reCAPTCHA를 불러오지 못해 App Check 없이 진행해요");
    }
    auth = firebase.auth();
    auth.languageCode = I18N.lang;
    await applyKeep();
    db = firebase.firestore();
    try { db.settings({ experimentalAutoDetectLongPolling: true }); } catch { /* 이미 설정됨 */ }

    // 로그인 상태 감시를 먼저 시작하고, 구글 버튼은 그 다음에 불러와요 (버튼이 늦게 떠도 로그인 확인은 바로)
    auth.onAuthStateChanged((u) => { applying = applyUser(u); });
    auth.getRedirectResult().then((r) => { if (r?.user) watchSignIn(); }).catch((e) => msg(errText(e)));
    ["visibilitychange", "focus", "pageshow"].forEach((ev) => window.addEventListener(ev, () => { if (document.visibilityState !== "hidden") syncNow(); }));
    window.addEventListener("storage", (e) => { if (e.key && e.key.startsWith("firebase:authUser")) setTimeout(syncNow, 300); });

    if (await loadGis()) {
      $("#googleBtn").hidden = true;
      $("#gisBtn").hidden = false;
      renderGis($("#gisBtn"));
    }
  }

  I18N.ready.then(init);
})();
