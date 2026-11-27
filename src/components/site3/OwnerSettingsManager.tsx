import React, { useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { OWNER_NAV_ITEMS, OWNER_NAV_LOCKED } from '../../lib/ownerNav';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

/** Landing sections the owner can show or hide on the public site. */
const SECTION_LABELS: Record<string, string> = {
  hero: 'Bosh ekran',
  news: 'Yangiliklar',
  levels: 'B1–C1 yo‘l xaritasi',
  books: 'Kitoblar',
  results: 'Natijalar',
  testimonials: 'Fikrlar',
  vip: 'VIP tariflar',
  teacher: 'Ustoz',
  faq: 'Savol-javoblar',
  contact: 'Aloqa'
};

/** Switches that are on until the owner turns them off. */
const FLAGS: { key: string; label: string; hint: string }[] = [
  { key: 'registrationOpen', label: 'Yangi o‘quvchi qabul qilish', hint: 'O‘chirsangiz ro‘yxatdan o‘tish yopiladi (mavjud o‘quvchilar kirishda davom etadi).' },
  { key: 'depositsEnabled', label: 'Depozit qabul qilish', hint: 'O‘chirsangiz o‘quvchilar balansni to‘ldirish so‘rovi yubora olmaydi.' },
  { key: 'aiEnabled', label: 'AI (o‘quvchilar uchun)', hint: 'O‘chirsangiz Edubek va AI tekshiruvlari o‘quvchilarga to‘xtaydi.' },
  { key: 'publicEdubek', label: 'Ochiq saytdagi Edubek yordamchisi', hint: 'Burchakdagi yuzli yordamchi tugmasi.' },
  { key: 'introSplash', label: 'Kirish animatsiyasi', hint: 'Saytga birinchi kirganda ko‘rinadigan ochilish sahnasi.' },
  { key: 'newsSubscribe', label: 'Yangiliklarga obuna formasi', hint: 'Yangiliklar bo‘limidagi obuna maydoni.' },
  { key: 'dashTodayPlan', label: 'O‘quvchi: “Bugungi reja”', hint: 'Kabinet bosh sahifasidagi bajarilmagan vazifalar kartasi.' },
  { key: 'dashEdubekTip', label: 'O‘quvchi: kunlik Edubek maslahati', hint: 'Bosh sahifadagi kunlik o‘quv maslahati.' },
  { key: 'profileMistakes', label: 'O‘quvchi: “Xatolar daftari”', hint: 'Profildagi xatolar daftari bo‘limi.' },
  { key: 'edubekVoice', label: 'Edubek: ovozli suhbat', hint: 'O‘chirsangiz “Suhbat” tugmasi va ovoz sozlamalari yashirinadi.' },
  { key: 'edubekPronunciation', label: 'Edubek: talaffuz mashqi', hint: 'Qo‘shimcha amallar menyusidagi talaffuz murabbiyi.' },
  { key: 'edubekWordOfDay', label: 'Edubek: so‘z kuni', hint: 'Suhbat oynasidagi kunlik so‘z kartasi.' },
  { key: 'blitzEnabled', label: 'Lug‘at & Blitz bo‘limi', hint: 'AI bo‘limidagi Lug‘at va Blitz kartasi.' },
  { key: 'vipGiftBanner', label: 'VIP sovg‘a bannerlari', hint: 'Yangiliklar va kabinetdagi cheklangan vaqtli VIP sovg‘a e’loni.' },
  { key: 'planCompare', label: 'Tariflarni solishtirish', hint: 'VIP bo‘limidagi yig‘iladigan solishtirish jadvali.' },
  { key: 'edubekGames', label: 'Edubek o‘yinlari', hint: 'Diktant, so‘z topish va tez test (qurilmada ishlaydi, AI vaqti sarflamaydi).' }
];

/** Student menu items (ids match the student cabinet). The profile cannot be hidden. */
const NAV_LABELS: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'Boshqaruv paneli' },
  { id: 'progress', label: 'Mening progressim' },
  { id: 'courses', label: 'Video darslar' },
  { id: 'mashqlar', label: 'Mashqlar' },
  { id: 'tests', label: 'Mock imtihonlar' },
  { id: 'thematic_packs', label: 'Test paketlari' },
  { id: 'level_tests', label: 'Levelni aniqlash' },
  { id: 'ai_studio', label: 'AI (Edubek)' },
  { id: 'library', label: 'Raqamli kutubxona' },
  { id: 'leaderboard', label: 'Reyting' },
  { id: 'vip', label: 'VIP tariflar' },
  { id: 'coin_shop', label: 'Edu Coin do‘koni' }
];

