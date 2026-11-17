import React, { useState } from 'react';
import { haptics } from '../mobile/haptics';

const S = './assets/ui/settings';

export const SETTINGS_SPRITES = {
  panelTl: `${S}/panel_tl.png`,
  panelTr: `${S}/panel_tr.png`,
  panelTop: `${S}/panel_top.png`,
  panelLeft: `${S}/panel_left.png`,
  panelRight: `${S}/panel_right.png`,
  panelBl: `${S}/panel_bl.png`,
  panelBr: `${S}/panel_br.png`,
  panelBottom: `${S}/panel_bottom.png`,
  panelStone: `${S}/panel_stone.png`,
  crestTop: `${S}/crest_top.png`,
  crestBottom: `${S}/crest_bottom.png`,
  dividerBar: `${S}/divider_bar.png`,

  headerBgLeft: `${S}/header_bg_left.png`,
  headerBgMid: `${S}/header_bg_mid.png`,
  headerBgRight: `${S}/header_bg_right.png`,
  headerSpeakerBox: `${S}/header_speaker_box.png`,

  closeDefault: `${S}/close_default.png`,
  closeHover: `${S}/close_hover.png`,
  closePressed: `${S}/close_pressed.png`,

  rowTl: `${S}/row_tl.png`,
  rowTop: `${S}/row_top.png`,
  rowTr: `${S}/row_tr.png`,
  rowLeft: `${S}/row_left.png`,
  rowBg: `${S}/row_bg.png`,
  rowRight: `${S}/row_right.png`,
  rowBl: `${S}/row_bl.png`,
  rowBottom: `${S}/row_bottom.png`,
  rowBr: `${S}/row_br.png`,

  iconMusicRed: `${S}/icon_music_red.png`,
  iconSfxGold: `${S}/icon_sfx_gold.png`,
  iconMuteWave: `${S}/icon_mute_wave.png`,
  iconGorePower: `${S}/icon_gore_power.png`,

  sliderTrackLeft: `${S}/slider_track_left.png`,
  sliderTrackMid: `${S}/slider_track_mid.png`,
  sliderTrackRight: `${S}/slider_track_right.png`,
  sliderKnobDefault: `${S}/slider_knob_default.png`,
  sliderKnobActive: `${S}/slider_knob_active.png`,

  toggleOff: `${S}/toggle_off.png`,
  toggleOn: `${S}/toggle_on.png`,
  toggleMuteOn: `${S}/toggle_mute_on.png`,

  scrollTrack: `${S}/scroll_track.png`,
  scrollThumbTop: `${S}/scroll_thumb_top.png`,
  scrollThumbMid: `${S}/scroll_thumb_mid.png`,
  scrollThumbBottom: `${S}/scroll_thumb_bottom.png`,
  scrollArrowUp: `${S}/scroll_arrow_up.png`,
  scrollArrowDown: `${S}/scroll_arrow_down.png`,
} as const;

type ButtonVariant = 'done' | 'attack' | 'cast' | 'iron';

const BUTTON_SLICES: Record<
  ButtonVariant,
  Record<
    'default' | 'hover' | 'pressed' | 'disabled',
    { left: string; mid: string; right: string; leftAspect: string; rightAspect: string }
  >
