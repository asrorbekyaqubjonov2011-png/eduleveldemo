// Stand-in for api.telegram.org: records every call. getChatMember says "member" for ids ending in 1; sendPoll returns a poll id.
import http from 'node:http';
const ALLOWED = new Set(['b','i','u','s','code','pre','a']);
function htmlError(text) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z]+)[^>]*>|<|&(?!(amp|lt|gt|quot|#\d+);)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[0] === '<') return 'Can\'t parse entities: Unmatched "<" at byte offset ' + m.index;
    if (m[0].startsWith('&')) return 'Unsupported "&" at byte offset ' + m.index;
    const name = m[2].toLowerCase();
    if (!ALLOWED.has(name)) return 'Unsupported start tag "' + name + '" at byte offset ' + m.index;
    if (!m[1]) stack.push(name);
    else if (stack.pop() !== name) return 'Unmatched end tag at byte offset ' + m.index;
  }
  return stack.length ? 'Can\'t find end tag' : '';
}
const calls = [];
let seq = 1000;
const RUN = Date.now().toString(36); // poll ids stay unique across restarts, like Telegram's
http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  if (req.url === '/_state') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(calls)); }
  const m = req.url.match(/^\/bot[^/]+\/(\w+)$/);
  const method = m ? m[1] : req.url;
  const payload = body ? JSON.parse(body) : null;
  // Like Telegram's HTML mode: only b/i/u/s/code/pre/a tags, balanced, and no bare "<" or "&".
  if (payload && payload.parse_mode === 'HTML' && typeof payload.text === 'string') {
    const err = htmlError(payload.text);
    if (err) { calls.push({ method: method + '(html-rejected)', body: payload }); res.setHeader('content-type','application/json'); return res.end(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: can't parse entities: " + err })); }
  }
  // Like Telegram when a button style is not accepted: the bot must fall back to plain buttons.
  if (payload && JSON.stringify(payload).includes('"style"')) { calls.push({ method: method + '(style-rejected)', body: payload }); res.setHeader('content-type','application/json'); return res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: unsupported button style' })); }
  const entry = { method, body: payload };
  calls.push(entry);
  res.setHeader('content-type', 'application/json');
  if (method === 'getWebhookInfo') return res.end(JSON.stringify({ ok: true, result: { url: '' } }));
  if (method === 'getChatMember') {
    const status = String(payload?.user_id || '').endsWith('1') ? 'member' : 'left';
    return res.end(JSON.stringify({ ok: true, result: { status } }));
  }
  if (method === 'sendPoll') {
    const id = ++seq;
    entry.pollId = 'poll' + RUN + id;
    return res.end(JSON.stringify({ ok: true, result: { message_id: id, poll: { id: 'poll' + RUN + id } } }));
  }
  return res.end(JSON.stringify({ ok: true, result: { message_id: ++seq } }));
}).listen(4555, () => console.log('fake telegram on 4555'));
