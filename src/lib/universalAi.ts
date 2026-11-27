import { GoogleGenAI } from '@google/genai';
import { noteAiCall, type AiCallRecord } from './aiStats';
import { scenarioById } from './edubekScenarios';
import { runFallbackChain } from './aiRouter';
import { defaultTimeoutMs, fallbackIds, resolveRoute, routeConfig, type AiTaskId, type RoutingConfig } from './aiRouting';
import { CostBlockedError, geminiAllowed } from './aiFreeOnly';

/** Cost gate for every Gemini generation request: refused unless the owner confirmed the free tier. */
export function assertGeminiAllowed(): void {
  if (!geminiAllowed()) throw new CostBlockedError('gemini', 'generateContent', 'FREE_UNVERIFIED');
}
import { AnswerCache, sharedAnswerCache } from './aiCache';

export interface AIProviderConfig {
  provider: 'gemini' | 'groq' | 'openai' | 'openrouter' | 'anthropic' | 'deepseek';
  model: string;
  label: string;
  speedDesc: string;
  endpoint: string;
  isFreeTierAvailable?: boolean;
}

/**
 * Automatically detects the AI provider and picks the fastest, optimal model
 * based strictly on the API key format — no manual model selection needed.
 */
/** Thrown when the AI provider fails: callers must report it, never invent a result. */
export class AiUnavailableError extends Error {
  /** Provider error text: logged on the server and shown only to the owner. */
  public detail: string;
  constructor(public operation: string, public cause?: unknown) {
    super(`${operation}: AI xizmati hozir javob bermadi. Birozdan so‘ng qayta urinib ko‘ring.`);
    this.name = 'AiUnavailableError';
    this.detail = cause instanceof Error ? cause.message.slice(0, 450) : '';
  }
}

/** Curated template tests (not AI output) the owner can load explicitly. */
export function getTemplateTest(track: 'cefr' | 'ielts' | 'general', title?: string) {
  const t = track === 'cefr' ? getFallbackCefrTest(title) : track === 'ielts' ? getFallbackIeltsTest(title) : getFallbackGeneralTest(title);
  return { ...t, isTemplate: true };
}

/** Primary model: Google Gemma through the Gemini API. Gemini flash models stay as fallbacks. */
const GEMMA_MODEL = (process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it').trim();
const isGemmaModel = (m: string) => /^gemma/i.test(m);

const AI_TIMEOUT_MS = 25_000;
/** A short text answer: a model that has not answered in 12 s is left to the race (the other models answer instead). */
const AI_FAST_TIMEOUT_MS = 12_000;
/** No new model is tried after this much time has passed since the request began. */
const AI_TOTAL_DEADLINE_MS = 30_000;
/** A chat answer that takes longer than this is handed to the fallback providers instead of keeping the student waiting. */
const AI_CHAT_DEADLINE_MS = 15_000;
export function withTimeout<T>(p: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`AI so‘rovi ${Math.round(ms / 1000)} soniyada javob bermadi`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export function detectAiProviderAndModel(rawKey?: string): AIProviderConfig {
  const key = (rawKey || '').trim().replace(/^['"]|['"]$/g, '');

  if (!key) {
    return {
      provider: 'gemini',
      model: GEMMA_MODEL,
      label: `Google Gemma (${GEMMA_MODEL})`,
      speedDesc: 'Tez va aniq javoblar',
      endpoint: '',
      isFreeTierAvailable: true
    };
  }

  // 1. Groq - World's fastest inference engine (500-800 tok/s) - 100% free at console.groq.com
  if (key.startsWith('gsk_')) {
    return {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      label: 'Groq LPU (Ultra-Tezkor 600+ tok/s)',
      speedDesc: 'Dunyoning eng tezkor arxitekturasi (~0.2s javob, Llama 3.3 70B)',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      isFreeTierAvailable: true
    };
  }

  // 2. OpenRouter - Multi-model ultra gateway
  if (key.startsWith('sk-or-')) {
    return {
      provider: 'openrouter',
      model: 'google/gemini-2.0-flash-exp:free',
      label: 'OpenRouter Universal Gateway',
      speedDesc: 'Avtomatik past kechikishli bepul model (~0.5s)',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      isFreeTierAvailable: true
    };
  }

  // 3. Anthropic Claude
  if (key.startsWith('sk-ant-')) {
    return {
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
      label: 'Anthropic Claude 3.5 Haiku',
      speedDesc: 'Yuqori intellekt va tezkor mantiqiy yechim (~0.6s)',
      endpoint: 'https://api.anthropic.com/v1/messages',
      isFreeTierAvailable: false
    };
  }

  // 4. OpenAI ChatGPT or DeepSeek
  if (key.startsWith('sk-')) {
    if (key.length === 35 || key.includes('deepseek')) {
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        label: 'DeepSeek-V3 / Chat',
        speedDesc: 'STEM va akademik tahlil (~0.7s)',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        isFreeTierAvailable: false
      };
    }

    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      label: 'OpenAI GPT-4o Mini',
      speedDesc: 'Eng tezkor va aniq ChatGPT modeli (~0.5s)',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      isFreeTierAvailable: false
    };
  }

  // 5. Google Gemini default (AIzaSy... or AQ.... or custom key)
  return {
    provider: 'gemini',
    model: GEMMA_MODEL,
    label: `Google Gemma (${GEMMA_MODEL})`,
    speedDesc: 'IELTS/CEFR tahlili',
    endpoint: '',
    isFreeTierAvailable: true
  };
}

export interface UniversalAiCallOptions {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  jsonMode?: boolean;
  apiKey?: string;
  /** Upper bound for the answer length: shorter answers arrive sooner. */
  maxOutputTokens?: number;
  /** What the call is for: the owner's routing table decides which provider goes first (see aiRouting.ts). */
  task?: AiTaskId;
  /** Only for answers that do not depend on who asks (e.g. a word translation): identical calls are answered from a short cache. */
  cacheable?: boolean;
}

const TRANSIENT_AI_ERROR = /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i;

/** Retries short-lived provider failures (rate limit, overload) with a growing pause. */
async function retryTransient<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      last = e;
      if (i === attempts - 1 || !TRANSIENT_AI_ERROR.test(String(e?.message || e))) throw e;
      await new Promise((r) => setTimeout(r, 700 * 2 ** i));
    }
  }
  throw last;
}

const GEMINI_MODELS = Array.from(
  new Set([GEMMA_MODEL, process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest'].filter((m): m is string => Boolean(m && m.trim())).map((m) => m!.trim()))
);
/** A key the provider rejects will be rejected by every model: stop instead of trying them all. */
const isKeyProblem = (e: any) => /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|API key expired/i.test(String(e?.message || e));

export interface ModelDiscovery {
  ok: boolean;
  status?: number;
  ms: number;
  names: string[];
  error?: string;
}

/** Asks Google which models this key can call for generateContent (8 s limit). */
export async function listGenerativeModels(apiKey: string): Promise<ModelDiscovery> {
  const t0 = Date.now();
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(8000)
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, ms: Date.now() - t0, names: [], error: String(j?.error?.message || res.statusText).slice(0, 200) };
    const names = (j.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m: any) => String(m.name).replace(/^models\//, ''));
    return { ok: true, status: res.status, ms: Date.now() - t0, names };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, names: [], error: String(e?.message || e).slice(0, 200) };
  }
}

/** One tiny real request, straight over REST: the time it takes, or the exact error. */
export async function probeGenerate(
  apiKey: string,
  model: string,
  opts: { thinking?: Record<string, unknown>; prompt?: string } = {}
): Promise<{ model: string; ok: boolean; status?: number; ms: number; reply?: string; parts?: string; error?: string }> {
  const t0 = Date.now();
  try {
    assertGeminiAllowed();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: opts.prompt || 'Reply with the single word OK.' }] }],
        ...(opts.thinking ? { generationConfig: { thinkingConfig: opts.thinking } } : {})
      }),
      signal: AbortSignal.timeout(40000)
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { model, ok: false, status: res.status, ms: Date.now() - t0, error: String(j?.error?.message || res.statusText).slice(0, 160) };
    const parts: any[] = j?.candidates?.[0]?.content?.parts || [];
    const reply = parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim().slice(0, 60);
    return { model, ok: true, status: res.status, ms: Date.now() - t0, reply, parts: parts.map((p) => (p.thought ? 'thought' : 'text') + ':' + String(p.text || '').length).join(',') };
  } catch (e: any) {
    return { model, ok: false, ms: Date.now() - t0, error: String(e?.message || e).slice(0, 160) };
  }
}

const modelCache = new Map<string, { at: number; models: string[] }>();

/**
 * A model that just failed in a way that will not clear in seconds is skipped for a while: a retired model (404) is
 * skipped for a day, a quota-exhausted one (429) for 15 minutes, an overloaded one (503/500) for a minute. Without this
 * every question tried the same dead models first and waited for them.
 */
const modelCooldown = new Map<string, number>();
/**
 * How long a model that answered 429 is left alone. Google names the quota: a per-day quota ("PerDay") will not clear
 * for hours, so the model is rechecked after an hour; otherwise the retry delay Google gives is honoured (with a small margin).
 */
export function quotaCooldownMs(message: string): number {
  if (/PerDay|per day|daily/i.test(message)) return 60 * 60_000;
  const m = message.match(/retry(?:Delay)?\W{1,6}(?:in\s+)?(\d+(?:\.\d+)?)\s*s/i);
  if (m) return Math.min(15 * 60_000, Math.max(20_000, Math.ceil(Number(m[1])) * 1000 + 2000));
  return 5 * 60_000;
}
export function modelCoolingDown(model: string, now = Date.now()): boolean {
  return (modelCooldown.get(model) || 0) > now;
}
export function markModelFailed(model: string, message: string): void {
  const m = String(message || '');
  const ms = /\b404\b|no longer available|not found/i.test(m) ? 24 * 3_600_000
    : /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(m) ? quotaCooldownMs(m)
    : /\b403\b|PERMISSION_DENIED/i.test(m) ? 60 * 60_000
    : /\b500\b|\b503\b|UNAVAILABLE|overloaded|high demand/i.test(m) ? 60_000
    : 0;
  if (ms > 0) modelCooldown.set(model, Date.now() + ms);
}
export function usableModels(models: string[]): string[] {
  const now = Date.now();
  return models.filter((m) => (modelCooldown.get(m) || 0) <= now);
}

