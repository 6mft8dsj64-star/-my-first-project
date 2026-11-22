# 나중에 할 작업

> 마지막 정리: 2026-11-22

## 은행 환율 연동 (보류 — 다른 작업 완료 후 마지막에 진행)

### 조사 결과 (2026-11-21)
- 신한은행: 공식 공개 환율 API 없음. 홈페이지 스크래핑은 가능하나 화면 변경 시 고장·약관 문제 위험.
- Chase / Bank of America: 일반 공개 API 없음. BofA는 제3자 서비스(allratestoday.com)가 JSON 제공
  (API 키 필요, 사이트에 출처 링크 표시 의무, 은행 공식 아님).
- 브라우저에서 은행 사이트 직접 호출은 CORS로 불가 → 서버/자동화 필요.
- Claude 작업 환경에서는 은행 사이트 접속이 막혀 있어 "Claude가 주기적으로 찾아서 갱신" 방식은 부적합.

### 추천 방법
1. 한국수출입은행 공식 환율 API 사용 (공공데이터포털 https://www.data.go.kr 에서 무료 키 발급)
   - 매매기준율, 송금 보낼 때/받을 때 환율 제공
2. GitHub Actions로 몇 시간마다 환율 받아 `rates.json` 저장 (키는 GitHub Secrets에 보관)
3. 여행자용 숫자 추가: "현찰 살 때"(매매기준율 + 수수료, USD/JPY 약 1.75%) vs "트래블카드" 비교, 절약액 계산
4. GitHub Pages로 사이트 공개 (자동 갱신 환율 반영에 필요)

### 사용자가 직접 해야 할 일
- [ ] 공공데이터포털에서 "한국수출입은행 환율정보" API 활용신청 → 키 받기
- [ ] (선택) 신한 스크래핑 시도 여부 결정
- [ ] (선택) BofA 환율 원하면 allratestoday 무료 키 발급

## 로그인 서비스 연결
- [x] Firebase 프로젝트 생성 → `firebase-config.js`에 설정값 입력
- [x] GitHub Pages로 사이트 공개 (https://6mft8dsj64-star.github.io/tripnote/), Firebase 승인된 도메인 추가
- [x] Firestore 보안 규칙 게시 (회원 데이터 본인만, 문의 관리자만)
- [ ] Apple 로그인: Apple 개발자 프로그램(연 $99) 가입 후 설정
- [x] 개인정보처리방침 페이지(`privacy.html`), 회원 탈퇴 기능 추가
- [x] `privacy.html` 개인정보 보호책임자 이름·이메일 입력

## 다국어 추가 작업
- [ ] 도시·명소·숙소·팁·비자 데이터 번역: 지금은 한국어·영어만 있고, 나머지 12개 언어는 영어로 표시됨 (`i18n-data.js`)
- [ ] 아랍어 등 오른쪽→왼쪽(RTL) 언어 지원
- [ ] 개인정보처리방침 영어 번역본

## 스팸 방지 (App Check) 마무리
- [x] Fraud Defense(reCAPTCHA Enterprise) 사이트 키 등록, 사이트 코드에 연결 (2026-11-22)
- [ ] 며칠 사용 후 Firebase 콘솔 App Check → API → Cloud Firestore에서 "확인된 요청" 비율 확인
- [ ] 거의 100%면 **Cloud Firestore만** 적용(Enforce). Authentication은 적용하지 않기
- [x] 로그인한 사람만 문의 가능 (사이트 + Firestore 규칙)
- [x] 함정 칸·3초 규칙으로 봇 차단
- [ ] 그래도 스팸이 오면: 같은 계정 1분에 1건 제한(규칙)
