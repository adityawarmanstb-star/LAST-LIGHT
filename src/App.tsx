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
import { PauseModal } from './components/PauseModal';
import { DifficultyModal } from './components/DifficultyModal';
import { LoadingScreen } from './components/LoadingScreen';
import { DarkFantasyTouchFx } from './components/DarkFantasyTouchFx';
import { gameManager } from './game/GameManager';
import { createPhaserGame } from './game/phaserConfig';
import { soundManager } from './game/audio';
import { saveDataStore } from './game/saveData';
import { getActiveRelicSynergies } from './game/relics';
import { preloadAllGameAssets } from './game/assetPreloader';
import {
  ActiveDynamicChallenge,
  BossInfo,
  DynamicChallengeOffer,
  EventWarningInfo,
  GameDifficultyId,
  RelicId,
  RelicSetId,
  RunStats,
  UpgradeOption,
  WeaponState,
} from './game/types';
import { MainScene } from './game/scenes/MainScene';
import { initCapacitorMobile } from './mobile/capacitorBridge';

export default function App() {
  const [gameState, setGameState] = useState<'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('TITLE');
  const [bootReady, setBootReady] = useState(false);
  const [bootOverlayDone, setBootOverlayDone] = useState(false);
  const [lobbyTab, setLobbyTab] = useState<LobbyTabId>('home');
  const [lobbyShopSubTab, setLobbyShopSubTab] = useState<ShopSubTab>('market');
  const [showSettings, setShowSettings] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficultyId>(() =>
    gameManager.getDifficulty()
  );
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
  const [bloodFogTier, setBloodFogTier] = useState<number>(0);
  const [activeChallenge, setActiveChallenge] = useState<ActiveDynamicChallenge | null>(null);
  const [dashCharges, setDashCharges] = useState<number>(1);
  const [maxDashCharges, setMaxDashCharges] = useState<number>(1);
  const [dashCooldownProgress, setDashCooldownProgress] = useState<number>(1);
  const [equippedRelicIds, setEquippedRelicIds] = useState<RelicId[]>([]);
  const [activeRelicSynergies, setActiveRelicSynergies] = useState<RelicSetId[]>([]);
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
    progress: 0,
    phase: 'Kindling the First Flame…',
    mode: 'boot',
  });

  const containerRef = useRef<HTMLDivElement>(null);
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
  const showDifficultyModalRef = useRef(showDifficultyModal);
  showDifficultyModalRef.current = showDifficultyModal;
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
      setBloodFogTier(data.bloodFogTier ?? 0);
      setActiveChallenge(data.activeChallenge ?? null);
      setDashCharges(data.dashCharges ?? 1);
      setMaxDashCharges(data.maxDashCharges ?? 1);
      setDashCooldownProgress(data.dashCooldownProgress ?? 1);
      setEquippedRelicIds(data.equippedRelicIds ?? []);
      setActiveRelicSynergies(data.activeRelicSynergies ?? []);
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
        setLoadingOverlay((prev) => ({
          ...prev,
          progress: 100,
          phase: payload.phase,
          visible: false,
        }));
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
      if (loadingFailsafeTimerRef.current !== null) {
        window.clearTimeout(loadingFailsafeTimerRef.current);
        loadingFailsafeTimerRef.current = null;
      }
    };
  }, []);

  // Preload ALL fonts, UI images, chroma icons, atlases, arena/bestiary sprites & audio during boot LoadingScreen
  useEffect(() => {
    let cancelled = false;

    preloadAllGameAssets((pct, phase) => {
      if (cancelled) return;
      setLoadingOverlay((prev) =>
        prev.mode === 'boot' && prev.visible
          ? {
              ...prev,
              progress: Math.max(prev.progress, pct),
              phase,
            }
          : prev
      );
    }).then(() => {
      if (cancelled) return;
      setBootReady(true);
      setLoadingOverlay((prev) =>
        prev.mode === 'boot'
          ? { ...prev, progress: 100, phase: 'Lantern Lit…', visible: false }
          : prev
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Play menu music on title screen once boot assets are ready
  useEffect(() => {
    if (bootReady && gameState === 'TITLE') {
      soundManager.playMenu();
    }
  }, [bootReady, gameState]);

  // Handle keyboard (P / Esc) for Pause (works even when level-up card modal is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
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
        if (showDifficultyModalRef.current) {
          setShowDifficultyModal(false);
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
    setShowDifficultyModal(false);

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
      const scene = gameManager.activeScene as MainScene | null;
      if (scene && scene.sys?.isActive()) {
        scene.setWaitingForLoading(false);
      }
    }, 8000);

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
    setBloodFogTier(0);
    setActiveChallenge(null);
    setDashCharges(1);
    setMaxDashCharges(1);
    setDashCooldownProgress(1);
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

  const handleOpenDifficultyModal = () => {
    setSelectedDifficulty(gameManager.getDifficulty());
    setShowDifficultyModal(true);
  };

  const handleSelectDifficulty = (difficulty: GameDifficultyId) => {
    setSelectedDifficulty(difficulty);
    gameManager.setDifficulty(difficulty);
  };

  const handleConfirmDifficultyPlay = () => {
    gameManager.setDifficulty(selectedDifficulty);
    setShowDifficultyModal(false);
    handleStartGame();
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

  // Toggle pause: handles physics, timers, tweens, anims, DarknessScene, audio without conflicting with level up
  const handleTogglePause = () => {
    soundManager.playUiClick();
    const scene = gameManager.activeScene as MainScene | null;
    const isSceneReady = Boolean(scene && scene.sys?.isActive());
    if (gameState === 'PLAYING') {
      gameManager.setGameState('PAUSED');
      setGameState('PAUSED');
      if (isSceneReady && scene) {
        scene.pauseGame();
      } else {
        soundManager.pauseAudio();
      }
    } else if (gameState === 'PAUSED') {
      gameManager.setGameState('PLAYING');
      setGameState('PLAYING');
      // If level-up card selection is active, physics stay paused until card choice, but audio resumes
      if (!levelUpOptions && isSceneReady && scene) {
        scene.resumeGame();
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
      try {
        gameManager.phaserGame.destroy(true);
      } catch (err) {
        console.warn('[App] Phaser destroy error:', err);
      }
      gameManager.phaserGame = null;
      gameManager.activeScene = null;
      gameManager.activeUiScene = null;
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
    const scene = gameManager.activeScene as MainScene | null;
    if (scene && scene.sys?.isActive()) {
      scene.applyUpgrade(option, acceptChallenge);
    }
  };

  const handleSpawnBossNow = () => {
    const scene = gameManager.activeScene as MainScene | null;
    if (scene && scene.sys?.isActive()) {
      scene.spawnBoss();
    }
  };

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-[#08090d]">
      {/* Phaser Canvas Container */}
      <div id="phaser-container" ref={containerRef} className="absolute inset-0 z-10" />

      {/* Screen: Full-Screen Multi-Page Lobby (mounted only after full boot preload completes) */}
      {bootReady && gameState === 'TITLE' && (
        <TitleScreen
          isMuted={isMuted}
          isModalOpen={showSettings || (bootOverlayDone && showHowToPlay) || showDifficultyModal}
          initialTab={lobbyTab}
          initialShopSubTab={lobbyShopSubTab}
          onTabChange={(tab, sub) => {
            setLobbyTab(tab);
            if (sub) setLobbyShopSubTab(sub);
          }}
          onStartGame={handleOpenDifficultyModal}
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
          bloodFogTier={bloodFogTier}
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
            const scene = gameManager.activeScene as MainScene | null;
            if (scene && scene.sys?.isActive()) {
              scene.triggerDash();
            }
          }}
        />
      )}

      {/* Pause Screen Overlay: Hidden whenever Settings or HowToPlay sub-modal is open */}
      {gameState === 'PAUSED' && !showSettings && !showHowToPlay && (
        <PauseModal
          weapons={weapons}
          equippedRelicIds={equippedRelicIds}
          activeRelicSynergies={activeRelicSynergies}
          onResume={handleTogglePause}
          onRestart={handleRestartGame}
          onOpenSettings={() => setShowSettings(true)}
          onQuitToTitle={handleQuitToTitle}
        />
      )}

      {/* Modal: Settings (Audio only) */}
      <SettingsModal
        isOpen={showSettings && !showHowToPlay}
        onClose={() => setShowSettings(false)}
        masterVolume={masterVolume}
        musicVolume={musicVolume}
        sfxVolume={sfxVolume}
        isMuted={isMuted}
        onMasterVolumeChange={handleMasterVolumeChange}
        onMusicVolumeChange={handleMusicVolumeChange}
        onSfxVolumeChange={handleSfxVolumeChange}
        onToggleMute={handleToggleMute}
      />

      {/* Modal: Difficulty Selection before entering arena */}
      <DifficultyModal
        isOpen={gameState === 'TITLE' && showDifficultyModal}
        selectedDifficulty={selectedDifficulty}
        onSelectDifficulty={handleSelectDifficulty}
        onConfirmPlay={handleConfirmDifficultyPlay}
        onClose={() => setShowDifficultyModal(false)}
      />

      {/* Modal: How to Play (First Launch & Settings Guide) */}
      <HowToPlayModal
        isOpen={bootOverlayDone && showHowToPlay}
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

      {/* Dark-Fantasy Touch Spark & SFX Layer for Beranda Buttons */}
      <DarkFantasyTouchFx active={bootOverlayDone && gameState === 'TITLE'} />

      {/* Smooth Transition Loading Screen (App Boot + Arena Preload) */}
      <LoadingScreen
        visible={loadingOverlay.visible}
        progress={loadingOverlay.progress}
        phase={loadingOverlay.phase}
        mode={loadingOverlay.mode}
        onTransitionEnd={() => {
          setBootOverlayDone(true);
          const scene = gameManager.activeScene as MainScene | null;
          if (scene && scene.sys?.isActive()) {
            scene.setWaitingForLoading(false);
          }
        }}
      />
    </main>
  );
}
