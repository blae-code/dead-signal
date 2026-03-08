import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceSessionRegistry } from "../lib/livekit-session-registry.js";

test("voice session registry supports add/get/remove lifecycle", () => {
  const registry = createVoiceSessionRegistry();
  assert.equal(registry.size(), 0);

  registry.set("mission-Alpha", { state: "connecting" });
  assert.equal(registry.size(), 1);
  assert.equal(registry.has("mission-alpha"), true);
  assert.deepEqual(registry.get("mission-alpha"), { state: "connecting" });

  registry.set("mission-alpha", { state: "connected" });
  assert.equal(registry.size(), 1);
  assert.deepEqual(registry.get("mission-alpha"), { state: "connected" });

  registry.remove("mission-alpha");
  assert.equal(registry.size(), 0);
  assert.equal(registry.get("mission-alpha"), null);
});

test("voice session registry clears all sessions", () => {
  const registry = createVoiceSessionRegistry();
  registry.set("ops-room", { state: "connected" });
  registry.set("clan-room", { state: "connected" });
  assert.equal(registry.size(), 2);
  registry.clear();
  assert.equal(registry.size(), 0);
});
