import type { AppDatabase, User, Course, Lesson, Test, Question, TestAttempt, ExamSession, LessonProgress, DepositTransaction, SupportTicket, Review, VIPPlan, SiteSection, FaqItem, AuditLog, PromoCode, Purchase } from '../../types';
import type { Queryable } from './pool';

/**
 * Snapshot layer: maps the domain model (AppDatabase) to relational tables and back.
 *
 * - loadDatabase() reads every table once and assembles the domain object.
 * - buildRows() derives the rows each table should contain from the domain object.
 * - persistDatabase() compares the current rows with the rows captured at load time
 *   (fingerprints) and writes only what changed: upserts parent-first, deletes child-first.
 *
 * Rows whose parent is missing (for example a progress entry for a deleted lesson) are
 * skipped instead of violating a foreign key.
 */

type Row = Record<string, unknown>;
const KEY_SEP = '\u0001';
/** Stand-in timestamp for synthetic rows, so unchanged rows never look modified. */
const EPOCH = '1970-01-01T00:00:00.000Z';

interface TableSpec {
  name: string;
  keys: string[];
  jsonCols: string[];
  build: (db: AppDatabase) => Map<string, Row>;
}

const keyOf = (...parts: string[]) => parts.join(KEY_SEP);
const nul = <T>(v: T | undefined | null): T | null => (v === undefined || v === null || (v as unknown) === '' ? null : v);
const toBool = (v: unknown) => !!v;

// ---------------------------------------------------------------------------
// Row builders (domain → rows)
// ---------------------------------------------------------------------------

function userRow(u: User): Row {
  return {
    id: u.id,
    name: u.name ?? '',
    surname: u.surname ?? '',
    phone: u.phone ?? '',
    email: nul(u.email),
    telegram_username: nul(u.telegramUsername),
    additional_phone: nul(u.additionalPhone),
    password_hash: u.password ?? '',
    vip_tier: u.vipTier || 'none',
    vip_expires_at: nul(u.vipExpiresAt),
    track: nul(u.track),
    target_score: nul(u.targetScore),
    target_band: nul(u.targetBand),
    study_time_daily: nul(u.studyTimeDaily),
    region: nul(u.region),
    avatar: nul(u.avatar),
    avatar_frame: nul(u.avatarFrame),
    name_color: nul(u.nameColor),
    custom_title: nul(u.customTitle),
    rank_title: nul(u.rankTitle),
    balance: u.balance ?? 0,
    coins: u.coins ?? 0,
    points: u.points ?? 0,
    xp: u.xp ?? 0,
    streak_days: u.streakDays ?? 0,
    streak_freeze_count: u.streakFreezeCount ?? 0,
    last_active_date: nul(u.lastActiveDate),
    last_daily_quest_date: nul(u.lastDailyQuestDate),
    inventory: u.inventory ?? [],
    purchased_item_ids: u.purchasedItemIds ?? [],
    read_book_ids: u.readBookIds ?? [],
    completed_pack_ids: u.completedPackIds ?? [],
    is_blocked: toBool(u.isBlocked),
    ban_level: u.banLevel ?? 0,
    banned_until: nul(u.bannedUntil),
    ban_reason: nul(u.banReason),
    registered_at: u.registeredAt || EPOCH
  };
}

function userFromRow(r: any, completed: string[]): User {
  return {
    id: r.id,
    name: r.name,
    surname: r.surname,
    phone: r.phone,
    email: r.email ?? undefined,
    telegramUsername: r.telegram_username ?? undefined,
    additionalPhone: r.additional_phone ?? undefined,
    password: r.password_hash,
    role: 'student',
    vipTier: r.vip_tier,
    vipExpiresAt: r.vip_expires_at ?? undefined,
    track: r.track ?? undefined,
    targetScore: r.target_score ?? undefined,
    targetBand: r.target_band ?? undefined,
    studyTimeDaily: r.study_time_daily ?? undefined,
    region: r.region ?? undefined,
    avatar: r.avatar ?? undefined,
    avatarFrame: r.avatar_frame ?? undefined,
    nameColor: r.name_color ?? undefined,
    customTitle: r.custom_title ?? undefined,
    rankTitle: r.rank_title ?? undefined,
    balance: r.balance,
    coins: r.coins,
    points: r.points,
    xp: r.xp,
    streakDays: r.streak_days,
    streakFreezeCount: r.streak_freeze_count,
    lastActiveDate: r.last_active_date ?? undefined,
    lastDailyQuestDate: r.last_daily_quest_date ?? undefined,
    inventory: r.inventory ?? [],
    purchasedItemIds: r.purchased_item_ids ?? [],
    readBookIds: r.read_book_ids ?? [],
    completedPackIds: r.completed_pack_ids ?? [],
    isBlocked: r.is_blocked,
    banLevel: r.ban_level,
    bannedUntil: r.banned_until ?? undefined,
    banReason: r.ban_reason ?? undefined,
    registeredAt: r.registered_at,
    completedLessons: completed
  };
}

