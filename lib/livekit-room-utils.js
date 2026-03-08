const normalize = (value) => String(value || "").trim().toLowerCase();

export const sanitizeRoomToken = (value, fallback = "channel") => {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
};

export const buildMissionRoomName = (missionId) => `mission-${sanitizeRoomToken(missionId, "unknown")}`;
export const buildClanRoomName = (clanId = "primary") => `clan-${sanitizeRoomToken(clanId, "primary")}`;
export const buildOpsRoomName = () => "operations-oncall";
export const buildWhisperRoomName = (baseRoomName, targetIdentity) =>
  `${sanitizeRoomToken(baseRoomName, "channel")}-whisper-${sanitizeRoomToken(targetIdentity, "target")}`;

export const parseVoiceRoomName = (roomName) => {
  const normalized = sanitizeRoomToken(roomName, "");
  if (!normalized) {
    return { kind: "unknown", roomName: "", isWhisper: false, baseRoomName: null };
  }

  const whisperIndex = normalized.indexOf("-whisper-");
  const baseRoomName = whisperIndex >= 0 ? normalized.slice(0, whisperIndex) : normalized;
  const whisperTarget = whisperIndex >= 0 ? normalized.slice(whisperIndex + "-whisper-".length) : null;
  const isWhisper = whisperIndex >= 0;

  if (baseRoomName.startsWith("mission-")) {
    return {
      kind: "mission",
      roomName: normalized,
      isWhisper,
      baseRoomName,
      missionId: baseRoomName.slice("mission-".length),
      whisperTarget,
    };
  }

  if (baseRoomName.startsWith("clan-")) {
    return {
      kind: "clan",
      roomName: normalized,
      isWhisper,
      baseRoomName,
      clanId: baseRoomName.slice("clan-".length),
      whisperTarget,
    };
  }

  if (baseRoomName.startsWith("operations") || baseRoomName.startsWith("ops-") || baseRoomName.startsWith("system")) {
    return {
      kind: "operations",
      roomName: normalized,
      isWhisper,
      baseRoomName,
      whisperTarget,
    };
  }

  return {
    kind: "general",
    roomName: normalized,
    isWhisper,
    baseRoomName,
    whisperTarget,
  };
};

export const evaluateVoiceRoomAccess = ({
  userRole,
  roomName,
  isMissionParticipant = false,
  isClanMember = false,
  isOpsEligible = false,
}) => {
  const role = normalize(userRole);
  const room = parseVoiceRoomName(roomName);

  if (role === "admin") {
    return { allowed: true, reason: "admin" };
  }

  if (room.kind === "mission") {
    if (isMissionParticipant) {
      return { allowed: true, reason: "mission_member" };
    }
    return { allowed: false, reason: "mission_access_denied" };
  }

  if (room.kind === "clan") {
    if (isClanMember) {
      return { allowed: true, reason: "clan_member" };
    }
    return { allowed: false, reason: "clan_access_denied" };
  }

  if (room.kind === "operations") {
    if (isOpsEligible) {
      return { allowed: true, reason: "ops_member" };
    }
    return { allowed: false, reason: "operations_access_denied" };
  }

  return { allowed: true, reason: "general" };
};
