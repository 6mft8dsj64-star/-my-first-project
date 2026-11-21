/* 트립메이트 — 로그인(구글·애플·이메일)과 계정별 데이터 동기화 (Firebase) */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const SYNC_KEYS = { tm_plan: "plan", tm_saved: "saved", tm_price_log: "priceLog" };
  const cfg = window.FIREBASE_CONFIG;

  let auth = null, db = null, user = null, pushTimer = null, mode = "login", deleting = false;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 화면 ----------
  const screen = $("#authScreen");
  const showAuth = (v) => { screen.hidden = !v; document.body.classList.toggle("locked", v); };
  const msg = (text, ok = false) => { const m = $("#authMsg"); m.textContent = text; m.className = "auth-msg" + (ok ? " ok" : text ? " err" : ""); };
  const busy = (v) => screen.querySelectorAll("button, input").forEach((el) => { if (!el.dataset.keep) el.disabled = v || (!cfg && !el.dataset.guest); });

  function setMode(m) {
    mode = m;
    $("#authTitle").textContent = m === "signup" ? "회원가입" : m === "reset" ? "비밀번호 재설정" : "로그인";
    $("#nameRow").hidden = m !== "signup";
    $("#pwRow").hidden = m === "reset";
    $("#pw2Row").hidden = m !== "signup";
    $("#emailSubmit").textContent = m === "signup" ? "가입하기" : m === "reset" ? "재설정 메일 보내기" : "이메일로 로그인";
    $("#toSignup").hidden = m === "signup";
    $("#toLogin").hidden = m === "login";
    $("#toReset").hidden = m !== "login";
    $("#authPw").autocomplete = m === "signup" ? "new-password" : "current-password";
    msg("");
  }

  function renderUser() {
    const area = $("#userArea");
    if (user) {
      const name = user.displayName || (user.email || "").split("@")[0] || "여행자";
      const avatar = user.photoURL
        ? `<img src="${user.photoURL}" alt="" referrerpolicy="no-referrer" />`
        : `<span class="avatar-txt">${name.slice(0, 1).toUpperCase()}</span>`;
      area.innerHTML = `<button class="user-chip" id="accountBtn" type="button" title="내 계정">${avatar}<span class="user-name">${esc(name)}</span></button>
        <button class="btn ghost sm" id="logoutBtn">로그아웃</button>`;
      $("#logoutBtn").onclick = () => auth.signOut();
      $("#accountBtn").onclick = openAccount;
    } else {
      area.innerHTML = `<button class="btn sm" id="loginBtn">로그인</button>`;
      $("#loginBtn").onclick = () => { setMode("login"); showAuth(true); };
    }
  }

  const ERR = {
    "auth/invalid-email": "이메일 형식이 올바르지 않아요.",
    "auth/missing-password": "비밀번호를 입력해 주세요.",
    "auth/weak-password": "비밀번호는 6자 이상이어야 해요.",
    "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.",
    "auth/wrong-password": "이메일 또는 비밀번호가 맞지 않아요.",
    "auth/user-not-found": "가입되지 않은 이메일이에요.",
    "auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
    "auth/popup-closed-by-user": "로그인 창이 닫혔어요. 다시 시도해 주세요.",
    "auth/cancelled-popup-request": "",
    "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
    "auth/operation-not-allowed": "이 로그인 방식이 아직 켜져 있지 않아요. (Firebase 콘솔에서 사용 설정 필요)",
    "auth/unauthorized-domain": "이 주소에서는 로그인이 허용되지 않았어요. (Firebase 승인된 도메인에 추가 필요)",
    "auth/account-exists-with-different-credential": "같은 이메일로 다른 방식(구글/애플/이메일) 가입 기록이 있어요. 그 방식으로 로그인해 주세요.",
  };
  const errText = (e) => (e && ERR[e.code] !== undefined ? ERR[e.code] : `로그인 중 문제가 생겼어요. (${e?.code || e?.message || "알 수 없음"})`);

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
      .then(() => { $("#syncState").textContent = "☁️ 저장됨"; })
      .catch((e) => { $("#syncState").textContent = "⚠️ 클라우드 저장 실패"; console.warn(e); });
  }

  window.TMAuth = {
    onLocalChange() {
      if (!user || deleting) return;
      $("#syncState").textContent = "저장 중…";
      clearTimeout(pushTimer);
      pushTimer = setTimeout(pushNow, 1200);
    },
  };

  // ---------- 로그인 동작 ----------
  async function social(kind) {
    msg(""); busy(true);
    try {
      const provider = kind === "google" ? new firebase.auth.GoogleAuthProvider() : new firebase.auth.OAuthProvider("apple.com");
      if (kind === "apple") { provider.addScope("email"); provider.addScope("name"); provider.setCustomParameters({ locale: "ko_KR" }); }
      else provider.setCustomParameters({ prompt: "select_account" });
      try { await auth.signInWithPopup(provider); }
      catch (e) {
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") await auth.signInWithRedirect(provider);
        else throw e;
      }
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
        msg("비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.", true);
      } else if (mode === "signup") {
        if (pw !== $("#authPw2").value) throw { code: "x", message: "" , text: "비밀번호가 서로 달라요." };
        const name = $("#authName").value.trim();
        const cred = await auth.createUserWithEmailAndPassword(email, pw);
        if (name) await cred.user.updateProfile({ displayName: name });
        cred.user.sendEmailVerification().catch(() => {});
        renderUser();
        window.TripApp?.toast("가입을 환영해요! 인증 메일을 보냈어요.");
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
    const how = p === "google.com" ? "Google 계정" : p === "apple.com" ? "Apple 계정" : "이메일";
    $("#accountWho").innerHTML = `<b>${esc(user.displayName || "여행자")}</b><br>${esc(user.email || "")}<br><small>${how}으로 로그인 중</small>`;
    showDelete(false);
    modal.hidden = false;
    document.body.classList.add("locked");
  }
  function closeAccount() {
    if (deleting) return;
    modal.hidden = true;
    document.body.classList.remove("locked");
  }
  function showDelete(v) {
    $("#accountMain").hidden = v;
    $("#deleteForm").hidden = !v;
    if (v) {
      const isPw = providerOf(user) === "password";
      $("#delPwRow").hidden = !isPw;
      $("#delSocialHint").hidden = isPw;
      $("#delPw").value = ""; $("#delConfirm").value = ""; delMsg("");
      (isPw ? $("#delPw") : $("#delConfirm")).focus();
    }
  }

  async function reauth() {
    const p = providerOf(user);
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
    if ($("#delConfirm").value.trim() !== "탈퇴") { delMsg("확인 칸에 ‘탈퇴’라고 정확히 입력해 주세요."); return; }
    if (providerOf(user) === "password" && !$("#delPw").value) { delMsg("비밀번호를 입력해 주세요."); return; }
    const btns = $("#deleteForm").querySelectorAll("button, input");
    btns.forEach((b) => (b.disabled = true));
    delMsg("삭제하는 중이에요…", true);
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
      window.TripApp?.toast("탈퇴가 완료됐어요. 그동안 이용해 주셔서 고마워요.");
    } catch (e) {
      deleting = false;
      const code = e?.code || "";
      delMsg(
        code === "auth/wrong-password" || code === "auth/invalid-credential" ? "비밀번호가 맞지 않아요." :
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ? "본인 확인 창이 닫혔어요. 다시 시도해 주세요." :
        code === "auth/popup-blocked" ? "팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요." :
        code === "auth/user-mismatch" ? "지금 로그인한 계정과 다른 계정을 골랐어요. 같은 계정으로 확인해 주세요." :
        code === "auth/too-many-requests" ? "시도가 너무 많아요. 잠시 후 다시 시도해 주세요." :
        code === "auth/network-request-failed" ? "인터넷 연결을 확인해 주세요." :
        `탈퇴 중 문제가 생겼어요. (${code || e?.message || "알 수 없음"})`
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
      msg("로그인 서비스를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
      return;
    }
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    auth.languageCode = "ko";
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
        $("#syncState").textContent = "☁️ 저장됨";
      } else {
        if (hadUser) { showAuth(true); setMode("login"); }
        window.TM_USER_PREFIX = "";
        $("#syncState").textContent = "";
        window.TripApp?.reload();
      }
    });
  }

  init();
})();
