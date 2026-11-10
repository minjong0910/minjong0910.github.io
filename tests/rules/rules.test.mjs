// 서버/firestore.rules 시험 — Firestore 에뮬레이터 위에서 실제 요청을 보내 허용 · 거부를 확인한다 (2026-11-10 외부 점검 B-6)
//   GitHub 자동 검사(.github/workflows/check-and-deploy.yml 의 rules)가 돌린다 — 이 PC 에는 Java 가 없어 에뮬레이터를 못 띄운다.
//   실패하면 GitHub 요약에 「규칙 시험 실패 :: 시험 이름」으로 남는다.
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const rules = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085').split(':');
const env = await initializeTestEnvironment({ projectId: 'demo-b3nav', firestore: { rules, host, port: Number(port) } });

const J = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAADAA==';
const P = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
// 한국 날짜 — 규칙의 kstDay() 와 같은 모양 (달 · 날에 0 을 채우지 않는다)
function kstDay(){ const d = new Date(Date.now() + 9 * 3600e3); return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate(); }
const DAY = kstDay();
const anonDb = uid => env.authenticatedContext(uid).firestore();
const nobody = () => env.unauthenticatedContext().firestore();
const admin = () => env.authenticatedContext('admin1').firestore();

// 앱(sugdb.js sendDoc)과 같은 방법으로 제보 한 건 : 횟수 문서를 1 올리고 같은 일괄 쓰기로 제보를 쓴다
function suggest(uid, n, extra){
  const db = anonDb(uid), b = writeBatch(db);
  const q = doc(db, 'quota', uid + '_' + DAY);
  if(n === 1) b.set(q, { n: 1 }); else b.update(q, { n });
  b.set(doc(db, 'suggestions', uid + '_' + DAY + '_' + n),
        Object.assign({ u: J, note: '3층 복도', ts: Date.now(), status: 'pending', ai: null, qr: null, ua: 'test', cid: 'c' + n, uid, day: DAY }, extra || {}));
  return b.commit();
}

const results = [];
async function t(name, fn){
  try { await fn(); results.push({ name, ok: true }); console.log('통과 ' + name); }
  catch(e){ results.push({ name, ok: false }); console.log('::error title=규칙 시험 실패::' + name + ' — ' + String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 300)); }
}

await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'admins/admin1'), { on: true }); });