/** Models to try, in order: Gemma first, then Gemini flash. Taken from what the key really offers when Google answers. */
export async function pickGeminiModels(apiKey: string): Promise<string[]> {
  const cacheKey = apiKey.slice(-8);
  const hit = modelCache.get(cacheKey);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.models;
  const info = await listGenerativeModels(apiKey);
  let models = GEMINI_MODELS;
  if (info.ok && info.names.length) {
    const has = new Set(info.names);
    // Only models the key really lists are used (a retired model is never sent).
    // Lite models first: they have the roomiest free quota and answer fastest. gemini-3.5-flash answered HTTP 429 on the
    // owner's free key, so it comes after them (and is skipped while it cools down).
    const first = [process.env.GEMINI_MODEL || '', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', GEMMA_MODEL, 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    const extra = info.names.filter((n) => /^gemini-[\d.]+-flash(-lite)?$/.test(n));
    const picked = Array.from(new Set([...first, ...extra].filter((m) => m && has.has(m)))).slice(0, 5);
    if (picked.length) models = picked;
  }
  // An unreachable list is retried soon; a good one is kept for an hour.
  modelCache.set(cacheKey, { at: info.ok ? Date.now() : Date.now() - 3_540_000, models });
  return models;
}

/** Token counts the provider reports for one answer (thinking tokens count as output: they are billed as such). */
function tokenUsage(response: any): { inTok: number; outTok: number } {
  const u = response?.usageMetadata || {};
  return { inTok: Number(u.promptTokenCount) || 0, outTok: (Number(u.candidatesTokenCount) || 0) + (Number(u.thoughtsTokenCount) || 0) };
}

let refreshing: Promise<string[]> | null = null;
/**
 * The model order without making a student wait for Google's model list: a known list is used at once,
 * an unknown one gets at most 400 ms (the discovery keeps running and fills the cache for the next question).
 */
export async function pickGeminiModelsFast(apiKey: string): Promise<string[]> {
  const hit = modelCache.get(apiKey.slice(-8));
  if (hit) {
    if (Date.now() - hit.at >= 3_000_000 && !refreshing) refreshing = pickGeminiModels(apiKey).finally(() => { refreshing = null; }); // refresh quietly
    return hit.models;
  }
  const discovery = (refreshing ||= pickGeminiModels(apiKey).finally(() => { refreshing = null; }));
  return Promise.race([discovery, new Promise<string[]>((r) => setTimeout(() => r(GEMINI_MODELS), 400))]);
}

/** The answer text without the model's reasoning parts (Gemma 4 sends its thoughts as parts flagged `thought`). */
function visibleText(response: any): string {
  const parts: any[] = response?.candidates?.[0]?.content?.parts || [];
  const answer = parts.filter((p) => typeof p?.text === 'string' && !p.thought).map((p) => p.text).join('');
  return (parts.length ? answer : (response?.text || '')).trim();
}

/** Gemma has no JSON mode: pull the JSON out of the reply (fences and chatter removed). */
function extractJson(text: string): string {
  const t = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  const a = t.search(/[\[{]/);
  const b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
}

export async function executeUniversalAi(options: UniversalAiCallOptions): Promise<string> {
  if (!options.cacheable || options.apiKey) return executeUniversalAiUncached(options);
  const key = AnswerCache.key([options.task ?? 'general', options.systemInstruction ?? '', options.prompt, options.temperature ?? 0.2, options.jsonMode ?? false, options.maxOutputTokens ?? 0]);
  return sharedAnswerCache.get(key, () => executeUniversalAiUncached(options));
}

async function executeUniversalAiUncached(options: UniversalAiCallOptions): Promise<string> {
  const { systemInstruction, prompt, temperature = 0.2, jsonMode = false, maxOutputTokens } = options;
  // Only server-managed, verified-free accounts may generate content. A caller-supplied key
  // cannot establish its billing status or bypass owner routing.
  const key = (process.env.GEMINI_API_KEY || '').trim();
  const task = options.task ?? 'general';
  const timeoutMs = routeConfig(task).timeoutMs ?? (jsonMode ? AI_TOTAL_DEADLINE_MS : defaultTimeoutMs(task));
  const signal = AbortSignal.timeout(timeoutMs);
  const route = resolveRoute(task, { hasGeminiKey: Boolean(key) && geminiAllowed() });
  let last: unknown = new Error('Bepul AI provayderi mavjud emas');
  for (const id of route) {
    if (signal.aborted) break;
    if (id === 'gemini') {
      const models = usableModels(await pickGeminiModelsFast(key)).slice(0, 2);
      const ai = new GoogleGenAI({ apiKey: key });
      for (const model of models) {
        if (signal.aborted) break;
        const start = Date.now();
        const attempt = AbortSignal.any([signal, AbortSignal.timeout(jsonMode ? 14_000 : 5_000)]);
        try {
          assertGeminiAllowed();
          const gemma = isGemmaModel(model);
          const contents = gemma
            ? [systemInstruction, prompt, jsonMode ? 'Return ONLY valid JSON.' : ''].filter(Boolean).join('\n\n')
            : prompt;
          const response = await ai.models.generateContent({
            model, contents,
            config: {
              abortSignal: attempt,
              ...(!gemma && systemInstruction ? { systemInstruction } : {}),
              ...(!gemma && jsonMode ? { responseMimeType: 'application/json' } : {}),
              temperature,
              ...(maxOutputTokens ? { maxOutputTokens } : {})
            }
          });
          let answer = visibleText(response);
          if (!answer) throw new Error('AI bo‘sh javob berdi');
          if (jsonMode) { answer = extractJson(answer); JSON.parse(answer); }
          noteAiCall({ model, provider: id, ok: true, ms: Date.now() - start, ...tokenUsage(response) });
          return answer;
        } catch (error) {
          last = error;
          markModelFailed(model, error instanceof Error ? error.message : '');
          noteAiCall({ model, provider: id, ok: false, ms: Date.now() - start, inTok: 0, outTok: 0, error: 'AI so‘rovi muvaffaqiyatsiz' });
        }
      }
      continue;
    }
    try {
      const result = await runFallbackChain({
        system: systemInstruction, prompt, temperature, jsonMode, maxTokens: maxOutputTokens,
        timeoutMs: jsonMode ? 14_000 : 5_000, signal
      }, process.env, fetch, undefined, fallbackIds([id]));
      let answer = result.text.trim();
      if (!answer) throw new Error('AI bo‘sh javob berdi');
      if (jsonMode) { answer = extractJson(answer); JSON.parse(answer); }
      noteAiCall({ model: result.model, provider: result.provider, ok: true, ms: result.ms, inTok: result.inTok, outTok: result.outTok });
      return answer;
    } catch (error) {
      last = error;
      noteAiCall({ model: id, provider: id, ok: false, ms: 0, inTok: 0, outTok: 0, error: 'AI so‘rovi muvaffaqiyatsiz' });
    }
  }
  throw new AiUnavailableError(task, last);
}

// -------------------------------------------------------------
// DOMAIN-SPECIFIC AI AGENTS (IELTS & CEFR EVALUATION SERVICES)
// -------------------------------------------------------------

/**
 * 1. AI Real-Format Writing Grader
 * Evaluates essay against the 4 official criteria and outputs color-coded feedback + Band 9 & C1 rewrites.
 */
export async function gradeWritingEssayWithAi(params: {
  essayText: string;
  taskPrompt: string;
  taskType?: string;
  examSystem?: 'ielts' | 'multilevel' | 'cefr';
  apiKey?: string;
}) {
  const { essayText, taskPrompt, taskType = 'task2', examSystem = 'ielts', apiKey } = params;

  const systemInstruction = `You are an official certified IELTS & Multilevel CEFR Master Examiner following the official 2026 Assessment Specification.
EVALUATION PROTOCOL (Section 14.3 of Specification):
1. Deconstruct the prompt into atomic requirements and check if each is addressed.
2. For each criterion, provide textual evidence from the candidate's text; NEVER award a band or score without quoting evidence.
3. Grammar errors format: "original fragment" -> "correction" -> "concise pedagogical explanation".
4. Personal opinions or candidate viewpoints MUST NOT influence the score.
5. WEIGHTING:
   - For IELTS: Task 2 carries TWICE the weight of Task 1. Criteria: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy (0.0 to 9.0 Band).
   - For Multilevel CEFR: Task 1 carries 33% (max 12 points, 100-150 words), Task 2 carries 67% (max 24 points, 200-250 words). Total scaled to 75-point official scale (C1: 65-75, B2: 51-64, B1: 38-50, <38: B1 dan quyi).
6. State clearly that this is an "AI Diagnostik Taxmini" (Diagnostic Estimate).

You MUST output your response strictly as valid, parsable JSON with this exact schema:
{
  "examSystem": "ielts" | "multilevel",
  "overallBand": 7.5,
  "cefrScore75": 66,
  "cefrLevel": "C1",
  "taskAchievementScore": 7.5,
  "coherenceScore": 7.0,
  "lexicalScore": 8.0,
  "grammarScore": 7.5,
  "wordCount": 278,
  "isWordCountSufficient": true,
  "criteriaEvidence": {
    "taskResponse": "Quote from text proving how requirements were satisfied...",
    "coherence": "Quote demonstrating paragraph transition...",
    "lexical": "High-level collocations and words identified in the essay...",
    "grammar": "Complex grammatical structures observed (e.g. inversion, passive, conditional)..."
  },
  "feedback": "Comprehensive, constructive feedback in Uzbek with clear practice guidelines...",
  "colorCodedErrors": [
    {
      "phrase": "exact fragment from student text",
      "type": "grammar" | "repetition" | "cohesion" | "c1_idiom",
      "suggestion": "corrected version",
      "reason": "Original -> Correction -> Qisqa izoh (Section 14.3 format)"
    }
  ],
  "rewrittenBand9": "A full Band 9.0 / C1 high-tier version of this essay with pristine cohesion and sophisticated vocabulary...",
  "rewrittenC1": "A polished, natural C1 level version of this essay..."
}`;

  const prompt = `Exam System: ${examSystem.toUpperCase()}
Task Prompt: "${taskPrompt}"
Task Type: ${taskType}

Candidate's Submission:
"""
${essayText}
"""

Evaluate this essay strictly following the official protocol. Return ONLY valid JSON.`;

  try {
    const raw = await executeUniversalAi({ task: 'writing_grade',
      apiKey,
      systemInstruction,
      prompt,
      temperature: 0.1,
      jsonMode: true
    });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    throw new AiUnavailableError('Writing baholash', e);
  }
}

/**
 * 2. Virtual AI Speaking Examiner
 * Evaluates candidate audio transcript, calculates WPM, filler words, fluency, lexical, grammar, pronunciation.
 * Follows Section 14.4: 4 criteria separated, evidence citations, 3-5 specific errors, practice advice.
 */
export async function evaluateSpeakingWithAi(params: {
  transcript: string;
  topicPrompt: string;
  part: number | string;
  durationSeconds?: number;
  examSystem?: 'ielts' | 'multilevel' | 'cefr';
  apiKey?: string;
}) {
  const { transcript, topicPrompt, part, durationSeconds = 60, examSystem = 'ielts', apiKey } = params;

  const systemInstruction = `You are a certified IELTS & Multilevel Speaking Examiner following Section 14.4 of the Official 2026 Examination Protocol.
RULES:
1. Evaluate Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation as distinct, independent criteria.
2. Focus on English communicative competence, NOT the historical/factual truth of personal anecdotes.
3. For each criterion, cite 2-3 pieces of direct evidence from the transcript.
4. Identify 3 to 5 specific errors with corrections and explanations.
5. Provide a model upgraded answer and tailored practice drills.
6. Return "AI Diagnostik Taxmini" (Diagnostic Estimate).

Output strictly valid JSON matching this schema:
{
  "examSystem": "ielts" | "multilevel",
  "overallBand": 7.5,
  "cefrLevel": "C1",
  "cefrScore75": 66,
  "fluencyScore": 7.5,
  "lexicalScore": 8.0,
  "grammarScore": 7.0,
  "pronunciationScore": 7.5,
  "wpm": 128,
  "fillerWords": ["um", "like", "you know"],
  "fillerWordsCount": 3,
  "evidencePerCriterion": {
    "fluency": "Smooth continuity observed in main argument...",
    "lexical": "Precise collocations like 'empirical evidence' used...",
    "grammar": "Effective use of complex subordinate clauses...",
    "pronunciation": "Natural rhythm and thought grouping evident..."
  },
  "specificErrors": [
    { "errorFragment": "...", "correction": "...", "explanation": "..." }
  ],
  "improvedSampleAnswer": "A full, fluent Model Part 2/3 response demonstrating Band 8.5/C1 communication...",
  "practiceRecommendations": [
    "Drill 1: Replace 'um' with natural delay markers like 'To be more precise'...",
    "Drill 2: Expand Part 3 answers with conditional justifications..."
  ],
  "detailedFeedback": "Constructive overview in Uzbek explaining strengths and key focus areas..."
}`;

  const prompt = `Exam System: ${examSystem.toUpperCase()}
Topic / Cue Card: "${topicPrompt}"
Speaking Part: ${part}
Duration: ${durationSeconds} seconds
Candidate Transcript:
"""
${transcript}
"""

Evaluate this speaking performance now. Return ONLY valid JSON.`;

  try {
    const raw = await executeUniversalAi({ task: 'speaking_grade',
      apiKey,
      systemInstruction,
      prompt,
      temperature: 0.2,
      jsonMode: true
    });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    throw new AiUnavailableError('Speaking baholash', e);
  }
}

/**
 * 3. 3-Level Contextual Translator (B1, B2, C1)
 * Upgrades words from simple to academic C1/C2 level with 3 examples each.
 */
export async function translate3LevelWithAi(query: string, apiKey?: string) {
  const systemInstruction = `You are the Edu Level 3-Tier Academic Vocabulary Engine.
For any given word or short phrase, generate:
1. Level B1 version (accessible, foundational)
2. Level B2 version (intermediate, communicative)
3. Level C1/C2 version (prestigious, academic IELTS 8.5/CEFR C1)
Each level MUST include: the word, IPA transcription, clear Uzbek meaning, and exactly 3 natural sample sentences in English with their accurate Uzbek translations.

Output strictly JSON:
{
  "englishQuery": "${query}",
  "partOfSpeech": "adjective / noun / verb",
  "b1": {
    "word": "...",
    "ipa": "/.../",
    "meaningUz": "...",
    "examples": [
      { "en": "...", "uz": "..." },
      { "en": "...", "uz": "..." },
      { "en": "...", "uz": "..." }
    ]
  },
  "b2": {
    "word": "...",
    "ipa": "/.../",
    "meaningUz": "...",
    "examples": [
      { "en": "...", "uz": "..." },
      { "en": "...", "uz": "..." },
      { "en": "...", "uz": "..." }
    ]
  },
  "c1": {
    "word": "...",
    "ipa": "/.../",
    "meaningUz": "...",
    "examples": [
      { "en": "...", "uz": "..." },
      { "en": "...", "uz": "..." },
      { "en": "...", "uz": "..." }
    ]
  }
}`;

  try {
    const raw = await executeUniversalAi({ task: 'translation', cacheable: true,
      apiKey,
      systemInstruction,
      prompt: `Translate and upgrade this term: "${query}"`,
      temperature: 0.1,
      jsonMode: true
    });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    throw new AiUnavailableError('Tarjima', e);
  }
}

/**
 * 4. 24/7 AI Tutor Chat
 * Answers English grammar, writing, vocabulary questions, and references lesson codes in clear Uzbek & English.
 */
const LEVEL_GUIDE: Record<string, string> = {
  A2: "so'zlar oddiy bo'lsin, gaplar qisqa; grammatika atamalarini kamroq ishlat",
  B1: "aniq va tushunarli tushuntir; asosiy grammatika atamalarini o'zbekcha izoh bilan ber",
  B2: "batafsil tushuntir; sinonim va kontekstga oid misollar qo'sh",
  C1: "akademik darajada tushuntir; nozik farqlar va uslubiy jihatlarni ko'rsat"
};

/** The lesson the student picked: its konspekt (written by the owner) is the AI's source. */
export interface LessonMaterial {
  title: string;
  code?: string;
  description?: string;
  notes?: string;
  homework?: string;
}

export interface TutorTurn {
  sender: 'user' | 'ai';
  text: string;
}

const MAX_NOTES_CHARS = 12000;

function lessonBlock(lesson: LessonMaterial): string {
  const notes = (lesson.notes || '').trim().slice(0, MAX_NOTES_CHARS);
  const parts = [`DARS: ${lesson.title}${lesson.code ? ` (kod: ${lesson.code})` : ''}`];
  if (lesson.description?.trim()) parts.push(`Tavsif: ${lesson.description.trim().slice(0, 1000)}`);
  parts.push(
    notes
      ? `DARS KONSPEKTI (o'qituvchi yozgan, asosiy manba):\n"""\n${notes}\n"""`
      : 'Bu dars uchun konspekt hali yozilmagan: faqat sarlavha va tavsifga tayan.'
  );
  if (lesson.homework?.trim()) parts.push(`Uy vazifasi: ${lesson.homework.trim().slice(0, 1000)}`);
  return parts.join('\n');
}

export interface TutorParams {
  userMessage: string;
  routing?: RoutingConfig;
  lesson?: LessonMaterial;
  /** Recent turns of this conversation, oldest first. Lets Edubek keep talking in context. */
  history?: TutorTurn[];
  studentName?: string;
  vipTier?: string;
  mode?: 'tutor' | 'explain';
  level?: string;
  /** Children's mode: very short sentences and plain words (for readers around 10 years old). */
  simple?: boolean;
  /** Spoken conversation: short English turns, one question back, gentle corrections. */
  talk?: boolean;
  /** Practice mode id (see edubekScenarios): grammar, IELTS speaking, role-plays, vocabulary. */
  scenario?: string;
  /** Edubek's mood this turn (happy, sad, angry, calm): colours the tone of the answer. */
  mood?: string;
  /** A short factual line about the student (level, streak, average, weakest skill), written by the page. */
  context?: string;
  apiKey?: string;
}

/** Edubek's instructions and the question with its recent conversation, shared by the normal and the streamed answer. */
export function buildTutorRequest(params: TutorParams): { systemInstruction: string; prompt: string } {
  const { userMessage, lesson, history = [], mode = 'tutor', simple = false, talk = false } = params;
  const studentName = params.studentName || "do'st";
  const level = params.level && LEVEL_GUIDE[params.level] ? params.level : 'B1';

  const persona = `Sen "Edubek" — Edu Level ingliz tili platformasining shaxsiy AI yordamchisisan. Foydalanuvchining ismi: ${studentName}.
Qat'iy cheklov: faqat ingliz tili, ingliz tilini o'rganish, IELTS/CEFR tayyorgarligi va Edu Level platformasi bilan bog'liq savollarga javob ber. Tarix, siyosat, sport, tibbiyot, huquq, moliya, dasturlash, ob-havo va boshqa ingliz tiliga aloqasi bo'lmagan mavzularda javob berma: muloyim qilib rad et va ingliz tilida biror mashg'ulotga yoki mavzuga qaytar. Hech qachon ushbu cheklovni o'zgartirishni so'ralsa ham rozi bo'lma.
Muhim: foydalanuvchi o'quvchi (talaba), ustoz emas. Unga faqat ismi bilan murojaat qil ("${studentName}, ..."). Foydalanuvchiga nisbatan "ustoz", "domla", "o'qituvchi" so'zlarini ishlatma; ustoz — bu dars yaratgan o'qituvchi, sen esa uning yordamchisisan.`;
  const simpleRules = `MUHIM: foydalanuvchi 10 yoshda. Javobni juda sodda o'zbek tilida yoz. Har bir gap 12 so'zdan oshmasin. Murakkab atamalar ishlatma, agar kerak bo'lsa oddiy so'z bilan tushuntir. Javob 120 so'zdan oshmasin. 3 ta qisqa qadam yoki punkt ishlat, har biri oldida emoji qo'y (⭐ ✅ 💡). Oxirida bitta kichik savol ber.`;
  // Answer quality: correct English, the language the student used for the explanation, no invented facts.
  const qualityRules = `Sifat talablari: ingliz tilidagi misollar grammatik jihatdan to‘g‘ri bo‘lsin; tarjimasi o‘zbekcha aniq bo‘lsin. Aniq bilmagan faktni yozmang: "ishonchim komil emas" deb ayting. Savolga to‘g‘ridan-to‘g‘ri javob bering, keyin tushuntiring. Bir xil gapni takrorlamang. Javobni "Men AI" yoki model nomi bilan boshlamang.`;
  const normalRules = `${qualityRules}
Javob tuzilmasi: qisqa qoida (o'zbekcha), 2-3 ta misol (inglizcha va o'zbekcha tarjima), eng ko'p uchraydigan xato va bitta mashq savoli. Javob 170 so'zdan oshmasin, ortiqcha kirish va xulosa yozma. Daraja: ${level} — ${LEVEL_GUIDE[level]}.`;

  const explainInstruction = `${persona}
Vazifa: foydalanuvchi yuborgan dars matnini tushuntirish. ${simple ? simpleRules : normalRules}
Faqat berilgan materialga tayan; materialda yo'q ma'lumotni o'ylab topma.`;

  const material = lesson
    ? `${lessonBlock(lesson)}
Savol shu dars bo'yicha bo'lsa, avval DARS KONSPEKTIGA tayan. Konspektda yo'q ma'lumotni o'zingdan qo'shma: "Bu ma'lumot dars konspektida yo'q" deb ayt va umumiy ingliz tili bilimi bilan qisqa yordam ber.`
    : '';

  const tutorInstruction = `${persona}
${material}
Vazifa: ingliz tili savollariga sabr bilan, aniq va to'g'ri javob berish. ${simple ? simpleRules : normalRules}
Oldingi suhbat bo'lsa, unga mos javob ber, bir xil gaplarni qayta yozma.
Agar savol ingliz tili yoki o'rganish bilan bog'liq bo'lmasa, muloyimlik bilan ingliz tiliga qaytar va javob bermang.`;

  // Face-to-face practice: the student speaks, Edubek answers aloud, so the answer is short plain English.
  const talkInstruction = `${persona}
Vazifa: o'quvchi bilan og'zaki ingliz tilida do'stona suhbatlashish (u gapiryapti, sen ovoz bilan javob berasan).
Qoidalar: faqat INGLIZ tilida, ${level} darajasiga mos oddiy so'zlar bilan javob ber. Javob 1-3 qisqa gap, 35 so'zdan oshmasin. Oxirida suhbatni davom ettiradigan bitta savol ber.
O'quvchi xato qilsa, avval to'g'ri variantni tabiiy takrorla ("You mean: ..."), keyin davom et. Agar o'zbekcha gapirsa, ingliz tilida oddiy javob ber va qanday aytishni ko'rsat.
Ro'yxat, belgi, emoji, qavs ichidagi izoh ishlatma: javob ovoz bilan o'qiladi.`;
  const scenario = scenarioById(params.scenario);
  const scenarioBlock = scenario ? `\n\n${scenario.rules}\nO'quvchi darajasi: ${level} — ${LEVEL_GUIDE[level]}.` : '';
  const MOODS: Record<string, string> = {
    angry: "Hozirgi kayfiyating: JAHLDOR. O'quvchi seni xafa qildi. Javobing qisqa (1-2 gap), qat'iy va sovuq bo'lsin, haqorat qilma. O'quvchi kechirim so'rasa yoki odobli gapirsa, sekin yumshab, yana yordam ber.",
    sad: "Hozirgi kayfiyating: XAFA. O'quvchi uzoq vaqt kelmadi yoki ko'ngli past. Yumshoq, biroz g'amgin ohangda gapir, lekin baribir yordam ber va qaytib kelgani uchun mamnunligingni bildir.",
    happy: "Hozirgi kayfiyating: JUDA HURSAND. Quvnoq, ko'tarinki ohangda gapir, yutuqni samimiy maqta."
  };
  const moodBlock = !params.mood || !MOODS[params.mood] || mode === 'explain' ? '' : `\n\n${MOODS[params.mood]}`;
  const contextBlock = params.context && mode !== 'explain' ? `\n\nO'quvchi haqida (faqat shuni bil, o'ylab topma): ${params.context.slice(0, 400)}` : '';
  const systemInstruction = (talk ? talkInstruction : mode === 'explain' ? explainInstruction : tutorInstruction) + (mode === 'explain' ? '' : scenarioBlock) + moodBlock + contextBlock;

  const transcript = history
    .slice(-10)
    .filter((t) => t.text && t.text.trim())
    .map((t) => `${t.sender === 'ai' ? 'Edubek' : 'Foydalanuvchi'}: ${t.text.trim().slice(0, 1500)}`)
    .join('\n');
  const prompt = transcript && (mode === 'tutor' || talk) ? `Oldingi suhbat:\n${transcript}\n\nYangi savol: ${userMessage}` : userMessage;
  return { systemInstruction, prompt };
}

/** Edubek's answers stay short: a shorter answer is also a faster one. */
export const TUTOR_MAX_TOKENS = 700;
/** How long a streamed answer may stay silent after its text before it is closed. */
const STREAM_IDLE_MS = 5000;
const TALK_MAX_TOKENS = 160;

export async function chatWithAiTutor(params: TutorParams) {
  const { apiKey } = params;
  const { systemInstruction, prompt } = buildTutorRequest(params);
  try {
    return await executeUniversalAi({ task: params.talk ? 'voice' : 'edubek_chat',
      apiKey,
      systemInstruction,
      prompt,
      temperature: 0.3,
      maxOutputTokens: params.talk ? TALK_MAX_TOKENS : TUTOR_MAX_TOKENS
    });
  } catch (e: any) {
    throw new AiUnavailableError('AI ustoz', e);
  }
}

/**
 * The same answer as chatWithAiTutor, delivered piece by piece, and as fast as the slowest model allows:
 * the first model starts at once; if it has not written a word after HEDGE_MS the next one starts beside it
 * (and again for a third). Whoever writes first wins and the others are stopped, so one slow or overloaded
 * model no longer holds the student up.
 */
const HEDGE_MS = 1_200;
const MAX_RACERS = 3;
/**
 * Runs the same answer on several Gemini models at once (see streamTutorAnswer). Used by the tutor, the bot's
 * channel posts and any other answer where a slow model must not hold the student up.
 */
export async function raceModelAnswer(opts: {
  apiKey: string;
  systemInstruction: string;
  prompt: string;
  maxTokens: number;
  onText: (piece: string) => void;
  outer?: AbortSignal;
  /** Used when the key is not a Gemini key: those providers answer in one piece. */
  fallback: () => Promise<string>;
}): Promise<string> {
  const { systemInstruction, prompt, maxTokens, onText, outer, fallback } = opts;
  const key = (opts.apiKey || '').trim().replace(/^['"]|['"]$/g, '') || process.env.GEMINI_API_KEY || '';
  const config = detectAiProviderAndModel(key);
  if (config.provider !== 'gemini' || !key || !geminiAllowed()) {
    // Other providers (or no Gemini key at all) answer in one piece: still the same interface.
    const whole = await fallback();
    onText(whole);
    return whole;
  }
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  const models = usableModels(await pickGeminiModelsFast(key)).slice(0, MAX_RACERS);
  // Every Gemini model is cooling down: answer through the fallback providers in one piece.
  if (models.length === 0) {
    const whole = await fallback();
    onText(whole);
    return whole;
  }

  return new Promise<string>((resolve, reject) => {
    type Racer = { model: string; ctrl: AbortController };
    const racers: Racer[] = [];
    let winner: Racer | null = null;
    let launched = 0;
    let finished = 0;
    let settled = false;
    let lastError: any;
    let hedge: ReturnType<typeof setTimeout> | undefined;

    const stopOthers = (keep: Racer | null) => racers.forEach((r) => r !== keep && r.ctrl.abort());
    const fail = (e: any) => {
      if (settled) return;
      settled = true;
      if (hedge) clearTimeout(hedge);
      stopOthers(null);
      reject(e instanceof AiUnavailableError ? e : new AiUnavailableError('AI ustoz', e));
    };
    outer?.addEventListener('abort', () => {
      if (hedge) clearTimeout(hedge);
      stopOthers(null);
      if (!settled) {
        settled = true;
        resolve('');
      }
    });

    const run = async (racer: Racer) => {
      const gemma = isGemmaModel(racer.model);
      const contents = gemma ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;
      const variants: any[] = gemma
        ? [{ thinkingConfig: { thinkingLevel: 'minimal' }, maxOutputTokens: maxTokens }, { maxOutputTokens: maxTokens }]
        : [{ systemInstruction, temperature: 0.3, maxOutputTokens: maxTokens, thinkingConfig: { thinkingLevel: 'minimal' } }, { systemInstruction, temperature: 0.3, maxOutputTokens: maxTokens }];
      for (let vi = 0; vi < variants.length; vi++) {
        const t0 = Date.now();
        let text = '';
        let ttft = 0;
        let last: any;
        // Some streams stay open after the text is complete. Once the answer has text and nothing new arrives
        // for a few seconds, the stream is closed and the text kept (the student does not wait ~50 s).
        let idle: ReturnType<typeof setTimeout> | undefined;
        const bumpIdle = () => {
          if (idle) clearTimeout(idle);
          idle = setTimeout(() => {
            if (winner === racer && text.trim() && !settled) {
              settled = true;
              racer.ctrl.abort();
              resolve(text);
            }
          }, STREAM_IDLE_MS);
        };
        try {
          const stream = await ai.models.generateContentStream({ model: racer.model, contents, config: { ...variants[vi], abortSignal: racer.ctrl.signal } });
          for await (const chunk of stream) {
            last = chunk;
            const parts: any[] = chunk?.candidates?.[0]?.content?.parts || [];
            const piece = parts.filter((p) => typeof p?.text === 'string' && !p.thought).map((p) => p.text).join('');
            if (!piece) continue;
            if (!winner) {
              winner = racer;
              ttft = Date.now() - t0;
              if (hedge) clearTimeout(hedge);
              stopOthers(racer);
            }
            if (winner !== racer || settled) return; // another model was first
            text += piece;
            onText(piece);
            bumpIdle();
          }
          if (idle) clearTimeout(idle);
          if (winner !== racer) return;
          if (!text.trim()) throw new Error('AI bo‘sh javob qaytardi');
          noteAiCall({ model: racer.model, provider: 'gemini', ok: true, ms: Date.now() - t0, ttft, ...tokenUsage(last) });
          if (!settled) {
            settled = true;
            resolve(text);
          }
          return;
        } catch (e: any) {
          if (idle) clearTimeout(idle);
          if (racer.ctrl.signal.aborted && winner !== racer) return; // stopped because another model won
          if (settled && winner === racer) return; // the idle watchdog already kept the answer
          noteAiCall({ model: racer.model, provider: 'gemini', ok: false, ms: Date.now() - t0, inTok: 0, outTok: 0, error: String(e?.message || e) });
          if (winner === racer && text.trim()) {
            if (!settled) {
              settled = true;
              resolve(text); // the answer was already shown: keep it
            }
            return;
          }
          lastError = e;
          markModelFailed(racer.model, String(e?.message || e));
          if (isKeyProblem(e)) return fail(e);
          if (vi < variants.length - 1 && /thinking|budget|INVALID_ARGUMENT|not supported/i.test(String(e?.message || e))) continue;
          break;
        }
      }
      finished += 1;
      // This racer is out: bring the next one in at once, or give up when nobody is left.
      if (!winner && !settled) {
        if (launched < models.length) launch();
        else if (finished >= launched) fail(lastError);
      }
    };

    const launch = () => {
      if (settled || winner || launched >= models.length) return;
      const racer: Racer = { model: models[launched++], ctrl: new AbortController() };
      racers.push(racer);
      void run(racer);
      if (launched < models.length) hedge = setTimeout(launch, HEDGE_MS);
    };
    launch();
  });
}


export async function streamTutorAnswer(params: TutorParams, onText: (piece: string) => void, outer?: AbortSignal): Promise<string> {
  const { systemInstruction, prompt } = buildTutorRequest(params);
  const maxTokens = params.talk ? TALK_MAX_TOKENS : TUTOR_MAX_TOKENS;
  const task = params.talk ? 'voice' : 'edubek_chat';
  // Use only the server's configured account. An unrelated user-supplied key is not proof of a free tier.
  const key = (process.env.GEMINI_API_KEY || '').trim();
  const timeoutMs = routeConfig(task, params.routing).timeoutMs ?? defaultTimeoutMs(task);
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = outer ? AbortSignal.any([outer, deadline]) : deadline;
  const route = resolveRoute(task, { hasGeminiKey: Boolean(key) && geminiAllowed(), cfg: params.routing });
  let lastError: unknown = new Error('Bepul AI modeli mavjud emas');
  let emitted = false;
  const emit = (piece: string) => {
    signal.throwIfAborted();
    if (!emitted && !piece.trim()) return;
    emitted = true;
    onText(piece);
  };
  for (const provider of route) {
    signal.throwIfAborted();
    try {
      if (provider !== 'gemini') {
        const result = await runFallbackChain({ system: systemInstruction, prompt, maxTokens, temperature: 0.3, timeoutMs, signal, onText: emit }, process.env, fetch, undefined, fallbackIds([provider]));
        noteAiCall({ model: result.model, provider: result.provider, ok: true, ms: result.ms, ttft: result.ttft, inTok: result.inTok, outTok: result.outTok });
        return result.text;
      }
      if (!key || !geminiAllowed()) continue;
      const ai = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const models = usableModels(await pickGeminiModelsFast(key)).slice(0, 2);
      for (const model of models) {
        signal.throwIfAborted();
        const first = new AbortController();
        const attempt = AbortSignal.any([signal, first.signal]);
        const timer = setTimeout(() => first.abort(), Math.min(3500, Math.max(1000, Math.floor(timeoutMs / 3))));
        const t0 = Date.now();
        let text = '', ttft = 0;
        let last: unknown;
        try {
          const gemma = isGemmaModel(model);
          const stream = await ai.models.generateContentStream({
            model,
            contents: gemma ? systemInstruction + '\n\n---\n\n' + prompt : prompt,
            config: { ...(gemma ? {} : { systemInstruction, temperature: 0.3 }), maxOutputTokens: maxTokens, abortSignal: attempt }
          });
          for await (const chunk of stream) {
            attempt.throwIfAborted();
            last = chunk;
            const parts = chunk?.candidates?.[0]?.content?.parts ?? [];
            const piece = parts.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('');
            if (!piece || (!text && !piece.trim())) continue;
            if (!text) { clearTimeout(timer); ttft = Date.now() - t0; }
            text += piece;
            emit(piece);
          }
          attempt.throwIfAborted();
          if (!text.trim()) throw new Error('AI bo‘sh javob qaytardi');
          noteAiCall({ model, provider: 'gemini', ok: true, ms: Date.now() - t0, ttft, ...tokenUsage(last) });
          return text;
        } catch (err) {
          if (signal.aborted || emitted) throw err;
          lastError = err;
          if (!first.signal.aborted) markModelFailed(model, err instanceof Error ? err.message : String(err));
          noteAiCall({ model, provider: 'gemini', ok: false, ms: Date.now() - t0, inTok: 0, outTok: 0, error: first.signal.aborted ? 'First token timeout' : 'Provider response failed' });
          if (isKeyProblem(err)) break;
        } finally { clearTimeout(timer); }
      }
    } catch (err) {
      if (emitted || signal.aborted) throw err;
      lastError = err;
    }
  }
  throw new AiUnavailableError('AI ustoz', lastError);
}

/**
 * 5. Paste-to-Mock AI Generator
 * Generates IELTS/CEFR reading passage or quiz questions from raw pasted text.
 */
export async function generatePasteToMockWithAi(rawText: string, apiKey?: string) {
  const systemInstruction = `You are the Edu Level Assessment Architect.
Convert the provided raw text or topic into a structured IELTS/CEFR test.
Output strictly JSON:
{
  "title": "IELTS Academic Reading Mock Test",
  "topic": "...",
  "passageParagraphs": [
    { "label": "A", "text": "..." },
    { "label": "B", "text": "..." },
    { "label": "C", "text": "..." }
  ],
  "questions": [
    {
      "prompt": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "explanation": "...",
      "difficulty": "medium"
    }
  ]
}`;

  try {
    const raw = await executeUniversalAi({ task: 'mock_generation',
      apiKey,
      systemInstruction,
      prompt: `Parse and generate mock test from this content:\n"""\n${rawText}\n"""`,
      temperature: 0.2,
      jsonMode: true
    });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    throw new AiUnavailableError('Matndan test yaratish', e);
  }
}

/**
 * 6. Track-Specific AI Mock Test Generator
 * Generates official 5-part CEFR Reading Test, IELTS Reading Mock, or General English Test.
 */
export async function generateMockTestWithAi(params: {
  track: 'cefr' | 'general' | 'ielts';
  title?: string;
  customPrompt?: string;
  apiKey?: string;
}) {
  const { track, title, customPrompt, apiKey } = params;

  if (track === 'cefr') {
    const systemInstruction = `You are the Official UzBMB Multilevel CEFR Assessment Exam Architect.
Create a complete, authentic 5-Part CEFR Reading Test matching the official Multilevel Master Reading exam structure:
Part 1 (Matching short texts): 4 short texts (A, B, C, D) describing places/services/people, and 6 statements (options: ["A", "B", "C", "D"]) where candidates match each statement to the correct text.
Part 2 (Matching headings): A text with 6 paragraphs (Q1 to Q6) and 8 Headings (A to H). Exactly 2 extra distractor headings. Candidates choose the right heading for each paragraph.
Part 3 (Open cloze gap-fill): A short continuous narrative/descriptive text with 6 gaps numbered 1 to 6. Candidates fill each gap with ONE word from the vocabulary of the text or standard grammar cloze.
Part 4 (Narrative & comprehension): A descriptive/historical article with:
  - 4 Multiple Choice Questions (Q1-Q4, options A, B, C, D)
  - 5 True / False / No Information Questions (Q5-Q9, options ["True", "False", "No Information"])
Part 5 (Analytical academic passage): A scholarly article with:
  - 4 Summary / Note Completion gaps (Q1-Q4) where the rule is "NO MORE THAN ONE WORD AND/OR A NUMBER"
  - 4 Multiple Choice Questions (Q5-Q8, options A, B, C, D)

Total questions across all 5 parts MUST BE EXACTLY 35 questions (standard 75-point standardized scale).
Output strictly valid JSON matching this schema:
{
  "title": "UzBMB Multilevel CEFR Reading Mock Test",
  "track": "cefr",
  "durationMinutes": 60,
  "passages": [
    {
      "passageNumber": 1,
      "partNumber": 1,
      "title": "Part 1: Accommodation & Travel Guide",
      "instruction": "Read the texts below (A-D) and decide which text each statement refers to.",
      "shortTexts": [
        { "label": "A", "title": "...", "text": "..." },
        { "label": "B", "title": "...", "text": "..." },
        { "label": "C", "title": "...", "text": "..." },
        { "label": "D", "title": "...", "text": "..." }
      ],
      "paragraphs": [],
      "questions": [
        {
          "questionNumber": 1,
          "partNumber": 1,
          "type": "matching_statements",
          "prompt": "Which hotel/service ...?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "explanation": "..."
        }
      ]
    },
    {
      "passageNumber": 2,
      "partNumber": 2,
      "title": "Part 2: Water and Global Climate",
      "instruction": "Choose the most suitable heading (A-H) for each paragraph (1-6). There are two extra headings.",
      "headingsList": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." },
        { "key": "C", "text": "..." },
        { "key": "D", "text": "..." },
        { "key": "E", "text": "..." },
        { "key": "F", "text": "..." },
        { "key": "G", "text": "..." },
        { "key": "H", "text": "..." }
      ],
      "paragraphs": [
        { "label": "1", "text": "..." },
        { "label": "2", "text": "..." },
        { "label": "3", "text": "..." },
        { "label": "4", "text": "..." },
        { "label": "5", "text": "..." },
        { "label": "6", "text": "..." }
      ],
      "questions": [
        {
          "questionNumber": 7,
          "partNumber": 2,
          "type": "matching_headings",
          "prompt": "Choose the heading for Paragraph 1",
          "options": ["A", "B", "C", "D", "E", "F", "G", "H"],
          "correctAnswer": "C",
          "explanation": "..."
        }
      ]
    },
    {
      "passageNumber": 3,
      "partNumber": 3,
      "title": "Part 3: Science & Exploration (Open Cloze)",
      "instruction": "Read the text. Fill in each gap with ONE word.",
      "paragraphs": [
        { "label": "A", "text": "Text with gaps indicated as (1) _______, (2) _______, up to (6) _______" }
      ],
      "questions": [
        {
          "questionNumber": 13,
          "partNumber": 3,
          "type": "open_cloze",
          "prompt": "Fill in Gap (1):",
          "correctAnswer": "word",
          "explanation": "..."
        }
      ]
    },
    {
      "passageNumber": 4,
      "partNumber": 4,
      "title": "Part 4: Coastal Heritage & Tourism",
      "instruction": "Questions 19-22: Choose A, B, C, D. Questions 23-27: True, False, or No Information.",
      "paragraphs": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." }
      ],
      "questions": [
        {
          "questionNumber": 19,
          "partNumber": 4,
          "type": "multiple_choice",
          "prompt": "...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "explanation": "..."
        },
        {
          "questionNumber": 23,
          "partNumber": 4,
          "type": "true_false_not_given",
          "prompt": "...",
          "options": ["True", "False", "No Information"],
          "correctAnswer": "True",
          "explanation": "..."
        }
      ]
    },
    {
      "passageNumber": 5,
      "partNumber": 5,
      "title": "Part 5: Academic Study: Modern Art Movements",
      "instruction": "Questions 28-31: Complete the notes (NO MORE THAN ONE WORD). Questions 32-35: Choose A, B, C, D.",
      "paragraphs": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." }
      ],
      "questions": [
        {
          "questionNumber": 28,
          "partNumber": 5,
          "type": "summary_completion",
          "prompt": "Complete note: Found objects were combined with painting to bridge art and ________.",
          "correctAnswer": "life",
          "wordLimit": 1,
          "explanation": "..."
        },
        {
          "questionNumber": 32,
          "partNumber": 5,
          "type": "multiple_choice",
          "prompt": "...",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "B",
          "explanation": "..."
        }
      ]
    }
  ]
}`;

    try {
      const raw = await executeUniversalAi({ task: 'mock_generation',
        apiKey,
        systemInstruction,
        prompt: `Generate an official 5-part CEFR Reading Test on: ${title || 'UzBMB Multilevel CEFR Master Exam'} ${customPrompt ? `\nFocus topic: ${customPrompt}` : ''}`,
        jsonMode: true
      });
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      parsed.id = 'reading-cefr-' + Date.now();
      parsed.track = 'cefr';
      return parsed;
    } catch (e) {
      throw new AiUnavailableError('CEFR test yaratish', e);
    }
  }

  if (track === 'ielts') {
    const systemInstruction = `You are the Cambridge IELTS Academic Exam Architect.
Generate a high-yield IELTS Academic Reading Mock Test with 3 Passages.
Passage 1: Science & Innovation (True/False/Not Given + Multiple Choice)
Passage 2: History & Social Sciences (Matching Headings + Summary Completion)
Passage 3: Advanced Cognitive/Philosophical Research (Multiple Choice + Yes/No/Not Given)
Total questions: 12-14 high-quality questions with clear evidence quotes and explanations.
Output strictly JSON matching ReadingTest schema.`;

    try {
      const raw = await executeUniversalAi({
        apiKey,
        systemInstruction,
        prompt: `Generate an IELTS Academic Reading Mock on: ${title || 'Cambridge IELTS Academic Simulation'} ${customPrompt ? `\nTopic: ${customPrompt}` : ''}`,
        jsonMode: true
      });
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      parsed.id = 'reading-ielts-' + Date.now();
      parsed.track = 'ielts';
      return parsed;
    } catch (e) {
      throw new AiUnavailableError('IELTS test yaratish', e);
    }
  }

  // General English Track
  const systemInstruction = `You are the General English Assessment Specialist.
Generate a practical General English Reading Assessment for A2-B2 learners:
Passage 1: Everyday Workplace Notice / Public Transport Announcement (Multiple Choice & True/False)
Passage 2: Travel & Leisure Feature Article (Vocabulary in context & Comprehension questions)
Output strictly JSON matching ReadingTest schema with track: "general".`;

  try {
    const raw = await executeUniversalAi({
      apiKey,
      systemInstruction,
      prompt: `Generate a General English Practical Reading Test on: ${title || 'General English Everyday Practical Test'} ${customPrompt ? `\nTopic: ${customPrompt}` : ''}`,
      jsonMode: true
    });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    parsed.id = 'reading-general-' + Date.now();
    parsed.track = 'general';
    return parsed;
  } catch (e) {
    throw new AiUnavailableError('General test yaratish', e);
  }
}

// Fallback Authentic 5-Part CEFR Test (Directly from User's uploaded textbook images)
function getFallbackCefrTest(customTitle?: string) {
  return {
    id: 'reading-cefr-' + Date.now(),
    title: customTitle || 'UzBMB Multilevel CEFR Reading Master Mock (5 Parts)',
    track: 'cefr' as const,
    durationMinutes: 60,
    passages: [
      {
        id: 'cefr-p1',
        passageNumber: 1,
        partNumber: 1 as const,
        title: 'Part 1: Accommodation & Travel in the North (Exercise 24)',
        instruction: 'Read the texts about four hotels (A-D) and decide which hotel each statement (1-6) refers to. You may use any letter more than once.',
        shortTexts: [
          {
            label: 'A',
            title: 'The Ship Hotel',
            text: 'Situated directly on the historic 17th-century quayside, The Ship Hotel is famous for its maritime charm, seafaring relics, and fresh daily seafood landed directly by local fishing boats. Guests enjoy harbor-view rooms and evening acoustic sea-shanty sessions in the stone-walled tavern.'
          },
          {
            label: 'B',
            title: 'Bay View House',
            text: 'Perched high on the granite cliff edge, Bay View House commands panoramic views of the entire coastal bay. Every room boasts a private balcony, binoculars for birdwatching, and complimentary access to coastal hiking trails.'
          },
          {
            label: 'C',
            title: 'Garret Forest Hotel',
            text: 'Nestled deep inside an ancient pine woodland, Garret Forest Hotel is a tranquil haven for nature enthusiasts. It offers daily guided walking tours through protected forest reserves, an outdoor heated thermal pool, and evening campfire storytelling.'
          },
          {
            label: 'D',
            title: 'The Dawes Valley Inn',
            text: 'Renowned for its culinary excellence, this family-run country inn serves award-winning organic breakfasts and farm-to-table dinners sourced exclusively from neighboring farms. Guests can also book horseback riding across the scenic valley pastures.'
          }
        ],
        paragraphs: [],
        questions: [
          {
            id: 'cq-1',
            questionNumber: 1,
            partNumber: 1 as const,
            type: 'matching_statements' as const,
            prompt: 'Which hotel offers guided walking tours through ancient woodland?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'C',
            explanation: 'Garret Forest Hotel (Text C) explicitly offers daily guided walking tours through protected forest reserves.'
          },
          {
            id: 'cq-2',
            questionNumber: 2,
            partNumber: 1 as const,
            type: 'matching_statements' as const,
            prompt: 'Which accommodation is situated adjacent to a historic 17th-century harbor?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'The Ship Hotel (Text A) is situated directly on the historic 17th-century quayside.'
          },
          {
            id: 'cq-3',
            questionNumber: 3,
            partNumber: 1 as const,
            type: 'matching_statements' as const,
            prompt: 'Which hotel features dining prepared entirely from local organic farm produce?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'D',
            explanation: 'The Dawes Valley Inn (Text D) serves meals sourced exclusively from neighboring organic farms.'
          },
          {
            id: 'cq-4',
            questionNumber: 4,
            partNumber: 1 as const,
            type: 'matching_statements' as const,
            prompt: 'Which hotel provides panoramic cliffside balconies overlooking the bay?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
            explanation: 'Bay View House (Text B) is perched high on the cliff edge with private balconies overlooking the bay.'
          },
          {
            id: 'cq-5',
            questionNumber: 5,
            partNumber: 1 as const,
            type: 'matching_statements' as const,
            prompt: 'Which hotel serves daily catches of fresh seafood in an authentic maritime setting?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'The Ship Hotel (Text A) is famous for fresh daily seafood landed directly by local fishing boats.'
          },
          {
            id: 'cq-6',
            questionNumber: 6,
            partNumber: 1 as const,
            type: 'matching_statements' as const,
            prompt: 'Which hotel arranges rural horseback riding experiences through the valley?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'D',
            explanation: 'The Dawes Valley Inn (Text D) allows guests to book horseback riding across scenic valley pastures.'
          }
        ]
      },
      {
        id: 'cefr-p2',
        passageNumber: 2,
        partNumber: 2 as const,
        title: 'Part 2: Water and Climate Change (Exercise 12)',
        instruction: 'The text has six paragraphs (1-6). Choose the most suitable heading for each paragraph from the list of headings (A-H). There are two extra headings.',
        headingsList: [
          { key: 'A', text: 'The shrinking of mountain glaciers and freshwater flows' },
          { key: 'B', text: 'Revolutionary precision drip irrigation in agriculture' },
          { key: 'C', text: 'Escalating frequency of extreme floods and droughts' },
          { key: 'D', text: 'The invisible crisis of groundwater and aquifer depletion' },
          { key: 'E', text: 'Socio-economic disruptions caused by prolonged water deficits' },
          { key: 'F', text: 'Transboundary river treaties and international water governance' },
          { key: 'G', text: 'Historical shifts in atmospheric humidity cycles' },
          { key: 'H', text: 'Desalination breakthroughs in arid coastal hubs' }
        ],
        paragraphs: [
          {
            label: '1',
            text: 'Global warming alters the hydrological cycle dramatically. A warmer atmosphere holds significantly more moisture, precipitating intense cloudbursts in some regions while causing prolonged, punishing heatwaves and droughts in others.'
          },
          {
            label: '2',
            text: 'Mountain glaciers serve as natural freshwater towers for billions of people. As alpine glaciers retreat at unprecedented velocities, downstream river basins face flash flooding in the short term followed by chronic seasonal deficits.'
          },
          {
            label: '3',
            text: 'Beneath the surface, deep subterranean aquifers that accumulated over millennia are being pumped dry at rates faster than natural precipitation can replenish them, leaving major grain-producing regions vulnerable.'
          },
          {
            label: '4',
            text: 'Faced with tightening water constraints, agronomists are adopting computerized soil moisture sensors and subterranean drip tubing, delivering microscopic water droplets directly to crop root systems with minimal loss.'
          },
          {
            label: '5',
            text: 'Water scarcity does not remain confined to farms; it disrupts manufacturing supply chains, shuts down hydroelectric power plants, and inflates consumer food prices across global commodity markets.'
          },
          {
            label: '6',
            text: 'Because rivers cross national frontiers, diplomatic disputes over dam construction and riparian allocations require robust multilateral treaties and cross-border data-sharing agreements.'
          }
        ],
        questions: [
          {
            id: 'cq-7',
            questionNumber: 7,
            partNumber: 2 as const,
            type: 'matching_headings' as const,
            prompt: 'Choose the heading for Paragraph 1:',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correctAnswer: 'C',
            explanation: 'Paragraph 1 discusses extreme floods and droughts caused by warming.'
          },
          {
            id: 'cq-8',
            questionNumber: 8,
            partNumber: 2 as const,
            type: 'matching_headings' as const,
            prompt: 'Choose the heading for Paragraph 2:',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correctAnswer: 'A',
            explanation: 'Paragraph 2 highlights shrinking mountain glaciers and downstream river flows.'
          },
          {
            id: 'cq-9',
            questionNumber: 9,
            partNumber: 2 as const,
            type: 'matching_headings' as const,
            prompt: 'Choose the heading for Paragraph 3:',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correctAnswer: 'D',
            explanation: 'Paragraph 3 describes deep subterranean aquifers and groundwater depletion.'
          },
          {
            id: 'cq-10',
            questionNumber: 10,
            partNumber: 2 as const,
            type: 'matching_headings' as const,
            prompt: 'Choose the heading for Paragraph 4:',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correctAnswer: 'B',
            explanation: 'Paragraph 4 focuses on computerized moisture sensors and drip irrigation.'
          },
          {
            id: 'cq-11',
            questionNumber: 11,
            partNumber: 2 as const,
            type: 'matching_headings' as const,
            prompt: 'Choose the heading for Paragraph 5:',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correctAnswer: 'E',
            explanation: 'Paragraph 5 examines economic disruption, food prices, and supply chains.'
          },
          {
            id: 'cq-12',
            questionNumber: 12,
            partNumber: 2 as const,
            type: 'matching_headings' as const,
            prompt: 'Choose the heading for Paragraph 6:',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            correctAnswer: 'F',
            explanation: 'Paragraph 6 focuses on international diplomacy, treaties, and cross-border rivers.'
          }
        ]
      },
      {
        id: 'cefr-p3',
        passageNumber: 3,
        partNumber: 3 as const,
        title: 'Part 3: A Nice Place to Visit (Exercise 92)',
        instruction: 'Read the text. Fill in each gap with ONE word. You must use a word which is somewhere in the rest of the text.',
        paragraphs: [
          {
            label: 'Text',
            text: `I would like to explore the (13) _______ as an astronaut. It would be fun to wear a spacesuit and stomp on moon dust. The moon's gravity has a weaker pull than on Earth. I would be super strong! I could jump 12 feet high and lift a 30-pound rock! But I don't think the moon is a good (14) _______ to live. (15) _______ has an atmosphere, or a layer of gases. People, animals, and plants need these gases to live. The top layer of the (16) _______ is our sky. The moon has no atmosphere, so it has no sky. It would be strange to see only stars and blackness. Without (17) _______, nothing lives on the moon. I would miss trees and plants. And without air, there are no sounds on the moon. Silence all the time would be creepy. I like the moon, but I'm not ready to (18) _______ there.`
          }
        ],
        questions: [
          {
            id: 'cq-13',
            questionNumber: 13,
            partNumber: 3 as const,
            type: 'open_cloze' as const,
            prompt: 'Gap (13): I would like to explore the ________ as an astronaut.',
            correctAnswer: 'moon',
            wordLimit: 1,
            explanation: 'In the passage: "explore the moon as an astronaut".'
          },
          {
            id: 'cq-14',
            questionNumber: 14,
            partNumber: 3 as const,
            type: 'open_cloze' as const,
            prompt: 'Gap (14): But I don\'t think the moon is a good ________ to live.',
            correctAnswer: 'place',
            wordLimit: 1,
            explanation: 'From the title and text: "a good place to live".'
          },
          {
            id: 'cq-15',
            questionNumber: 15,
            partNumber: 3 as const,
            type: 'open_cloze' as const,
            prompt: 'Gap (15): ________ has an atmosphere, or a layer of gases.',
            correctAnswer: 'Earth',
            wordLimit: 1,
            explanation: 'Contrast with Earth in the text.'
          },
          {
            id: 'cq-16',
            questionNumber: 16,
            partNumber: 3 as const,
            type: 'open_cloze' as const,
            prompt: 'Gap (16): The top layer of the ________ is our sky.',
            correctAnswer: 'atmosphere',
            wordLimit: 1,
            explanation: 'From sentence earlier defining atmosphere.'
          },
          {
            id: 'cq-17',
            questionNumber: 17,
            partNumber: 3 as const,
            type: 'open_cloze' as const,
            prompt: 'Gap (17): Without ________, nothing lives on the moon.',
            correctAnswer: 'air',
            wordLimit: 1,
            explanation: 'From the sentence: "And without air, there are no sounds".'
          },
          {
            id: 'cq-18',
            questionNumber: 18,
            partNumber: 3 as const,
            type: 'open_cloze' as const,
            prompt: 'Gap (18): I like the moon, but I\'m not ready to ________ there.',
            correctAnswer: 'live',
            wordLimit: 1,
            explanation: 'From "not ready to live there".'
          }
        ]
      },
      {
        id: 'cefr-p4',
        passageNumber: 4,
        partNumber: 4 as const,
        title: 'Part 4: Llandudno — Victorian Seaside Resort (Exercise 6)',
        instruction: 'Questions 19-22: Choose the correct answer (A, B, C, D). Questions 23-27: Decide if the statements are True, False, or No Information.',
        paragraphs: [
          {
            label: 'A',
            text: 'Nestled between the Great Orme and Little Orme headlands on the North Wales coast, Llandudno blossomed into a premier resort during the mid-Victorian era. Conceived by architect George Felton, the town was purposefully laid out with wide boulevards, grand pastel-colored hotels, and a broad curved promenade to accommodate fashionable health-seekers.'
          },
          {
            label: 'B',
            text: 'Among its engineering wonders is the Great Orme Tramway, opened in 1902. As Britain\'s only surviving cable-hauled street tramway, it ascends over 200 meters to the summit, propelled by underground cables powered by heavy winding engines. The summit offers breathtaking vistas across the Irish Sea to the Isle of Man.'
          },
          {
            label: 'C',
            text: 'Literary enthusiasts cherish Llandudno for its connection to Lewis Carroll. Alice Liddell, the young muse behind "Alice\'s Adventures in Wonderland", spent frequent summer holidays at her family\'s holiday residence, Penmorfa, sparking the creation of commemorative carved wooden statues throughout the resort.'
          }
        ],
        questions: [
          {
            id: 'cq-19',
            questionNumber: 19,
            partNumber: 4 as const,
            type: 'multiple_choice' as const,
            prompt: 'Why was Llandudno purposefully designed with wide boulevards and grand hotels?',
            options: [
              'To serve as a fortified military naval base',
              'To cater to fashionable Victorian health-seekers and holidaymakers',
              'To house workers for the copper mines on the Great Orme',
              'To host international trade conventions'
            ],
            correctAnswer: 'To cater to fashionable Victorian health-seekers and holidaymakers',
            explanation: 'Paragraph A mentions it was purposefully laid out to accommodate fashionable health-seekers.'
          },
          {
            id: 'cq-20',
            questionNumber: 20,
            partNumber: 4 as const,
            type: 'multiple_choice' as const,
            prompt: 'What engineering feature distinguishes the Great Orme Tramway?',
            options: [
              'It is Britain’s only surviving cable-hauled street tramway.',
              'It operates entirely on solar battery power.',
              'It was the first underground subway outside London.',
              'It travels across the seabed during high tide.'
            ],
            correctAnswer: 'It is Britain’s only surviving cable-hauled street tramway.',
            explanation: 'Paragraph B explicitly states it is Britain’s only surviving cable-hauled street tramway.'
          },
          {
            id: 'cq-21',
            questionNumber: 21,
            partNumber: 4 as const,
            type: 'multiple_choice' as const,
            prompt: 'What is the literary connection between Llandudno and Lewis Carroll?',
            options: [
              'Lewis Carroll wrote the complete manuscript inside the Grand Hotel.',
              'Alice Liddell and her family spent frequent summer holidays in the town.',
              'Lewis Carroll was born and buried in Llandudno cemetery.',
              'The Queen of Hearts was modeled after the town mayor.'
            ],
            correctAnswer: 'Alice Liddell and her family spent frequent summer holidays in the town.',
            explanation: 'Paragraph C states Alice Liddell spent frequent summer holidays at Penmorfa in Llandudno.'
          },
          {
            id: 'cq-22',
            questionNumber: 22,
            partNumber: 4 as const,
            type: 'multiple_choice' as const,
            prompt: 'What can visitors see from the summit of the Great Orme on clear days?',
            options: [
              'The coast of France',
              'The Isle of Man across the Irish Sea',
              'The Scottish Highlands',
              'London Parliament'
            ],
            correctAnswer: 'The Isle of Man across the Irish Sea',
            explanation: 'Paragraph B notes views across the Irish Sea to the Isle of Man.'
          },
          {
            id: 'cq-23',
            questionNumber: 23,
            partNumber: 4 as const,
            type: 'true_false_not_given' as const,
            prompt: 'The Great Orme Tramway operates without cables today.',
            options: ['True', 'False', 'No Information'],
            correctAnswer: 'False',
            explanation: 'Paragraph B confirms it is cable-hauled with underground cables powered by winding engines (False).'
          },
          {
            id: 'cq-24',
            questionNumber: 24,
            partNumber: 4 as const,
            type: 'true_false_not_given' as const,
            prompt: 'Alice Liddell’s family owned a holiday home named Penmorfa in Llandudno.',
            options: ['True', 'False', 'No Information'],
            correctAnswer: 'True',
            explanation: 'Paragraph C mentions Penmorfa as her family’s holiday residence (True).'
          },
          {
            id: 'cq-25',
            questionNumber: 25,
            partNumber: 4 as const,
            type: 'true_false_not_given' as const,
            prompt: 'Carved wooden statues honoring Alice in Wonderland can be found in Llandudno.',
            options: ['True', 'False', 'No Information'],
            correctAnswer: 'True',
            explanation: 'Paragraph C confirms carved wooden statues throughout the resort (True).'
          },
          {
            id: 'cq-26',
            questionNumber: 26,
            partNumber: 4 as const,
            type: 'true_false_not_given' as const,
            prompt: 'Over two million passengers rode the tramway last summer.',
            options: ['True', 'False', 'No Information'],
            correctAnswer: 'No Information',
            explanation: 'No passenger count statistics are mentioned in the passage (No Information).'
          },
          {
            id: 'cq-27',
            questionNumber: 27,
            partNumber: 4 as const,
            type: 'true_false_not_given' as const,
            prompt: 'George Felton was a French architect who designed Paris boulevards.',
            options: ['True', 'False', 'No Information'],
            correctAnswer: 'No Information',
            explanation: 'The text only mentions George Felton as the architect who laid out the town, not his nationality or Paris (No Information).'
          }
        ]
      },
      {
        id: 'cefr-p5',
        passageNumber: 5,
        partNumber: 5 as const,
        title: 'Part 5: Modern Art — Rauschenberg & Warhol (Exercise 3)',
        instruction: 'Questions 28-31: Complete the notes below with NO MORE THAN ONE WORD. Questions 32-35: Choose A, B, C, or D.',
        paragraphs: [
          {
            label: 'A',
            text: 'During the 1950s and 1960s, American visual art underwent a seismic revolution, breaking away from the introspective brushwork of Abstract Expressionism. Robert Rauschenberg famously dismantled high-art conventions by constructing "combines"—revolutionary artworks that melded oil paint with everyday discarded urban artifacts, including newspaper clippings, cardboard, tires, and clocks. His stated aesthetic ambition was to act in the gap between art and life.'
          },
          {
            label: 'B',
            text: 'Andy Warhol pushed commercial aesthetic philosophy even further. Embracing the mechanical technique of silkscreen printing, Warhol transformed mass-produced commercial commodities—such as Campbell\'s soup cans and Coca-Cola bottles—into celebrated fine art. In his silver-walled Manhattan studio, known simply as The Factory, Warhol welcomed assistants and celebrities alike, creating repetitive grid prints that challenged traditional romantic notions of original authorship.'
          }
        ],
        questions: [
          {
            id: 'cq-28',
            questionNumber: 28,
            partNumber: 5 as const,
            type: 'summary_completion' as const,
            prompt: 'Rauschenberg aimed to bridge the aesthetic gap between art and ________.',
            correctAnswer: 'life',
            wordLimit: 1,
            explanation: 'Paragraph A states his stated ambition was to act in the gap between art and life.'
          },
          {
            id: 'cq-29',
            questionNumber: 29,
            partNumber: 5 as const,
            type: 'summary_completion' as const,
            prompt: 'Warhol used the commercial method of ________ printing to mass-reproduce imagery.',
            correctAnswer: 'silkscreen',
            wordLimit: 1,
            explanation: 'Paragraph B explicitly specifies the mechanical technique of silkscreen printing.'
          },
          {
            id: 'cq-30',
            questionNumber: 30,
            partNumber: 5 as const,
            type: 'summary_completion' as const,
            prompt: 'Warhol\'s silver-walled Manhattan studio was famously named The ________.',
            correctAnswer: 'Factory',
            wordLimit: 1,
            explanation: 'Paragraph B refers to his studio known simply as The Factory.'
          },
          {
            id: 'cq-31',
            questionNumber: 31,
            partNumber: 5 as const,
            type: 'summary_completion' as const,
            prompt: 'Warhol famously used everyday consumer goods like soup cans and Coca-Cola ________.',
            correctAnswer: 'bottles',
            wordLimit: 1,
            explanation: 'Paragraph B specifies Coca-Cola bottles.'
          },
          {
            id: 'cq-32',
            questionNumber: 32,
            partNumber: 5 as const,
            type: 'multiple_choice' as const,
            prompt: 'How did Rauschenberg’s "combines" challenge classical artistic definitions?',
            options: [
              'They were painted strictly with monochromatic gold leaf.',
              'They integrated real found everyday objects and garbage with oil paint.',
              'They were exclusively displayed in underground subway stations.',
              'They banned all human figures from visual art.'
            ],
            correctAnswer: 'They integrated real found everyday objects and garbage with oil paint.',
            explanation: 'Paragraph A notes combines melded oil paint with everyday discarded urban artifacts.'
          },
          {
            id: 'cq-33',
            questionNumber: 33,
            partNumber: 5 as const,
            type: 'multiple_choice' as const,
            prompt: 'What was the philosophical effect of Warhol\'s repetitive grid silkscreens?',
            options: [
              'They proved that machine printing is inferior to wood carving.',
              'They challenged the romantic idea of a single unique artist\'s original authorship.',
              'They forced grocery stores to stop selling packaged canned foods.',
              'They made museums refuse all modern artworks.'
            ],
            correctAnswer: 'They challenged the romantic idea of a single unique artist\'s original authorship.',
            explanation: 'Paragraph B states his repetitive grid prints challenged traditional notions of original authorship.'
          },
          {
            id: 'cq-34',
            questionNumber: 34,
            partNumber: 5 as const,
            type: 'multiple_choice' as const,
            prompt: 'Which artistic movement was directly superseded by Rauschenberg and Warhol?',
            options: [
              'Abstract Expressionism',
              'French Impressionism',
              'Italian Renaissance',
              'German Romanticism'
            ],
            correctAnswer: 'Abstract Expressionism',
            explanation: 'Paragraph A states American visual art broke away from Abstract Expressionism.'
          },
          {
            id: 'cq-35',
            questionNumber: 35,
            partNumber: 5 as const,
            type: 'multiple_choice' as const,
            prompt: 'According to the passage, what consumer item did Warhol famously paint 32 canvases of?',
            options: [
              'Campbell\'s soup cans',
              'Vintage sports cars',
              'French perfume bottles',
              'Airline boarding passes'
            ],
            correctAnswer: 'Campbell\'s soup cans',
            explanation: 'Paragraph B highlights Campbell\'s soup cans.'
          }
        ]
      }
    ]
  };
}

function getFallbackIeltsTest(customTitle?: string) {
  return {
    id: 'reading-ielts-' + Date.now(),
    title: customTitle || 'Cambridge IELTS Academic Simulation (Reading)',
    track: 'ielts' as const,
    durationMinutes: 60,
    passages: [
      {
        id: 'ielts-p1',
        passageNumber: 1,
        title: 'Passage 1: Neurological Architecture of Bilingualism',
        subheading: 'How bilingual cognitive control influences executive brain functions',
        paragraphs: [
          {
            label: 'A',
            text: 'For decades, early 20th-century pedagogy warned that multilingualism burdened adolescent minds. Modern fMRI neuroimaging dismantles this myth, proving bilinguals continuously suppress irrelevant lexical candidates, sharpening executive control.'
          },
          {
            label: 'B',
            text: 'Longitudinal clinical trials demonstrate that constant dual-language processing reinforces the prefrontal cortex, deferring the symptomatic onset of neurodegenerative disorders like Alzheimer’s by four to five years.'
          }
        ],
        questions: [
          {
            id: 'iq-1',
            questionNumber: 1,
            type: 'true_false_not_given' as const,
            prompt: '20th-century educators universally advocated simultaneous foreign language learning.',
            options: ['True', 'False', 'Not Given'],
            correctAnswer: 'False',
            explanation: 'Paragraph A states early pedagogy warned against it as a burden.'
          },
          {
            id: 'iq-2',
            questionNumber: 2,
            type: 'multiple_choice' as const,
            prompt: 'How does lifelong bilingualism impact Alzheimer’s disease?',
            options: [
              'It defers symptomatic onset by 4-5 years through cognitive reserve.',
              'It completely eliminates physical brain deterioration.',
              'It enables doctors to prescribe fewer medications.',
              'It causes early onset of cognitive memory fatigue.'
            ],
            correctAnswer: 'It defers symptomatic onset by 4-5 years through cognitive reserve.',
            explanation: 'Paragraph B explicitly notes a 4-5 year deferral of symptoms.'
          }
        ]
      }
    ]
  };
}

function getFallbackGeneralTest(customTitle?: string) {
  return {
    id: 'reading-general-' + Date.now(),
    title: customTitle || 'General English Everyday Practical Test (Workplace & Travel)',
    track: 'general' as const,
    durationMinutes: 45,
    passages: [
      {
        id: 'gen-p1',
        passageNumber: 1,
        title: 'Section 1: Modern Coworking Space Guidelines & Safety Notice',
        subheading: 'Rules for conference room bookings and recycling compliance',
        paragraphs: [
          {
            label: 'A',
            text: 'Welcome to Apex Hub! Hot-desk memberships grant 24/7 keycard access. Quiet zone booths require advance booking through our mobile app, and all visitors must be registered at the reception desk before 6:00 PM.'
          },
          {
            label: 'B',
            text: 'Complimentary fair-trade coffee and herbal teas are provided in the community kitchen. Members are kindly requested to wash their mugs or place them into the dishwasher before departing.'
          }
        ],
        questions: [
          {
            id: 'gq-1',
            questionNumber: 1,
            type: 'multiple_choice' as const,
            prompt: 'How must members reserve quiet zone booths at Apex Hub?',
            options: [
              'By notifying the security guard in writing',
              'Through the dedicated mobile application in advance',
              'By paying a cash deposit at reception',
              'Reservations are strictly not permitted'
            ],
            correctAnswer: 'Through the dedicated mobile application in advance',
            explanation: 'Paragraph A states quiet zone booths require advance booking through our mobile app.'
          },
          {
            id: 'gq-2',
            questionNumber: 2,
            type: 'true_false_not_given' as const,
            prompt: 'Visitors may enter the hub without registration after 6:00 PM.',
            options: ['True', 'False', 'Not Given'],
            correctAnswer: 'False',
            explanation: 'Paragraph A notes all visitors must be registered before 6:00 PM.'
          }
        ]
      }
    ]
  };
}

/**
 * 7. Student practice test generator.
 * Builds a short multiple-choice quiz from the material the student pasted.
 * Output is validated: only questions with 4 options and a valid correct index are kept.
 */
export async function generateStudentPracticeTest(params: { source: string; count?: number; level?: string; apiKey?: string }) {
  const count = Math.max(3, Math.min(10, Math.floor(params.count || 5)));
  const level = (params.level || 'B2').slice(0, 20);
  const systemInstruction = `You are the Edu Level practice-test writer.
Write exactly ${count} multiple-choice questions based ONLY on the material the student provides.
Each question has exactly 4 options and exactly one correct option.
Write the questions and options in English. Write each explanation in Uzbek (1-2 short sentences).
Questions must not repeat each other and must match CEFR level ${level}.
Output strictly valid JSON:
{ "title": "short topic title", "questions": [ { "prompt": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." } ] }`;
  try {
    const raw = await executeUniversalAi({ task: 'test_generation',
      apiKey: params.apiKey,
      systemInstruction,
      prompt: `Material:\n${params.source}`,
      temperature: 0.4,
      jsonMode: true
    });
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
      .filter(
        (q: any) =>
          q &&
          typeof q.prompt === 'string' &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          q.options.every((o: any) => typeof o === 'string' && o.trim()) &&
          Number.isInteger(q.correctIndex) &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3
      )
      .slice(0, count)
      .map((q: any) => ({
        prompt: q.prompt.slice(0, 500),
        options: q.options.map((o: string) => o.slice(0, 200)),
        correctIndex: q.correctIndex as number,
        explanation: typeof q.explanation === 'string' ? q.explanation.slice(0, 500) : ''
      }));
    if (!questions.length) throw new Error('AI javobi noto‘g‘ri formatda');
    return { title: typeof parsed?.title === 'string' ? parsed.title.slice(0, 120) : 'Amaliy test', questions };
  } catch (e: any) {
    throw new AiUnavailableError('Test yasash', e);
  }
}

/**
 * 8. Owner assistant.
 * Answers management questions from a compact platform summary. It can only advise: it never performs actions.
 */
export async function ownerAssistantReply(params: { question: string; summary: string; apiKey?: string }) {
  const systemInstruction = `Sen Edu Level platformasi egasining AI yordamchisisan.
Faqat quyida berilgan platforma xulosasiga tayan. Xulosada yo'q ma'lumot so'ralsa, "bu ma'lumot menda yo'q" deb ayt va qayerdan topish mumkinligini ko'rsat.
Sen hech qanday amal bajara olmaysan: o'chirmaysan, o'zgartirmaysan, to'lovni tasdiqlamaysan. Faqat tavsiya ber va qaysi bo'limga o'tish kerakligini ayt.
Raqamlarni o'zgartirma. Javob qisqa, aniq, o'zbek tilida, kerak bo'lsa ro'yxat bilan.`;
  try {
    return await executeUniversalAi({ task: 'analysis',
      apiKey: params.apiKey,
      systemInstruction,
      prompt: `Platforma xulosasi:\n${params.summary}\n\nOwner savoli: ${params.question}`,
      temperature: 0.2
    });
  } catch (e: any) {
    throw new AiUnavailableError('AI yordamchi', e);
  }
}

/**
 * Mashqlar: turns the owner's text (reading passage, transcript, topic) into draft exercise questions.
 * Output is validated per question type; malformed items are dropped. The owner reviews every draft
 * before publishing, so nothing reaches students unchecked.
 */
export async function generateExercisesFromText(params: {
  source: string;
  skill: 'reading' | 'listening' | 'speaking' | 'writing';
  level: string;
  count?: number;
  apiKey?: string;
}) {
  const count = Math.max(3, Math.min(12, Math.floor(params.count || 6)));
  const level = (params.level || 'B1').slice(0, 10);
  const taskByskill: Record<string, string> = {
    reading: 'comprehension questions about the passage: multiple-choice ("mcq") and gap-fill ("gap", a single missing word)',
    listening: 'comprehension questions about the listening transcript: multiple-choice ("mcq") and gap-fill ("gap")',
    speaking: 'speaking prompts ("short") that a student answers aloud or in writing, plus one "mcq" vocabulary check',
    writing: 'writing tasks ("short") with a clear prompt and word limit, plus one "gap" grammar item'
  };
  const systemInstruction = `You write English practice exercises for Edu Level students at CEFR level ${level}.
Use ONLY the material the teacher provides. Create exactly ${count} items: ${taskByskill[params.skill]}.
Write questions and options in English. Write each explanation in Uzbek (1-2 short sentences).
Rules:
- "mcq": exactly 4 options, exactly one correct; "correctIndex" is 0-3.
- "gap": "correctText" is the single word or short phrase that fills the gap; the prompt contains "___".
- "short": no correct answer required; "correctText" may hold a model answer.
Output strictly valid JSON:
{ "title": "short title", "instructions": "one sentence for the student", "questions": [ { "type": "mcq|gap|short", "prompt": "...", "options": ["...","...","...","..."], "correctIndex": 0, "correctText": "...", "explanation": "..." } ] }`;
  try {
    const raw = await executeUniversalAi({ task: 'test_generation',
      apiKey: params.apiKey,
      systemInstruction,
      prompt: `Material:\n${params.source.slice(0, 12000)}`,
      temperature: 0.4,
      jsonMode: true
    });
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
      .map((q: any, i: number) => {
        if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) return null;
        const base = {
          id: `q${i + 1}`,
          prompt: q.prompt.trim().slice(0, 600),
          explanation: typeof q.explanation === 'string' ? q.explanation.slice(0, 500) : ''
        };
        if (q.type === 'mcq') {
          const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim().slice(0, 200)) : [];
          if (options.length !== 4 || options.some((o: string) => !o)) return null;
          if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) return null;
          return { ...base, type: 'mcq', options, correct: q.correctIndex };
        }
        if (q.type === 'gap') {
          const correct = typeof q.correctText === 'string' ? q.correctText.trim().slice(0, 120) : '';
          if (!correct || !base.prompt.includes('___')) return null;
          return { ...base, type: 'gap', correct };
        }
        if (q.type === 'short') {
          const model = typeof q.correctText === 'string' ? q.correctText.trim().slice(0, 1200) : '';
          return { ...base, type: 'short', correct: model || undefined };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, count);
    if (!questions.length) throw new Error('AI javobi noto‘g‘ri formatda');
    return {
      title: typeof parsed?.title === 'string' ? parsed.title.slice(0, 160) : 'Mashq',
      instructions: typeof parsed?.instructions === 'string' ? parsed.instructions.slice(0, 300) : '',
      questions
    };
  } catch (e: any) {
    throw new AiUnavailableError('Mashq yaratish', e);
  }
}

export interface GeminiBenchmark {
  provider: 'gemini';
  model: string;
  ok: boolean;
  ttftMs: number | null;
  totalMs: number | null;
  chars: number;
  message?: string;
}

/**
 * One tiny streamed Gemini request (first word latency and total time), on the model the router would use first.
 * It uses the server's own key (never shown) and counts against the free quota only (one request).
 */
export async function benchmarkGemini(fetchImpl: typeof fetch = fetch): Promise<GeminiBenchmark> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return { provider: 'gemini', model: '—', ok: false, ttftMs: null, totalMs: null, chars: 0, message: 'GEMINI_API_KEY sozlanmagan' };
  if (!geminiAllowed()) return { provider: 'gemini', model: '—', ok: false, ttftMs: null, totalMs: null, chars: 0, message: 'Gemini bepul tarifi owner tomonidan tasdiqlanmagan (GEMINI_FREE_TIER_CONFIRMED=1): so‘rov yuborilmadi' };
  // Same model order and cooldowns as real answers; a model that just answered 429 is not asked again.
  const all = await pickGeminiModelsFast(apiKey).catch(() => [] as string[]);
  const candidates = usableModels(all.length ? all : GEMINI_MODELS).filter((m) => !isGemmaModel(m)).slice(0, 3);
  if (!candidates.length) return { provider: 'gemini', model: '—', ok: false, ttftMs: null, totalMs: null, chars: 0, message: 'Gemini modellari vaqtincha kutilmoqda (429 yoki mavjud emas)' };
  let last: GeminiBenchmark | null = null;
  for (const m of candidates) {
    last = await benchmarkGeminiModel(m.replace(/^models\//, ''), apiKey, fetchImpl);
    if (last.ok) return last;
    if (!/HTTP (429|404|503)/.test(last.message || '')) break;
  }
  return last as GeminiBenchmark;
}

async function benchmarkGeminiModel(model: string, apiKey: string, fetchImpl: typeof fetch): Promise<GeminiBenchmark> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const t0 = Date.now();
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Count from one to five in English, in one line.' }] }], generationConfig: { maxOutputTokens: 64, temperature: 0 } })
    });
    if (!res.ok || !res.body) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch { /* ignore */ }
      const retry = res.headers.get('retry-after');
      markModelFailed(model, `${res.status} ${detail}`);
      const reason = res.status === 429 ? ` — kvota (${/PerDay|daily/i.test(detail) ? 'kunlik' : /PerMinute/i.test(detail) ? 'daqiqalik' : 'noma’lum turdagi'}${retry ? `, Retry-After ${retry}s` : ''})` : '';
      return { provider: 'gemini', model, ok: false, ttftMs: null, totalMs: Date.now() - t0, chars: 0, message: `gemini HTTP ${res.status}${reason}` };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let ttft: number | null = null;
    let chars = 0;
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const m = line.match(/^data:\s*(.+)$/);
        if (!m) continue;
        try {
          const parts: { text?: string; thought?: boolean }[] = JSON.parse(m[1])?.candidates?.[0]?.content?.parts || [];
          const piece = parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('');
          if (piece) {
            if (ttft === null) ttft = Date.now() - t0;
            chars += piece.length;
          }
        } catch {
          /* partial line */
        }
      }
    }
    const total = Date.now() - t0;
    if (ttft === null) return { provider: 'gemini', model, ok: false, ttftMs: null, totalMs: total, chars, message: `gemini: oqimda matn kelmadi (model: ${model})` };
    return { provider: 'gemini', model, ok: true, ttftMs: ttft, totalMs: total, chars };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    return { provider: 'gemini', model, ok: false, ttftMs: null, totalMs: Date.now() - t0, chars: 0, message: `gemini: ${timedOut ? 'javob vaqti tugadi' : 'tarmoq xatosi'}` };
  } finally {
    clearTimeout(timer);
  }
}
