import React from 'react';
import {
  Music,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import { IronButton } from './ForgedIronFrame';
import { IronCard } from './IronCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  onMasterVolumeChange: (val: number) => void;
  onMusicVolumeChange: (val: number) => void;
  onSfxVolumeChange: (val: number) => void;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterVolume,
  musicVolume,
  sfxVolume,
  isMuted,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  const masterPercent = Math.round(masterVolume * 100);
  const musicPercent = Math.round(musicVolume * 100);
  const sfxPercent = Math.round(sfxVolume * 100);

  const handleTestSfx = () => {
    soundManager.initCtx(true);
    soundManager.playGemPickup();
  };

  const handleTestShoot = () => {
    soundManager.initCtx(true);
    soundManager.playPlayerAttack();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad backdrop-blur-md select-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.84) 0%, rgba(30, 10, 13, 0.94) 100%)',
      }}
    >
      <IronCard
        highlight="blood"
        className="w-full max-w-md max-h-[90vh] flex flex-col"
        contentClassName="flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-[#3a3f47]/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#4a4f59] flex items-center justify-center text-[#d8c9a8] shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="text-xl font-display font-bold tracking-wider text-[#e8dcc2]"
              >
                AUDIO SETTINGS
              </h2>
              <p className="font-body text-xs text-[#b5a589]">
                Master, music &amp; sound effects
              </p>
            </div>
          </div>

          <IronButton
            seed="settings-close-btn"
            dripCount={0}
            onClick={onClose}
            className="w-12 h-12 min-h-[48px] min-w-[48px] shrink-0"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Scrollable Body (Audio Settings Only) */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Master Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#b32b32]" />
                <span>Master Volume</span>
              </span>
              <span className="font-mono-numbers text-[#e8dcc2] font-bold">
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
                  '--slider-fill': '#7d1c22',
                  '--slider-pct': `${isMuted ? 0 : masterPercent}%`,
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
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Music className="w-4 h-4 text-[#9e242a]" />
                <span>Music Volume</span>
              </span>
              <span className="font-mono-numbers text-[#e8dcc2] font-bold">
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
                  '--slider-fill': '#6b1a20',
                  '--slider-pct': `${isMuted ? 0 : musicPercent}%`,
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
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#c98f3a]" />
                <span>SFX Volume</span>
              </span>
              <span className="font-mono-numbers text-[#e8dcc2] font-bold">
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
                  '--slider-fill': '#856028',
                  '--slider-pct': `${isMuted ? 0 : sfxPercent}%`,
                } as React.CSSProperties
              }
              className={`df-slider w-full cursor-pointer transition-opacity ${
                isMuted ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
              }`}
              aria-label="SFX volume"
            />
          </div>

          <div className="h-px bg-[#3a3f47]/70 w-full" />

          {/* Mute Toggle Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#b32b32]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#9c8e72]" />
              )}
              <div className="flex flex-col">
                <span className="font-body text-sm font-bold text-[#e8dcc2]">Mute All Audio</span>
                <span className="font-body text-xs text-[#9c8e72]">
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
              className="min-h-[48px] px-5 text-xs font-display font-bold"
            >
              <span className={isMuted ? 'text-[#e5303a]' : 'text-[#e8dcc2]'}>
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </IronButton>
          </div>

          {/* Preview Audio Row */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-body text-sm text-[#b5a589]">Preview Audio</span>
            <div className="flex items-center gap-2">
              <IronButton
                seed="settings-test-attack"
                dripCount={0}
                onClick={handleTestShoot}
                className="min-h-[46px] px-4 text-xs font-display font-bold"
              >
                <Zap className="w-3.5 h-3.5 text-[#b32b32]" />
                <span>Attack</span>
              </IronButton>
              <IronButton
                seed="settings-test-gem"
                dripCount={0}
                onClick={handleTestSfx}
                className="min-h-[46px] px-4 text-xs font-display font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c98f3a]" />
                <span>Gem</span>
              </IronButton>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-[#3a3f47]/80 bg-[#0d0e11]/70 shrink-0">
          <IronButton
            seed="settings-done-btn"
            variant="blood"
            dripCount={2}
            onClick={onClose}
            className="w-full min-h-[52px] font-display font-bold text-sm tracking-wider"
          >
            Done
          </IronButton>
        </div>
      </IronCard>
    </div>
  );
};
