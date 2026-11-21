// 여행지 참고 데이터 (추정치)
// 항공권: 인천 출발 왕복 일반석 기준 원화(KRW) 추정 범위
// 숙소/물가/관광지 비용: 현지 통화 기준 → 실시간 환율로 원화 환산
// ※ 실제 가격은 시기·예약 시점에 따라 달라지므로 참고용입니다.

const FALLBACK_RATES = {
  // 1 현지통화 = ? KRW (API 실패 시 사용하는 대략값)
  JPY: 9.3, THB: 41, VND: 0.055, TWD: 44, IDR: 0.087,
  SGD: 1060, EUR: 1520, USD: 1400, KRW: 1,
};

const CURRENCY_INFO = {
  JPY: { name: "일본 엔", symbol: "¥" },
  THB: { name: "태국 바트", symbol: "฿" },
  VND: { name: "베트남 동", symbol: "₫" },
  TWD: { name: "대만 달러", symbol: "NT$" },
  IDR: { name: "인도네시아 루피아", symbol: "Rp" },
  SGD: { name: "싱가포르 달러", symbol: "S$" },
  EUR: { name: "유로", symbol: "€" },
  USD: { name: "미국 달러", symbol: "$" },
};

const DESTINATIONS = [
  {
    id: "tokyo", name: "도쿄", country: "일본", flag: "🇯🇵", currency: "JPY",
    flight: { low: 250000, avg: 350000, high: 550000, hours: "2시간 30분" },
    bestMonths: [3, 4, 5, 10, 11], peakMonths: [1, 8, 12],
    hotels: [
      { name: "신주쿠 역세권 비즈니스호텔", type: "비즈니스", price: 15000, share: 34, rating: 4.2, note: "교통 최강, 첫 방문자 1순위" },
      { name: "아사쿠사·우에노 가성비 호텔", type: "가성비", price: 10000, share: 24, rating: 4.0, note: "공항(나리타) 접근 편리" },
      { name: "시부야 디자인 호텔", type: "부티크", price: 22000, share: 18, rating: 4.4, note: "쇼핑·야경 위주 여행에 인기" },
      { name: "긴자·도쿄역 4성급 호텔", type: "4성급", price: 32000, share: 14, rating: 4.6, note: "신칸센 이동 계획 있으면 추천" },
      { name: "게스트하우스/캡슐", type: "저예산", price: 5000, share: 10, rating: 3.8, note: "1인 여행자 선호" },
    ],
    daily: { food: 5000, transport: 1200, misc: 2000 },
    attractions: [
      { name: "시부야 스카이 전망대", cost: 2500 },
      { name: "팀랩 플래닛", cost: 3800 },
      { name: "디즈니랜드/디즈니씨", cost: 9400 },
      { name: "아사쿠사 센소지", cost: 0 },
      { name: "하코네 당일치기(프리패스)", cost: 6100 },
    ],
    tips: [
      "Suica/PASMO 교통카드를 아이폰·갤럭시(일부) 지갑에 등록하면 충전·환승이 편합니다.",
      "나리타보다 하네다 도착편이 도심까지 30~40분 빨라 짧은 일정에 유리합니다.",
      "편의점 ATM(세븐은행)에서 트래블카드 출금 시 수수료가 거의 없습니다.",
      "인기 레스토랑·팀랩은 2~4주 전 온라인 예약이 필수에 가깝습니다.",
    ],
  },
  {
    id: "osaka", name: "오사카", country: "일본", flag: "🇯🇵", currency: "JPY",
    flight: { low: 200000, avg: 300000, high: 480000, hours: "1시간 50분" },
    bestMonths: [3, 4, 10, 11], peakMonths: [1, 8, 12],
    hotels: [
      { name: "난바·도톤보리 비즈니스호텔", type: "비즈니스", price: 12000, share: 41, rating: 4.2, note: "먹거리·쇼핑 도보권, 압도적 선호" },
      { name: "우메다 4성급 호텔", type: "4성급", price: 25000, share: 20, rating: 4.5, note: "교토·고베 이동 편리" },
      { name: "신사이바시 부티크 호텔", type: "부티크", price: 16000, share: 19, rating: 4.3, note: "커플 여행 선호" },
      { name: "USJ 주변 오피셜 호텔", type: "테마", price: 28000, share: 12, rating: 4.4, note: "유니버설 아침 입장에 유리" },
      { name: "덴노지 가성비 숙소", type: "가성비", price: 8000, share: 8, rating: 3.9, note: "간사이공항 라피트 접근" },
    ],
    daily: { food: 4500, transport: 1000, misc: 1800 },
    attractions: [
      { name: "유니버설 스튜디오 재팬", cost: 9800 },
      { name: "오사카성 천수각", cost: 1200 },
      { name: "교토 당일치기 교통", cost: 1600 },
      { name: "우메다 공중정원", cost: 2000 },
      { name: "나라 사슴공원", cost: 1400 },
    ],
    tips: [
      "USJ는 익스프레스 패스가 매진되기 쉬우니 일정 확정 즉시 구매하세요.",
      "간사이공항↔난바는 라피트 왕복 할인권을 한국에서 미리 사면 저렴합니다.",
      "교토·나라를 넣는다면 숙소는 난바보다 우메다가 이동 효율이 좋습니다.",
    ],
  },
  {
    id: "fukuoka", name: "후쿠오카", country: "일본", flag: "🇯🇵", currency: "JPY",
    flight: { low: 150000, avg: 230000, high: 380000, hours: "1시간 20분" },
    bestMonths: [3, 4, 5, 10, 11], peakMonths: [1, 8],
    hotels: [
      { name: "하카타역 비즈니스호텔", type: "비즈니스", price: 11000, share: 45, rating: 4.2, note: "공항 지하철 2정거장, 최다 선택" },
      { name: "텐진 부티크 호텔", type: "부티크", price: 14000, share: 27, rating: 4.3, note: "쇼핑·야타이 접근성" },
      { name: "나카스 강변 호텔", type: "4성급", price: 20000, share: 16, rating: 4.4, note: "야경 뷰" },
      { name: "유후인 료칸(1박)", type: "료칸", price: 40000, share: 12, rating: 4.7, note: "온천 일정 1박 추가 인기" },
    ],
    daily: { food: 4000, transport: 800, misc: 1500 },
    attractions: [
      { name: "다자이후 텐만구", cost: 0 },
      { name: "유후인 왕복 버스", cost: 6000 },
      { name: "후쿠오카 타워", cost: 1000 },
      { name: "나카스 야타이 투어", cost: 3000 },
    ],
    tips: [
      "공항이 도심과 매우 가까워 금요일 저녁 출발 2박 3일도 충분합니다.",
      "유후인·벳푸를 가려면 '산큐패스'가 버스비를 크게 줄여줍니다.",
    ],
  },
  {
    id: "bangkok", name: "방콕", country: "태국", flag: "🇹🇭", currency: "THB",
    flight: { low: 300000, avg: 450000, high: 700000, hours: "5시간 50분" },
    bestMonths: [11, 12, 1, 2], peakMonths: [12, 1],
    hotels: [
      { name: "수쿰빗 4성급 호텔", type: "4성급", price: 2500, share: 38, rating: 4.4, note: "BTS 역세권, 루프탑 수영장" },
      { name: "짜오프라야 강변 5성급", type: "5성급", price: 6000, share: 22, rating: 4.7, note: "가성비 럭셔리로 인기" },
      { name: "실롬 비즈니스호텔", type: "비즈니스", price: 1600, share: 20, rating: 4.1, note: "야시장·마사지 접근" },
      { name: "카오산 게스트하우스", type: "저예산", price: 600, share: 12, rating: 3.8, note: "배낭여행자 선호" },
      { name: "시암 쇼핑가 레지던스", type: "레지던스", price: 2200, share: 8, rating: 4.3, note: "가족 여행" },
    ],
    daily: { food: 800, transport: 300, misc: 500 },
    attractions: [
      { name: "왕궁 & 왓프라깨우", cost: 500 },
      { name: "왓아룬", cost: 200 },
      { name: "마하나콘 스카이워크", cost: 1100 },
      { name: "타이 마사지 2시간", cost: 600 },
      { name: "담넌사두악 수상시장 투어", cost: 1200 },
    ],
    tips: [
      "택시 대신 Grab/Bolt 앱을 쓰면 바가지 걱정이 없습니다.",
      "왕궁은 민소매·반바지 입장 불가, 오전 일찍 가야 덜 덥고 덜 붐빕니다.",
      "환전은 한국에서 달러로 바꾼 뒤 현지 '슈퍼리치'에서 바트로 바꾸면 유리합니다.",
    ],
  },
  {
    id: "danang", name: "다낭", country: "베트남", flag: "🇻🇳", currency: "VND",
    flight: { low: 250000, avg: 380000, high: 600000, hours: "4시간 30분" },
    bestMonths: [2, 3, 4, 5], peakMonths: [7, 8, 12, 1],
    hotels: [
      { name: "미케비치 오션뷰 호텔", type: "4성급", price: 1300000, share: 40, rating: 4.4, note: "해변 앞, 가장 많이 선택" },
      { name: "풀빌라 리조트", type: "리조트", price: 4500000, share: 25, rating: 4.7, note: "가족·신혼 선호" },
      { name: "한시장 주변 시내 호텔", type: "비즈니스", price: 700000, share: 20, rating: 4.1, note: "시내 관광·마사지 편리" },
      { name: "호이안 올드타운 부티크", type: "부티크", price: 1100000, share: 15, rating: 4.5, note: "1~2박 나눠 묵는 경우 많음" },
    ],
    daily: { food: 400000, transport: 150000, misc: 200000 },
    attractions: [
      { name: "바나힐 & 골든브릿지", cost: 900000 },
      { name: "호이안 올드타운 입장", cost: 120000 },
      { name: "오행산(마블마운틴)", cost: 40000 },
      { name: "스파·마사지 90분", cost: 500000 },
    ],
    tips: [
      "Grab 이용 시 호이안까지 편도 약 30~40만동으로 투어보다 저렴할 수 있습니다.",
      "9~12월은 우기라 일정에 실내 활동을 섞는 것이 좋습니다.",
      "한국 원화도 한시장 금은방에서 환전 가능하지만 소액 달러가 가장 편합니다.",
    ],
  },
  {
    id: "taipei", name: "타이베이", country: "대만", flag: "🇹🇼", currency: "TWD",
    flight: { low: 220000, avg: 330000, high: 520000, hours: "2시간 30분" },
    bestMonths: [3, 4, 10, 11, 12], peakMonths: [1, 2, 7],
    hotels: [
      { name: "시먼딩 비즈니스호텔", type: "비즈니스", price: 2800, share: 37, rating: 4.2, note: "먹거리·쇼핑 중심, 최다 선택" },
      { name: "타이베이역 4성급", type: "4성급", price: 4500, share: 28, rating: 4.4, note: "공항철도·지우펀 버스 편리" },
      { name: "신의구 럭셔리 호텔", type: "5성급", price: 8000, share: 15, rating: 4.7, note: "101타워 뷰" },
      { name: "중산 부티크 호텔", type: "부티크", price: 3500, share: 20, rating: 4.3, note: "카페 투어 선호" },
    ],
    daily: { food: 900, transport: 200, misc: 400 },
    attractions: [
      { name: "타이베이 101 전망대", cost: 600 },
      { name: "예스진지 버스투어", cost: 1300 },
      { name: "고궁박물원", cost: 350 },
      { name: "베이터우 온천", cost: 500 },
    ],
    tips: [
      "이지카드 하나로 지하철·버스·편의점 결제가 모두 됩니다.",
      "예스진지(예류·스펀·진과스·지우펀)는 투어가 개별 이동보다 시간 효율이 좋습니다.",
    ],
  },
  {
    id: "bali", name: "발리", country: "인도네시아", flag: "🇮🇩", currency: "IDR",
    flight: { low: 500000, avg: 750000, high: 1100000, hours: "7시간" },
    bestMonths: [5, 6, 7, 8, 9], peakMonths: [7, 8, 12],
    hotels: [
      { name: "스미냑 풀빌라", type: "풀빌라", price: 2500000, share: 35, rating: 4.6, note: "프라이빗 풀, 신혼 1순위" },
      { name: "우붓 정글뷰 리조트", type: "리조트", price: 2000000, share: 28, rating: 4.7, note: "2~3박 나눠 묵기 인기" },
      { name: "누사두아 5성급 리조트", type: "5성급", price: 3500000, share: 20, rating: 4.6, note: "가족·조용한 해변" },
      { name: "꾸따 가성비 호텔", type: "가성비", price: 600000, share: 17, rating: 4.0, note: "공항 근처, 서핑" },
    ],
    daily: { food: 400000, transport: 300000, misc: 200000 },
    attractions: [
      { name: "우붓 몽키포레스트", cost: 100000 },
      { name: "뜨갈랄랑 계단식 논", cost: 50000 },
      { name: "울루와뚜 사원 & 께짝댄스", cost: 200000 },
      { name: "누사페니다 데이투어", cost: 900000 },
    ],
    tips: [
      "입국 시 관광세(15만 루피아)와 비자(VoA)를 온라인으로 미리 결제하면 줄이 짧습니다.",
      "지역 간 이동이 오래 걸려 '하루 운전기사 대절'이 가장 효율적입니다.",
    ],
  },
  {
    id: "singapore", name: "싱가포르", country: "싱가포르", flag: "🇸🇬", currency: "SGD",
    flight: { low: 450000, avg: 650000, high: 950000, hours: "6시간 20분" },
    bestMonths: [2, 3, 4, 7, 8], peakMonths: [12, 1],
    hotels: [
      { name: "마리나베이 럭셔리 호텔", type: "5성급", price: 650, share: 30, rating: 4.7, note: "인피니티 풀 상징성" },
      { name: "부기스 비즈니스호텔", type: "비즈니스", price: 220, share: 32, rating: 4.2, note: "MRT 편리, 가성비 최다 선택" },
      { name: "센토사 리조트", type: "리조트", price: 380, share: 22, rating: 4.5, note: "가족 여행" },
      { name: "차이나타운 부티크", type: "부티크", price: 250, share: 16, rating: 4.3, note: "호커센터 접근" },
    ],
    daily: { food: 60, transport: 15, misc: 30 },
    attractions: [
      { name: "가든스 바이 더 베이", cost: 53 },
      { name: "유니버설 스튜디오 싱가포르", cost: 83 },
      { name: "나이트 사파리", cost: 56 },
      { name: "마리나베이샌즈 전망대", cost: 32 },
    ],
    tips: [
      "교통카드 없이 해외결제 가능한 신용·체크카드 터치로 MRT 탑승 가능합니다.",
      "식비는 호커센터를 활용하면 1/3 수준으로 줄일 수 있습니다.",
    ],
  },
  {
    id: "paris", name: "파리", country: "프랑스", flag: "🇫🇷", currency: "EUR",
    flight: { low: 1100000, avg: 1500000, high: 2300000, hours: "14시간" },
    bestMonths: [5, 6, 9, 10], peakMonths: [7, 8],
    hotels: [
      { name: "마레 지구 부티크 호텔", type: "부티크", price: 210, share: 30, rating: 4.4, note: "도보 관광 중심지" },
      { name: "에펠탑 뷰 4성급", type: "4성급", price: 320, share: 22, rating: 4.5, note: "신혼여행 선호" },
      { name: "오페라·루브르 근처 호텔", type: "비즈니스", price: 180, share: 28, rating: 4.2, note: "공항버스·쇼핑 편리" },
      { name: "에어비앤비 아파트", type: "레지던스", price: 150, share: 20, rating: 4.3, note: "장기·가족 여행" },
    ],
    daily: { food: 60, transport: 12, misc: 25 },
    attractions: [
      { name: "루브르 박물관", cost: 22 },
      { name: "에펠탑 정상", cost: 36 },
      { name: "베르사유 궁전", cost: 32 },
      { name: "센강 유람선", cost: 18 },
      { name: "오르세 미술관", cost: 16 },
    ],
    tips: [
      "박물관을 3곳 이상 간다면 '파리 뮤지엄 패스'가 저렴하고 줄도 줄여줍니다.",
      "루브르·에펠탑은 공식 사이트 시간지정 예약이 필수입니다.",
      "직항보다 1회 경유편이 20~40만원 저렴한 경우가 많습니다.",
    ],
  },
  {
    id: "newyork", name: "뉴욕", country: "미국", flag: "🇺🇸", currency: "USD",
    flight: { low: 1300000, avg: 1800000, high: 2600000, hours: "14시간 30분" },
    bestMonths: [4, 5, 9, 10], peakMonths: [7, 8, 12],
    hotels: [
      { name: "미드타운 맨해튼 4성급", type: "4성급", price: 330, share: 40, rating: 4.3, note: "타임스스퀘어 도보권, 최다 선택" },
      { name: "로어 맨해튼 부티크", type: "부티크", price: 290, share: 22, rating: 4.4, note: "소호·월스트리트" },
      { name: "롱아일랜드시티 호텔", type: "가성비", price: 190, share: 24, rating: 4.1, note: "지하철 1~2정거장, 30% 저렴" },
      { name: "센트럴파크 럭셔리", type: "5성급", price: 650, share: 14, rating: 4.7, note: "특별한 여행" },
    ],
    daily: { food: 90, transport: 15, misc: 40 },
    attractions: [
      { name: "엠파이어스테이트 빌딩", cost: 48 },
      { name: "서밋 원 밴더빌트", cost: 45 },
      { name: "브로드웨이 뮤지컬", cost: 150 },
      { name: "자유의 여신상 페리", cost: 25 },
      { name: "MoMA", cost: 30 },
    ],
    tips: [
      "지하철은 OMNY(카드 터치)로 주 12회 이상 타면 자동으로 무제한 요금이 적용됩니다.",
      "전망대·박물관 여러 곳이면 '시티패스/고시티 패스'를 비교해 보세요.",
      "호텔 요금에 '리조트피'와 세금(약 15%)이 별도로 붙는지 확인하세요.",
    ],
  },
];

