import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import { AccessToken, type VideoGrant } from "npm:livekit-server-sdk@2.15.5";
import { AppError, errorResponse, parseJsonBody, requireAuthenticated, requireMethod } from "./_shared/backend.ts";

// --- Voice Domain ---

type VoiceNetCategory = 'command' | 'squad' | 'logistics' | 'proximity' | 'direct' | 'emergency';
type DisciplineMode = 'ptt' | 'open' | 'role-gated';
type RadioProfile = 'clean' | 'analog' | 'vehicle' | 'encrypted' | 'natural';

interface VoiceNet {
  id: string;
  displayName: string;
  frequencyLabel: string;
  livekitRoomName: string;
  category: VoiceNetCategory;
  disciplineMode: DisciplineMode;
  radioProfile: RadioProfile;
  roleRestrictions: string[];
  netControlEnabled: boolean;
  emergencyCapable: boolean;
}

// --- Static Net Registry (mirrors lib/voice/nets.js) ---
// These are the canonical DEAD SIGNAL voice nets. Any Base44 entity lookup
// falls back to this list if the entity is not found.

const STATIC_VOICE_NETS: VoiceNet[] = [
  {
    id: "net-command",
    displayName: "Command Net",
    frequencyLabel: "146.520 MHz",
    livekitRoomName: "net-command",
    category: "command",
    disciplineMode: "ptt",
    radioProfile: "encrypted",
    roleRestrictions: ["commander", "lieutenant", "officer", "admin"],
    netControlEnabled: true,
    emergencyCapable: true,
  },
  {
    id: "net-squad-alpha",
    displayName: "Squad Alpha",
    frequencyLabel: "462.5625 MHz",
    livekitRoomName: "net-squad-alpha",
    category: "squad",
    disciplineMode: "ptt",
    radioProfile: "analog",
    roleRestrictions: [],
    netControlEnabled: false,
    emergencyCapable: false,
  },
  {
    id: "net-squad-bravo",
    displayName: "Squad Bravo",
    frequencyLabel: "467.5625 MHz",
    livekitRoomName: "net-squad-bravo",
    category: "squad",
    disciplineMode: "ptt",
    radioProfile: "analog",
    roleRestrictions: [],
    netControlEnabled: false,
    emergencyCapable: false,
  },
  {
    id: "net-logistics",
    displayName: "Logistics",
    frequencyLabel: "151.940 MHz",
    livekitRoomName: "net-logistics",
    category: "logistics",
    disciplineMode: "open",
    radioProfile: "clean",
    roleRestrictions: [],
    netControlEnabled: false,
    emergencyCapable: false,
  },
  {
    id: "net-emergency",
    displayName: "Emergency",
    frequencyLabel: "155.340 MHz",
    livekitRoomName: "net-emergency",
    category: "emergency",
    disciplineMode: "ptt",
    radioProfile: "encrypted",
    roleRestrictions: [],
    netControlEnabled: true,
    emergencyCapable: true,
  },
  {
    id: "net-proximity",
    displayName: "Proximity",
    frequencyLabel: "LOCAL",
    livekitRoomName: "net-proximity",
    category: "proximity",
    disciplineMode: "open",
    radioProfile: "natural",
    roleRestrictions: [],
    netControlEnabled: false,
    emergencyCapable: false,
  },
];

const STATIC_NETS_BY_ID = new Map(STATIC_VOICE_NETS.map(n => [n.id, n]));
const STATIC_NETS_BY_ROOM = new Map(STATIC_VOICE_NETS.map(n => [n.livekitRoomName, n]));

const resolveVoiceNet = async (
  base44Client: ReturnType<typeof createClientFromRequest>,
  netId: string | null,
  roomName: string | null,
): Promise<VoiceNet | null> => {
  // Try static registry first by id
  if (netId && STATIC_NETS_BY_ID.has(netId)) return STATIC_NETS_BY_ID.get(netId)!;
  // Try static registry by room name
  if (roomName && STATIC_NETS_BY_ROOM.has(roomName)) return STATIC_NETS_BY_ROOM.get(roomName)!;

  // Try Base44 entity lookup (dynamic nets created by admins)
  if (netId) {
    try {
      const results = await base44Client.asServiceRole.entities.VoiceNet.filter({ id: netId }, "-created_date", 1);
      if (Array.isArray(results) && results.length > 0) {
        const e = results[0];
        return {
          id: e.id ?? netId,
          displayName: e.display_name ?? e.displayName ?? netId,
          frequencyLabel: e.frequency_label ?? e.frequencyLabel ?? "---",
          livekitRoomName: e.livekit_room_name ?? e.livekitRoomName ?? netId,
          category: e.category ?? "squad",
          disciplineMode: e.discipline_mode ?? e.disciplineMode ?? "ptt",
          radioProfile: e.radio_profile ?? e.radioProfile ?? "clean",
          roleRestrictions: e.role_restrictions ?? e.roleRestrictions ?? [],
          netControlEnabled: e.net_control_enabled ?? e.netControlEnabled ?? false,
          emergencyCapable: e.emergency_capable ?? e.emergencyCapable ?? false,
        };
      }
    } catch {
      // Entity lookup unavailable — fall through to null
    }
  }

  return null;
};


