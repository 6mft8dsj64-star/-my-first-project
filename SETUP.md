# 로그인·데이터베이스 설정 안내 (Firebase)

트립노트는 **Firebase**(구글이 운영하는 앱 백엔드 서비스)로 회원 계정과 데이터를 보관합니다.
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
3. **규칙** 탭에 아래를 붙여 넣고 게시 (휴대폰에서는 사이트의 `firestore-rules.txt`를 열어 전체 복사하면 잘리지 않아요) (본인 데이터만 읽고 쓸 수 있게 하는 핵심 보안 설정):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function admin() {
      return request.auth != null
        && request.auth.uid == '관리자_UID';
    }

    function okInq(d) {
      return request.auth != null
        && d.uid == request.auth.uid
        && d.keys().hasOnly(['category','message','email',
             'uid','name','lang','page','createdAt','status'])
        && d.category in ['bug','inconv','idea','data','other']
        && d.message is string
        && d.message.size() > 0 && d.message.size() <= 2000
        && d.email is string && d.email.size() <= 200
        && d.name is string && d.name.size() <= 100
        && d.lang is string && d.lang.size() <= 10
        && d.page is string && d.page.size() <= 50
        && d.status == 'new'
        && d.createdAt == request.time;
    }

    function okFare(id, d) {
      return request.auth != null
        && id == request.auth.uid + '_' + d.dest + '_' + d.dep
        && d.keys().hasOnly(['dest','country','dep',
             'price','month','updatedAt'])
        && d.keys().hasAll(['dest','country','dep',
             'price','month','updatedAt'])
        && d.dest is string && d.dest.size() > 0
        && d.dest.size() <= 40
        && d.country is string && d.country.size() > 0
        && d.country.size() <= 10
        && d.dep is string && d.dep.size() == 3
        && d.price is int
        && d.price >= 30000 && d.price <= 20000000
        && d.month is int
        && d.month >= 1 && d.month <= 12
        && d.updatedAt == request.time;
    }

    function okSpend(id, d) {
      return request.auth != null
        && id == request.auth.uid + '_' + d.dest
        && d.keys().hasOnly(['dest','country','style',
             'amount','updatedAt'])
        && d.keys().hasAll(['dest','country','style',
             'amount','updatedAt'])
        && d.dest is string && d.dest.size() > 0
        && d.dest.size() <= 40
        && d.country is string && d.country.size() > 0
        && d.country.size() <= 10
        && d.style in ['save','normal','comfort']
        && d.amount is int
        && d.amount >= 3000 && d.amount <= 2000000
        && d.updatedAt == request.time;
    }

    match /users/{uid} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid;
    }

    match /inquiries/{id} {
      allow create: if okInq(request.resource.data);
      allow read, update, delete: if admin();
    }

    match /fares/{id} {
      allow get: if true;
      allow list: if request.query.limit <= 300;
      allow create: if okFare(id, request.resource.data);
      allow update: if okFare(id, request.resource.data)
        && request.time > resource.data.updatedAt
           + duration.value(10, 's');
      allow delete: if admin()
        || (request.auth != null
            && id.matches(request.auth.uid + '_.*'));
    }

    match /spend/{id} {
      allow get: if true;
      allow list: if request.query.limit <= 300;
      allow create: if okSpend(id, request.resource.data);
      allow update: if okSpend(id, request.resource.data)
        && request.time > resource.data.updatedAt
           + duration.value(10, 's');
      allow delete: if admin()
        || (request.auth != null
            && id.matches(request.auth.uid + '_.*'));
    }
  }
}
```

**`관리자_UID` 바꾸는 법**: 사이트에 관리자로 쓸 계정으로 한 번 로그인한 뒤,
Firebase 콘솔 **Authentication → 사용자** 목록에서 그 계정의 **사용자 UID**를 복사해 `관리자_UID` 자리에 넣고 게시하세요.
(관리자 정보는 이 규칙에만 들어가고 사이트 코드에는 들어가지 않아요. 문의는 Firestore 콘솔의 `inquiries`에서도 볼 수 있어요.)

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
1. GitHub 저장소 → **Settings → Pages** → `main` 브랜치 선택 → 주소 발급 (현재: `https://6mft8dsj64-star.github.io/tripnote/`)
2. Firebase **Authentication → 설정 → 승인된 도메인**에 `6mft8dsj64-star.github.io` 추가
3. 구글 로그인 버튼용: Google Cloud → API 및 서비스 → 사용자 인증 정보 → 웹 클라이언트 → **승인된 JavaScript 원본**에 `https://6mft8dsj64-star.github.io` 추가

### 6. 관리자 문의함
1. 관리자로 쓸 계정으로 사이트에 한 번 로그인
2. Firebase **Authentication → 사용자**에서 그 계정의 **사용자 UID** 복사
3. 3번의 규칙에서 `관리자_UID`를 그 UID로 바꿔 게시 → 관리자로 로그인하면 📥 문의함이 보여요

