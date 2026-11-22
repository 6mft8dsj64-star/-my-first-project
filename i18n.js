/* 트립노트 — 언어·테마·표시 통화 설정과 번역 사전
   <head>에서 먼저 실행돼 테마를 바로 적용합니다(화면 깜빡임 방지). */
(() => {
  "use strict";

  const S = {
    ko: {
      // 공통
      "doc.title": "트립노트 · 여행 계획",
      brand: "✈️ 트립노트", approx: "약", free: "무료", remove: "삭제", close: "닫기",
      "visa.label": "한국 여권 기준",
      // 헤더·내비
      "nav.dest": "여행지", "nav.plan": "계획짜기", "nav.rates": "환율", "nav.saved": "저장한 계획", "nav.tips": "여행 팁",
      "ticker.loading": "환율 불러오는 중…",
      "hero.title": "여행 계획, <span class=\"accent\">가격까지 한 번에</span>",
      "hero.sub": "여행지를 고르면 항공권 시세·인기 숙소·관광지 비용이 바로 보이고,<br class=\"hide-sm\" /> 일정을 짜는 동안 <b>오늘 환율</b>로 총 경비가 실시간 계산됩니다.",
      // 1. 여행지
      "sec.dest": "1. 어디로 갈까요? <small>지역 → 나라 → 도시 순서로 골라주세요</small>",
      "pick.search": "🔍 도시·나라 이름으로 바로 찾기 (예: 다낭, 스위스)",
      "step.region": "① 지역", "step.country": "② 나라", "step.city": "③ 도시",
      "pick.current": "현재 선택", "pick.results": "\"{q}\" 검색 결과 {n}곳", "pick.none": "검색 결과가 없어요",
      "pick.cityHead": "{c}의 도시를 골라주세요",
      "country.cities": "{n}개 도시", "country.from": "{p}~", "country.direct": "{a} 출발 직항",
      "city.airlines": "{n}개 항공사", "city.rt": "왕복 약",
      "season.best": "{m} 추천", "season.peak": "{m} 성수기", "season.off": "{m} 비수기",
      "route.direct": "직항", "route.transfer": "인천 출발 직항", "route.via": "경유",
      // 2. 계획
      "sec.plan": "2. 계획 짜기",
      "info.flight": "비행", "info.currency": "통화", "info.estimate": "숙소·관광지 비용은 물가 기준 추정",
      "info.fare": "항공권 시세(1인 왕복)", "info.topHotel": "가장 많이 고른 숙소", "info.daily": "하루 생활비(1인)", "info.rate": "오늘 환율",
      "info.legend": "초록 = 날씨 좋은 추천 시즌 · 주황 = 성수기(항공·숙소 가격 상승)",
      "card.basic": "📅 기본 정보", "dep.label": "출발 공항", "dep.intl": "국제선 공항", "dep.dom": "국내선 공항 (환승 필요)",
      "date.start": "출발일", "date.end": "귀국일", "people": "인원", "date.dminus": "출발까지 D-{n}",
      "trip.len": "{n}박 {d}일", "unit.people": "{n}명",
      "card.route": "✈️ 가는 방법 · 항공사 <span class=\"sub\">1인 왕복</span>",
      "route.transferMsg": "{a}에서는 직항이 없어요. <b>인천</b>으로 이동({how}) 후 직항 이용:",
      "route.viaMsg": "한국에서 직항이 없어요. 아래 항공사로 경유하는 게 일반적이에요:",
      "route.viaFrom": "한국에서 직항이 없어요. 인천까지 이동({how}) 후 아래 항공사로 경유하는 게 일반적이에요:",
      "route.sib": "또는 같은 나라 <b>{c}</b>까지 직항 후 현지 교통으로 이동:", "route.see": "{c} 보기",
      "route.others": "다른 곳에서 바로 가기",
      "route.legend": "🟦 국내 대형항공사 🟩 국내 저비용항공사 ⬜ 외국 항공사 · 노선은 시즌별로 바뀌니 예약 전 확인하세요.",
      "route.myPrices": "내가 기록한 가격",
      "fare.my": "내가 찾은 가격(1인)", "fare.low": "최저", "fare.avg": "평균", "fare.high": "성수기", "fare.mine": "내 가격",
      "fare.isAvg": "평균 시세로 계산 중입니다. 실제로 찾은 가격을 입력하면 더 정확해져요.",
      "fare.cheaper": "평균보다 1인 {p} 저렴해요 👍", "fare.pricier": "평균보다 1인 {p} 비싸요. 날짜를 바꾸거나 경유편을 비교해 보세요.",
      "card.hotel": "🏨 숙소 <span class=\"sub\">여행자들이 많이 고른 순 · 1박 1실</span>", "rooms": "객실 수",
      "hotel.top": "최다 선택", "hotel.share": "여행자 {n}%가 선택", "hotel.night": "박",
      "card.days": "🗺️ 일자별 일정", "day.depart": "출국일", "day.return": "귀국일", "day.n": "{n}일차",
      "day.empty": "아직 일정이 없어요", "day.add": "+ 관광지 추가",
      "card.daily": "🍜 현지 생활비 <span class=\"sub\">식비·교통·기타, 1인 1일</span>",
      "level.save": "절약", "level.normal": "보통", "level.comfort": "여유",
      "daily.hint": "1인 1일 기준 식비 {f} · 교통 {t} · 기타 {m}",
      "card.extra": "🧾 기타 비용", "extra.ph": "예: 여행자보험, eSIM, 쇼핑", "extra.amount": "금액", "add": "추가",
      "card.suggest": "💡 이렇게 하면 더 효율적이에요",
      // 요약
      "sum.label": "{c} {len} · {p}명 예상 총 경비", "sum.per": "1인당 약 {p}", "sum.local": "현지통화 지출 {p}",
      "sum.vsY": "어제 환율 기준 대비", "sum.nochange": "변동 없음", "sum.sens": "환율이 1% 오르면 약 {p} 더 들어요",
      "sum.noY": "어제 환율 데이터가 없어 변동을 계산할 수 없어요. 내일 다시 오면 비교돼요.",
      "sum.planName": "계획 이름", "sum.save": "이 계획 저장하기", "sum.source": "환율 출처: {s}",
      "sum.offline": "⚠️ 실시간 환율을 불러오지 못해 기본 환율로 계산 중",
      "item.flight": "항공권", "item.hotel": "숙소", "item.attr": "관광·입장료", "item.daily": "현지 생활비", "item.extra": "기타",
      "note.hotel": "{n}박 × {r}실", "note.attr": "{n}곳 × {p}명", "note.daily": "{n}일 × {p}명", "note.extra": "{n}건",
      // 제안
      "sg.weekend": "<b>{d}요일 출발</b>은 항공권이 비싼 편이에요. 화~목 출발로 옮기면 약 <b>{p}</b> 절약할 수 있어요.",
      "sg.weekday": "{d}요일 출발은 항공권이 저렴한 요일이에요 👍",
      "sg.peak": "{m}은 {c} <b>성수기</b>예요. 숙소를 최대한 빨리 예약하고, 가능하면 {alt}을 고려해 보세요.",
      "sg.best": "{m}은 {c} 여행하기 가장 좋은 시즌이에요. 인기 일정이니 예약은 서둘러 주세요.",
      "sg.off": "{m}은 비수기라 항공·숙소가 저렴한 대신 날씨를 한 번 확인하세요.",
      "sg.long": "장거리", "sg.short": "단거리",
      "sg.late": "출발까지 <b>{n}일</b> 남았어요. {kind} 노선은 보통 {lo}~{hi}일 전이 가장 저렴하니 항공권부터 바로 예약하세요.",
      "sg.early": "출발까지 {n}일 남았어요. 가격 알림을 켜두고 출발 {hi}일 전쯤부터 집중적으로 비교하면 좋아요.",
      "sg.ontime": "지금(출발 {n}일 전)이 항공권 예약하기 좋은 타이밍이에요.",
      "sg.fare": "입력한 항공권이 평균보다 {n}% 비싸요. 1회 경유편이나 인근 공항 도착편도 비교해 보세요.",
      "sg.hotel": "여행자들이 가장 많이 고른 숙소는 <b>{h}</b>({n}%)예요.", "sg.hotelSave": "바꾸면 약 <b>{p}</b> 절약돼요.",
      "sg.rooms": "{p}명에 객실 {r}개는 부족할 수 있어요. 객실 수를 확인해 주세요.",
      "sg.empty": "{d}일차가 비어 있어요. 추천: <b>{a}</b>",
      "sg.packed": "{d}일차에 일정이 4개 이상이에요. 이동 시간을 고려해 나눠 보세요.",
      "sg.edge": "출국일·귀국일은 공항 이동 때문에 일정을 1~2개로 가볍게 잡는 게 좋아요.",
      "sg.rateLow": "{c} 환율이 최근 한 달 중 <b>저렴한 편</b>이에요. 지금 환전하거나 트래블카드에 미리 충전해 두면 유리해요.",
      "sg.rateHigh": "{c} 환율이 최근 한 달 중 <b>높은 편</b>이에요. 여러 번 나눠 환전(분할 환전)하면 위험을 줄일 수 있어요.",
      "sg.rateMid": "{c} 환율은 최근 한 달 평균 수준이에요.",
      "sg.rateUp": "어제보다 {c} 가치가 {n}% 올랐어요.", "sg.rateDown": "어제보다 {c} 가치가 {n}% 내렸어요.",
      "sg.big": "가장 큰 지출은 <b>{k}</b>({n}%)이에요. 여기부터 줄이면 효과가 커요.",
      // 3. 환율
      "sec.rates": "3. 실시간 환율", "rates.base": "기준 통화: {c}",
      "rates.note": "환율은 브라우저에서 공개 환율 API로 매번 새로 불러옵니다. 어제 대비 변동은 최근 영업일 기준 환율과 비교한 값입니다.",
      "rates.fewer": "주요 통화만 보기", "rates.all": "전체 {n}개 통화 보기", "rates.noY": "어제 데이터 없음", "rates.vsY": "어제 대비",
      "rates.collect": "추이 데이터 수집 중", "rates.low": "🟢 최근 한 달 중 저렴한 편", "rates.high": "🔴 최근 한 달 중 비싼 편", "rates.mid": "⚪ 최근 한 달 평균 수준",
      "rates.krwNote": "원화로 결제하는 항공권 가격에 영향을 줘요",
      "rates.updated": "{d} 기준", "rates.checked": "{d} 확인", "rates.offline": "실시간 환율을 불러오지 못해 기본값 표시 중",
      // 4. 저장
      "sec.saved": "4. 저장한 계획 <small>저장한 날 vs 오늘 환율 가격 비교</small>",
      "saved.empty": "아직 저장한 계획이 없어요. 계획을 짜고 <b>이 계획 저장하기</b>를 눌러보세요.",
      "saved.meta": "{d} 저장 ({n}일 전) · {p}명", "saved.then": "저장 당시", "saved.now": "오늘 환율", "saved.load": "불러오기", "saved.del": "삭제",
      // 5. 팁
      "sec.tips": "5. 효율적인 여행 팁", "tips.local": "{c} 현지 꿀팁",
      "footer.note": "항공권·숙소·관광지 가격과 선호도, 항공 노선, 비자 정보는 공개 정보 기반의 <b>참고용 추정치</b>이며 실제 예약가와 다를 수 있습니다. 환율 제공: open.er-api.com, frankfurter.app",
      "footer.privacy": "개인정보처리방침",
      // 토스트
      "toast.saved": "계획을 저장했어요. 매일 환율에 따른 가격 변동을 확인할 수 있어요!", "toast.loaded": "계획을 불러왔어요",
      "toast.extraNeed": "항목 이름과 금액을 입력해 주세요", "toast.rates": "오늘 환율을 반영했어요", "toast.cur": "가격을 {c}(으)로 표시해요",
      // 설정
      "set.title": "설정", "set.theme": "화면 테마", "theme.system": "시스템", "theme.light": "라이트", "theme.dark": "다크",
      "set.lang": "언어", "set.cur": "가격 표시 통화",
      "set.curNote": "모든 가격을 고른 통화로 바꿔서 보여줘요. 실시간 환율로 계산해요.",
      // 로그인
      "auth.lead": "로그인하면 내 여행 계획과 저장한 가격 기록이<br />어느 기기에서든 그대로 따라와요.",
      "auth.notice": "아직 로그인 서버가 연결되지 않았어요. 관리자가 Firebase 설정을 마치면 로그인할 수 있어요. 지금은 <b>로그인 없이 둘러보기</b>로 이용해 주세요.",
      "auth.google": "Google로 계속하기", "auth.apple": "Apple로 계속하기", "auth.or": "또는 이메일",
      "auth.title.login": "로그인", "auth.title.signup": "회원가입", "auth.title.reset": "비밀번호 재설정",
      "auth.submit.login": "이메일로 로그인", "auth.submit.signup": "가입하기", "auth.submit.reset": "재설정 메일 보내기",
      "auth.name": "이름", "auth.namePh": "홍길동", "auth.email": "이메일", "auth.pw": "비밀번호", "auth.pwPh": "6자 이상", "auth.pw2": "비밀번호 확인",
      "auth.toSignup": "처음이신가요? 회원가입", "auth.toLogin": "이미 계정이 있어요 · 로그인", "auth.toReset": "비밀번호를 잊었어요",
      "auth.guest": "로그인 없이 둘러보기 →",
      "auth.fine1": "둘러보기 중 만든 계획은 이 브라우저에만 저장되고, 나중에 로그인하면 내 계정으로 옮겨져요.",
      "auth.fine2": "로그인·가입하면 <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">개인정보처리방침</a>에 따라 정보가 처리돼요. 만 14세 미만은 가입할 수 없어요.",
      "auth.login": "로그인", "auth.logout": "로그아웃", "auth.traveler": "여행자", "auth.myAccount": "내 계정",
      "auth.resetSent": "비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.", "auth.pwMismatch": "비밀번호가 서로 달라요.",
      "auth.welcome": "가입을 환영해요! 인증 메일을 보냈어요.", "auth.sdkFail": "로그인 서비스를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.",
      "sync.saved": "☁️ 저장됨", "sync.saving": "저장 중…", "sync.fail": "⚠️ 클라우드 저장 실패",
      "err.generic": "로그인 중 문제가 생겼어요. ({c})",
      "err.auth/invalid-email": "이메일 형식이 올바르지 않아요.", "err.auth/missing-password": "비밀번호를 입력해 주세요.",
      "err.auth/weak-password": "비밀번호는 6자 이상이어야 해요.", "err.auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
      "err.auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.", "err.auth/wrong-password": "이메일 또는 비밀번호가 맞지 않아요.",
      "err.auth/user-not-found": "가입되지 않은 이메일이에요.", "err.auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
      "err.auth/popup-closed-by-user": "로그인 창이 닫혔어요. 다시 시도해 주세요.", "err.auth/cancelled-popup-request": "",
      "err.auth/popup-blocked": "로그인 창(팝업)이 차단됐어요. 아이폰은 설정 → Safari → ‘팝업 차단’을 끄고 다시 눌러 주세요.",
      "err.auth/operation-not-supported-in-this-environment": "이 브라우저에서는 로그인 창을 열 수 없어요. 사파리나 크롬 앱에서 열어 주세요.",
      "err.auth/web-storage-unsupported": "브라우저 저장소가 막혀 있어요. 개인정보 보호(비공개) 모드를 끄고 다시 시도해 주세요.",
      "err.auth/internal-error": "로그인 중 문제가 생겼어요. 사파리 설정에서 ‘크로스 사이트 추적 방지’를 잠시 끄고 다시 시도해 주세요.",
      "err.auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
      "err.auth/operation-not-allowed": "이 로그인 방식이 아직 켜져 있지 않아요. (Firebase 콘솔에서 사용 설정 필요)",
      "err.auth/unauthorized-domain": "이 주소에서는 로그인이 허용되지 않았어요. (Firebase 승인된 도메인에 추가 필요)",
      "err.auth/account-exists-with-different-credential": "같은 이메일로 다른 방식(구글/애플/이메일) 가입 기록이 있어요. 그 방식으로 로그인해 주세요.",
      // 내 계정·탈퇴
      "acc.title": "내 계정", "acc.privacy": "개인정보처리방침", "acc.delete": "회원 탈퇴",
      "acc.with.google": "Google 계정으로 로그인 중", "acc.with.apple": "Apple 계정으로 로그인 중", "acc.with.email": "이메일로 로그인 중",
      "del.title": "회원 탈퇴", "del.warn": "탈퇴하면 계정과 저장한 여행 계획, 가격 기록이 <b>모두 바로 삭제</b>되고 되돌릴 수 없어요.",
      "del.pw": "본인 확인을 위해 비밀번호를 입력해 주세요", "del.socialHint": "본인 확인을 위해 로그인 창이 한 번 더 열려요.",
      "del.googleHint": "본인 확인을 위해 아래 버튼으로 같은 Google 계정을 한 번 더 골라 주세요.", "del.googleOk": "✓ 본인 확인이 끝났어요.",
      "del.word": "탈퇴", "del.confirm": "확인을 위해 <b>탈퇴</b>라고 입력해 주세요", "del.submit": "계정 영구 삭제", "del.cancel": "취소",
      "del.needWord": "확인 칸에 ‘탈퇴’라고 정확히 입력해 주세요.", "del.needPw": "비밀번호를 입력해 주세요.", "del.deleting": "삭제하는 중이에요…",
      "del.done": "탈퇴가 완료됐어요. 그동안 이용해 주셔서 고마워요.", "del.needGoogle": "먼저 Google 버튼으로 본인 확인을 해 주세요.",
      "del.wrongPw": "비밀번호가 맞지 않아요.", "del.popupClosed": "본인 확인 창이 닫혔어요. 다시 시도해 주세요.",
      "del.popupBlocked": "팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.",
      "del.mismatch": "지금 로그인한 계정과 다른 계정을 골랐어요. 같은 계정으로 확인해 주세요.",
      "del.gMismatch": "지금 로그인한 계정과 다른 Google 계정을 골랐어요.", "del.gFail": "본인 확인에 실패했어요. ({c})",
      "del.generic": "탈퇴 중 문제가 생겼어요. ({c})",
      "nav.contact": "문의",
      "footer.contact": "문의하기",
      "sync.loading": "불러오는 중…",
      "contact.title": "문의하기",
      "contact.lead": "불편한 점, 오류, 바라는 기능을 알려 주세요. 보낸 내용은 운영자만 볼 수 있어요.",
      "contact.cat": "종류",
      "contact.cat.bug": "오류 신고",
      "contact.cat.inconv": "불편한 점",
      "contact.cat.idea": "기능 제안",
      "contact.cat.data": "정보 수정 (가격·노선·비자 등)",
      "contact.cat.other": "기타",
      "contact.msg": "내용",
      "contact.msgPh": "어떤 화면에서 무엇을 하다가 어떤 문제가 있었는지 적어 주세요.",
      "contact.email": "답변받을 이메일 (선택)",
      "contact.privacy": "답변을 위해서만 이메일을 받고, 문의 처리 후 1년 안에 삭제해요. <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">개인정보처리방침</a>",
      "contact.send": "보내기",
      "contact.sending": "보내는 중…",
      "contact.sent": "문의를 보냈어요. 고마워요! 확인 후 답변드릴게요.",
      "contact.needMsg": "내용을 입력해 주세요.",
      "contact.tooLong": "내용은 2,000자까지 쓸 수 있어요.",
      "contact.wait": "방금 보냈어요. 30초 뒤에 다시 보내 주세요.",
      "contact.fail": "보내지 못했어요. 잠시 후 다시 시도해 주세요. ({c})",
      "contact.offline": "문의 기능이 아직 연결되지 않았어요.",
      "inbox.btn": "📥 문의함",
      "inbox.title": "문의함",
      "inbox.empty": "아직 받은 문의가 없어요.",
      "inbox.new": "새 문의",
      "inbox.done": "처리 완료",
      "inbox.markDone": "처리 완료로 표시",
      "inbox.reopen": "다시 열기",
      "inbox.del": "삭제",
      "inbox.confirmDel": "한 번 더 누르면 삭제",
      "inbox.from": "보낸 사람",
      "inbox.guest": "비로그인 사용자",
      "inbox.noEmail": "이메일 없음",
      "inbox.count": "전체 {n}건 · 새 문의 {m}건",
      "inbox.fail": "문의함을 불러오지 못했어요. ({c})",
      "inbox.translate": "번역 보기",
    },

    en: {
      "doc.title": "TripNote · Trip planner",
      brand: "✈️ TripNote", approx: "≈", free: "Free", remove: "Remove", close: "Close",
      "visa.label": "Korean passport",
      "nav.dest": "Destinations", "nav.plan": "Plan", "nav.rates": "Rates", "nav.saved": "Saved", "nav.tips": "Tips",
      "ticker.loading": "Loading exchange rates…",
      "hero.title": "Plan your trip, <span class=\"accent\">price and all</span>",
      "hero.sub": "Pick a destination to see typical fares, popular stays and sight costs,<br class=\"hide-sm\" /> and your total updates with <b>today's exchange rates</b> as you plan.",
      "sec.dest": "1. Where to? <small>Choose a region, then a country, then a city</small>",
      "pick.search": "🔍 Search a city or country (e.g. Da Nang, Switzerland)",
      "step.region": "① Region", "step.country": "② Country", "step.city": "③ City",
      "pick.current": "Selected", "pick.results": "{n} results for \"{q}\"", "pick.none": "No results",
      "pick.cityHead": "Choose a city in {c}",
      "country.cities": "{n} cities", "country.from": "from {p}", "country.direct": "Direct from {a}",
      "city.airlines": "{n} airlines", "city.rt": "Round trip ≈",
      "season.best": "{m}: best season", "season.peak": "{m}: peak season", "season.off": "{m}: off-season",
      "route.direct": "Direct", "route.transfer": "Direct from Incheon", "route.via": "Connecting",
      "sec.plan": "2. Plan your trip",
      "info.flight": "Flight", "info.currency": "Currency", "info.estimate": "Hotel and sight costs are estimated from local prices",
      "info.fare": "Typical fare (round trip, 1 person)", "info.topHotel": "Most chosen stay", "info.daily": "Daily spend (1 person)", "info.rate": "Today's rate",
      "info.legend": "Green = best weather · Orange = peak season (higher fares and hotel rates)",
      "card.basic": "📅 Trip basics", "dep.label": "Departure airport", "dep.intl": "International airports", "dep.dom": "Domestic airports (connection needed)",
      "date.start": "Depart", "date.end": "Return", "people": "Travelers", "date.dminus": "{n} days to go",
      "trip.len": "{n} nights / {d} days", "unit.people": "{n} people",
      "card.route": "✈️ How to get there · Airlines <span class=\"sub\">round trip, 1 person</span>",
      "route.transferMsg": "No direct flights from {a}. Travel to <b>Incheon</b> ({how}) and fly direct:",
      "route.viaMsg": "No direct flights from Korea. Travelers usually connect with these airlines:",
      "route.viaFrom": "No direct flights from Korea. Travel to Incheon ({how}), then connect with these airlines:",
      "route.sib": "Or fly direct to <b>{c}</b> in the same country and continue overland:", "route.see": "See {c}",
      "route.others": "Direct from other airports",
      "route.legend": "🟦 Korean full-service · 🟩 Korean low-cost · ⬜ Foreign airline · Routes change by season, so check before booking.",
      "route.myPrices": "Prices you recorded",
      "fare.my": "Price you found (1 person)", "fare.low": "Low", "fare.avg": "Average", "fare.high": "Peak", "fare.mine": "Yours",
      "fare.isAvg": "Using the average fare. Enter a price you actually found for a more accurate total.",
      "fare.cheaper": "{p} per person below average 👍", "fare.pricier": "{p} per person above average. Try other dates or compare connecting flights.",
      "card.hotel": "🏨 Where to stay <span class=\"sub\">most chosen first · per room per night</span>", "rooms": "Rooms",
      "hotel.top": "Most chosen", "hotel.share": "Chosen by {n}% of travelers", "hotel.night": "night",
      "card.days": "🗺️ Day-by-day plan", "day.depart": "Departure", "day.return": "Return", "day.n": "Day {n}",
      "day.empty": "Nothing planned yet", "day.add": "+ Add a sight",
      "card.daily": "🍜 Daily spending <span class=\"sub\">food, transport, other · per person per day</span>",
      "level.save": "Budget", "level.normal": "Standard", "level.comfort": "Comfort",
      "daily.hint": "Per person per day: food {f} · transport {t} · other {m}",
      "card.extra": "🧾 Other costs", "extra.ph": "e.g. travel insurance, eSIM, shopping", "extra.amount": "Amount", "add": "Add",
      "card.suggest": "💡 Ways to make it better",
      "sum.label": "{c} · {len} · {p} people · estimated total", "sum.per": "≈ {p} per person", "sum.local": "Local-currency spend {p}",
      "sum.vsY": "vs. yesterday's rates", "sum.nochange": "No change", "sum.sens": "A 1% rate rise adds about {p}",
      "sum.noY": "No rates from yesterday yet, so there's nothing to compare. Come back tomorrow.",
      "sum.planName": "Plan name", "sum.save": "Save this plan", "sum.source": "Rates from {s}",
      "sum.offline": "⚠️ Couldn't load live rates — using default rates",
      "item.flight": "Flights", "item.hotel": "Stay", "item.attr": "Sights & tickets", "item.daily": "Daily spending", "item.extra": "Other",
      "note.hotel": "{n} night(s) × {r} room(s)", "note.attr": "{n} sight(s) × {p} people", "note.daily": "{n} days × {p} people", "note.extra": "{n} items",
      "sg.weekend": "<b>{d} departures</b> are usually pricier. Leaving Tue–Thu could save about <b>{p}</b>.",
      "sg.weekday": "{d} is one of the cheaper days to fly 👍",
      "sg.peak": "{m} is <b>peak season</b> in {c}. Book your stay early, or consider {alt}.",
      "sg.best": "{m} is the best season for {c}. It's popular, so book soon.",
      "sg.off": "{m} is off-season: cheaper flights and hotels, but check the weather.",
      "sg.long": "long-haul", "sg.short": "short-haul",
      "sg.late": "Only <b>{n} days</b> to go. {kind} fares are usually cheapest {lo}–{hi} days out, so book flights now.",
      "sg.early": "{n} days to go. Set a fare alert and compare seriously from about {hi} days out.",
      "sg.ontime": "Now ({n} days out) is a good time to book flights.",
      "sg.fare": "Your fare is {n}% above average. Compare one-stop flights or nearby airports.",
      "sg.hotel": "The most chosen stay is <b>{h}</b> ({n}%).", "sg.hotelSave": "Switching saves about <b>{p}</b>.",
      "sg.rooms": "{r} room(s) may not be enough for {p} people. Check the room count.",
      "sg.empty": "Day {d} is empty. Try: <b>{a}</b>",
      "sg.packed": "Day {d} has 4+ activities. Consider spreading them out for travel time.",
      "sg.edge": "Keep departure and return days light (1–2 activities) to allow for airport time.",
      "sg.rateLow": "The {c} is <b>cheap</b> compared with the last month. Exchanging now or topping up a travel card is a good idea.",
      "sg.rateHigh": "The {c} is <b>expensive</b> compared with the last month. Exchange in several smaller amounts to spread the risk.",
      "sg.rateMid": "The {c} is around its one-month average.",
      "sg.rateUp": "The {c} is {n}% stronger than yesterday.", "sg.rateDown": "The {c} is {n}% weaker than yesterday.",
      "sg.big": "Your biggest cost is <b>{k}</b> ({n}%). Cutting here makes the most difference.",
      "sec.rates": "3. Live exchange rates", "rates.base": "Base currency: {c}",
      "rates.note": "Rates are loaded fresh in your browser from public exchange-rate APIs. Daily change compares with the latest business day.",
      "rates.fewer": "Show main currencies", "rates.all": "Show all {n} currencies", "rates.noY": "No data from yesterday", "rates.vsY": "vs. yesterday",
      "rates.collect": "Collecting trend data", "rates.low": "🟢 Cheap vs. last month", "rates.high": "🔴 Expensive vs. last month", "rates.mid": "⚪ Around last month's average",
      "rates.krwNote": "Affects flights priced in Korean won",
      "rates.updated": "as of {d}", "rates.checked": "checked {d}", "rates.offline": "Couldn't load live rates — showing defaults",
      "sec.saved": "4. Saved plans <small>price when saved vs. at today's rates</small>",
      "saved.empty": "No saved plans yet. Build a plan and tap <b>Save this plan</b>.",
      "saved.meta": "Saved {d} ({n} days ago) · {p} people", "saved.then": "When saved", "saved.now": "Today's rates", "saved.load": "Open", "saved.del": "Delete",
      "sec.tips": "5. Smart travel tips", "tips.local": "{c} local tips",
      "footer.note": "Fares, hotel and sight prices, popularity, routes and visa information are <b>estimates</b> based on public information and may differ from actual prices. Rates: open.er-api.com, frankfurter.app",
      "footer.privacy": "Privacy Policy (Korean)",
      "toast.saved": "Plan saved. Check back to see how exchange rates change its price.", "toast.loaded": "Plan opened",
      "toast.extraNeed": "Enter a name and an amount", "toast.rates": "Today's rates applied", "toast.cur": "Showing prices in {c}",
      "set.title": "Settings", "set.theme": "Theme", "theme.system": "System", "theme.light": "Light", "theme.dark": "Dark",
      "set.lang": "Language", "set.cur": "Display currency",
      "set.curNote": "All prices are converted to this currency at live exchange rates.",
      "auth.lead": "Sign in and your plans and price history<br />follow you on every device.",
      "auth.notice": "Sign-in isn't connected yet. Once the site owner finishes the Firebase setup you can sign in. For now, use <b>Continue without signing in</b>.",
      "auth.google": "Continue with Google", "auth.apple": "Continue with Apple", "auth.or": "or use email",
      "auth.title.login": "Sign in", "auth.title.signup": "Create account", "auth.title.reset": "Reset password",
      "auth.submit.login": "Sign in with email", "auth.submit.signup": "Create account", "auth.submit.reset": "Send reset email",
      "auth.name": "Name", "auth.namePh": "Your name", "auth.email": "Email", "auth.pw": "Password", "auth.pwPh": "At least 6 characters", "auth.pw2": "Confirm password",
      "auth.toSignup": "New here? Create an account", "auth.toLogin": "Have an account? Sign in", "auth.toReset": "Forgot password?",
      "auth.guest": "Continue without signing in →",
      "auth.fine1": "Plans you make as a guest stay in this browser and move to your account when you sign in.",
      "auth.fine2": "Your information is handled under our <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">Privacy Policy</a> (Korean). You must be 14 or older to sign up.",
      "auth.login": "Sign in", "auth.logout": "Sign out", "auth.traveler": "Traveler", "auth.myAccount": "My account",
      "auth.resetSent": "Password reset email sent. Check your inbox.", "auth.pwMismatch": "Passwords don't match.",
      "auth.welcome": "Welcome! We sent you a verification email.", "auth.sdkFail": "Couldn't load the sign-in service. Check your connection.",
      "sync.saved": "☁️ Saved", "sync.saving": "Saving…", "sync.fail": "⚠️ Cloud save failed",
      "err.generic": "Something went wrong while signing in. ({c})",
      "err.auth/invalid-email": "That email address isn't valid.", "err.auth/missing-password": "Enter your password.",
      "err.auth/weak-password": "Passwords need at least 6 characters.", "err.auth/email-already-in-use": "This email is already registered. Please sign in.",
      "err.auth/invalid-credential": "Email or password is incorrect.", "err.auth/wrong-password": "Email or password is incorrect.",
      "err.auth/user-not-found": "No account uses this email.", "err.auth/too-many-requests": "Too many attempts. Try again in a little while.",
      "err.auth/popup-closed-by-user": "The sign-in window was closed. Try again.", "err.auth/cancelled-popup-request": "",
      "err.auth/popup-blocked": "The sign-in pop-up was blocked. On iPhone, turn off Settings → Safari → Block Pop-ups and try again.",
      "err.auth/operation-not-supported-in-this-environment": "This browser can't open the sign-in window. Open the site in Safari or Chrome.",
      "err.auth/web-storage-unsupported": "Browser storage is blocked. Turn off private browsing and try again.",
      "err.auth/internal-error": "Sign-in failed. In Safari settings, briefly turn off Prevent Cross-Site Tracking and try again.",
      "err.auth/network-request-failed": "Check your internet connection.",
      "err.auth/operation-not-allowed": "This sign-in method isn't enabled yet (enable it in the Firebase console).",
      "err.auth/unauthorized-domain": "Sign-in isn't allowed on this address (add it to Firebase authorized domains).",
      "err.auth/account-exists-with-different-credential": "This email is registered with a different method (Google/Apple/email). Sign in that way.",
      "acc.title": "My account", "acc.privacy": "Privacy Policy (Korean)", "acc.delete": "Delete account",
      "acc.with.google": "Signed in with Google", "acc.with.apple": "Signed in with Apple", "acc.with.email": "Signed in with email",
      "del.title": "Delete account", "del.warn": "Deleting your account <b>immediately and permanently removes</b> your account, saved plans and price history.",
      "del.pw": "Enter your password to confirm it's you", "del.socialHint": "A sign-in window will open once more to confirm it's you.",
      "del.googleHint": "To confirm it's you, choose the same Google account again with the button below.", "del.googleOk": "✓ Identity confirmed.",
      "del.word": "DELETE", "del.confirm": "Type <b>DELETE</b> to confirm", "del.submit": "Permanently delete account", "del.cancel": "Cancel",
      "del.needWord": "Type DELETE exactly in the confirmation box.", "del.needPw": "Enter your password.", "del.deleting": "Deleting…",
      "del.done": "Your account has been deleted. Thanks for using TripNote.", "del.needGoogle": "First confirm your identity with the Google button.",
      "del.wrongPw": "Incorrect password.", "del.popupClosed": "The confirmation window was closed. Try again.",
      "del.popupBlocked": "The pop-up was blocked. Allow pop-ups in your browser and try again.",
      "del.mismatch": "You chose a different account from the one signed in. Use the same account.",
      "del.gMismatch": "You chose a different Google account from the one signed in.", "del.gFail": "Couldn't confirm your identity. ({c})",
      "del.generic": "Something went wrong while deleting. ({c})",
      "nav.contact": "Contact",
      "footer.contact": "Contact us",
      "sync.loading": "Loading…",
      "contact.title": "Contact us",
      "contact.lead": "Tell us about anything inconvenient, errors, or features you'd like. Only the site owner can read your message.",
      "contact.cat": "Type",
      "contact.cat.bug": "Report a bug",
      "contact.cat.inconv": "Something inconvenient",
      "contact.cat.idea": "Feature idea",
      "contact.cat.data": "Fix information (prices, routes, visas…)",
      "contact.cat.other": "Other",
      "contact.msg": "Message",
      "contact.msgPh": "Tell us which screen you were on, what you were doing and what went wrong.",
      "contact.email": "Email for a reply (optional)",
      "contact.privacy": "We use your email only to reply and delete it within a year after handling your message. <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">Privacy Policy</a> (Korean)",
      "contact.send": "Send",
      "contact.sending": "Sending…",
      "contact.sent": "Message sent. Thank you! We'll get back to you after reviewing it.",
      "contact.needMsg": "Please write a message.",
      "contact.tooLong": "Messages can be up to 2,000 characters.",
      "contact.wait": "You just sent one. Please wait 30 seconds before sending again.",
      "contact.fail": "Couldn't send. Please try again shortly. ({c})",
      "contact.offline": "Contact isn't connected yet.",
      "inbox.btn": "📥 Inbox",
      "inbox.title": "Inbox",
      "inbox.empty": "No messages yet.",
      "inbox.new": "New",
      "inbox.done": "Done",
      "inbox.markDone": "Mark as done",
      "inbox.reopen": "Reopen",
      "inbox.del": "Delete",
      "inbox.confirmDel": "Tap again to delete",
      "inbox.from": "From",
      "inbox.guest": "Guest",
      "inbox.noEmail": "No email",
      "inbox.count": "{n} total · {m} new",
      "inbox.fail": "Couldn't load the inbox. ({c})",
      "inbox.translate": "Translate",
    },
  };

  // 지원 언어 (ko·en은 이 파일에, 나머지는 lang/코드.js에서 필요할 때 불러와요)
  const LANGS = [
    { code: "ko", name: "한국어", locale: "ko-KR" }, { code: "en", name: "English", locale: "en-US" },
    { code: "ja", name: "日本語", locale: "ja-JP" }, { code: "zh-CN", name: "简体中文", locale: "zh-CN" },
    { code: "zh-TW", name: "繁體中文", locale: "zh-TW" }, { code: "es", name: "Español", locale: "es-ES" },
    { code: "fr", name: "Français", locale: "fr-FR" }, { code: "de", name: "Deutsch", locale: "de-DE" },
    { code: "it", name: "Italiano", locale: "it-IT" }, { code: "pt", name: "Português", locale: "pt-BR" },
    { code: "vi", name: "Tiếng Việt", locale: "vi-VN" }, { code: "th", name: "ไทย", locale: "th-TH" },
    { code: "id", name: "Bahasa Indonesia", locale: "id-ID" }, { code: "tr", name: "Türkçe", locale: "tr-TR" },
  ];
  const VERSION = "20261122e";
  const isLang = (c) => LANGS.some((l) => l.code === c);

  // ---------- 설정 ----------
  const KEY = "tm_settings";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 무시 */ } };
  const navs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "ko"]).map((x) => x.toLowerCase());
  const nav = navs[0];
  function guessLang() {
    for (const n of navs) {
      if (n.startsWith("zh")) return /tw|hk|mo|hant/.test(n) ? "zh-TW" : "zh-CN";
      const base = n.split("-")[0];
      if (isLang(base)) return base;
    }
    return "en";
  }
  function guessCur() {
    if (nav.startsWith("ko")) return "KRW";
    if (nav.startsWith("ja")) return "JPY";
    if (nav === "zh-tw") return "TWD";
    if (nav === "zh-hk") return "HKD";
    if (nav.startsWith("zh")) return "CNY";
    if (nav.startsWith("vi")) return "VND";
    if (nav.startsWith("th")) return "THB";
    if (nav.startsWith("id")) return "IDR";
    if (nav.startsWith("tr")) return "TRY";
    const region = nav.split("-")[1];
    const byRegion = { us: "USD", gb: "GBP", au: "AUD", ca: "CAD", nz: "NZD", sg: "SGD", in: "INR", ph: "PHP", my: "MYR", th: "THB", vn: "VND", id: "IDR", ch: "CHF", se: "SEK", no: "NOK", dk: "DKK", pl: "PLN", cz: "CZK", hu: "HUF", tr: "TRY", mx: "MXN", br: "BRL", ar: "ARS", cl: "CLP", pe: "PEN", za: "ZAR", ae: "AED" };
    if (byRegion[region]) return byRegion[region];
    if (nav.startsWith("pt")) return "BRL";
    if (/^(de|fr|es|it|nl|pt|fi|el|sk|sl|et|lv|lt|ga|mt|hr)/.test(nav)) return "EUR";
    return "USD";
  }
  const saved = read();
  const settings = {
    theme: saved.theme === "dark" ? "dark" : "light", // 라이트/다크 두 가지 (예전 "시스템" 설정은 라이트로)
    lang: isLang(saved.lang) ? saved.lang : guessLang(),
    cur: saved.cur || guessCur(),
  };

  function applyTheme() {
    const r = document.documentElement;
    r.setAttribute("data-theme", settings.theme);
  }
  applyTheme();
  document.documentElement.lang = settings.lang;

  // 언어 파일 불러오기
  const loading = {};
  function loadLang(code) {
    if (S[code]) return Promise.resolve(true);
    if (!loading[code]) {
      loading[code] = new Promise((ok) => {
        const el = document.createElement("script");
        el.src = `lang/${code}.js?v=${VERSION}`;
        el.onload = () => ok(!!S[code]);
        el.onerror = () => ok(false);
        document.head.appendChild(el);
      });
    }
    return loading[code];
  }

  function t(k, v = {}) {
    const s = S[settings.lang]?.[k] ?? S.en[k] ?? S.ko[k] ?? k;
    return s.replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? ""));
  }
  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.title = t("doc.title");
  }

  const ready = loadLang(settings.lang).then((ok) => { if (!ok) settings.lang = "en"; document.documentElement.lang = settings.lang; });

  window.I18N = {
    t, apply, settings, dict: S, LANGS, ready,
    get lang() { return settings.lang; },
    locale: () => LANGS.find((l) => l.code === settings.lang)?.locale || "en-US",
    add(code, dict) { S[code] = dict; },
    async setLang(l) {
      if (!isLang(l) || !(await loadLang(l))) return false;
      settings.lang = l; document.documentElement.lang = l; write(settings); apply(); return true;
    },
    setTheme(th) { settings.theme = th; write(settings); applyTheme(); },
    setCur(c) { settings.cur = c; write(settings); },
  };
})();