function lessonRow(l: Lesson): Row {
  return {
    id: l.id,
    course_id: l.courseId,
    module_id: nul(l.moduleId),
    title: l.title ?? '',
    description: l.description ?? '',
    video_url: l.videoUrl ?? '',
    subtitle_url: nul(l.subtitleUrl),
    pdf_url: nul(l.pdfUrl),
    notes_markdown: nul(l.notesMarkdown),
    math_formula: nul(l.mathFormula),
    duration_minutes: l.durationMinutes ?? 0,
    order_index: l.orderIndex ?? 0,
    test_id: nul(l.testId),
    is_demo: toBool(l.isDemo),
    lesson_type: nul(l.lessonType),
    required_passing_percent: l.requiredPassingPercent ?? null,
    track: nul(l.track),
    lesson_code: nul(l.lessonCode),
    is_published: l.isPublished !== false,
    resources: l.resources ?? [],
    vocabulary_keywords: l.vocabularyKeywords ?? [],
    homework: nul(l.homework),
    video_tiers: l.videoTiers ?? [],
    bunny_video_id: nul(l.bunnyVideoId)
  };
}

function lessonFromRow(r: any): Lesson {
  return {
    id: r.id,
    courseId: r.course_id,
    moduleId: r.module_id ?? '',
    title: r.title,
    description: r.description,
    videoUrl: r.video_url,
    subtitleUrl: r.subtitle_url ?? undefined,
    pdfUrl: r.pdf_url ?? undefined,
    notesMarkdown: r.notes_markdown ?? undefined,
    mathFormula: r.math_formula ?? undefined,
    durationMinutes: r.duration_minutes,
    orderIndex: r.order_index,
    testId: r.test_id ?? undefined,
    isDemo: r.is_demo,
    lessonType: r.lesson_type ?? undefined,
    requiredPassingPercent: r.required_passing_percent ?? undefined,
    track: r.track ?? undefined,
    lessonCode: r.lesson_code ?? undefined,
    isPublished: r.is_published,
    resources: r.resources ?? [],
    vocabularyKeywords: r.vocabulary_keywords ?? [],
    homework: r.homework ?? undefined,
    videoTiers: r.video_tiers ?? [],
    bunnyVideoId: r.bunny_video_id ?? undefined
  };
}

function testRow(t: Test): Row {
  return {
    id: t.id,
    title: t.title ?? '',
    description: t.description ?? '',
    type: t.type,
    duration_minutes: t.durationMinutes ?? 0,
    max_score: t.maxScore ?? 0,
    required_vip: t.requiredVIP || 'none',
    published: toBool(t.published),
    questions_count: t.questionsCount ?? 0,
    passing_score: t.passingScore ?? null,
    category: nul(t.category),
    track: nul(t.track),
    created_at: t.createdAt || EPOCH
  };
}

function testFromRow(r: any): Test {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    durationMinutes: r.duration_minutes,
    maxScore: r.max_score,
    requiredVIP: r.required_vip,
    published: r.published,
    questionsCount: r.questions_count,
    passingScore: r.passing_score ?? undefined,
    category: r.category ?? undefined,
    createdAt: r.created_at,
    track: r.track ?? undefined
  };
}

function questionFromRow(r: any): Question {
  return {
    id: r.id,
    testId: r.test_id,
    prompt: r.prompt,
    mathFormula: r.math_formula ?? undefined,
    options: r.options ?? [],
    correctAnswerIndex: r.correct_answer_index,
    explanation: r.explanation,
    difficulty: r.difficulty,
    points: r.points ?? undefined
  };
}

function attemptFromRow(r: any): TestAttempt {
  return {
    id: r.id,
    userId: r.user_id ?? '',
    userName: r.user_name,
    testId: r.test_id,
    testTitle: r.test_title,
    score: r.score,
    maxScore: r.max_score,
    correctCount: r.correct_count,
    totalQuestions: r.total_questions,
    answers: r.answers ?? {},
    timeSpentSeconds: r.time_spent_seconds,
    createdAt: r.created_at,
    percentage: r.percentage ?? undefined,
    track: r.track ?? undefined,
    cefrLevel: r.cefr_level ?? undefined
  };
}

function examFromRow(r: any): ExamSession {
  return {
    id: r.id,
    ownerKey: r.owner_key,
    testId: r.test_id,
    kind: r.kind,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    answers: r.answers ?? {},
    updatedAt: r.updated_at,
    submittedAttemptId: r.submitted_attempt_id ?? undefined
  };
}

function depositFromRow(r: any, owner?: User): DepositTransaction {
  return {
    id: r.id,
    userId: r.user_id,
    userName: owner ? `${owner.name} ${owner.surname}`.trim() : '',
    userPhone: owner?.phone ?? '',
    telegramUsername: owner?.telegramUsername ?? undefined,
    amount: r.amount,
    status: r.status,
    method: r.method,
    paymentCode: r.payment_code,
    receiptUrl: r.receipt_url ?? undefined,
    cardNumber: r.card_number ?? undefined,
    note: r.note ?? undefined,
    createdAt: r.created_at,
    approvedAt: r.approved_at ?? undefined
  };
}

function ticketFromRow(r: any): SupportTicket & { userId?: string } {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    userName: r.user_name,
    userPhone: r.user_phone,
    message: r.message,
    category: r.category,
    status: r.status,
    replyText: r.reply_text ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined
  };
}

function reviewFromRow(r: any): Review {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    name: r.name,
    subtitle: r.subtitle ?? undefined,
    track: r.track ?? undefined,
    text: r.text,
    rating: r.rating ?? 0,
    photoUrl: r.photo_url ?? undefined,
    status: r.status,
    createdAt: r.created_at
  };
}

