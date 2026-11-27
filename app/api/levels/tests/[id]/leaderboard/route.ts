import { NextRequest, NextResponse } from 'next/server';
import { withDatabase } from '@/src/lib/dbStore';
import { requireAuth } from '@/src/lib/auth/guards';
import { requireContext } from '@/src/lib/db/context';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Best finished result per student for one test or tournament. Shows name, class, best percent, level and the time
 * it was reached. Only finished attempts count; names are the ones the student entered for that attempt.
 */
async function handleGet(req: NextRequest, ctx: Ctx) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const { rows } = await requireContext().client.query(
    `select distinct on (lower(first_name), lower(last_name), lower(class_name))
            first_name, last_name, class_name, percent, level_label, finished_at, score, max_score
       from public.level_attempts
      where test_id = $1 and status = 'finished' and percent is not null
      order by lower(first_name), lower(last_name), lower(class_name), percent desc, finished_at asc`,
    [id]
  );
  rows.sort((a, b) => Number(b.percent) - Number(a.percent) || new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime());
  // Other students see the first name and the last-name initial only (privacy); the owner sees full names in reports.
  const masked = rows.slice(0, 100).map((r, i) => ({
    rank: i + 1,
    first_name: r.first_name,
    last_name: r.last_name ? `${String(r.last_name).charAt(0).toUpperCase()}.` : '',
    class_name: r.class_name,
    percent: r.percent,
    level_label: r.level_label
  }));
  return NextResponse.json({ success: true, leaderboard: masked });
}

export const GET = withDatabase(handleGet);