### 7. 스팸 방지 (App Check)
1. reCAPTCHA 클래식은 App Check에서 지원이 끝났어요. **Fraud Defense(reCAPTCHA Enterprise)**를 사용합니다.
2. Firebase 콘솔 → App Check(https://console.firebase.google.com/project/tripmate-b19b4/appcheck) → 앱 → 웹 앱 → **Fraud Defense**에 사이트 키 입력, 토큰 TTL은 1시간(기본값)
3. 사이트 키는 `firebase-config.js`의 `RECAPTCHA_SITE_KEY`에 들어 있어요 (공개용 키)
4. 며칠 뒤 App Check → API → **Cloud Firestore**의 확인된 요청 비율이 거의 100%면 **Cloud Firestore만 적용(Enforce)**. Authentication에는 적용하지 마세요.

### 8. 여행자 공유 시세 (fares)
- 로그인한 사용자가 **내가 찾은 가격**을 입력하면(“이름 없이 공유” 체크 시) `fares/{uid}_{도시}_{출발공항}` 문서에 저장돼요. 한 사람은 노선마다 가격 1개만 가지므로 여러 번 입력해도 평균이 쏠리지 않아요.
- 저장 내용: 도시, 나라, 출발 공항, 가격(원화, 1인 왕복), 출발 월, 저장 시각. **이름·이메일은 저장하지 않아요.**
- 화면에는 3명 이상 모인 노선만 **중간값**(보통 가격)과 대부분의 범위(25~75%)로 보여 줘요. 평소 시세의 1/4 미만·4배 초과 값과 중간값에서 크게 벗어난 값은 자동으로 빼요.
- 같은 출발 공항 기록이 3개 미만이면 모든 출발 공항 기록을 합쳐서 보여 줘요.
- 읽기 비용: 나라를 처음 열 때 한 번(최대 300개) 읽고 30분 동안 그 탭에 저장해 둬요. 무료 한도(하루 5만 회)를 넘으면 그날은 공유 시세만 안 보이고 나머지는 정상 동작해요.
- 잘못된 값 지우기: Firestore 콘솔 → `fares`에서 문서를 삭제하면 돼요(관리자 UID는 규칙에서 삭제 가능).
- 회원 탈퇴하면 그 사람이 공유한 가격도 함께 지워져요.

### 9. 여행자 생활비 공유 (spend)
- 로그인한 사용자가 **내 하루 생활비(1인)**를 입력하면(공유 체크 시) `spend/{uid}_{도시}` 문서에 저장돼요. 한 사람은 도시마다 1개.
- 저장 내용: 도시, 나라, 여행 스타일(절약·보통·여유), 1인 하루 금액(원화, 3천~200만 원), 저장 시각. 이름·이메일은 저장하지 않아요.
- 화면에는 **평균이 아니라 가장 많은 사람이 입력한 금액대(최빈 구간)**를 보여 줘요. 추정치의 1/5 미만·5배 초과 값과 중간값의 1/3 미만·3배 초과 값은 빼요.
- 같은 스타일 기록이 3개 미만이면 모든 스타일을 합쳐서 보여 줘요.

## 비용 (무료 요금제 기준, 정책은 바뀔 수 있음)
- 이메일·구글·애플 로그인: 일반적인 규모에서는 무료
- Firestore: 저장 1GB, 하루 읽기 5만 회·쓰기 2만 회까지 무료
- 개인 프로젝트·초기 서비스는 무료 범위로 충분합니다.

## 서비스로 공개할 때 챙길 것
- **개인정보처리방침**: `privacy.html`에 만들어 두었어요. 책임자 정보가 바뀌면 11번 항목을 고쳐 주세요.
- **회원 탈퇴**: 로그인 후 오른쪽 위 프로필 사진 → 회원 탈퇴. 본인 확인 후 계정과 저장 데이터가 함께 삭제돼요.
- **문의**: 문의 내용·이메일은 처리 후 1년 안에 삭제한다고 개인정보처리방침에 적어 두었어요. 문의함에서 직접 삭제할 수 있어요.
- **공유 시세**: 이름 없는 통계로 공개된다고 개인정보처리방침에 적어 두었어요. 설정은 가격 입력칸 아래 체크박스로 끌 수 있어요.

## 다른 선택지
| 서비스 | 특징 |
|---|---|
| **Firebase** (현재 사용) | 구글 운영, 설정이 가장 쉬움, 무료 범위 넉넉 |
| Supabase | PostgreSQL(표 형태 DB) 기반, SQL 사용 가능, 오픈소스 |
| Auth0 / Clerk | 로그인 전문 서비스, 로그인 화면·보안 기능이 풍부, 사용자 많아지면 유료 |
| AWS Cognito + DynamoDB | 대규모 서비스용, 설정이 복잡 |
| 카카오·네이버 로그인 | 국내 사용자에게 익숙, Firebase와 함께 쓰려면 별도 서버 작업 필요 |
