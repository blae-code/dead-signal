import { VOICE_NETS, VOICE_NETS_BY_ID, VOICE_NETS_BY_ROOM, VOICE_NETS_BY_SLOT } from './nets';

/**
 * DEAD SIGNAL — Voice Net Resolver
 * Resolves VoiceNet objects from ids, room names, memory slots, or categories.
 * Static baseline from nets.js; designed for future Base44 entity augmentation.
 */
export const voiceNetResolver = {
  /**
   * Get all available voice nets.
   * @returns {Promise<import('./models').VoiceNet[]>}
   */
  async getAvailableNets() {
    return VOICE_NETS;
  },

  /**
   * Get all available voice nets synchronously.
   * @returns {import('./models').VoiceNet[]}
   */
  getNets() {
    return VOICE_NETS;
  },

  /**
   * Find a net by its id.
   * @param {string} id
   * @returns {import('./models').VoiceNet|null}
   */
  getNetById(id) {
    return VOICE_NETS_BY_ID[id] ?? null;
  },

  /**
   * Find a net by its LiveKit room name.
   * @param {string} roomName
   * @returns {import('./models').VoiceNet|null}
   */
  getNetByRoomName(roomName) {
    return VOICE_NETS_BY_ROOM[roomName] ?? null;
  },

  /**
   * Find a net by memory slot (e.g. "M1").
   * @param {string} slot
   * @returns {import('./models').VoiceNet|null}
   */
  resolveMemoryChannel(slot) {
    return VOICE_NETS_BY_SLOT[slot] ?? null;
  },

  /**
   * Get all nets in a given category.
   * @param {import('./models').VoiceNetCategory} category
   * @returns {import('./models').VoiceNet[]}
   */
  getNetsByCategory(category) {
    return VOICE_NETS.filter(n => n.category === category);
  },

  /**
   * Get scan-eligible nets sorted by priority (highest first).
   * @returns {import('./models').VoiceNet[]}
   */
  getScanTargets() {
    return VOICE_NETS.filter(n => n.scanEligible).sort((a, b) => a.priority - b.priority);
  },
};