function planFromRow(r: any): VIPPlan {
  return {
    id: r.id,
    name: r.name,
    priceMonthly: r.price_monthly,
    durationDays: r.duration_days,
    description: r.description,
    badge: r.badge ?? undefined,
    features: r.features ?? [],
    hasAI: r.has_ai,
    aiDailyLimit: r.ai_daily_limit,
    bookAllowanceCount: r.book_allowance_count ?? undefined,
    isPopular: r.is_popular
  };
}

function sectionFromRow(r: any): SiteSection {
  return {
    id: r.id,
    key: r.key,
    title: r.title,
    subtitle: r.subtitle,
    ctaText: r.cta_text ?? undefined,
    ctaLink: r.cta_link ?? undefined,
    isVisible: r.is_visible,
    orderIndex: r.order_index,
    customData: r.custom_data ?? undefined
  };
}

function faqFromRow(r: any): FaqItem {
  return { id: r.id, question: r.question, answer: r.answer, orderIndex: r.order_index, isVisible: r.is_visible };
}

function promoFromRow(r: any): PromoCode {
  return {
    id: r.id,
    code: r.code,
    planDiscounts: r.plan_discounts ?? {},
    maxUses: r.max_uses,
    usedCount: r.used_count,
    expiresAt: r.expires_at ?? null,
    active: r.active,
    createdAt: r.created_at
  };
}

function auditFromRow(r: any): AuditLog {
  return { id: r.id, actor: r.actor, action: r.action, entity: r.entity, details: r.details, timestamp: r.created_at };
}

/** Content catalog kinds: the domain array name ↔ the content_items.kind value. */
const CONTENT_KINDS: Array<[kind: string, field: keyof AppDatabase]> = [
  ['reading_test', 'readingTests'],
  ['listening_test', 'listeningTests'],
  ['writing_task', 'writingTasks'],
  ['speaking_card', 'speakingCards'],
  ['digital_book', 'digitalBooks'],
  ['vocab_item', 'vocabTranslations'],
  ['ranked_xp_card', 'rankedXpCards'],
  ['thematic_pack', 'thematicQuizPacks'],
  ['shop_item', 'shopItems'],
  ['student_result', 'studentResults'],
  ['exercise', 'exercises'],
  ['news', 'news'],
  ['news_subscriber', 'newsSubscribers'],
  ['seo_page', 'seoPages']
];

/** Per-student record kinds (user_records). */
const RECORD_KINDS: Array<[kind: string, field: keyof AppDatabase]> = [
  ['writing_submission', 'writingSubmissions'],
  ['speaking_submission', 'speakingSubmissions'],
  ['flashcard', 'flashcards'],
  ['exercise_attempt', 'exerciseAttempts'],
  ['purchase', 'purchases']
];

// ---------------------------------------------------------------------------
// Table specs (parent-first order)
// ---------------------------------------------------------------------------

function usersById(db: AppDatabase): Map<string, User> {
  return new Map(db.users.map((u) => [u.id, u]));
}

function lessonIds(db: AppDatabase): Set<string> {
  return new Set(db.lessons.map((l) => l.id));
}

function completedFor(db: AppDatabase): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const u of db.users) map.set(u.id, new Set(u.completedLessons ?? []));
  return map;
}

