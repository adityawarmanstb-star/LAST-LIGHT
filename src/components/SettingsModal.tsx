import React, { useEffect, useRef, useState } from 'react';
import { Activity, Smartphone, Terminal } from 'lucide-react';
import { soundManager } from '../game/audio';
import { BOSS2 } from '../game/CinderWardenBoss';
import { isDeveloperMode, subscribeDeveloperMode } from '../game/developerMode';
import { GoreLevel } from '../game/types';
import { BossAnimPreviewModal } from './BossAnimPreviewModal';
import { DeveloperModeModal } from './DeveloperModeModal';
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
import { NineSlice } from './ui/NineSlice';
import { UiChainDivider } from './ui/UiControls';

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
  const versionTapCountRef = useRef<number>(0);
  const lastVersionTapMsRef = useRef<number>(0);
  const [bossPreviewOpen, setBossPreviewOpen] = useState<boolean>(false);
  const [devModalOpen, setDevModalOpen] = useState<boolean>(false);
  const [devModeActive, setDevModeActive] = useState<boolean>(() => isDeveloperMode());

  useEffect(() => {
    return subscribeDeveloperMode(setDevModeActive);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      versionTapCountRef.current = 0;
      setBossPreviewOpen(false);
      setDevModalOpen(false);
    }
  }, [isOpen]);

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastVersionTapMsRef.current > 2500) {
      versionTapCountRef.current = 0;
    }
    lastVersionTapMsRef.current = now;
    versionTapCountRef.current += 1;
    if (versionTapCountRef.current >= 5) {
      versionTapCountRef.current = 0;
      soundManager.playUiClick();
      setBossPreviewOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen || bossPreviewOpen || devModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, bossPreviewOpen, devModalOpen, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad select-none overflow-x-hidden"
      style={{
        background:
          'radial-gradient(circle at center, rgba(10, 9, 13, 0.88) 0%, rgba(16, 4, 6, 0.96) 100%)',
      }}
    >
      <GothicPanel9Slice className="w-full max-w-[540px] max-h-[90dvh]">
        {/* HEADER */}
        <NineSlice
          as="header"
          variant="plateWideIron"
          tileTexture="row"
          padding="0px"
          className="relative shrink-0"
          contentClassName="px-3 py-2 flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={SETTINGS_SPRITES.headerSpeakerBox}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
              className="w-[clamp(38px,6vw,46px)] h-auto aspect-square shrink-0 object-contain select-none"
            />
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="font-display text-[clamp(16px,3.4vw,21px)] font-bold tracking-[0.12em] text-[#e8dcc2] leading-tight"
                style={{ textShadow: '0 2px 3px rgba(0,0,0,0.95)' }}
              >
                SETTINGS
              </h2>
              <p className="font-body text-[11px] sm:text-xs text-[#b5a589] leading-snug truncate">
                Adjust audio, combat gore &amp; tactile feedback
              </p>
            </div>
          </div>

          <SpriteCloseButton onClick={handleClose} ariaLabel="Close Settings" />
        </NineSlice>

        {/* Unstretched Spiked Chain Divider */}
        <UiChainDivider className="my-1.5 shrink-0" />

        {/* SCROLLABLE CONTENT + CUSTOM SPRITE SCROLLBAR */}
        <div className="flex flex-1 min-h-0 gap-1.5 sm:gap-2">
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5 flex flex-col gap-2"
          >
            {/* Master Volume */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={SETTINGS_SPRITES.iconMusicRed}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                    className="w-5 h-auto aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[14px] font-semibold text-[#e8dcc2] truncate">
                    Master Volume
                  </span>
                </div>
                <span className="font-mono-numbers text-xs sm:text-sm font-bold text-[#f2c464] shrink-0">
                  {isMuted ? '0%' : `${masterPercent}%`}
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
            <GothicRow9Slice contentClassName="px-3 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={SETTINGS_SPRITES.iconMusicRed}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                    className="w-5 h-auto aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[14px] font-semibold text-[#e8dcc2] truncate">
                    Music Volume
                  </span>
                </div>
                <span className="font-mono-numbers text-xs sm:text-sm font-bold text-[#f2c464] shrink-0">
                  {isMuted ? '0%' : `${musicPercent}%`}
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
            <GothicRow9Slice contentClassName="px-3 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={SETTINGS_SPRITES.iconSfxGold}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                    className="w-5 h-auto aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[14px] font-semibold text-[#e8dcc2] truncate">
                    SFX Volume
                  </span>
                </div>
                <span className="font-mono-numbers text-xs sm:text-sm font-bold text-[#f2c464] shrink-0">
                  {isMuted ? '0%' : `${sfxPercent}%`}
                </span>
              </div>
              <SpriteVolumeSlider
                value={isMuted ? 0 : sfxVolume}
                disabled={isMuted}
                ariaLabel="SFX volume"
                onChange={onSfxVolumeChange}
              />
            </GothicRow9Slice>

            {/* Mute All Audio (Pure Sprite Track + Knob Toggle, ZERO ON/OFF/MUTE text) */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={SETTINGS_SPRITES.iconMuteWave}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                  className="w-6 h-auto aspect-square shrink-0 object-contain select-none"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[14px] font-bold text-[#e8dcc2] leading-tight">
                    Mute All Audio
                  </span>
                  <span className="font-body text-[11px] text-[#9c8e72] leading-tight mt-0.5 truncate">
                    Silence music and combat effects
                  </span>
                </div>
              </div>

              <SpriteToggleSwitch
                checked={isMuted}
                variant="mute"
                ariaLabel="Mute All Audio"
                onToggle={() => {
                  soundManager.playUiClick();
                  onToggleMute();
                }}
              />
            </GothicRow9Slice>

            {/* Preview Audio */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-body text-[14px] font-semibold text-[#d8c9a8] shrink-0">
                Preview Audio
              </span>
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                <Sprite3SliceButton
                  variant="attack"
                  onClick={handleTestAttack}
                  className="min-w-[104px]"
                >
                  Attack
                </Sprite3SliceButton>
                <Sprite3SliceButton
                  variant="cast"
                  onClick={handleTestCast}
                  className="min-w-[104px]"
                >
                  Cast
                </Sprite3SliceButton>
              </div>
            </GothicRow9Slice>

            {/* Gore Setting */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 shrink-0">
                  <img
                    src={SETTINGS_SPRITES.iconGorePower}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                    className="w-5 h-auto aspect-square shrink-0 object-contain select-none"
                  />
                  <span className="font-body text-[14px] font-bold text-[#e8dcc2]">Gore</span>
                </div>
                <span className="font-body text-[11px] text-[#9c8e72] text-right leading-snug">
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
                      className="w-full"
                    >
                      {option.label}
                    </Sprite3SliceButton>
                  );
                })}
              </div>
            </GothicRow9Slice>

            {/* Camera Shake */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 aspect-square shrink-0 flex items-center justify-center rounded bg-[#141519] border border-[#3a3f47] text-[#c98f3a]">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[14px] font-bold text-[#e8dcc2] leading-tight">
                    Camera Shake
                  </span>
                  <span className="font-body text-[11px] text-[#9c8e72] leading-tight mt-0.5 truncate">
                    Combat &amp; boss impact tremor
                  </span>
                </div>
              </div>

              <SpriteToggleSwitch
                checked={screenShakeEnabled}
                variant="standard"
                ariaLabel="Camera Shake"
                onToggle={() => {
                  soundManager.playUiClick();
                  onToggleScreenShake();
                }}
              />
            </GothicRow9Slice>

            {/* Haptics */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 aspect-square shrink-0 flex items-center justify-center rounded bg-[#141519] border border-[#3a3f47] text-[#b32b32]">
                  <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-[14px] font-bold text-[#e8dcc2] leading-tight">
                    Haptics
                  </span>
                  <span className="font-body text-[11px] text-[#9c8e72] leading-tight mt-0.5 truncate">
                    Tactile device vibration feedback
                  </span>
                </div>
              </div>

              <SpriteToggleSwitch
                checked={hapticsEnabled}
                variant="standard"
                ariaLabel="Haptics"
                onToggle={() => {
                  soundManager.playUiClick();
                  onToggleHaptics();
                }}
              />
            </GothicRow9Slice>

            {/* Developer Mode Menu */}
            <GothicRow9Slice contentClassName="px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 aspect-square shrink-0 flex items-center justify-center rounded bg-[#141519] border border-[#3a3f47] text-[#f2a93b]">
                  <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-body text-[14px] font-bold text-[#e8dcc2] leading-tight">
                      Developer
                    </span>
                    {devModeActive && (
                      <span className="px-1.5 py-[1px] rounded bg-[#0e2a1e] border border-[#6ee7b7]/55 font-mono text-[9px] font-bold tracking-wider text-[#6ee7b7] uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="font-body text-[11px] text-[#9c8e72] leading-tight mt-0.5 truncate">
                    {devModeActive
                      ? 'All stages unlocked · Unlimited Coins & Gems'
                      : 'Enter access code for Developer Mode'}
                  </span>
                </div>
              </div>

              <Sprite3SliceButton
                variant="iron"
                active={devModeActive}
                onClick={() => {
                  soundManager.playUiClick();
                  setDevModalOpen(true);
                }}
                className="min-w-[96px] shrink-0"
              >
                DEVELOPER
              </Sprite3SliceButton>
            </GothicRow9Slice>
          </div>

          {/* Custom Interactive Sprite Scrollbar */}
          <SpriteScrollbar scrollRef={scrollRef} />
        </div>

        {/* FOOTER */}
        <footer className="relative z-20 shrink-0 flex flex-col items-center pt-2.5 gap-1.5">
          <Sprite3SliceButton
            variant="done"
            onClick={handleClose}
            className="w-full max-w-[280px]"
          >
            DONE
          </Sprite3SliceButton>
          <button
            type="button"
            onClick={handleVersionTap}
            className="text-[10px] font-mono tracking-widest text-[#8f7f6c]/75 hover:text-[#c7b396] transition-colors px-2 py-0.5 cursor-pointer select-none"
          >
            {BOSS2.debugVersionLabel}
          </button>
        </footer>
      </GothicPanel9Slice>

      <BossAnimPreviewModal
        isOpen={bossPreviewOpen}
        onClose={() => setBossPreviewOpen(false)}
      />

      <DeveloperModeModal
        isOpen={devModalOpen}
        onClose={() => setDevModalOpen(false)}
      />
    </div>
  );
};
