# AI provayderlarni sozlash (Render Environment Variables)

Kalitlar faqat serverda o‘qiladi. Ularni kodga, GitHub’ga, chatga yoki loglarga yozmang. Kalit qo‘yilgach
Render servisi qayta deploy bo‘ladi. Owner Panel → «Provayderlar» bo‘limida har bir provayder «ulangan» yoki
«ulanmagan» ko‘rinishda chiqadi; kalit hech qachon ko‘rsatilmaydi.

## Jadval (5 ta provayder)

| # | Provayder | Render env nomi | Rol | Model (standart, `*_MODEL` bilan almashtiriladi) | Kalit olish sahifasi |
|---|---|---|---|---|---|
| 1 | Google Gemini | `GEMINI_API_KEY` | Asosiy (EduBek chat, baholash) | avtomatik tanlanadi | aistudio.google.com → «Get API key» |
| 2 | Groq | `GROQ_API_KEY` | Zaxira, tez (ovozli suhbat) | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` | console.groq.com → API Keys |
| 3 | DeepSeek | `DEEPSEEK_API_KEY` | Zaxira | `deepseek-chat` | platform.deepseek.com → API keys |
| 4 | OpenRouter | `OPENROUTER_API_KEY` | Universal zaxira (bepul modellar) | jonli bepul modellar ro‘yxatidan | openrouter.ai → Keys |
| 5 | Mistral | `MISTRAL_API_KEY` | Zaxira | `mistral-small-latest`, `open-mistral-nemo` | console.mistral.ai → API Keys |

Model nomini o‘zgartirish uchun `<PROVAYDER>_MODEL` nomli env qo‘shing (masalan `DEEPSEEK_MODEL=deepseek-reasoner`).
Zaxira tartibini o‘zgartirish uchun `AI_FALLBACK_ORDER` (masalan `groq,deepseek`). Faqat kaliti
qo‘yilgan provayderlar ishlatiladi.

## Qoidalar

- Provayder pulli limit yoki balans tugasa (402), 1 soat chetlatiladi. 429 bo‘lsa 3 daqiqa. 401/403 bo‘lsa 30 daqiqa.
- 404 (model topilmadi) bo‘lsa, shu provayderning keyingi model nomi sinab ko‘riladi.
- Hech bir provayder ishlamasa, foydalanuvchiga «AI vaqtincha ishlamayapti» xabari chiqadi.
- Pulli modellar avtomatik tanlanmaydi: faqat bepul/arzon modellar ro‘yxatda.
- Yangi kalit qo‘shish, pulli xizmatni yoqish va balansni to‘ldirish egasining qarori.


## Zero-cost gate (V11)
Every AI request passes one gate (`src/lib/aiFreeOnly.ts`), fail-closed:
- **Gemini**: no generation request unless `GEMINI_FREE_TIER_CONFIRMED=1`. Until then EduBek uses the other confirmed providers (if any) or shows the "AI ulanmagan" message.
- **OpenRouter**: only `:free` models with price 0 for prompt and completion, read from its live catalogue. An empty or failed catalogue means nothing is called.
- **Groq, Mistral, DeepSeek, Cloudflare, SambaNova**: a model is called only when listed in `AI_CONFIRMED_FREE` as `provider:model`.
- **SiliconFlow**: treated as paid; only models listed in `AI_CONFIRMED_FREE` are called.
- A blocked call is never sent; the error says "bepul tasdiqlangan model yo‘q".
How to confirm: open the provider's billing / free-tier page for your account, check the model's price is zero (or the free allowance covers it), then add `provider:model` to `AI_CONFIRMED_FREE` on Render and redeploy. Do not add anything you cannot confirm.
