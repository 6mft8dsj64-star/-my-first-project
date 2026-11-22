/* 트립노트 — 외교부 여행경보 (해외안전여행 0404.go.kr) 요약
   SAFETY_CHECKED 날짜에 웹으로 확인한 내용이에요. 경보는 수시로 바뀌므로 화면에 확인 날짜와 외교부 링크를 함께 보여 줘요.
   main = 주요 관광 도시가 속한 지역의 단계, max = 그 나라 안에서 가장 높은 단계
   단계: 0 경보 없음 · 1 여행유의 · 2 여행자제 · 2.5 특별여행주의보 · 3 출국권고 · 4 여행금지 · null 확인 못 함(단계를 표시하지 않음)
   parts = 높은 단계가 걸린 지역 (한국어, 영어) / id = 0404.go.kr 국가 페이지 번호
   근거: 외교부 보도자료(2026 상반기 정기조정, 중동 7개국 3단계 상향 2026-03-08, 사우디 3단계 2026-10-11 등)와
        0404.go.kr 국가별 페이지 검색 결과 */
const SAFETY_CHECKED = "2026-11-22";
const SAFETY = {
  jp: { main: 0, max: 0, id: 183 },
  cn: { main: null, max: 2.5, parts: ["티베트·신장위구르 자치구 특별여행주의보", "Special advisory for Tibet and Xinjiang"] },
  tw: { main: 1, max: 1, id: 372 },
  hk: { main: 1, max: 1, id: 377 },
  mo: { main: 1, max: 1 },
  mn: { main: 1, max: 1, id: 68 },
  vn: { main: 1, max: 1, id: 86 },
  th: { main: 1, max: 3, id: 260, parts: ["남부 송클라(말레이시아 접경)·파타니·나라티왓·얄라주, 캄보디아 국경 50km 이내 3단계 · 딱주 2단계", "Level 3: southern Songkhla (Malaysian border), Pattani, Narathiwat, Yala and within 50 km of the Cambodian border · Level 2: Tak"] },
  ph: { main: null, max: 4, parts: ["민다나오 잠보앙가 반도, 술루·바실란·타위타위 군도 4단계(여행금지)", "Level 4 (travel ban): Zamboanga Peninsula and the Sulu, Basilan and Tawi-Tawi islands (Mindanao)"] },
  id: { main: null, max: 2.5, parts: ["중부칼리만탄주 특별여행주의보 (2026-10-23)", "Special advisory for Central Kalimantan (2026-10-23)"] },
  kh: { main: 1, max: 3, id: 259, parts: ["시하누크빌시·캄폿주 보코산·바벳시·포이펫시, 태국 국경 50km 이내 3단계 · 시하누크빌주 2단계", "Level 3: Sihanoukville city, Bokor (Kampot), Bavet, Poipet and within 50 km of the Thai border · Level 2: Preah Sihanouk province"] },
  la: { main: null, max: 4, parts: ["골든트라이앵글 경제특구 여행금지(취업 사기 피해)", "Travel ban: Golden Triangle Special Economic Zone (job-scam victims)"] },
  np: { main: 1, max: 1 },
  lk: { main: 1, max: 1 },
  mv: { main: 1, max: 1 },
  bt: { main: 1, max: 1 },
  ae: { main: 3, max: 3, parts: ["2026년 중동 전쟁으로 전역 3단계(출국권고) — 2026-03-08 상향", "Whole country level 3 due to the 2026 Middle East war — raised 2026-03-08"] },
  qa: { main: 3, max: 3, parts: ["2026년 중동 전쟁으로 전역 3단계(출국권고) — 2026-03-08 상향", "Whole country level 3 due to the 2026 Middle East war — raised 2026-03-08"] },
  om: { main: 3, max: 3, parts: ["2026년 중동 전쟁으로 전역 3단계(출국권고) — 2026-03-08 상향", "Whole country level 3 due to the 2026 Middle East war — raised 2026-03-08"] },
  sa_: { main: 3, max: 3, parts: ["2026-10-11 3단계(출국권고)로 상향", "Raised to level 3 on 2026-10-11"] },
  jo: { main: 2.5, max: 3, parts: ["자르카시 동쪽 3단계, 그 밖의 지역 특별여행주의보 (2026년 중동 전쟁)", "Level 3 east of Zarqa, special advisory elsewhere (2026 Middle East war)"] },
  tr: { main: 1, max: 3, id: 228, parts: ["시리아·이라크 국경 10km 이내 3단계, 동남부 일부 주 2단계", "Level 3 within 10 km of the Syrian and Iraqi borders, level 2 in some southeastern provinces"] },
  fr: { main: 1, max: 1 },
  gb: { main: 1, max: 1 },
  de: { main: 1, max: 1 },
  ch: { main: 1, max: 1 },
  it: { main: 1, max: 1, id: 179 },
  es: { main: 1, max: 1 },
  pl: { main: 1, max: 2, parts: ["우크라이나 접경 30km 2단계", "Level 2 within 30 km of the Ukrainian border"] },
  rs: { main: 1, max: 1, id: 287 },
  ge: { main: null, max: 3, parts: ["일부 지역 2·3단계 (압하지야·남오세티야 등 분쟁 지역)", "Levels 2–3 in some areas (disputed regions such as Abkhazia and South Ossetia)"] },
  cl: { main: 2, max: 2, parts: ["산티아고 수도주·발파라이소주·비오비오주 2단계, 그 밖의 지역 1단계", "Level 2: Santiago Metropolitan, Valparaíso and Biobío regions; level 1 elsewhere"] },
  ar: { main: 2, max: 2 },
  bo: { main: null, max: 3, parts: ["코차밤바주 3단계(2025-07 상향), 일부 지역 특별여행주의보", "Level 3: Cochabamba (raised July 2025); special advisory in some areas"] },
  pe: { main: null, max: 3, parts: ["일부 지역 2·3단계", "Levels 2–3 in some areas"] },
  mx: { main: null, max: 2.5, parts: ["과나후아토주 특별여행주의보 등", "Special advisory for Guanajuato state and others"] },
  eg: { main: null, max: 3, parts: ["일부 지역 1·2·3단계 (시나이반도·리비아 국경 등)", "Levels 1–3 in parts (e.g. Sinai, Libyan border areas)"] },
  ma: { main: 1, max: 3, parts: ["서사하라 모래방어벽 서쪽 2단계, 동쪽 3단계", "Western Sahara: level 2 west of the sand berm, level 3 east of it"] },
  za: { main: 2, max: 2, parts: ["2025-12 특별여행주의보 해제 후 전역 2단계", "Whole country level 2 after the special advisory was lifted (Dec 2025)"] },
  ke: { main: 2, max: 3, parts: ["소말리아 접경 등 일부 지역 3단계, 그 밖의 지역 2단계", "Level 3 in some areas such as near the Somali border; level 2 elsewhere"] },
  tz: { main: null, max: 3, parts: ["음트와라주 3단계(테러 위험) · 2026-10-01부터 여행자 보험 가입 필수", "Level 3: Mtwara (terror risk) · travel insurance mandatory from 2026-10-01"] },
};
