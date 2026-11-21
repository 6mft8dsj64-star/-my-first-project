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
  const screen = $("#authScreen");
  const showAuth = (v) => { screen.hidden = !v; document.body.classList.toggle("locked", v); };
  const msg = (text, ok = false) => { const m = $("#authMsg"); m.textContent = text; m.className = "auth-msg" + (ok ? " ok" : text ? " err" : ""); };
  const busy = (v) => screen.querySelectorAll("button, input").forEach((el) => { if (!el.dataset.keep) el.disabled = v || (!cfg && !el.dataset.guest); });

  function setMode(m, keepMsg = false) {
    mode = m;
    $("#authTitle").textContent = t(`auth.title.${m}`);
    $("#nameRow").hidden = m !== "signup";
    $("#pwRow").hidden = m === "reset";
    $("#pw2Row").hidden = m !== "signup";
    $("#emailSubmit").textContent = t(`auth.submit.${m}`);
    $("#toSignup").hidden = m === "signup";
    $("#toLogin").hidden = m === "login";
    $("#toReset").hidden = m !== "login";
    $("#authPw").autocomplete = m === "signup" ? "new-password" : "current-password";
    if (!keepMsg) msg("");
  }

  function renderUser() {
    const area = $("#userArea");
    if (user) {
      const name = user.displayName || (user.email || "").split("@")[0] || t("auth.traveler");
      const avatar = user.photoURL
        ? `<img src="${user.photoURL}" alt="" referrerpolicy="no-referrer" />`
        : `<span class="avatar-txt">${name.slice(0, 1).toUpperCase()}</span>`;
      area.innerHTML = `<button class="user-chip" id="accountBtn" type="button" title="${t("auth.myAccount")}">${avatar}<span class="user-name">${esc(name)}</span></button>
        <button class="btn ghost sm" id="logoutBtn">${t("auth.logout")}</button>`;
      $("#logoutBtn").onclick = () => auth.signOut();
      $("#accountBtn").onclick = openAccount;
    } else {
      area.innerHTML = `<button class="btn sm" id="loginBtn">${t("auth.login")}</button>`;
      $("#loginBtn").onclick = () => { setMode("login"); showAuth(true); };
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
      const snap = await db.collection("users").doc(u.uid).get();
      doc = snap.exists ? snap.data() : {};
    } catch (e) { console.warn("클라우드 데이터를 불러오지 못했어요", e); }

    let needPush = false;
    Object.entries(SYNC_KEYS).forEach(([k, field]) => {
      if (doc[field] !== undefined) local.set(prefix + k, doc[field]);
      else {
        // 처음 로그인: 둘러보기 중 만든 데이터가 있으면 계정으로 옮겨요
        const guest = local.get(k);
        if (guest !== undefined && local.get(prefix + k) === undefined) {
          local.set(prefix + k, guest); needPush = true;
          try { localStorage.removeItem(k); } catch { /* 무시 */ } // 다른 계정에 또 옮겨지지 않게
        }
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
    try { await auth.signInWithCredential(cred); }
    catch (e) { msg(errText(e)); }
    busy(false);
  }

  // ---------- 시작 ----------
  function bindUI() {
    $("#googleBtn").onclick = () => social("google");
    $("#appleBtn").onclick = () => social("apple");
    $("#emailForm").addEventListener("submit", emailSubmit);
    $("#toSignup").onclick = () => setMode("signup");
    $("#toLogin").onclick = () => setMode("login");
    $("#toReset").onclick = () => setMode("reset");
    bindAccountUI();
    $("#guestBtn").onclick = () => {
      try { sessionStorage.setItem("tm_guest", "1"); } catch { /* 무시 */ }
      showAuth(false);
    };
    setMode("login");
  }

  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  async function init() {
    bindUI();
    renderUser();
    let guest = false;
    try { guest = sessionStorage.getItem("tm_guest") === "1"; } catch { /* 무시 */ }
    showAuth(!guest);

    if (!cfg) {
      $("#authNotice").hidden = false;
      busy(false);
      return;
    }
    try {
      await loadScript(SDK + "firebase-app-compat.js");
      await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js")]);
    } catch {
      msg(t("auth.sdkFail"));
      return;
    }
    firebase.initializeApp(cfg);
    if (await loadGis()) {
      $("#googleBtn").hidden = true;
      $("#gisBtn").hidden = false;
      renderGis($("#gisBtn"));
    }
    auth = firebase.auth();
    auth.languageCode = I18N.lang;
    db = firebase.firestore();
    auth.getRedirectResult().catch((e) => msg(errText(e)));

    let hadUser = false;
    auth.onAuthStateChanged(async (u) => {
      if (!u) { hadUser = !!user; if (!modal.hidden) { deleting = false; closeAccount(); } }
      user = u;
      renderUser();
      if (u) {
        await pullUserData(u);
        showAuth(false);
        window.TripApp?.reload();
        $("#syncState").textContent = t("sync.saved");
      } else {
        if (hadUser) { showAuth(true); setMode("login"); }
        window.TM_USER_PREFIX = "";
        $("#syncState").textContent = "";
        window.TripApp?.reload();
      }
    });
  }

  I18N.ready.then(init);
})();
