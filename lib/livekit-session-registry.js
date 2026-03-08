import { sanitizeRoomToken } from "./livekit-room-utils.js";

export const createVoiceSessionRegistry = () => {
  const sessions = new Map();

  const keyFor = (roomName) => sanitizeRoomToken(roomName, "");

  return {
    set(roomName, value) {
      const key = keyFor(roomName);
      if (!key) return null;
      sessions.set(key, value);
      return key;
    },
    get(roomName) {
      const key = keyFor(roomName);
      if (!key) return null;
      return sessions.get(key) || null;
    },
    has(roomName) {
      const key = keyFor(roomName);
      return key ? sessions.has(key) : false;
    },
    remove(roomName) {
      const key = keyFor(roomName);
      if (!key) return false;
      return sessions.delete(key);
    },
    clear() {
      sessions.clear();
    },
    entries() {
      return [...sessions.entries()];
    },
    size() {
      return sessions.size;
    },
  };
};
