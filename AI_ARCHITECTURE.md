# AI arxitektura (holat: 2026-11-25)

- **Asosiy:** Google Gemini (`GEMINI_API_KEY`). `src/lib/universalAi.ts`. Model cooldown: 404 → 24 soat, 429 → 15 daqiqa, 503 → 60 soniya.
- **Zaxira:** `src/lib/aiRouter.ts` — Groq, DeepSeek, OpenRouter, Mistral. Har biri OpenAI-compatible; faqat kaliti bor provayder ishlaydi.
- **Cooldown:** 402 → 1 soat, 429 → 3 daqiqa, 401/403 → 30 daqiqa.
- **Owner ko'rinishi:** `app/api/owner/ai-providers` — faqat "kalit bor/yo'q", kalit hech qachon ko'rsatilmaydi.

Hali yo'q (TZ bo'yicha): task-based routing jadvali owner tomonidan o'zgartiriladigan konfiguratsiya; RPM/TPM/latency dashboard; response cache; circuit breaker (hozir faqat cooldown); benchmark tugmasi; xarajat limiti (kunlik AI daqiqa limiti bor, pul limiti yo'q).
