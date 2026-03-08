import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClanRoomName,
  buildMissionRoomName,
  buildOpsRoomName,
  buildWhisperRoomName,
  evaluateVoiceRoomAccess,
  parseVoiceRoomName,
  sanitizeRoomToken,
} from "../lib/livekit-room-utils.js";

test("sanitizeRoomToken normalizes unsafe values", () => {
  assert.equal(sanitizeRoomToken(" Mission #42 "), "mission-42");
  assert.equal(sanitizeRoomToken(""), "channel");
});

test("room name builders generate canonical names", () => {
  assert.equal(buildMissionRoomName("A12"), "mission-a12");
  assert.equal(buildClanRoomName("My Clan"), "clan-my-clan");
  assert.equal(buildOpsRoomName(), "operations-oncall");
  assert.equal(buildWhisperRoomName("mission-a12", "Ghost#1"), "mission-a12-whisper-ghost-1");
});

test("parseVoiceRoomName recognizes mission/clan/ops/whisper", () => {
  const mission = parseVoiceRoomName("mission-alpha");
  assert.equal(mission.kind, "mission");
  assert.equal(mission.missionId, "alpha");

  const whisper = parseVoiceRoomName("mission-alpha-whisper-ghost");
  assert.equal(whisper.kind, "mission");
  assert.equal(whisper.isWhisper, true);
  assert.equal(whisper.whisperTarget, "ghost");

  const clan = parseVoiceRoomName("clan-main");
  assert.equal(clan.kind, "clan");

  const ops = parseVoiceRoomName("operations-oncall");
  assert.equal(ops.kind, "operations");
});

test("evaluateVoiceRoomAccess enforces room-level policies", () => {
  assert.equal(
    evaluateVoiceRoomAccess({ userRole: "admin", roomName: "mission-a", isMissionParticipant: false }).allowed,
    true,
  );
  assert.equal(
    evaluateVoiceRoomAccess({ userRole: "user", roomName: "mission-a", isMissionParticipant: false }).allowed,
    false,
  );
  assert.equal(
    evaluateVoiceRoomAccess({ userRole: "user", roomName: "mission-a", isMissionParticipant: true }).allowed,
    true,
  );
  assert.equal(
    evaluateVoiceRoomAccess({ userRole: "user", roomName: "clan-main", isClanMember: false }).allowed,
    false,
  );
  assert.equal(
    evaluateVoiceRoomAccess({ userRole: "user", roomName: "operations-oncall", isOpsEligible: true }).allowed,
    true,
  );
});
