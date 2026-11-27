# AI_PROVIDER_STATUS (2026-11-26, commit eaa2354)
Qoida: yangi xarajat $0. Faqat Gemini, Groq, DeepSeek, Mistral, OpenRouter. Bu fayldagi "real" natijalar faqat owner paneldan olingan; men kalitlarni ko'rmayman.

| Provayder | Kodda holat | Oxirgi real natija (owner benchmarki, avval) | Hozirgi kod bilan qayta o'lchash |
|---|---|---|---|
| Groq | jonli model ro'yxatidan tanlanadi; 404 bo'lsa keyingi bepul modelga o'tadi | llama-3.3-70b-versatile: HTTP 404 | PENDING (owner "Benchmark") |
| OpenRouter | faqat `:free` va narx 0 (prompt+completion) jonli katalogdan | google/gemma-3-27b-it:free: HTTP 404 | PENDING |
| DeepSeek | integratsiya saqlangan; 402 bo'lsa 24 soatga routingdan chiqadi | deepseek-chat: HTTP 402 (balans) | bepul tarif yo'q — faol bo'lmaydi |
| Mistral | integratsiya saqlangan; 402 bo'lsa 24 soatga chiqadi; jonli ro'yxat | mistral-small-latest: HTTP 402 | hisob bepul chaqiruvni qo'llamasa o'chiq |
| Gemini | benchmarkka qo'shildi (stream, TTFT) | benchmarkda ko'rinmagan edi | PENDING (owner "Benchmark") |

Kod dalillari: src/lib/aiFreeOnly.ts, aiRouter.ts (resolveCandidates, benchmark), aiModelCatalog.ts, aiUsagePersist.ts; testlar: aiFreeOnly.test.ts, aiRouter.test.ts, aiModelCatalog.test.ts, aiUsagePersist.test.ts (mock). Mock testlar real provayder ishlashini isbotlamaydi.
Latency/TTFT/success rate qiymatlari yo'q: ular real benchmarkdan keyin shu faylga yoziladi (xato javob vaqti tezlik sifatida hisoblanmaydi).

## Haqiqiy production natijalari (owner paneldan, 2026-11-26)
| Provayder | Natija | Sabab / tuzatish |
|---|---|---|
| Gemini (Sinash) | javob berdi, 2063 ms | ishlaydi |
| Gemini benchmark | gemini-3.5-flash HTTP 429, 282 ms | model kvotasi; endi lite modellar birinchi, 429 bo'lsa kvota turiga qarab cooldown, benchmark keyingi modelga o'tadi (commit 1a19294) |
| Groq | openai/gpt-oss-20b: oqimda matn kelmadi | reasoning model token'ni o'ylashga sarflagan; endi reasoning_effort=low, token zaxirasi, bo'sh bo'lsa 3x bilan qayta urinish, keyin keyingi model; oddiy (non-reasoning) modellar birinchi |
| OpenRouter | nvidia/nemotron-3.5-super-vl:free: oqimda matn kelmadi | VL/reasoning model; endi oddiy chat modellari birinchi, reasoning exclude |
| DeepSeek | HTTP 402 | routingdan chiqarilgan; owner qo'lda yoqmaguncha so'rov yuborilmaydi |
| Mistral | HTTP 402 | xuddi shunday |

Holat: tuzatishlar IMPLEMENTED + mock testlar o'tdi (183 unit). Real qayta o'lchash PENDING (owner "Benchmark").
Eslatma: katalogdagi nomlar (gemma-4-*, nemotron-lightning, ling, lfm, gpt-oss-120b, audio modellar) avtomatik ishlatilmaydi: faqat narx 0 tasdiqlangan OpenRouter modellari va provayderning o'z ro'yxatidagi chat modellari chaqiriladi. Audio (whisper, orpheus, gemini live/tts) uchun bepul huquq tasdiqlanmagan: ishlatilmaydi.