> = {
  done: {
    default: {
      left: `${S}/done_default_left.png`,
      mid: `${S}/done_default_mid.png`,
      right: `${S}/done_default_right.png`,
      leftAspect: '60 / 54',
      rightAspect: '60 / 54',
    },
    hover: {
      left: `${S}/done_hover_left.png`,
      mid: `${S}/done_hover_mid.png`,
      right: `${S}/done_hover_right.png`,
      leftAspect: '60 / 55',
      rightAspect: '60 / 55',
    },
    pressed: {
      left: `${S}/done_pressed_left.png`,
      mid: `${S}/done_pressed_mid.png`,
      right: `${S}/done_pressed_right.png`,
      leftAspect: '60 / 50',
      rightAspect: '60 / 50',
    },
    disabled: {
      left: `${S}/done_disabled_left.png`,
      mid: `${S}/done_disabled_mid.png`,
      right: `${S}/done_disabled_right.png`,
      leftAspect: '60 / 51',
      rightAspect: '60 / 51',
    },
  },
  attack: {
    default: {
      left: `${S}/btn_attack_default_left.png`,
      mid: `${S}/btn_attack_default_mid.png`,
      right: `${S}/btn_attack_default_right.png`,
      leftAspect: '64 / 52',
      rightAspect: '21 / 52',
    },
    hover: {
      left: `${S}/btn_attack_hover_left.png`,
      mid: `${S}/btn_attack_hover_mid.png`,
      right: `${S}/btn_attack_hover_right.png`,
      leftAspect: '64 / 55',
      rightAspect: '21 / 55',
    },
    pressed: {
      left: `${S}/btn_attack_pressed_left.png`,
      mid: `${S}/btn_attack_pressed_mid.png`,
      right: `${S}/btn_attack_pressed_right.png`,
      leftAspect: '64 / 60',
      rightAspect: '21 / 60',
    },
    disabled: {
      left: `${S}/btn_attack_default_left.png`,
      mid: `${S}/btn_attack_default_mid.png`,
      right: `${S}/btn_attack_default_right.png`,
      leftAspect: '64 / 52',
      rightAspect: '21 / 52',
    },
  },
  cast: {
    default: {
      left: `${S}/btn_cast_default_left.png`,
      mid: `${S}/btn_cast_default_mid.png`,
      right: `${S}/btn_cast_default_right.png`,
      leftAspect: '62 / 56',
      rightAspect: '22 / 56',
    },
    hover: {
      left: `${S}/btn_cast_hover_left.png`,
      mid: `${S}/btn_cast_hover_mid.png`,
      right: `${S}/btn_cast_hover_right.png`,
      leftAspect: '62 / 58',
      rightAspect: '22 / 58',
    },
    pressed: {
      left: `${S}/btn_cast_pressed_left.png`,
      mid: `${S}/btn_cast_pressed_mid.png`,
      right: `${S}/btn_cast_pressed_right.png`,
      leftAspect: '62 / 56',
      rightAspect: '22 / 56',
    },
    disabled: {
      left: `${S}/btn_cast_default_left.png`,
      mid: `${S}/btn_cast_default_mid.png`,
      right: `${S}/btn_cast_default_right.png`,
      leftAspect: '62 / 56',
      rightAspect: '22 / 56',
    },
  },
  iron: {
    default: {
      left: `${S}/btn_iron_default_left.png`,
      mid: `${S}/btn_iron_default_mid.png`,
      right: `${S}/btn_iron_default_right.png`,
      leftAspect: '26 / 52',
      rightAspect: '21 / 52',
    },
    hover: {
      left: `${S}/btn_iron_hover_left.png`,
      mid: `${S}/btn_iron_hover_mid.png`,
      right: `${S}/btn_iron_hover_right.png`,
      leftAspect: '26 / 55',
      rightAspect: '21 / 55',
    },
    pressed: {
      left: `${S}/btn_iron_pressed_left.png`,
      mid: `${S}/btn_iron_pressed_mid.png`,
      right: `${S}/btn_iron_pressed_right.png`,
      leftAspect: '26 / 60',
      rightAspect: '21 / 60',
    },
    disabled: {
      left: `${S}/btn_iron_default_left.png`,
      mid: `${S}/btn_iron_default_mid.png`,
      right: `${S}/btn_iron_default_right.png`,
      leftAspect: '26 / 52',
      rightAspect: '21 / 52',
    },
  },
};

/**
 * True 9-Slice Main Panel Frame:
 * Corners and center gothic crimson crests retain exact 1:1 proportions;
 * edge rails tile vertically/horizontally; center fills with charcoal stone grain.
 */
