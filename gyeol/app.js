'use strict';

/* ============ 설정 ============ */
const STORAGE_KEY = 'gyeol.trips.v1';
const CATEGORIES = ['교통', '숙소', '식비', '관광', '쇼핑', '기타'];
const PACKING_SUGGESTIONS = ['여권', '신분증', '지갑', '휴대폰 충전기', '보조배터리', '세면도구', '상비약', '속옷', '잠옷', '우산'];
const TABS = [
  { id: 'schedule', label: '일정' },
  { id: 'budget', label: '예산' },
  { id: 'packing', label: '준비물' },
  { id: 'memo', label: '메모' },
];
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const app = document.getElementById('app');
let trips = loadTrips();
let current = null;   // 지금 보고 있는 여행
let lastDate = null;  // 일정 추가 시 마지막으로 고른 날짜

/* ============ 저장 ============ */
function loadTrips() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data.map(normalizeTrip) : [];
  } catch {
    return [];
  }
}

function normalizeTrip(t) {
  return {
    id: t.id || uid(),
    name: t.name || '이름 없는 여행',
    destination: t.destination || '',
    start: t.start || '',
    end: t.end || '',
    schedule: Array.isArray(t.schedule) ? t.schedule : [],
    budget: { total: Number(t.budget?.total) || 0, expenses: Array.isArray(t.budget?.expenses) ? t.budget.expenses : [] },
    packing: Array.isArray(t.packing) ? t.packing : [],
    memo: t.memo || '',
  };
}

function saveTrips() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch {
    toast('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
  }
}

/* ============ 도우미 ============ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function won(n) {
  return (Number(n) || 0).toLocaleString('ko-KR') + '원';
}

function toNumber(s) {
  return Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;
}

function sumAmount(list) {
  return list.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function fmtDate(s) {
  if (!s) return '';
  const d = parseDate(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

function fmtShort(s) {
  const d = parseDate(s);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEK[d.getDay()]})`;
}

function tripDays(t) {
  if (!t.start || !t.end) return [];
  const out = [];
  let d = parseDate(t.start);
  const end = parseDate(t.end);
  while (d <= end && out.length < 60) {
    out.push(toISO(d));
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }
  return out;
}

function period(t) {
  if (!t.start) return '날짜 미정';
  const days = tripDays(t).length;
  const nights = days - 1;
  const range = t.start === t.end ? fmtDate(t.start) : `${fmtDate(t.start)} – ${fmtDate(t.end)}`;
  return `${range} · ${nights > 0 ? `${nights}박 ` : ''}${days}일`;
}

function status(t) {
  if (!t.start) return { label: '날짜 미정', tone: 'muted' };
  const diff = Math.round((parseDate(t.start) - today()) / 86400000);
  if (diff > 0) return { label: `D-${diff}`, tone: 'accent' };
  if (diff === 0) return { label: 'D-DAY', tone: 'accent' };
  if (today() <= parseDate(t.end || t.start)) return { label: '여행 중', tone: 'accent' };
  return { label: '다녀옴', tone: 'muted' };
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ============ 화면 이동 ============ */
function route() {
  const [page, id, tab] = location.hash.replace(/^#\/?/, '').split('/');
  if (page === 'trip' && id) {
    const trip = trips.find(t => t.id === id);
    if (trip) return renderTrip(trip, tab);
    toast('여행을 찾을 수 없어요.');
  }
  current = null;
  renderHome();
}

function rerender(focusSelector) {
  const y = window.scrollY;
  route();
  window.scrollTo(0, y);
  if (focusSelector) app.querySelector(focusSelector)?.focus({ preventScroll: true });
}

/* ============ 처음 화면 ============ */
function renderHome() {
  document.title = '결 — 여행 계획';
  const sorted = [...trips].sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));
  app.innerHTML = `
    <section class="intro">
      <h1>어디로 떠나시나요?</h1>
      <p>일정, 예산, 준비물, 메모를 한 곳에 모아 두세요.</p>
    </section>

    ${sorted.length ? `
      <h2 class="section-title">내 여행 <span class="count">${sorted.length}</span></h2>
      <ul class="trip-list">${sorted.map(tripCard).join('')}</ul>
    ` : ''}

    <h2 class="section-title">새 여행 만들기</h2>
    <section class="card">
      <form data-form="new-trip" class="stack" novalidate>
        <label class="field"><span>여행 이름</span>
          <input name="name" maxlength="40" placeholder="예: 제주 봄 여행" autocomplete="off"></label>
        <label class="field"><span>여행지</span>
          <input name="destination" maxlength="40" placeholder="예: 제주도" autocomplete="off"></label>
        <div class="row">
          <label class="field"><span>출발일</span><input type="date" name="start"></label>
          <label class="field"><span>도착일</span><input type="date" name="end"></label>
        </div>
        <button class="btn primary" type="submit">여행 만들기</button>
      </form>
    </section>
  `;
}

