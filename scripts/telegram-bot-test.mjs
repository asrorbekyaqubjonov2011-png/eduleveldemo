// Telegram bot regression test against a LOCAL server and the fake Telegram API (scripts/fake-telegram.mjs): no real chat or channel is touched.
// Start (3 terminals or background):
//   node scripts/fake-telegram.mjs
//   DATABASE_URL=... TELEGRAM_BOT_TOKEN=test:token TELEGRAM_WEBHOOK_SECRET=hooksecret TELEGRAM_CRON_SECRET=cronsecret TELEGRAM_API_BASE=http://localhost:4555 npx next start -p 3101
//   PGHOST=/tmp PGPORT=5433 PGUSER=postgres PGDATABASE=edulevel node scripts/telegram-bot-test.mjs
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://localhost:3101';
const FAKE = process.env.FAKE_TELEGRAM || 'http://localhost:4555';
if (!/localhost|127\.0\.0\.1/.test(BASE) || !/localhost|127\.0\.0\.1/.test(FAKE)) { console.error('Refusing to run: local server and fake Telegram only.'); process.exit(2); }
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'hooksecret';
const psql = (sql) => execFileSync('psql', ['-At', '-c', sql], { env: process.env }).toString().trim();
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failures++; };

psql("insert into public.site_settings(key,value) values ('payment_settings','{\"botUsername\":\"edu_test_bot\",\"botName\":\"Test\",\"isActive\":true,\"ownerTelegram\":\"ownertg\",\"channelUsername\":\"\",\"cardNumber\":\"8600000000000000\",\"minDepositAmount\":1000}') on conflict (key) do update set value = excluded.value");
// The server keeps a read snapshot for 15 s: wait so it sees the settings written above.
await new Promise((r) => setTimeout(r, 16000));
let updateId = Date.now();
const send = async (update, secret = SECRET) => {
  const before = (await (await fetch(FAKE + '/_state')).json()).length;
  const r = await fetch(BASE + '/api/telegram/webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {}) }, body: JSON.stringify({ update_id: ++updateId, ...update }) });
  const calls = (await (await fetch(FAKE + '/_state')).json()).slice(before);
  return { s: r.status, calls, texts: calls.filter((c) => c.method.startsWith('sendMessage')).map((c) => String(c.body?.text || '')) };
};
const msg = (id, username, text, type = 'private') => ({ message: { message_id: 1, date: 1, chat: { id: type === 'private' ? id : -100200, type }, from: { id, username, first_name: username }, text } });

check('no secret: 403', (await send(msg(1, 'x', '/start'), '')).s === 403);
check('wrong secret: 403', (await send(msg(1, 'x', '/start'), 'wrong')).s === 403);

const start = await send(msg(5001, 'student_a', '/start'));
check('/start is answered with an accepted message', start.s === 200 && start.calls.some((c) => c.method === 'sendMessage'));
check('no message was rejected for bad HTML', !start.calls.some((c) => /html-rejected/.test(c.method)));
check('coloured buttons fall back to plain ones when Telegram refuses the style', !start.calls.some((c) => /style-rejected/.test(c.method)) || start.calls.some((c) => c.method === 'sendMessage' && !JSON.stringify(c.body).includes('"style"')));

const post = await send(msg(5001, 'student_a', '/post IELTS maslahat'));
check('student: owner command /post refused', post.texts.some((t) => /faqat ustoz/i.test(t)));
const reja = await send(msg(5001, 'student_a', '/reja'));
check('student: owner command /reja refused', reja.texts.some((t) => /faqat ustoz/i.test(t)));
const cb = await send({ callback_query: { id: 'cb1', from: { id: 5001, username: 'student_a' }, data: 'admin:stats', message: { message_id: 2, chat: { id: 5001, type: 'private' } } } });
check('student: admin button refused', cb.texts.some((t) => /faqat ustoz/i.test(t)));

const ownerFirst = await send(msg(7001, 'ownertg', '/reja'));
check('owner (right username, first use) is accepted', ownerFirst.s === 200 && !ownerFirst.texts.some((t) => /faqat ustoz/i.test(t)));
check('owner id was saved after first use', psql("select value->>'ownerTelegramId' from public.site_settings where key='payment_settings'") === '7001');
const impostor = await send(msg(8002, 'ownertg', '/post IELTS'));
check('same username but another account: refused', impostor.texts.some((t) => /faqat ustoz/i.test(t)));
const owner2 = await send(msg(7001, 'ownertg', '/reja'));
check('real owner still accepted', !owner2.texts.some((t) => /faqat ustoz/i.test(t)));

const group = await send(msg(5002, 'student_b', 'salom hammaga', 'supergroup'));
check('plain group chatter is ignored (no reply)', group.s === 200 && group.texts.length === 0);
const weird = await send({ message: { message_id: 1, chat: { id: 5003, type: 'private' }, from: { id: 5003 }, text: '\u0000<script>alert(1)</script> /start' } });
check('odd text without username does not crash', weird.s === 200);
const noText = await send({ message: { message_id: 1, chat: { id: 5004, type: 'private' }, from: { id: 5004, username: 'u4' } } });
check('message without text does not crash', noText.s === 200);
check('empty update does not crash', (await send({})).s === 200);

const cronBad = await fetch(BASE + '/api/telegram/cron?job=reminders', { method: 'POST', headers: { 'x-cron-secret': 'wrong' } });
check('cron with wrong secret: 403', cronBad.status === 403);
const cronNoJob = await fetch(BASE + '/api/telegram/cron', { method: 'POST', headers: { 'x-cron-secret': process.env.TELEGRAM_CRON_SECRET || 'cronsecret' } });
check('cron with the right secret but no job: 400 (secret accepted)', cronNoJob.status === 400);
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('All Telegram bot checks passed');
