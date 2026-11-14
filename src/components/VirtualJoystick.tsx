import React, { useRef, useState, useEffect, useCallback } from 'react';
import { gameManager } from '../game/GameManager';
import { soundManager } from '../game/audio';

function detectTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    Boolean(window.matchMedia?.('(pointer: coarse)').matches)
  );
}

export const VirtualJoystick: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(detectTouchSupport);
  const [active, setActive] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const activeTouchIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const maxRadius = 48;

  // Enable touch overlay automatically if any touch occurs even on hybrid devices
  useEffect(() => {
    if (isTouchDevice) return;
    const enableTouch = () => setIsTouchDevice(true);
    window.addEventListener('touchstart', enableTouch, { passive: true, once: true });
    return () => window.removeEventListener('touchstart', enableTouch);
  }, [isTouchDevice]);

  const updateVector = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= maxRadius) {
      setKnobPos({ x: dx, y: dy });
      gameManager.setJoystick(dx / maxRadius, dy / maxRadius);
    } else {
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * maxRadius;
      const ky = Math.sin(angle) * maxRadius;
      setKnobPos({ x: kx, y: ky });
      gameManager.setJoystick(kx / maxRadius, ky / maxRadius);
    }
  }, []);

  const handleEnd = useCallback(() => {
    activeTouchIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    gameManager.setJoystick(0, 0);
  }, []);

  useEffect(() => {
    const findTrackedTouch = (list: TouchList): Touch | null => {
      const id = activeTouchIdRef.current;
      if (id === null) return null;
      for (let i = 0; i < list.length; i++) {
        if (list[i].identifier === id) return list[i];
      }
      return null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return;
      const tracked = findTrackedTouch(e.touches);
      if (tracked) {
        if (e.cancelable) e.preventDefault();
        updateVector(tracked.clientX, tracked.clientY);
      }
    };

    const onTouchEndOrCancel = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return;
      const ended = findTrackedTouch(e.changedTouches);
      if (ended) {
        handleEnd();
      }
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEndOrCancel);
    window.addEventListener('touchcancel', onTouchEndOrCancel);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEndOrCancel);
      window.removeEventListener('touchcancel', onTouchEndOrCancel);
    };
  }, [updateVector, handleEnd]);

  // Reset joystick on unmount so player never stays stuck moving
  useEffect(() => {
    return () => {
      gameManager.setJoystick(0, 0);
    };
  }, []);

  if (!isTouchDevice) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-auto touch-none z-10"
      onTouchStart={(e) => {
        if (activeTouchIdRef.current !== null) return;
        const targetEl = e.target as HTMLElement | null;
        if (targetEl?.closest('button, a, [role="button"], input, select')) {
          return;
        }
        const touch = e.changedTouches[0];
        if (!touch) return;

        soundManager.onUserGesture();
        activeTouchIdRef.current = touch.identifier;
        originRef.current = { x: touch.clientX, y: touch.clientY };
        setActive(true);
        setTouchPos({ x: touch.clientX, y: touch.clientY });
        setKnobPos({ x: 0, y: 0 });
        gameManager.setJoystick(0, 0);
      }}
    >
      {active && (
        <div
          className="fixed w-28 h-28 -ml-14 -mt-14 rounded-full border-2 border-[#3a3f47] bg-[#1a1c20]/80 backdrop-blur-xs flex items-center justify-center pointer-events-none shadow-[inset_0_0_16px_rgba(179,18,26,0.25),0_6px_18px_rgba(0,0,0,0.65)]"
          style={{ left: touchPos.x, top: touchPos.y }}
        >
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-b from-[#b3121a] to-[#3a0a0e] shadow-[0_0_14px_rgba(229,48,58,0.6)] border border-[#d8c9a8]/70 transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
};
