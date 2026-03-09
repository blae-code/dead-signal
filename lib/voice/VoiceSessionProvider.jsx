import React, { createContext, useContext } from 'react';
import { useVoiceSession } from '../../hooks/voice/useVoiceSession';

/**
 * @typedef {import('../../hooks/voice/useVoiceSession').useVoiceSession} useVoiceSessionReturn
 */

/** @type {React.Context<useVoiceSessionReturn | null>} */
const VoiceSessionContext = createContext(null);

/**
 * Provides the voice session context to its children.
 * @param {{children: React.ReactNode}} props
 */
export const VoiceSessionProvider = ({ children }) => {
  const voiceSession = useVoiceSession();
  return (
    <VoiceSessionContext.Provider value={voiceSession}>
      {children}
    </VoiceSessionContext.Provider>
  );
};

/**
 * Hook to access the voice session context.
 * @returns {useVoiceSessionReturn}
 */
export const useVoice = () => {
  const context = useContext(VoiceSessionContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceSessionProvider');
  }
  return context;
};
