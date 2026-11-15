import React, { useEffect, useState } from 'react';
import { BESTIARY_ENTRIES, bestiary } from '../../game/bestiary';
import { soundManager } from '../../game/audio';
import { BestiaryEntry, BestiaryKillsMap } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { IronCard } from '../IronCard';

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
    <div className="w-full flex-1 min-h-0 flex flex-col px-3 pb-2 overflow-hidden gap-2.5">
      {/* Page Header */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display font-bold text-xl tracking-[0.14em] text-[#e8dcc2]">
            BESTIARY
          </h1>
          <p className="font-body text-xs font-medium text-[#b5a589]">
            Slay horrors in the dark to record their weaknesses
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
            {discoveredCount} / {BESTIARY_ENTRIES.length} Found
          </div>
          <div className="font-mono-numbers text-[11px] text-[#b5a589]">
            {totalKills.toLocaleString()} Slain
          </div>
        </div>
      </div>

      {/* Top Monster Showcase Frame */}
      <IronCard
        highlight={isSelectedDiscovered ? 'blood' : 'none'}
        className="shrink-0"
        contentClassName="p-3.5 flex flex-col gap-2.5"
      >
        {selectedEntry ? (
          <>
            <div className="flex items-center gap-3.5">
              <div
                className="relative w-20 h-20 rounded-[10px] bg-[#0e1014] border flex items-center justify-center shrink-0 overflow-hidden"
                style={{
                  borderColor: isSelectedDiscovered ? `${selectedEntry.accentColor}88` : '#3a3f47',
                }}
              >
                {!failedImages[selectedEntry.id] ? (
                  <img
                    src={selectedEntry.spriteSrc}
                    alt={isSelectedDiscovered ? selectedEntry.name : 'Locked monster silhouette'}
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed(selectedEntry.id)}
                    className={`w-16 h-16 object-contain ${
                      isSelectedDiscovered
                        ? 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]'
                        : 'brightness-0 opacity-45'
                    }`}
                  />
                ) : isSelectedDiscovered ? (
                  <Icon id="ui_skull" size={32} />
                ) : (
                  <Icon id="ui_info" size={32} muted />
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

                <p className="font-body text-xs text-[#c6b898] leading-snug mt-1.5">
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
          <div className="flex items-center gap-3.5 py-2">
            <div className="w-20 h-20 rounded-[10px] bg-[#0e1014] border border-[#3a3f47] flex items-center justify-center shrink-0">
              <Icon id="ui_lock_closed" size={32} muted />
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
      </IronCard>

      {/* 3x2 Grid of Discovered / Locked Monsters */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-1">
        <div className="grid grid-cols-3 grid-rows-2 gap-2">
          {GRID_SLOTS.map((slot) => {
            if (slot.kind === 'sealed') {
              const isSelected = selectedId === slot.id;
              return (
                <IronCard
                  key={slot.id}
                  asButton
                  onClick={() => {
                    soundManager.playUiClick();
                    haptics.tap('light');
                    setSelectedId(slot.id);
                  }}
                  highlight={isSelected ? 'blood' : 'none'}
                  contentClassName="p-2.5 flex flex-col items-center justify-between text-center gap-1.5 min-h-[118px]"
                >
                  <div className="w-12 h-12 rounded-[8px] bg-[#0c0e12] border border-[#2f343d] flex items-center justify-center">
                    <Icon id="ui_lock_closed" size={24} muted />
                  </div>
                  <div className="font-display font-bold text-[11px] leading-tight text-[#8e8168]">
                    Abyssal Seal
                  </div>
                  <div className="font-mono-numbers text-[10px] text-[#6d6558]">LOCKED</div>
                </IronCard>
              );
            }

            const { entry } = slot;
            const count = kills[entry.id] ?? 0;
            const discovered = count > 0;
            const isSelected = selectedId === entry.id;

            return (
              <IronCard
                key={entry.id}
                asButton
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  setSelectedId(entry.id);
                }}
                highlight={isSelected ? 'gold' : discovered ? 'none' : 'none'}
                contentClassName="p-2.5 flex flex-col items-center justify-between text-center gap-1.5 min-h-[118px]"
              >
                <div
                  className="w-12 h-12 rounded-[8px] bg-[#0c0e12] border flex items-center justify-center overflow-hidden"
                  style={{ borderColor: isSelected ? '#f2a93b' : '#3a3f47' }}
                >
                  {!failedImages[entry.id] ? (
                    <img
                      src={entry.spriteSrc}
                      alt={discovered ? entry.name : 'Undiscovered'}
                      referrerPolicy="no-referrer"
                      onError={() => markImageFailed(entry.id)}
                      className={`w-10 h-10 object-contain ${
                        discovered ? '' : 'brightness-0 opacity-45'
                      }`}
                    />
                  ) : (
                    <Icon id="ui_skull" size={24} muted={!discovered} />
                  )}
                </div>

                <div className="font-display font-bold text-[11px] leading-tight text-[#e8dcc2]">
                  {discovered ? entry.name : '???'}
                </div>

                <div className="font-mono-numbers text-[10px] font-bold text-[#f2a93b]">
                  {discovered ? `${count.toLocaleString()} Slain` : 'UNDISCOVERED'}
                </div>
              </IronCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