const TABLES: TableSpec[] = [
  {
    name: 'owner_account',
    keys: ['id'],
    jsonCols: [],
    build: (db) => {
      const m = new Map<string, Row>();
      if (db.ownerPasswordHash) {
        m.set('1', { id: 1, username: db.ownerUsername || 'jasurbek', password_hash: db.ownerPasswordHash });
      }
      return m;
    }
  },
  {
    name: 'users',
    keys: ['id'],
    jsonCols: [],
    build: (db) => new Map(db.users.map((u) => [u.id, userRow(u)]))
  },
  {
    name: 'courses',
    keys: ['id'],
    jsonCols: [],
    build: (db) => {
      const m = new Map<string, Row>();
      db.courses.forEach((c: Course, i) =>
        m.set(c.id, {
          id: c.id,
          title: c.title ?? '',
          description: c.description ?? '',
          level: c.level || 'general',
          track: nul(c.track),
          price: c.price ?? 0,
          cover_color: c.coverColor ?? '',
          cover_icon: c.coverIcon ?? '',
          published: toBool(c.published),
          required_vip: c.requiredVIP || 'none',
          position: i,
          created_at: c.createdAt || EPOCH
        })
      );
      return m;
    }
  },
  {
    name: 'course_modules',
    keys: ['id'],
    jsonCols: [],
    build: (db) => {
      const courses = new Set(db.courses.map((c) => c.id));
      const m = new Map<string, Row>();
      for (const c of db.courses) {
        for (const mod of c.modules ?? []) {
          if (!courses.has(c.id)) continue;
          m.set(mod.id, { id: mod.id, course_id: c.id, title: mod.title ?? '', order_index: mod.orderIndex ?? 0 });
        }
      }
      return m;
    }
  },
  {
    name: 'lessons',
    keys: ['id'],
    jsonCols: ['resources', 'vocabulary_keywords'],
    build: (db) => {
      const courses = new Set(db.courses.map((c) => c.id));
      const m = new Map<string, Row>();
      for (const l of db.lessons) if (courses.has(l.courseId)) m.set(l.id, lessonRow(l));
      return m;
    }
  },
  {
    name: 'lesson_progress',
    keys: ['user_id', 'lesson_id'],
    jsonCols: [],
    build: (db) => {
      const users = usersById(db);
      const lessons = new Map(db.lessons.map((l) => [l.id, l]));
      const completed = completedFor(db);
      const m = new Map<string, Row>();
      for (const p of db.lessonProgress ?? []) {
        const user = users.get(p.userId);
        const lesson = lessons.get(p.lessonId);
        if (!user || !lesson) continue;
        m.set(keyOf(p.userId, p.lessonId), {
          user_id: p.userId,
          lesson_id: p.lessonId,
          course_id: lesson.courseId,
          position: p.position ?? 0,
          duration: p.duration ?? 0,
          watched_seconds: p.watchedSeconds ?? 0,
          completed: !!completed.get(p.userId)?.has(p.lessonId),
          xp_awarded: !!p.xpAwarded,
          watched: !!p.watched,
          updated_at: p.updatedAt || EPOCH
        });
      }
      // Lessons completed without a playback entry (toggle-complete) still need a row.
      for (const u of db.users) {
        for (const lessonId of u.completedLessons ?? []) {
          const lesson = lessons.get(lessonId);
          if (!lesson || m.has(keyOf(u.id, lessonId))) continue;
          m.set(keyOf(u.id, lessonId), {
            user_id: u.id,
            lesson_id: lessonId,
            course_id: lesson.courseId,
            position: 0,
            duration: 0,
            watched_seconds: 0,
            completed: true,
            xp_awarded: false,
            watched: false,
            updated_at: EPOCH
          });
        }
      }
      return m;
    }
  },
  {
    name: 'tests',
    keys: ['id'],
    jsonCols: [],
    build: (db) => new Map(db.tests.map((t) => [t.id, testRow(t)]))
  },
  {
    name: 'questions',
    keys: ['id'],
    jsonCols: ['options'],
    build: (db) => {
      const tests = new Set(db.tests.map((t) => t.id));
      const position = new Map<string, number>();
      const m = new Map<string, Row>();
      for (const q of db.questions) {
        if (!tests.has(q.testId)) continue;
        const pos = position.get(q.testId) ?? 0;
        position.set(q.testId, pos + 1);
        m.set(q.id, {
          id: q.id,
          test_id: q.testId,
          position: pos,
          prompt: q.prompt ?? '',
          math_formula: nul(q.mathFormula),
          options: q.options ?? [],
          correct_answer_index: q.correctAnswerIndex ?? 0,
          explanation: q.explanation ?? '',
          difficulty: q.difficulty || 'medium',
          points: q.points ?? null
        });
      }
      return m;
    }
  },
  {
    name: 'test_attempts',
    keys: ['id'],
    jsonCols: ['answers'],
    build: (db: AppDatabase) => {
      const m = new Map<string, Row>();
      for (const a of db.testAttempts as TestAttempt[]) {
        m.set(a.id, {
          id: a.id,
          user_id: nul(a.userId),
          user_name: a.userName ?? '',
          test_id: a.testId,
          test_title: a.testTitle ?? '',
          score: a.score ?? 0,
          max_score: a.maxScore ?? 0,
          correct_count: a.correctCount ?? 0,
          total_questions: a.totalQuestions ?? 0,
          answers: a.answers ?? {},
          time_spent_seconds: a.timeSpentSeconds ?? 0,
          percentage: a.percentage ?? null,
          track: nul(a.track),
          cefr_level: nul(a.cefrLevel),
          created_at: a.createdAt || EPOCH
        });
      }
      return m;
    }
  },
  {
    name: 'exam_sessions',
    keys: ['id'],
    jsonCols: ['answers'],
    build: (db) =>
      new Map(
        (db.examSessions ?? []).map((e) => [
          e.id,
          {
            id: e.id,
            owner_key: e.ownerKey,
            test_id: e.testId,
            kind: e.kind,
            started_at: e.startedAt,
            ends_at: e.endsAt,
            answers: e.answers ?? {},
            updated_at: e.updatedAt || EPOCH,
            submitted_attempt_id: nul(e.submittedAttemptId)
          }
        ])
      )
  },
  {
    name: 'content_items',
    keys: ['kind', 'id'],
    jsonCols: ['data'],
    build: (db) => {
      const m = new Map<string, Row>();
      for (const [kind, field] of CONTENT_KINDS) {
        const list = (db[field] as Array<{ id: string }> | undefined) ?? [];
        list.forEach((item, position) => m.set(keyOf(kind, item.id), { kind, id: item.id, position, data: item }));
      }
      return m;
    }
  },
  {
    name: 'user_records',
    keys: ['kind', 'id'],
    jsonCols: ['data'],
    build: (db) => {
      const users = usersById(db);
      const m = new Map<string, Row>();
      for (const [kind, field] of RECORD_KINDS) {
        const list = (db[field] as Array<{ id: string; userId: string; createdAt?: string }> | undefined) ?? [];
        for (const item of list) {
          if (!users.has(item.userId)) continue;
          m.set(keyOf(kind, item.id), {
            kind,
            id: item.id,
            user_id: item.userId,
            data: item,
            created_at: item.createdAt || EPOCH
          });
        }
      }
      return m;
    }
  },
  {
    name: 'ai_threads',
    keys: ['user_id'],
    jsonCols: ['threads'],
    build: (db) => {
      const users = usersById(db);
      const m = new Map<string, Row>();
      for (const t of db.aiThreads ?? []) {
        if (!users.has(t.userId)) continue;
        m.set(t.userId, { user_id: t.userId, threads: t.threads ?? [], updated_at: t.updatedAt || EPOCH });
      }
      return m;
    }
  },
  {
    name: 'ai_usage',
    keys: ['user_id', 'day'],
    jsonCols: ['by_operation'],
    build: (db) => {
      const users = usersById(db);
      const m = new Map<string, Row>();
      for (const u of db.aiUsage ?? []) {
        if (!users.has(u.userId)) continue;
        m.set(keyOf(u.userId, u.day), { user_id: u.userId, day: u.day, count: u.count ?? 0, by_operation: u.byOperation ?? {} });
      }
      return m;
    }
  },
  {
    name: 'deposits',
    keys: ['id'],
    jsonCols: [],
    build: (db) => {
      const users = usersById(db);
      const m = new Map<string, Row>();
      for (const d of db.depositTransactions) {
        if (!users.has(d.userId)) continue;
        m.set(d.id, {
          id: d.id,
          user_id: d.userId,
          amount: d.amount,
          status: d.status,
          method: d.method,
          payment_code: d.paymentCode ?? '',
          receipt_url: nul(d.receiptUrl),
          card_number: nul(d.cardNumber),
          note: nul(d.note),
          created_at: d.createdAt || EPOCH,
          approved_at: nul(d.approvedAt)
        });
      }
      return m;
    }
  },
  {
    name: 'support_tickets',
    keys: ['id'],
    jsonCols: [],
    build: (db) => {
      const users = usersById(db);
      const m = new Map<string, Row>();
      for (const t of db.supportTickets as Array<SupportTicket & { userId?: string }>) {
        m.set(t.id, {
          id: t.id,
          user_id: t.userId && users.has(t.userId) ? t.userId : null,
          user_name: t.userName ?? '',
          user_phone: t.userPhone ?? '',
          message: t.message ?? '',
          category: t.category || 'boshqa',
          status: t.status || 'new',
          reply_text: nul(t.replyText),
          created_at: t.createdAt || EPOCH,
          updated_at: t.updatedAt || t.createdAt || EPOCH
        });
      }
      return m;
    }
  },
  {
    name: 'reviews',
    keys: ['id'],
    jsonCols: [],
    build: (db) => {
      const users = usersById(db);
      return new Map(
        db.reviews.map((r) => [
          r.id,
          {
            id: r.id,
            user_id: r.userId && users.has(r.userId) ? r.userId : null,
            name: r.name ?? '',
            subtitle: nul(r.subtitle),
            track: nul(r.track),
            text: r.text ?? '',
            rating: r.rating ?? null,
            photo_url: nul(r.photoUrl),
            status: r.status || 'pending',
            created_at: r.createdAt || EPOCH
          }
        ])
      );
    }
  },
  {
    name: 'vip_plans',
    keys: ['id'],
    jsonCols: ['features'],
    build: (db) => {
      const m = new Map<string, Row>();
      db.vipPlans.forEach((p, position) =>
        m.set(p.id, {
          id: p.id,
          name: p.name,
          price_monthly: p.priceMonthly ?? 0,
          duration_days: p.durationDays ?? 30,
          description: p.description ?? '',
          badge: nul(p.badge),
          features: p.features ?? [],
          has_ai: toBool(p.hasAI),
          ai_daily_limit: p.aiDailyLimit ?? 0,
          book_allowance_count: p.bookAllowanceCount ?? null,
          is_popular: toBool(p.isPopular),
          position
        })
      );
      return m;
    }
  },
  {
    name: 'site_sections',
    keys: ['id'],
    jsonCols: ['custom_data'],
    build: (db) =>
      new Map(
        db.siteSections.map((s) => [
          s.id,
          {
            id: s.id,
            key: s.key,
            title: s.title ?? '',
            subtitle: s.subtitle ?? '',
            cta_text: nul(s.ctaText),
            cta_link: nul(s.ctaLink),
            is_visible: s.isVisible !== false,
            order_index: s.orderIndex ?? 0,
            custom_data: s.customData ?? null
          }
        ])
      ),
  },
  {
    name: 'faqs',
    keys: ['id'],
    jsonCols: [],
    build: (db) =>
      new Map(
        (db.faqs ?? []).map((f) => [
          f.id,
          { id: f.id, question: f.question ?? '', answer: f.answer ?? '', order_index: f.orderIndex ?? 0, is_visible: f.isVisible !== false }
        ])
      )
  },
  {
    name: 'site_settings',
    keys: ['key'],
    jsonCols: ['value'],
    build: (db) =>
      new Map<string, Row>([
        ['teacher_profile', { key: 'teacher_profile', value: db.teacherProfile }],
        ['site_theme', { key: 'site_theme', value: db.siteTheme }],
        ['live_stream', { key: 'live_stream', value: db.liveStream }],
        ['payment_settings', { key: 'payment_settings', value: db.telegramBotSettings }],
        ['features', { key: 'features', value: db.features }],
        ['vip_gift_applied', { key: 'vip_gift_applied', value: db.vipGiftApplied ?? {} }],
        ...(db.vipGift ? ([['vip_gift', { key: 'vip_gift', value: db.vipGift }]] as Array<[string, Row]>) : []),
        ...(db.aiLimits ? ([['ai_limits', { key: 'ai_limits', value: db.aiLimits }]] as Array<[string, Row]>) : []),
        ...(db.aiRouting ? ([['ai_routing', { key: 'ai_routing', value: db.aiRouting }]] as Array<[string, Row]>) : [])
      ])
  },
  {
    name: 'promo_codes',
    keys: ['id'],
    jsonCols: ['plan_discounts'],
    build: (db) =>
      new Map(
        (db.promoCodes ?? []).map((p) => [
          p.id,
          {
            id: p.id,
            code: p.code,
            plan_discounts: p.planDiscounts ?? {},
            max_uses: p.maxUses ?? 0,
            used_count: p.usedCount ?? 0,
            expires_at: nul(p.expiresAt),
            active: p.active !== false,
            created_at: p.createdAt || EPOCH
          }
        ])
      )
  },
  {
    name: 'audit_logs',
    keys: ['id'],
    jsonCols: [],
    build: (db) =>
      new Map(
        db.auditLogs.map((a) => [
          a.id,
          { id: a.id, actor: a.actor ?? '', action: a.action ?? '', entity: a.entity ?? '', details: a.details ?? '', created_at: a.timestamp || EPOCH }
        ])
      )
  }
];

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function selectAll(q: Queryable, sql: string): Promise<any[]> {
  return (await q.query(sql)).rows;
}