/** Rounded panel used by each settings group. */
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-line/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">{children}</div>
);

/** Small on/off switch used by every row. */
const Switch: React.FC<{ on: boolean; busy?: boolean; label: string; onToggle: () => void }> = ({ on, busy, label, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    disabled={busy}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-300 disabled:opacity-60 ${
      on ? 'bg-gradient-to-r from-[#ffa149] to-[#f2650f]' : 'bg-ink/15 dark:bg-white/15'
    }`}
  >
    <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

/**
 * Owner settings: platform switches.
 * - Edu Coin: shop and coin rewards on or off.
 * - Landing sections: shown or hidden on the public site (and their header links).
 * - Student menu: menu items shown or hidden in the student cabinet.
 */
export const OwnerSettingsManager: React.FC = () => {
  const { db, refreshDb } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const coinOn = db.features?.coinEnabled !== false;
  const hiddenNav = new Set<string>(db.features?.navHidden || []);
  const sections = [...(db.siteSections || [])].sort((a, b) => a.orderIndex - b.orderIndex);

  /** Runs one save, refreshes the data and shows the result. */
  const run = async (key: string, save: () => Promise<any>, okText: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await save();
      if (!res?.success) {
        setMessage({ tone: 'error', text: res?.message || 'Saqlab bo‘lmadi.' });
        return;
      }
      await refreshDb();
      setMessage({ tone: 'ok', text: okText });
    } catch {
      setMessage({ tone: 'error', text: 'Server bilan bog‘lanib bo‘lmadi.' });
    } finally {
      setBusy(null);
    }
  };

  const toggleCoin = () =>
    run(
      'coin',
      () => api.setFeatures(!coinOn),
      !coinOn ? 'Edu Coin yoqildi. Do‘kon va mukofotlar o‘quvchilarga ko‘rinadi.' : 'Edu Coin o‘chirildi. Do‘kon menyudan yashirildi.'
    );

  const toggleSection = (key: string, visible: boolean) =>
    run(
      `sec:${key}`,
      () => api.updateSiteSections((db.siteSections || []).map((s) => (s.key === key ? { ...s, isVisible: !visible } : s))),
      `${SECTION_LABELS[key] || key} ${visible ? 'yashirildi' : 'ko‘rsatildi'}. Ochiq saytda darhol o‘zgaradi.`
    );

  const toggleFlag = (key: string, on: boolean, name: string) =>
    run(`flag:${key}`, () => api.setFeatures({ flags: { [key]: !on } }), `${name} ${on ? 'o‘chirildi' : 'yoqildi'}.`);

  const toggleNav = (id: string) => {
    const next = hiddenNav.has(id) ? [...hiddenNav].filter((x) => x !== id) : [...hiddenNav, id];
    const label = NAV_LABELS.find((n) => n.id === id)?.label || id;
    return run(
      `nav:${id}`,
      () => api.setFeatures({ navHidden: next }),
      `${label} ${hiddenNav.has(id) ? 'ko‘rsatildi' : 'yashirildi'}. O‘quvchi kabinetida menyu yangilandi.`
    );
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-extrabold text-ink dark:text-white">Sozlamalar</h2>
        <p className="text-[13px] text-ink-muted dark:text-stone-400">Platforma bo‘limlarini yoqish yoki o‘chirish. O‘zgarish darhol ko‘rinadi.</p>
      </header>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[15px] font-bold text-ink dark:text-white">Edu Coin tizimi</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                {coinOn
                  ? 'Yoqilgan. O‘quvchilar coin ishlaydi va do‘kondan xarid qiladi.'
                  : 'O‘chirilgan. Do‘kon menyudan yashirilgan, coin mukofotlari berilmaydi.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {busy === 'coin' ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" /> : null}
            <Switch on={coinOn} busy={busy === 'coin'} label="Edu Coin tizimi" onToggle={toggleCoin} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-[15px] font-bold text-ink dark:text-white">Funksiyalar</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Har birini istalgan payt yoqish yoki o‘chirish mumkin. O‘zgarish darhol amal qiladi.</p>
        <ul className="mt-4 divide-y divide-line/70 dark:divide-white/10">
          {FLAGS.map((f) => {
            const on = (db.features as Record<string, unknown> | undefined)?.[f.key] !== false;
            return (
              <li key={f.key} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink dark:text-white">{f.label}</div>
                  <div className="text-[11.5px] text-ink-muted dark:text-stone-500">{f.hint}</div>
                </div>
                <div className="flex items-center gap-3">
                  {busy === `flag:${f.key}` ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" /> : null}
                  <Switch on={on} busy={busy === `flag:${f.key}`} label={f.label} onToggle={() => toggleFlag(f.key, on, f.label)} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <EdubekSettingsCard />

      <Card>
        <h3 className="text-[15px] font-bold text-ink dark:text-white">Ochiq sayt bo‘limlari</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Yashirilgan bo‘lim ochiq saytda ko‘rinmaydi, unga tegishli menyu havolasi ham yo‘qoladi.</p>
        <ul className="mt-4 divide-y divide-line/70 dark:divide-white/10">
          {sections.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-ink dark:text-white">{SECTION_LABELS[s.key] || s.key}</div>
                <div className="truncate text-[11.5px] text-ink-muted dark:text-stone-500">{s.subtitle || s.title}</div>
              </div>
              <div className="flex items-center gap-3">
                {busy === `sec:${s.key}` ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" /> : null}
                <Switch on={s.isVisible} busy={busy === `sec:${s.key}`} label={`${SECTION_LABELS[s.key] || s.key} bo‘limi`} onToggle={() => toggleSection(s.key, s.isVisible)} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="text-[15px] font-bold text-ink dark:text-white">O‘quvchi kabineti menyusi</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">Yashirilgan bo‘lim o‘quvchi menyusidan olib tashlanadi. Shaxsiy profil doim ko‘rinadi.</p>
        <ul className="mt-4 divide-y divide-line/70 dark:divide-white/10">
          {NAV_LABELS.map((n) => {
            const shown = !hiddenNav.has(n.id);
            return (
              <li key={n.id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13.5px] font-semibold text-ink dark:text-white">{n.label}</span>
                <div className="flex items-center gap-3">
                  {busy === `nav:${n.id}` ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" /> : null}
                  <Switch on={shown} busy={busy === `nav:${n.id}`} label={`${n.label} menyusi`} onToggle={() => toggleNav(n.id)} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {message ? (
        <p role="status" className={`text-[13px] ${message.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
          {message.text}
        </p>
      ) : null}

      <OwnerNavEditor
        hidden={db.features?.ownerNavHidden || []}
        names={db.features?.ownerNavLabels || {}}
        busy={busy === 'owner-nav'}
        onSave={(hidden, names) => run('owner-nav', () => api.setFeatures({ ownerNavHidden: hidden, ownerNavLabels: names }), 'Owner paneli bo‘limlari saqlandi. Sahifani yangilang.')}
      />
    </section>
  );
};

