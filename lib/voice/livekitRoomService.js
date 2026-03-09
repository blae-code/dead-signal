import { Room, RoomEvent, ConnectionState } from 'livekit-client';
import { livekitTokenService } from './livekitTokenService';

/**
 * @typedef {object} RoomConnection
 * @property {Room} room
 * @property {'connecting' | 'connected' | 'disconnected' | 'error'} status
 * @property {string} netId
 * @property {Promise<Room>|null} connectPromise  pending promise if still connecting
 */

/**
 * Singleton manager for all LiveKit room connections.
 * Ensures one connection per voice net at a time.
 */
class LiveKitRoomManager {
  /** @type {Map<string, RoomConnection>} */
  connections = new Map();

  /**
   * Connect to a LiveKit room for a voice net.
   * Returns an existing connected room immediately if one exists.
   *
   * @param {string} netId
   * @param {string} [userId]
   * @returns {Promise<Room>}
   */
  async connect(netId, userId) {
    const existing = this.connections.get(netId);

    if (existing) {
      if (existing.status === 'connected') return existing.room;
      // If a connect is already in-flight, await its promise
      if (existing.status === 'connecting' && existing.connectPromise) {
        return existing.connectPromise;
      }
    }

    const room = new Room({ adaptiveStream: true, dynacast: true });
    const connectPromise = this._doConnect(netId, userId, room);
    this.connections.set(netId, { room, status: 'connecting', netId, connectPromise });

    return connectPromise;
  }

  /** @private */
  async _doConnect(netId, userId, room) {
    try {
      const tokenData = await livekitTokenService.fetchToken(netId, userId);
      const { url, token } = tokenData;

      if (!url || !token) throw new Error('LiveKit URL or token missing from server response.');

      await room.connect(url, token, { autoSubscribe: true });

      this.connections.set(netId, { room, status: 'connected', netId, connectPromise: null });

      room.once(RoomEvent.Disconnected, () => {
        // Only auto-remove if we weren't manually disconnected
        const conn = this.connections.get(netId);
        if (conn?.room === room) this.connections.delete(netId);
      });

      return room;
    } catch (error) {
      this.connections.set(netId, { room, status: 'error', netId, connectPromise: null });
      // Clean up error state after 5s so reconnect can be attempted
      setTimeout(() => {
        if (this.connections.get(netId)?.status === 'error') {
          this.connections.delete(netId);
        }
      }, 5000);
      throw error;
    }
  }

  /**
   * Disconnect from a specific voice net room.
   * @param {string} netId
   */
  disconnect(netId) {
    const connection = this.connections.get(netId);
    if (!connection) return;
    try {
      if (connection.room.state !== ConnectionState.Disconnected) {
        connection.room.disconnect();
      }
    } catch { /* ignore */ }
    this.connections.delete(netId);
  }

  /** Disconnect all active rooms. */
  disconnectAll() {
    for (const netId of [...this.connections.keys()]) {
      this.disconnect(netId);
    }
  }

  /**
   * Get a connected Room by netId, or null.
   * @param {string} netId
   * @returns {Room|null}
   */
  getRoom(netId) {
    const conn = this.connections.get(netId);
    return conn?.status === 'connected' ? conn.room : null;
  }

  /**
   * Get the connection status for a net.
   * @param {string} netId
   * @returns {'connecting' | 'connected' | 'disconnected' | 'error'}
   */
  getStatus(netId) {
    return this.connections.get(netId)?.status ?? 'disconnected';
  }

  /** @returns {Room[]} all currently connected rooms */
  getAllRooms() {
    return [...this.connections.values()]
      .filter(c => c.status === 'connected')
      .map(c => c.room);
  }

  /** @returns {string[]} netIds of all connected rooms */
  getConnectedNetIds() {
    return [...this.connections.entries()]
      .filter(([, c]) => c.status === 'connected')
      .map(([id]) => id);
  }
}

export const livekitRoomService = new LiveKitRoomManager();
