import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceSession } from './useVoiceSession';

/**
 * Push-To-Talk hook.
 * Manages keyboard, mouse, and touch PTT interactions.
 * Anti-stuck transmit: always releases on window blur.
 *
 * @param {object} [options]
 * @param {string} [options.pttKey='t']  keyboard key to use
 * @returns {{ isTransmitting: boolean, startTx: () => void, stopTx: () => void }}
 */
export function usePushToTalk({ pttKey = 't' } = {}) {
  const { voiceSessionState, setMicEnabled } = useVoiceSession();
  const pttMode = voiceSessionState?.pttMode ?? 'hold';

  const [isTransmitting, setIsTransmitting] = useState(false);
  const transmittingRef = useRef(false);

  const startTx = useCallback(() => {
    if (transmittingRef.current) return;
    transmittingRef.current = true;
    setIsTransmitting(true);
    setMicEnabled(true);
  }, [setMicEnabled]);

  const stopTx = useCallback(() => {
    if (!transmittingRef.current) return;
    transmittingRef.current = false;
    setIsTransmitting(false);
    setMicEnabled(false);
  }, [setMicEnabled]);

  const toggleTx = useCallback(() => {
    if (transmittingRef.current) stopTx();
    else startTx();
  }, [startTx, stopTx]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== pttKey || e.repeat) return;
      if (pttMode === 'hold') startTx();
      else toggleTx();
    };

    const onKeyUp = (e) => {
      if (e.key !== pttKey) return;
      if (pttMode === 'hold') stopTx();
    };

    // Anti-stuck: release on window blur
    const onBlur = () => {
      if (pttMode === 'hold') stopTx();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [pttKey, pttMode, startTx, stopTx, toggleTx]);

  return { isTransmitting, startTx, stopTx };
}
