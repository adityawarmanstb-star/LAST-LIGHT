import React, { useEffect, useRef, useState } from 'react';
import { haptics } from '../../mobile/haptics';
import { UI_SPRITES } from './uiConfig';

/**
 * Pure Sprite Toggle Switch (track + fixed 1:1 sliding knob; ZERO ON/OFF/MUTE text).
 */
export const UiToggle: React.FC<{
  checked: boolean;
  variant?: 'standard' | 'mute';
  ariaLabel: string;
  onToggle: () => void;
  className?: string;
}> = ({ checked, variant = 'standard', ariaLabel, onToggle, className = '' }) => {
  const trackSrc =
    variant === 'mute' && checked
      ? UI_SPRITES.toggleTrackCrimson
      : checked
        ? UI_SPRITES.toggleTrackCrimson
        : UI_SPRITES.toggleTrackSteel;

  const knobSrc = checked ? UI_SPRITES.knobCrimsonOrb : UI_SPRITES.knobSteelDome;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => {
        haptics.tap('light');
        onToggle();
      }}
      className={`group relative inline-flex items-center justify-center min-h-[44px] px-1 shrink-0 cursor-pointer select-none transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 ${className}`}
    >
      <span
        className="relative block h-[30px] shrink-0"
        style={{ aspectRatio: '314 / 158' }}
      >
        <img
          src={trackSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ imageRendering: 'auto' }}
          className="w-full h-full object-contain select-none"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 transition-all duration-150 ease-out"
          style={{
            left: checked ? 'calc(100% - 24px)' : '4px',
            width: '20px',
            height: '20px',
            aspectRatio: '1 / 1',
          }}
        >
          <img
            src={knobSrc}
            alt=""
            draggable={false}
            style={{ imageRendering: 'auto' }}
            className="w-full h-full object-contain select-none"
          />
        </span>
      </span>
    </button>
  );
};

/**
 * Sprite Slider:
 * 3-slice track groove + clip-path clipped crimson fill + fixed 1:1 knob sprite.
 */
export const UiSlider: React.FC<{
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (val: number) => void;
}> = ({ value, disabled = false, ariaLabel, onChange }) => {
  const [active, setActive] = useState(false);
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);
  const clipRight = Math.max(0, 100 - pct);

  return (
    <div
      className={`relative w-full h-9 flex items-center select-none transition-opacity duration-150 ${
        disabled ? 'opacity-45' : 'opacity-100'
      }`}
    >
      {/* 3-Slice Track Groove with fixed aspect end caps */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 h-[16px] flex items-stretch"
      >
        <img
          src={UI_SPRITES.sliderTrackLeft}
          alt=""
          draggable={false}
          style={{ aspectRatio: '14 / 23', imageRendering: 'auto' }}
          className="h-full w-auto shrink-0 select-none"
        />
        <span
          className="flex-1 h-full min-w-0"
          style={{
            backgroundImage: `url("${UI_SPRITES.sliderTrackMid}")`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: '33px 16px',
          }}
        />
        <img
          src={UI_SPRITES.sliderTrackRight}
          alt=""
          draggable={false}
          style={{ aspectRatio: '14 / 23', imageRendering: 'auto' }}
          className="h-full w-auto shrink-0 select-none"
        />
      </div>

      {/* Crimson Textured Fill clipped by clip-path (never stretched) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[6px] right-[6px] h-[6px] overflow-hidden"
        style={{ clipPath: `inset(0 ${clipRight}% 0 0)` }}
      >
        <img
          src={UI_SPRITES.barFillCrimson}
          alt=""
          draggable={false}
          style={{ imageRendering: 'auto' }}
          className="w-full h-full object-cover select-none"
        />
      </div>

      {/* Fixed 1:1 Slider Knob Sprite */}
      <img
        src={active && !disabled ? UI_SPRITES.knobCrimsonOrb : UI_SPRITES.sliderKnobDefault}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          left: `clamp(13px, ${pct}%, calc(100% - 13px))`,
          aspectRatio: '1 / 1',
          imageRendering: 'auto',
        }}
        className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] object-contain select-none transition-transform duration-100 ${
          active && !disabled ? 'scale-110' : 'scale-100'
        }`}
      />

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={clamped}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onPointerDown={() => setActive(true)}
        onPointerUp={() => setActive(false)}
        onPointerCancel={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        className={`relative z-10 w-full h-9 opacity-0 m-0 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      />
    </div>
  );
};

/**
 * Sprite Checkbox: fixed natural aspect ratio (295 / 292) swapping empty vs crimson-X sprite.
 */
