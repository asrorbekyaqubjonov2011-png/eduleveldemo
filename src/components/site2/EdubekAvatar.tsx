'use client';
import React, { useRef, useState } from 'react';

export type EdubekMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleepy';

/**
 * EduBek, drawn in code (vector, transparent background), following the approved character sheet:
 * white glossy shell, black visor with cyan glowing eyes, purple ear pods and antenna, a glowing neck ring,
 * the graduation-cap logo and "EduBek" on the chest, and two arms with hands.
 *
 * Movement is only where it is needed:
 * - the head is still by default;
 * - it turns toward the pointer while the pointer is over the avatar, and turns forward when it is released;
 * - it looks forward while listening, and nods gently while speaking;
 * - the eyes blink now and then; the arms move only for the happy and speaking states.
 * Parts are separate groups (head, left arm, right arm, body) so each can be animated on its own.
 */
const LABEL: Record<EdubekMood, string> = {
  idle: 'Edubek: tabassum',
  listening: 'Edubek: tinglayapti',
  speaking: 'Edubek: gapiryapti',
  thinking: 'Edubek: o‘ylayapti',
  happy: 'Edubek: xursand',
  sad: 'Edubek: xafa',
  angry: 'Edubek: g‘azablangan',
  surprised: 'Edubek: hayron',
  sleepy: 'Edubek: xotirjam'
};

const CYAN = '#4fe3ff';
const PURPLE = '#7b4dff';

