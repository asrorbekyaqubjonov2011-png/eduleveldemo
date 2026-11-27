/** A student's own Edubek settings, kept in this browser only. */
export type VoiceEngine = 'auto' | 'gemini' | 'browser';
export interface EdubekSettings {
  voice: VoiceEngine;
  animations: boolean;
  autoSpeak: boolean;
}
const KEY = 'edubek_settings_v2';
// Zero cost: the device voice is the default (instant, free, works offline). The Gemini server voice is opt-in on the server too.
const DEFAULTS: EdubekSettings = { voice: 'browser', animations: true, autoSpeak: true };

export function getEdubekSettings(): EdubekSettings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw);
    return {
      voice: ['auto', 'gemini', 'browser'].includes(v?.voice) ? v.voice : DEFAULTS.voice,
      animations: typeof v?.animations === 'boolean' ? v.animations : DEFAULTS.animations,
      autoSpeak: typeof v?.autoSpeak === 'boolean' ? v.autoSpeak : DEFAULTS.autoSpeak
    };
  } catch {
    return DEFAULTS;
  }
}

export function setEdubekSettings(next: EdubekSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the settings apply for this visit only */
  }
}
