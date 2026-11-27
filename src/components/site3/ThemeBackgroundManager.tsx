import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Palette, CheckCircle2, Sparkles, Eye, ExternalLink, Check, Layers } from 'lucide-react';
import { BackgroundThemeId } from '../../types';
import { Glass, Button, Pill } from '../ui';
import { Reveal } from '../ui/motion-primitives';
import { cn } from '../ui/styles';

export const ThemeBackgroundManager: React.FC = () => {
  const { db, updateSiteTheme, setActiveSite } = useApp();
  const currentBg = db.siteTheme?.activeBackground || 'midnight_aurora';

  const [saving, setSaving] = useState(false);
  const [savedThemeName, setSavedThemeName] = useState<string | null>(null);

  const themeOptions: {
    id: BackgroundThemeId;
    title: string;
    description: string;
    badge: string;
    previewGradient: string;
    particleStyle: string;
    accentColor: string;
    isPrimary?: boolean;
  }[] = [
    {
      id: 'midnight_aurora',
      title: '1. Midnight Aurora (Asosiy Brend Foni)',
      description: 'Chuqur yarim tun (#060913), neon sian (#FF8A2B) va elektr binafsharang (#C9540A) mesh gradient. Butun ekran bo‘ylab suzib yuruvchi C1/C2 akademik ingliz tili lug‘atlari.',
      badge: '★ Asosiy Rasmiy Brend',
      previewGradient: 'from-[#060913] via-[#12072B] to-[#041E26] text-white',
      particleStyle: 'C1/C2 Academic Lexis (Epistemic, Ubiquitous, Paradigm, Synthesize)',
      accentColor: '#FF8A2B',
      isPrimary: true
    },
    {
      id: 'ivory_editorial',
      title: '2. Ivory Editorial (Oqilona Qog‘oz Uslubi)',
      description: 'Klassik nufuzli nashriyot uslubi: iliq fil suyagi (ivory), chuqur ko‘mir matn va oltin urg‘ular. Ko‘zga nihoyatda qulay o‘qish muhiti.',
      badge: 'Akademik Matbuot',
      previewGradient: 'from-[#FBF9F5] via-[#F3EFE6] to-[#EAE3D2] text-stone-900 border border-stone-300',
      particleStyle: 'Oxford Academic Terms & Cambridge Lexical Quotes',
      accentColor: '#B45309'
    },
    {
      id: 'ocean_glass',
      title: '3. Ocean Glass (Muzlagan Moviy Shisha)',
      description: 'Okean chuqurligi, akvamarin va muzdek shaffof frosted glass effektlari. Xotirjamlik va yuqori konsentratsiya beruvchi dizayn.',
      badge: 'Okean Shaffofligi',
      previewGradient: 'from-[#031525] via-[#0A2E46] to-[#004B6E] text-white',
      particleStyle: 'Aquamarine Glowing Collocations',
      accentColor: '#38BDF8'
    },
    {
      id: 'emerald_academy',
      title: '4. Emerald Academy (Oxbridge Zumrad & Oltin)',
      description: 'Buyuk Britaniya universitetlari an’anaviy zumrad yashili, boy o‘rmon ohanglari va qirollik oltin aksentlari.',
      badge: 'Zumrad Nufuz',
      previewGradient: 'from-[#021F17] via-[#063B2C] to-[#0D5C46] text-white',
      particleStyle: 'Emerald Idioms & Academic Transitions',
      accentColor: '#34D399'
    },
    {
      id: 'royal_violet',
      title: '5. Royal Violet (Qirollik Binafsha & Neon)',
      description: 'Luks qirollik binafsharang va neon nilufar gradienti. Zamonaviy kiber-edtech va ilhomlantiruvchi energiya uyg‘unligi.',
      badge: 'Qirollik Nilufar',
      previewGradient: 'from-[#190426] via-[#2D0B45] to-[#4C126F] text-white',
      particleStyle: 'Purple Band 9 Phrases & High-Level Connectors',
      accentColor: '#C084FC'
    },
    {
      id: 'sunset_coral',
      title: '6. Sunset Coral (Quyosh Botishi & Marjon)',
      description: 'Iliq marjon, shafaq apelsin va qahrabo ranglari. Talabalarni faollikka undovchi va kayfiyatni ko‘taruvchi iliq muhit.',
      badge: 'Iliq Shafaq',
      previewGradient: 'from-[#1F070A] via-[#380E14] to-[#631822] text-white',
      particleStyle: 'Amber Speaking Fluency Sparks',
      accentColor: '#FB7185'
    }
  ];

  const currentThemeObj = themeOptions.find(t => t.id === currentBg) || themeOptions[0];

  const handleApplyTheme = async (themeId: BackgroundThemeId, title: string) => {
    setSaving(true);
    setSavedThemeName(title);
    try {
      await updateSiteTheme({
        activeBackground: themeId,
        allowUserThemeOverride: true
      });
      setTimeout(() => setSavedThemeName(null), 3000);
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
              <Palette className="h-3 w-3" />
              Edu Level Dizayn Studiyasi · 6 Ta Rasmiy Brend Fon
            </Pill>
            <h1 className="mt-4 font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.07] tracking-[-0.035em] text-ink text-balance dark:text-white">
              Global Fon va Brend Tematikalari
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted dark:text-stone-400">
              Platforma egasi (Owner) sifatida butun platforma uchun 6 ta mualliflik dizaynidan birini tanlang. Har
              bir fonda C1/C2 darajadagi akademik so‘zlar suzib yuradi.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setActiveSite('site1_open')}
            className="shrink-0 self-start sm:self-end"
            iconLeft={<Eye className="h-4 w-4" />}
            iconRight={<ExternalLink className="h-3.5 w-3.5 opacity-60" />}
          >
            Saytda Jonli Ko‘rish
          </Button>
        </header>
      </Reveal>

      {/* Active theme bar */}
      <Reveal delay={70}>
        <Glass level={2} radius="rounded-[1.5rem]" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-500/10 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-ember-700 dark:text-ember-400">
                Hozirgi Faol Brend Fon
              </div>
              <div className="mt-0.5 font-display text-[13.5px] font-extrabold tracking-[-0.01em] text-ink dark:text-white">
                {currentThemeObj.title}
              </div>
            </div>
          </div>

          {savedThemeName && (
            <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-1.5 text-[11.5px] font-bold text-emerald-700 sm:self-auto dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>"{savedThemeName}" butun platformaga o‘rnatildi!</span>
            </div>
          )}
        </Glass>
      </Reveal>

      {/* Theme cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {themeOptions.map((theme, index) => {
          const isActive = currentBg === theme.id;

          return (
            <Reveal key={theme.id} delay={Math.min(index * 45, 220)}>
              <Glass
                level={isActive ? 2 : 1}
                radius="rounded-[1.5rem]"
                className={cn(
                  'flex h-full flex-col overflow-hidden transition-all duration-300',
                  isActive
                    ? 'ring-2 ring-ember-500/40'
                    : 'hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-26px_rgba(18,16,14,0.28)]'
                )}
              >
                {/* Preview */}
                <div className={cn('relative h-36 overflow-hidden bg-gradient-to-br p-4', theme.previewGradient)}>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.16),transparent_60%)]" />
                  <div className="relative flex items-start justify-between gap-2">
                    <span className="rounded-full bg-black/35 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-md">
                      {theme.badge}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-ink shadow-sm">
                        ✓ Faol Fon
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-x-4 bottom-4">
                    <span className="inline-block max-w-full truncate rounded-lg bg-white/10 px-2 py-1 font-mono text-[9.5px] text-white/85 backdrop-blur-sm">
                      {theme.particleStyle}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h2 className="font-display text-[13.5px] font-extrabold leading-snug tracking-[-0.02em] text-ink dark:text-white">
                      {theme.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-ink-muted dark:text-stone-400">
                      {theme.description}
                    </p>
                  </div>

                  <div className="mt-4">
                    {isActive ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-full border border-line/70 bg-ink/[0.03] py-2.5 text-[11px] font-bold text-ink-muted dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-stone-400">
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        Joriy Faol Fon
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleApplyTheme(theme.id, theme.title)}
                        disabled={saving}
                      >
                        Ushbu Fonni Tanlash
                      </Button>
                    )}
                  </div>
                </div>
              </Glass>
            </Reveal>
          );
        })}
      </section>

      {/* Footnote */}
      <Reveal delay={200}>
        <div className="flex items-center justify-center gap-2 text-[11px] text-ink-muted dark:text-stone-500">
          <Layers className="h-3.5 w-3.5" />
          Tanlangan fon barcha ochiq sahifalar va o‘quvchi kabinetida qo‘llaniladi
        </div>
      </Reveal>
    </div>
  );
};