/** The face for each mood, drawn inside the visor (x 44–156, y 40–112). */
function Face({ mood }: { mood: EdubekMood }) {
  const eye = { fill: CYAN, filter: 'url(#edubek-glow)' };
  switch (mood) {
    case 'happy':
      return (
        <g>
          <path d="M66 76 Q78 60 90 76" stroke={CYAN} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#edubek-glow)" />
          <path d="M110 76 Q122 60 134 76" stroke={CYAN} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#edubek-glow)" />
          <path d="M84 94 Q100 118 116 94 Z" fill="#ff7fb0" />
        </g>
      );
    case 'sad':
      return (
        <g>
          <ellipse cx="78" cy="76" rx="8" ry="10" {...eye} />
          <ellipse cx="122" cy="76" rx="8" ry="10" {...eye} />
          <path d="M66 68 L88 60" stroke="#0a0920" strokeWidth="4" strokeLinecap="round" />
          <path d="M134 68 L112 60" stroke="#0a0920" strokeWidth="4" strokeLinecap="round" />
          <path d="M88 106 Q100 96 112 106" stroke={CYAN} strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#edubek-glow)" />
        </g>
      );
    case 'angry':
      return (
        <g>
          <path d="M68 70 L88 76 L88 84 L68 80 Z" {...eye} />
          <path d="M132 70 L112 76 L112 84 L132 80 Z" {...eye} />
          <path d="M62 58 L88 66" stroke="#ff4d5a" strokeWidth="5" strokeLinecap="round" />
          <path d="M138 58 L112 66" stroke="#ff4d5a" strokeWidth="5" strokeLinecap="round" />
          <path d="M88 104 Q100 98 112 104" stroke={CYAN} strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#edubek-glow)" />
        </g>
      );
    case 'surprised':
      return (
        <g>
          <circle cx="78" cy="72" r="10" {...eye} />
          <circle cx="122" cy="72" r="10" {...eye} />
          <ellipse cx="100" cy="102" rx="6" ry="8" fill="#ff9ccb" />
        </g>
      );
    case 'sleepy':
      return (
        <g>
          <path d="M66 76 Q78 84 90 76" stroke={CYAN} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#edubek-glow)" />
          <path d="M110 76 Q122 84 134 76" stroke={CYAN} strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#edubek-glow)" />
          <path d="M94 98 Q100 102 106 98" stroke={CYAN} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'thinking':
      return (
        <g>
          <ellipse cx="78" cy="70" rx="8" ry="13" {...eye} />
          <ellipse cx="122" cy="70" rx="8" ry="13" {...eye} />
          <path d="M92 102 Q100 104 108 102" stroke={CYAN} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      // idle, listening, speaking: open eyes and a smile (speaking moves the mouth)
      return (
        <g>
          <ellipse cx="78" cy="72" rx="9" ry="14" {...eye} className="edubek-eye" />
          <ellipse cx="122" cy="72" rx="9" ry="14" {...eye} className="edubek-eye" />
          <path
            d="M88 96 Q100 108 112 96"
            stroke={CYAN}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            filter="url(#edubek-glow)"
            className={mood === 'speaking' ? 'edubek-mouth' : undefined}
          />
        </g>
      );
  }
}

/** Small marks next to the head for some moods. */
function Mark({ mood }: { mood: EdubekMood }) {
  switch (mood) {
    case 'sad':
      return (
        <g>
          <ellipse cx="170" cy="18" rx="14" ry="7" fill="#9fb8d8" />
          <ellipse cx="160" cy="21" rx="9" ry="6" fill="#9fb8d8" />
          <ellipse cx="180" cy="21" rx="9" ry="6" fill="#9fb8d8" />
          <path d="M160 30 q2 5 0 7 q-2 -2 0 -7 z" fill="#5aa9ff" />
          <path d="M176 30 q2 5 0 7 q-2 -2 0 -7 z" fill="#5aa9ff" />
        </g>
      );
    case 'angry':
      return <path d="M20 22 l7 -5 M22 32 l8 -1 M18 13 l6 -6" stroke="#ff4d5a" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case 'surprised':
      return (
        <g fill="#7b4dff">
          <rect x="176" y="8" width="6" height="22" rx="3" />
          <circle cx="179" cy="38" r="3.5" />
        </g>
      );
    case 'happy':
      return (
        <g fill="#ffc53d">
          <path d="M20 22 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z" />
          <path d="M176 14 l1.5 -4.5 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 z" />
        </g>
      );
    case 'sleepy':
      return <text x="168" y="30" fontSize="16" fontWeight="800" fill={PURPLE}>z</text>;
    case 'thinking':
      return <text x="168" y="24" fontSize="20" fontWeight="800" fill={CYAN}>?</text>;
    default:
      return null;
  }
}

export const EdubekAvatar: React.FC<{ mood?: EdubekMood; size?: number; typing?: boolean; animated?: boolean }> = ({
  mood = 'idle',
  size = 64,
  typing = false,
  animated = true
}) => {
  const state: EdubekMood = typing && mood === 'idle' ? 'listening' : mood;
  const [look, setLook] = useState(0); // -1 (left) .. 1 (right), set by the mouse or finger over the avatar
  const [aimed, setAimed] = useState(false); // true while a mouse or finger points at the avatar
  const box = useRef<HTMLDivElement | null>(null);
  const turning = animated && state !== 'listening';
  const headYaw = turning ? look : 0;
  // Without a pointer on him, Edubek looks slowly left and right by himself (CSS, transform only).
  const idleLook = turning && !aimed && look === 0;
  const armLeft = animated && state === 'happy' ? 'edubek-arm-wave' : animated && state === 'speaking' ? 'edubek-arm-talk' : '';
  const armRight = animated && state === 'speaking' ? 'edubek-arm-talk' : '';
  const headNod = animated && state === 'speaking' ? 'edubek-head-nod' : '';
  const height = Math.round((size * 260) / 200);

  return (
    <div
      ref={box}
      role="img"
      aria-label={LABEL[state] || LABEL.idle}
      className="relative shrink-0 select-none"
      style={{ width: size, height }}
      onPointerDown={(e) => {
        if (!animated) return;
        setAimed(true);
        if (box.current) {
          const r = box.current.getBoundingClientRect();
          setLook(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))));
        }
      }}
      onPointerMove={(e) => {
        if (!animated || !box.current) return;
        const r = box.current.getBoundingClientRect();
        const v = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        setLook(Math.max(-1, Math.min(1, v)));
      }}
      onPointerUp={() => setAimed(false)}
      onPointerLeave={() => {
        setAimed(false);
        setLook(0);
      }}
    >
      <svg width={size} height={height} viewBox="0 0 200 260" className="overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="edubek-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dcd7f2" />
          </linearGradient>
          <linearGradient id="edubek-visor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e2766" />
            <stop offset="1" stopColor="#06051a" />
          </linearGradient>
          <linearGradient id="edubek-pod" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9a7bff" />
            <stop offset="1" stopColor="#5a33d6" />
          </linearGradient>
          <filter id="edubek-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="edubek-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2a2360" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Body: torso, neck ring, chest logo */}
        <g className={animated ? 'edubek-body' : undefined} style={{ transformBox: 'view-box', transformOrigin: '100px 240px' }}>
          <ellipse cx="100" cy="252" rx="48" ry="5" fill="#2a2360" opacity="0.14" />
          <rect x="50" y="138" width="100" height="108" rx="40" fill="url(#edubek-shell)" filter="url(#edubek-soft)" />
          <path d="M52 178 Q50 214 60 240" stroke={PURPLE} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M148 178 Q150 214 140 240" stroke={PURPLE} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
          <g transform="translate(100 186)">
            <path d="M0 -10 L16 -3 L0 4 L-16 -3 Z" fill={PURPLE} />
            <path d="M-9 1 L-9 8 Q0 13 9 8 L9 1 L0 5 Z" fill={PURPLE} />
            <path d="M16 -3 L16 6" stroke={PURPLE} strokeWidth="1.6" />
          </g>
          <text x="100" y="228" textAnchor="middle" fontSize="18" fontWeight="800" fill="#17153d" fontFamily="system-ui, sans-serif">
            Edu<tspan fill={PURPLE}>Bek</tspan>
          </text>
        </g>
        <rect x="80" y="122" width="40" height="14" rx="7" fill="#1e1b3a" />
        <rect x="84" y="128" width="32" height="3" rx="1.5" fill={CYAN} filter="url(#edubek-glow)" />

        {/* Arms: each arm is its own group, pivoting at the shoulder */}
        <g className={armLeft || undefined} style={{ transformBox: 'view-box', transformOrigin: '52px 156px' }}>
          <rect x="30" y="150" width="26" height="62" rx="13" fill="url(#edubek-shell)" filter="url(#edubek-soft)" />
          <rect x="30" y="156" width="26" height="8" rx="4" fill={PURPLE} />
          <circle cx="43" cy="218" r="11" fill="#ffffff" filter="url(#edubek-soft)" />
        </g>
        <g className={armRight || undefined} style={{ transformBox: 'view-box', transformOrigin: '148px 156px' }}>
          <rect x="144" y="150" width="26" height="62" rx="13" fill="url(#edubek-shell)" filter="url(#edubek-soft)" />
          <rect x="144" y="156" width="26" height="8" rx="4" fill={PURPLE} />
          <circle cx="157" cy="218" r="11" fill="#ffffff" filter="url(#edubek-soft)" />
        </g>

        {/* Head: antenna, shell, ear pods, visor and face. It turns around the neck. */}
        <g
          className={idleLook ? 'edubek-look' : undefined}
          style={{
            transformBox: 'view-box',
            transformOrigin: '100px 124px',
            transform: `translateX(${headYaw * 6}px) rotate(${headYaw * 12 + (state === 'thinking' ? -6 : 0)}deg)`,
            transition: 'transform 0.45s cubic-bezier(.2,.8,.2,1)'
          }}
        >
        <g className={headNod || undefined} style={{ transformBox: 'view-box', transformOrigin: '100px 124px' }}>
          <line x1="100" y1="22" x2="100" y2="34" stroke={PURPLE} strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="16" r="8" fill="url(#edubek-pod)" filter="url(#edubek-glow)" />
          <rect x="30" y="24" width="140" height="102" rx="50" fill="url(#edubek-shell)" filter="url(#edubek-soft)" />
          <path d="M40 40 Q100 22 160 40" stroke="#ffffff" strokeWidth="5" fill="none" opacity="0.6" strokeLinecap="round" />
          <circle cx="26" cy="76" r="16" fill="url(#edubek-pod)" />
          <circle cx="26" cy="76" r="9" fill="none" stroke={CYAN} strokeWidth="2" opacity="0.8" />
          <circle cx="174" cy="76" r="16" fill="url(#edubek-pod)" />
          <circle cx="174" cy="76" r="9" fill="none" stroke={CYAN} strokeWidth="2" opacity="0.8" />
          <rect x="44" y="40" width="112" height="72" rx="36" fill="url(#edubek-visor)" />
          <ellipse cx="100" cy="50" rx="46" ry="6" fill="#ffffff" opacity="0.12" />
          <Face mood={state} />
          <Mark mood={state} />
        </g>
        </g>
      </svg>
    </div>
  );
};
