import { base44 } from '@/api/base44Client';

/**
 * @typedef {object} LiveKitTokenResponse
 * @property {string} token
 * @property {string} roomName
 * @property {string} netId
 * @property {string} userId
 * @property {string|null} url
 * @property {number} expiresInSeconds
 * @property {object} grants
 */

/**
 * Fetch a LiveKit token for the given voice net via the Base44 livekitToken function.
 *
 * @param {string} netId  - VoiceNet id (e.g. "net-command")
 * @param {string} [userId] - Override user id (admin use)
 * @returns {Promise<LiveKitTokenResponse>}
 */
const fetchToken = async (netId, userId) => {
  if (!netId) {
    throw new Error('livekitTokenService: netId is required.');
  }

  let response;
  try {
    response = await base44.functions.invoke('livekitToken', { netId, userId });
  } catch (err) {
    throw new Error(`livekitTokenService: token request failed — ${err?.message || err}`);
  }

  // Base44 SDK returns { data: <payload> } or the payload directly depending on version
  const data = response?.data ?? response;

  if (!data?.token) {
    throw new Error('livekitTokenService: server returned no token.');
  }

  return data;
};

export const livekitTokenService = { fetchToken };
