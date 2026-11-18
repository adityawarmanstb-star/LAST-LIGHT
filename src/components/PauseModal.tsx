import React, { useRef } from 'react';
import { soundManager } from '../game/audio';
import { RELIC_SETS, getRelicById } from '../game/relics';
import {
  RelicDefinition,
  RelicId,
  RelicSetId,
  WeaponState,
} from '../game/types';
import { haptics } from '../mobile/haptics';
import { getWeaponFrameRarity } from './HUD';
import { Icon } from './Icon';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiChainDivider, UiScrollbar } from './ui/UiControls';
import { UI_SPRITES } from './ui/uiConfig';

interface PauseModalProps {
  weapons: WeaponState[];
  equippedRelicIds?: RelicId[];
  activeRelicSynergies?: RelicSetId[];
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onQuitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  weapons,
  equippedRelicIds = [],
  activeRelicSynergies = [],
  onResume,
  onRestart,
  onOpenSettings,
  onQuitToTitle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const unlockedWeapons = weapons.filter((w) => w.unlocked);
  const equippedRelics = equippedRelicIds
    .map((id) => getRelicById(id))
    .filter((relic): relic is RelicDefinition => relic !== null);
  const activeSynergies = activeRelicSynergies
    .map((id) => RELIC_SETS[id])
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 flex flex-col items-center justify-center safe-area-pad z-50 select-none overflow-y-auto overflow-x-hidden py-3"
      style={{
        background: 'rgba(4, 5, 8, 0.88)',
      }}
    >
      <div className="w-full max-w-[540px] flex flex-col my-auto px-1">
        <NineSlice
          variant="panelIronDark"
          tileTexture="stone"
          highlight="blood"
          className="w-full shadow-[0_18px_44px_rgba(0,0,0,0.95)]"
          contentClassName="flex flex-col items-center text-center px-3 sm:px-4 py-3 sm:py-4"
        >
          <h2
            id="pause-modal-title"
            className="font-display font-black text-[clamp(22px,4.8vw,30px)] tracking-[0.16em] uppercase text-[#f2c464]"
            style={{ textShadow: '0 2px 3px #170805' }}
          >
            PAUSED
          </h2>

          <UiChainDivider className="my-1.5" />

          <p className="font-body text-xs sm:text-sm font-medium text-[#cbbba0] mb-3">
            The lantern rests in the dark
          </p>

          {/* Arsenal & Relics Inspection Tray */}
          {(unlockedWeapons.length > 0 || equippedRelics.length > 0) && (
            <NineSlice
              variant="plateWideIron"
              tileTexture="row"
              padding="0px"
              borderWidth="clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 16px)"
              className="w-full mb-3.5 text-left"
              contentClassName="px-2.5 py-2 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="font-display text-[10px] font-bold tracking-[0.12em] uppercase text-[#b9aa8b]">
                  Active Arsenal
                </span>
                <span className="font-display text-[10px] font-bold text-[#f2c464]">
                  {unlockedWeapons.length} Weapons · {equippedRelics.length} Relics
                </span>
              </div>

              <div className="flex gap-1.5 max-h-[168px]">
                <div
                  ref={scrollRef}
                  className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-1.5 pr-0.5"
                >
                  {unlockedWeapons.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-start gap-2.5 rounded-[6px] bg-[#101318]/90 border border-[#2d323b]/80 px-2 py-1.5"
                    >
                      <div className="relative w-9 h-9 aspect-square shrink-0 flex items-center justify-center">
                        <img
                          src={UI_SPRITES.roundSquareSocket}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                          className="absolute inset-0 w-full h-full object-contain select-none"
                        />
                        <div className="relative z-10 flex items-center justify-center">
                          <Icon id={w.name} rarity={getWeaponFrameRarity(w)} size={24} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-[11px] font-bold text-[#ede0c4] truncate">
                            {w.name}
                          </span>
                          <span className="font-display text-[10px] font-extrabold text-[#f2c464] shrink-0 tabular-nums">
                            LV. {w.level}/{w.maxLevel}
                          </span>
                        </div>
                        <p className="font-body text-[11px] leading-snug text-[#9c8e72]">
                          {w.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  {equippedRelics.map((relic) => (
                    <div
                      key={relic.id}
                      className="flex items-start gap-2.5 rounded-[6px] bg-[#101318]/90 border border-[#2d323b]/80 px-2 py-1.5"
                    >
                      <div className="relative w-9 h-9 aspect-square shrink-0 flex items-center justify-center">
                        <img
                          src={UI_SPRITES.roundSquareSocket}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                          className="absolute inset-0 w-full h-full object-contain select-none"
                        />
                        <div className="relative z-10 flex items-center justify-center">
                          <Icon id={relic.name} rarity={relic.rarity} size={24} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-[11px] font-bold text-[#ede0c4] truncate">
                            {relic.name}
                          </span>
                          <span
                            className="font-display text-[9px] font-bold uppercase shrink-0"
                            style={{ color: relic.accentColor }}
                          >
                            Relic
                          </span>
                        </div>
                        <p className="font-body text-[11px] leading-snug text-[#9c8e72]">
                          {relic.effectSummary}
                        </p>
                      </div>
                    </div>
                  ))}

                  {activeSynergies.map((synergy) => (
                    <div
                      key={synergy.id}
                      className="flex items-start gap-2.5 rounded-[6px] bg-[#18140d]/95 border border-[#f2a93b]/50 px-2 py-1.5"
                    >
                      <div className="shrink-0 mt-0.5">
                        <Icon id={synergy.synergyTitle} size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className="font-display text-[10.5px] font-bold uppercase tracking-wide block"
                          style={{ color: synergy.accentColor }}
                        >
                          {synergy.synergyTitle}
                        </span>
                        <p className="font-body text-[11px] leading-snug text-[#cbbba0]">
                          {synergy.bonusSummary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <UiScrollbar scrollRef={scrollRef} />
              </div>
            </NineSlice>
          )}

          <div className="flex flex-col gap-2 w-full">
            <UiButton
              tone="blood"
              size="lg"
              haptic="medium"
              onClick={onResume}
              className="w-full"
            >
              <Icon id="ui_play" size={18} />
              <span>RESUME</span>
            </UiButton>

            <UiButton
              tone="iron"
              size="md"
              haptic="medium"
              onClick={onRestart}
              className="w-full"
            >
              <Icon id="ui_restart" size={18} />
              <span>RESTART</span>
            </UiButton>

            <UiButton
              tone="iron"
              size="md"
              onClick={() => {
                soundManager.playUiClick();
                onOpenSettings();
              }}
              className="w-full"
            >
              <Icon id="ui_settings" size={18} />
              <span>SETTINGS</span>
            </UiButton>

            <UiButton
              tone="iron"
              size="md"
              onClick={onQuitToTitle}
              className="w-full"
            >
              <Icon id="nav_home" size={18} />
              <span>QUIT TO MENU</span>
            </UiButton>
          </div>
        </NineSlice>
      </div>
    </div>
  );
};