export const UiCheckbox: React.FC<{
  checked: boolean;
  onChange?: (checked: boolean) => void;
  ariaLabel?: string;
  size?: number;
  interactive?: boolean;
  className?: string;
}> = ({
  checked,
  onChange,
  ariaLabel,
  size = 24,
  interactive = true,
  className = '',
}) => {
  const src = checked ? UI_SPRITES.checkboxChecked : UI_SPRITES.checkboxEmpty;

  if (!interactive) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, aspectRatio: '295 / 292' }}
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ imageRendering: 'auto' }}
          className="w-full h-full object-contain select-none"
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => {
        haptics.tap('light');
        onChange?.(!checked);
      }}
      style={{ width: size, aspectRatio: '295 / 292' }}
      className={`inline-flex items-center justify-center shrink-0 select-none cursor-pointer transition-transform duration-120 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ imageRendering: 'auto' }}
        className="w-full h-full object-contain select-none"
      />
    </button>
  );
};

/**
 * Custom Sprite Scrollbar synced to a scrollable container ref.
 * Uses tiled scroll_track, 3-slice vertical silver thumb handle, and fixed-aspect up/down arrows.
 */
export const UiScrollbar: React.FC<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
}> = ({ scrollRef }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    hasOverflow: false,
    thumbTopPct: 0,
    thumbHeightPct: 100,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const overflow = scrollHeight - clientHeight > 6;
      if (!overflow) {
        setMetrics({ hasOverflow: false, thumbTopPct: 0, thumbHeightPct: 100 });
        return;
      }
      const heightPct = Math.max(18, Math.min(82, (clientHeight / scrollHeight) * 100));
      const maxScroll = Math.max(1, scrollHeight - clientHeight);
      const topPct = (scrollTop / maxScroll) * (100 - heightPct);
      setMetrics({
        hasOverflow: true,
        thumbTopPct: topPct,
        thumbHeightPct: heightPct,
      });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [scrollRef]);

  if (!metrics.hasOverflow) return null;

  const handleStep = (delta: number) => {
    haptics.tap('light');
    scrollRef.current?.scrollBy({ top: delta, behavior: 'smooth' });
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const el = scrollRef.current;
    if (!track || !el) return;
    e.preventDefault();
    const rect = track.getBoundingClientRect();
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    el.scrollTop = ratio * maxScroll;

    const onMove = (ev: PointerEvent) => {
      const nextRatio = Math.max(
        0,
        Math.min(1, (ev.clientY - rect.top) / Math.max(1, rect.height))
      );
      el.scrollTop = nextRatio * maxScroll;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div className="flex flex-col items-center w-[22px] shrink-0 py-1 gap-1 select-none">
      <button
        type="button"
        aria-label="Scroll up"
        onClick={() => handleStep(-110)}
        style={{ aspectRatio: '41 / 41' }}
        className="w-[22px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
      >
        <img
          src={UI_SPRITES.scrollArrowUp}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ imageRendering: 'auto' }}
          className="w-full h-full object-contain"
        />
      </button>

      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="relative flex-1 w-[18px] cursor-pointer"
        style={{
          backgroundImage: `url("${UI_SPRITES.scrollTrack}")`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: '18px 112px',
          backgroundPosition: 'center',
        }}
      >
        <div
          style={{
            top: `${metrics.thumbTopPct}%`,
            height: `${metrics.thumbHeightPct}%`,
          }}
          className="pointer-events-none absolute left-0 right-0 flex flex-col items-stretch"
        >
          <img
            src={UI_SPRITES.scrollThumbTop}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ aspectRatio: '40 / 20', imageRendering: 'auto' }}
            className="w-full h-auto shrink-0"
          />
          <div
            className="flex-1 w-full min-h-[6px]"
            style={{
              backgroundImage: `url("${UI_SPRITES.scrollThumbMid}")`,
              backgroundRepeat: 'repeat-y',
              backgroundSize: '18px 74px',
            }}
          />
          <img
            src={UI_SPRITES.scrollThumbBottom}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ aspectRatio: '40 / 20', imageRendering: 'auto' }}
            className="w-full h-auto shrink-0"
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll down"
        onClick={() => handleStep(110)}
        style={{ aspectRatio: '37 / 38' }}
        className="w-[22px] flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
      >
        <img
          src={UI_SPRITES.scrollArrowDown}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ imageRendering: 'auto' }}
          className="w-full h-full object-contain"
        />
      </button>
    </div>
  );
};

/**
 * Unstretched Spiked Chain Divider (fixed natural 958:178 aspect ratio + object-contain).
 */
export const UiChainDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full flex items-center justify-center pointer-events-none select-none ${className}`}>
    <img
      src={UI_SPRITES.chainDivider}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ aspectRatio: '958 / 178', imageRendering: 'auto' }}
      className="w-[min(220px,62%)] h-auto object-contain select-none"
    />
  </div>
);
