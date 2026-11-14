/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LobbyTabId, TitleScreen } from './components/TitleScreen';
import { ShopSubTab } from './components/lobby/ShopPage';
import { HUD } from './components/HUD';
import { LevelUpModal } from './components/LevelUpModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { MissionCompleteToast } from './components/MissionCompleteToast';
import { AchievementToast } from './components/AchievementToast';
import { ForgedIronFrame, IronButton } from './components/ForgedIronFrame';
import { LoadingScreen } from './components/LoadingScreen';
import { gameManager, GraphicsConfig } from './game/GameManager';
import { createPhaserGame } from './game/phaserConfig';
import { soundManager } from './game/audio';
import { saveDataStore } from './game/saveData';
import { getActiveRelicSynergies } from './game/relics';
import {
  ActiveDynamicChallenge,
  BossInfo,
  DebugStats,
  DpsSample,
  DynamicChallengeOffer,
  EventWarningInfo,
  RelicId,
  RelicSetId,
  RunStats,
  UpgradeOption,
  WeaponState,
} from './game/types';
import { Play, RotateCcw, Settings } from 'lucide-react';
import { MainScene } from './game/scenes/MainScene';
import { initCapacitorMobile } from './mobile/capacitorBridge';
import { haptics } from './mobile/haptics';

