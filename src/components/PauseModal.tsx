import React, { useEffect } from 'react';
import { soundManager } from '../game/audio';
import { RELIC_SETS, getRelicById } from '../game/relics';
import {
  RelicDefinition,
  RelicId,
  RelicSetId,
  WeaponState,
} from '../game/types';
import {
  UI_ASSETS,
  preloadAllChromaKeyUiAssets,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { getWeaponFrameRarity } from './HUD';
import { Icon } from './Icon';
import { IronCard } from './IronCard';

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
  const { processedSrc: playBtnSrc, hasError: playBtnError } = useChromaKeyImage(UI_ASSETS.btnPlay);

  useEffect(() => {
    preloadAllChromaKeyUiAssets();
  }, []);

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
      className="fixed inset-0 flex flex-col items-center justify-center safe-area-pad z-50 select-none overflow-y-auto py-3"
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        background: 'rgba(5, 8, 12, 0.8)',
      }}
    >
      <div className="w-[92%] max-w-[390px] flex flex-col my-auto">
        <IronCard
          highlight="blood"
          className="w-full"
          contentClassName="p-5 sm:p-6 flex flex-col items-center text-center"
        >
          <h2
            id="pause-modal-title"
            className="font-display font-black text-2xl sm:text-3xl tracking-[0.14em] uppercase"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #fff1c7 0%, #eab24e 52%, #a26318 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter:
                'drop-shadow(0 2px 0 #170805) drop-shadow(0 0 12px rgba(242, 169, 59, 0.35))',
            }}
          >
            PAUSED
          </h2>

          <div
            aria-hidden="true"
            className="w-3/4 h-[2px] my-2 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #7d0d13 20%, #e5303a 50%, #7d0d13 80%, transparent 100%)',
              boxShadow: '0 0 10px rgba(229, 48, 58, 0.65)',
            }}
          />

          <p className="font-body text-xs sm:text-sm font-medium text-[#cbbba0] mb-3">
            The lantern rests in the dark
          </p>

          {/* Arsenal & Relics Inspection Tray (Moved off live HUD for uncluttered combat) */}
          {(unlockedWeapons.length > 0 || equippedRelics.length > 0) && (
            <div className="w-full mb-4 rounded-[8px] bg-[#0a0c10]/85 border border-[#3a3f47]/65 p-2.5 text-left max-h-[175px] overflow-y-auto shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="font-display text-[10px] font-bold tracking-[0.12em] uppercase text-[#9c8e72]">
                  Active Arsenal
                </span>
                <span className="font-display text-[10px] font-bold text-[#f2c464]">
                  {unlockedWeapons.length} Weapons · {equippedRelics.length} Relics
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {unlockedWeapons.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-start gap-2.5 rounded-[6px] bg-[#13161c]/90 border border-[#2d323b]/70 px-2 py-1.5"
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon id={w.name} rarity={getWeaponFrameRarity(w)} size={32} />
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
                    className="flex items-start gap-2.5 rounded-[6px] bg-[#13161c]/90 border border-[#2d323b]/70 px-2 py-1.5"
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon id={relic.name} rarity={relic.rarity} size={32} />
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
                    className="flex items-start gap-2.5 rounded-[6px] bg-[#18140d]/90 border border-[#f2a93b]/45 px-2 py-1.5"
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
            </div>
          )}

          <div className="flex flex-col gap-2.5 w-full">
            {/* Primary Button: RESUME using btn_play.png */}
            <button
              type="button"
              onClick={() => {
                haptics.tap('medium');
                onResume();
              }}
              className="group relative w-full h-[60px] flex items-center justify-center gap-2.5 transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
            >
              {playBtnSrc ? (
                <img
                  src={playBtnSrc}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  style={{
                    filter: 'drop-shadow(0 0 16px rgba(220, 38, 38, 0.55))',
                  }}
                  className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none"
                />
              ) : playBtnError ? (
                <div
                  aria-hidden="true"
                  style={{
                    filter: 'drop-shadow(0 0 16px rgba(220, 38, 38, 0.55))',
                  }}
                  className="pointer-events-none absolute inset-0 rounded-[10px] rusted-play-bar border border-[#942027]"
                />
              ) : null}

              <span className="relative z-10 flex items-center justify-center">
                <Icon id="ui_play" size={20} />
              </span>
              <span
                className="relative z-10 font-display font-black text-[17px] tracking-[0.16em] uppercase whitespace-nowrap"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #fff1c7 0%, #eab24e 52%, #a26318 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter:
                    'drop-shadow(0 0 10px rgba(242, 169, 59, 0.6)) drop-shadow(0 2px 0 #1b0705)',
                }}
              >
                RESUME
              </span>
            </button>

            {/* Secondary: RESTART */}
            <IronCard
              asButton
              onClick={() => {
                haptics.tap('medium');
                onRestart();
              }}
              className="w-full h-[56px] active:scale-95"
              contentClassName="h-full px-4 flex items-center justify-center gap-2.5"
            >
              <Icon id="ui_restart" size={20} />
              <span className="font-display font-bold text-[14px] tracking-[0.12em] text-[#ede0c4] whitespace-nowrap">
                RESTART
              </span>
            </IronCard>

            {/* Secondary: SETTINGS */}
            <IronCard
              asButton
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onOpenSettings();
              }}
              className="w-full h-[56px] active:scale-95"
              contentClassName="h-full px-4 flex items-center justify-center gap-2.5"
            >
              <Icon id="ui_settings" size={20} />
              <span className="font-display font-bold text-[14px] tracking-[0.12em] text-[#ede0c4] whitespace-nowrap">
                SETTINGS
              </span>
            </IronCard>

            {/* Secondary: QUIT TO MENU */}
            <IronCard
              asButton
              onClick={() => {
                haptics.tap('light');
                onQuitToTitle();
              }}
              className="w-full h-[56px] active:scale-95"
              contentClassName="h-full px-4 flex items-center justify-center gap-2.5"
            >
              <Icon id="nav_home" size={20} />
              <span className="font-display font-bold text-[14px] tracking-[0.12em] text-[#ede0c4] whitespace-nowrap">
                QUIT TO MENU
              </span>
            </IronCard>
          </div>
        </IronCard>
      </div>
    </div>
  );
};
