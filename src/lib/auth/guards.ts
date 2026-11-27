import { isGiftActive } from '../vipGift';
import { aiMinutesFor } from '../aiTime';
import { hasVipAccess } from '../vipAccess';
import { publicThematicQuestions } from '../exam/thematicGrading';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../dbStore';
import { AppDatabase, User } from '../../types';
import { SESSION_COOKIE, SESSION_TTL_MS, SessionRecord, getSession, OWNER_ID } from './session';
import { safeEqual, verifyPassword } from './password';

export { OWNER_ID };

export interface AuthContext {
  session: SessionRecord;
  token: string;
  role: 'student' | 'owner';
  userId: string;
  user: User | null;
}

export function readToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * A student is banned while a ban is active: permanently ('forever'), until bannedUntil,
 * or while the account is blocked without an end date. Expired temporary bans stop applying.
 */
export function isBanned(user: User, now = Date.now()): boolean {
  if (user.bannedUntil === 'forever') return true;
  if (user.bannedUntil) return new Date(user.bannedUntil).getTime() > now;
  return !!user.isBlocked;
}

export function getAuth(req: NextRequest): AuthContext | null {
  const token = readToken(req);
  const session = getSession(token);
  if (!session || !token) return null;

  if (session.role === 'owner') {
    return { session, token, role: 'owner', userId: session.userId, user: null };
  }

  const db = getDatabase();
  const user = db.users.find((u) => u.id === session.userId) || null;
  // A deleted or blocked student loses access immediately.
  if (!user || isBanned(user)) return null;
  return { session, token, role: 'student', userId: user.id, user };
}

export function unauthorized(message = 'Avval tizimga kiring.') {
  return NextResponse.json({ success: false, message, code: 'UNAUTHORIZED' }, { status: 401 });
}

export function forbidden(message = 'Bu amal uchun ruxsat yo‘q.') {
  return NextResponse.json({ success: false, message, code: 'FORBIDDEN' }, { status: 403 });
}

/** Returns an error response, or the auth context when the caller may proceed. */
export function requireAuth(req: NextRequest): AuthContext | NextResponse {
  return getAuth(req) || unauthorized();
}

export function requireOwner(req: NextRequest): AuthContext | NextResponse {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'owner') return forbidden();
  return auth;
}

/** Student may only act on their own id; the owner may act on anyone. */
export function canActOnUser(auth: AuthContext, targetUserId: string | undefined | null): boolean {
  if (auth.role === 'owner') return true;
  return !!targetUserId && auth.userId === targetUserId;
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000)
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

/** Owner login name: stored in the database, default "jasurbek" (or OWNER_USERNAME). */
export function getOwnerUsername(db: AppDatabase = getDatabase()): string {
  return (db.ownerUsername || process.env.OWNER_USERNAME || 'jasurbek').trim();
}

/**
 * Owner password check against the hash stored in the database.
 * OWNER_PASSWORD is only a bootstrap: it is hashed into the database on first start
 * (see dbStore), after which the owner changes the password from the admin panel.
 */
export function verifyOwnerSecret(candidate: string, db: AppDatabase = getDatabase()): boolean {
  const secret = (candidate || '').trim();
  if (!secret) return false;
  if (db.ownerPasswordHash) return verifyPassword(secret, db.ownerPasswordHash).ok;
  const envPassword = (process.env.OWNER_PASSWORD || '').trim();
  return !!envPassword && safeEqual(secret, envPassword);
}

export function verifyOwnerLogin(username: string, password: string, db: AppDatabase = getDatabase()): boolean {
  const name = (username || '').trim().toLowerCase();
  if (!name || name !== getOwnerUsername(db).toLowerCase()) {
    // still spend the hashing time so timing does not reveal the username
    verifyOwnerSecret(password + '\u0000', db);
    return false;
  }
  return verifyOwnerSecret(password, db);
}

// ---------------------------------------------------------------------------
// Response sanitizing: never send secrets or other people's private data.
// ---------------------------------------------------------------------------