export const GothicPanel9Slice: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Interior Charcoal Stone Background (tiled seamlessly inside outer forged borders) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[24px] bottom-[28px] left-[22px] right-[20px] z-0"
        style={{
          backgroundImage: `url(${SETTINGS_SPRITES.panelStone})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '346px auto',
          backgroundPosition: 'center top',
        }}
      />

      {/* Subtle top/bottom vignette for depth inside stone slab */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[24px] bottom-[28px] left-[22px] right-[20px] z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(5,5,7,0.48) 100%)',
        }}
      />

      {/* Top Horizontal Tiled Iron Rail */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-[74px] right-[74px] h-[48px] z-20"
        style={{
          backgroundImage: `url(${SETTINGS_SPRITES.panelTop})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: '60px 48px',
        }}
      />

      {/* Bottom Horizontal Tiled Iron Rail (behind interactive footer button) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[84px] right-[84px] h-[82px] z-10"
        style={{
          backgroundImage: `url(${SETTINGS_SPRITES.panelBottom})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: '80px 82px',
        }}
      />

      {/* Left Vertical Tiled Forged Border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[48px] bottom-[82px] w-[44px] z-20"
        style={{
          backgroundImage: `url(${SETTINGS_SPRITES.panelLeft})`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: '44px 360px',
        }}
      />

      {/* Right Vertical Tiled Forged Border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-[48px] bottom-[82px] w-[31px] z-20"
        style={{
          backgroundImage: `url(${SETTINGS_SPRITES.panelRight})`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: '31px 360px',
        }}
      />

      {/* 4 Fixed Unstretched Corner Ornaments */}
      <img
        src={SETTINGS_SPRITES.panelTl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute top-0 left-0 w-[74px] h-[48px] z-30 select-none"
      />
      <img
        src={SETTINGS_SPRITES.panelTr}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute top-0 right-0 w-[74px] h-[48px] z-30 select-none"
      />
      <img
        src={SETTINGS_SPRITES.panelBl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute bottom-0 left-0 w-[84px] h-[82px] z-10 select-none"
      />
      <img
        src={SETTINGS_SPRITES.panelBr}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute bottom-0 right-0 w-[84px] h-[82px] z-10 select-none"
      />

      {/* Centered Gothic Crimson Gem Crests (Never Stretched) */}
      <img
        src={SETTINGS_SPRITES.crestTop}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[108px] h-[48px] z-30 select-none"
      />
      <img
        src={SETTINGS_SPRITES.crestBottom}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[108px] h-[48px] z-30 select-none"
      />

      {/* Panel Inner Content Layer */}
      <div className="relative z-20 flex flex-col flex-1 min-h-0 px-[24px] pt-[24px] pb-[18px]">
        {children}
      </div>
    </div>
  );
};

/**
 * True 9-Slice Charcoal Stone Row Card (fixed 16px corners, tiled borders & stone core).
 */
