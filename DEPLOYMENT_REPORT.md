# Deploy hisoboti (2026-11-25)

| Commit | Mazmun | Render deploy | Holat |
|---|---|---|---|
| `c3770c7` | BlogPosting, AI gateway, AI_PROVIDER_SETUP.md | `dep-dc3bfq0jo6nc73eh6dj0` | live (10:29 UTC) |
| `eed1722` | Cerebras/SambaNova/Qwen olib tashlandi | auto-deploy kutilmoqda | tekshirilmagan |
| Keyingi commit | Guest rate limit | auto-deploy | tekshirilmagan |

Render servisi: `srv-dc0qserm8hqs73fc4bt0` (Edu-Level, Singapore, Free). Eski Ohio servisi (`srv-dbv741e7bikc73fp86dg`) o'chirilmagan.
Rollback: oldingi commit `fa31b42` ni Render'da qayta deploy qilish mumkin.

## 2026-11-25 — ikkinchi o'tish
- `0ea8b4b`: AI provayder counterlari + dependency patch. Render: `dep-dc3f0vo473hc73fnfr2g`, build → update_in_progress (kuzatuvda).
- Domen: `http://edulevel.uz` → 301 `https://edulevel.uz`. `edulevel-hdk8.onrender.com` → 301 `https://edulevel.uz`. `edu-level.onrender.com` → 200 (redirect qilinmaydi, chunki MASTER_PLAN'da Render manzili sifatida saqlangan). `www.edulevel.uz` → ulanmadi (DNS yoki TLS yo'q, DNS egasida).
- Google Change of Address: Search Console'da amalga oshirilmadi (connector yo'q, egasi qiladi).
