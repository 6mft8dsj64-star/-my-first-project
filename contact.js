/* 트립노트 — 문의하기 + 관리자 문의함
   누구나 문의를 남길 수 있고, 읽기·처리·삭제는 Firestore 보안 규칙에 등록된 관리자만 가능해요.
   (관리자 계정 정보는 코드에 넣지 않아요. SETUP.md의 규칙을 Firebase 콘솔에 넣어 지정합니다.) */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const t = (k, v) => I18N.t(k, v);
  const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CATS = ["bug", "inconv", "idea", "data", "other"];
  const MAX = 2000;
  const contact = $("#contactModal"), inbox = $("#inboxModal");
  let isAdmin = false, items = [], confirmDel = null, openedAt = 0;

  const lockBody = () => document.body.classList.toggle("locked", !contact.hidden || !inbox.hidden || !$("#authScreen").hidden || !$("#settingsModal").hidden);
  const show = (m, v) => { m.hidden = !v; lockBody(); };
  const msg = (text, ok = false) => { const el = $("#ctStatus"); el.textContent = text; el.className = "auth-msg" + (text ? (ok ? " ok" : " err") : ""); };

  // ---------- 문의하기 ----------
  // 로그인한 사람만 문의할 수 있어요 (스팸 방지). 로그인 안 했으면 로그인 안내를 보여줘요.
  function renderLoginGate() {
    const loggedIn = !!window.TMAuth?.user;
    $("#ctLogin").hidden = loggedIn;
    $("#contactForm").querySelectorAll("select, textarea, input:not(#ctWebsite), #ctSend").forEach((el) => { el.disabled = !loggedIn; });
  }
  function renderForm() {
    const cur = $("#ctCat").value || "inconv";
    $("#ctCat").innerHTML = CATS.map((c) => `<option value="${c}" ${c === cur ? "selected" : ""}>${esc(t(`contact.cat.${c}`))}</option>`).join("");
    $("#ctCount").textContent = `${$("#ctMsg").value.length.toLocaleString()} / ${MAX.toLocaleString()}`;
  }
  function openContact(e) {
    e?.preventDefault();
    const u = window.TMAuth?.user;
    if (u?.email && !$("#ctEmail").value) $("#ctEmail").value = u.email;
    renderForm(); renderLoginGate(); msg("");
    openedAt = Date.now();
    show(contact, true);
    if (window.TMAuth?.user) $("#ctMsg").focus();
  }

  async function send(e) {
    e.preventDefault();
    const message = $("#ctMsg").value.trim();
    const email = $("#ctEmail").value.trim();
    if (!window.TMAuth?.user) { renderLoginGate(); msg(t("contact.needLogin")); return; }
    // 함정 칸이 채워졌거나 창을 연 지 3초 안에 보내면 봇으로 보고, 보낸 것처럼만 보여줘요
    if ($("#ctWebsite").value || Date.now() - openedAt < 3000) {
      $("#ctMsg").value = ""; renderForm(); show(contact, false);
      window.TripApp?.toast(t("contact.sent"));
      return;
    }
    if (!message) { msg(t("contact.needMsg")); return; }
    if (message.length > MAX) { msg(t("contact.tooLong")); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg(t("err.auth/invalid-email")); return; }
    let last = 0;
    try { last = Number(localStorage.getItem("tm_contact_last")) || 0; } catch { /* 무시 */ }
    if (Date.now() - last < 30000) { msg(t("contact.wait")); return; }
    const db = window.TMAuth?.db;
    if (!db) { msg(t("contact.offline")); return; }
    const u = window.TMAuth?.user;
    const btn = $("#ctSend");
    btn.disabled = true; msg(t("contact.sending"), true);
    try {
      await db.collection("inquiries").add({
        category: $("#ctCat").value, message, email: email.slice(0, 200),
        uid: u ? u.uid : null, name: (u?.displayName || "").slice(0, 100),
        lang: I18N.lang, page: String(window.TripApp?.current?.() || "").slice(0, 50),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), status: "new",
      });
      try { localStorage.setItem("tm_contact_last", String(Date.now())); } catch { /* 무시 */ }
      $("#ctMsg").value = ""; renderForm();
      show(contact, false);
      window.TripApp?.toast(t("contact.sent"));
    } catch (err) {
      msg(t("contact.fail", { c: err?.code || err?.message || "?" }));
    }
    btn.disabled = false;
  }

  // ---------- 관리자 문의함 ----------
  // 로그인할 때 문의함 읽기를 한 번 시도해서, 규칙이 허락하는 계정(관리자)에게만 버튼을 보여줘요.
  async function onUser(u) {
    isAdmin = false;
    if (!contact.hidden) renderLoginGate();
    $("#inboxBtn").hidden = true;
    if (!u || !window.TMAuth?.db) return;
    try {
      await window.TMAuth.db.collection("inquiries").limit(1).get();
      if (window.TMAuth.user !== u) return;
      isAdmin = true;
      $("#inboxBtn").hidden = false;
      refreshBadge();
    } catch { /* 권한 없음 = 일반 사용자 */ }
  }

  async function load() {
    const snap = await window.TMAuth.db.collection("inquiries").orderBy("createdAt", "desc").limit(200).get();
    items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async function refreshBadge() {
    try { await load(); } catch { return; }
    const n = items.filter((x) => x.status === "new").length;
    $("#inboxBtn").textContent = n ? `${t("inbox.btn")} ${n}` : t("inbox.btn");
  }

  const langName = (code) => I18N.LANGS.find((l) => l.code === code)?.name || code || "?";
  // 외국어 문의를 운영자 언어로 번역해서 보기 (구글 번역 새 탭)
  const translateUrl = (text) => `https://translate.google.com/?sl=auto&tl=${encodeURIComponent(I18N.lang)}&op=translate&text=${encodeURIComponent(String(text).slice(0, 1500))}`;

  function renderInbox() {
    const n = items.filter((x) => x.status === "new").length;
    $("#inboxCount").textContent = t("inbox.count", { n: items.length, m: n });
    if (!items.length) { $("#inboxList").innerHTML = `<div class="empty">${esc(t("inbox.empty"))}</div>`; return; }
    $("#inboxList").innerHTML = items.map((x) => {
      const when = x.createdAt?.toDate ? x.createdAt.toDate().toLocaleString(I18N.locale(), { dateStyle: "medium", timeStyle: "short" }) : "";
      const who = x.uid ? `${esc(x.name || "")} <small>(${esc(x.uid.slice(0, 8))}…)</small>` : esc(t("inbox.guest"));
      return `<div class="inq ${x.status === "done" ? "done" : ""}">
        <div class="inq-head"><span class="badge ${x.status === "new" ? "peak" : "good"}">${esc(x.status === "new" ? t("inbox.new") : t("inbox.done"))}</span>
          <b>${esc(t(`contact.cat.${x.category}`))}</b><span class="inq-when">${esc(when)}</span></div>
        <div class="inq-msg" dir="auto">${esc(x.message)}</div>
        <div class="inq-meta">${t("inbox.from")}: ${who} · ${x.email ? `<span class="inq-mail">${esc(x.email)}</span>` : esc(t("inbox.noEmail"))} · 🌐 ${esc(langName(x.lang))}${x.page ? ` · ${esc(x.page)}` : ""}</div>
        <div class="inq-actions">
          ${x.lang && x.lang !== I18N.lang ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${translateUrl(x.message)}">${esc(t("inbox.translate"))}</a>` : ""}
          <button class="btn ghost sm" data-toggle="${esc(x.id)}">${esc(x.status === "new" ? t("inbox.markDone") : t("inbox.reopen"))}</button>
          <button class="btn ghost sm danger-text" data-del="${esc(x.id)}">${esc(confirmDel === x.id ? t("inbox.confirmDel") : t("inbox.del"))}</button>
        </div></div>`;
    }).join("");
  }

  async function openInbox() {
    if (!isAdmin) return;
    show(inbox, true);
    $("#inboxList").innerHTML = `<div class="empty">${esc(t("sync.loading"))}</div>`;
    try { await load(); renderInbox(); }
    catch (e) { $("#inboxList").innerHTML = `<div class="empty">${esc(t("inbox.fail", { c: e?.code || e?.message || "?" }))}</div>`; }
  }

  async function onInboxClick(e) {
    const tg = e.target.closest("[data-toggle]"), dl = e.target.closest("[data-del]");
    const db = window.TMAuth.db;
    try {
      if (tg) {
        const x = items.find((i) => i.id === tg.dataset.toggle);
        const status = x.status === "new" ? "done" : "new";
        await db.collection("inquiries").doc(x.id).update({ status });
        x.status = status;
      } else if (dl) {
        const id = dl.dataset.del;
        if (confirmDel !== id) { confirmDel = id; renderInbox(); return; } // 한 번 더 눌러야 삭제
        await db.collection("inquiries").doc(id).delete();
        items = items.filter((i) => i.id !== id);
        confirmDel = null;
      } else return;
      renderInbox(); refreshBadge();
    } catch (err) { window.TripApp?.toast(t("inbox.fail", { c: err?.code || "?" })); }
  }

  // ---------- 연결 ----------
  $("#ctLoginBtn").addEventListener("click", () => { show(contact, false); window.TMAuth?.openLogin?.(); });
  document.querySelectorAll("[data-open-contact]").forEach((el) => el.addEventListener("click", openContact));
  $("#contactForm").addEventListener("submit", send);
  $("#ctMsg").addEventListener("input", renderForm);
  $("#inboxBtn").addEventListener("click", openInbox);
  $("#inboxList").addEventListener("click", onInboxClick);
  [contact, inbox].forEach((m) => {
    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => show(m, false)));
    m.addEventListener("click", (e) => { if (e.target === m) show(m, false); });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!contact.hidden) show(contact, false); if (!inbox.hidden) show(inbox, false); } });

  window.TMContact = {
    onUser,
    relabel() { renderForm(); if (!inbox.hidden) renderInbox(); if (isAdmin) refreshBadge(); },
  };
  I18N.ready.then(renderForm);
})();
