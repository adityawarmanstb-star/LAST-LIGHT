import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, KeyRound, LockOpen, ShieldAlert, Terminal } from 'lucide-react';
import { soundManager } from '../game/audio';
import {
  activateDeveloperModeWithCode,
  isDeveloperMode,
  setDeveloperMode,
  subscribeDeveloperMode,
} from '../game/developerMode';
import { haptics } from '../mobile/haptics';
import {
  GothicPanel9Slice,
  GothicRow9Slice,
  Sprite3SliceButton,
  SpriteCloseButton,
} from './SettingsSprites';
import { UiChainDivider } from './ui/UiControls';

interface DeveloperModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperModeModal: React.FC<DeveloperModeModalProps> = ({ isOpen, onClose }) => {
  const [devActive, setDevActive] = useState<boolean>(() => isDeveloperMode());
  const [codeInput, setCodeInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = subscribeDeveloperMode(setDevActive);
    return unsub;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setDevActive(isDeveloperMode());
    setCodeInput('');
    setErrorMsg(null);
    setJustActivated(false);
    if (!isDeveloperMode()) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = activateDeveloperModeWithCode(codeInput);
    if (ok) {
      soundManager.playCoinGain('jackpot');
      haptics.tap('heavy');
      setErrorMsg(null);
      setCodeInput('');
      setJustActivated(true);
    } else {
      soundManager.playUiClick();
      haptics.tap('light');
      setErrorMsg('Kode tidak valid. Periksa kembali kode developer.');
    }
  };

  const handleDeactivate = () => {
    soundManager.playUiClick();
    haptics.tap('medium');
    setDeveloperMode(false);
    setJustActivated(false);
    setErrorMsg(null);
    setCodeInput('');
  };

  const handleClose = () => {
    soundManager.playUiClick();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="developer-mode-title"
      className="fixed inset-0 z-[92] flex items-center justify-center p-3 sm:p-5 select-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(10, 9, 13, 0.88) 0%, rgba(20, 5, 8, 0.96) 100%)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <GothicPanel9Slice className="w-full max-w-[420px] flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <header className="relative z-20 shrink-0 flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-[#1a1316] border border-[#b32b32]/70 flex items-center justify-center text-[#f2a93b] shrink-0">
              <Terminal className="w-4 h-4" aria-hidden="true" />
            </div>
            <h2
              id="developer-mode-title"
              className="text-[19px] sm:text-[21px] font-display font-black tracking-[0.12em] uppercase text-[#e8dcc2] truncate"
              style={{ textShadow: '0 2px 5px rgba(0, 0, 0, 0.96)' }}
            >
              DEVELOPER
            </h2>
          </div>

          <SpriteCloseButton onClick={handleClose} ariaLabel="Close Developer Menu" />
        </header>

        <UiChainDivider className="mb-3" />

        {devActive ? (
          <div className="flex flex-col gap-3">
            <GothicRow9Slice contentClassName="px-3.5 py-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[#6ee7b7]">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="font-display text-sm font-bold tracking-[0.08em] uppercase">
                  {justActivated ? 'Developer Mode Aktif!' : 'Developer Mode Aktif'}
                </span>
              </div>

              <ul className="flex flex-col gap-1.5 font-body text-[13px] text-[#e8dcc2] pl-0.5">
                <li className="flex items-center gap-2">
                  <LockOpen className="w-3.5 h-3.5 text-[#f2a93b] shrink-0" aria-hidden="true" />
                  <span>Semua Stage Terbuka (Stage 1 &amp; Stage 2)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#edd18a] w-3.5 text-center">∞</span>
                  <span>Soul Coins Unlimited</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#f0cad9] w-3.5 text-center">∞</span>
                  <span>Crimson Gems Unlimited</span>
                </li>
              </ul>
            </GothicRow9Slice>

            <div className="flex flex-col gap-2 pt-1">
              <Sprite3SliceButton
                variant="iron"
                onClick={handleDeactivate}
                className="w-full"
              >
                NONAKTIFKAN DEVELOPER MODE
              </Sprite3SliceButton>
              <Sprite3SliceButton
                variant="done"
                onClick={handleClose}
                className="w-full"
              >
                SELESAI
              </Sprite3SliceButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <GothicRow9Slice contentClassName="px-3.5 py-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[#e8dcc2]">
                <KeyRound className="w-4 h-4 text-[#f2a93b] shrink-0" aria-hidden="true" />
                <span className="font-body text-[13px] font-bold">
                  Masukkan Kode Akses Developer
                </span>
              </div>
              <p className="font-body text-[11.5px] text-[#9c8e72] leading-snug">
                Membuka seluruh stage serta mengaktifkan Coin &amp; Gem unlimited.
              </p>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Masukkan kode..."
                aria-label="Developer Access Code"
                className="w-full px-3 py-2.5 rounded bg-[#0c0d10] border border-[#5a4e3d] focus:border-[#f2a93b] focus:outline-none font-mono text-center text-lg tracking-[0.28em] text-[#f2dfba] placeholder:text-[#6e6456] placeholder:tracking-normal placeholder:text-sm"
              />

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-center gap-1.5 text-[12px] font-body text-[#ff7b82] pt-0.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </GothicRow9Slice>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Sprite3SliceButton
                variant="iron"
                type="button"
                onClick={handleClose}
                className="w-full"
              >
                BATAL
              </Sprite3SliceButton>
              <Sprite3SliceButton
                variant="done"
                type="submit"
                className="w-full"
              >
                AKTIFKAN
              </Sprite3SliceButton>
            </div>
          </form>
        )}
      </GothicPanel9Slice>
    </div>
  );
};
