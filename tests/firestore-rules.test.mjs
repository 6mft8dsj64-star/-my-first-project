import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, limit, getDocs, serverTimestamp, Timestamp, documentId } from 'firebase/firestore';
import fs from 'fs';
const ADMIN = 'W7EU9qXWeAOiI5E4uOrKFXdEsS63';
const file = process.argv[2];
const env = await initializeTestEnvironment({ projectId: 'tm-rules-' + Math.random().toString(36).slice(2, 7), firestore: { rules: fs.readFileSync(file, 'utf8'), host: '127.0.0.1', port: 8085 } });
const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const results = [];
async function t(name, expectOk, fn) {
  try { await (expectOk ? assertSucceeds(fn()) : assertFails(fn())); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name + ' — ' + (e.message || e).toString().slice(0, 120)]); }
}
const seed = async (path, data) => env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), data); });
const inq = (uid, extra = {}) => ({ category: 'idea', message: '좋아요', email: '', uid, name: '', lang: 'ko', page: 'tokyo', createdAt: serverTimestamp(), status: 'new', ...extra });
const fare = (extra = {}) => ({ dest: 'tokyo', country: 'jp', dep: 'ICN', price: 250000, month: 3, updatedAt: serverTimestamp(), ...extra });
const spend = (extra = {}) => ({ dest: 'tokyo', country: 'jp', style: 'normal', amount: 60000, updatedAt: serverTimestamp(), ...extra });

