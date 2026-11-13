import React from 'react';
import { Volume2, VolumeX, X, Sparkles, Music, Zap, Sliders, Sun, Smartphone } from 'lucide-react';
import { soundManager } from '../game/audio';
import {
  HAPTIC_DURATION_MAX_MS,
  HAPTIC_DURATION_MIN_MS,
  haptics,
} from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  brightness: number;
  isMuted: boolean;
  hapticsEnabled: boolean;
  hapticDuration: number;
  onMasterVolumeChange: (val: number) => void;
  onMusicVolumeChange: (val: number) => void;
  onSfxVolumeChange: (val: number) => void;
  onBrightnessChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleHaptics: () => void;
  onHapticDurationChange: (ms: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterVolume,
  musicVolume,
  sfxVolume,
  brightness,
  isMuted,
  hapticsEnabled,
  hapticDuration,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onBrightnessChange,
  onToggleMute,
  onToggleHaptics,
  onHapticDurationChange,
}) => {
  if (!isOpen) return null;

  const masterPercent = Math.round(masterVolume * 100);
  const musicPercent = Math.round(musicVolume * 100);
  const sfxPercent = Math.round(sfxVolume * 100);
  const brightnessPercent = Math.round(brightness * 100);

  const handleTestSfx = () => {
    soundManager.initCtx(true);
    soundManager.playGemPickup();
  };

  const handleTestShoot = () => {
    soundManager.initCtx(true);
    soundManager.playPlayerAttack();
  };

  const handleHapticPreview = () => {
    if (hapticsEnabled) {
      haptics.tap('light');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad backdrop-blur-md select-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.82) 0%, rgba(30, 10, 13, 0.92) 100%)',
      }}
    >
      <ForgedIronFrame
        seed="settings-modal-panel"
        dripCount={3}
        maxDripLength={20}
        className="w-full max-w-md flex flex-col max-h-[90vh]"
        contentClassName="relative p-6 sm:p-7 flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button (56px touch target) */}
        <IronButton
          seed="settings-close-btn"
          dripCount={0}
          onClick={onClose}
          className="absolute top-4 right-4 w-14 h-14 min-h-[56px] min-w-[56px] z-20"
          aria-label="Close Settings"
        >
          <X className="w-4 h-4 text-[#d8c9a8]" />
        </IronButton>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pr-16 shrink-0">
          <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#3a3f47] flex items-center justify-center text-[#d8c9a8]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold tracking-wider text-[#d8c9a8]">
              SETTINGS
            </h2>
            <p className="text-xs text-[#9c8e72]">Audio, light &amp; tactile controls</p>
          </div>
        </div>

        {/* Sliders & Controls */}
        <div className="flex flex-col gap-5 mb-6">
          {/* Master Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#d8c9a8] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#e5303a]" />
                <span>Master Volume</span>
              </span>
              <span className="font-mono-numbers text-[#d8c9a8] font-semibold">
                {isMuted ? 'Muted' : `${masterPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              disabled={isMuted}
              style={
                {
                  '--slider-accent': '#b3121a',
                  '--slider-glow': 'rgba(229, 48, 58, 0.5)',
                } as React.CSSProperties
              }
              className={`df-slider w-full cursor-pointer transition-opacity ${
                isMuted ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
              }`}
              aria-label="Master volume"
            />
          </div>

          {/* Music Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#d8c9a8] flex items-center gap-2">
                <Music className="w-4 h-4 text-[#b3121a]" />
                <span>Music Volume</span>
              </span>
              <span className="font-mono-numbers text-[#d8c9a8] font-semibold">
                {isMuted ? 'Muted' : `${musicPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : musicVolume}
              onChange={(e) => onMusicVolumeChange(parseFloat(e.target.value))}
              disabled={isMuted}
              style={
                {
                  '--slider-accent': '#b3121a',
                  '--slider-glow': 'rgba(229, 48, 58, 0.45)',
                } as React.CSSProperties
              }
              className={`df-slider w-full cursor-pointer transition-opacity ${
                isMuted ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
              }`}
              aria-label="Music volume"
            />
          </div>

          {/* SFX Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#d8c9a8] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#f2a93b]" />
                <span>SFX Volume</span>
              </span>
              <span className="font-mono-numbers text-[#d8c9a8] font-semibold">
                {isMuted ? 'Muted' : `${sfxPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : sfxVolume}
              onChange={(e) => onSfxVolumeChange(parseFloat(e.target.value))}
              disabled={isMuted}
              style={
                {
                  '--slider-accent': '#f2a93b',
                  '--slider-glow': 'rgba(242, 169, 59, 0.4)',
                } as React.CSSProperties
              }
              className={`df-slider w-full cursor-pointer transition-opacity ${
                isMuted ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
              }`}
              aria-label="SFX volume"
            />
          </div>

          {/* Lantern Brightness (50% - 150%, cyan light accent) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#d8c9a8] flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#5de4ff]" />
                <span>Lantern Brightness</span>
              </span>
              <span className="font-mono-numbers text-[#5de4ff] font-semibold">
                {brightnessPercent}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.01"
              value={brightness}
              onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
              style={
                {
                  '--slider-accent': '#5de4ff',
                  '--slider-glow': 'rgba(93, 228, 255, 0.45)',
                } as React.CSSProperties
              }
              className="df-slider w-full cursor-pointer"
              aria-label="Brightness"
            />
          </div>

          <div className="h-px bg-[#3a3f47]/70 w-full" />

          {/* Tactile Feedback Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone
                  className={`w-4 h-4 ${hapticsEnabled ? 'text-[#f2a93b]' : 'text-[#8e8168]'}`}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#d8c9a8]">Tactile Feedback</span>
                  <span className="text-[11px] text-[#8e8168]">
                    {hapticsEnabled ? 'Haptics enabled on tap' : 'Haptics disabled'}
                  </span>
                </div>
              </div>

              <IronButton
                seed="settings-haptics-toggle"
                dripCount={0}
                variant={hapticsEnabled ? 'blood' : 'default'}
                onClick={() => {
                  soundManager.playUiClick();
                  onToggleHaptics();
                }}
                className="min-h-[56px] min-w-[92px] px-5 text-xs font-semibold"
                aria-pressed={hapticsEnabled}
                aria-label={hapticsEnabled ? 'Disable Tactile Feedback' : 'Enable Tactile Feedback'}
              >
                <span className={hapticsEnabled ? 'text-[#d8c9a8]' : 'text-[#8e8168]'}>
                  {hapticsEnabled ? 'On' : 'Off'}
                </span>
              </IronButton>
            </div>

            {/* Vibration Duration / Intensity Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-[#d8c9a8]">Pulse Intensity</span>
                <span className="font-mono-numbers text-[#f2a93b] font-semibold">
                  {hapticsEnabled ? `${hapticDuration} ms` : 'Off'}
                </span>
              </div>
              <input
                type="range"
                min={HAPTIC_DURATION_MIN_MS}
                max={HAPTIC_DURATION_MAX_MS}
                step={1}
                value={hapticDuration}
                onChange={(e) => onHapticDurationChange(parseInt(e.target.value, 10))}
                onPointerUp={handleHapticPreview}
                onTouchEnd={handleHapticPreview}
                onKeyUp={handleHapticPreview}
                disabled={!hapticsEnabled}
                style={
                  {
                    '--slider-accent': '#f2a93b',
                    '--slider-glow': 'rgba(242, 169, 59, 0.45)',
                  } as React.CSSProperties
                }
                className={`df-slider w-full cursor-pointer transition-opacity ${
                  !hapticsEnabled ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
                }`}
                aria-label="Haptic vibration duration"
              />
            </div>
          </div>

          <div className="h-px bg-[#3a3f47]/70 w-full" />

          {/* Mute Toggle Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#e5303a]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#9c8e72]" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#d8c9a8]">Mute All Audio</span>
                <span className="text-[11px] text-[#8e8168]">
                  {isMuted ? 'Audio muted' : 'Audio enabled'}
                </span>
              </div>
            </div>

            <IronButton
              seed="settings-mute-toggle"
              dripCount={0}
              variant={isMuted ? 'blood' : 'default'}
              onClick={() => {
                soundManager.playUiClick();
                onToggleMute();
              }}
              className="min-h-[56px] px-5 text-xs font-semibold"
            >
              <span className={isMuted ? 'text-[#e5303a]' : 'text-[#d8c9a8]'}>
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </IronButton>
          </div>

          {/* Preview Audio Row */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#9c8e72]">Preview Audio</span>
            <div className="flex items-center gap-2">
              <IronButton
                seed="settings-test-attack"
                dripCount={0}
                onClick={handleTestShoot}
                className="min-h-[56px] px-4 text-xs font-medium"
              >
                <Zap className="w-3.5 h-3.5 text-[#e5303a]" />
                <span>Attack</span>
              </IronButton>
              <IronButton
                seed="settings-test-gem"
                dripCount={0}
                onClick={handleTestSfx}
                className="min-h-[56px] px-4 text-xs font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f2a93b]" />
                <span>Gem</span>
              </IronButton>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <IronButton
          seed="settings-done-btn"
          variant="blood"
          dripCount={2}
          onClick={onClose}
          className="w-full min-h-[56px] font-semibold text-sm tracking-wide shrink-0"
        >
          Done
        </IronButton>
      </ForgedIronFrame>
    </div>
  );
};
