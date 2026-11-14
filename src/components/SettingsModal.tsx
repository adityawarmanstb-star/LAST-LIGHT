import React from 'react';
import {
  Activity,
  BookOpen,
  Cpu,
  Gauge,
  Monitor,
  Music,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { soundManager } from '../game/audio';
import { GraphicsConfig } from '../game/GameManager';
import { ResolutionQualityMode, TargetFpsOption } from '../game/saveData';
import { DebugStats, DpsSample } from '../game/types';
import { IronButton } from './ForgedIronFrame';
import { IronCard } from './IronCard';
import { PerformanceChart } from './PerformanceChart';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  brightness: number;
  isMuted: boolean;
  hapticsEnabled: boolean;
  graphicsConfig: GraphicsConfig;
  debugStats: DebugStats;
  dpsHistory: DpsSample[];
  onMasterVolumeChange: (val: number) => void;
  onMusicVolumeChange: (val: number) => void;
  onSfxVolumeChange: (val: number) => void;
  onBrightnessChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleHaptics: () => void;
  onGraphicsConfigChange: (partial: Partial<GraphicsConfig>) => void;
  onOpenHowToPlay: () => void;
}

const FPS_OPTIONS: TargetFpsOption[] = [60, 90, 120];
const RESOLUTION_OPTIONS: { id: ResolutionQualityMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Dynamic' },
  { id: 'performance', label: '90 FPS', hint: '810p' },
  { id: 'fhd', label: 'FHD+', hint: '1080p' },
  { id: 'ultra_4k', label: '4K UHD', hint: '2160p' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterVolume,
  musicVolume,
  sfxVolume,
  brightness,
  isMuted,
  hapticsEnabled,
  graphicsConfig,
  debugStats,
  dpsHistory,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onBrightnessChange,
  onToggleMute,
  onToggleHaptics,
  onGraphicsConfigChange,
  onOpenHowToPlay,
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
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="text-xl font-display font-bold tracking-wider text-[#e8dcc2]"
              >
                SETTINGS
              </h2>
              <p className="font-body text-xs text-[#b5a589]">
                Audio, display, 90Hz/4K tuning &amp; performance
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

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Master Volume */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#e5303a]" />
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
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Music className="w-4 h-4 text-[#b3121a]" />
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
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#f2a93b]" />
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

          {/* Lantern Brightness */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="font-body text-sm text-[#e8dcc2] flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#5de4ff]" />
                <span>Lantern Brightness</span>
              </span>
              <span className="font-mono-numbers text-[#5de4ff] font-bold">
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

          {/* Mute Toggle Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#e5303a]" />
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

          {/* Haptic Feedback Toggle Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Smartphone
                className={`w-4 h-4 ${hapticsEnabled ? 'text-[#5de4ff]' : 'text-[#9c8e72]'}`}
              />
              <div className="flex flex-col">
                <span className="font-body text-sm font-bold text-[#e8dcc2]">Haptic Feedback</span>
                <span className="font-body text-xs text-[#9c8e72]">
                  {hapticsEnabled ? 'Vibrates on hit & level-up' : 'Vibration disabled'}
                </span>
              </div>
            </div>

            <IronButton
              seed="settings-haptics-toggle"
              dripCount={0}
              variant={hapticsEnabled ? 'default' : 'blood'}
              onClick={() => {
                soundManager.playUiClick();
                onToggleHaptics();
              }}
              className="min-h-[48px] px-5 text-xs font-display font-bold"
            >
              <span className={hapticsEnabled ? 'text-[#5de4ff]' : 'text-[#9c8e72]'}>
                {hapticsEnabled ? 'On' : 'Off'}
              </span>
            </IronButton>
          </div>

          <div className="h-px bg-[#3a3f47]/70 w-full" />

          {/* Graphics, 90Hz/120Hz & 4K Upscaler Section */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-display font-bold tracking-wider text-[#e8dcc2] flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#5de4ff]" />
                <span>GRAPHICS &amp; 4K ENGINE</span>
              </span>
              <span className="text-xs text-[#9c8e72] font-mono-numbers">
                {graphicsConfig.targetFps}Hz Target
              </span>
            </div>

            {/* Target FPS Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-body text-xs text-[#9c8e72]">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#f2a93b]" />
                  <span>Target Frame Rate</span>
                </span>
                <span className="text-[#e8dcc2] font-semibold">Android Smooth Lock</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FPS_OPTIONS.map((fps) => {
                  const selected = graphicsConfig.targetFps === fps;
                  return (
                    <IronButton
                      key={fps}
                      seed={`settings-fps-${fps}`}
                      dripCount={0}
                      variant={selected ? 'blood' : 'default'}
                      onClick={() => {
                        soundManager.playUiClick();
                        onGraphicsConfigChange({ targetFps: fps });
                      }}
                      className="min-h-[46px] px-2 text-xs font-mono-numbers font-bold"
                    >
                      <span className={selected ? 'text-[#5de4ff]' : 'text-[#e8dcc2]'}>
                        {fps} FPS
                      </span>
                    </IronButton>
                  );
                })}
              </div>
            </div>

            {/* Render Resolution Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-body text-xs text-[#9c8e72]">
                <span>Render Resolution</span>
                <span className="text-[#b5a589]">
                  {graphicsConfig.resolutionMode === 'ultra_4k'
                    ? 'Native 2160x3840 4K'
                    : graphicsConfig.resolutionMode === 'auto'
                      ? 'Adaptive DRS'
                      : 'Locked Scale'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RESOLUTION_OPTIONS.map((opt) => {
                  const selected = graphicsConfig.resolutionMode === opt.id;
                  return (
                    <IronButton
                      key={opt.id}
                      seed={`settings-res-${opt.id}`}
                      dripCount={0}
                      variant={selected ? 'blood' : 'default'}
                      onClick={() => {
                        soundManager.playUiClick();
                        onGraphicsConfigChange({ resolutionMode: opt.id });
                      }}
                      className="min-h-[48px] px-2 text-xs"
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span
                          className={`font-display font-bold ${
                            selected ? 'text-[#f2a93b]' : 'text-[#e8dcc2]'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="font-body text-[11px] text-[#9c8e72]">{opt.hint}</span>
                      </div>
                    </IronButton>
                  );
                })}
              </div>
            </div>

            {/* GPU Edge-Adaptive 4K Upscaler */}
            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    graphicsConfig.upscalerEnabled ? 'text-[#5de4ff]' : 'text-[#9c8e72]'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="font-body text-sm font-bold text-[#e8dcc2]">GPU 4K Upscaler</span>
                  <span className="font-body text-xs text-[#9c8e72]">
                    Contrast-adaptive edge sharpening
                  </span>
                </div>
              </div>

              <IronButton
                seed="settings-upscaler-toggle"
                dripCount={0}
                variant={graphicsConfig.upscalerEnabled ? 'default' : 'blood'}
                onClick={() => {
                  soundManager.playUiClick();
                  onGraphicsConfigChange({ upscalerEnabled: !graphicsConfig.upscalerEnabled });
                }}
                className="min-h-[46px] px-5 text-xs font-display font-bold shrink-0"
              >
                <span
                  className={graphicsConfig.upscalerEnabled ? 'text-[#5de4ff]' : 'text-[#9c8e72]'}
                >
                  {graphicsConfig.upscalerEnabled ? 'On' : 'Off'}
                </span>
              </IronButton>
            </div>

            {/* Frame Generation & Temporal Pacing */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cpu
                  className={`w-4 h-4 shrink-0 ${
                    graphicsConfig.frameGenEnabled ? 'text-[#5de4ff]' : 'text-[#9c8e72]'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="font-body text-sm font-bold text-[#e8dcc2]">
                    Frame Gen &amp; Pacing
                  </span>
                  <span className="font-body text-xs text-[#9c8e72]">
                    Temporal lighting &amp; zero-drop smoothing
                  </span>
                </div>
              </div>

              <IronButton
                seed="settings-framegen-toggle"
                dripCount={0}
                variant={graphicsConfig.frameGenEnabled ? 'default' : 'blood'}
                onClick={() => {
                  soundManager.playUiClick();
                  onGraphicsConfigChange({ frameGenEnabled: !graphicsConfig.frameGenEnabled });
                }}
                className="min-h-[46px] px-5 text-xs font-display font-bold shrink-0"
              >
                <span
                  className={graphicsConfig.frameGenEnabled ? 'text-[#5de4ff]' : 'text-[#9c8e72]'}
                >
                  {graphicsConfig.frameGenEnabled ? 'On' : 'Off'}
                </span>
              </IronButton>
            </div>
          </div>

          <div className="h-px bg-[#3a3f47]/70 w-full" />

          {/* PERFORMANCE Debug Metrics (Moved from HUD into Settings Modal) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-display font-bold tracking-wider text-[#e8dcc2] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#e5303a]" />
                <span>PERFORMANCE</span>
              </span>
              <span className="font-mono-numbers text-xs text-[#5de4ff] font-bold">
                {debugStats.fps} FPS
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 rounded-[8px] border border-[#3a3f47] bg-[#0e1014] p-2.5 text-center">
              <div>
                <div className="font-body text-[11px] text-[#9c8e72]">Enemies</div>
                <div className="font-mono-numbers text-xs font-bold text-[#e8dcc2]">
                  {debugStats.enemyCount}
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] text-[#9c8e72]">Kills/min</div>
                <div className="font-mono-numbers text-xs font-bold text-[#e8dcc2]">
                  {debugStats.killsPerMin}
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] text-[#9c8e72]">DPS</div>
                <div className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
                  {debugStats.playerDps}
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] text-[#9c8e72]">Minute</div>
                <div className="font-mono-numbers text-xs font-bold text-[#5de4ff]">
                  {debugStats.currentMinute}
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-[#3a3f47] bg-[#0e1014] p-2.5">
              <PerformanceChart
                samples={dpsHistory}
                currentDps={debugStats.playerDps}
                width={320}
                height={108}
              />
            </div>
          </div>

          <div className="h-px bg-[#3a3f47]/70 w-full" />

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
                <Zap className="w-3.5 h-3.5 text-[#e5303a]" />
                <span>Attack</span>
              </IronButton>
              <IronButton
                seed="settings-test-gem"
                dripCount={0}
                onClick={handleTestSfx}
                className="min-h-[46px] px-4 text-xs font-display font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f2a93b]" />
                <span>Gem</span>
              </IronButton>
            </div>
          </div>

          {/* How to Play Guide Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-[#5de4ff]" />
              <div className="flex flex-col">
                <span className="font-body text-sm font-bold text-[#e8dcc2]">How to Play</span>
                <span className="font-body text-xs text-[#9c8e72]">Touch controls &amp; survival guide</span>
              </div>
            </div>

            <IronButton
              seed="settings-how-to-play-btn"
              dripCount={0}
              onClick={() => {
                soundManager.playUiClick();
                onOpenHowToPlay();
              }}
              className="min-h-[46px] px-4 text-xs font-display font-bold whitespace-nowrap shrink-0"
            >
              <span>View Guide</span>
            </IronButton>
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
