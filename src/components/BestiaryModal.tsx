import React, { useEffect, useState } from 'react';
import { BookMarked, Flame, HelpCircle, ShieldAlert, Skull, Swords, X } from 'lucide-react';
import { BESTIARY_ENTRIES, bestiary } from '../game/bestiary';
import { soundManager } from '../game/audio';
import { BestiaryEntry, BestiaryKillsMap } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface BestiaryModalProps {
  onClose: () => void;
}

type BestiaryFilter = 'all' | 'discovered';

const EnemyPortrait: React.FC<{
  entry: BestiaryEntry;
  discovered: boolean;
}> = ({ entry, discovered }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-[10px] bg-[#121417] border flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        borderColor: discovered ? `${entry.accentColor}77` : '#3a3f47',
      }}
    >
      {discovered && (
        <div
          className="absolute inset-1 rounded-full blur-xl opacity-25 pointer-events-none"
          style={{ background: entry.accentColor }}
          aria-hidden="true"
        />
      )}

      {!imgFailed ? (
        <img
          src={entry.spriteSrc}
          alt={discovered ? entry.name : 'Undiscovered enemy silhouette'}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`relative w-14 h-14 sm:w-16 sm:h-16 object-contain select-none transition-transform duration-200 ${
            discovered
              ? 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]'
              : 'brightness-0 opacity-45 contrast-125'
          }`}
        />
      ) : discovered ? (
        <Skull className="w-8 h-8 text-[#d8c9a8]/80" />
      ) : (
        <HelpCircle className="w-8 h-8 text-[#6b7280]/70" />
      )}

      {!discovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <HelpCircle className="w-6 h-6 text-[#9c8e72]/70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
        </div>
      )}
    </div>
  );
};