export const GothicRow9Slice: React.FC<{
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}> = ({ children, className = '', contentClassName = 'px-3.5 py-2.5' }) => {
  const C = 16; // Fixed corner inset keeps beveled corner angles 1:1 unstretched
  return (
    <div className={`relative ${className}`}>
      {/* Center Stone Fill */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0"
        style={{
          top: C,
          bottom: C,
          left: C,
          right: C,
          backgroundImage: `url(${SETTINGS_SPRITES.rowBg})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '80px 40px',
        }}
      />
      {/* Top & Bottom Edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 z-0"
        style={{
          left: C,
          right: C,
          height: C,
          backgroundImage: `url(${SETTINGS_SPRITES.rowTop})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `80px ${C}px`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 z-0"
        style={{
          left: C,
          right: C,
          height: C,
          backgroundImage: `url(${SETTINGS_SPRITES.rowBottom})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `80px ${C}px`,
        }}
      />
      {/* Left & Right Edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 z-0"
        style={{
          top: C,
          bottom: C,
          width: C,
          backgroundImage: `url(${SETTINGS_SPRITES.rowLeft})`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: `${C}px 40px`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 z-0"
        style={{
          top: C,
          bottom: C,
          width: C,
          backgroundImage: `url(${SETTINGS_SPRITES.rowRight})`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: `${C}px 40px`,
        }}
      />
      {/* 4 Unstretched Corners */}
      <img
        src={SETTINGS_SPRITES.rowTl}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ width: C, height: C }}
        className="pointer-events-none absolute top-0 left-0 z-0 select-none"
      />
      <img
        src={SETTINGS_SPRITES.rowTr}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ width: C, height: C }}
        className="pointer-events-none absolute top-0 right-0 z-0 select-none"
      />
      <img
        src={SETTINGS_SPRITES.rowBl}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ width: C, height: C }}
        className="pointer-events-none absolute bottom-0 left-0 z-0 select-none"
      />
      <img
        src={SETTINGS_SPRITES.rowBr}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ width: C, height: C }}
        className="pointer-events-none absolute bottom-0 right-0 z-0 select-none"
      />

      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
};

/**
 * 3-Slice Gothic Sprite Button:
 * Left & right beveled end-caps scale proportionally via CSS aspect-ratio (never squished/stretched),
 * while the middle metallic strip expands horizontally.
 */
interface Sprite3SliceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant;
  active?: boolean;
  iconInsetPadding?: boolean;
  children: React.ReactNode;
}

export const Sprite3SliceButton: React.FC<Sprite3SliceButtonProps> = ({
  variant,
  active = false,
  iconInsetPadding = false,
  className = '',
  disabled = false,
  children,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const state: 'default' | 'hover' | 'pressed' | 'disabled' = disabled
    ? 'disabled'
    : pressed
      ? 'pressed'
      : active || hovered
        ? 'hover'
        : 'default';

  const slice = BUTTON_SLICES[variant][state];

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        setPressed(false);
        onMouseLeave?.(e);
      }}
      onPointerDown={(e) => {
        if (!disabled) {
          setPressed(true);
          haptics.tap(variant === 'done' ? 'medium' : 'light');
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setPressed(false);
        onPointerCancel?.(e);
      }}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...rest}
    >
      {/* 3-Slice Frame Layer */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-stretch">
        <img
          src={slice.left}
          alt=""
          draggable={false}
          style={{ aspectRatio: slice.leftAspect }}
          className="h-full w-auto shrink-0 select-none"
        />
        <span
          className="flex-1 h-full min-w-0"
          style={{
            backgroundImage: `url(${slice.mid})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
          }}
        />
        <img
          src={slice.right}
          alt=""
          draggable={false}
          style={{ aspectRatio: slice.rightAspect }}
          className="h-full w-auto shrink-0 select-none"
        />
      </span>

      {/* Crisp Typography Layer */}
      <span
        className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${
          iconInsetPadding ? 'pl-11 pr-4' : 'px-4'
        }`}
      >
        {children}
      </span>
    </button>
  );
};

/**
 * Square Sprite Close Button (1:1 aspect ratio, 3 states).
 */
export const SpriteCloseButton: React.FC<{
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}> = ({ onClick, ariaLabel = 'Close Settings', className = '' }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const src = pressed
    ? SETTINGS_SPRITES.closePressed
    : hovered
      ? SETTINGS_SPRITES.closeHover
      : SETTINGS_SPRITES.closeDefault;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={() => {
        setPressed(true);
        haptics.tap('light');
      }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={`relative shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] aspect-square flex items-center justify-center transition-transform duration-150 ease-out active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="w-full h-full object-contain select-none"
      />
    </button>
  );
};

/**
 * Sprite Volume Slider:
 * 3-slice beveled track groove + crimson energy fill + unstretched metallic knob sprite
 * backed by an accessible native range input.
 */
export const SpriteVolumeSlider: React.FC<{
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (val: number) => void;
}> = ({ value, disabled = false, ariaLabel, onChange }) => {
  const [active, setActive] = useState(false);
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);

  return (
    <div
      className={`relative w-full h-9 flex items-center select-none transition-opacity duration-150 ${
        disabled ? 'opacity-45' : 'opacity-100'
      }`}
    >
      {/* 3-Slice Track Groove */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 h-[16px] flex items-stretch"
      >
        <img
          src={SETTINGS_SPRITES.sliderTrackLeft}
          alt=""
          draggable={false}
          style={{ aspectRatio: '14 / 23' }}
          className="h-full w-auto shrink-0 select-none"
        />
        <span
          className="flex-1 h-full min-w-0"
          style={{
            backgroundImage: `url(${SETTINGS_SPRITES.sliderTrackMid})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
          }}
        />
        <img
          src={SETTINGS_SPRITES.sliderTrackRight}
          alt=""
          draggable={false}
          style={{ aspectRatio: '14 / 23' }}
          className="h-full w-auto shrink-0 select-none"
        />
      </div>

      {/* Crimson Active Fill Inside Track Groove */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[6px] right-[6px] h-[6px] rounded-[2px] overflow-hidden"
      >
        <div
          className="h-full transition-[width] duration-75"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #5e0d14 0%, #a31922 65%, #dc2626 100%)',
            boxShadow: pct > 0 && !disabled ? '0 0 6px rgba(220, 38, 38, 0.5)' : 'none',
          }}
        />
      </div>

      {/* Unstretched Metallic Slider Knob Sprite */}
      <img
        src={active && !disabled ? SETTINGS_SPRITES.sliderKnobActive : SETTINGS_SPRITES.sliderKnobDefault}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          left: `clamp(13px, ${pct}%, calc(100% - 13px))`,
        }}
        className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] aspect-square object-contain select-none transition-transform duration-100 ${
          active && !disabled ? 'scale-110' : 'scale-100'
        }`}
      />

      {/* Native Accessible Range Control */}
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
 * Sprite Toggle Switch (unscaled aspect ratio, accessible switch semantics + explicit text label).
 */
export const SpriteToggleSwitch: React.FC<{
  checked: boolean;
  variant?: 'standard' | 'mute';
  onLabel?: string;
  offLabel?: string;
  ariaLabel: string;
  onToggle: () => void;
}> = ({
  checked,
  variant = 'standard',
  onLabel = 'On',
  offLabel = 'Off',
  ariaLabel,
  onToggle,
}) => {
  const spriteSrc =
    variant === 'mute'
      ? checked
        ? SETTINGS_SPRITES.toggleMuteOn
        : SETTINGS_SPRITES.toggleOff
      : checked
        ? SETTINGS_SPRITES.toggleOn
        : SETTINGS_SPRITES.toggleOff;

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
      className="group relative min-h-[44px] flex items-center gap-2 shrink-0 cursor-pointer select-none px-1 focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 active:scale-95 transition-transform duration-150"
    >
      <span
        className={`font-cinzel text-[11px] font-bold tracking-wider uppercase whitespace-nowrap ${
          checked ? 'text-[#f4d7d7]' : 'text-[#9c8e72]'
        }`}
      >
        {checked ? onLabel : offLabel}
      </span>
      <img
        src={spriteSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-[30px] w-auto object-contain select-none"
      />
    </button>
  );
};

/**
 * Custom Interactive Sprite Scrollbar:
 * Uses extracted scroll track, 3-slice vertical silver thumb handle (unstretched end-caps),
 * and clickable up/down arrow buttons synced to the scroll container.
 */
export const SpriteScrollbar: React.FC<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
}> = ({ scrollRef }) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    hasOverflow: false,
    thumbTopPct: 0,
    thumbHeightPct: 100,
  });

  React.useEffect(() => {
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
      const nextRatio = Math.max(0, Math.min(1, (ev.clientY - rect.top) / Math.max(1, rect.height)));
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
        aria-label="Scroll settings up"
        onClick={() => handleStep(-110)}
        className="w-[22px] h-[22px] aspect-square flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
      >
        <img
          src={SETTINGS_SPRITES.scrollArrowUp}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-full h-full object-contain"
        />
      </button>

      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="relative flex-1 w-[18px] cursor-pointer"
        style={{
          backgroundImage: `url(${SETTINGS_SPRITES.scrollTrack})`,
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
          backgroundPosition: 'center',
        }}
      >
        {/* 3-Slice Vertical Metallic Silver Handle (unstretched rounded caps) */}
        <div
          style={{
            top: `${metrics.thumbTopPct}%`,
            height: `${metrics.thumbHeightPct}%`,
          }}
          className="pointer-events-none absolute left-0 right-0 flex flex-col items-stretch"
        >
          <img
            src={SETTINGS_SPRITES.scrollThumbTop}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ aspectRatio: '40 / 20' }}
            className="w-full h-auto shrink-0"
          />
          <div
            className="flex-1 w-full min-h-[6px]"
            style={{
              backgroundImage: `url(${SETTINGS_SPRITES.scrollThumbMid})`,
              backgroundRepeat: 'repeat-y',
              backgroundSize: '100% auto',
            }}
          />
          <img
            src={SETTINGS_SPRITES.scrollThumbBottom}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ aspectRatio: '40 / 20' }}
            className="w-full h-auto shrink-0"
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll settings down"
        onClick={() => handleStep(110)}
        className="w-[22px] h-[22px] aspect-square flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
      >
        <img
          src={SETTINGS_SPRITES.scrollArrowDown}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-full h-full object-contain"
        />
      </button>
    </div>
  );
};

