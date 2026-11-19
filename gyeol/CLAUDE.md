# 결 — 여행 계획 웹사이트

## 목표
여행 일정, 예산, 준비물, 메모를 한 곳에서 정리하는 사이트

## 기술
- HTML, CSS, JavaScript만 사용 (빌드 도구 없이)
- 데이터는 localStorage에 저장
- 모바일 우선 디자인

## 디자인
- 따뜻한 베이지 배경, 테라코타 포인트 색
- 제목은 Gowun Batang, 본문은 Noto Sans KR

## 규칙
- 모든 화면 문구는 한국어로
- 기능 하나 추가할 때마다 브라우저에서 확인

## 파일 구조
- `index.html` — 페이지 뼈대, 폰트 불러오기
- `style.css` — 색상 토큰(`:root`)과 모든 스타일
- `app.js` — 데이터 저장/불러오기, 화면 그리기, 이벤트 처리
- localStorage 키: `gyeol.trips.v1`
