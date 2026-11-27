import {
  AppDatabase,
  Course,
  Lesson,
  Test,
  Question,
  SiteSection,
  StudentResult,
  SupportTicket,
  VIPPlan,
  TeacherProfile,
  DigitalBook,
  ReadingTest
} from '../types';

class ApiService {
  async fetchAllDb(): Promise<AppDatabase> {
    const res = await fetch('/api/db/all', { cache: 'no-store' });
    if (!res.ok) throw new Error("Ma'lumotlar bazasini yuklab bo'lmadi");
    const json = await res.json();
    return json.data;
  }

  // Unified login: handles student phone or secret owner code
  async unifiedLogin(loginInput: string, password?: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginInput, password })
    });
    return res.json();
  }

  async getSession() {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return { success: false, authenticated: false };
    return res.json();
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
  }

  async googleLogin(data: { email: string; name?: string; avatar?: string; uid?: string; idToken?: string; track?: string }) {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  async registerStudent(data: {
    name: string;
    surname?: string;
    identifier?: string;
    phone?: string;
    email?: string;
    password?: string;
    region?: string;
    track?: string;
    targetScore?: string;
    studyTimeDaily?: string;
  }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  async ownerChangePassword(oldPassword: string, newPassword: string, newUsername?: string) {
    const res = await fetch('/api/auth/owner-change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword, newUsername })
    });
    return res.json();
  }

  private async post(path: string, body: unknown) {
    const res = await fetch('/api/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {})
    });
    return res.json();
  }

  /** Exam engine: timed session with autosave; scoring happens on the server */
  startExam(testId: string, guestKey?: string) {
    return this.post('exams/start', { testId, guestKey });
  }
  saveExam(testId: string, sessionId: string, answers: Record<string, unknown>, guestKey?: string) {
    return this.post('exams/save', { testId, sessionId, answers, guestKey });
  }
  submitExam(testId: string, sessionId: string | undefined, answers: Record<string, unknown>, timeSpentSeconds: number, guestKey?: string) {
    return this.post('test-attempts', { testId, sessionId, answers, timeSpentSeconds, guestKey });
  }
  reviewAttempt(attemptId: string) {
    return this.post('exams/review', { attemptId });
  }

  saveLessonProgress(lessonId: string, position: number, duration: number) {
    return this.post('lessons/progress', { lessonId, position, duration });
  }

  /** Server-validated student rewards and purchases */
  economy(body: { action: string; [k: string]: unknown }) {
    return this.post('student/economy', body);
  }
  createFlashcard(card: Record<string, unknown>) {
    return this.post('flashcards', card);
  }
  private async send(method: 'PUT' | 'DELETE', path: string, body?: unknown) {
    try {
      const res = await fetch(`/api/${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Tarmoq xatosi. Qayta urinib ko‘ring.' };
    }
  }
  reviewFlashcard(id: string, grade: number) {
    return this.send('PUT', `flashcards/${encodeURIComponent(id)}`, { grade });
  }
  updateFlashcard(id: string, fields: Record<string, unknown>) {
    return this.send('PUT', `flashcards/${encodeURIComponent(id)}`, fields);
  }
  deleteFlashcard(id: string) {
    return this.send('DELETE', `flashcards/${encodeURIComponent(id)}`);
  }
  async getAiThreads(): Promise<{ success: boolean; threads?: any[] }> {
    try {
      const res = await fetch('/api/student/ai-threads', { cache: 'no-store' });
      return await res.json();
    } catch {
      return { success: false };
    }
  }
  saveAiThreads(threads: unknown[]) {
    return this.send('PUT', 'student/ai-threads', { threads });
  }
  async deleteReadingTest(id: string) {
    const res = await fetch(`/api/reading-tests/${id}`, { method: 'DELETE' });
    return res.json();
  }
  updateShopItems(items: unknown[]) {
    return this.post('owner/shop-items', { items });
  }
  submitReview(text: string, rating: number) {
    return this.post('reviews/submit', { text, rating });
  }
  ownerReviews(body: Record<string, unknown>) {
    return this.post('owner/reviews', body);
  }
  updateFaqs(faqs: unknown[]) {
    return this.post('owner/faqs', { faqs });
  }

  async createCourse(course: Partial<Course>) {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course)
    });
    return res.json();
  }

  async updateCourse(id: string, course: Partial<Course>) {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course)
    });
    return res.json();
  }

  async deleteCourse(id: string) {
    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async createLesson(lesson: Partial<Lesson>) {
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson)
    });
    return res.json();
  }

  async updateLesson(id: string, lesson: Partial<Lesson>) {
    const res = await fetch(`/api/lessons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson)
    });
    return res.json();
  }

  async deleteLesson(id: string) {
    const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async toggleLessonComplete(userId: string, lessonId: string) {
    const res = await fetch('/api/lessons/toggle-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, lessonId })
    });
    return res.json();
  }

  async createTest(test: Partial<Test>) {
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test)
    });
    return res.json();
  }

  async updateTest(id: string, test: Partial<Test>) {
    const res = await fetch(`/api/tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test)
    });
    return res.json();
  }

  async deleteTest(id: string) {
    const res = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async createQuestion(question: Partial<Question>) {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    return res.json();
  }

  async deleteQuestion(id: string) {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async submitTestAttempt(data: {
    userId: string;
    testId: string;
    answers: Record<string, any>;
    timeSpentSeconds: number;
    customCorrectCount?: number;
    customTotalQuestions?: number;
    customScore?: number;
    customMaxScore?: number;
    customPercentage?: number;
    cefrLevel?: string;
    track?: string;
  }) {
    const res = await fetch('/api/test-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  async createStudentResult(result: Partial<StudentResult>) {
    const res = await fetch('/api/student-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    return res.json();
  }

  async updateStudentResult(id: string, result: Partial<StudentResult>) {
    const res = await fetch(`/api/student-results/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    return res.json();
  }

  async deleteStudentResult(id: string) {
    const res = await fetch(`/api/student-results/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async updateSiteSections(sections: SiteSection[]) {
    const res = await fetch('/api/site-sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sections)
    });
    return res.json();
  }

  async saveNews(item: Record<string, unknown>) {
    const res = await fetch('/api/owner/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    return res.json();
  }

  async deleteNews(id: string) {
    const res = await fetch(`/api/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.json();
  }

  /** Student: wrong answers from their own exercises. */
  async getMistakes() {
    const res = await fetch('/api/student/mistakes');
    return res.json().catch(() => ({ success: false, mistakes: [] })) as Promise<{ success: boolean; mistakes?: any[]; message?: string }>;
  }

  /** Jev (TypeSafe) checks a typed answer. Returns the verdict, or ok:false when the checker is unavailable. */
  async judgeAnswer(word: string, accepted: string[], given: string) {
    const res = await fetch('/api/ai-judge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word, accepted, given }) });
    return res.json().catch(() => ({ success: false })) as Promise<{ success: boolean; match?: boolean; source?: string; probability?: number | null; message?: string }>;
  }

  /** Public: a visitor asks to hear about news (e-mail, phone or @telegram). */
  async subscribeNews(contact: string) {
    const res = await fetch('/api/news/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact }) });
    return res.json();
  }

  /** Owner: remove one subscriber. */
  async deleteNewsSubscriber(id: string) {
    const res = await fetch(`/api/news-subscribers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.json();
  }

  /** Owner: start a limited-time VIP for every student ({ tier, hours, title, message }) or stop it ({ action: 'stop' }). */
  async vipGift(payload: Record<string, unknown>) {
    const res = await fetch('/api/owner/vip-gift', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return res.json();
  }

  async updateVIPPlans(plans: VIPPlan[]) {
    const res = await fetch('/api/vip-plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plans)
    });
    return res.json();
  }

  async updateStudentVIP(userId: string, vipTier: string, durationDays: number) {
    const res = await fetch('/api/users/update-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, vipTier, durationDays })
    });
    return res.json();
  }

  async toggleStudentBlock(userId: string) {
    const res = await fetch('/api/users/toggle-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  }

  async createSupportTicket(ticket: Partial<SupportTicket>) {
    const res = await fetch('/api/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    });
    return res.json();
  }

  async replySupportTicket(ticketId: string, replyText: string) {
    const res = await fetch('/api/support-tickets/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, replyText })
    });
    return res.json();
  }

  // AI Methods
  async gradeWritingWithAI(essayText: string, taskPrompt: string, taskType: string = 'task2', taskId?: string) {
    const res = await fetch('/api/ai/grade-writing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essayText, taskPrompt, taskType, taskId })
    });
    return res.json();
  }

  async evaluateSpeakingWithAI(transcript: string, topicPrompt: string, part: number | string = 2, durationSeconds: number = 60, cardId?: string) {
    const res = await fetch('/api/ai/evaluate-speaking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, topicPrompt, part, durationSeconds, cardId })
    });
    return res.json();
  }

  async translate3LevelWithAI(query: string) {
    const res = await fetch('/api/ai/translate-3level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  }

  async chatWithAiTutor(userMessage: string, lessonId?: string, studentName?: string, vipTier?: string) {
    const res = await fetch('/api/ai/chat-tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, lessonId, studentName, vipTier })
    });
    return res.json();
  }

  /** Edubek AI: one question answered at the student's level. simple = children's mode. */
  async askEdubek(
    userMessage: string,
    options: { level?: string; simple?: boolean; lessonId?: string; mode?: 'tutor' | 'explain'; history?: { sender: 'user' | 'ai'; text: string }[] } = {}
  ) {
    const res = await fetch('/api/ai/chat-tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, ...options })
    });
    return res.json();
  }

  /**
   * Edubek's answer as it is written: onText gets the whole answer so far each time a new piece arrives.
   * Returns the final text, or the reason it failed.
   */
  async askEdubekStream(
    userMessage: string,
    options: { level?: string; simple?: boolean; talk?: boolean; scenario?: string; mood?: string; context?: string; lessonId?: string; mode?: 'tutor' | 'explain'; history?: { sender: 'user' | 'ai'; text: string }[] },
    onText: (soFar: string) => void,
    signal?: AbortSignal
  ): Promise<{ ok: true; text: string } | { ok: false; message: string; code?: string }> {
    // Own controller: the student's stop button AND two watchdogs can end the request. A silent server never means endless loading.
    const ctrl = new AbortController();
    let timedOut: 'first' | 'idle' | null = null;
    const onOuterAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) ctrl.abort();
      else signal.addEventListener('abort', onOuterAbort, { once: true });
    }
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const arm = (ms: number, kind: 'first' | 'idle') => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => { timedOut = kind; ctrl.abort(); }, ms);
    };
    const FIRST_MS = 35_000; // time to the first visible words (a sleeping Render server may need a while)
    const IDLE_MS = 25_000; // silence in the middle of an answer
    arm(FIRST_MS, 'first');
    const timeoutResult = { ok: false as const, message: 'Edubek hozir band yoki javob bermadi. “Qayta urinish” ni bosing.', code: 'TIMEOUT' };
    try {
      let res: Response;
      try {
        res = await fetch('/api/ai-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage, ...options }),
          signal: ctrl.signal
        });
      } catch (e) {
        if (timedOut) return timeoutResult;
        if ((e as Error)?.name === 'AbortError') return { ok: false, message: 'To‘xtatildi.' };
        return { ok: false, message: 'Internet yoki server bilan aloqa yo‘q. Tekshirib, qayta urinib ko‘ring.', code: 'NETWORK' };
      }
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.includes('application/json') || !res.body) {
        const j = await res.json().catch(() => ({} as any));
        return { ok: false, message: j?.message || 'Edubek javob bermadi. Qayta urinib ko‘ring.', code: j?.code };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = '';
      let visible = false;
      for (;;) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch (e) {
          if (timedOut) return text.trim() ? { ok: true, text } : timeoutResult;
          // Stopped by the student: what was written so far is kept.
          if ((e as Error)?.name === 'AbortError') return text.trim() ? { ok: true, text } : { ok: false, message: 'To‘xtatildi.' };
          // Connection dropped in the middle: keep the words already shown, otherwise report it.
          return text.trim() ? { ok: true, text } : { ok: false, message: 'Aloqa uzildi. Qayta urinib ko‘ring.', code: 'NETWORK' };
        }
        const { done, value } = chunk;
        if (done) break;
        text += dec.decode(value, { stream: true }).replace(/\u200b/g, '');
        const cut = text.indexOf('\u0001');
        if (cut >= 0) {
          const message = text.slice(cut + 1).trim() || 'AI xizmati javob bermadi.';
          return cut > 0 ? { ok: true, text: text.slice(0, cut) } : { ok: false, message };
        }
        if (text.trim()) {
          visible = true;
          arm(IDLE_MS, 'idle');
        } else if (!visible) {
          arm(FIRST_MS, 'first');
        }
        onText(text);
      }
      text += dec.decode().replace(/\u200b/g, '');
      return text.trim() ? { ok: true, text } : { ok: false, message: 'Edubek bo‘sh javob qaytardi. Qayta urinib ko‘ring.', code: 'EMPTY' };
    } finally {
      if (watchdog) clearTimeout(watchdog);
      signal?.removeEventListener('abort', onOuterAbort);
    }
  }

  /** Counts the time the AI section is open and tells how much of today's AI time is left. */
  async aiClock(count: boolean) {
    const res = await fetch('/api/ai-time', { method: count ? 'POST' : 'GET' });
    return res.json().catch(() => ({ success: false })) as Promise<{ success: boolean; limitMinutes?: number; usedSeconds?: number; remainingSeconds?: number | null }>;
  }

  /** Student: change own password. */
  async changeStudentPassword(oldPassword: string, newPassword: string) {
    const res = await fetch('/api/student/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
    return res.json();
  }

  /** Owner: daily AI minutes per plan. */
  async saveAiLimits(limits: { freeMinutes: number; planMinutes: Record<string, number>; inPerM?: number; outPerM?: number; capSom?: number }) {
    const res = await fetch('/api/owner/ai-limits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(limits) });
    return res.json();
  }

  /** Owner: AI usage statistics. */
  async aiStats() {
    const res = await fetch('/api/ai/stats');
    return res.json();
  }

  async explainLessonWithAi(text: string) {
    const res = await fetch('/api/ai/chat-tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: text, mode: 'explain' })
    });
    return res.json();
  }

  /** Student: price preview for a VIP plan with a promo code. */
  checkPromo(code: string, planId: string) {
    return this.post('student/promo-check', { code, planId });
  }

  /** Owner: create or update a promo code. */
  saveVipPromo(data: Record<string, unknown>) {
    return this.post('owner/promo-codes', data);
  }

  /** Owner: delete a promo code. */
  deletePromoCode(id: string) {
    return this.post('owner/promo-codes/delete', { id });
  }

  /** Student: "Darsni ko'rib bo'ldim" — stores that the video was watched (keeps the current position). */
  markLessonWatched(lessonId: string, position: number) {
    return this.post('lessons/progress', { lessonId, position, watched: true });
  }

  /** Student: submit the lesson test. The server grades it and completes the lesson when passed. */
  submitLessonQuiz(lessonId: string, answers: Record<string, number>) {
    return this.post('lessons/quiz-submit', { lessonId, answers });
  }

  /** Owner: create the lesson test with AI from the lesson text. */
  generateLessonQuiz(lessonId: string, count = 5) {
    return this.post('lessons/generate-quiz', { lessonId, count });
  }

  /** Owner: turn the Edu Coin system on or off. */
  setFeatures(patch: boolean | { coinEnabled?: boolean; navHidden?: string[]; ownerNavHidden?: string[]; ownerNavLabels?: Record<string, string>; flags?: Record<string, boolean> }) {
    const body = typeof patch === 'boolean' ? { coinEnabled: patch } : patch;
    return this.post('owner/features', body);
  }

  /** Mashqlar: owner saves a draft or publishes an exercise. */
  saveExercise(data: Record<string, unknown>) {
    return this.post('exercises', data);
  }

  /** Mashqlar: owner removes an exercise. */
  async deleteExercise(id: string) {
    const res = await fetch('/api/exercises/' + encodeURIComponent(id), { method: 'DELETE' });
    return res.json();
  }

  /** Mashqlar: AI drafts questions from the owner's text. The owner reviews before publishing. */
  generateExerciseDraft(data: { sourceText: string; skill: string; level: string; count?: number }) {
    return this.post('ai/generate-exercises', data);
  }

  /** Mashqlar: the server grades auto-checkable answers and stores the attempt. */
  submitExercise(exerciseId: string, answers: Record<string, string | number>) {
    return this.post('exercises/submit', { exerciseId, answers });
  }

  /** Reads the text of a student's .docx or .txt file (for the chat). */
  async extractFileText(fileBase64: string, fileName: string) {
    const res = await fetch('/api/files/extract-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileBase64, fileName }) });
    return res.json();
  }

  /** Owner: saves the Edubek greeting and animation switch. */
  async setEdubekSettings(edubekSettings: { greeting?: string; animations?: boolean; voiceNotes?: boolean; files?: boolean; stickers?: boolean }) {
    const res = await fetch('/api/owner/features', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edubekSettings }) });
    return res.json();
  }

  /** Owner: what is ready for the Telegram bot (yes/no per item). */
  /** Student: a short code (and link) that connects this account to the Telegram bot. */
  async telegramLinkCode() {
    const res = await fetch('/api/student/telegram-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return res.json();
  }

  async telegramStatus() {
    const res = await fetch('/api/owner/telegram-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return res.json();
  }

  /** Owner: a message to the bot's subscribers (in batches), to the channel, or a lesson announcement to the channel. */
  async telegramBroadcast(body: { target: 'subscribers' | 'channel' | 'channel_lesson' | 'channel_quiz' | 'channel_pin' | 'channel_qa' | 'digest' | 'reminders'; text?: string; lessonId?: string; offset?: number }) {
    const res = await fetch('/api/owner/telegram-broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }

  /** Owner: connect the Telegram bot webhook ('set') or read its status ('info'). */
  async telegramWebhook(action: 'set' | 'info') {
    const res = await fetch('/api/owner/telegram-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    return res.json();
  }

  /** Owner: creates or updates a thematic quiz pack (questions included). */
  async saveThematicPack(pack: Record<string, unknown>) {
    const res = await fetch('/api/owner/thematic-packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack }) });
    return res.json();
  }

  /** Owner: deletes a thematic quiz pack. */
  async deleteThematicPack(id: string) {
    const res = await fetch('/api/owner/thematic-packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteId: id }) });
    return res.json();
  }

  /** Owner: writes a multiple-choice test from pasted text or an uploaded .docx / .txt file. */
  async quizFromDocument(payload: { text?: string; fileBase64?: string; fileName?: string; count?: number; title?: string }) {
    const res = await fetch('/api/ai/quiz-from-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async generateStudentTest(source: string, count = 5, level?: string) {
    const res = await fetch('/api/ai/student-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, count, level })
    });
    return res.json();
  }

  async askOwnerAssistant(question: string) {
    const res = await fetch('/api/ai/owner-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    return res.json();
  }

  async pasteToMockWithAI(rawText: string) {
    const res = await fetch('/api/ai/paste-to-mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    });
    return res.json();
  }

  async solveMathWithAI(prompt: string, vipTier: string = 'pro') {
    return this.chatWithAiTutor(prompt, undefined, undefined, vipTier);
  }

  async generateQuizWithAI(content: string, count: number = 5) {
    return this.pasteToMockWithAI(content);
  }

  async generateMockTestWithAi(track: 'cefr' | 'general' | 'ielts', title?: string, customPrompt?: string, useTemplate = false) {
    try {
      const res = await fetch('/api/ai/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, title, customPrompt, useTemplate })
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Tarmoq xatosi. Qayta urinib ko‘ring.' };
    }
  }

  async createReadingTest(readingTest: Partial<ReadingTest>) {
    const res = await fetch('/api/reading-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(readingTest)
    });
    return res.json();
  }

  async updateTeacherProfile(profile: Partial<TeacherProfile>) {
    const res = await fetch('/api/owner/teacher-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return res.json();
  }

  async updateSiteTheme(themeConfig: { activeBackground: string; allowUserThemeOverride?: boolean }) {
    const res = await fetch('/api/owner/site-theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(themeConfig)
    });
    return res.json();
  }

  async updateStudentFull(studentData: any) {
    const res = await fetch('/api/owner/students/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    return res.json();
  }

  async deleteStudent(studentId: string) {
    const res = await fetch(`/api/owner/students/${studentId}`, {
      method: 'DELETE'
    });
    return res.json();
  }

  async updateStudentProfile(profileData: any) {
    const res = await fetch('/api/student/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return res.json();
  }

  /** Owner only: uploads a study PDF (base64) and returns its public URL. */
  async uploadPdf(pdfBase64: string, filename?: string) {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'pdf', imageBase64: pdfBase64, filename })
    });
    return res.json();
  }

  async uploadAsset(imageBase64: string, filename?: string, kind?: 'receipt' | 'chat') {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, filename, kind })
    });
    return res.json();
  }

  async requestDeposit(depositData: {
    userId: string;
    userName: string;
    userPhone: string;
    telegramUsername?: string;
    amount: number;
    method?: string;
    receiptUrl?: string;
    cardNumber?: string;
    note?: string;
  }) {
    const res = await fetch('/api/deposits/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(depositData)
    });
    return res.json();
  }

  async approveDeposit(depositId: string) {
    const res = await fetch(`/api/owner/deposits/approve/${depositId}`, {
      method: 'POST'
    });
    return res.json();
  }

  async rejectDeposit(depositId: string) {
    const res = await fetch(`/api/owner/deposits/reject/${depositId}`, {
      method: 'POST'
    });
    return res.json();
  }

  async updateBotSettings(botSettings: any) {
    const res = await fetch('/api/owner/bot-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botSettings })
    });
    return res.json();
  }

  async broadcastLiveStream(broadcastData: {
    isLive: boolean;
    title: string;
    telegramChannel: string;
    streamUrl: string;
  }) {
    const res = await fetch('/api/owner/livestream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broadcastData)
    });
    return res.json();
  }

  async createBook(book: Partial<DigitalBook>) {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book)
    });
    return res.json();
  }

  async deleteBook(id: string) {
    const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async getAiStatus() {
    const res = await fetch('/api/ai/status');
    return res.json();
  }

  async generateStudentAiAnalysis(studentInfo: any) {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Sen Edu Level platformasining bosh sun'iy intellekt ustozisiz. Quyidagi o'quvchi haqida chuqur pedagogik va akademik tahlil hamda xulosa tayyorlang:
        Ism-familiya: ${studentInfo.name} ${studentInfo.surname || ''}
        Yo'nalishi: ${studentInfo.track || 'IELTS'}
        Maqsadi: ${studentInfo.targetScore || '8.0+'}
        Kunlik o'quv vaqti: ${studentInfo.studyTimeDaily || '1.5 soat'}
        XP va Ballar: ${studentInfo.xp || 0} XP, ${studentInfo.points || 0} Ball
        Tugatgan darslar soni: ${studentInfo.completedLessonsCount || 0}
        
        Iltimos, o'quvchi yaxshi o'qiyaptimi, uning o'sish dinamikasi, kuchli va kuchsiz tomonlari hamda ustoz uchun amaliy tavsiyalarni o'zbek tilida tayyorlang.`
      })
    });
    return res.json();
  }

}

export const api = new ApiService();