// --- Type Definitions ---

type LiveKitTokenRequest = {
  netId?: unknown;
  roomName?: unknown;
  userId?: unknown;
};

// --- Helper Functions ---

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

const evaluateNetAccess = (
  user: { role?: string; },
  member: { role?: string } | null,
  net: VoiceNet
): { allowed: boolean; reason: string; grants: Partial<VideoGrant> } => {
  
  const userRoles = [user.role, member?.role].filter(Boolean).map(r => r!.toLowerCase());

  // Rule 1: Admin is god
  if (userRoles.includes("admin")) {
    return {
      allowed: true,
      reason: "Admin Override",
      grants: { canPublish: true, canPublishData: true, canSubscribe: true, roomJoin: true },
    };
  }
  
  // Rule 2: Check against role restrictions
  if (net.roleRestrictions.length > 0) {
    const hasRequiredRole = userRoles.some(role => net.roleRestrictions.includes(role));
    if (!hasRequiredRole) {
      return { allowed: false, reason: "Missing required role", grants: {} };
    }
  }

  // Rule 3: Base permissions for allowed users
  const grants: Partial<VideoGrant> = {
    roomJoin: true,
    canSubscribe: true,
    canPublishData: true,
    canPublish: net.disciplineMode !== 'role-gated',
  };

  // Rule 4: Grant publish rights for net control
  if (net.netControlEnabled && userRoles.some(r => ["commander", "lieutenant", "officer"].includes(r))) {
      grants.canPublish = true;
  }

  return { allowed: true, reason: "Access Granted", grants };
};


// --- Main Handler ---

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me());
    const payload = await parseJsonBody<LiveKitTokenRequest>(req);
    const requestedNetId = asNonEmptyString(payload.netId);
    const requestedRoomName = asNonEmptyString(payload.roomName);
    const requestedUserId = asNonEmptyString(payload.userId);

    if (!requestedNetId && !requestedRoomName) {
      throw new AppError(400, "missing_net_id", "netId or roomName is required.");
    }

    const net = await resolveVoiceNet(base44, requestedNetId, requestedRoomName);
    if (!net) {
      throw new AppError(404, "net_not_found", `VoiceNet '${requestedNetId ?? requestedRoomName}' not found.`);
    }

    const roomName = net.livekitRoomName;
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
    const callsign = asNonEmptyString(member?.callsign) || "Guest";

    const access = evaluateNetAccess(user, member, net);

    if (!access.allowed) {
      throw new AppError(403, "forbidden_net_access", `Access denied for net '${net.displayName}' (${access.reason}).`);
    }

    const config = resolveLiveKitConfig();
    const ttlSeconds = 2 * 60 * 60;

    const token = new AccessToken(config.apiKey, config.apiSecret, {
      identity: canonicalUserId,
      name: callsign, // Use callsign as the primary name
      ttl: `${ttlSeconds}s`,
      metadata: JSON.stringify({
        user_id: canonicalUserId,
        email: user.email,
        role: user.role || "user",
        callsign: callsign,
        netId: net.id,
        netCategory: net.category,
        disciplineMode: net.disciplineMode,
        radioProfile: net.radioProfile,
        access_reason: access.reason,
      }),
    });

    const finalGrants = { ...access.grants, room: roomName };
    token.addGrant(finalGrants);

    const jwt = await token.toJwt();

    await base44.asServiceRole.entities.ServerEvent.create({
      event_type: "VOICE_TOKEN",
      severity: "INFO",
      message: `LiveKit token issued for ${callsign} (${user.email}) -> ${net.displayName} (${access.reason})`,
    }).catch(() => null);

    return Response.json({
      success: true,
      token: jwt,
      roomName,
      netId: net.id,
      netDisplayName: net.displayName,
      netCategory: net.category,
      disciplineMode: net.disciplineMode,
      radioProfile: net.radioProfile,
      userId: canonicalUserId,
      callsign,
      url: config.url || null,
      expiresInSeconds: ttlSeconds,
      grants: finalGrants,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
