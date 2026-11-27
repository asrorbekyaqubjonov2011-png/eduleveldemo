import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, Save, CheckCircle, User, Phone, Send, Image as ImageIcon, Upload, BadgeCheck } from 'lucide-react';
import { Glass, Button, Pill } from '../ui';
import { Reveal, Counter } from '../ui/motion-primitives';
import { field, label, cn } from '../ui/styles';

export const TeacherProfileManager: React.FC = () => {
  const { db, updateTeacherProfile } = useApp();
  const current = db.teacherProfile;

  const [name, setName] = useState(current.name || 'Muxtorov Jasurbek');
  const [title, setTitle] = useState(current.title || 'IELTS 8.5 & CEFR C1 Xalqaro Eksperti & Edu Level Asoschisi');
  const [photoUrl, setPhotoUrl] = useState(current.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80');
  const [bio, setBio] = useState(current.bio || '');
  const [phone, setPhone] = useState(current.phone || '+998 (90) 876-54-32');
  const [telegram, setTelegram] = useState(current.telegram || 'https://t.me/edulevel');
  const [experienceYears, setExperienceYears] = useState(current.experienceYears || 7);
  const [studentsCount, setStudentsCount] = useState(current.studentsCount || 0);
  const [nationalCertCount, setNationalCertCount] = useState(current.nationalCertCount || 480);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // High-definition preset educator portraits for quick selection
  const photoPresets = [
    {
      label: 'Klassik Kostyumda (Asosiy)',
      url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80'
    },
    {
      label: 'Nafis Ilmiy Pedagog',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    },
    {
      label: 'Zamonaviy Matematik Ustoz',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
    },
    {
      label: 'Auditoriyada Dars Beruvchi',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await updateTeacherProfile({
        name,
        title,
        photoUrl,
        bio,
        phone,
        telegram,
        experienceYears: Number(experienceYears),
        studentsCount: Number(studentsCount),
        nationalCertCount: Number(nationalCertCount)
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <Reveal>
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Pill tone="ember">
              <Camera className="h-3 w-3" />
              Ustoz Rasmi &amp; Profil Sozlamasi
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Ustozning Rasmi va Ma’lumotlarini O‘zgartirish
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Bu yerdagi o‘zgarishlar darhol butun saytda (kirish sahifasi, ochiq platforma, LMS va sertifikatlar)
              yangilanadi.
            </p>
          </div>

          <Button
            variant="ember"
            size="md"
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 self-start sm:self-end"
            iconLeft={savedSuccess ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {savedSuccess ? 'Muvaffaqiyatli Saqlandi!' : saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}
          </Button>
        </header>
      </Reveal>

      {/* Stat strip */}
      <Reveal delay={60}>
        <Glass level={1} radius="rounded-[1.5rem]" className="grid grid-cols-3 divide-x divide-line/70 dark:divide-white/[0.06]">
          <div className="px-5 py-4">
            <div className="font-display text-[clamp(1.25rem,2.2vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={experienceYears} />
              <span className="ml-1 text-[11px] font-semibold text-ink-muted dark:text-stone-400">yil</span>
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Tajriba
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="font-display text-[clamp(1.25rem,2.2vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={studentsCount} />
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              O‘quvchilar
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="font-display text-[clamp(1.25rem,2.2vw,1.6rem)] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums dark:text-white">
              <Counter value={nationalCertCount} />
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted dark:text-stone-400">
              Milliy Sertifikat A+
            </div>
          </div>
        </Glass>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Photo */}
        <Reveal delay={100} className="lg:col-span-5">
          <Glass level={2} className="h-full p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-ember-600" />
              <h2 className="font-display text-[14px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                Fotosurat (Jonli Ko‘rinish)
              </h2>
            </div>

            <div className="group relative aspect-3/4 w-full overflow-hidden rounded-[1.25rem] border border-line/70 bg-white/40 dark:border-white/10 dark:bg-white/[0.03]">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-ink-muted dark:text-stone-500">
                  <User className="mb-2 h-14 w-14 opacity-50" />
                  <span className="text-[12px]">Rasm kiritilmagan</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
                <BadgeCheck className="h-3 w-3" />
                Rasmiy Ustoz
              </div>
            </div>

            <div className="mt-4">
              <label className={label}>Fotosurat URL havolasi</label>
              <input
                type="text"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className={cn(field, 'font-mono text-[11.5px]')}
              />
            </div>

            <div className="mt-4">
              <label className={cn(label, 'flex items-center gap-1.5')}>
                <Upload className="h-3 w-3" />
                Yoki kompyuterdan rasm yuklash
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full cursor-pointer text-[11.5px] text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-ember-500/10 file:px-3.5 file:py-2 file:text-[11px] file:font-bold file:text-ember-700 hover:file:bg-ember-500/15 dark:text-stone-400 dark:file:text-ember-300"
              />
            </div>

            <div className="mt-5">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted dark:text-stone-400">
                Tayyor professional suratlar
              </span>
              <div className="grid grid-cols-2 gap-2">
                {photoPresets.map((preset, idx) => {
                  const selected = photoUrl === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(preset.url)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-2 text-left transition-all',
                        selected
                          ? 'border-ember-500/60 bg-ember-500/[0.07]'
                          : 'border-line/70 hover:border-ember-500/35 dark:border-white/[0.08]'
                      )}
                    >
                      <img src={preset.url} alt={preset.label} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                      <span className="truncate text-[10.5px] font-semibold text-ink-soft dark:text-stone-300">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Glass>
        </Reveal>

        {/* Details */}
        <Reveal delay={140} className="lg:col-span-7">
          <Glass level={2} className="h-full p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <User className="h-4 w-4 text-ember-600" />
              <h2 className="font-display text-[14px] font-extrabold tracking-[-0.02em] text-ink dark:text-white">
                Asosiy Ma’lumotlar
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Ustozning Ism-Familiyasi</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={cn(field, 'font-bold')}
                  />
                </div>

                <div>
                  <label className={label}>Kasbiy Maqomi / Unvoni</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={field} />
                </div>
              </div>

              <div>
                <label className={label}>Biografiya &amp; Tavsif</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className={cn(field, 'resize-y leading-relaxed')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={label}>Tajriba (Yil)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={e => setExperienceYears(Number(e.target.value))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>

                <div>
                  <label className={label}>O‘quvchilar Soni</label>
                  <input
                    type="number"
                    value={studentsCount}
                    onChange={e => setStudentsCount(Number(e.target.value))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>

                <div>
                  <label className={label}>Milliy Sertifikat A+</label>
                  <input
                    type="number"
                    value={nationalCertCount}
                    onChange={e => setNationalCertCount(Number(e.target.value))}
                    className={cn(field, 'font-mono font-bold')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-line/70 pt-4 sm:grid-cols-2 dark:border-white/[0.06]">
                <div>
                  <label className={cn(label, 'flex items-center gap-1.5')}>
                    <Phone className="h-3 w-3" />
                    Telefon Raqami
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={cn(field, 'font-mono')}
                  />
                </div>

                <div>
                  <label className={cn(label, 'flex items-center gap-1.5')}>
                    <Send className="h-3 w-3" />
                    Telegram Manzili
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    className={cn(field, 'font-mono text-[12px]')}
                  />
                </div>
              </div>
            </div>
          </Glass>
        </Reveal>
      </div>
    </div>
  );
};
