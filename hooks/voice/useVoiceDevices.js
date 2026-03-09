import { useState, useEffect, useCallback } from 'react';
import { Room } from 'livekit-client';

/**
 * Hook to enumerate and select audio devices.
 * Uses LiveKit's static Room.getLocalDevices() for enumeration and
 * navigator.mediaDevices for change events.
 *
 * @returns {{
 *  inputDevices: MediaDeviceInfo[],
 *  outputDevices: MediaDeviceInfo[],
 *  activeInputDeviceId: string,
 *  activeOutputDeviceId: string,
 *  setActiveInputDevice: (deviceId: string) => void,
 *  setActiveOutputDevice: (deviceId: string) => void,
 *  isLoading: boolean,
 * }}
 */
export const useVoiceDevices = () => {
  const [inputDevices, setInputDevices]   = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [activeInputDeviceId, setActiveInputDeviceId]   = useState('default');
  const [activeOutputDeviceId, setActiveOutputDeviceId] = useState('default');
  const [isLoading, setIsLoading] = useState(true);

  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inputs, outputs] = await Promise.all([
        Room.getLocalDevices('audioinput',  false).catch(() => []),
        Room.getLocalDevices('audiooutput', false).catch(() => []),
      ]);
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch {
      setInputDevices([]);
      setOutputDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  // Switching active device requires a live Room instance — we store the preference
  // here and useVoiceSession applies it when connecting.
  const setActiveInputDevice  = useCallback((deviceId) => setActiveInputDeviceId(deviceId),  []);
  const setActiveOutputDevice = useCallback((deviceId) => setActiveOutputDeviceId(deviceId), []);

  return {
    inputDevices,
    outputDevices,
    activeInputDeviceId,
    activeOutputDeviceId,
    setActiveInputDevice,
    setActiveOutputDevice,
    isLoading,
  };
};
