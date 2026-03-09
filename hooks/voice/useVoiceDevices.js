import { useState, useEffect, useCallback } from 'react';
import { Room } from 'livekit-client';

/**
 * Hook to manage audio devices using LiveKit.
 *
 * @returns {{
 *  devices: MediaDeviceInfo[],
 *  inputDevices: MediaDeviceInfo[],
 *  outputDevices: MediaDeviceInfo[],
 *  activeInputDeviceId: string | undefined,
 *  activeOutputDeviceId: string | undefined,
 *  setActiveInputDevice: (deviceId: string) => Promise<void>,
 *  setActiveOutputDevice: (deviceId: string) => Promise<void>,
 *  isLoading: boolean,
 * }}
 */
export const useVoiceDevices = () => {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const activeRoom = Room.getActiveDevice("audioinput")?.roomId ? new Room() : null;

  const [activeInputDeviceId, setActiveInputDeviceId] = useState(activeRoom?.getActiveDevice('audioinput')?.deviceId);
  const [activeOutputDeviceId, setActiveOutputDeviceId] = useState(activeRoom?.getActiveDevice('audiooutput')?.deviceId);


  const listDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const allDevices = await Room.getLocalDevices('audioinput');
      setDevices(allDevices);
    } catch (e) {
      console.error('Failed to list devices:', e);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    listDevices();
    Room.addEventListener('deviceChanged', listDevices);
    return () => {
      Room.removeEventListener('deviceChanged', listDevices);
    };
  }, [listDevices]);

  const setActiveInputDevice = useCallback(async (deviceId) => {
    if (activeRoom) {
      await activeRoom.switchActiveDevice('audioinput', deviceId);
      setActiveInputDeviceId(deviceId);
    }
  }, [activeRoom]);

  const setActiveOutputDevice = useCallback(async (deviceId) => {
    if (activeRoom) {
      await activeRoom.switchActiveDevice('audiooutput', deviceId);
      setActiveOutputDeviceId(deviceId);
    }
  }, [activeRoom]);
  
  const inputDevices = devices.filter((d) => d.kind === 'audioinput');
  const outputDevices = devices.filter((d) => d.kind === 'audiooutput');

  return {
    devices,
    inputDevices,
    outputDevices,
    activeInputDeviceId,
    activeOutputDeviceId,
    setActiveInputDevice,
    setActiveOutputDevice,
    isLoading,
  };
};
