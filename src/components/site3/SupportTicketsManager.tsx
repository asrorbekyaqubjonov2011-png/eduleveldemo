import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Send, CheckCircle, Clock, Inbox, Phone } from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';
import { downloadCsv } from '../../lib/csvDownload';

export const SupportTicketsManager: React.FC = () => {
  const { db, replySupportTicket } = useApp();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const tickets = db.supportTickets;

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;

    setLoading(true);
    try {
      await replySupportTicket(ticketId, replyText);
      setReplyText('');
      setSelectedTicketId(null);
    } finally {
      setLoading(false);
    }
  };

  const newCount = tickets.filter(t => t.status !== 'answered').length;

  return (
    <div className="space-y-7">
      <Reveal>
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/60 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-muted backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400">
              <MessageSquare className="h-3.5 w-3.5 text-ember-600" />
              Yordam Markazi
            </span>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.4vw,2.25rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-ink dark:text-white">
              O‘quvchilar Murojaatlari va Yordam Markazi
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Sayt 1 va kabinetdan kelib tushgan savollarni ko‘rish, javob qaytarish va holatini boshqarish
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="glass-1 flex items-center gap-2.5 rounded-full px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-500" />
              <span className="font-display text-[14px] font-extrabold tabular-nums text-ink dark:text-white">
                {newCount}
              </span>
              <span className="text-[11px] font-medium text-ink-muted dark:text-stone-400">javob kutmoqda</span>
            </div>
            <div className="glass-1 hidden items-center gap-2.5 rounded-full px-4 py-2.5 sm:flex">
              <span className="font-display text-[14px] font-extrabold tabular-nums text-ink dark:text-white">
                {tickets.length}
              </span>
              <span className="text-[11px] font-medium text-ink-muted dark:text-stone-400">jami</span>
            </div>
          </div>
        </header>
      </Reveal>

      <div className="space-y-3.5">
        {tickets.length === 0 ? (
          <Reveal delay={80}>
            <Glass level={1} radius="rounded-[1.75rem]">
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="mt-4 font-display text-[15px] font-bold tracking-tight text-ink dark:text-white">
                  Hozircha yangi murojaatlar yo‘q.
                </p>
                <p className="mt-1 max-w-sm text-[12.5px] text-ink-muted dark:text-stone-400">
                  O‘quvchilar sayt orqali savol yuborganda, ular shu ro‘yxatda paydo bo‘ladi.
                </p>
              </div>
            </Glass>
          </Reveal>
        ) : (
          <>
          <div className="flex justify-end">
            <button type="button" onClick={() => downloadCsv(`murojaatlar-${new Date().toISOString().slice(0, 10)}.csv`, [['Sana', 'Ism', 'Telefon', 'Kategoriya', 'Xabar', 'Holat', 'Javob'], ...(db.supportTickets || []).map((x) => [x.createdAt.slice(0, 10), x.userName, x.userPhone, x.category, x.message, x.status, x.replyText || ''])])} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[12.5px] font-semibold text-ink dark:border-white/10 dark:bg-white/[0.05] dark:text-white">Excel (CSV)</button>
          </div>
          {tickets.map((ticket, index) => {
            const isAnswered = ticket.status === 'answered';
            const isReplying = selectedTicketId === ticket.id;

            return (
              <Reveal key={ticket.id} delay={Math.min(index * 45, 240)}>
                <Glass
                  level={isAnswered ? 1 : 2}
                  radius="rounded-[1.5rem]"
                  className={cn(
                    'p-5 sm:p-6 transition-shadow duration-300',
                    !isAnswered && 'shadow-[0_18px_44px_-28px_rgba(239,108,18,0.45)]'
                  )}
                >
                  <div className="flex flex-col gap-3 border-b border-line/60 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <h2 className="break-words [overflow-wrap:anywhere] font-display text-[14.5px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                          {ticket.userName}
                        </h2>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-muted dark:text-stone-400">
                          <Phone className="h-3 w-3 opacity-60" />
                          {ticket.userPhone}
                        </span>
                        <Pill tone="neutral">{ticket.category}</Pill>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-[11px] tabular-nums text-ink-muted/80 dark:text-stone-500">
                        {new Date(ticket.createdAt).toLocaleString('uz-UZ')}
                      </span>
                      {isAnswered ? (
                        <Pill tone="emerald">
                          <CheckCircle className="h-3 w-3" />
                          Javob berilgan
                        </Pill>
                      ) : (
                        <Pill tone="ember">
                          <Clock className="h-3 w-3" />
                          Yangi
                        </Pill>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl border border-line/60 bg-white/50 px-4 py-3.5 text-[13px] leading-relaxed text-ink-soft dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-stone-300">
                    "{ticket.message}"
                  </p>

                  {ticket.replyText && (
                    <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3.5">
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-400">
                        Muxtorov Jasurbek ustoz javobi
                      </span>
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed text-ink-soft dark:text-stone-300">{ticket.replyText}</p>
                    </div>
                  )}

                  {!isAnswered && (
                    <div className="mt-4">
                      {isReplying ? (
                        <div className="space-y-3">
                          <label className={label}>Javob matni</label>
                          <textarea
                            rows={3}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Javobingizni yozing..."
                            className={cn(field, 'resize-y')}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(null)}>
                              Bekor Qilish
                            </Button>
                            <Button
                              variant="ember"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleReply(ticket.id)}
                              iconLeft={<Send className="h-3.5 w-3.5" />}
                            >
                              Javobni Yuborish
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setReplyText('');
                          }}
                        >
                          Javob Yozish
                        </Button>
                      )}
                    </div>
                  )}
                </Glass>
              </Reveal>
            );
          })}
          </>
        )}
      </div>
    </div>
  );
};