/**
 * One round trip for all reads. Postgres runs the statements in order and answers with one result
 * per statement, so a request no longer pays a network round trip for every table.
 */
async function selectBatch(q: Queryable, sqls: string[]): Promise<any[][]> {
  const res: any = await q.query(sqls.join(';\n'));
  const list: any[] = Array.isArray(res) ? res : [res];
  return list.map((r) => r.rows);
}

/** Reads every table once and assembles the domain snapshot. */
export async function loadDatabase(q: Queryable): Promise<AppDatabase> {
  const [owner, userRows, courseRows, moduleRows, lessonRows, progressRows, testRows, questionRows, attemptRows, examRows, contentRows, recordRows, threadRows, usageRows, depositRows, ticketRows, reviewRows, planRows, sectionRows, faqRows, settingRows, auditRows, promoRows] = await selectBatch(q, [
    'select * from public.owner_account',
    'select * from public.users order by registered_at, id',
    'select * from public.courses order by position, id',
    'select * from public.course_modules order by order_index, id',
    'select * from public.lessons order by order_index, id',
    'select * from public.lesson_progress',
    'select * from public.tests order by created_at, id',
    'select * from public.questions order by test_id, position',
    'select * from public.test_attempts order by created_at',
    'select * from public.exam_sessions',
    'select * from public.content_items order by kind, position',
    'select * from public.user_records order by created_at',
    'select * from public.ai_threads',
    'select * from public.ai_usage',
    'select * from public.deposits order by created_at',
    'select * from public.support_tickets order by created_at',
    'select * from public.reviews order by created_at',
    'select * from public.vip_plans order by position, id',
    'select * from public.site_sections order by order_index, id',
    'select * from public.faqs order by order_index, id',
    'select * from public.site_settings',
    'select * from public.audit_logs order by created_at desc limit 200',
    'select * from public.promo_codes order by created_at'
  ]);

  const settings = new Map<string, any>(settingRows.map((r) => [r.key, r.value]));
  const contentByKind = new Map<string, any[]>();
  for (const r of contentRows) {
    const list = contentByKind.get(r.kind) ?? [];
    list.push(r.data);
    contentByKind.set(r.kind, list);
  }
  const recordByKind = new Map<string, any[]>();
  for (const r of recordRows) {
    const list = recordByKind.get(r.kind) ?? [];
    list.push(r.data);
    recordByKind.set(r.kind, list);
  }

  const modulesByCourse = new Map<string, any[]>();
  for (const m of moduleRows) {
    const list = modulesByCourse.get(m.course_id) ?? [];
    list.push({ id: m.id, courseId: m.course_id, title: m.title, orderIndex: m.order_index });
    modulesByCourse.set(m.course_id, list);
  }

  const lessons = lessonRows.map(lessonFromRow);
  const completedByUser = new Map<string, string[]>();
  for (const p of progressRows) {
    if (!p.completed) continue;
    const list = completedByUser.get(p.user_id) ?? [];
    list.push(p.lesson_id);
    completedByUser.set(p.user_id, list);
  }
  const lessonProgress: LessonProgress[] = progressRows.map((p) => ({
    userId: p.user_id,
    lessonId: p.lesson_id,
    courseId: p.course_id,
    position: p.position,
    duration: p.duration,
    watchedSeconds: p.watched_seconds,
    xpAwarded: p.xp_awarded,
    watched: p.watched,
    updatedAt: p.updated_at
  }));

  const questionsList: Question[] = questionRows.map(questionFromRow);
  const ownerRow = owner[0];

  const users = userRows.map((u) => userFromRow(u, completedByUser.get(u.id) ?? []));
  const userById = new Map(users.map((u) => [u.id, u]));

  const courses: Course[] = courseRows.map((c) => {
    const own = lessons.filter((l) => l.courseId === c.id);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      level: c.level,
      track: c.track ?? undefined,
      price: c.price,
      coverColor: c.cover_color,
      coverIcon: c.cover_icon,
      published: c.published,
      requiredVIP: c.required_vip,
      modules: modulesByCourse.get(c.id) ?? [],
      lessonsCount: own.length,
      totalDurationMinutes: own.reduce((sum, l) => sum + (l.durationMinutes || 0), 0),
      createdAt: c.created_at
    };
  });

  const db: AppDatabase = {
    users,
    courses,
    lessons,
    tests: testRows.map(testFromRow),
    questions: questionsList,
    testAttempts: attemptRows.map(attemptFromRow),
    examSessions: examRows.map(examFromRow),
    lessonProgress,
    readingTests: contentByKind.get('reading_test') ?? [],
    listeningTests: contentByKind.get('listening_test') ?? [],
    writingTasks: contentByKind.get('writing_task') ?? [],
    writingSubmissions: recordByKind.get('writing_submission') ?? [],
    speakingCards: contentByKind.get('speaking_card') ?? [],
    speakingSubmissions: recordByKind.get('speaking_submission') ?? [],
    digitalBooks: contentByKind.get('digital_book') ?? [],
    shopItems: contentByKind.get('shop_item') ?? [],
    vocabTranslations: contentByKind.get('vocab_item') ?? [],
    flashcards: recordByKind.get('flashcard') ?? [],
    rankedXpCards: contentByKind.get('ranked_xp_card') ?? [],
    thematicQuizPacks: contentByKind.get('thematic_pack') ?? [],
    studentResults: contentByKind.get('student_result') ?? [],
    depositTransactions: depositRows.map((d) => depositFromRow(d, userById.get(d.user_id))),
    supportTickets: ticketRows.map(ticketFromRow),
    reviews: reviewRows.map(reviewFromRow),
    faqs: faqRows.map(faqFromRow),
    promoCodes: promoRows.map(promoFromRow),
    vipPlans: planRows.map(planFromRow),
    siteSections: sectionRows.map(sectionFromRow),
    teacherProfile: settings.get('teacher_profile') ?? { name: '', title: '', bio: '', experienceYears: 0, studentsCount: 0, nationalCertCount: 0, grantCount: 0, phone: '', telegram: '', methodology: '' },
    siteTheme: settings.get('site_theme') ?? { activeBackground: 'ivory_editorial' },
    liveStream: settings.get('live_stream') ?? { isLive: false, title: '', telegramChannel: '', streamUrl: '' },
    features: settings.get('features') ?? { coinEnabled: true },
    telegramBotSettings: settings.get('payment_settings') ?? { botUsername: '', botName: '', isActive: false, minDepositAmount: 0, cardOrMerchantInfo: '', cardNumber: '', cardHolder: '', supportTelegram: '', autoApprovalDemo: false },
    auditLogs: auditRows.map(auditFromRow),
    aiThreads: threadRows.map((t) => ({ userId: t.user_id, threads: t.threads ?? [], updatedAt: t.updated_at })),
    aiUsage: usageRows.map((u) => ({ userId: u.user_id, day: u.day, count: u.count, byOperation: u.by_operation ?? {} })),
    exercises: contentByKind.get('exercise') ?? [],
    news: contentByKind.get('news') ?? [],
    newsSubscribers: contentByKind.get('news_subscriber') ?? [],
    vipGift: settings.get('vip_gift') ?? undefined,
    aiLimits: settings.get('ai_limits') ?? undefined,
    aiRouting: settings.get('ai_routing') ?? undefined,
    seoPages: contentByKind.get('seo_page') ?? [],
    vipGiftApplied: settings.get('vip_gift_applied') ?? {},
    exerciseAttempts: recordByKind.get('exercise_attempt') ?? [],
    purchases: recordByKind.get('purchase') ?? [],
    ownerPasswordHash: ownerRow?.password_hash ?? '',
    ownerUsername: ownerRow?.username ?? 'jasurbek'
  };
  return db;
}

