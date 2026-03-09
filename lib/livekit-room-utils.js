/**
 * DEAD SIGNAL — livekit-room-utils (compatibility shim)
 * Provides room name sanitization and construction helpers.
 * Previously a standalone module; kept as a shim for backward compatibility.
 */

/**
 * Sanitize a string for use as a LiveKit room name token.
 * @param {unknown} value
 * @param {string} [fallback='channel']
 * @returns {string}
 */
export const sanitizeRoomToken = (value, fallback = 'channel') => {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
};

export const buildMissionRoomName = (missionId) =>
  `mission-${sanitizeRoomToken(missionId, 'unknown')}`;

export const buildClanRoomName = (clanId = 'primary') =>
  `clan-${sanitizeRoomToken(clanId, 'primary')}`;

export const buildOpsRoomName = () => 'operations-oncall';
