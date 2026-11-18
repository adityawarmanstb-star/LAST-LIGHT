import React, { useEffect, useState } from 'react';
import { BESTIARY_ENTRIES, bestiary } from '../../game/bestiary';
import { soundManager } from '../../game/audio';
import { BestiaryEntry, BestiaryKillsMap } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { NineSlice } from '../ui/NineSlice';
import { UI_SPRITES } from '../ui/uiConfig';

type GridSlotItem =
  | { kind: 'entry'; entry: BestiaryEntry }
  | { kind: 'sealed'; id: 'sealed_abyss' };

const GRID_SLOTS: GridSlotItem[] = [
  ...BESTIARY_ENTRIES.map((entry): GridSlotItem => ({ kind: 'entry', entry })),
  { kind: 'sealed', id: 'sealed_abyss' },
];

export const BestiaryPage: React.FC = () => {
  const [kills, setKills] = useState<BestiaryKillsMap>(() => bestiary.getKills());
  const [selectedId, setSelectedId] = useState<string>(BESTIARY_ENTRIES[0]?.id ?? 'wisp');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return bestiary.subscribe((next) => setKills(next));
  }, []);

  const discoveredCount = BESTIARY_ENTRIES.filter((entry) => (kills[entry.id] ?? 0) > 0).length;
  const totalKills = BESTIARY_ENTRIES.reduce((sum, entry) => sum + (kills[entry.id] ?? 0), 0);

  const selectedEntry = BESTIARY_ENTRIES.find((e) => e.id === selectedId) ?? null;
  const selectedKills = selectedEntry ? kills[selectedEntry.id] ?? 0 : 0;
  const isSelectedDiscovered = selectedEntry ? selectedKills > 0 : false;

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 pb-2 overflow-hidden gap-2">
      {/* Page Header */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display font-bold text-[clamp(17px,3.5vw,21px)] tracking-[0.14em] text-[#e8dcc2]">
            BESTIARY
          </h1>
          <p className="font-body text-xs font-medium text-[#b5a589]">
            Slay horrors in the dark to record their weaknesses
          </p>
        </div>

        <NineSlice
          variant="miniPlate"
          tileTexture="row"
          padding="0px"
          className="shrink-0"
          contentClassName="px-2.5 py-1 text-right"
        >
          <div className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
            {discoveredCount} / {BESTIARY_ENTRIES.length} Found
          </div>
          <div className="font-mono-numbers text-[11px] text-[#b5a589]">
            {totalKills.toLocaleString()} Slain
          </div>
        </NineSlice>
      </div>

      {/* Top Monster Showcase Frame */}
      <NineSlice
        variant={isSelectedDiscovered ? 'cardOrnateCrimson' : 'panelIronDark'}
        tileTexture="stone"
        highlight={isSelectedDiscovered ? 'blood' : 'none'}
        padding="0px"
        className="shrink-0"
        contentClassName="p-3 flex flex-col gap-2"
      >
        {selectedEntry ? (
          <>
            <div className="flex items-center gap-3">
              <div
                className="relative w-20 flex items-center justify-center shrink-0 overflow-hidden"
                style={{ aspectRatio: '1 / 1' }}
              >
                <img
                  src={UI_SPRITES.roundSquareSocket}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ imageRendering: 'auto' }}
                  className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                />
                {!failedImages[selectedEntry.id] ? (
                  <img
                    src={selectedEntry.spriteSrc}
                    alt={isSelectedDiscovered ? selectedEntry.name : 'Locked monster'}
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed(selectedEntry.id)}
                    style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                    className={`relative z-10 w-14 h-14 object-contain ${
                      isSelectedDiscovered ? 'opacity-100' : 'opacity-15'
                    }`}
                  />
                ) : (
                  <span className="relative z-10">
                    <Icon id={isSelectedDiscovered ? 'ui_skull' : 'ui_info'} size={30} muted={!isSelectedDiscovered} />
                  </span>
                )}
                {!isSelectedDiscovered && (
                  <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#06070a]/65">
                    <Icon id="ui_lock_closed" size={24} muted />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display font-bold text-base sm:text-lg text-[#e8dcc2]">
                    {isSelectedDiscovered ? selectedEntry.name : 'Unknown Horror'}
                  </h2>
                  <span className="inline-flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#f2a93b] shrink-0">
                    <Icon id="ui_swords" size={16} />
                    {selectedKills.toLocaleString()}
                  </span>
                </div>

                <div
                  className="font-display font-bold text-[11px] uppercase tracking-wider mt-0.5"
                  style={{ color: isSelectedDiscovered ? selectedEntry.accentColor : '#8e8168' }}
                >
                  {selectedEntry.threatClass} ·{' '}
                  {isSelectedDiscovered ? selectedEntry.title : 'Uncharted Threat'}
                </div>

                <p className="font-body text-xs text-[#c6b898] leading-snug mt-1">
                  {isSelectedDiscovered
                    ? selectedEntry.lore
                    : 'This creature stalks beyond your lantern light. Slay one in battle to reveal its lore and field weakness.'}
                </p>
              </div>
            </div>

            {isSelectedDiscovered && (
              <div className="pt-2 border-t border-[#3a3f47]/70 flex items-start gap-2 font-body text-xs text-[#d8c9a8]">
                <span className="shrink-0 mt-0.5">
                  <Icon
                    id={selectedEntry.id === 'boss' ? 'ui_warning' : 'ui_day_flame'}
                    size={16}
                  />
                </span>
                <span>
                  <strong className="font-bold text-[#f2a93b]">Field Note:</strong>{' '}
                  {selectedEntry.tacticalNote}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div
              style={{ width: 72, aspectRatio: '1 / 1' }}
              className="relative flex items-center justify-center shrink-0"
            >
              <img
                src={UI_SPRITES.roundSquareSocket}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ imageRendering: 'auto' }}
                className="pointer-events-none absolute inset-0 w-full h-full object-contain"
              />
              <span className="relative z-10">
                <Icon id="ui_lock_closed" size={30} muted />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-base text-[#9c8e72]">
                SEALED ABYSSAL ENTRY
              </h2>
              <p className="font-body text-xs text-[#8e8168] leading-snug mt-1">
                A deeper horror slumbers beneath the Ashfen. Future expeditions will unseal this tome page.
              </p>
            </div>
          </div>
        )}
      </NineSlice>

      {/* 3x2 Grid of Discovered / Locked Monsters */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-1">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {GRID_SLOTS.map((slot) => {
            if (slot.kind === 'sealed') {
              const isSelected = selectedId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    soundManager.playUiClick();
                    haptics.tap('light');
                    setSelectedId(slot.id);
                  }}
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  <NineSlice
                    variant="panelIronDark"
                    tileTexture="stone"
                    highlight={isSelected ? 'blood' : 'none'}
                    padding="0px"
                    contentClassName="p-2 flex flex-col items-center justify-between text-center gap-1 min-h-[112px]"
                  >
                    <div
                      style={{ width: 46, aspectRatio: '1 / 1' }}
                      className="relative flex items-center justify-center"
                    >
                      <img
                        src={UI_SPRITES.roundSquareSocket}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        style={{ imageRendering: 'auto' }}
                        className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                      />
                      <span className="relative z-10">
                        <Icon id="ui_lock_closed" size={22} muted />
                      </span>
                    </div>
                    <div className="font-display font-bold text-[10.5px] leading-tight text-[#8e8168]">
                      Abyssal Seal
                    </div>
                    <div className="font-mono-numbers text-[9.5px] text-[#6d6558]">LOCKED</div>
                  </NineSlice>
                </button>
              );
            }

            const { entry } = slot;
            const count = kills[entry.id] ?? 0;
            const discovered = count > 0;
            const isSelected = selectedId === entry.id;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  setSelectedId(entry.id);
                }}
                className="cursor-pointer transition-transform active:scale-95"
              >
                <NineSlice
                  variant="panelIronDark"
                  tileTexture="stone"
                  highlight={isSelected ? 'gold' : 'none'}
                  padding="0px"
                  contentClassName="p-2 flex flex-col items-center justify-between text-center gap-1 min-h-[112px]"
                >
                  <div
                    style={{ width: 46, aspectRatio: '1 / 1' }}
                    className="relative flex items-center justify-center overflow-hidden"
                  >
                    <img
                      src={UI_SPRITES.roundSquareSocket}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{ imageRendering: 'auto' }}
                      className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                    />
                    {!failedImages[entry.id] ? (
                      <img
                        src={entry.spriteSrc}
                        alt={discovered ? entry.name : 'Undiscovered'}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(entry.id)}
                        style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                        className={`relative z-10 w-9 h-9 object-contain ${
                          discovered ? 'opacity-100' : 'opacity-15'
                        }`}
                      />
                    ) : (
                      <span className="relative z-10">
                        <Icon id="ui_skull" size={22} muted={!discovered} />
                      </span>
                    )}
                    {!discovered && (
                      <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#06070a]/55">
                        <Icon id="ui_lock_closed" size={16} muted />
                      </span>
                    )}
                  </div>

                  <div className="font-display font-bold text-[10.5px] leading-tight text-[#e8dcc2]">
                    {discovered ? entry.name : '???'}
                  </div>

                  <div className="font-mono-numbers text-[9.5px] font-bold text-[#f2a93b]">
                    {discovered ? `${count.toLocaleString()} Slain` : 'UNDISCOVERED'}
                  </div>
                </NineSlice>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
