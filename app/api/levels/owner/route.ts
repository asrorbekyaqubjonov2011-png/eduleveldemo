import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireOwner } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';
import { hashPassword } from '@/src/lib/auth/password';
import { validateGradingRules, generateUnlockCode } from '@/src/lib/levelTests/logic';

export const dynamic = 'force-dynamic';

const KINDS = new Set(['test', 'tournament']);
const ACCESS = new Set(['open', 'code']);

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** GET: every level test and tournament with question and attempt counts (owner view). */
async function handleGet(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { rows } = await requireContext().client.query(
    `select t.*,
            (select count(*)::int from public.level_questions q where q.test_id = t.id) as question_count,
            (select count(*)::int from public.level_attempts a where a.test_id = t.id) as attempt_count,
            (select count(*)::int from public.level_attempts a where a.test_id = t.id and a.status = 'in_progress') as active_count
       from public.level_tests t
      order by t.created_at desc`
  );
  return NextResponse.json({ success: true, tests: rows.map(stripSecrets) });
}

/** POST: create a test or tournament. Body: kind, title, description, access, timeLimitSeconds, attemptsAllowed, gradingRules, ... */
async function handlePost(req: NextRequest) {
  const auth = requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Noto‘g‘ri so‘rov.' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
  if (!title) return NextResponse.json({ success: false, message: 'Nom kiritilishi shart.' }, { status: 400 });
  const kind = KINDS.has(body.kind) ? body.kind : 'test';
  const access = ACCESS.has(body.access) ? body.access : 'open';
  const rules = validateGradingRules(body.gradingRules ?? []);
  if (!rules.ok) return NextResponse.json({ success: false, message: rules.error }, { status: 400 });

  const id = `lvl-${crypto.randomUUID()}`;
  let entryCode: string | null = null;
  let entryHash: string | null = null;
  if (access === 'code') {
    entryCode = generateUnlockCode();
    entryHash = hashPassword(entryCode);
  }
  await requireContext().client.query(
    `insert into public.level_tests
       (id, kind, title, description, access, entry_code_hash, entry_code_plain, status, time_limit_seconds, attempts_allowed,
        starts_at, ends_at, grading_rules, certificate_enabled, shuffle_questions, require_fullscreen, max_violations, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      id,
      kind,
      title,
      typeof body.description === 'string' ? body.description.slice(0, 2000) : '',
      access,
      entryHash,
      entryCode,
      clampInt(body.timeLimitSeconds, 60, 14400, 1800),
      clampInt(body.attemptsAllowed, 1, 10, 1),
      body.startsAt ? new Date(body.startsAt) : null,
      body.endsAt ? new Date(body.endsAt) : null,
      JSON.stringify(rules.rules),
      body.certificateEnabled === true,
      body.shuffleQuestions !== false,
      body.requireFullscreen !== false,
      clampInt(body.maxViolations, 0, 10, 2),
      auth.userId ?? null
    ]
  );
  // The owner can see the entry code again at any time (it is a classroom code, not a password). The hash is kept for checks.
  return NextResponse.json({ success: true, id, entryCode }, { status: 201 });
}

/** Never send hashes to the browser. Entry codes are shown only once, at creation or regeneration. */
function stripSecrets(row: Record<string, any>) {
  const { entry_code_hash: _h, entry_code_plain, ...rest } = row;
  return { ...rest, entry_code: entry_code_plain ?? null, has_entry_code: Boolean(row.entry_code_hash), kind: KINDS.has(row.kind) ? row.kind : 'test' };
}

export const GET = withDatabase(handleGet);
export const POST = withDatabase(handlePost);