export default function App() {
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('TITLE');
  const [lobbyTab, setLobbyTab] = useState<LobbyTabId>('home');
  const [lobbyShopSubTab, setLobbyShopSubTab] = useState<ShopSubTab>('market');
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(
    () => !saveDataStore.read().hasSeenHowToPlay
  );
  const [isFirstLaunchGuide, setIsFirstLaunchGuide] = useState<boolean>(
    () => !saveDataStore.read().hasSeenHowToPlay
  );
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [masterVolume, setMasterVolume] = useState<number>(soundManager.getMasterVolume());
  const [musicVolume, setMusicVolume] = useState<number>(soundManager.getMusicVolume());
  const [sfxVolume, setSfxVolume] = useState<number>(soundManager.getSfxVolume());
  const [brightness, setBrightness] = useState<number>(gameManager.getBrightness());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => haptics.isEnabled());
  const [graphicsConfig, setGraphicsConfig] = useState<GraphicsConfig>(() =>
    gameManager.getGraphicsConfig()
  );

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
  const [redShardRemainingSec, setRedShardRemainingSec] = useState<number>(0);
  const [darknessFallsRemainingSec, setDarknessFallsRemainingSec] = useState<number>(0);
  const [bloodFogRemainingSec, setBloodFogRemainingSec] = useState<number>(0);
  const [activeChallenge, setActiveChallenge] = useState<ActiveDynamicChallenge | null>(null);
  const [dashCharges, setDashCharges] = useState<number>(1);
  const [maxDashCharges, setMaxDashCharges] = useState<number>(1);
  const [dashCooldownProgress, setDashCooldownProgress] = useState<number>(1);
  const [equippedRelicIds, setEquippedRelicIds] = useState<RelicId[]>([]);
  const [activeRelicSynergies, setActiveRelicSynergies] = useState<RelicSetId[]>([]);
  const [debugStats, setDebugStats] = useState<DebugStats>({
    fps: 60,
    enemyCount: 0,
    killsPerMin: 0,
    playerDps: 0,
    currentMinute: 0,
  });
  const [dpsHistory, setDpsHistory] = useState<DpsSample[]>([{ timeSec: 0, dps: 0 }]);
  const [eventWarning, setEventWarning] = useState<EventWarningInfo | null>(null);

  // Modals
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[] | null>(null);
  const [levelUpChallenge, setLevelUpChallenge] = useState<DynamicChallengeOffer | null>(null);
  const [runSummary, setRunSummary] = useState<RunStats | null>(null);
  const [loadingOverlay, setLoadingOverlay] = useState<{
    visible: boolean;
    progress: number;
    phase: string;
    mode: 'boot' | 'arena';
  }>({
    visible: true,
    progress: 18,
    phase: 'Kindling the First Flame…',
    mode: 'boot',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastDpsSampleSecRef = useRef<number>(0);
  const loadingFinishTimerRef = useRef<number | null>(null);
  const loadingFailsafeTimerRef = useRef<number | null>(null);
  const handleTogglePauseRef = useRef<() => void>(() => {});
  const handleQuitToTitleRef = useRef<() => void>(() => {});
  const needsTapAudioResumeRef = useRef<boolean>(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const lobbyTabRef = useRef(lobbyTab);
  lobbyTabRef.current = lobbyTab;
  const showSettingsRef = useRef(showSettings);
  showSettingsRef.current = showSettings;
  const showHowToPlayRef = useRef(showHowToPlay);
  showHowToPlayRef.current = showHowToPlay;

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
      setRedShardRemainingSec(data.redShardRemainingSec ?? 0);
      setDarknessFallsRemainingSec(data.darknessFallsRemainingSec ?? 0);
      setBloodFogRemainingSec(data.bloodFogRemainingSec ?? 0);
      setActiveChallenge(data.activeChallenge ?? null);
      setDashCharges(data.dashCharges ?? 1);
      setMaxDashCharges(data.maxDashCharges ?? 1);
      setDashCooldownProgress(data.dashCooldownProgress ?? 1);
      setEquippedRelicIds(data.equippedRelicIds ?? []);
      setActiveRelicSynergies(data.activeRelicSynergies ?? []);
      setDebugStats(data.debug);

      const sampleSec = Math.max(0, Math.floor(data.time));
      const liveDps = Math.max(0, data.debug.playerDps);
      if (sampleSec > lastDpsSampleSecRef.current) {
        lastDpsSampleSecRef.current = sampleSec;
        setDpsHistory((prev) => {
          const next = [...prev, { timeSec: sampleSec, dps: liveDps }];
          if (next.length > 360) {
            const compacted: DpsSample[] = [];
            for (let i = 0; i < next.length - 120; i += 2) {
              compacted.push(next[i]);
            }
            for (let i = next.length - 120; i < next.length; i++) {
              compacted.push(next[i]);
            }
            return compacted;
          }
          return next;
        });
      } else if (sampleSec === 0 && lastDpsSampleSecRef.current === 0 && liveDps > 0) {
        setDpsHistory([{ timeSec: 0, dps: liveDps }]);
      }
    });

    const unsubLevelUp = gameManager.onLevelUp((options, challengeOffer) => {
      setLevelUpOptions(options);
      setLevelUpChallenge(challengeOffer);
    });

    const unsubGameOver = gameManager.onGameOver((stats) => {
      setEventWarning(null);
      setRunSummary(stats);
      gameManager.setGameState('GAME_OVER');
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

    const unsubLoadProgress = gameManager.onLoadProgress((payload) => {
      if (!payload.active) return;
      setLoadingOverlay((prev) => ({
        visible: true,
        progress: Math.max(prev.mode === 'arena' ? prev.progress : 0, Math.round(payload.progress * 100)),
        phase: payload.phase,
        mode: 'arena',
      }));

      if (payload.ready) {
        if (loadingFailsafeTimerRef.current !== null) {
          window.clearTimeout(loadingFailsafeTimerRef.current);
          loadingFailsafeTimerRef.current = null;
        }
        if (loadingFinishTimerRef.current !== null) {
          window.clearTimeout(loadingFinishTimerRef.current);
        }
        loadingFinishTimerRef.current = window.setTimeout(() => {
          loadingFinishTimerRef.current = null;
          setLoadingOverlay((prev) => ({ ...prev, visible: false }));
        }, 280);
      }
    });

    return () => {
      unsubStats();
      unsubLevelUp();
      unsubGameOver();
      unsubBoss();
      unsubEventWarning();
      unsubTogglePause();
      unsubLoadProgress();
    };
  }, []);

  // Smooth initial app boot entrance until fonts & shell hydrate
  useEffect(() => {
    let cancelled = false;
    const t1 = window.setTimeout(() => {
      if (!cancelled) {
        setLoadingOverlay((prev) =>
          prev.mode === 'boot' && prev.visible
            ? { ...prev, progress: 64, phase: 'Forging Obsidian Sanctuary…' }
            : prev
        );
      }
    }, 180);

    const finalizeBoot = () => {
      if (cancelled) return;
      setLoadingOverlay((prev) =>
        prev.mode === 'boot' && prev.visible
          ? { ...prev, progress: 100, phase: 'Lantern Lit…' }
          : prev
      );
      window.setTimeout(() => {
        if (!cancelled) {
          setLoadingOverlay((prev) =>
            prev.mode === 'boot' ? { ...prev, visible: false } : prev
          );
        }
      }, 320);
    };

    const maxWait = window.setTimeout(finalizeBoot, 950);
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      window.setTimeout(finalizeBoot, 460);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(maxWait);
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
        if (showHowToPlayRef.current) {
          saveDataStore.update((draft) => {
            draft.hasSeenHowToPlay = true;
          });
          setShowHowToPlay(false);
          return true;
        }
        if (showSettingsRef.current) {
          setShowSettings(false);
          return true;
        }
        if (gameStateRef.current === 'TITLE' && lobbyTabRef.current !== 'home') {
          setLobbyTab('home');
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
    setShowSettings(false);
    setShowHowToPlay(false);

    if (loadingFinishTimerRef.current !== null) {
      window.clearTimeout(loadingFinishTimerRef.current);
      loadingFinishTimerRef.current = null;
    }
    if (loadingFailsafeTimerRef.current !== null) {
      window.clearTimeout(loadingFailsafeTimerRef.current);
      loadingFailsafeTimerRef.current = null;
    }

    setLoadingOverlay({
      visible: true,
      progress: 8,
      phase: 'Summoning the Dark Warden…',
      mode: 'arena',
    });

    loadingFailsafeTimerRef.current = window.setTimeout(() => {
      loadingFailsafeTimerRef.current = null;
      setLoadingOverlay((prev) => ({ ...prev, progress: 100, visible: false }));
    }, 6000);

    gameManager.setGameState('PLAYING');
    setGameState('PLAYING');
    setLevelUpOptions(null);
    setLevelUpChallenge(null);
    setRunSummary(null);
    setBoss(null);
    setEventWarning(null);
    setCombo(1);
    setIsUnderPressure(false);
    setLightShardRemainingSec(0);
    setRedShardRemainingSec(0);
    setDarknessFallsRemainingSec(0);
    setBloodFogRemainingSec(0);
    setActiveChallenge(null);
    setDashCharges(1);
    setMaxDashCharges(1);
    setDashCooldownProgress(1);
    lastDpsSampleSecRef.current = 0;
    setDpsHistory([{ timeSec: 0, dps: 0 }]);
    const savedRelicIds = saveDataStore.read().equippedRelicIds;
    setEquippedRelicIds(savedRelicIds);
    setActiveRelicSynergies(getActiveRelicSynergies(savedRelicIds).map((s) => s.id));

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

  const handleGraphicsConfigChange = (partial: Partial<GraphicsConfig>) => {
    const next = gameManager.updateGraphicsConfig(partial);
    setGraphicsConfig(next);
  };

  const handleOpenSettings = () => {
    soundManager.playUiClick();
    if (gameState === 'PLAYING') {
      handleTogglePause();
    }
    setShowSettings(true);
  };

  const handleCloseHowToPlay = () => {
    saveDataStore.update((draft) => {
      draft.hasSeenHowToPlay = true;
    });
    setShowHowToPlay(false);
    setIsFirstLaunchGuide(false);
  };

  const handleOpenHowToPlayFromSettings = () => {
    setIsFirstLaunchGuide(false);
    setShowHowToPlay(true);
  };

  // Toggle pause: handles physics, timers, tweens, anims, DarknessScene, audio without conflicting with level up
  const handleTogglePause = () => {
    soundManager.playUiClick();
    if (gameState === 'PLAYING') {
      gameManager.setGameState('PAUSED');
      setGameState('PAUSED');
      if (gameManager.activeScene) {
        (gameManager.activeScene as MainScene).pauseGame();
      } else {
        soundManager.pauseAudio();
      }
    } else if (gameState === 'PAUSED') {
      gameManager.setGameState('PLAYING');
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

  const navigateToLobbyPage = (tab: LobbyTabId = 'home', shopSubTab: ShopSubTab = 'market') => {
    soundManager.playUiClick();
    if (loadingFinishTimerRef.current !== null) {
      window.clearTimeout(loadingFinishTimerRef.current);
      loadingFinishTimerRef.current = null;
    }
    if (loadingFailsafeTimerRef.current !== null) {
      window.clearTimeout(loadingFailsafeTimerRef.current);
      loadingFailsafeTimerRef.current = null;
    }
    setLoadingOverlay((prev) => ({ ...prev, visible: false }));
    setLevelUpOptions(null);
    setLobbyTab(tab);
    setLobbyShopSubTab(shopSubTab);
    gameManager.setGameState('TITLE');
    setGameState('TITLE');
    // Destroy Phaser game first because WebAudioSoundManager.destroy() suspends a shared AudioContext
    if (gameManager.phaserGame) {
      gameManager.phaserGame.destroy(true);
      gameManager.phaserGame = null;
    }
    soundManager.resumeAudio();
    soundManager.playMenu();
  };

  const handleQuitToTitle = () => {
    navigateToLobbyPage('home', 'market');
  };
  handleQuitToTitleRef.current = handleQuitToTitle;

  const handleSelectUpgrade = (option: UpgradeOption, acceptChallenge: boolean) => {
    setLevelUpOptions(null);
    setLevelUpChallenge(null);
    if (gameManager.activeScene) {
      (gameManager.activeScene as MainScene).applyUpgrade(option, acceptChallenge);
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

      {/* Screen: Full-Screen Multi-Page Lobby */}
      {gameState === 'TITLE' && (
        <TitleScreen
          isMuted={isMuted}
          isModalOpen={showSettings || showHowToPlay}
          initialTab={lobbyTab}
          initialShopSubTab={lobbyShopSubTab}
          onTabChange={(tab, sub) => {
            setLobbyTab(tab);
            if (sub) setLobbyShopSubTab(sub);
          }}
          onStartGame={handleStartGame}
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
          redShardRemainingSec={redShardRemainingSec}
          darknessFallsRemainingSec={darknessFallsRemainingSec}
          bloodFogRemainingSec={bloodFogRemainingSec}
          activeChallenge={activeChallenge}
          dashCharges={dashCharges}
          maxDashCharges={maxDashCharges}
          dashCooldownProgress={dashCooldownProgress}
          equippedRelicIds={equippedRelicIds}
          activeRelicSynergies={activeRelicSynergies}
          eventWarning={eventWarning}
          isMuted={isMuted}
          isPaused={gameState === 'PAUSED'}
          onToggleMute={handleToggleMute}
          onOpenSettings={handleOpenSettings}
          onTogglePause={handleTogglePause}
          onSpawnBossNow={handleSpawnBossNow}
          onTriggerDash={() => {
            if (gameManager.activeScene) {
              (gameManager.activeScene as MainScene).triggerDash();
            }
          }}
        />
      )}

      {/* Pause Screen Overlay: Hidden whenever Settings or HowToPlay sub-modal is open */}
      {gameState === 'PAUSED' && !showSettings && !showHowToPlay && (
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

      {/* Modal: Settings (hidden cleanly while HowToPlay sub-modal is open so close buttons never stack) */}
      <SettingsModal
        isOpen={showSettings && !showHowToPlay}
        onClose={() => setShowSettings(false)}
        masterVolume={masterVolume}
        musicVolume={musicVolume}
        sfxVolume={sfxVolume}
        brightness={brightness}
        isMuted={isMuted}
        hapticsEnabled={hapticsEnabled}
        graphicsConfig={graphicsConfig}
        debugStats={debugStats}
        dpsHistory={dpsHistory}
        onMasterVolumeChange={handleMasterVolumeChange}
        onMusicVolumeChange={handleMusicVolumeChange}
        onSfxVolumeChange={handleSfxVolumeChange}
        onBrightnessChange={handleBrightnessChange}
        onToggleMute={handleToggleMute}
        onToggleHaptics={handleToggleHaptics}
        onGraphicsConfigChange={handleGraphicsConfigChange}
        onOpenHowToPlay={handleOpenHowToPlayFromSettings}
      />

      {/* Modal: How to Play (First Launch & Settings Guide) */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        isFirstLaunch={isFirstLaunchGuide}
        onClose={handleCloseHowToPlay}
      />

      {/* Modal: Level-Up Card Selection */}
      {levelUpOptions && (
        <LevelUpModal
          options={levelUpOptions}
          challengeOffer={levelUpChallenge}
          onSelectUpgrade={handleSelectUpgrade}
        />
      )}

      {/* Modal: Game Over / Run Summary */}
      {gameState === 'GAME_OVER' && runSummary && (
        <GameOverModal
          stats={runSummary}
          isModalOpen={showSettings || showHowToPlay}
          onRestart={handleStartGame}
          onQuitToTitle={handleQuitToTitle}
          onOpenShop={(tab = 'upgrades') =>
            navigateToLobbyPage('shop', tab === 'relics' ? 'relics' : 'market')
          }
          onOpenMissions={() => navigateToLobbyPage('missions')}
        />
      )}

      {/* Global Non-Blocking Daily Mission & Achievement Toasts */}
      <MissionCompleteToast />
      <AchievementToast />

      {/* Smooth Transition Loading Screen (App Boot + Arena Preload) */}
      <LoadingScreen
        visible={loadingOverlay.visible}
        progress={loadingOverlay.progress}
        phase={loadingOverlay.phase}
        mode={loadingOverlay.mode}
      />
    </main>
  );
}