function tripCard(t) {
  const s = status(t);
  const packed = t.packing.filter(p => p.done).length;
  return `
    <li>
      <a class="trip-card" href="#/trip/${t.id}">
        <div class="trip-card-top">
          <h3>${esc(t.name)}</h3>
          <span class="badge ${s.tone}">${s.label}</span>
        </div>
        <p class="meta">${t.destination ? `${esc(t.destination)} · ` : ''}${period(t)}</p>
        <p class="meta small">일정 ${t.schedule.length}개 · 준비물 ${packed}/${t.packing.length} · 지출 ${won(sumAmount(t.budget.expenses))}</p>
      </a>
    </li>`;
}

/* ============ 여행 상세 ============ */
function renderTrip(t, tab) {
  if (!TABS.some(x => x.id === tab)) tab = 'schedule';
  current = t;
  document.title = `${t.name} — 결`;
  const s = status(t);
  app.innerHTML = `
    <a href="#/" class="back">← 내 여행</a>
    <section class="trip-head">
      <div class="trip-card-top">
        <h1>${esc(t.name)}</h1>
        <span class="badge ${s.tone}">${s.label}</span>
      </div>
      <p class="meta">${t.destination ? `${esc(t.destination)} · ` : ''}${period(t)}</p>
      <button class="btn text danger" type="button" data-action="delete-trip">여행 삭제</button>
    </section>
    <nav class="tabs" aria-label="여행 메뉴">
      ${TABS.map(x => `<a href="#/trip/${t.id}/${x.id}" class="tab${x.id === tab ? ' active' : ''}"${x.id === tab ? ' aria-current="page"' : ''}>${x.label}</a>`).join('')}
    </nav>
    <section class="panel">${PANELS[tab](t)}</section>
  `;
}

/* --- 일정 --- */
function schedulePanel(t) {
  const days = tripDays(t);
  const selected = days.includes(lastDate) ? lastDate : days[0];
  const dateField = days.length
    ? `<select name="date">${days.map((d, i) => `<option value="${d}"${d === selected ? ' selected' : ''}>${i + 1}일차 · ${fmtShort(d)}</option>`).join('')}</select>`
    : `<input type="date" name="date" value="${lastDate || ''}">`;

  const items = [...t.schedule].sort((a, b) =>
    (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99')));
  const groups = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === it.date) last.items.push(it);
    else groups.push({ date: it.date, items: [it] });
  }

  return `
    <section class="card">
      <h2>일정 추가</h2>
      <form data-form="add-event" class="stack" novalidate>
        <div class="row wide-first">
          <label class="field"><span>날짜</span>${dateField}</label>
          <label class="field"><span>시간 (선택)</span><input type="time" name="time"></label>
        </div>
        <label class="field"><span>할 일</span>
          <input name="title" maxlength="60" placeholder="예: 성산일출봉 오르기" autocomplete="off"></label>
        <label class="field"><span>장소 (선택)</span>
          <input name="place" maxlength="60" placeholder="예: 서귀포시 성산읍" autocomplete="off"></label>
        <button class="btn primary" type="submit">일정 추가</button>
      </form>
    </section>

    ${groups.length ? groups.map(g => {
      const idx = days.indexOf(g.date);
      return `
        <div class="day">
          <h3 class="day-title">${idx >= 0 ? `${idx + 1}일차` : '기타'} <span>${fmtDate(g.date) || '날짜 없음'}</span></h3>
          <ul class="list">
            ${g.items.map(it => `
              <li>
                <span class="time">${it.time ? esc(it.time) : '–'}</span>
                <div class="item-body">
                  <strong>${esc(it.title)}</strong>
                  ${it.place ? `<span class="sub">📍 ${esc(it.place)}</span>` : ''}
                </div>
                <button class="icon-btn" type="button" data-action="delete-event" data-id="${it.id}" aria-label="일정 삭제">×</button>
              </li>`).join('')}
          </ul>
        </div>`;
    }).join('') : `<p class="empty" style="margin-top:18px">아직 일정이 없어요. 첫 일정을 추가해 보세요.</p>`}
  `;
}

