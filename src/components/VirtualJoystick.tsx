import React, { useRef, useState, useEffect, useCallback } from 'react';
import { gameManager } from '../game/GameManager';
import { soundManager } from '../game/audio';
import { UI_SPRITES } from './ui/uiConfig';

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
          className="fixed -ml-14 -mt-14 flex items-center justify-center pointer-events-none"
          style={{
            left: touchPos.x,
            top: touchPos.y,
            width: 112,
            aspectRatio: '1 / 1',
          }}
        >
          <img
            src={UI_SPRITES.roundSteel}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ imageRendering: 'auto' }}
            className="pointer-events-none absolute inset-0 w-full h-full object-contain opacity-90 select-none"
          />
          <img
            src={UI_SPRITES.knobCrimsonOrb}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              width: 48,
              aspectRatio: '1 / 1',
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              imageRendering: 'auto',
            }}
            className="relative z-10 object-contain transition-transform duration-75 select-none"
          />
        </div>
      )}
    </div>
  );
};