// ── 제보 (suggestions · quota) ──
await t('익명 제보 1번째 허용', () => assertSucceeds(suggest('u1', 1)));
await t('익명 제보 2 · 3번째 허용', async () => { await assertSucceeds(suggest('u1', 2)); await assertSucceeds(suggest('u1', 3)); });
await t('익명 제보 4번째 거부', () => assertFails(suggest('u1', 4)));
await t('로그인 안 한 제보 거부', async () => {
  const db = nobody(); await assertFails(setDoc(doc(db, 'suggestions', 'x_' + DAY + '_1'), { u: J, status: 'pending' }));
});
await t('남의 UID 로 제보 거부', () => assertFails(suggest('u2', 1, { uid: 'someoneElse' })));
await t('다른 날짜로 제보 거부', async () => {
  const db = anonDb('u3'), b = writeBatch(db);
  b.set(doc(db, 'quota', 'u3_2000-1-1'), { n: 1 });
  b.set(doc(db, 'suggestions', 'u3_2000-1-1_1'), { u: J, status: 'pending', uid: 'u3', day: '2000-1-1' });
  await assertFails(b.commit());
});
await t('png 사진 허용(사진 지우기 요청의 1×1 그림)', () => assertSucceeds(suggest('u4', 1, { u: P })));
await t('svg 사진 거부', () => assertFails(suggest('u5', 1, { u: 'data:image/svg+xml;base64,PHN2Zz4=' })));
await t('사진 값에 따옴표 · 속성을 끼운 제보 거부', () => assertFails(suggest('u6', 1, { u: J + '" onerror="alert(1)' })));
// 실제 제보 사진은 수십만 글자다 — 모양 검사(정규식)가 큰 값에서도 통과하는지 (작은 그림만 시험하면 실제 제보가 막혀도 모른다)
await t('실제 크기 사진(약 70만 자) 허용', () => assertSucceeds(suggest('u15', 1, { u: 'data:image/jpeg;base64,' + 'A'.repeat(700000) })));
await t('950,000자 넘는 사진 거부', () => assertFails(suggest('u16', 1, { u: 'data:image/jpeg;base64,' + 'A'.repeat(950000) })));
await t('status 가 pending 이 아니면 거부', () => assertFails(suggest('u7', 1, { status: 'approved' })));
await t('메모 500자 초과 거부', () => assertFails(suggest('u8', 1, { note: 'a'.repeat(501) })));
await t('QR 이 문 이름(MAIN 등)이면 허용', () => assertSucceeds(suggest('u9', 1, { qr: 'MAIN' })));
await t('QR 에 태그를 넣으면 거부', () => assertFails(suggest('u10', 1, { qr: '<svg onload=x>' })));
await t('AI 결과(map) 허용', () => assertSucceeds(suggest('u11', 1, { ai: { verdict: 'uncertain', code: 'LNG3', sim: 0.6, top: [{ code: 'LNG3', sim: 0.6 }] } })));
await t('AI 결과 칸이 60개를 넘으면 거부', () => {
  const big = {}; for(let i = 0; i < 61; i++) big['k' + i] = i;
  return assertFails(suggest('u12', 1, { ai: big }));
});
await t('정해지지 않은 칸을 붙이면 거부', () => assertFails(suggest('u13', 1, { evil: 1 })));
await t('익명은 제보를 읽을 수 없음', () => assertFails(getDoc(doc(anonDb('u1'), 'suggestions', 'u1_' + DAY + '_1'))));
await t('관리자는 제보를 읽고 상태를 바꿀 수 있음', async () => {
  const db = admin();
  await assertSucceeds(getDoc(doc(db, 'suggestions', 'u1_' + DAY + '_1')));
  await assertSucceeds(updateDoc(doc(db, 'suggestions', 'u1_' + DAY + '_1'), { status: 'approved', code: 'LNG3', handledTs: Date.now() }));
});
await t('익명은 남의 제보를 지울 수 없음', () => assertFails(deleteDoc(doc(anonDb('u9'), 'suggestions', 'u1_' + DAY + '_2'))));
await t('횟수를 줄이거나 지울 수 없음', async () => {
  const db = anonDb('u1');
  await assertFails(updateDoc(doc(db, 'quota', 'u1_' + DAY), { n: 1 }));
  await assertFails(deleteDoc(doc(db, 'quota', 'u1_' + DAY)));
});

// ── 승인 사진 (photos) ──
await t('누구나 승인 사진을 읽음', () => assertSucceeds(getDocs(collection(nobody(), 'photos'))));
await t('익명은 승인 사진을 못 씀', () => assertFails(addDoc(collection(anonDb('u1'), 'photos'), { code: 'LNG3', n: 'a.jpg', u: J, ts: 1 })));
await t('관리자는 모양이 맞는 승인 사진을 씀', () => assertSucceeds(addDoc(collection(admin(), 'photos'),
  { code: 'LNG3', sub: '', n: '건의함_x.jpg', u: J, cap: '3층 라운지', ts: Date.now(), sid: 'u1_' + DAY + '_1' })));
