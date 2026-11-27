import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { rateLimit } from '@/src/lib/auth/rateLimit';
import { executeUniversalAi } from '@/src/lib/universalAi';
import { normalizeRecord } from '@/src/lib/seo/records';
import { availableFallbacks } from '@/src/lib/aiRouter';

export const dynamic = 'force-dynamic';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

const SYSTEM = `You write educational web pages in Uzbek (Latin script) for learners of English, for the EduLevel platform.
Rules:
- Original, useful teaching content: explanations, examples, short practice ideas, common mistakes. Not marketing copy.
- Never invent statistics, prices, exam results, reviews, student numbers, certificates or official rules you are not sure about. If a fact depends on an exam body, tell the reader to check that body's current announcement.
- Plain text only: no HTML, no Markdown.
- Output ONLY valid JSON: {"title":"<=65 chars","description":"90-155 chars","h1":"...","lead":"1-2 sentences","sections":[{"heading":"...","paragraphs":["..."],"items":["..."]}],"faq":[{"q":"...","a":"..."}]}
- 4 to 6 sections, at least 350 words in total, 3 to 5 real questions in faq.`;

/**
 * Owner-only: asks the AI for a DRAFT page. The draft is returned to the editor, not saved, and is marked as AI-written
 * and unreviewed: it cannot be published until the owner reads it and confirms the facts.
 */
async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const lim = rateLimit('seo-draft', 20, 60 * 60 * 1000);
  if (!lim.allowed) return NextResponse.json({ success: false, message: 'Soatiga 20 ta qoralama limiti tugadi.' }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { topic?: unknown; keyword?: unknown; level?: unknown };
  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 200) : '';
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim().slice(0, 100) : '';
  const level = typeof body.level === 'string' ? body.level.trim().slice(0, 20) : '';
  if (topic.length < 5) return NextResponse.json({ success: false, message: 'Mavzuni kiriting (kamida 5 belgi).' }, { status: 400 });
  if (!process.env.GEMINI_API_KEY?.trim() && availableFallbacks(process.env).length === 0) {
    return NextResponse.json({ success: false, message: 'AI kaliti sozlanmagan (GEMINI_API_KEY yoki zaxira kalit).' }, { status: 503 });
  }
  try {
    const raw = await executeUniversalAi({
      task: 'seo_content',
      systemInstruction: SYSTEM,
      prompt: `Topic: ${topic}\nMain search phrase (use naturally, do not stuff): ${keyword || topic}\nReader level: ${level || 'not specified'}`,
      temperature: 0.5,
      jsonMode: true,
      maxOutputTokens: 4000
    });
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    const draft = normalizeRecord({ ...parsed, id: slugify(keyword || topic), status: 'draft', aiGenerated: true, reviewed: false });
    if (!draft.sections.length) throw new Error('AI bo‘limlarni qaytarmadi');
    return NextResponse.json({ success: true, draft });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error && e.message ? `Qoralama yaratilmadi: ${e.message.slice(0, 120)}` : 'Qoralama yaratilmadi. Qayta urinib ko‘ring.' }, { status: 502 });
  }
}

export const POST = withDatabase(handlePost);