export const BestiaryModal: React.FC<BestiaryModalProps> = ({ onClose }) => {
  const [kills, setKills] = useState<BestiaryKillsMap>(() => bestiary.getKills());
  const [filter, setFilter] = useState<BestiaryFilter>('all');

  useEffect(() => {
    const unsub = bestiary.subscribe((next) => setKills(next));
    return unsub;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const discoveredCount = BESTIARY_ENTRIES.filter((entry) => (kills[entry.id] ?? 0) > 0).length;
  const totalKills = BESTIARY_ENTRIES.reduce((sum, entry) => sum + (kills[entry.id] ?? 0), 0);

  const visibleEntries =
    filter === 'discovered'
      ? BESTIARY_ENTRIES.filter((entry) => (kills[entry.id] ?? 0) > 0)
      : BESTIARY_ENTRIES;

  const handleClose = () => {
    soundManager.playUiClick();
    haptics.tap('light');
    onClose();
  };

  const handleSelectFilter = (nextFilter: BestiaryFilter) => {
    soundManager.playUiClick();
    haptics.tap('light');
    setFilter(nextFilter);
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-50"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.85) 0%, rgba(30, 10, 13, 0.94) 100%)',
      }}
    >
      <ForgedIronFrame
        seed="bestiary-modal-frame"
        dripCount={5}
        maxDripLength={22}
        className="max-w-3xl w-full flex flex-col max-h-[90vh]"
        contentClassName="flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#3a3f47]/80 gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#6b3a2a] flex items-center justify-center shrink-0">
              <BookMarked className="w-5 h-5 text-[#f2a93b]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-display font-bold tracking-wider text-[#d8c9a8] truncate">
                BESTIARY
              </h2>
              <p className="text-xs text-[#9c8e72] font-mono-numbers">
                Discovered {discoveredCount} / {BESTIARY_ENTRIES.length}
                <span className="mx-2 text-[#6b3a2a]" aria-hidden="true">
                  ·
                </span>
                Total Slain {totalKills.toLocaleString()}
              </p>
            </div>
          </div>

          <IronButton
            seed="bestiary-close-btn"
            dripCount={0}
            onClick={handleClose}
            className="w-14 h-14 min-h-[56px] min-w-[56px] shrink-0"
            aria-label="Close Bestiary"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Filter Controls */}
        <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3 shrink-0 border-b border-[#3a3f47]/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectFilter('all')}
              className={`min-h-[40px] px-3.5 rounded-[8px] border text-xs font-semibold tracking-wide transition-colors ${
                filter === 'all'
                  ? 'bg-[#2a1519] border-[#b3121a] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
              }`}
            >
              All Entries ({BESTIARY_ENTRIES.length})
            </button>
            <button
              type="button"
              onClick={() => handleSelectFilter('discovered')}
              className={`min-h-[40px] px-3.5 rounded-[8px] border text-xs font-semibold tracking-wide transition-colors ${
                filter === 'discovered'
                  ? 'bg-[#2a1519] border-[#b3121a] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
              }`}
            >
              Discovered ({discoveredCount})
            </button>
          </div>

          <span className="hidden sm:inline text-[11px] text-[#8c7f67]">
            Slay creatures in battle to record their lore
          </span>
        </div>

        {/* Bestiary Ledger */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3.5">
          {visibleEntries.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-[10px] border border-[#3a3f47]/70 bg-[#14171b]/80">
              <Skull className="w-9 h-9 text-[#6b3a2a] mx-auto mb-3" />
              <p className="font-display text-sm font-bold tracking-wider text-[#d8c9a8] uppercase mb-1">
                No Creatures Recorded Yet
              </p>
              <p className="text-xs text-[#9c8e72] max-w-sm mx-auto">
                Venture into the dark and slay your first enemy to inscribe its lore into the ledger.
              </p>
            </div>
          ) : (
            visibleEntries.map((entry) => {
              const count = kills[entry.id] ?? 0;
              const discovered = count > 0;
              const isBoss = entry.id === 'boss';

              return (
                <div
                  key={entry.id}
                  className={`rounded-[10px] border p-4 sm:p-4.5 transition-colors ${
                    discovered
                      ? isBoss
                        ? 'bg-[#1c1317]/95 border-[#6b3a2a]'
                        : 'bg-[#16191f]/95 border-[#3a3f47]'
                      : 'bg-[#121418]/90 border-[#2b2f36]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <EnemyPortrait entry={entry} discovered={discovered} />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                          <h3 className="font-display text-base sm:text-lg font-bold tracking-wide text-[#e8dcc2]">
                            {discovered ? entry.name : 'Unknown Horror'}
                          </h3>
                          <span className="font-mono-numbers text-xs font-bold text-[#f2a93b] flex items-center gap-1 shrink-0">
                            <Swords className="w-3.5 h-3.5 text-[#e5303a]" />
                            {count.toLocaleString()} Slain
                          </span>
                        </div>

                        <p className="text-[11px] font-medium tracking-wider uppercase text-[#9c8e72] mb-2">
                          {discovered ? (
                            <>
                              <span style={{ color: entry.accentColor }}>{entry.threatClass}</span>
                              <span className="mx-2 text-[#6b3a2a]" aria-hidden="true">
                                ·
                              </span>
                              <span>{entry.title}</span>
                            </>
                          ) : (
                            <>
                              <span>{entry.threatClass}</span>
                              <span className="mx-2 text-[#6b3a2a]" aria-hidden="true">
                                ·
                              </span>
                              <span>Uncharted Threat</span>
                            </>
                          )}
                        </p>

                        <p className="text-xs sm:text-[13px] leading-relaxed text-[#c6b898]">
                          {discovered
                            ? entry.lore
                            : 'This creature still stalks unseen beyond the lantern beam. Slay at least one in battle to reveal its origins and tactical notes.'}
                        </p>

                        {discovered && (
                          <div className="mt-2.5 pt-2 border-t border-[#3a3f47]/60 flex items-start gap-2 text-[11px] text-[#9c8e72]">
                            {isBoss ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-[#e5303a] shrink-0 mt-0.5" />
                            ) : (
                              <Flame className="w-3.5 h-3.5 text-[#f2a93b] shrink-0 mt-0.5" />
                            )}
                            <span>
                              <strong className="text-[#d8c9a8] font-semibold">Field Note:</strong>{' '}
                              {entry.tacticalNote}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#3a3f47]/80 flex justify-end shrink-0">
          <IronButton
            seed="bestiary-done-btn"
            variant="blood"
            dripCount={2}
            onClick={handleClose}
            className="w-full sm:w-auto min-w-[160px] min-h-[56px] px-6 font-display font-bold text-sm tracking-wider"
          >
            <span>Close</span>
          </IronButton>
        </div>
      </ForgedIronFrame>
    </div>
  );
};