/* --- 예산 --- */
function budgetPanel(t) {
  const total = t.budget.total;
  const spent = sumAmount(t.budget.expenses);
  const remain = total - spent;
  const over = total > 0 && remain < 0;
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

  const byCat = CATEGORIES
    .map(c => ({ c, amt: sumAmount(t.budget.expenses.filter(e => e.category === c)) }))
    .filter(x => x.amt > 0)
    .sort((a, b) => b.amt - a.amt);
  const maxCat = byCat[0]?.amt || 1;

  return `
    <section class="card">
      <h2>예산 한눈에 보기</h2>
      <div class="stats">
        <div class="stat"><span>총 예산</span><strong>${won(total)}</strong></div>
        <div class="stat"><span>쓴 돈</span><strong>${won(spent)}</strong></div>
        <div class="stat${over ? ' over' : ''}"><span>${over ? '초과' : '남은 돈'}</span><strong>${won(Math.abs(remain))}</strong></div>
      </div>
      ${total > 0 ? `
        <div class="bar${over ? ' over' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="예산 사용률"><i style="width:${pct}%"></i></div>
        <p class="bar-caption">예산의 ${total ? Math.round((spent / total) * 100) : 0}%를 썼어요.</p>` : `<p class="bar-caption">총 예산을 정하면 얼마나 썼는지 보여 드려요.</p>`}
      <form data-form="set-total" class="inline-form" novalidate>
        <input name="total" inputmode="numeric" placeholder="총 예산 (원)" value="${total || ''}" aria-label="총 예산" autocomplete="off">
        <button class="btn" type="submit">예산 저장</button>
      </form>
    </section>

    ${byCat.length ? `
      <section class="card">
        <h2>분류별 지출</h2>
        <ul class="breakdown">
          ${byCat.map(x => `
            <li><span>${x.c}</span>
              <div class="bar"><i style="width:${Math.max(4, Math.round((x.amt / maxCat) * 100))}%"></i></div>
              <span class="amt">${won(x.amt)}</span></li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="card">
      <h2>지출 추가</h2>
      <form data-form="add-expense" class="stack" novalidate>
        <div class="row">
          <label class="field"><span>분류</span>
            <select name="category">${CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></label>
          <label class="field"><span>금액 (원)</span>
            <input name="amount" inputmode="numeric" placeholder="예: 35000" autocomplete="off"></label>
        </div>
        <label class="field"><span>내용</span>
          <input name="title" maxlength="60" placeholder="예: 공항 리무진" autocomplete="off"></label>
        <button class="btn primary" type="submit">지출 추가</button>
      </form>
    </section>

    <h2 class="section-title">지출 내역 <span class="count">${t.budget.expenses.length}</span></h2>
    ${t.budget.expenses.length ? `
      <ul class="list">
        ${[...t.budget.expenses].reverse().map(e => `
          <li>
            <span class="cat-tag">${esc(e.category)}</span>
            <div class="item-body"><strong>${esc(e.title)}</strong></div>
            <span class="amount">${won(e.amount)}</span>
            <button class="icon-btn" type="button" data-action="delete-expense" data-id="${e.id}" aria-label="지출 삭제">×</button>
          </li>`).join('')}
      </ul>` : `<p class="empty">아직 기록한 지출이 없어요.</p>`}
  `;
}

/* --- 준비물 --- */
function packingPanel(t) {
  const done = t.packing.filter(p => p.done).length;
  const pct = t.packing.length ? Math.round((done / t.packing.length) * 100) : 0;
  const have = new Set(t.packing.map(p => p.text));
  const suggestions = PACKING_SUGGESTIONS.filter(s => !have.has(s));
  const sorted = [...t.packing].sort((a, b) => Number(a.done) - Number(b.done));

  return `
    <section class="card">
      <h2>준비물 챙기기</h2>
      ${t.packing.length ? `
        <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="준비물 진행률"><i style="width:${pct}%"></i></div>
        <p class="bar-caption">${t.packing.length}개 중 ${done}개 챙겼어요.${done === t.packing.length ? ' 준비 끝!' : ''}</p>` : ''}
      <form data-form="add-packing" class="inline-form" novalidate>
        <input name="text" maxlength="40" placeholder="예: 선크림" aria-label="준비물 이름" autocomplete="off">
        <button class="btn primary" type="submit">추가</button>
      </form>
      ${suggestions.length ? `
        <div class="chips" aria-label="자주 챙기는 준비물">
          ${suggestions.map(s => `<button class="chip" type="button" data-action="suggest" data-text="${esc(s)}">+ ${esc(s)}</button>`).join('')}
        </div>` : ''}
    </section>

    <div style="margin-top:18px">
    ${sorted.length ? `
      <ul class="list">
        ${sorted.map(p => `
          <li class="${p.done ? 'done' : ''}">
            <label class="check">
              <input type="checkbox" data-action="toggle-packing" data-id="${p.id}"${p.done ? ' checked' : ''}>
              <span>${esc(p.text)}</span>
            </label>
            <button class="icon-btn" type="button" data-action="delete-packing" data-id="${p.id}" aria-label="준비물 삭제">×</button>
          </li>`).join('')}
      </ul>` : `<p class="empty">챙길 물건을 추가하거나 위의 추천 항목을 눌러 보세요.</p>`}
    </div>
  `;
}

/* --- 메모 --- */
function memoPanel(t) {
  return `
    <textarea class="memo" data-field="memo" aria-label="여행 메모"
      placeholder="숙소 주소, 예약 번호, 가 보고 싶은 맛집처럼 기억해 둘 것을 자유롭게 적어 두세요.">${esc(t.memo)}</textarea>
    <p class="memo-status" id="memo-status">적는 대로 자동 저장돼요.</p>
  `;
}

const PANELS = { schedule: schedulePanel, budget: budgetPanel, packing: packingPanel, memo: memoPanel };

/* ============ 폼 처리 ============ */
const FORMS = {
  'new-trip'(d) {
    const name = d.name.trim();
    if (!name) return toast('여행 이름을 적어 주세요.');
    let { start, end } = d;
    if (start && !end) end = start;
    if (end && !start) start = end;
    if (start && end < start) return toast('도착일이 출발일보다 빨라요.');
    const trip = normalizeTrip({ id: uid(), name, destination: d.destination.trim(), start, end });
    trips.push(trip);
    saveTrips();
    lastDate = null;
    location.hash = `#/trip/${trip.id}/schedule`;
    toast('새 여행을 만들었어요.');
  },

  'add-event'(d) {
    const title = d.title.trim();
    if (!d.date) return toast('날짜를 골라 주세요.');
    if (!title) return toast('할 일을 적어 주세요.');
    current.schedule.push({ id: uid(), date: d.date, time: d.time, title, place: d.place.trim() });
    lastDate = d.date;
    saveTrips();
    rerender('[data-form="add-event"] [name="title"]');
    toast('일정을 추가했어요.');
  },

  'set-total'(d) {
    current.budget.total = toNumber(d.total);
    saveTrips();
    rerender();
    toast('예산을 저장했어요.');
  },

  'add-expense'(d) {
    const amount = toNumber(d.amount);
    const title = d.title.trim() || d.category;
    if (!amount) return toast('금액을 적어 주세요.');
    current.budget.expenses.push({ id: uid(), category: d.category, title, amount });
    saveTrips();
    rerender('[data-form="add-expense"] [name="amount"]');
    toast('지출을 추가했어요.');
  },

  'add-packing'(d) {
    const text = d.text.trim();
    if (!text) return toast('준비물 이름을 적어 주세요.');
    if (current.packing.some(p => p.text === text)) return toast('이미 목록에 있어요.');
    current.packing.push({ id: uid(), text, done: false });
    saveTrips();
    rerender('[data-form="add-packing"] [name="text"]');
  },
};

app.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  FORMS[form.dataset.form]?.(data);
});

