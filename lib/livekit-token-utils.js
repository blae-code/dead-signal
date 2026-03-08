import { AccessToken } from "livekit-server-sdk";

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const createLiveKitJwt = async ({
  apiKey,
  apiSecret,
  identity,
  name,
  roomName,
  ttlSeconds = 7200,
  metadata = {},
}) => {
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API key/secret are required for token generation.");
  }
  if (!identity) {
    throw new Error("Token identity is required.");
  }
  if (!roomName) {
    throw new Error("Room name is required.");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: String(identity),
    name: String(name || identity),
    ttl: `${asNumber(ttlSeconds, 7200)}s`,
    metadata: JSON.stringify(metadata || {}),
  });

  token.addGrant({
    roomJoin: true,
    room: String(roomName),
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  return token.toJwt();
};

export const decodeJwtPayload = (jwt) => {
  const parts = String(jwt || "").split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT format.");
  }
  const payload = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(payload);
};