// ---- 회원 데이터 ----
await seed('users/alice', { plan: { x: 1 } });
await t('회원: 본인 데이터 읽기', true, () => getDoc(doc(as('alice'), 'users/alice')));
await t('회원: 본인 데이터 쓰기', true, () => setDoc(doc(as('alice'), 'users/alice'), { plan: { x: 2 } }));
await t('회원: 남의 데이터 읽기 차단', false, () => getDoc(doc(as('bob'), 'users/alice')));
await t('회원: 남의 데이터 쓰기 차단', false, () => setDoc(doc(as('bob'), 'users/alice'), { plan: 'hack' }));
await t('회원: 로그인 안 한 사람 읽기 차단', false, () => getDoc(doc(as(null), 'users/alice')));
await t('회원: 전체 회원 목록 조회 차단', false, () => getDocs(collection(as('bob'), 'users')));
// ---- 문의 ----
await t('문의: 로그인한 사람 정상 문의', true, () => setDoc(doc(as('alice'), 'inquiries/q1'), inq('alice')));
await t('문의: 로그인 안 하면 차단', false, () => setDoc(doc(as(null), 'inquiries/q2'), inq('')));
await t('문의: 남의 uid로 보내기 차단', false, () => setDoc(doc(as('bob'), 'inquiries/q3'), inq('alice')));
await t('문의: 허용 안 된 칸 추가 차단', false, () => setDoc(doc(as('bob'), 'inquiries/q4'), inq('bob', { admin: true })));
await t('문의: 2000자 초과 차단', false, () => setDoc(doc(as('bob'), 'inquiries/q5'), inq('bob', { message: 'a'.repeat(2001) })));
await t('문의: 상태를 처리완료로 위조 차단', false, () => setDoc(doc(as('bob'), 'inquiries/q6'), inq('bob', { status: 'done' })));
await t('문의: 보낸 시각 위조 차단', false, () => setDoc(doc(as('bob'), 'inquiries/q7'), inq('bob', { createdAt: Timestamp.fromDate(new Date(2020, 0, 1)) })));
await t('문의: 일반 사용자 읽기 차단', false, () => getDoc(doc(as('alice'), 'inquiries/q1')));
await t('문의: 일반 사용자 목록 조회 차단', false, () => getDocs(collection(as('alice'), 'inquiries')));
await t('문의: 일반 사용자 수정 차단', false, () => updateDoc(doc(as('alice'), 'inquiries/q1'), { status: 'done' }));
await t('문의: 관리자 읽기', true, () => getDoc(doc(as(ADMIN), 'inquiries/q1')));
await t('문의: 관리자 목록 조회', true, () => getDocs(collection(as(ADMIN), 'inquiries')));
await t('문의: 관리자 처리완료 표시', true, () => updateDoc(doc(as(ADMIN), 'inquiries/q1'), { status: 'done' }));
await t('문의: 관리자 삭제', true, () => deleteDoc(doc(as(ADMIN), 'inquiries/q1')));
// ---- 공유 시세 (fares) ----
await t('시세: 본인 노선 가격 공유', true, () => setDoc(doc(as('alice'), 'fares/alice_tokyo_ICN'), fare()));
await t('시세: 로그인 안 하면 공유 차단', false, () => setDoc(doc(as(null), 'fares/x_tokyo_ICN'), fare()));
await t('시세: 남의 이름(uid)으로 저장 차단', false, () => setDoc(doc(as('bob'), 'fares/alice_osaka_ICN'), fare({ dest: 'osaka' })));
await t('시세: 문서 ID와 내용 불일치 차단', false, () => setDoc(doc(as('bob'), 'fares/bob_tokyo_ICN'), fare({ dest: 'osaka' })));
await t('시세: 이름·이메일 칸 추가 차단', false, () => setDoc(doc(as('bob'), 'fares/bob_tokyo_ICN'), fare({ email: 'a@b.c' })));
await t('시세: 3만원 미만 가격 차단', false, () => setDoc(doc(as('bob'), 'fares/bob_tokyo_ICN'), fare({ price: 1000 })));
await t('시세: 2천만원 초과 가격 차단', false, () => setDoc(doc(as('bob'), 'fares/bob_tokyo_ICN'), fare({ price: 99999999 })));
await t('시세: 소수점 가격 차단', false, () => setDoc(doc(as('bob'), 'fares/bob_tokyo_ICN'), fare({ price: 250000.5 })));
await t('시세: 저장 시각 위조 차단', false, () => setDoc(doc(as('bob'), 'fares/bob_tokyo_ICN'), fare({ updatedAt: Timestamp.fromDate(new Date(2030, 0, 1)) })));
await t('시세: 10초 안에 다시 저장 차단', false, () => setDoc(doc(as('alice'), 'fares/alice_tokyo_ICN'), fare({ price: 260000 })));
await seed('fares/alice_osaka_ICN', fare({ dest: 'osaka', updatedAt: Timestamp.fromDate(new Date(Date.now() - 60000)) }));
await t('시세: 10초 지난 뒤 다시 저장(덮어쓰기)', true, () => setDoc(doc(as('alice'), 'fares/alice_osaka_ICN'), fare({ dest: 'osaka', price: 200000 })));
await t('시세: 누구나 1건 읽기(로그인 없이)', true, () => getDoc(doc(as(null), 'fares/alice_tokyo_ICN')));
await t('시세: 나라별 300개까지 조회', true, () => getDocs(query(collection(as(null), 'fares'), where('country', '==', 'jp'), limit(300))));
await t('시세: 개수 제한 없는 대량 조회 차단', false, () => getDocs(query(collection(as(null), 'fares'), where('country', '==', 'jp'))));
await t('시세: 1000개 대량 조회 차단', false, () => getDocs(query(collection(as(null), 'fares'), limit(1000))));
await t('시세: 남의 가격 삭제 차단', false, () => deleteDoc(doc(as('bob'), 'fares/alice_tokyo_ICN')));
await t('시세: 탈퇴 시 내 가격 찾기(ID 범위 조회)', true, () => getDocs(query(collection(as('alice'), 'fares'), where(documentId(), '>=', 'alice_'), where(documentId(), '<', 'alice_'), limit(300))));
await t('시세: 본인 가격 삭제', true, () => deleteDoc(doc(as('alice'), 'fares/alice_tokyo_ICN')));
await t('시세: 관리자 이상값 삭제', true, () => deleteDoc(doc(as(ADMIN), 'fares/alice_osaka_ICN')));
// ---- 생활비 (spend) ----
await t('생활비: 본인 도시 생활비 공유', true, () => setDoc(doc(as('alice'), 'spend/alice_tokyo'), spend()));
await t('생활비: 로그인 안 하면 차단', false, () => setDoc(doc(as(null), 'spend/x_tokyo'), spend()));
await t('생활비: 남의 uid로 저장 차단', false, () => setDoc(doc(as('bob'), 'spend/alice_osaka'), spend({ dest: 'osaka' })));
await t('생활비: 잘못된 스타일 차단', false, () => setDoc(doc(as('bob'), 'spend/bob_tokyo'), spend({ style: 'rich' })));
await t('생활비: 200만원 초과(하루) 차단', false, () => setDoc(doc(as('bob'), 'spend/bob_tokyo'), spend({ amount: 3000000 })));
await t('생활비: 3천원 미만 차단', false, () => setDoc(doc(as('bob'), 'spend/bob_tokyo'), spend({ amount: 100 })));
await t('생활비: 이름 칸 추가 차단', false, () => setDoc(doc(as('bob'), 'spend/bob_tokyo'), spend({ name: '홍길동' })));
await t('생활비: 10초 안에 다시 저장 차단', false, () => setDoc(doc(as('alice'), 'spend/alice_tokyo'), spend({ amount: 70000 })));
await t('생활비: 300개까지 조회', true, () => getDocs(query(collection(as(null), 'spend'), where('country', '==', 'jp'), limit(300))));
await t('생활비: 제한 없는 대량 조회 차단', false, () => getDocs(collection(as(null), 'spend')));
await t('생활비: 남의 생활비 삭제 차단', false, () => deleteDoc(doc(as('bob'), 'spend/alice_tokyo')));
await t('생활비: 본인 생활비 삭제', true, () => deleteDoc(doc(as('alice'), 'spend/alice_tokyo')));
// ---- 그 밖 ----
await t('기타: 규칙에 없는 컬렉션 쓰기 차단', false, () => setDoc(doc(as('alice'), 'hack/x'), { a: 1 }));
await t('기타: 규칙에 없는 컬렉션 읽기 차단', false, () => getDocs(collection(as(null), 'hack')));
await env.cleanup();
const fail = results.filter((r) => r[0] === 'FAIL');
console.log(results.map((r) => `${r[0] === 'PASS' ? '✅' : '❌'} ${r[1]}`).join('\n'));
console.log(`\n${file}: ${results.length - fail.length}/${results.length} 통과`);
