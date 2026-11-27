'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../ui/styles';

interface Msg {
  role: 'user' | 'ai';
  text: string;
  error?: boolean;
}

const SUGGESTIONS = ['Bugun nimaga e’tibor berishim kerak?', 'Kutilayotgan depozitlar haqida ayt', 'O‘quvchilar yo‘nalishlar bo‘yicha qanday?'];

const GREETING: Msg = {
  role: 'ai',
  text: 'Salom! Depozitlar, o‘quvchilar, murojaatlar va AI ishlatilishi haqida so‘rang. Men faqat tavsiya beraman, hech narsani o‘zgartirmayman.'
};

/**
 * Owner's AI assistant, shown inside the AI section. Answers from a compact platform
 * summary built on the server; it can only advise and never changes data.
 */
export const OwnerAiChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [keyOk, setKeyOk] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((j) => setKeyOk(!!j?.hasKey))
      .catch(() => setKeyOk(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const ask = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const res = await api.askOwnerAssistant(question);
      if (res?.success && res.reply) setMessages((m) => [...m, { role: 'ai', text: res.reply }]);
      else setMessages((m) => [...m, { role: 'ai', text: res?.message || 'AI javob bermadi.', error: true }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Server bilan bog‘lanib bo‘lmadi.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const statusText =
    keyOk === null ? 'Tekshirilmoqda…' : keyOk ? 'Ulangan · faqat tavsiya beradi' : 'Kalit ulanmagan: Render’da GEMINI_API_KEY yoki zaxira kalit (Groq, DeepSeek, OpenRouter, Mistral) qo‘shing';

  return (
    <section aria-label="AI yordamchi" className="flex h-[min(640px,calc(100svh-260px))] min-h-[420px] flex-col overflow-hidden rounded-[1.75rem] border border-line/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.03]">
      <header className="flex items-center gap-3 border-b border-line/70 px-5 py-4 dark:border-white/10">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white shadow-[0_10px_24px_-10px_rgba(242,101,15,0.8)]">
          <Bot className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink dark:text-white">AI yordamchi</div>
          <div className={cn('flex items-center gap-1.5 text-[12px] font-semibold', keyOk === false ? 'text-rose-600 dark:text-rose-300' : 'text-ink-muted dark:text-stone-400')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', keyOk ? 'bg-emerald-500' : keyOk === false ? 'bg-rose-500' : 'bg-stone-400')} aria-hidden />
            {statusText}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex animate-msg', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed',
                m.role === 'user'
                  ? 'bg-ink text-white dark:bg-white dark:text-ink'
                  : m.error
                    ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200'
                    : 'bg-ink/[0.05] text-ink dark:bg-white/[0.06] dark:text-stone-200'
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-[12.5px] text-ink-muted dark:text-stone-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI o‘ylamoqda…
          </div>
        ) : null}
        {messages.length === 1 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line/80 px-3.5 py-2 text-[12.5px] font-semibold text-ink-muted transition-colors hover:border-ink/30 hover:text-ink dark:border-white/10 dark:text-stone-300 dark:hover:text-white">
                {s}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex items-center gap-2 border-t border-line/70 p-3 dark:border-white/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1500}
          placeholder="Savol yozing…"
          aria-label="Savol"
          className="h-11 min-w-0 flex-1 rounded-full border border-line/80 bg-white/80 px-4 text-[14px] text-ink outline-none transition-colors focus:border-ember-500/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Yuborish"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ffa149] to-[#f2650f] text-white transition-transform hover:scale-105 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
};
