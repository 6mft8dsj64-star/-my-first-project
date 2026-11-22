/* 트립노트 — 성수기·비수기 달력
   1) 한국 출발 성수기 (모든 여행지): 설·추석 연휴, 여름휴가(7월 하순~8월 중순), 연말연시
      - 스카이스캐너 한국 출발 항공권 분석: 8월 +10%, 7월 +9%, 추석이 낀 9월 +8% (연평균 대비),
        가장 싼 달은 3월 −10%, 11월 −7%, 2월 −6%
      - 설·추석 날짜: 우주항공청 월력요항 (2028년은 발표 전 예정일)
   2) 현지 연휴 (그 나라 여행지만): 일본 골든위크·오봉·연말연시·실버위크, 중국 국경절, 중화권 춘절
   3) 여행지별 성수기 달(peakMonths)·추천 달(bestMonths): data.js / world.js
   숙소 요금 반영: 비수기 = 평균 × 0.8 (스카이스캐너 "비수기 호텔 요금은 평균가보다 20% 이상 낮음"),
                  평소 = 평균, 성수기 = 평균 × 1.4 (연휴·성수기 숙박비 상승을 보수적으로 반영한 추정) */
const SEASON = (() => {
  const KR = [ // 한국 명절 (주말 포함 연휴)
    ["2026-02-14", "2026-02-18", "seol"], ["2026-09-24", "2026-09-27", "chuseok"],
    ["2027-02-06", "2027-02-09", "seol"], ["2027-09-14", "2027-09-16", "chuseok"],
    ["2028-01-26", "2028-01-30", "seol"], ["2028-09-30", "2028-10-05", "chuseok"],
  ];
  const YEARLY = [ // 매년 반복 (월-일)
    ["07-20", "08-20", "summer", null],
    ["12-22", "12-31", "yearend", null], ["01-01", "01-02", "yearend", null],
    ["04-29", "05-06", "gw", ["jp"]], ["08-10", "08-18", "obon", ["jp"]],
    ["12-28", "12-31", "jpnewyear", ["jp"]], ["01-01", "01-04", "jpnewyear", ["jp"]],
    ["10-01", "10-07", "golden", ["cn", "hk", "mo"]],
  ];
  const ONCE = [ // 특정 해만 (현지)
    ["2026-09-19", "2026-09-23", "silver", ["jp"]],
  ];
  const LUNAR_LOCAL = ["cn", "hk", "mo", "tw", "vn", "sg"]; // 설(춘절·뗏) 기간에 현지도 붐비는 곳
  const pad = (n) => String(n).padStart(2, "0");
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // 그날 해당하는 성수기 이유 목록 (예: ["summer"], ["seol","cny"])
  function tags(dest, date) {
    const s = isoOf(date), md = s.slice(5), out = [];
    KR.forEach(([a, b, k]) => {
      if (s >= a && s <= b) { out.push(k); if (k === "seol" && LUNAR_LOCAL.includes(dest.countryId)) out.push("cny"); }
    });
    YEARLY.forEach(([a, b, k, only]) => { if (md >= a && md <= b && (!only || only.includes(dest.countryId))) out.push(k); });
    ONCE.forEach(([a, b, k, only]) => { if (s >= a && s <= b && only.includes(dest.countryId)) out.push(k); });
    return [...new Set(out)];
  }
  // peak(성수기) · good(날씨 좋은 추천 시기, 평소 요금) · off(비수기)
  function kind(dest, date) {
    const m = date.getMonth() + 1;
    if (tags(dest, date).length || dest.peakMonths.includes(m)) return "peak";
    if (dest.bestMonths.includes(m)) return "good";
    return "off";
  }
  const MUL = { off: 0.8, good: 1, peak: 1.4 };
  return { tags, kind, MUL, isoOf };
})();

// 숙소 성급별 요금을 여행지에 붙여요 (원화 조사값 → 현지 통화로 바꿔 두면 환율이 바뀔 때 함께 반영돼요)
DESTINATIONS.forEach((d) => {
  const s = STAY[d.id];
  const r = FALLBACK_RATES[d.currency] || 1;
  const L = (krw) => krw / r;
  d.stay = {
    tiers: [
      { k: "t12", local: L(s.s3 * 0.6) },
      { k: "t3", local: L(s.s3) },
      { k: "t4", local: L(s.s4) },
      { k: "t5", local: L(s.s5) },
    ],
    cm: s.cm || 0, em: s.em || 0, src: s.src, url: s.u ? `https://www.${s.u}` : "", fix: !!s.fix,
  };
  // 하루 생활비 '기타' 항목은 없앴어요 (식비 + 교통만)
  if (d.daily) delete d.daily.misc;
});
