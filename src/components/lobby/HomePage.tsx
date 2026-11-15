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
import { RelicDefinition, RelicId } from '../../game/types';
import { UI_ASSETS, useChromaKeyImage } from '../../hooks/useChromaKeyImage';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { IronCard } from '../IronCard';

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
  const [equipPopSeq, setEquipPopSeq] = useState<number>(0);
  const prevEquippedIdsRef = useRef<RelicId[]>(getEquippedRelicIds());
  const { processedSrc: playBtnSrc, hasError: playBtnError } = useChromaKeyImage(UI_ASSETS.btnPlay);
  const { processedSrc: titleLogoSrc, hasError: titleLogoError } = useChromaKeyImage(
    UI_ASSETS.gameTitleLogo
  );

  useEffect(() => {
    return subscribeRelics(
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
  }, []);

  const activeSynergies = getActiveRelicSynergies(equippedRelics.map((r) => r.id));
  const nextSlotInfo = getNextRelicSlotUnlockInfo(maxRelicSlots);
  const canUnlockNewSlot = Boolean(nextSlotInfo && relicSeals >= nextSlotInfo.costSeals);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-evenly sm:justify-center gap-2 sm:gap-3 px-3.5 pb-2 pt-1 overflow-y-auto">
      {/* Embossed Metallic Gold-and-Iron LAST LIGHT Title Graphic */}
      <div className="relative w-full flex flex-col items-center text-center shrink-0">
        <div
          className="absolute -inset-x-4 -inset-y-2 rounded-full blur-2xl opacity-55 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(168, 22, 26, 0.4) 0%, rgba(114, 52, 16, 0.2) 52%, transparent 78%)',
          }}
          aria-hidden="true"
        />

        {!titleLogoError ? (
          <img
            src={titleLogoSrc ?? UI_ASSETS.gameTitleLogo}
            alt="LAST LIGHT"
            referrerPolicy="no-referrer"
            className={`relative w-[82%] max-w-[320px] h-auto object-contain select-none transition-opacity duration-150 ${
              titleLogoSrc ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              filter:
                'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.96)) drop-shadow(0 0 14px rgba(242, 169, 59, 0.36)) drop-shadow(0 0 18px rgba(179, 18, 26, 0.45))',
            }}
          />
        ) : (
          <h1
            className="relative font-display font-black tracking-[0.12em] text-[clamp(2.1rem,8.8vw,3rem)] leading-none whitespace-nowrap select-none"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #f9e6b4 0%, #cf9238 40%, #a61d24 74%, #4a060a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter:
                'drop-shadow(0 3px 0 #170505) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.96))',
            }}
          >
            LAST LIGHT
          </h1>
        )}

        <div className="mt-1 flex items-center justify-center gap-2.5">
          <span className="h-[1.5px] w-7 sm:w-10 bg-gradient-to-r from-transparent via-[#523026] to-[#8f1219]" />
          <span
            className="font-display font-extrabold text-[10px] sm:text-[11px] tracking-[0.26em] uppercase whitespace-nowrap"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #f09599 0%, #b51922 55%, #5c060b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 1.5px 1px rgba(0,0,0,0.98))',
            }}
          >
            HARDCORE ROGUELIKE
          </span>
          <span className="h-[1.5px] w-7 sm:w-10 bg-gradient-to-l from-transparent via-[#523026] to-[#8f1219]" />
        </div>
      </div>

      {/* Character Showcase: DARK WARDEN + Soft Cyan Floor Glow */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className="relative w-32 h-28 sm:w-36 sm:h-32 flex items-center justify-center">
          {/* Soft Cyan Floor Glow blending Dark Warden into the dungeon stone */}
          <div
            className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full blur-md lantern-floor-pool"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(93, 228, 255, 0.45) 0%, rgba(56, 152, 184, 0.22) 48%, transparent 78%)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-1 rounded-full blur-2xl hero-lantern-breathe"
            style={{
              background:
                'radial-gradient(circle, rgba(93, 228, 255, 0.3) 0%, rgba(36, 98, 120, 0.14) 52%, transparent 76%)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-3.5 rounded-full blur-[3px] hero-shadow-breathe"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.96) 0%, transparent 78%)',
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
              className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.96)] hero-idle-float"
            />
          ) : (
            <div className="relative z-10 w-20 h-20 rounded-full bg-[#13161c] border border-[#4f5866] flex items-center justify-center">
              <Icon id="ui_skull" size={40} />
            </div>
          )}
        </div>

        {/* Beveled Dark-Iron Nameplate with Subtle Cyan Underglow */}
        <div
          className="relative -mt-1.5 min-w-[224px] px-4 py-1.5 rounded-[7px] border border-[#525b68] flex items-center justify-center gap-2.5"
          style={{
            background:
              'linear-gradient(180deg, #2b303a 0%, #171a20 48%, #0c0e12 100%)',
            boxShadow:
              'inset 0 1px 0 rgba(190, 206, 224, 0.34), inset 0 -2px 0 rgba(4, 5, 8, 0.96), 0 8px 18px rgba(0, 0, 0, 0.92), 0 5px 18px rgba(93, 228, 255, 0.32)',
          }}
        >
          {/* Corner Rivets */}
          <span aria-hidden="true" className="absolute top-1 left-1 w-1 h-1 rounded-full bg-[#8f98a6]/75" />
          <span aria-hidden="true" className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#8f98a6]/75" />
          <span aria-hidden="true" className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-[#525a66]/80" />
          <span aria-hidden="true" className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-[#525a66]/80" />

          <Icon id="ui_skull" size={16} />
          <span
            className="font-display font-bold text-xs sm:text-[13px] tracking-[0.2em] text-[#ede0c4] whitespace-nowrap"
            style={{ textShadow: '0 1px 2px #000, 0 0 10px rgba(93, 228, 255, 0.35)' }}
          >
            DARK WARDEN
          </span>
          <Icon id="ui_skull" size={16} />
        </div>
      </div>

      {/* Equipped Relics Section using panel_iron_card.png */}
      <div className="w-full max-w-[364px] flex flex-col items-center gap-1.5 shrink-0">
        <IronCard
          asButton
          onClick={() => {
            soundManager.playUiClick();
            haptics.tap('light');
            onOpenRelicsShop();
          }}
          highlight={activeSynergies.length > 0 ? 'gold' : 'none'}
          className="w-full"
          contentClassName="px-4 py-3 flex items-center justify-between gap-2.5"
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

          {/* Rarity-Framed Relic Slots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {Array.from({ length: maxRelicSlots }).map((_, slotIdx) => {
              const slotRelic = equippedRelics[slotIdx] ?? null;
              if (slotRelic) {
                return (
                  <div
                    key={slotRelic.id}
                    title={`${slotRelic.name} — ${slotRelic.effectSummary}`}
                    className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                      equipPopSeq > 0 ? 'relic-equip-pop' : ''
                    }`}
                  >
                    <Icon id={slotRelic.name} rarity={slotRelic.rarity} size={40} />
                  </div>
                );
              }
              return (
                <div
                  key={`relic-slot-${slotIdx}`}
                  className="w-10 h-10 rounded-[6px] border-2 border-[#4d5462] flex items-center justify-center font-mono-numbers text-xs font-bold text-[#958972] shrink-0"
                  style={{
                    background:
                      'linear-gradient(180deg, #21252d 0%, #111318 55%, #08090c 100%)',
                    boxShadow:
                      'inset 0 1px 0 rgba(164, 174, 190, 0.25), inset 0 -2px 3px rgba(0, 0, 0, 0.95), 0 3px 8px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {slotIdx + 1}
                </div>
              );
            })}
          </div>
        </IronCard>

        <div className="w-full flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <Icon
              id={canUnlockNewSlot ? 'ui_lock_open' : 'ui_lock_closed'}
              size={16}
            />
            <span className="font-body text-xs font-semibold text-[#cbbba0]">
              {nextSlotInfo
                ? canUnlockNewSlot
                  ? `Slot ${nextSlotInfo.nextSlotNumber} Ready to Unlock`
                  : `Slot ${nextSlotInfo.nextSlotNumber} · ${relicSeals}/${nextSlotInfo.costSeals} Gems`
                : `All ${maxRelicSlots} Relic Slots Forged`}
            </span>
          </div>

          {/* Tactile Beveled Dark-Crimson / Gold Metallic Badge */}
          <button
            type="button"
            onClick={() => {
              soundManager.playUiClick();
              haptics.tap('light');
              onOpenRelicsShop();
            }}
            className="relative min-h-[56px] min-w-[96px] px-4 py-1.5 rounded-[7px] border border-[#c89643] font-display font-bold text-[11px] tracking-[0.14em] text-[#fae6b6] whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer"
            style={{
              background:
                'linear-gradient(180deg, #75151e 0%, #460a10 52%, #240407 100%)',
              boxShadow:
                'inset 0 1px 0 rgba(255, 224, 152, 0.45), inset 0 -2px 0 rgba(12, 2, 4, 0.96), 0 4px 12px rgba(0, 0, 0, 0.85), 0 0 12px rgba(179, 18, 26, 0.35)',
              textShadow: '0 1px 2px #000',
            }}
          >
            {nextSlotInfo ? 'UNLOCK >' : 'RELICS >'}
          </button>
        </div>
      </div>

      {/* Full-Bleed Tactile PLAY Button (btn_play.png directly with zero CSS wrapper box) */}
      <div className="w-full flex flex-col items-center shrink-0 mt-0.5">
        <button
          type="button"
          onClick={() => {
            haptics.tap('heavy');
            onStartGame();
          }}
          className="group relative w-[85%] max-w-[340px] h-[76px] flex items-center justify-center gap-2.5 transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
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

          <span className="relative z-10 inline-flex items-center justify-center transition-transform duration-150 group-hover:scale-110">
            <Icon id="ui_play" size={24} />
          </span>
          <span
            className="relative z-10 font-display font-black text-[28px] tracking-[0.22em] whitespace-nowrap"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #fff0c2 0%, #e6aa45 50%, #9b5d14 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter:
                'drop-shadow(0 0 12px rgba(242, 169, 59, 0.65)) drop-shadow(0 2px 0 #1b0705)',
            }}
          >
            PLAY
          </span>
        </button>

        <p className="mt-1 font-body text-xs font-medium tracking-wide text-[#a89a7e] text-center">
          Drag anywhere to move · Tap Dash to evade
        </p>
      </div>
    </div>
  );
};
