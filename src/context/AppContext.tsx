import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppDatabase,
  User,
  AppSiteMode,
  Language,
  Course,
  Lesson,
  Test,
  Question,
  SiteSection,
  StudentResult,
  VIPPlan,
  TeacherProfile,
  BackgroundThemeId,
  DepositTransaction,
  TelegramBotSettings,
  DigitalBook,
  LiveStreamBroadcast,
  Flashcard,
  WritingSubmission,
  SpeakingSubmission,
  ReadingTest
} from '../types';
import { api } from '../services/api';
import { translations as appTranslations, uzLatinToCyrillic } from '../lib/translations';

interface AppContextType {
  db: AppDatabase;
  loading: boolean;
  dbReady: boolean;
  dbError: string | null;
  activeSite: AppSiteMode;
  setActiveSite: (site: AppSiteMode) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isOwnerAuth: boolean;
  setIsOwnerAuth: (auth: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  activeTestId: string | null;
  setActiveTestId: (id: string | null) => void;
  refreshDb: () => Promise<void>;

  // Mute & 2-Tier Ban Actions
  banStudentLevel1: (userId: string, days: number, reason: string) => Promise<void>;
  unbanStudent: (userId: string) => Promise<void>;

  // Unified Auth Actions
  unifiedLogin: (loginInput: string, password?: string) => Promise<{ success: boolean; message?: string; role?: 'student' | 'owner' }>;
  loginWithGoogle: (googleData: { email: string; name?: string; avatar?: string; uid?: string; idToken?: string; track?: string }) => Promise<{ success: boolean; message?: string; user?: User }>;
  registerStudent: (data: {
    name: string;
    surname?: string;
    identifier?: string;
    phone?: string;
    email?: string;
    password?: string;
    region?: string;
    telegramUsername?: string;
    track?: string;
    targetScore?: string;
    studyTimeDaily?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  ownerChangePassword: (oldPass: string, newPass: string, newUsername?: string) => Promise<{ success: boolean; message?: string; ownerUsername?: string }>;
  claimDailyQuest: () => Promise<{ success: boolean; message?: string }>;
  economy: (body: { action: string; [k: string]: unknown }) => Promise<any>;
  updateShopItems: (items: any[]) => Promise<any>;
  submitReview: (text: string, rating: number) => Promise<any>;
  ownerReviews: (body: Record<string, unknown>) => Promise<any>;
  updateFaqs: (faqs: any[]) => Promise<any>;
  logout: () => void;

  toggleLessonCompletion: (lessonId: string) => Promise<void>;
  submitTestAttempt: (
    testId: string,
    answers: Record<string, any>,
    timeSpent: number,
    extra?: {
      customCorrectCount?: number;
      customTotalQuestions?: number;
      customScore?: number;
      customMaxScore?: number;
      customPercentage?: number;
      cefrLevel?: string;
      track?: string;
    }
  ) => Promise<any>;

  // Owner Actions
  createCourse: (course: Partial<Course>) => Promise<any>;
  updateCourse: (id: string, course: Partial<Course>) => Promise<any>;
  deleteCourse: (id: string) => Promise<any>;
  createLesson: (lesson: Partial<Lesson>) => Promise<any>;
  updateLesson: (id: string, lesson: Partial<Lesson>) => Promise<any>;
  deleteLesson: (id: string) => Promise<any>;
  createTest: (test: Partial<Test>) => Promise<any>;
  updateTest: (id: string, test: Partial<Test>) => Promise<any>;
  deleteTest: (id: string) => Promise<any>;
  createReadingTest: (readingTest: Partial<ReadingTest>) => Promise<any>;
  deleteReadingTest: (id: string) => Promise<any>;
  createQuestion: (question: Partial<Question>) => Promise<any>;
  deleteQuestion: (id: string) => Promise<any>;

  createStudentResult: (res: Partial<StudentResult>) => Promise<any>;
  updateStudentResult: (id: string, res: Partial<StudentResult>) => Promise<any>;
  deleteStudentResult: (id: string) => Promise<any>;

  updateSiteSections: (sections: SiteSection[]) => Promise<any>;
  updateVIPPlans: (plans: VIPPlan[]) => Promise<any>;
  updateStudentVIP: (userId: string, vipTier: string, days: number) => Promise<any>;
  purchaseVIPPlan: (planId: string, promoCode?: string) => Promise<{
    success: boolean;
    message?: string;
    reason?: string;
    price?: number;
    currentBal?: number;
    missing?: number;
    user?: User;
    plan?: VIPPlan;
  }>;
  toggleStudentBlock: (userId: string) => Promise<any>;
  createSupportTicket: (ticket: any) => Promise<any>;
  replySupportTicket: (ticketId: string, reply: string) => Promise<any>;

  updateTeacherProfile: (profile: Partial<TeacherProfile>) => Promise<any>;
  updateSiteTheme: (themeConfig: { activeBackground: BackgroundThemeId; allowUserThemeOverride?: boolean }) => Promise<any>;
  updateStudentFull: (studentData: any) => Promise<any>;
  deleteStudent: (studentId: string) => Promise<any>;
  adjustStudentPointsAndCoins: (userId: string, xpDelta: number, coinsDelta: number, reason?: string) => Promise<any>;
  updateStudentProfile: (profileData: Partial<User>) => Promise<any>;

  // 2-Step Deposit
  requestDeposit: (
    amount: number,
    telegramUsername?: string,
    method?: string,
    receiptUrl?: string,
    cardNumber?: string,
    note?: string
  ) => Promise<any>;
  approveDeposit: (depositId: string) => Promise<any>;
  rejectDeposit: (depositId: string) => Promise<any>;
  updateBotSettings: (settings: Partial<TelegramBotSettings>) => Promise<any>;

  // AI & New Features
  gradeWriting: (essayText: string, taskPrompt: string, taskType?: string, taskId?: string) => Promise<any>;
  evaluateSpeaking: (transcript: string, topicPrompt: string, part?: number | string, durationSeconds?: number, cardId?: string) => Promise<any>;
  translate3Level: (query: string) => Promise<any>;
  chatTutor: (userMessage: string, lessonId?: string) => Promise<any>;
  pasteToMock: (rawText: string) => Promise<any>;

  createBook: (book: Partial<DigitalBook>) => Promise<any>;
  deleteBook: (id: string) => Promise<any>;
  readBook: (bookId: string) => void;

  broadcastLiveStream: (isLive: boolean, title: string, telegramChannel: string, streamUrl: string) => Promise<any>;
  addFlashcard: (card: Partial<Flashcard>) => Promise<any>;

  getAiStatus: () => Promise<any>;

  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Safe empty shape used only until the first /api/db/all response arrives. */
const EMPTY_DB = {
  users: [], courses: [], lessons: [], tests: [], questions: [], testAttempts: [], readingTests: [], listeningTests: [],
  writingTasks: [], writingSubmissions: [], speakingCards: [], speakingSubmissions: [], digitalBooks: [], vocabTranslations: [],
  flashcards: [], rankedXpCards: [], studentResults: [],
  depositTransactions: [], siteSections: [], supportTickets: [],
  vipPlans: [], auditLogs: [], reviews: [], faqs: []
} as unknown as AppDatabase;

const SITE_TO_HASH: Record<AppSiteMode, string> = {
  site1_open: '',
  site2_lms: '#/student',
  site3_owner: '#/admin',
  auth: '#/auth'
};

function siteFromHash(): AppSiteMode {
  if (typeof window === 'undefined') return 'site1_open';
  const h = window.location.hash;
  if (h.startsWith('#/student')) return 'site2_lms';
  if (h.startsWith('#/admin')) return 'site3_owner';
  if (h.startsWith('#/auth')) return 'auth';
  return 'site1_open';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The seed database is not bundled into the browser (it contains answer keys).
  // Data comes from /api/db/all; a cached copy gives returning visitors an instant first paint.
  const [db, setDb] = useState<AppDatabase>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('edulevel_db_cache');
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && parsed.courses && parsed.teacherProfile && parsed.siteSections) return parsed as AppDatabase;
      } catch {}
    }
    return EMPTY_DB;
  });
  const [dbReady, setDbReady] = useState<boolean>(() => db !== EMPTY_DB);
  const [dbError, setDbError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeSite, setActiveSiteState] = useState<AppSiteMode>(() => siteFromHash());

  // Keep the active area in the URL hash (#/student, #/admin, #/auth) so pages can be
  // linked, refreshed and navigated with the browser back button.
  const setActiveSite = (site: AppSiteMode) => {
    setActiveSiteState(site);
    if (typeof window !== 'undefined') {
      const hash = SITE_TO_HASH[site];
      if (window.location.hash !== hash) {
        if (hash) window.history.pushState(null, '', hash);
        else window.history.pushState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  useEffect(() => {
    const onPop = () => setActiveSiteState(siteFromHash());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('edulevel_current_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('edulevel_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('edulevel_current_user');
      }
    }
  };

  const [isOwnerAuth, setIsOwnerAuthState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('edulevel_is_owner_auth') === 'true';
    }
    return false;
  });

  const setIsOwnerAuth = (val: boolean) => {
    setIsOwnerAuthState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('edulevel_is_owner_auth', val ? 'true' : 'false');
    }
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [language, setLanguage] = useState<Language>('uz');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  // A Telegram-bot link (?lesson=ID) opens that lesson once the student is signed in; the link is then cleaned from the address bar.
  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const lessonId = params.get('lesson');
      if (!lessonId) return;
      const lesson = db.lessons.find((l) => l.id === lessonId);
      if (!lesson) return;
      sessionStorage.setItem('edulevel_pending_lesson', lesson.id);
      params.delete('lesson');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      setActiveSite('site2_lms');
      setActiveCourseId(lesson.courseId);
    } catch {
      /* storage or history unavailable: the normal start page stays */
    }
  }, [currentUser, db.lessons]);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  // Sync theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_preference') as 'light' | 'dark' | null;
      if (saved) {
        setTheme(saved);
        if (saved === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme_preference', next);
      return next;
    });
  };

  // Cache changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('edulevel_db_cache', JSON.stringify(db));
    }
  }, [db]);

  const refreshDb = async () => {
    try {
      const data = await api.fetchAllDb();
      if (data && data.courses) {
        setDb((prev) => ({ ...prev, ...data }));
        setDbReady(true);
        setDbError(null);
        if (currentUser && currentUser.role === 'student') {
          const fresh = data.users.find((u) => u.id === currentUser.id);
          if (fresh) setCurrentUser(fresh);
        }
      }
    } catch (e) {
      setDbError((e as Error)?.message || 'Server bilan aloqa yo‘q');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync client auth state with the server session (httpOnly cookie).
    api
      .getSession()
      .then((res: any) => {
        if (res?.authenticated && res.role === 'owner') {
          setIsOwnerAuth(true);
        } else if (res?.authenticated && res.role === 'student' && res.user) {
          setIsOwnerAuth(false);
          setCurrentUser(res.user);
        } else {
          setIsOwnerAuth(false);
          setCurrentUser(null);
        }
      })
      .catch(() => {});
    // The database request does not depend on the session answer (the server reads the cookie
    // itself), so both run at once instead of one after the other.
    refreshDb();
  }, []);




  const banStudentLevel1 = async (userId: string, days: number, reason: string) => {
    const bannedUntil = days > 0 ? new Date(Date.now() + days * 86400 * 1000).toISOString() : 'forever';
    setDb(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, banLevel: 1, bannedUntil, banReason: reason, isBlocked: true } : u)
    }));
    await api.updateStudentFull({ id: userId, banLevel: 1, bannedUntil, banReason: reason, isBlocked: true });
    await refreshDb();
  };


  const unbanStudent = async (userId: string) => {
    setDb(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, banLevel: 0, isBlocked: false, bannedUntil: undefined, banReason: undefined } : u)
    }));
    await api.updateStudentFull({ id: userId, banLevel: 0, isBlocked: false, bannedUntil: undefined, banReason: undefined });
    await refreshDb();
  };

  // Unified login
  const unifiedLogin = async (loginInput: string, password?: string) => {
    try {
      const res = await api.unifiedLogin(loginInput, password);
      if (res.success) {
        if (res.role === 'owner') {
          setIsOwnerAuth(true);
          setActiveSite('site3_owner');
        } else {
          setCurrentUser(res.user);
          setActiveSite('site2_lms');
        }
        // The cabinet opens now; the private data (lessons, balance, owner tables) fills in a moment later.
        void refreshDb();
        return { success: true, role: res.role };
      }
      return { success: false, message: res.message || 'Kirishda xatolik yuz berdi' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Server xatosi' };
    }
  };

  const loginWithGoogle = async (googleData: { email: string; name?: string; avatar?: string; uid?: string; idToken?: string; track?: string }) => {
    try {
      const res = await api.googleLogin(googleData);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setActiveSite('site2_lms');
        void refreshDb();
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Google bilan kirishda xatolik yuz berdi' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Tarmoq xatosi' };
    }
  };

  const registerStudent = async (data: any) => {
    try {
      const res = await api.registerStudent(data);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setActiveSite('site2_lms');
        void refreshDb();
        return { success: true };
      }
      return { success: false, message: res.message || "Ro'yxatdan o'tishda xatolik" };
    } catch (err: any) {
      return { success: false, message: err.message || 'Tarmoq xatosi' };
    }
  };

  const ownerChangePassword = async (oldPass: string, newPass: string, newUsername?: string) => {
    const res = await api.ownerChangePassword(oldPass, newPass, newUsername);
    if (res.success) await refreshDb();
    return res;
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
    setIsOwnerAuth(false);
    setActiveSite('site1_open');
    setActiveCourseId(null);
    setActiveTestId(null);
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    if (!currentUser) return;
    try {
      const res = await api.toggleLessonComplete(currentUser.id, lessonId);
      if (res.success) {
        setCurrentUser({ ...currentUser, completedLessons: res.completedLessons, xp: res.xp });
      }
      await refreshDb();
    } catch (e) {
      console.error(e);
    }
  };

  const submitTestAttempt = async (
    testId: string,
    answers: Record<string, any>,
    timeSpent: number,
    extra?: {
      customCorrectCount?: number;
      customTotalQuestions?: number;
      customScore?: number;
      customMaxScore?: number;
      customPercentage?: number;
      cefrLevel?: string;
      track?: string;
    }
  ) => {
    const res = await api.submitTestAttempt({
      userId: currentUser?.id || 'guest',
      testId,
      answers,
      timeSpentSeconds: timeSpent,
      ...extra
    });
    await refreshDb();
    return res;
  };

  // Owner actions
  const createCourse = async (course: Partial<Course>) => {
    const res = await api.createCourse(course);
    await refreshDb();
    return res;
  };

  const updateCourse = async (id: string, course: Partial<Course>) => {
    const res = await api.updateCourse(id, course);
    await refreshDb();
    return res;
  };

  const deleteCourse = async (id: string) => {
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      lessons: prev.lessons.filter((l) => l.courseId !== id)
    }));
    const res = await api.deleteCourse(id);
    await refreshDb();
    return res;
  };

  const createLesson = async (lesson: Partial<Lesson>) => {
    const res = await api.createLesson(lesson);
    await refreshDb();
    return res;
  };

  const updateLesson = async (id: string, lesson: Partial<Lesson>) => {
    const res = await api.updateLesson(id, lesson);
    await refreshDb();
    return res;
  };

  const deleteLesson = async (id: string) => {
    setDb((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((l) => l.id !== id)
    }));
    const res = await api.deleteLesson(id);
    await refreshDb();
    return res;
  };

  const createTest = async (test: Partial<Test>) => {
    const res = await api.createTest(test);
    await refreshDb();
    return res;
  };

  const updateTest = async (id: string, test: Partial<Test>) => {
    const res = await api.updateTest(id, test);
    await refreshDb();
    return res;
  };

  const deleteTest = async (id: string) => {
    setDb((prev) => ({
      ...prev,
      tests: prev.tests.filter((t) => t.id !== id),
      questions: prev.questions.filter((q) => q.testId !== id)
    }));
    const res = await api.deleteTest(id);
    await refreshDb();
    return res;
  };

  const createReadingTest = async (readingTest: Partial<ReadingTest>) => {
    const newTest: ReadingTest = {
      id: readingTest.id || 'reading-' + Date.now(),
      title: readingTest.title || 'Yangi Reading Test',
      track: readingTest.track || 'cefr',
      durationMinutes: readingTest.durationMinutes || 60,
      passages: readingTest.passages || []
    };
    setDb((prev) => ({
      ...prev,
      readingTests: [newTest, ...(prev.readingTests || [])]
    }));
    const res = await api.createReadingTest(newTest);
    await refreshDb();
    return res;
  };

  const deleteReadingTest = async (id: string) => {
    setDb((prev) => ({
      ...prev,
      readingTests: (prev.readingTests || []).filter((t) => t.id !== id)
    }));
    const res = await api.deleteReadingTest(id);
    await refreshDb();
    return res;
  };

  const createQuestion = async (q: Partial<Question>) => {
    const res = await api.createQuestion(q);
    await refreshDb();
    return res;
  };

  const deleteQuestion = async (id: string) => {
    setDb((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id)
    }));
    const res = await api.deleteQuestion(id);
    await refreshDb();
    return res;
  };

  const createStudentResult = async (result: Partial<StudentResult>) => {
    const res = await api.createStudentResult(result);
    await refreshDb();
    return res;
  };

  const updateStudentResult = async (id: string, result: Partial<StudentResult>) => {
    const res = await api.updateStudentResult(id, result);
    await refreshDb();
    return res;
  };

  const deleteStudentResult = async (id: string) => {
    const res = await api.deleteStudentResult(id);
    await refreshDb();
    return res;
  };

  const updateSiteSections = async (sections: SiteSection[]) => {
    const res = await api.updateSiteSections(sections);
    await refreshDb();
    return res;
  };

  const updateVIPPlans = async (plans: VIPPlan[]) => {
    const res = await api.updateVIPPlans(plans);
    await refreshDb();
    return res;
  };

  const updateStudentVIP = async (userId: string, vipTier: string, days: number) => {
    const res = await api.updateStudentVIP(userId, vipTier, days);
    await refreshDb();
    return res;
  };

  // VIP purchase is validated and executed on the server (balance, price, expiry).
  const purchaseVIPPlan = async (planId: string, promoCode?: string) => {
    if (!currentUser) return { success: false, message: 'Iltimos, avval hisobingizga kiring.' };
    try {
      const res = await api.economy({ action: 'vip_purchase', planId, promoCode });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        await refreshDb();
        return { success: true, user: res.user, plan: res.plan };
      }
      const plan = db.vipPlans.find((p) => p.id === planId);
      return { success: false, reason: res.reason, message: res.message, price: res.price, currentBal: res.currentBal, missing: res.missing, plan };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Tarmoq xatosi' };
    }
  };

  const economy = async (body: { action: string; [k: string]: unknown }) => {
    const res = await api.economy(body);
    if (res.success && res.user) setCurrentUser(res.user);
    if (res.success) await refreshDb();
    return res;
  };

  const claimDailyQuest = async () => economy({ action: 'daily_quest' });

  const updateShopItems = async (items: any[]) => {
    setDb((prev) => ({ ...prev, shopItems: items }));
    const res = await api.updateShopItems(items);
    await refreshDb();
    return res;
  };

  const submitReview = async (text: string, rating: number) => {
    const res = await api.submitReview(text, rating);
    if (res.success) await refreshDb();
    return res;
  };

  const ownerReviews = async (body: Record<string, unknown>) => {
    const res = await api.ownerReviews(body);
    await refreshDb();
    return res;
  };

  const updateFaqs = async (faqs: any[]) => {
    setDb((prev) => ({ ...prev, faqs }));
    const res = await api.updateFaqs(faqs);
    await refreshDb();
    return res;
  };

  const toggleStudentBlock = async (userId: string) => {
    const res = await api.toggleStudentBlock(userId);
    await refreshDb();
    return res;
  };

  const createSupportTicket = async (ticket: any) => {
    const res = await api.createSupportTicket(ticket);
    await refreshDb();
    return res;
  };

  const replySupportTicket = async (ticketId: string, reply: string) => {
    const res = await api.replySupportTicket(ticketId, reply);
    await refreshDb();
    return res;
  };

  const updateTeacherProfile = async (profile: Partial<TeacherProfile>) => {
    setDb((prev) => ({
      ...prev,
      teacherProfile: { ...prev.teacherProfile, ...profile }
    }));
    return await api.updateTeacherProfile(profile);
  };

  const updateSiteTheme = async (themeConfig: { activeBackground: BackgroundThemeId; allowUserThemeOverride?: boolean }) => {
    setDb((prev) => ({
      ...prev,
      siteTheme: { ...prev.siteTheme, ...themeConfig }
    }));
    return await api.updateSiteTheme(themeConfig);
  };



  const updateStudentFull = async (studentData: any) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === studentData.id ? { ...u, ...studentData } : u))
    }));
    return await api.updateStudentFull(studentData);
  };

  const deleteStudent = async (studentId: string) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== studentId)
    }));
    return await api.deleteStudent(studentId);
  };

  const adjustStudentPointsAndCoins = async (
    userId: string,
    xpDelta: number,
    coinsDelta: number,
    reason?: string
  ) => {
    let updatedTargetUser: User | null = null;

    setDb((prev) => {
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          const newXp = Math.max(0, (u.xp || 0) + xpDelta);
          const newPoints = Math.max(0, (u.points || 0) + xpDelta);
          const newCoins = Math.max(0, (u.coins || 0) + coinsDelta);
          const updated = { ...u, xp: newXp, points: newPoints, coins: newCoins };
          updatedTargetUser = updated;
          return updated;
        }
        return u;
      });
      return { ...prev, users: updatedUsers };
    });

    if (currentUser && currentUser.id === userId) {
      setCurrentUser({
        ...currentUser,
        xp: Math.max(0, (currentUser.xp || 0) + xpDelta),
        points: Math.max(0, (currentUser.points || 0) + xpDelta),
        coins: Math.max(0, (currentUser.coins || 0) + coinsDelta)
      });
    }

    if (updatedTargetUser) {
      await api.updateStudentFull(updatedTargetUser);
    }
    return { success: true };
  };

  const updateStudentProfile = async (profileData: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...profileData };
    setCurrentUser(updated);
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updated : u))
    }));
    return await api.updateStudentProfile({ id: currentUser.id, ...profileData });
  };


  // 2-Step Deposit
  const requestDeposit = async (
    amount: number,
    telegramUsername?: string,
    method = 'card',
    receiptUrl?: string,
    cardNumber?: string,
    note?: string
  ) => {
    if (!currentUser) return;
    const cleanTg = (telegramUsername || currentUser.telegramUsername || '').replace(/^@/, '');
    const code = `DEP-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTx: DepositTransaction = {
      id: `dep-${Date.now()}`,
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.surname || ''}`.trim(),
      userPhone: currentUser.phone,
      telegramUsername: cleanTg,
      amount: Number(amount),
      status: 'pending',
      method: method as any,
      paymentCode: code,
      receiptUrl: receiptUrl || '',
      cardNumber: db.telegramBotSettings?.cardNumber || '',
      note: note || `Depozit kodi: ${code}`,
      createdAt: new Date().toISOString()
    };

    setDb((prev) => ({
      ...prev,
      depositTransactions: [newTx, ...(prev.depositTransactions || [])]
    }));

    const res = await api.requestDeposit({
      userId: currentUser.id,
      userName: `${currentUser.name} ${currentUser.surname || ''}`.trim(),
      userPhone: currentUser.phone,
      telegramUsername: cleanTg,
      amount: Number(amount),
      method,
      receiptUrl,
      cardNumber,
      note
    });

    await refreshDb();
    return res;
  };

  const approveDeposit = async (depositId: string) => {
    const res = await api.approveDeposit(depositId);
    await refreshDb();
    return res;
  };

  const rejectDeposit = async (depositId: string) => {
    const res = await api.rejectDeposit(depositId);
    await refreshDb();
    return res;
  };

  const updateBotSettings = async (settings: Partial<TelegramBotSettings>) => {
    setDb((prev) => ({
      ...prev,
      telegramBotSettings: { ...prev.telegramBotSettings, ...settings }
    }));
    return await api.updateBotSettings(settings);
  };

  // AI & New Features
  // Submissions and their AI evaluations are stored by the server.
  const gradeWriting = async (essayText: string, taskPrompt: string, taskType?: string, taskId?: string) => {
    const res = await api.gradeWritingWithAI(essayText, taskPrompt, taskType, taskId);
    if (res.success) await refreshDb();
    return res;
  };

  const evaluateSpeaking = async (transcript: string, topicPrompt: string, part: number | string = 2, durationSeconds = 60, cardId?: string) => {
    const res = await api.evaluateSpeakingWithAI(transcript, topicPrompt, part, durationSeconds, cardId);
    if (res.success) await refreshDb();
    return res;
  };

  const translate3Level = async (query: string) => {
    return await api.translate3LevelWithAI(query);
  };

  const chatTutor = async (userMessage: string, lessonId?: string) => {
    return await api.chatWithAiTutor(
      userMessage,
      lessonId,
      currentUser?.name,
      currentUser?.vipTier
    );
  };

  const pasteToMock = async (rawText: string) => {
    return await api.pasteToMockWithAI(rawText);
  };

  const createBook = async (book: Partial<DigitalBook>) => {
    const res = await api.createBook(book);
    await refreshDb();
    return res;
  };

  const deleteBook = async (id: string) => {
    const res = await api.deleteBook(id);
    await refreshDb();
    return res;
  };

  const readBook = (bookId: string) => {
    if (!currentUser) return;
    const currentRead = currentUser.readBookIds || [];
    if (!currentRead.includes(bookId)) {
      const updated = [...currentRead, bookId];
      setCurrentUser({ ...currentUser, readBookIds: updated });
      api.updateStudentProfile({ id: currentUser.id, readBookIds: updated });
    }
  };

  const broadcastLiveStream = async (isLive: boolean, title: string, telegramChannel: string, streamUrl: string) => {
    const res = await api.broadcastLiveStream({ isLive, title, telegramChannel, streamUrl });
    await refreshDb();
    return res;
  };


  const addFlashcard = async (card: Partial<Flashcard>) => {
    if (!currentUser) return { success: false };
    const res = await api.createFlashcard(card as Record<string, unknown>);
    if (res.success) await refreshDb();
    return res;
  };




  const getAiStatus = async () => {
    return await api.getAiStatus();
  };

  const t = (key: string): string => {
    if (appTranslations[key]) {
      const entry = appTranslations[key];
      if (language === 'uz_cyrl') {
        return entry.uz_cyrl || uzLatinToCyrillic(entry.uz);
      }
      if (language === 'en' && entry.en) {
        return entry.en;
      }
      if (language === 'ru' && entry.ru) {
        return entry.ru;
      }
      return entry.uz || key;
    }
    if (language === 'uz_cyrl') {
      return uzLatinToCyrillic(key);
    }
    return key;
  };

  return (
    <AppContext.Provider
      value={{
        db,
        loading,
        activeSite,
        setActiveSite,
        currentUser,
        setCurrentUser,
        isOwnerAuth,
        setIsOwnerAuth,
        theme,
        toggleTheme,
        language,
        setLanguage,
        activeCourseId,
        setActiveCourseId,
        activeTestId,
        setActiveTestId,
        refreshDb,
        dbReady,
        dbError,
        unifiedLogin,
        loginWithGoogle,
        registerStudent,
        ownerChangePassword,
        logout,
        toggleLessonCompletion,
        submitTestAttempt,
        createCourse,
        updateCourse,
        deleteCourse,
        createLesson,
        updateLesson,
        deleteLesson,
        createTest,
        updateTest,
        deleteTest,
        createReadingTest,
        deleteReadingTest,
        createQuestion,
        deleteQuestion,
        createStudentResult,
        updateStudentResult,
        deleteStudentResult,
        updateSiteSections,
        updateVIPPlans,
        updateStudentVIP,
        purchaseVIPPlan,
        claimDailyQuest,
        economy,
        updateShopItems,
        submitReview,
        ownerReviews,
        updateFaqs,
        toggleStudentBlock,
        createSupportTicket,
        replySupportTicket,
        updateTeacherProfile,
        updateSiteTheme,
        updateStudentFull,
        deleteStudent,
        adjustStudentPointsAndCoins,
        updateStudentProfile,
        requestDeposit,
        approveDeposit,
        rejectDeposit,
        updateBotSettings,
        gradeWriting,
        evaluateSpeaking,
        translate3Level,
        chatTutor,
        pasteToMock,
        createBook,
        deleteBook,
        readBook,
        broadcastLiveStream,
        addFlashcard,
        getAiStatus,
        banStudentLevel1,
        unbanStudent,
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
