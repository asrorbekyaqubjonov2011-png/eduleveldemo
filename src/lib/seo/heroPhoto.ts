import { getPool } from '@/src/lib/db/pool';

/**
 * The teacher photo shown in the landing hero, read on the server so the browser can start downloading it from the
 * first HTML response (a `<link rel="preload">`), before the client app has loaded. Returns null when the database is
 * unreachable or no photo is set: the page then renders as before.
 */
export async function heroTeacherPhoto(): Promise<string | null> {
  try {
    const { rows } = await getPool().query("select value from public.site_settings where key = 'teacher_profile' limit 1");
    const photo = (rows[0]?.value as { photoUrl?: unknown } | undefined)?.photoUrl;
    return typeof photo === 'string' && /^https:\/\//.test(photo) ? photo : null;
  } catch {
    return null;
  }
}


/** Hero content read on the server (real owner settings only). Numbers are 0 when not set, and are then not shown. */
export interface HeroPublicData {
  photo: string | null;
  name: string;
  title: string;
  students: number;
  certs: number;
  grants: number;
  experienceYears: number;
}

export async function heroPublicData(): Promise<HeroPublicData> {
  const empty: HeroPublicData = { photo: null, name: '', title: '', students: 0, certs: 0, grants: 0, experienceYears: 0 };
  try {
    const { rows } = await getPool().query("select value from public.site_settings where key = 'teacher_profile' limit 1");
    const v = (rows[0]?.value || {}) as { photoUrl?: unknown; name?: unknown; title?: unknown; studentsCount?: unknown; nationalCertCount?: unknown; grantCount?: unknown; experienceYears?: unknown };
    const num = (x: unknown) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.round(Number(x)) : 0);
    const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 120) : '');
    return {
      photo: typeof v.photoUrl === 'string' && /^https:\/\//.test(v.photoUrl) ? v.photoUrl : null,
      name: str(v.name),
      title: str(v.title),
      students: num(v.studentsCount),
      certs: num(v.nationalCertCount),
      grants: num(v.grantCount),
      experienceYears: num(v.experienceYears)
    };
  } catch {
    return empty;
  }
}