await t('관리자라도 사진 값이 꾸며져 있으면 거부', () => assertFails(addDoc(collection(admin(), 'photos'), { code: 'LNG3', n: 'a.jpg', u: J + '"x', ts: 1 })));
await t('관리자라도 위치 코드에 이상한 글자면 거부', () => assertFails(addDoc(collection(admin(), 'photos'), { code: '<b>', n: 'a.jpg', u: J, ts: 1 })));
await t('관리자의 숨김 기록 허용', () => assertSucceeds(setDoc(doc(admin(), 'photos', 'hide_LNG3_7Ca.jpg'), { hide: true, code: 'LNG3', n: 'a.jpg', ts: Date.now() })));
await t('관리자는 승인 사진을 지울 수 있음', () => assertSucceeds(deleteDoc(doc(admin(), 'photos', 'hide_LNG3_7Ca.jpg'))));

// ── 방 정보 (rooms · roomlog) ──
await t('익명은 방 정보를 못 씀', () => assertFails(setDoc(doc(anonDb('u1'), 'rooms', '13310'), { name: 'x' })));
await t('관리자는 방 정보를 씀', () => assertSucceeds(setDoc(doc(admin(), 'rooms', '13310'), { name: '연구실', en: 'Lab', memo: '', ts: Date.now() })));
await t('방 정보 이름 40자 초과 거부', () => assertFails(setDoc(doc(admin(), 'rooms', '13311'), { name: 'a'.repeat(41) })));
await t('방 정보 기록은 고치거나 지울 수 없음', async () => {
  const db = admin();
  const ref = await addDoc(collection(db, 'roomlog'), { key: '13310', before: null, after: { name: '연구실' }, by: 'admin1', ts: Date.now() });
  await assertFails(updateDoc(ref, { by: 'x' }));
  await assertFails(deleteDoc(ref));
});

// ── 관리자 작업 기록 (adminlog) ──
await t('관리자 작업 기록을 남김', () => assertSucceeds(addDoc(collection(admin(), 'adminlog'), { act: 'approve', target: 'u1_' + DAY + '_1', code: 'LNG3', by: 'admin1', ts: Date.now() })));
await t('남의 이름(by)으로 기록 거부', () => assertFails(addDoc(collection(admin(), 'adminlog'), { act: 'approve', target: 'x', by: 'someoneElse', ts: Date.now() })));
await t('익명은 기록을 남기거나 읽을 수 없음', async () => {
  await assertFails(addDoc(collection(anonDb('u1'), 'adminlog'), { act: 'approve', target: 'x', by: 'u1', ts: 1 }));
  await assertFails(getDocs(collection(anonDb('u1'), 'adminlog')));
});
await t('기록은 고치거나 지울 수 없음', async () => {
  const ref = await addDoc(collection(admin(), 'adminlog'), { act: 'hide', target: 'LNG3|a.jpg', by: 'admin1', ts: Date.now() });
  await assertFails(updateDoc(ref, { act: 'x' }));
  await assertFails(deleteDoc(ref));
});

// ── 관리자 명단 · 그 밖 ──
await t('관리자 명단은 아무도 못 씀', async () => {
  await assertFails(setDoc(doc(anonDb('u1'), 'admins', 'u1'), { on: true }));
  await assertFails(setDoc(doc(admin(), 'admins', 'u1'), { on: true }));
});
await t('정해지지 않은 컬렉션은 막힘', async () => {
  await assertFails(setDoc(doc(admin(), 'secret', 'x'), { a: 1 }));
  await assertFails(getDoc(doc(nobody(), 'secret', 'x')));
});

// ── 발표장 접속 수 (live) ──
await t('발표장 접속 수 +1 허용 · 줄이기 거부', async () => {
  const db = nobody(), ref = doc(db, 'live', 'demo-1');
  await assertSucceeds(setDoc(ref, { n: 1, t: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { n: 2, t: serverTimestamp() }));
  await assertFails(updateDoc(ref, { n: 0, t: serverTimestamp() }));
});

const bad = results.filter(r => !r.ok);
console.log('::notice title=규칙 시험::' + (results.length - bad.length) + ' / ' + results.length + ' 통과');
await env.cleanup();
process.exit(bad.length ? 1 : 0);
