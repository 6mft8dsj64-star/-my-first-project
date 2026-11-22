// 은행 기준 환율을 받아 rates-bank.json 으로 저장해요 (GitHub Actions에서 실행).
// 지금 출처: 한국수출입은행 현재환율 API (영업일 오전 11시 전후 고시, 하루 1,000회 한도)
// 나중에 하나은행 API를 받으면: RATES_PROVIDER=hana 로 바꾸고 아래 hana() 를 채우면 돼요.
import fs from "node:fs";

const OUT = "rates-bank.json";
const PROVIDER = (process.env.RATES_PROVIDER || "kexim").trim();
const num = (s) => Number(String(s ?? "").replace(/,/g, ""));
const kstDay = (back = 0) => new Date(Date.now() + 9 * 3600e3 - back * 86400e3).toISOString().slice(0, 10);
const ALIAS = { CNH: "CNY" }; // 수출입은행은 위안화를 CNH(역외 위안)로 줘요 → 사이트는 CNY로 써요

async function kexim() {
  const key = (process.env.KEXIM_KEY || "").trim();
  if (!key) return null;
  // 고시 전(오전 11시 전)이나 휴일에는 빈 목록이 와요 → 하루씩 거슬러 올라가 가장 최근 고시를 찾아요
  for (let back = 0; back < 8; back++) {
    const day = kstDay(back);
    const url = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${encodeURIComponent(key)}&searchdate=${day.replace(/-/g, "")}&data=AP01`;
    const r = await fetch(url, { headers: { "User-Agent": "tripnote-bank-rates" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); } catch { throw new Error(`JSON이 아닌 응답: ${text.slice(0, 120)}`); }
    if (!Array.isArray(j)) throw new Error("예상하지 못한 응답 형식");
    if (!j.length) continue;
    const code = Number(j[0].result);
    if (code !== 1) throw new Error(`수출입은행 결과 코드 ${code} (2=데이터 코드 오류, 3=인증키 오류·만료 → 재발급, 4=하루 한도 초과)`);
    const rates = {};
    for (const x of j) {
      const m = String(x.cur_unit || "").trim().match(/^([A-Z]{3})(?:\((\d+)\))?$/);
      if (!m || m[1] === "KRW") continue;
      const unit = Number(m[2] || 1);
      const base = num(x.deal_bas_r) / unit, tts = num(x.tts) / unit, ttb = num(x.ttb) / unit;
      if (!(base > 0)) continue;
      const r6 = (v) => (v > 0 ? +v.toFixed(6) : null);
      rates[ALIAS[m[1]] || m[1]] = { base: r6(base), tts: r6(tts), ttb: r6(ttb) };
    }
    return { provider: "kexim", date: day, rates };
  }
  throw new Error("최근 8일 동안 고시된 환율이 없어요");
}

async function hana() {
  // TODO: 하나은행 환율정보조회 API 승인 후 구현 (HANA_CLIENT_ID / HANA_CLIENT_SECRET 등)
  // 반환 형식은 kexim()과 같게: { provider: "hana", date: "YYYY-MM-DD", time: "HH:MM", rates: { USD: { base, tts, ttb }, ... } }
  throw new Error("하나은행 API는 아직 연결되지 않았어요");
}

const fetchers = { kexim, hana };
const got = await (fetchers[PROVIDER] || kexim)();
if (!got) { console.log("인증키(Secrets)가 없어 건너뛰어요. GitHub Secrets에 KEXIM_KEY를 넣어 주세요."); process.exit(0); }
if (Object.keys(got.rates).length < 5) throw new Error(`받은 통화가 너무 적어요 (${Object.keys(got.rates).length}개)`);

let old = null;
try { old = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { /* 처음 */ }
// 날짜가 바뀌면 이전 고시를 prev로 남겨서 "어제 대비" 변동을 계산할 수 있게 해요
const prev = old && old.date !== got.date ? { date: old.date, rates: old.rates } : old?.prev || null;
const next = { provider: got.provider, name: got.provider === "hana" ? "하나은행" : "한국수출입은행", date: got.date, time: got.time || "11:00", rates: got.rates, prev };
const same = old && JSON.stringify({ ...old, fetchedAt: 0 }) === JSON.stringify({ ...next, fetchedAt: 0 });
if (same) { console.log(`변경 없음 (${got.date})`); process.exit(0); }
fs.writeFileSync(OUT, JSON.stringify({ ...next, fetchedAt: new Date().toISOString() }, null, 1) + "\n");
console.log(`저장: ${got.provider} ${got.date} · ${Object.keys(got.rates).length}개 통화`);
