import { livekitRoomService } from './livekitRoomService';
import { appParams } from '@/lib/app-params';

/**
 * DEAD SIGNAL — Voice Transport Adapter
 * Thin abstraction layer over livekitRoomService.
 * Provides a clean API for useVoiceSession without coupling it to LiveKit directly.
 * All per-net operations go through the adapter; livekitRoomService holds the rooms.
 */
export const voiceTransportAdapter = {
  /**
   * Connect to a voice net.
   * @param {string} netId
   * @param {string} [userId]
   * @returns {Promise<import('livekit-client').Room>}
   */
  connect(netId, userId) {
    return livekitRoomService.connect(netId, userId);
  },

  /**
   * Disconnect from a voice net.
   * @param {string} netId
   */
  disconnect(netId) {
    livekitRoomService.disconnect(netId);
  },

  /** Disconnect from all nets. */
  disconnectAll() {
    livekitRoomService.disconnectAll();
  },

  /**
   * Get the LiveKit Room for a net (or null if not connected).
   * @param {string} netId
   * @returns {import('livekit-client').Room|null}
   */
  getRoom(netId) {
    return livekitRoomService.getRoom(netId);
  },

  /**
   * Get connection status for a net.
   * @param {string} netId
   * @returns {'connecting' | 'connected' | 'disconnected' | 'error'}
   */
  getStatus(netId) {
    return livekitRoomService.getStatus(netId);
  },

  /** @returns {string[]} */
  getConnectedNetIds() {
    return livekitRoomService.getConnectedNetIds();
  },

  /**
   * Enable or disable the local microphone on a specific net.
   * @param {string} netId
   * @param {boolean} enabled
   */
  async setMicEnabled(netId, enabled) {
    const room = livekitRoomService.getRoom(netId);
    if (!room?.localParticipant) return;
    await room.localParticipant.setMicrophoneEnabled(enabled).catch(() => {});
  },

  /**
   * Set the volume for all remote participant tracks in a net.
   * @param {string} netId
   * @param {number} level  0–1
   */
  setVolume(netId, level) {
    const room = livekitRoomService.getRoom(netId);
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) {
        if (publication.track) {
          publication.track.setVolume(Math.max(0, Math.min(1, level)));
        }
      }
    }
  },

  /**
   * Check if the local microphone is currently enabled on a net.
   * @param {string} netId
   * @returns {boolean}
   */
  isMicEnabled(netId) {
    const room = livekitRoomService.getRoom(netId);
    return room?.localParticipant?.isMicrophoneEnabled ?? false;
  },

  /**
   * Get the LiveKit server URL from app params or env.
   * @returns {string}
   */
  getServerUrl() {
    return appParams.livekitUrl || import.meta.env.VITE_LIVEKIT_URL || '';
  },

  /**
   * Iterate all remote participants across all connected nets.
   * Callback receives (participant, netId).
   * @param {(participant: import('livekit-client').RemoteParticipant, netId: string) => void} cb
   */
  forEachRemoteParticipant(cb) {
    for (const netId of livekitRoomService.getConnectedNetIds()) {
      const room = livekitRoomService.getRoom(netId);
      if (!room) continue;
      for (const participant of room.remoteParticipants.values()) {
        cb(participant, netId);
      }
    }
  },
};
