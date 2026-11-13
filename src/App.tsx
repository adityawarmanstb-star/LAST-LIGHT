/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { LevelUpModal } from './components/LevelUpModal';
import { CampShopModal } from './components/CampShopModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { ForgedIronFrame, IronButton } from './components/ForgedIronFrame';
import { gameManager } from './game/GameManager';
import { createPhaserGame } from './game/phaserConfig';
import { soundManager } from './game/audio';
import { BossInfo, DebugStats, EventWarningInfo, RunStats, UpgradeOption, WeaponState } from './game/types';
import { Play, RotateCcw, Settings } from 'lucide-react';
import { MainScene } from './game/scenes/MainScene';
import { initCapacitorMobile } from './mobile/capacitorBridge';
import { haptics } from './mobile/haptics';

export default function App() {
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('TITLE');
  const [showShop, setShowShop] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [masterVolume, setMasterVolume] = useState<number>(soundManager.getMasterVolume());
  const [musicVolume, setMusicVolume] = useState<number>(soundManager.getMusicVolume());
  const [sfxVolume, setSfxVolume] = useState<number>(soundManager.getSfxVolume());
  const [brightness, setBrightness] = useState<number>(gameManager.getBrightness());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => haptics.isEnabled());

  // In-run state
  const [hp, setHp] = useState<number>(100);
  const [maxHp, setMaxHp] = useState<number>(100);
  const [xp, setXp] = useState<number>(0);
  const [nextXp, setNextXp] = useState<number>(8);
  const [level, setLevel] = useState<number>(1);
  const [time, setTime] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [weapons, setWeapons] = useState<WeaponState[]>([]);
  const [boss, setBoss] = useState<BossInfo | null>(null);
  const [combo, setCombo] = useState<number>(1);
  const [isUnderPressure, setIsUnderPressure] = useState<boolean>(false);
  const [lightShardRemainingSec, setLightShardRemainingSec] = useState<number>(0);
  const [darknessFallsRemainingSec, setDarknessFallsRemainingSec] = useState<number>(0);
  const [debugStats, setDebugStats] = useState<DebugStats>({
    fps: 60,
    enemyCount: 0,
    killsPerMin: 0,
    playerDps: 0,
    currentMinute: 0,
  });
  const [eventWarning, setEventWarning] = useState<EventWarningInfo | null>(null);

  // Modals
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[] | null>(null);
  const [runSummary, setRunSummary] = useState<RunStats | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const handleTogglePauseRef = useRef<() => void>(() => {});
  const handleQuitToTitleRef = useRef<() => void>(() => {});
  const needsTapAudioResumeRef = useRef<boolean>(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const showShopRef = useRef(showShop);
  showShopRef.current = showShop;
  const showMissionsRef = useRef(showMissions);
  showMissionsRef.current = showMissions;
  const showSettingsRef = useRef(showSettings);
  showSettingsRef.current = showSettings;

  // Subscribe to GameManager events once
  useEffect(() => {
    const unsubStats = gameManager.onStatsUpdate((data) => {
      setHp(data.hp);
      setMaxHp(data.maxHp);
      setXp(data.xp);
      setNextXp(data.nextXp);
      setLevel(data.level);
      setTime(data.time);
      setKills(data.kills);
      setCoins(data.coins);
      setWeapons(data.weapons);
      setCombo(data.combo);
      setIsUnderPressure(data.isUnderPressure);
      setLightShardRemainingSec(data.lightShardRemainingSec ?? 0);
      setDarknessFallsRemainingSec(data.darknessFallsRemainingSec ?? 0);
      setDebugStats(data.debug);
    });

    const unsubLevelUp = gameManager.onLevelUp((options) => {
      setLevelUpOptions(options);
    });

    const unsubGameOver = gameManager.onGameOver((stats) => {
      setEventWarning(null);
      setRunSummary(stats);
      setGameState('GAME_OVER');
    });

    const unsubBoss = gameManager.onBossUpdate((bossData) => {
      setBoss(bossData);
    });

    const unsubEventWarning = gameManager.onEventWarning((warning) => {
      setEventWarning(warning);
    });

    // Single coordinator for pause toggle requests from UIScene pause button
    const unsubTogglePause = gameManager.onTogglePause(() => {
      handleTogglePauseRef.current();
    });

    return () => {
      unsubStats();
      unsubLevelUp();
      unsubGameOver();
      unsubBoss();
      unsubEventWarning();
      unsubTogglePause();
    };
  }, []);

  // Play menu music on title screen
  useEffect(() => {
    if (gameState === 'TITLE') {
      soundManager.playMenu();
    }
  }, [gameState]);

  // Handle keyboard (P / Esc) for Pause (works even when level-up card modal is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
          console.log('pause pressed');
          handleTogglePauseRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-pause game, timers, and audio when backgrounded; resume audio on tap/focus return
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        needsTapAudioResumeRef.current = true;
        if (gameStateRef.current === 'PLAYING') {
          console.log('pause pressed');
          handleTogglePauseRef.current();
        } else {
          soundManager.pauseAudio();
        }
      } else if (gameStateRef.current !== 'PAUSED') {
        soundManager.handleFocusReturn();
      }
    };

    const handleBlur = () => {
      if (gameStateRef.current === 'PLAYING') {
        console.log('pause pressed');
        handleTogglePauseRef.current();
      }
    };

    const handleFocus = () => {
      if (gameStateRef.current !== 'PAUSED') {
        soundManager.handleFocusReturn();
      }
    };

    const handleFirstTapAfterReturn = () => {
      if (needsTapAudioResumeRef.current) {
        needsTapAudioResumeRef.current = false;
        soundManager.onUserGesture();
        if (gameStateRef.current !== 'PAUSED') {
          soundManager.resumeAudio();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pointerdown', handleFirstTapAfterReturn, { passive: true });
    window.addEventListener('touchstart', handleFirstTapAfterReturn, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pointerdown', handleFirstTapAfterReturn);
      window.removeEventListener('touchstart', handleFirstTapAfterReturn);
    };
  }, []);

  // Mobile WebView hardening: disable long-press context menu & pinch-zoom gestures
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventGesture = (e: Event) => e.preventDefault();
    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1 && e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('touchmove', preventPinchZoom, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('touchmove', preventPinchZoom);
    };
  }, []);

  // Initialize Capacitor Android fullscreen mode, background pause, and hardware back button
  useEffect(() => {
    return initCapacitorMobile({
      onBackButton: () => {
        if (showSettingsRef.current) {
          setShowSettings(false);
          return true;
        }
        if (showMissionsRef.current) {
          setShowMissions(false);
          return true;
        }
        if (showShopRef.current) {
          setShowShop(false);
          return true;
        }
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
          handleTogglePauseRef.current();
          return true;
        }
        if (gameStateRef.current === 'GAME_OVER') {
          handleQuitToTitleRef.current();
          return true;
        }
        return false;
      },
      onAppBackground: () => {
        needsTapAudioResumeRef.current = true;
        if (gameStateRef.current === 'PLAYING') {
          handleTogglePauseRef.current();
        } else {
          soundManager.pauseAudio();
        }
      },
      onAppForeground: () => {
        if (gameStateRef.current !== 'PAUSED') {
          soundManager.handleFocusReturn();
        }
      },
    });
  }, []);

  const handleStartGame = () => {
    setGameState('PLAYING');
    setLevelUpOptions(null);
    setRunSummary(null);
    setBoss(null);
    setEventWarning(null);
    setCombo(1);
    setIsUnderPressure(false);
    setLightShardRemainingSec(0);
    setDarknessFallsRemainingSec(0);

    // Unlock audio on user gesture & play gameplay track
    soundManager.onUserGesture();
    soundManager.resumeAudio();
    soundManager.playGameplay();

    // Initialize or restart Phaser Game
    createPhaserGame('phaser-container');
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleMasterVolumeChange = (val: number) => {
    soundManager.setMasterVolume(val);
    setMasterVolume(val);
  };

  const handleMusicVolumeChange = (val: number) => {
    soundManager.setMusicVolume(val);
    setMusicVolume(val);
  };

  const handleSfxVolumeChange = (val: number) => {
    soundManager.setSfxVolume(val);
    setSfxVolume(val);
  };

  const handleBrightnessChange = (val: number) => {
    gameManager.setBrightness(val);
    setBrightness(val);
  };

  const handleToggleHaptics = () => {
    const next = haptics.toggle();
    setHapticsEnabled(next);
  };

  const handleOpenSettings = () => {
    soundManager.playUiClick();
    if (gameState === 'PLAYING') {
      handleTogglePause();
    }
    setShowSettings(true);
  };

  // Toggle pause: handles physics, timers, tweens, anims, DarknessScene, audio without conflicting with level up
  const handleTogglePause = () => {
    soundManager.playUiClick();
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
      if (gameManager.activeScene) {
        (gameManager.activeScene as MainScene).pauseGame();
      } else {
        soundManager.pauseAudio();
      }
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
      // If level-up card selection is active, physics stay paused until card choice, but audio resumes
      if (!levelUpOptions && gameManager.activeScene) {
        (gameManager.activeScene as MainScene).resumeGame();
      } else {
        soundManager.resumeAudio();
      }
    }
  };
  handleTogglePauseRef.current = handleTogglePause;

  const handleRestartGame = () => {
    soundManager.playUiClick();
    setLevelUpOptions(null);
    handleStartGame();
  };

  const handleQuitToTitle = () => {
    soundManager.playUiClick();
    setLevelUpOptions(null);
    setGameState('TITLE');
    // Destroy Phaser game first because WebAudioSoundManager.destroy() suspends a shared AudioContext
    if (gameManager.phaserGame) {
      gameManager.phaserGame.destroy(true);
      gameManager.phaserGame = null;
    }
    soundManager.resumeAudio();
    soundManager.playMenu();
  };
  handleQuitToTitleRef.current = handleQuitToTitle;

  const handleSelectUpgrade = (option: UpgradeOption) => {
    setLevelUpOptions(null);
    if (gameManager.activeScene) {
      (gameManager.activeScene as MainScene).applyUpgrade(option);
    }
  };

  const handleSpawnBossNow = () => {
    if (gameManager.activeScene) {
      (gameManager.activeScene as MainScene).spawnBoss();
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#121316]">
      {/* Phaser Canvas Container */}
      <div id="phaser-container" ref={containerRef} className="absolute inset-0 z-10" />

      {/* Screen: Title Screen */}
      {gameState === 'TITLE' && (
        <TitleScreen
          isMuted={isMuted}
          isModalOpen={showShop || showSettings || showMissions}
          onStartGame={handleStartGame}
          onOpenShop={() => setShowShop(true)}
          onOpenMissions={() => setShowMissions(true)}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Screen: Active HUD during Play or Pause */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <HUD
          hp={hp}
          maxHp={maxHp}
          xp={xp}
          nextXp={nextXp}
          level={level}
          time={time}
          kills={kills}
          coins={coins}
          weapons={weapons}
          boss={boss}
          combo={combo}
          isUnderPressure={isUnderPressure}
          lightShardRemainingSec={lightShardRemainingSec}
          darknessFallsRemainingSec={darknessFallsRemainingSec}
          debugStats={debugStats}
          eventWarning={eventWarning}
          isMuted={isMuted}
          isPaused={gameState === 'PAUSED'}
          onToggleMute={handleToggleMute}
          onOpenSettings={handleOpenSettings}
          onTogglePause={handleTogglePause}
          onSpawnBossNow={handleSpawnBossNow}
        />
      )}

      {/* Pause Screen Overlay: Forged-iron frame with rivets, bone text & 56px iron buttons */}
      {gameState === 'PAUSED' && (
        <div
          className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-50"
          style={{
            background:
              'radial-gradient(circle at center, rgba(16, 14, 16, 0.8) 0%, rgba(34, 8, 12, 0.9) 100%)',
          }}
        >
          <ForgedIronFrame
            seed="pause-menu-panel"
            dripCount={4}
            maxDripLength={22}
            className="max-w-sm w-full"
            contentClassName="p-6 sm:p-7 text-center"
          >
            <h2 className="text-2xl font-display font-bold tracking-wider text-[#d8c9a8] mb-1.5">
              PAUSED
            </h2>
            <p className="text-xs text-[#9c8e72] mb-6">
              The lantern rests in the dark
            </p>
            <div className="flex flex-col gap-3">
              <IronButton
                seed="pause-resume-btn"
                variant="blood"
                dripCount={2}
                onClick={handleTogglePause}
                className="w-full min-h-[56px] px-6 font-display font-bold text-sm tracking-wider"
              >
                <Play className="w-4 h-4 fill-[#e5303a] text-[#e5303a]" />
                <span>Resume</span>
              </IronButton>

              <IronButton
                seed="pause-restart-btn"
                dripCount={2}
                onClick={handleRestartGame}
                className="w-full min-h-[56px] px-6 text-sm font-semibold"
              >
                <RotateCcw className="w-4 h-4 text-[#e5303a]" />
                <span>Restart</span>
              </IronButton>

              <IronButton
                seed="pause-settings-btn"
                dripCount={2}
                onClick={() => setShowSettings(true)}
                className="w-full min-h-[56px] px-6 text-sm font-semibold"
              >
                <Settings className="w-4 h-4 text-[#d8c9a8]" />
                <span>Settings</span>
              </IronButton>

              <IronButton
                seed="pause-quit-btn"
                dripCount={2}
                onClick={handleQuitToTitle}
                className="w-full min-h-[56px] px-6 text-sm font-medium"
              >
                <span className="text-[#b3a487] group-hover:text-[#d8c9a8]">Quit to Menu</span>
              </IronButton>
            </div>
          </ForgedIronFrame>
        </div>
      )}

      {/* Modal: Settings (Master / Music / SFX / Brightness / Haptics Sliders & Toggles) */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        masterVolume={masterVolume}
        musicVolume={musicVolume}
        sfxVolume={sfxVolume}
        brightness={brightness}
        isMuted={isMuted}
        hapticsEnabled={hapticsEnabled}
        onMasterVolumeChange={handleMasterVolumeChange}
        onMusicVolumeChange={handleMusicVolumeChange}
        onSfxVolumeChange={handleSfxVolumeChange}
        onBrightnessChange={handleBrightnessChange}
        onToggleMute={handleToggleMute}
        onToggleHaptics={handleToggleHaptics}
      />

      {/* Modal: Level-Up Card Selection */}
      {levelUpOptions && (
        <LevelUpModal
          options={levelUpOptions}
          onSelectUpgrade={handleSelectUpgrade}
        />
      )}

      {/* Modal: Game Over / Run Summary */}
      {gameState === 'GAME_OVER' && runSummary && (
        <GameOverModal
          stats={runSummary}
          isModalOpen={showShop || showMissions}
          onRestart={handleStartGame}
          onOpenShop={() => setShowShop(true)}
          onOpenMissions={() => setShowMissions(true)}
        />
      )}

      {/* Modal: Daily Missions */}
      {showMissions && (
        <DailyMissionsModal onClose={() => setShowMissions(false)} />
      )}

      {/* Modal: Permanent Camp Upgrades Forge */}
      {showShop && (
        <CampShopModal onClose={() => setShowShop(false)} />
      )}
    </main>
  );
}
