import { useState, useEffect } from 'react';
import './ByteMascot.css';

/**
 * Byte - Reactive Runtime Companion
 * Note: Positioning (x, y) is handled by the parent container.
 */
export default function ByteMascot({
  state = 'idle',
  message = 'Ready to compile and explore!',
  size = 64,
  targetIndex = null,
  pointers = [],
}) {
  const [showBubble, setShowBubble] = useState(true);

  // Auto-hide bubble after a few seconds, but always show it when message changes
  useEffect(() => {
    if (!message) return;
    setShowBubble(true);
    
    // Don't auto-hide sleep or parachute messages
    if (state === 'idle' || state === 'sleeping' || state === 'parachuting') return;
    
    const timer = setTimeout(() => setShowBubble(false), 4000);
    return () => clearTimeout(timer);
  }, [message, state]);

  const isSleeping = state === 'sleeping';
  const isParachuting = state === 'parachuting';
  const isThinking = state === 'thinking' || state === 'comparing';
  const isSuccess = state === 'success' || state === 'branch_true';
  const isLooping = state === 'looping';
  const isVisitor = state === 'visitor';
  const isError = state === 'error';

  // Calculate eye movement based on the array index (simple left/right shift)
  const eyeOffset = targetIndex !== null ? Math.max(-3, Math.min(3, (targetIndex % 5) - 2)) : 0;

  return (
    <div
      className={`anime-byte-wrapper byte-mode-${state}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Parachute Canopy Drop */}
      {isParachuting && (
        <div className="anime-parachute-canopy">
          <svg viewBox="0 0 100 50" className="parachute-svg">
            <path d="M5 45 Q50 -5 95 45 Z" fill="#2DD4BF" stroke="#0F766E" strokeWidth="2.5" />
            <path d="M30 43 L50 15 L70 43" fill="none" stroke="#0F766E" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="5" y1="45" x2="40" y2="28" stroke="#0F766E" strokeWidth="1.5" />
            <line x1="95" y1="45" x2="60" y2="28" stroke="#0F766E" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Interactive Speech Bubble */}
      {showBubble && message && (
        <div className="anime-speech-bubble" onClick={() => setShowBubble(false)}>
          <span className="speech-text">{message}</span>
          <div className="speech-tail" />
        </div>
      )}

      {/* Pointer Chips (shows which variables Byte is following) */}
      {pointers.length > 0 && (
        <div className="byte-pointer-layer" style={{ bottom: `-${size * 0.35}px` }}>
          {pointers.map((p) => (
            <div key={p.name} className="byte-pointer-chip" style={{ color: p.color || '#5EEAD4' }}>
              <span className="pointer-label">{p.name}</span>
              <span className="pointer-index">→ {p.index}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cyber Chibi Robot Artwork */}
      <button
        type="button"
        className="anime-byte-trigger pointer-events-auto"
        onClick={() => setShowBubble(prev => !prev)}
        title="Click to toggle Byte's message"
      >
        <svg viewBox="0 0 100 100" className="anime-byte-svg" role="img" aria-label="Byte Chibi Companion">
          <defs>
            <linearGradient id="cyber-shell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5EEAD4" />
              <stop offset="50%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0F766E" />
            </linearGradient>

            <linearGradient id="cyber-visor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>

            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Floating Energy Ring Base */}
          <ellipse cx="50" cy="90" rx="22" ry="5" fill="#2DD4BF" opacity="0.3" className="energy-ring" />

          {/* Floating Jet/Hoodie Unit */}
          <path d="M32 55 Q20 70 28 82 L72 82 Q80 70 68 55 Z" fill="#334155" stroke="#0F766E" strokeWidth="2" />

          {/* Chibi Head / Shell */}
          <rect x="22" y="20" width="56" height="48" rx="22" fill="url(#cyber-shell)" stroke="#095D56" strokeWidth="2.5" filter="url(#neon-glow)" />
          
          {/* Cute Cyber Ears */}
          <path d="M18 36 L24 32 L24 48 L18 44 Z" fill="#2DD4BF" stroke="#0F766E" strokeWidth="1.5" />
          <path d="M82 36 L76 32 L76 48 L82 44 Z" fill="#2DD4BF" stroke="#0F766E" strokeWidth="1.5" />

          {/* Antenna with Pulsing Core */}
          <path d="M50 20 L50 8" fill="none" stroke="#0F766E" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="6" r="4" fill={isSleeping ? '#94A3B8' : isError ? '#F87171' : '#FDE047'} stroke="#0F766E" strokeWidth="1.5" className="antenna-orb" />

          {/* Dark Sci-Fi Visor Screen */}
          <rect x="28" y="30" width="44" height="28" rx="12" fill="url(#cyber-visor)" stroke="#2DD4BF" strokeWidth="1.5" />

          {/* Anime Eyes / Expressions */}
          {isSleeping ? (
            <>
              <path d="M37 44 Q41 39 45 44" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M55 44 Q59 39 63 44" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : isThinking ? (
            <>
              <path d="M36 42 L43 46 L36 50" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M64 42 L57 46 L64 50" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : isSuccess ? (
            <>
              <path d="M37 41 Q41 47 45 41" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M55 41 Q59 47 63 41" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : isLooping ? (
            <>
              <circle cx="39" cy="43" r="3.5" fill="none" stroke="#FDE047" strokeWidth="2" />
              <circle cx="61" cy="43" r="3.5" fill="none" stroke="#FDE047" strokeWidth="2" />
            </>
          ) : isVisitor ? (
            <>
              {/* Scanning Eyes for Array Traversal */}
              <rect x="35" y="40" width="8" height="6" rx="1" fill="#38BDF8" />
              <rect x="57" y="40" width="8" height="6" rx="1" fill="#38BDF8" />
              <line x1="35" y1="43" x2="43" y2="43" stroke="#E0F2FE" strokeWidth="1" />
              <line x1="57" y1="43" x2="65" y2="43" stroke="#E0F2FE" strokeWidth="1" />
            </>
          ) : isError ? (
            <>
              <line x1="36" y1="40" x2="42" y2="46" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="42" y1="40" x2="36" y2="46" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="58" y1="40" x2="64" y2="46" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="64" y1="40" x2="58" y2="46" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* Normal Eyes with Dynamic Offset based on targetIndex */}
              <ellipse cx={39 + eyeOffset} cy="43" rx="4.5" ry="5.5" fill="#5EEAD4" />
              <ellipse cx={61 + eyeOffset} cy="43" rx="4.5" ry="5.5" fill="#5EEAD4" />
              <circle cx={37.5 + eyeOffset} cy="41" r="1.8" fill="#FFFFFF" />
              <circle cx={59.5 + eyeOffset} cy="41" r="1.8" fill="#FFFFFF" />
            </>
          )}

          {/* Visor Mouth */}
          <path d="M47 52 Q50 55 53 52" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

          {/* Chest Energy Core Badge */}
          <circle cx="50" cy="70" r="4" fill={isError ? '#F87171' : '#38BDF8'} filter="url(#neon-glow)" className="chest-core" />
        </svg>
      </button>
    </div>
  );
}