// 모든 여행지에 공통으로 적용되는 효율 팁
const GENERAL_TIPS = [
  { icon: "✈️", title: "항공권은 화·수·목 출발이 저렴", body: "주말 출발 대비 평균 10~20% 저렴한 경우가 많습니다. 가격 비교 사이트의 '유연한 날짜' 기능을 써보세요." },
  { icon: "📅", title: "예약 타이밍", body: "단거리(일본·동남아)는 1~2개월 전, 장거리(유럽·미주)는 3~5개월 전 예약이 보통 가장 저렴합니다." },
  { icon: "💱", title: "환전보다 트래블카드", body: "트래블 체크카드는 환전 수수료 면제·우대가 많아 소액 현금만 환전하고 나머지는 카드 결제가 유리합니다." },
  { icon: "🏨", title: "숙소는 '무료 취소' 선예약", body: "무료 취소 가능 요금으로 먼저 잡아두고, 가격이 내려가면 다시 예약하는 방식이 손해가 없습니다." },
  { icon: "🔔", title: "가격 알림 설정", body: "항공권 가격 알림을 켜두면 특가를 놓치지 않습니다. 이 사이트의 '저장한 계획'에서 환율 변동도 확인하세요." },
  { icon: "📶", title: "eSIM 미리 준비", body: "공항 로밍보다 eSIM이 훨씬 저렴하고 도착하자마자 바로 사용할 수 있습니다." },
];
