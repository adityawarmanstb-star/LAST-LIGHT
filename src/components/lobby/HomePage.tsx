import React, { useEffect, useRef, useState } from 'react';
import {
  getActiveRelicSynergies,
  getEquippedRelicIds,
  getEquippedRelics,
  getMaxRelicSlots,
  getNextRelicSlotUnlockInfo,
  getRelicSeals,
  subscribeRelics,
} from '../../game/relics';
import { soundManager } from '../../game/audio';
import { gameManager } from '../../game/GameManager';
import { STAGES, formatStageTime } from '../../game/stages';
import { RelicDefinition, RelicId, StageId } from '../../game/types';
import { UI_ASSETS, useChromaKeyImage } from '../../hooks/useChromaKeyImage';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { NineSlice } from '../ui/NineSlice';
import { UiButton } from '../ui/UiButton';
import { UI_SPRITES } from '../ui/uiConfig';

interface HomePageProps {
  onStartGame: () => void;
  onOpenRelicsShop: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartGame, onOpenRelicsShop }) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [equippedRelics, setEquippedRelics] = useState<RelicDefinition[]>(() =>
    getEquippedRelics()
  );
  const [relicSeals, setRelicSeals] = useState<number>(() => getRelicSeals());
  const [maxRelicSlots, setMaxRelicSlots] = useState<number>(() => getMaxRelicSlots());
  const [selectedStageId, setSelectedStageId] = useState<StageId>(() =>
    gameManager.getSelectedStageId()
  );
  const [equipPopSeq, setEquipPopSeq] = useState<number>(0);
  const prevEquippedIdsRef = useRef<RelicId[]>(getEquippedRelicIds());
  const { processedSrc: titleLogoSrc, hasError: titleLogoError } = useChromaKeyImage(
    UI_ASSETS.gameTitleLogo
  );

  useEffect(() => {
    const unsubRelics = subscribeRelics(
      ({ equippedRelicIds, relicSeals: nextSeals, maxRelicSlots: nextSlots }) => {
        const addedRelic = equippedRelicIds.some(
          (id) => !prevEquippedIdsRef.current.includes(id)
        );
        if (addedRelic) {
          setEquipPopSeq((seq) => seq + 1);
        }
        prevEquippedIdsRef.current = [...equippedRelicIds];
        setEquippedRelics(getEquippedRelics());
        setRelicSeals(nextSeals);
        setMaxRelicSlots(nextSlots);
      }
    );
    const unsubStage = gameManager.onStageChange((stageId) => {
      setSelectedStageId(stageId);
    });
    return () => {
      unsubRelics();
      unsubStage();
    };
  }, []);

  const currentStage = STAGES[selectedStageId] ?? STAGES.stage_1;
  const currentStageBestTime = gameManager.getStageBestTime(currentStage.id);

  const activeSynergies = getActiveRelicSynergies(equippedRelics.map((r) => r.id));
  const nextSlotInfo = getNextRelicSlotUnlockInfo(maxRelicSlots);
  const canUnlockNewSlot = Boolean(nextSlotInfo && relicSeals >= nextSlotInfo.costSeals);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-evenly sm:justify-center gap-[clamp(6px,1.5vh,14px)] px-2 sm:px-3 pb-2 pt-1 overflow-y-auto overflow-x-hidden">
      {/* Embossed Metallic Title Graphic */}
      <div className="relative w-full flex flex-col items-center text-center shrink-0">
        <div
          className="absolute -inset-x-4 -inset-y-2 rounded-full opacity-55 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(168, 22, 26, 0.36) 0%, rgba(114, 52, 16, 0.16) 52%, transparent 78%)',
          }}
          aria-hidden="true"
        />

        {!titleLogoError ? (
          <img
            src={titleLogoSrc ?? UI_ASSETS.gameTitleLogo}
            alt="LAST LIGHT"
            referrerPolicy="no-referrer"
            style={{ imageRendering: 'auto' }}
            className={`relative w-[clamp(210px,68%,310px)] h-auto object-contain select-none transition-opacity duration-150 ${
              titleLogoSrc ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <h1
            className="relative font-display font-black tracking-[0.12em] text-[clamp(2rem,8.4vw,2.9rem)] leading-none whitespace-nowrap select-none text-[#f2c464]"
            style={{ textShadow: '0 3px 0 #170505, 0 6px 14px rgba(0, 0, 0, 0.96)' }}
          >
            LAST LIGHT
          </h1>
        )}

        <div className="mt-0.5 flex items-center justify-center gap-2.5">
          <span className="h-[1.5px] w-7 sm:w-10 bg-gradient-to-r from-transparent via-[#523026] to-[#8f1219]" />
          <span
            className="font-display font-extrabold text-[clamp(9.5px,2vw,11px)] tracking-[0.26em] uppercase whitespace-nowrap text-[#d6454d]"
            style={{ textShadow: '0 2px 3px rgba(0,0,0,0.98)' }}
          >
            HARDCORE ROGUELIKE
          </span>
          <span className="h-[1.5px] w-7 sm:w-10 bg-gradient-to-l from-transparent via-[#523026] to-[#8f1219]" />
        </div>
      </div>

      {/* Character Showcase: DARK WARDEN + Soft Cyan Floor Aura (zero CSS blur filter) */}
      <div className="relative flex flex-col items-center shrink-0">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 'clamp(108px, 16vh, 144px)', aspectRatio: '1 / 1' }}
        >
          <div
            className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 w-44 h-12 rounded-full lantern-floor-pool"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(93, 228, 255, 0.34) 0%, rgba(56, 152, 184, 0.14) 48%, transparent 76%)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-1 rounded-full hero-lantern-breathe"
            style={{
              background:
                'radial-gradient(circle, rgba(93, 228, 255, 0.24) 0%, rgba(36, 98, 120, 0.1) 52%, transparent 74%)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-3.5 rounded-full hero-shadow-breathe"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.92) 0%, transparent 78%)',
            }}
            aria-hidden="true"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-5 bottom-8 w-1.5 h-1.5 rounded-full bg-[#6cb7cf] hero-wisp-drift"
            style={{ '--wisp-dx': '7px', '--wisp-dur': '2.8s', '--wisp-delay': '0s' } as React.CSSProperties}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-7 bottom-6 w-1 h-1 rounded-full bg-[#c94128] hero-wisp-drift"
            style={{ '--wisp-dx': '-6px', '--wisp-dur': '3.4s', '--wisp-delay': '-1.1s' } as React.CSSProperties}
          />

          {!heroImgError ? (
            <img
              src="./assets/aistudio/player_d0a77e5b.webp"
              alt="Dark Warden"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
              className="relative z-10 w-[84%] h-[84%] object-contain hero-idle-float select-none"
            />
          ) : (
            <div className="relative z-10 w-20 h-20 rounded-full bg-[#13161c] border border-[#4f5866] flex items-center justify-center">
              <Icon id="ui_skull" size={40} />
            </div>
          )}
        </div>

        {/* Nameplate via NineSlice miniPlate */}
        <NineSlice
          variant="miniPlate"
          tileTexture="row"
          highlight="cyan"
          padding="0px"
          className="-mt-1.5 min-w-[220px] shadow-[0_8px_18px_rgba(0,0,0,0.9)]"
          contentClassName="px-4 py-1 flex items-center justify-center gap-2"
        >
          <Icon id="ui_skull" size={16} />
          <span
            className="font-display font-bold text-xs sm:text-[13px] tracking-[0.2em] text-[#ede0c4] whitespace-nowrap"
            style={{ textShadow: '0 1px 2px #000' }}
          >
            DARK WARDEN
          </span>
          <Icon id="ui_skull" size={16} />
        </NineSlice>
      </div>

      {/* Equipped Relics Section via NineSlice panelIronDark + fixed-aspect square sockets */}
      <div className="w-full max-w-[440px] flex flex-col items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            soundManager.playUiClick();
            haptics.tap('light');
            onOpenRelicsShop();
          }}
          className="w-full text-left cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
        >
          <NineSlice
            variant="panelIronDark"
            tileTexture="stone"
            highlight={activeSynergies.length > 0 ? 'gold' : 'none'}
            padding="0px"
            className="w-full shadow-[0_10px_22px_rgba(0,0,0,0.85)]"
            contentClassName="px-3 py-2 flex items-center justify-between gap-2.5"
          >
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-display font-bold text-xs tracking-[0.1em] text-[#efe3c8]">
                EQUIPPED RELICS ({equippedRelics.length}/{maxRelicSlots})
              </span>
              {activeSynergies.length > 0 ? (
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                  {activeSynergies.map((s) => (
                    <span
                      key={s.id}
                      title={`${s.synergyTitle}: ${s.bonusSummary}`}
                      className="inline-flex items-center gap-1 font-body text-xs font-semibold"
                      style={{ color: s.accentColor }}
                    >
                      <Icon id={s.synergyTitle} size={16} alt={s.synergyTitle} />
                      <span>{s.synergyTitle}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="font-body text-xs font-medium text-[#b9aa8e] leading-snug">
                  {equippedRelics.length > 0
                    ? equippedRelics.map((r) => r.name).join(' · ')
                    : 'Forge & equip bloodbound relics'}
                </span>
              )}
            </div>

            {/* Fixed-aspect square iron sockets */}
            <div className="flex items-center gap-1.5 shrink-0">
              {Array.from({ length: maxRelicSlots }).map((_, slotIdx) => {
                const slotRelic = equippedRelics[slotIdx] ?? null;
                return (
                  <div
                    key={slotRelic ? slotRelic.id : `relic-slot-${slotIdx}`}
                    title={
                      slotRelic
                        ? `${slotRelic.name} — ${slotRelic.effectSummary}`
                        : `Empty Slot ${slotIdx + 1}`
                    }
                    style={{ width: 40, aspectRatio: '1 / 1' }}
                    className={`relative flex items-center justify-center shrink-0 ${
                      slotRelic && equipPopSeq > 0 ? 'relic-equip-pop' : ''
                    }`}
                  >
                    <img
                      src={UI_SPRITES.roundSquareSocket}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{ imageRendering: 'auto' }}
                      className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
                    />
                    {slotRelic ? (
                      <span className="relative z-10 flex items-center justify-center">
                        <Icon id={slotRelic.name} rarity={slotRelic.rarity} size={32} />
                      </span>
                    ) : (
                      <span className="relative z-10 font-mono-numbers text-xs font-bold text-[#958972]">
                        {slotIdx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </NineSlice>
        </button>

        <div className="w-full flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon
              id={canUnlockNewSlot ? 'ui_lock_open' : 'ui_lock_closed'}
              size={16}
            />
            <span className="font-body text-xs font-semibold text-[#cbbba0] truncate">
              {nextSlotInfo
                ? canUnlockNewSlot
                  ? `Slot ${nextSlotInfo.nextSlotNumber} Ready to Unlock`
                  : `Slot ${nextSlotInfo.nextSlotNumber} · ${relicSeals}/${nextSlotInfo.costSeals} Gems`
                : `All ${maxRelicSlots} Relic Slots Forged`}
            </span>
          </div>

          <UiButton
            tone="blood"
            size="sm"
            onClick={() => {
              soundManager.playUiClick();
              onOpenRelicsShop();
            }}
          >
            {nextSlotInfo ? 'UNLOCK >' : 'RELICS >'}
          </UiButton>
        </div>
      </div>

      {/* Active Stage Banner + Main Play CTA */}
      <div className="w-full flex flex-col items-center gap-1.5 shrink-0 mt-0.5">
        <button
          type="button"
          onClick={onStartGame}
          aria-label={`Stage ${currentStage.stageNumber}: ${currentStage.name}. Tap to select stage`}
          className="w-[86%] max-w-[340px] cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
        >
          <NineSlice
            variant="miniPlate"
            tileTexture="row"
            highlight="blood"
            padding="0px"
            className="w-full shadow-[0_6px_16px_rgba(0,0,0,0.85)]"
            contentClassName="px-3 py-1.5 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon id={currentStage.id === 'stage_1' ? 'ui_skull' : 'ui_flame'} size={15} />
              <span className="font-display font-bold text-[11px] sm:text-xs tracking-[0.1em] text-[#f2dfba] uppercase truncate">
                STAGE {currentStage.stageNumber} · {currentStage.name}
              </span>
            </div>
            <span className="shrink-0 font-mono-numbers text-[10.5px] font-bold text-[#f2c464]">
              {currentStageBestTime > 0 ? `BEST ${formatStageTime(currentStageBestTime)}` : 'SELECT >'}
            </span>
          </NineSlice>
        </button>

        <UiButton
          tone="blood"
          size="lg"
          haptic="medium"
          onClick={onStartGame}
          className="w-[86%] max-w-[340px] min-h-[clamp(56px,8vh,68px)] text-[clamp(20px,4vw,26px)] tracking-[0.2em]"
        >
          <Icon id="ui_play" size={22} />
          <span className="text-[#fae6b6]">PLAY</span>
        </UiButton>

        <p className="mt-0.5 font-body text-xs font-medium tracking-wide text-[#a89a7e] text-center">
          Drag anywhere to move · Tap Dash to evade
        </p>
      </div>
    </div>
  );
};
