import React from 'react';
import { useVoiceDevices } from '../../hooks/voice/useVoiceDevices';

/**
 * A component that provides UI for selecting audio input and output devices.
 */
export const DevicePanel = ({ compact = false }) => {
  const {
    inputDevices,
    outputDevices,
    activeInputDeviceId,
    activeOutputDeviceId,
    setActiveInputDevice,
    setActiveOutputDevice,
    isLoading,
  } = useVoiceDevices();

  if (isLoading) {
    return (
      <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
        <p className="text-neutral-400">Loading audio devices...</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'bg-neutral-800/80 backdrop-blur-sm p-4 rounded-lg border border-neutral-700 space-y-4'}>
      {!compact && <h2 className="text-base font-bold text-neutral-200 uppercase tracking-widest">Device Settings</h2>}
      
      <div>
        <label htmlFor="mic-select" className="block text-sm font-medium text-neutral-400 mb-1">
          Microphone (Input)
        </label>
        <select
          id="mic-select"
          value={activeInputDeviceId || ''}
          onChange={(e) => setActiveInputDevice(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-600 rounded-md p-2 text-neutral-200 focus:ring-cyan-500 focus:border-cyan-500"
        >
          {inputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="speaker-select" className="block text-sm font-medium text-neutral-400 mb-1">
          Speaker (Output)
        </label>
        <select
          id="speaker-select"
          value={activeOutputDeviceId || ''}
          onChange={(e) => setActiveOutputDevice(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-600 rounded-md p-2 text-neutral-200 focus:ring-cyan-500 focus:border-cyan-500"
        >
          {outputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