export function publicUser<T extends Partial<User>>(user: T | null | undefined): Omit<T, 'password'> | null {
  if (!user) return null;
  const { password, ...rest } = user as any;
  return rest;
}

const PRIVATE_USER_FIELDS = ['password', 'email', 'phone', 'additionalPhone', 'telegramUsername', 'balance', 'region'] as const;

function stripOtherUser(u: User): User {
  const copy: any = { ...u };
  for (const f of PRIVATE_USER_FIELDS) delete copy[f];
  return copy;
}

export function sanitizeDatabase(db: AppDatabase, auth: AuthContext | null): AppDatabase {
  const out: any = { ...db };
  delete out.ownerPasswordHash;
  delete out.vipGiftApplied; // internal bookkeeping
  delete out.examSessions; // exam sessions are only read through the exam endpoints
  if (auth?.role !== 'owner') out.promoCodes = []; // students check a code through /api/student/promo-check
  // Purchases: owner sees all; a student sees only their own.
  out.purchases = auth?.role === 'owner' ? db.purchases || [] : (db.purchases || []).filter((p) => !!auth && p.userId === auth.userId);
  delete out.aiThreads; // chat threads are only read through /api/student/ai-threads
  if (auth?.role !== 'owner') {
    delete out.ownerUsername;
    delete out.aiUsage;
  }

  if (out.aiSettings) {
    const { customApiKey, ...restAi } = out.aiSettings;
    out.aiSettings = { ...restAi, hasCustomKey: !!customApiKey };
  }

  // Mashqlar: students see published exercises without answer keys or explanations;
  // attempts are visible only to their owner. The owner sees everything.
  const ownerView = auth?.role === 'owner';
  out.exercises = (db.exercises || [])
    .filter((e) => ownerView || e.status === 'published')
    .map((e) => (ownerView ? e : { ...e, questions: e.questions.map(({ correct, explanation, ...q }) => { void correct; void explanation; return q; }) }));
  // Thematic packs: the answer key and explanations stay on the server (graded by /api/thematic-packs/grade).
  if (!ownerView) out.thematicQuizPacks = (db.thematicQuizPacks || []).map((p) => ({ ...p, questions: publicThematicQuestions(p.questions || []) }));
  out.news = (db.news || []).filter((n) => ownerView || n.published);
  // A FAQ the owner switched off is a draft: students do not receive it.
  out.faqs = (db.faqs || []).filter((f) => ownerView || f.isVisible !== false);
  if (!ownerView && !isGiftActive(db.vipGift)) out.vipGift = undefined;
  if (!ownerView) out.aiLimits = undefined;
  if (!ownerView) out.aiRouting = undefined;
  if (!ownerView) out.seoPages = undefined;
  if (!ownerView) out.newsSubscribers = undefined;
  {
    const todayTk = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
    const stu = (db.users || []).filter((u) => u.role === 'student');
    out.publicStats = { students: stu.length, activeToday: stu.filter((u) => u.lastActiveDate === todayTk).length };
  }
  out.vipPlans = (db.vipPlans || []).map((p) => ({ ...p, aiDailyMinutes: aiMinutesFor(db.aiLimits, { vipTier: p.id }) }));
  out.exerciseAttempts = ownerView ? db.exerciseAttempts || [] : (db.exerciseAttempts || []).filter((a) => !!auth && a.userId === auth.userId);

  if (auth?.role === 'owner') {
    out.users = db.users.map((u) => publicUser(u));
    return out;
  }

  out.users = db.users.map((u) => (auth && u.id === auth.userId ? publicUser(u) : stripOtherUser(u)));

  // Answer keys stay on the server until an attempt is submitted (see /api/test-attempts).
  // A test the owner has not published is a draft: students get neither it nor its questions.
  const visibleTestIds = new Set((db.tests || []).filter((t: any) => t.published !== false).map((t: any) => t.id));
  out.tests = (db.tests || []).filter((t: any) => visibleTestIds.has(t.id));
  out.questions = (db.questions || []).filter((q: any) => visibleTestIds.has(q.testId)).map((q: any) => {
    const { correctAnswerIndex, explanation, ...rest } = q;
    void correctAnswerIndex;
    void explanation;
    return rest;
  });
  out.readingTests = (db.readingTests || []).map((t: any) => ({
    ...t,
    passages: (t.passages || []).map((p: any) => ({
      ...p,
      questions: (p.questions || []).map((q: any) => {
        const { correctAnswer, explanation, evidenceQuote, evidenceParagraphLabel, ...rest } = q;
        void correctAnswer;
        void explanation;
        void evidenceQuote;
        void evidenceParagraphLabel;
        return rest;
      })
    }))
  }));
  out.listeningTests = (db.listeningTests || []).map((t: any) => ({
    ...t,
    sections: (t.sections || []).map((sec: any) => {
      const { transcript, ...restSec } = sec;
      void transcript;
      return {
        ...restSec,
        questions: (sec.questions || []).map((q: any) => {
          const { correctAnswerIndex, explanation, ...rest } = q;
          void correctAnswerIndex;
          void explanation;
          return rest;
        })
      };
    })
  }));

  // Finance and support data are private: students only see their own entries.
  out.depositTransactions = (db.depositTransactions || []).filter((t) => auth && t.userId === auth.userId);
  out.supportTickets = auth?.user
    ? (db.supportTickets || []).filter(
        (t: any) =>
          (t.userPhone && auth.user!.phone && t.userPhone.replace(/\D/g, '') === auth.user!.phone.replace(/\D/g, '')) ||
          t.userId === auth.userId
      )
    : [];
  out.auditLogs = [];
  out.blacklistedUsers = [];
  out.lessonProgress = (db.lessonProgress || []).filter((p: any) => auth && p.userId === auth.userId);
  // Unpublished lessons/courses are drafts: students do not receive them.
  // Lesson media (video, PDF, notes) of a VIP course is sent only to viewers whose active tier allows it.
  // The paywall must hold on the server: the client never receives links it is not allowed to open.
  const viewer = auth?.user as any;
  const viewerTier = (() => {
    if (!viewer || !viewer.vipTier) return 'none';
    if (viewer.vipExpiresAt && Date.parse(viewer.vipExpiresAt) < Date.now()) return 'none';
    return String(viewer.vipTier);
  })();
  const courseTier = new Map<string, string>((db.courses || []).map((c: any) => [c.id, c.requiredVIP || 'none']));
  out.lessons = (db.lessons || [])
    .filter((l: any) => l.isPublished !== false)
    .map((l: any) => {
      const required = courseTier.get(l.courseId) || 'none';
      if (ownerView || required === 'none' || required === 'free') return l;
      if (hasVipAccess(viewerTier, required)) return l;
      const { videoUrl, pdfUrl, notesMarkdown, subtitleUrl, bunnyVideoId, downloads, ...rest } = l as any;
      void videoUrl; void pdfUrl; void notesMarkdown; void subtitleUrl; void bunnyVideoId; void downloads;
      return { ...rest, videoUrl: '', locked: true };
    });
  out.courses = (db.courses || []).filter((c: any) => c.published !== false);
  out.flashcards = (db.flashcards || []).filter((f: any) => !f.userId || (auth && f.userId === auth.userId));
  out.writingSubmissions = (db.writingSubmissions || []).filter((w: any) => auth && w.userId === auth.userId);
  out.speakingSubmissions = (db.speakingSubmissions || []).filter((w: any) => auth && w.userId === auth.userId);
  out.reviews = (db.reviews || []).filter((r: any) => r.status === 'approved' || (auth && r.userId === auth.userId));
  out.testAttempts = (db.testAttempts || []).filter((a) => auth && a.userId === auth.userId);
  if (out.telegramBotSettings) {
    const { botToken, adminChatId, ownerTelegramId, ...restBot } = out.telegramBotSettings as any;
    void ownerTelegramId;
    out.telegramBotSettings = restBot;
  }
  return out;
}
