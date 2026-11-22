// Firebase 프로젝트 설정
// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → "SDK 설정 및 구성"에 나오는 값을 붙여 넣으세요.
// 이 값들은 공개되어도 괜찮은 값입니다. (보안은 Firestore 보안 규칙으로 지켜요 — SETUP.md 참고)
// 비워 두면(null) 로그인 화면은 보이지만 로그인 버튼은 꺼지고 "둘러보기"만 가능합니다.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCYosQlV1oDBjIcUq68AwAhGdXcxrkSdcA",
  authDomain: "tripmate-b19b4.firebaseapp.com",
  projectId: "tripmate-b19b4",
  storageBucket: "tripmate-b19b4.firebasestorage.app",
  messagingSenderId: "1070109113364",
  appId: "1:1070109113364:web:26d968e88878e1e6cdbb01",
};

// Google 로그인용 "웹 클라이언트 ID" (아이폰 사파리에서도 되는 Google 로그인에 필요)
// Firebase 콘솔 → Authentication → 로그인 방법 → Google → "웹 SDK 구성" → 웹 클라이언트 ID
// 이 값도 공개되어도 괜찮은 값입니다. 비워 두면 예전 팝업 방식을 써요.
// 봇·스팸 차단(App Check)용 Fraud Defense(reCAPTCHA Enterprise) 사이트 키 — 공개용 키라 코드에 있어도 괜찮아요
window.RECAPTCHA_SITE_KEY = "6LfwTCwuAAAAAEAFdOZ9GcRvVp4eGu1m3BJl4h42";

window.GOOGLE_CLIENT_ID = "1070109113364-c4tk4gr50pp2i4eht7aiedhtc2d6cu4j.apps.googleusercontent.com";

/* 예시:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};
*/