// ---------------------------------------------------------------------------
// Persist (diff-based write-back)
// ---------------------------------------------------------------------------

/** Rows for every table, keyed by table name → composite key → row. */
export function buildRows(db: AppDatabase): Map<string, Map<string, Row>> {
  const out = new Map<string, Map<string, Row>>();
  for (const spec of TABLES) out.set(spec.name, spec.build(db));
  return out;
}

/** Fingerprints captured at load time: table → key → JSON of the row. */
export function fingerprint(rows: Map<string, Map<string, Row>>): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const [table, map] of rows) {
    const fp = new Map<string, string>();
    for (const [key, row] of map) fp.set(key, JSON.stringify(row));
    out.set(table, fp);
  }
  return out;
}

function encode(spec: TableSpec, col: string, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  // A non-finite number can never be written to a numeric column: fail with a clear message instead of a Postgres error.
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Invalid number for ${spec.name}.${col}`);
  // Postgres rejects the NUL character in text and jsonb. A request carrying one used to end in a 500; it is dropped here instead.
  if (typeof value === 'string') return value.replace(/\u0000/g, '');
  return spec.jsonCols.includes(col) ? JSON.stringify(value, (_k, v) => (typeof v === 'string' ? v.replace(/\u0000/g, '') : v)) : value;
}

/** Exported for tests: the value as it is sent to Postgres. */
export const encodeForTest = (value: unknown, json = false): unknown => encode({ name: 't', keys: [], jsonCols: json ? ['c'] : [] } as never, 'c', value);

async function upsert(q: Queryable, spec: TableSpec, rows: Row[], ignoreExisting = false): Promise<void> {
  const cols = Object.keys(rows[0]);
  const updateCols = cols.filter((c) => !spec.keys.includes(c));
  const conflict =
    ignoreExisting || !updateCols.length ? 'do nothing' : `do update set ${updateCols.map((c) => `${c} = excluded.${c}`).join(', ')}`;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const params: unknown[] = [];
    const tuples = chunk.map((row) => {
      const placeholders = cols.map((c) => {
        params.push(encode(spec, c, row[c]));
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await q.query(
      `insert into public.${spec.name} (${cols.join(', ')}) values ${tuples.join(', ')} on conflict (${spec.keys.join(', ')}) ${conflict}`,
      params
    );
  }
}

async function removeKeys(q: Queryable, spec: TableSpec, keys: string[]): Promise<void> {
  const parts = keys.map((k) => k.split(KEY_SEP));
  if (spec.keys.length === 1) {
    await q.query(`delete from public.${spec.name} where ${spec.keys[0]}::text = any($1::text[])`, [parts.map((p) => p[0])]);
    return;
  }
  const columns = spec.keys.map((_, idx) => parts.map((p) => p[idx]));
  const cols = spec.keys.map((k) => `${k}::text`).join(', ');
  const unnest = spec.keys.map((_, idx) => `$${idx + 1}::text[]`).join(', ');
  await q.query(
    `delete from public.${spec.name} where (${cols}) in (select * from unnest(${unnest}))`,
    columns
  );
}

/**
 * Writes the difference between the baseline fingerprints and the current domain state.
 * Returns the number of rows touched.
 */
export async function persistDatabase(q: Queryable, db: AppDatabase, baseline: Map<string, Map<string, string>>): Promise<number> {
  const next = buildRows(db);
  let touched = 0;

  for (const spec of TABLES) {
    const before = baseline.get(spec.name) ?? new Map<string, string>();
    const now = next.get(spec.name) ?? new Map<string, Row>();
    const changed: Row[] = [];
    for (const [key, row] of now) {
      if (before.get(key) !== JSON.stringify(row)) changed.push(row);
    }
    if (changed.length) {
      await upsert(q, spec, changed);
      touched += changed.length;
    }
  }

  for (const spec of [...TABLES].reverse()) {
    const before = baseline.get(spec.name) ?? new Map<string, string>();
    const now = next.get(spec.name) ?? new Map<string, Row>();
    const gone: string[] = [];
    for (const key of before.keys()) if (!now.has(key)) gone.push(key);
    if (gone.length) {
      await removeKeys(q, spec, gone);
      touched += gone.length;
    }
  }
  return touched;
}

/** Inserts rows that do not exist yet; existing rows are left untouched (used for seed defaults). */
export async function insertMissing(q: Queryable, table: string, rows: Row[]): Promise<number> {
  if (!rows.length) return 0;
  const spec = TABLES.find((t) => t.name === table);
  if (!spec) throw new Error(`Unknown table: ${table}`);
  await upsert(q, spec, rows, true);
  return rows.length;
}

export const emptyDatabase = (): AppDatabase => ({
  users: [],
  courses: [],
  lessons: [],
  tests: [],
  questions: [],
  testAttempts: [],
  examSessions: [],
  lessonProgress: [],
  readingTests: [],
  listeningTests: [],
  writingTasks: [],
  writingSubmissions: [],
  speakingCards: [],
  speakingSubmissions: [],
  digitalBooks: [],
  shopItems: [],
  vocabTranslations: [],
  flashcards: [],
  rankedXpCards: [],
  thematicQuizPacks: [],
  studentResults: [],
  depositTransactions: [],
  supportTickets: [],
  reviews: [],
  faqs: [],
  promoCodes: [],
  purchases: [],
  vipPlans: [],
  siteSections: [],
  teacherProfile: { name: '', title: '', bio: '', experienceYears: 0, studentsCount: 0, nationalCertCount: 0, grantCount: 0, phone: '', telegram: '', methodology: '' },
  siteTheme: { activeBackground: 'ivory_editorial' },
  liveStream: { isLive: false, title: '', telegramChannel: '', streamUrl: '' },
  features: { coinEnabled: true },
  telegramBotSettings: { botUsername: '', botName: '', isActive: false, minDepositAmount: 0, cardOrMerchantInfo: '', cardNumber: '', cardHolder: '', supportTelegram: '', autoApprovalDemo: false },
  auditLogs: [],
  aiThreads: [],
  aiUsage: [],
  exercises: [],
  news: [],
  newsSubscribers: [],
  exerciseAttempts: [],
  ownerPasswordHash: '',
  ownerUsername: ''
});

export const TABLE_NAMES = TABLES.map((t) => t.name);