/** Owner's Edubek settings: the greeting students see and whether the figure moves. */
const EDUBEK_DEFAULT_GREETING = 'Salom! Bugun nimani o‘rganamiz?';
const EdubekSettingsCard: React.FC = () => {
  const { db, refreshDb } = useApp();
  type EduSettings = { greeting?: string; animations?: boolean; voiceNotes?: boolean; files?: boolean; stickers?: boolean };
  const current = ((db.features as { edubekSettings?: EduSettings } | undefined)?.edubekSettings) || {};
  const [greeting, setGreeting] = useState(current.greeting || EDUBEK_DEFAULT_GREETING);
  const [animations, setAnimations] = useState(current.animations !== false);
  const [voiceNotes, setVoiceNotes] = useState(current.voiceNotes !== false);
  const [files, setFiles] = useState(current.files !== false);
  const [stickers, setStickers] = useState(current.stickers !== false);
  const [status, setStatus] = useState<string | null>(null);
  const save = async () => {
    const res = await api.setEdubekSettings({ greeting: greeting.trim() === EDUBEK_DEFAULT_GREETING ? '' : greeting, animations, voiceNotes, files, stickers });
    setStatus(res?.success ? 'Saqlandi' : res?.message || 'Saqlab bo‘lmadi');
    if (res?.success) await refreshDb();
  };
  const sw = (label: string, on: boolean, set: (v: boolean) => void) => (
    <label className="flex items-center justify-between gap-4 text-[13.5px] text-ink dark:text-white">
      <span>{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-5 w-5 accent-[#f2650f]" />
    </label>
  );
  return (
    <Card>
      <h3 className="text-[15px] font-bold text-ink dark:text-white">Edubek sozlamalari</h3>
      <p className="mt-1 text-[12.5px] text-ink-muted dark:text-stone-400">O‘quvchi Edubekni ochganda ko‘radigan salom va chatdagi imkoniyatlar. Bo‘sh qoldirilsa standart matn ishlatiladi.</p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted dark:text-stone-400" htmlFor="edu-greet">Salom matni</label>
          <input id="edu-greet" maxLength={160} value={greeting} onChange={(e) => setGreeting(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-white/70 px-3 text-[13.5px] text-ink outline-none focus:border-[#f2650f] dark:border-white/10 dark:bg-white/[0.05] dark:text-white" />
        </div>
        {sw('Yordamchi harakatlansin (gapirganda bosh irg‘iydi, tanlansa qarab turadi)', animations, setAnimations)}
        {sw('Ovozli xabar yuborish', voiceNotes, setVoiceNotes)}
        {sw('Fayl biriktirish (rasm, .txt, .docx)', files, setFiles)}
        {sw('Stikerlar', stickers, setStickers)}
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} className="h-10 rounded-full bg-ink px-5 text-[13px] font-semibold text-white dark:bg-white dark:text-ink">Saqlash</button>
          {status ? <span role="status" className="text-[12.5px] font-semibold text-ink-muted dark:text-stone-300">{status}</span> : null}
        </div>
      </div>
    </Card>
  );
};

/** Owner panel sections: show or hide each one, and give it another name. Locked sections always stay visible. */
const OwnerNavEditor: React.FC<{
  hidden: string[];
  names: Record<string, string>;
  busy: boolean;
  onSave: (hidden: string[], names: Record<string, string>) => void;
}> = ({ hidden, names, busy, onSave }) => {
  const [draftHidden, setDraftHidden] = useState<string[]>(hidden);
  const [draftNames, setDraftNames] = useState<Record<string, string>>(names);
  const changed = JSON.stringify([...draftHidden].sort()) !== JSON.stringify([...hidden].sort()) || JSON.stringify(draftNames) !== JSON.stringify(names);

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-extrabold text-ink dark:text-white">Owner paneli bo‘limlari</h3>
          <p className="text-[12.5px] text-ink-muted dark:text-stone-400">
            Bo‘limni yashiring yoki nomini o‘zgartiring. “Boshqaruv paneli”, “Sozlamalar” va “Login &amp; parol” doim ko‘rinadi.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {OWNER_NAV_ITEMS.map((item) => {
            const locked = OWNER_NAV_LOCKED.includes(item.id);
            const shown = locked || !draftHidden.includes(item.id);
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                <button
                  type="button"
                  disabled={locked || busy}
                  onClick={() => setDraftHidden((h) => (h.includes(item.id) ? h.filter((x) => x !== item.id) : [...h, item.id]))}
                  aria-pressed={shown}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${shown ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-stone-200 text-stone-600 dark:bg-white/10 dark:text-stone-300'} ${locked ? 'opacity-60' : ''}`}
                >
                  {shown ? 'Ko‘rinadi' : 'Yashirin'}
                </button>
                <input
                  value={draftNames[item.id] ?? ''}
                  placeholder={item.label}
                  maxLength={40}
                  disabled={busy}
                  onChange={(e) => setDraftNames((n) => ({ ...n, [item.id]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-transparent px-2 py-1 text-[13px] text-ink dark:border-white/10 dark:text-white"
                  aria-label={`${item.label} nomi`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!changed || busy}
            onClick={() => onSave(draftHidden, Object.fromEntries(Object.entries(draftNames).filter(([, v]) => v.trim())))}
            className="rounded-xl bg-ember-500 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => { setDraftHidden([]); setDraftNames({}); }}
            className="rounded-xl border border-stone-200 px-4 py-2 text-[13px] font-semibold text-ink dark:border-white/10 dark:text-white"
          >
            Standart holatga qaytarish
          </button>
        </div>
      </div>
    </Card>
  );
};