/* ============ 버튼 처리 ============ */
const ACTIONS = {
  'delete-trip'() {
    if (!confirm(`'${current.name}' 여행을 삭제할까요? 일정, 예산, 준비물, 메모가 모두 지워져요.`)) return;
    trips = trips.filter(t => t.id !== current.id);
    saveTrips();
    location.hash = '#/';
    toast('여행을 삭제했어요.');
  },
  'delete-event'(id) {
    current.schedule = current.schedule.filter(x => x.id !== id);
    saveTrips();
    rerender();
  },
  'delete-expense'(id) {
    current.budget.expenses = current.budget.expenses.filter(x => x.id !== id);
    saveTrips();
    rerender();
  },
  'delete-packing'(id) {
    current.packing = current.packing.filter(x => x.id !== id);
    saveTrips();
    rerender();
  },
  suggest(_, el) {
    const text = el.dataset.text;
    if (!current.packing.some(p => p.text === text)) current.packing.push({ id: uid(), text, done: false });
    saveTrips();
    rerender();
  },
};

app.addEventListener('click', e => {
  const el = e.target.closest('button[data-action]');
  if (!el || !current) return;
  ACTIONS[el.dataset.action]?.(el.dataset.id, el);
});

app.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.action !== 'toggle-packing' || !current) return;
  const item = current.packing.find(p => p.id === el.dataset.id);
  if (item) item.done = el.checked;
  saveTrips();
  rerender();
});

/* ============ 메모 자동 저장 ============ */
let memoTimer;
app.addEventListener('input', e => {
  if (e.target.dataset.field !== 'memo' || !current) return;
  current.memo = e.target.value;
  saveTrips();
  const status = document.getElementById('memo-status');
  if (!status) return;
  status.textContent = '저장됨 ✓';
  clearTimeout(memoTimer);
  memoTimer = setTimeout(() => { status.textContent = '적는 대로 자동 저장돼요.'; }, 1500);
});

/* ============ 시작 ============ */
window.addEventListener('hashchange', route);
route();
