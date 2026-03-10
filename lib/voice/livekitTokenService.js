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

// Cache: key = `${netId}:${userId||''}`, value = { data, expiresAt }
const tokenCache = new Map();

// Refresh 5 minutes before actual expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const getCacheKey = (netId, userId) => `${netId}:${userId || ''}`;

/**
 * Fetch a LiveKit token for the given voice net via the Base44 livekitToken function.
 * Tokens are cached for their full TTL (minus a 5-minute buffer) to avoid
 * burning Base44 function invocations on reconnects.
 *
 * @param {string} netId  - VoiceNet id (e.g. "net-command")
 * @param {string} [userId] - Override user id (admin use)
 * @returns {Promise<LiveKitTokenResponse>}
 */
const fetchToken = async (netId, userId) => {
  if (!netId) {
    throw new Error('livekitTokenService: netId is required.');
  }

  const cacheKey = getCacheKey(netId, userId);
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
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

  const ttlMs = (data.expiresInSeconds ?? 7200) * 1000;
  tokenCache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs - REFRESH_BUFFER_MS });

  return data;
};

/** Explicitly evict cached token(s) — call after disconnect if needed. */
const clearCache = (netId, userId) => {
  if (netId) {
    tokenCache.delete(getCacheKey(netId, userId));
  } else {
    tokenCache.clear();
  }
};

export const livekitTokenService = { fetchToken, clearCache };
