import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import { AccessToken } from "npm:livekit-server-sdk@2.15.5";
import { AppError, errorResponse, parseJsonBody, requireAuthenticated, requireMethod } from "./_shared/backend.ts";
import {
  buildMissionRoomName,
  evaluateVoiceRoomAccess,
  parseVoiceRoomName,
  sanitizeRoomToken,
} from "../lib/livekit-room-utils.js";

type LiveKitTokenRequest = {
  roomName?: unknown;
  userId?: unknown;
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveLiveKitConfig = () => {
  const url = Deno.env.get("LIVEKIT_URL")?.trim()
    || Deno.env.get("VITE_LIVEKIT_URL")?.trim()
    || "";
  const apiKey = Deno.env.get("LIVEKIT_API_KEY")?.trim()
    || Deno.env.get("VITE_LIVEKIT_API_KEY")?.trim()
    || "";
  const apiSecret = Deno.env.get("LIVEKIT_SECRET")?.trim()
    || Deno.env.get("VITE_LIVEKIT_SECRET")?.trim()
    || "";

  if (!apiKey || !apiSecret) {
    throw new AppError(500, "livekit_not_configured", "LiveKit API key/secret are not configured.");
  }

  return { url, apiKey, apiSecret };
};

const getMissionParticipants = (mission: Record<string, unknown>, callsign: string | null): Set<string> => {
  const out = new Set<string>();
  const add = (value: unknown) => {
    const normalized = sanitizeRoomToken(value, "");
    if (normalized) out.add(normalized);
  };

  add(mission.assigned_to);
  add(mission.created_by);
  add(mission.owner_email);
  add(mission.owner);
  add(mission.callsign);
  add(mission.user_email);
  add(mission.assigned_operator);

  if (Array.isArray(mission.assigned_to)) {
    mission.assigned_to.forEach(add);
  }
  if (Array.isArray(mission.assigned_operators)) {
    mission.assigned_operators.forEach(add);
  }
  if (Array.isArray(mission.assigned_emails)) {
    mission.assigned_emails.forEach(add);
  }
  if (callsign) add(callsign);

  return out;
};

const hasOpsRole = (role: unknown): boolean => {
  const normalized = sanitizeRoomToken(role, "");
  return ["commander", "lieutenant", "officer", "moderator", "admin"].includes(normalized);
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me());
    const payload = await parseJsonBody<LiveKitTokenRequest>(req);
    const roomFromPayload = asNonEmptyString(payload.roomName);
    const requestedUserId = asNonEmptyString(payload.userId);

    if (!roomFromPayload) {
      throw new AppError(400, "missing_room_name", "roomName is required.");
    }

    const roomName = sanitizeRoomToken(roomFromPayload);
    const canonicalUserId = requestedUserId || asNonEmptyString((user as Record<string, unknown>).id) || user.email;
    const isAdmin = user.role === "admin";

    if (!canonicalUserId) {
      throw new AppError(400, "invalid_user_id", "Unable to resolve user identity for token.");
    }

    if (!isAdmin && requestedUserId && requestedUserId !== canonicalUserId) {
      throw new AppError(403, "forbidden", "Non-admin users cannot mint tokens for other identities.");
    }

    const clanMembership = await base44.asServiceRole.entities.ClanMember
      .filter({ user_email: user.email }, "-created_date", 1)
      .catch(() => []);
    const member = Array.isArray(clanMembership) && clanMembership.length > 0 ? clanMembership[0] : null;
    const memberCallsign = asNonEmptyString(member?.callsign);

    const parsedRoom = parseVoiceRoomName(roomName);
    let isMissionParticipant = false;
    let isClanMember = Boolean(member);
    const isOpsEligible = hasOpsRole(member?.role);

    if (parsedRoom.kind === "mission" && parsedRoom.missionId) {
      const missionId = parsedRoom.missionId;
      const [mission] = await base44.asServiceRole.entities.Mission.filter({ id: missionId }, "-created_date", 1).catch(() => []);
      if (!mission) {
        throw new AppError(404, "mission_not_found", `Mission room '${buildMissionRoomName(missionId)}' does not exist.`);
      }
      const participants = getMissionParticipants(mission, memberCallsign);
      const userIdentityTokens = [
        sanitizeRoomToken(user.email, ""),
        sanitizeRoomToken(user.full_name || "", ""),
        sanitizeRoomToken(memberCallsign, ""),
        sanitizeRoomToken(canonicalUserId, ""),
      ].filter(Boolean);
      isMissionParticipant = userIdentityTokens.some((token) => participants.has(token));
      if (!isMissionParticipant && isClanMember) {
        // Allow clan members to join mission channels by default if mission assignment list is empty.
        const missionHasExplicitAssignees = participants.size > 0;
        if (!missionHasExplicitAssignees) {
          isMissionParticipant = true;
        }
      }
    }

    if (parsedRoom.kind === "clan") {
      isClanMember = Boolean(member);
    }

    const access = evaluateVoiceRoomAccess({
      userRole: user.role,
      roomName,
      isMissionParticipant,
      isClanMember,
      isOpsEligible,
    });

    if (!access.allowed) {
      throw new AppError(403, "forbidden_room_access", `Access denied for room '${roomName}' (${access.reason}).`);
    }

    const config = resolveLiveKitConfig();
    const ttlSeconds = 2 * 60 * 60;

    const token = new AccessToken(config.apiKey, config.apiSecret, {
      identity: canonicalUserId,
      name: user.full_name || user.email,
      ttl: `${ttlSeconds}s`,
      metadata: JSON.stringify({
        user_id: canonicalUserId,
        email: user.email,
        role: user.role || "user",
        access_reason: access.reason,
      }),
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    await base44.asServiceRole.entities.ServerEvent.create({
      event_type: "VOICE_TOKEN",
      severity: "INFO",
      message: `LiveKit token issued for ${user.email} -> ${roomName} (${access.reason})`,
    }).catch(() => null);

    return Response.json({
      success: true,
      token: jwt,
      roomName,
      userId: canonicalUserId,
      url: config.url || null,
      expiresInSeconds: ttlSeconds,
      grants: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
