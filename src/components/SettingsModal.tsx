import React, { useEffect, useRef } from 'react';
import { Activity, Smartphone } from 'lucide-react';
import { soundManager } from '../game/audio';
import { GoreLevel } from '../game/types';
import {
  GothicPanel9Slice,
  GothicRow9Slice,
  SETTINGS_SPRITES,
  Sprite3SliceButton,
  SpriteCloseButton,
  SpriteScrollbar,
  SpriteToggleSwitch,
  SpriteVolumeSlider,
} from './SettingsSprites';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  goreLevel: GoreLevel;
  hapticsEnabled: boolean;
  screenShakeEnabled: boolean;
  onMasterVolumeChange: (val: number) => void;
  onMusicVolumeChange: (val: number) => void;
  onSfxVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onGoreLevelChange: (level: GoreLevel) => void;
  onToggleHaptics: () => void;
  onToggleScreenShake: () => void;
}

const GORE_OPTIONS: Array<{ id: GoreLevel; label: string; hint: string }> = [
  { id: 'off', label: 'Off', hint: 'No blood or floor stains; keeps hit sparks' },
  { id: 'low', label: 'Low', hint: 'Halved particles & floor stains' },
  { id: 'normal', label: 'Normal', hint: 'Full enemy death blood & floor stains' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterVolume,
  musicVolume,
  sfxVolume,
  isMuted,
  goreLevel,
  hapticsEnabled,
  screenShakeEnabled,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onToggleMute,
  onGoreLevelChange,
  onToggleHaptics,
  onToggleScreenShake,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const masterPercent = Math.round(masterVolume * 100);
  const musicPercent = Math.round(musicVolume * 100);
  const sfxPercent = Math.round(sfxVolume * 100);

  const handleClose = () => {
    soundManager.playUiClick();
    onClose();
  };

  const handleTestAttack = () => {
    soundManager.initCtx(true);
    soundManager.playPlayerAttack();
  };

  const handleTestCast = () => {
    soundManager.initCtx(true);
    soundManager.playGemPickup();
  };

  const activeGoreHint = GORE_OPTIONS.find((opt) => opt.id === goreLevel)?.hint ?? '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad select-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(10, 9, 13, 0.90) 0%, rgba(22, 6, 8, 0.96) 100%)',
      }}
    >
      <GothicPanel9Slice className="w-full max-w-[520px] max-h-[92vh]">
        {/* HEADER */}
        <header
          className="relative shrink-0 mx-1 mt-[10px] px-3 sm:px-4 pt-3.5 pb-3 flex items-center justify-between gap-2.5 sm:gap-3 rounded-[3px]"
          style={{
            backgroundImage: `url(${SETTINGS_SPRITES.headerBgMid})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src={SETTINGS_SPRITES.headerSpeakerBox}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="w-11 h-11 sm:w-12 sm:h-12 aspect-square shrink-0 object-contain select-none"
            />
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="font-cinzel text-lg sm:text-[22px] font-bold tracking-[0.12em] text-[#e8dcc2] leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]"
              >
                SETTINGS
              </h2>
              <p className="font-body text-xs sm:text-[13px] text-[#b5a589] leading-snug truncate">
                Adjust volume, control &amp; other settings
              </p>
            </div>
          </div>

          <SpriteCloseButton onClick={handleClose} ariaLabel="Close Settings" />
        </header>

        {/* Forged Crimson Divider Bar */}
        <div
          aria-hidden="true"
          className="shrink-0 mx-1 h-[12px]"
          style={{
            backgroundImage: `url(${SETTINGS_SPRITES.dividerBar})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: '180px 12px',
          }}
        />

        {/* SCROLLABLE CONTENT + CUSTOM SPRITE SCROLLBAR */}
        <div className="flex flex-1 min-h-0 px-1 sm:px-1.5 pt-2.5 pb-2 gap-1.5 sm:gap-2">
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-y-auto no-scrollbar pr-0.5 flex flex-col gap-2.5"
          >
            {/* Master Volume */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={SETTINGS_SPRITES.iconMusicRed}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="w-5 h-5 aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[15px] font-semibold text-[#e8dcc2] truncate">
                    Master Volume
                  </span>
                </div>
                <span className="font-mono-numbers text-sm font-bold text-[#e8dcc2] shrink-0">
                  {isMuted ? 'Muted' : `${masterPercent}%`}
                </span>
              </div>
              <SpriteVolumeSlider
                value={isMuted ? 0 : masterVolume}
                disabled={isMuted}
                ariaLabel="Master volume"
                onChange={onMasterVolumeChange}
              />
            </GothicRow9Slice>

            {/* Music Volume */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={SETTINGS_SPRITES.iconMusicRed}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="w-5 h-5 aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[15px] font-semibold text-[#e8dcc2] truncate">
                    Music Volume
                  </span>
                </div>
                <span className="font-mono-numbers text-sm font-bold text-[#e8dcc2] shrink-0">
                  {isMuted ? 'Muted' : `${musicPercent}%`}
                </span>
              </div>
              <SpriteVolumeSlider
                value={isMuted ? 0 : musicVolume}
                disabled={isMuted}
                ariaLabel="Music volume"
                onChange={onMusicVolumeChange}
              />
            </GothicRow9Slice>

            {/* SFX Volume */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={SETTINGS_SPRITES.iconSfxGold}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="w-5 h-5 aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[15px] font-semibold text-[#e8dcc2] truncate">
                    SFX Volume
                  </span>
                </div>
                <span className="font-mono-numbers text-sm font-bold text-[#e8dcc2] shrink-0">
                  {isMuted ? 'Muted' : `${sfxPercent}%`}
                </span>
              </div>
              <SpriteVolumeSlider
                value={isMuted ? 0 : sfxVolume}
                disabled={isMuted}
                ariaLabel="SFX volume"
                onChange={onSfxVolumeChange}
              />
            </GothicRow9Slice>

            {/* Mute All Audio */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={SETTINGS_SPRITES.iconMuteWave}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="w-6 h-6 aspect-square shrink-0 object-contain select-none"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[15px] font-bold text-[#e8dcc2] leading-tight">
                    Mute All Audio
                  </span>
                  <span className="font-body text-xs text-[#9c8e72] leading-tight mt-0.5">
                    {isMuted ? 'Audio muted' : 'Audio enabled'}
                  </span>
                </div>
              </div>

              <SpriteToggleSwitch
                checked={isMuted}
                variant="mute"
                onLabel="Muted"
                offLabel="Active"
                ariaLabel="Mute All Audio"
                onToggle={() => {
                  soundManager.playUiClick();
                  onToggleMute();
                }}
              />
            </GothicRow9Slice>

            {/* Preview Audio */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <span className="font-body text-[15px] font-semibold text-[#d8c9a8] shrink-0">
                Preview Audio
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Sprite3SliceButton
                  variant="attack"
                  iconInsetPadding
                  onClick={handleTestAttack}
                  className="flex-1 sm:flex-none min-w-[114px] h-[44px]"
                >
                  <span className="font-cinzel text-xs font-bold tracking-wider text-[#e8dcc2]">
                    Attack
                  </span>
                </Sprite3SliceButton>
                <Sprite3SliceButton
                  variant="cast"
                  iconInsetPadding
                  onClick={handleTestCast}
                  className="flex-1 sm:flex-none min-w-[114px] h-[44px]"
                >
                  <span className="font-cinzel text-xs font-bold tracking-wider text-[#e8dcc2]">
                    Cast
                  </span>
                </Sprite3SliceButton>
              </div>
            </GothicRow9Slice>

            {/* Gore Setting */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 shrink-0">
                  <img
                    src={SETTINGS_SPRITES.iconGorePower}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="w-5 h-5 aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[15px] font-bold text-[#e8dcc2]">Gore</span>
                </div>
                <span className="font-body text-xs text-[#9c8e72] text-right leading-snug">
                  {activeGoreHint}
                </span>
              </div>

              <div role="radiogroup" aria-label="Gore level" className="grid grid-cols-3 gap-2">
                {GORE_OPTIONS.map((option) => {
                  const selected = goreLevel === option.id;
                  return (
                    <Sprite3SliceButton
                      key={option.id}
                      variant="iron"
                      active={selected}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        soundManager.playUiClick();
                        onGoreLevelChange(option.id);
                      }}
                      className="h-[44px] w-full"
                    >
                      <span
                        className={`font-cinzel text-xs font-bold tracking-wider ${
                          selected ? 'text-[#f6e8d2]' : 'text-[#9c8e72]'
                        }`}
                      >
                        {option.label}
                      </span>
                    </Sprite3SliceButton>
                  );
                })}
              </div>
            </GothicRow9Slice>

            {/* Camera Shake */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded bg-[#141519] border border-[#3a3f47] text-[#c98f3a]">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[15px] font-bold text-[#e8dcc2] leading-tight">
                    Camera Shake
                  </span>
                  <span className="font-body text-xs text-[#9c8e72] leading-tight mt-0.5 truncate">
                    {screenShakeEnabled ? 'Combat & boss tremor enabled' : 'Camera shake disabled'}
                  </span>
                </div>
              </div>

              <SpriteToggleSwitch
                checked={screenShakeEnabled}
                variant="standard"
                onLabel="On"
                offLabel="Off"
                ariaLabel="Camera Shake"
                onToggle={() => {
                  soundManager.playUiClick();
                  onToggleScreenShake();
                }}
              />
            </GothicRow9Slice>

            {/* Haptics */}
            <GothicRow9Slice contentClassName="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded bg-[#141519] border border-[#3a3f47] text-[#b32b32]">
                  <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[15px] font-bold text-[#e8dcc2] leading-tight">
                    Haptics
                  </span>
                  <span className="font-body text-xs text-[#9c8e72] leading-tight mt-0.5 truncate">
                    {hapticsEnabled ? 'Tactile vibration enabled' : 'Tactile vibration disabled'}
                  </span>
                </div>
              </div>

              <SpriteToggleSwitch
                checked={hapticsEnabled}
                variant="standard"
                onLabel="On"
                offLabel="Off"
                ariaLabel="Haptics"
                onToggle={() => {
                  soundManager.playUiClick();
                  onToggleHaptics();
                }}
              />
            </GothicRow9Slice>
          </div>

          {/* Custom Interactive Sprite Scrollbar */}
          <SpriteScrollbar scrollRef={scrollRef} />
        </div>

        {/* FOOTER */}
        <footer className="relative z-20 shrink-0 flex flex-col items-center px-3 pt-2.5 pb-[28px]">
          <Sprite3SliceButton
            variant="done"
            onClick={handleClose}
            className="w-full max-w-[290px] h-[46px]"
          >
            <span className="font-cinzel text-sm font-bold tracking-[0.14em] text-[#f3e6cc] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              Done
            </span>
          </Sprite3SliceButton>
        </footer>
      </GothicPanel9Slice>
    </div>
  );
};
