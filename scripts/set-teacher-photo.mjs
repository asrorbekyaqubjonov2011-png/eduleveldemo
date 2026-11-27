#!/usr/bin/env node
// Uploads the teacher's photo through the owner account and sets it as the profile photo.
// The image is stored in Supabase Storage by the server (needs SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY on the server). Only use a photo of the teacher, with their consent.
//
// Usage: BASE=https://your-site OWNER_PASSWORD=... node scripts/set-teacher-photo.mjs <image.jpg>

import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
const OWNER_USERNAME = process.env.OWNER_USERNAME || 'jasurbek';
const file = process.argv[2];
const MAX_BYTES = 6 * 1024 * 1024;

if (!OWNER_PASSWORD || !file) {
  console.error('Usage: BASE=... OWNER_PASSWORD=... node scripts/set-teacher-photo.mjs <image.jpg>');
  process.exit(1);
}
const stat = fs.existsSync(file) ? fs.statSync(file) : null;
if (!stat || !stat.isFile()) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}
if (stat.size === 0 || stat.size > MAX_BYTES) {
  console.error('Image must be between 1 byte and 6 MB.');
  process.exit(1);
}

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ loginInput: OWNER_USERNAME, password: OWNER_PASSWORD })
});
const cookie = (login.headers.get('set-cookie') || '').match(/el_session=([^;]+)/)?.[1];
if (login.status !== 200 || !cookie) {
  console.error(`Owner login failed (HTTP ${login.status}).`);
  process.exit(1);
}
const headers = { 'content-type': 'application/json', cookie: `el_session=${cookie}` };

const ext = path.extname(file).toLowerCase().replace('.', '');
const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
const imageBase64 = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;

const upload = await fetch(`${BASE}/api/upload`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ imageBase64, filename: path.basename(file) })
});
const uploaded = await upload.json().catch(() => ({}));
if (!uploaded.success || !uploaded.url) {
  console.error(`Upload failed (HTTP ${upload.status}): ${uploaded.message || 'no details'}`);
  process.exit(1);
}

const save = await fetch(`${BASE}/api/owner/teacher-profile`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ photoUrl: uploaded.url })
});
const saved = await save.json().catch(() => ({}));
if (!saved.success) {
  console.error(`Saving the profile photo failed: ${saved.message || save.status}`);
  process.exit(1);
}
console.log(`Teacher photo set: ${saved.teacherProfile.photoUrl}`);
