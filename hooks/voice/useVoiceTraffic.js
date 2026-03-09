import { useState, useCallback, useEffect } from 'react';

/**
 * @typedef {import('../../lib/voice/models').VoiceEventLogEntry} VoiceEventLogEntry
 * @typedef {import('./useVoiceSession').useVoiceSession} useVoiceSessionReturn
 */

const MAX_LOG_ENTRIES = 100;

/**
 * A hook to manage and generate a log of voice traffic events.
 *
 * @param {{
 *  session: useVoiceSessionReturn
 * }} { session }
 * @returns {{
 *   logs: VoiceEventLogEntry[];
 *   addLog: (log: Partial<VoiceEventLogEntry>) => void;
 * }}
 */
export const useVoiceTraffic = ({ session }) => {
  const [logs, setLogs] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState(new Map());

  const addLog = useCallback((log) => {
    const newLog = {
      timestamp: Date.now(),
      type: 'system',
      direction: 'local',
      ...log,
    };
    setLogs(prevLogs => [newLog, ...prevLogs.slice(0, MAX_LOG_ENTRIES - 1)]);
  }, []);

  useEffect(() => {
    const newActiveSpeakers = new Map();
    session.participants.forEach(p => {
      if (p.isSpeaking && p.speakingOnNetId) {
        newActiveSpeakers.set(p.userId, { callsign: p.callsign, netId: p.speakingOnNetId });
      }
    });

    // Speaker started talking
    newActiveSpeakers.forEach((speaker, userId) => {
      if (!activeSpeakers.has(userId)) {
        addLog({
          type: 'rx',
          direction: 'in',
          actorCallsign: speaker.callsign,
          netId: speaker.netId,
          outcome: 'start',
          metadata: { message: `Receiving transmission from ${speaker.callsign} on ${speaker.netId}` },
        });
      }
    });

    // Speaker stopped talking
    activeSpeakers.forEach((speaker, userId) => {
      if (!newActiveSpeakers.has(userId)) {
        addLog({
          type: 'rx',
          direction: 'in',
          actorCallsign: speaker.callsign,
          netId: speaker.netId,
          outcome: 'stop',
          metadata: { message: `Transmission ended from ${speaker.callsign}` },
        });
      }
    });

    setActiveSpeakers(newActiveSpeakers);
  }, [session.participants, addLog]);
  
  useEffect(() => {
      if (session.sessionState.isTransmitting) {
          addLog({
              type: 'tx',
              direction: 'out',
              netId: session.sessionState.activeTxNetId,
              outcome: 'start',
              metadata: { message: `Transmitting on ${session.sessionState.activeTxNetId}` },
          });
      } else {
           // Find the last TX start event to mark it as stopped.
           const lastTx = logs.find(l => l.type === 'tx' && l.outcome === 'start');
           if (lastTx) {
               addLog({
                   type: 'tx',
                   direction: 'out',
                   netId: lastTx.netId,
                   outcome: 'stop',
                   metadata: { message: `Transmission ended on ${lastTx.netId}` },
               });
           }
      }
  }, [session.sessionState.isTransmitting, addLog]);

  return { logs, addLog, activeSpeakers };
};
