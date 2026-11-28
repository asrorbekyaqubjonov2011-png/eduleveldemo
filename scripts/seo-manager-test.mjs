// SEO content manager regression test. LOCAL ONLY (creates and deletes throwaway pages in the local database).
// Usage: BASE_URL=http://localhost:3100 OWNER_USERNAME=jasurbek OWNER_PASSWORD=... node scripts/seo-manager-test.mjs
const base = process.env.BASE_URL || 'http://localhost:3100';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) { console.error('Refusing to run: BASE_URL must be a local server.'); process.exit(2); }
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) failures++; };
const cookieOf = (r) => (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
const call = async (who, method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(who ? { cookie: who } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, b: await r.json().catch(() => ({})) };
};
const ownerRes = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginInput: process.env.OWNER_USERNAME || 'jasurbek', password: process.env.OWNER_PASSWORD || '' }) });
const O = cookieOf(ownerRes);
const email = `seo-${Date.now()}@test.local`;
const S = cookieOf(await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Seo', surname: 'Test', identifier: email, email, password: 'Str0ng-Pass-123!', region: 'Toshkent' }) }));
if (!O || !S) { console.error('sign-in failed (set OWNER_PASSWORD)'); process.exit(1); }
if (process.env.NEXT_PUBLIC_SITE_URL !== 'https://edulevel.uz') {
  const indexNow = await call(O, 'POST', '/api/owner/indexnow', { action: 'urls', urls: ['https://edulevel.uz/ielts'] });
  check('preview refuses IndexNow submissions', indexNow.s === 409 && indexNow.b.code === 'INDEXNOW_PREVIEW');
}

const slug = `blog/test-${Date.now().toString(36)}`;
const long = (n, tag) => Array.from({ length: n }, (_, i) => `${tag}${i}`).join(' ');
const page = (over = {}) => ({
  id: slug, title: `Test sahifa ${slug}`, description: 'Bu sinov sahifasi uchun tavsif matni bo‘lib, qidiruvdagi ko‘rinishni tekshirish maqsadida yetarlicha uzun yozilgan.',
  h1: `Test sahifa H1 ${slug}`, lead: 'Bu sinov sahifasining kirish matni, u kamida qirq belgidan iborat bo‘lishi kerak.',
  sections: [{ heading: 'Birinchi', paragraphs: [long(140, 'alfa')] }, { heading: 'Ikkinchi', paragraphs: [long(140, 'beta')] }],
  faq: [{ q: 'Sinov savoli nima?', a: 'Bu sahifa nashr jarayonini tekshirish uchun yaratilgan sinov sahifasi.' }], related: ['/ielts'], reviewed: true, ...over
});

for (const [who, label, want] of [[null, 'anonymous', 401], [S, 'student', 403]]) {
  check(`${label}: list refused`, (await call(who, 'GET', '/api/owner/seo-pages')).s === want);
  check(`${label}: save refused`, (await call(who, 'POST', '/api/owner/seo-pages', { page: page() })).s === want);
  check(`${label}: delete refused`, (await call(who, 'DELETE', '/api/owner/seo-pages?id=x')).s === want);
  check(`${label}: AI draft refused`, (await call(who, 'POST', '/api/owner/seo-pages/draft', { topic: 'ielts writing' })).s === want);
}

const draft = await call(O, 'POST', '/api/owner/seo-pages', { page: page({ status: 'draft', reviewed: false, sections: [{ heading: 'Qisqa', paragraphs: ['qisqa matn'] }] }) });
check('a short unreviewed draft can be saved', draft.s === 200 && draft.b.saved === slug, String(draft.s));
const listed = draft.b.pages?.find((p) => p.id === slug);
check('the draft report lists the problems', listed?.validation.errors.length >= 2);
check('a draft is not public', (await fetch(`${base}/${slug}`)).status === 404);
check('publishing a weak page is refused', (await call(O, 'POST', '/api/owner/seo-pages', { originalId: slug, page: page({ status: 'published', reviewed: false }) })).s === 400);
check('HTML in the text is refused on publish', (await call(O, 'POST', '/api/owner/seo-pages', { originalId: slug, page: page({ status: 'published', lead: 'Bu <script>alert(1)</script> matn, qirq belgidan uzunroq qilib yozilgan kirish.' }) })).s === 400);
check('a code page address is refused', (await call(O, 'POST', '/api/owner/seo-pages', { page: page({ id: 'ielts', status: 'published' }) })).s === 400);
check('a reserved address is refused', (await call(O, 'POST', '/api/owner/seo-pages', { page: page({ id: 'api/x', status: 'published' }) })).s === 400);
check('the same title as a code page is refused', (await call(O, 'POST', '/api/owner/seo-pages', { originalId: slug, page: page({ status: 'published', title: 'IELTS imtihoniga tayyorlanish — barcha modullar | EduLevel' }) })).s === 400);

const pub = await call(O, 'POST', '/api/owner/seo-pages', { originalId: slug, page: page({ status: 'published' }) });
check('a complete, reviewed page publishes', pub.s === 200, String(pub.s) + ' ' + (pub.b.message || ''));
const html = await (await fetch(`${base}/${slug}`)).text();
check('the published page is public with one H1', html.includes(`Test sahifa H1 ${slug}`) && (html.match(/<h1/g) || []).length === 1);
check('FAQPage data is in the page', html.includes('FAQPage'));
const canonicalDeployment = process.env.NEXT_PUBLIC_SITE_URL === 'https://edulevel.uz';
check('the page indexing matches the deployment', canonicalDeployment ? !/noindex/.test(html) : /noindex/.test(html));
const sm = await (await fetch(`${base}/sitemap.xml`)).text();
check('the sitemap lists it', sm.includes(`/${slug}</loc>`));
check('the owner link appears in the navigation of other pages', (await (await fetch(`${base}/ielts`)).text()).includes(`href="/${slug}"`));

const hidden = await call(O, 'POST', '/api/owner/seo-pages', { originalId: slug, page: page({ status: 'published', noindex: true }) });
check('noindex can be set', hidden.s === 200);
const html2 = await (await fetch(`${base}/${slug}`)).text();
check('a noindex page carries the robots tag and leaves the sitemap', /noindex/.test(html2) && !(await (await fetch(`${base}/sitemap.xml`)).text()).includes(`/${slug}</loc>`));

const unpub = await call(O, 'POST', '/api/owner/seo-pages', { originalId: slug, page: page({ status: 'draft' }) });
check('unpublish works', unpub.s === 200);
check('an unpublished page is gone', (await fetch(`${base}/${slug}`)).status === 404);
const history = unpub.b.pages.find((p) => p.id === slug).history.map((h) => h.action);
check('history records publish and unpublish', history.includes('published') && history.includes('unpublished'));

check('AI draft without any key is refused clearly', [502, 503].includes((await call(O, 'POST', '/api/owner/seo-pages/draft', { topic: 'IELTS Speaking Part 2 maslahatlari' })).s));
check('delete works', (await call(O, 'DELETE', `/api/owner/seo-pages?id=${encodeURIComponent(slug)}`)).s === 200);
check('delete of a missing page is 404', (await call(O, 'DELETE', `/api/owner/seo-pages?id=${encodeURIComponent(slug)}`)).s === 404);
const audit = (await call(O, 'GET', '/api/db/all')).b.data.auditLogs || [];
check('audit log records SEO actions', audit.some((a) => /seo_page/.test(a.action)));
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('All SEO manager checks passed');
