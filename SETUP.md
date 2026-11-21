# 로그인·데이터베이스 설정 안내 (Firebase)

트립메이트는 **Firebase**(구글이 운영하는 앱 백엔드 서비스)로 회원 계정과 데이터를 보관합니다.
코드는 이미 다 들어가 있고, 아래 설정만 하면 실제로 로그인이 됩니다.

## 계정은 어떻게 보관되나요?

- **구글·애플 로그인**: 사용자의 구글/애플 비밀번호는 우리 사이트로 오지 않습니다.
  사용자는 구글·애플 화면에서 로그인하고, 구글·애플은 "이 사람이 맞다"는 확인증(토큰)만 Firebase에 보내요.
  Firebase는 그 사람에게 고유번호(UID)를 만들어 줍니다.
- **이메일 회원가입**: 비밀번호는 Firebase가 암호화(해시)해서 보관합니다. 우리도 원래 비밀번호는 볼 수 없어요.
- **여행 데이터**: Firestore 데이터베이스에 `users/{UID}` 문서 하나로 저장됩니다.

```
users (컬렉션)
└── {UID} (사용자 1명당 문서 1개)
    ├── profile   : { name, email, provider }
    ├── plan      : 지금 짜고 있는 계획
    ├── saved     : 저장한 계획 목록
    ├── priceLog  : 직접 입력한 항공권 가격 기록
    └── updatedAt : 마지막 저장 시각
```

## 설정 순서

### 1. Firebase 프로젝트 만들기
1. https://console.firebase.google.com 접속 → 구글 계정으로 로그인
2. **프로젝트 추가** → 이름(예: `tripmate`) 입력 → 만들기

### 2. 로그인 방식 켜기
**빌드 → Authentication → 시작하기 → Sign-in method** 탭에서:
- **이메일/비밀번호**: 사용 설정
- **Google**: 사용 설정 → 프로젝트 지원 이메일 선택 → 저장
- **Apple**: Apple 개발자 프로그램 가입(연 $99)이 필요합니다.
  1. https://developer.apple.com → Certificates, IDs & Profiles
  2. App ID 만들고 **Sign in with Apple** 체크
  3. **Services ID** 만들기 → Sign in with Apple 설정에서
     - 도메인: `<프로젝트ID>.firebaseapp.com`
     - Return URL: `https://<프로젝트ID>.firebaseapp.com/__/auth/handler`
  4. **Keys**에서 Sign in with Apple 키(.p8) 만들기
  5. Firebase의 Apple 항목에 Services ID, Team ID, Key ID, 키 파일 내용을 입력

### 3. 데이터베이스(Firestore) 만들기
1. **빌드 → Firestore Database → 데이터베이스 만들기**
2. 위치: `asia-northeast3 (서울)` 추천 → **프로덕션 모드**로 시작
3. **규칙** 탭에 아래를 붙여 넣고 게시 (본인 데이터만 읽고 쓸 수 있게 하는 핵심 보안 설정):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### 4. 웹 앱 등록하고 설정값 넣기
1. **프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹(</>)** 으로 앱 추가
2. 나오는 `firebaseConfig` 값을 `firebase-config.js`에 붙여 넣기

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "tripmate.firebaseapp.com",
  projectId: "tripmate",
  storageBucket: "tripmate.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};
```
이 값은 공개되어도 괜찮습니다. 데이터 보호는 3번의 보안 규칙이 담당해요.

### 5. 사이트 공개하고 도메인 승인
로그인은 `index.html` 파일을 더블클릭해서 연 상태(file://)에서는 동작하지 않고, 인터넷 주소가 있어야 합니다.
1. GitHub 저장소 → **Settings → Pages** → 배포할 브랜치 선택 → 주소 발급 (예: `https://아이디.github.io/-my-first-project/`)
2. Firebase **Authentication → 설정 → 승인된 도메인**에 `아이디.github.io` 추가

## 비용 (무료 요금제 기준, 정책은 바뀔 수 있음)
- 이메일·구글·애플 로그인: 일반적인 규모에서는 무료
- Firestore: 저장 1GB, 하루 읽기 5만 회·쓰기 2만 회까지 무료
- 개인 프로젝트·초기 서비스는 무료 범위로 충분합니다.

## 서비스로 공개할 때 챙길 것
- **개인정보처리방침**: `privacy.html`에 만들어 두었어요. 공개 전에 11번 항목의 `[운영자 이름]`, `[연락받을 이메일 주소]`를 실제 정보로 바꿔 주세요.
- **회원 탈퇴**: 로그인 후 오른쪽 위 내 이름 → 회원 탈퇴. 본인 확인 후 계정과 저장 데이터가 함께 삭제돼요.
- **회원 탈퇴 기능**: 탈퇴 시 계정과 데이터를 지울 수 있어야 합니다. (다음 작업 후보)

## 다른 선택지
| 서비스 | 특징 |
|---|---|
| **Firebase** (현재 사용) | 구글 운영, 설정이 가장 쉬움, 무료 범위 넉넉 |
| Supabase | PostgreSQL(표 형태 DB) 기반, SQL 사용 가능, 오픈소스 |
| Auth0 / Clerk | 로그인 전문 서비스, 로그인 화면·보안 기능이 풍부, 사용자 많아지면 유료 |
| AWS Cognito + DynamoDB | 대규모 서비스용, 설정이 복잡 |
| 카카오·네이버 로그인 | 국내 사용자에게 익숙, Firebase와 함께 쓰려면 별도 서버 작업 필요 |
