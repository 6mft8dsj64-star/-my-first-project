# Firestore 보안 규칙 테스트

`firestore-rules.txt`가 안전하게 동작하는지 Firebase 공식 에뮬레이터로 확인하는 테스트예요 (53개 항목).

```bash
cd tests
npm init -y && npm install firebase-tools@13.29.1 @firebase/rules-unit-testing@3.0.4 firebase@10.12.2
echo '{ "emulators": { "firestore": { "host": "127.0.0.1", "port": 8085 } } }' > firebase.json
npx firebase emulators:exec --only firestore --project demo-tm "node firestore-rules.test.mjs ../firestore-rules.txt"
```

확인 항목: 회원 데이터 본인만 · 문의는 로그인한 본인만 보내고 관리자만 읽기 · 공유 시세/생활비는 본인 이름으로만 저장,
이름·이메일 칸 금지, 금액 범위, 10초 제한, 300개 초과 조회 금지, 남의 기록 삭제 금지 · 규칙에 없는 컬렉션 전부 차단.
