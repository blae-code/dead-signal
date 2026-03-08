import test from "node:test";
import assert from "node:assert/strict";
import { createLiveKitJwt, decodeJwtPayload } from "../lib/livekit-token-utils.js";

test("createLiveKitJwt builds signed jwt with room grants", async () => {
  const token = await createLiveKitJwt({
    apiKey: "test_key",
    apiSecret: "test_secret",
    identity: "operator-1",
    name: "Operator One",
    roomName: "mission-alpha",
    ttlSeconds: 3600,
    metadata: { role: "admin" },
  });

  assert.ok(typeof token === "string");
  const payload = decodeJwtPayload(token);
  assert.equal(payload.iss, "test_key");
  assert.equal(payload.sub, "operator-1");
  assert.equal(payload.video.roomJoin, true);
  assert.equal(payload.video.room, "mission-alpha");
  assert.equal(payload.video.canPublish, true);
  assert.equal(payload.video.canSubscribe, true);
});

test("createLiveKitJwt validates required fields", async () => {
  await assert.rejects(
    () => createLiveKitJwt({ apiKey: "", apiSecret: "", identity: "", roomName: "" }),
    /required/i,
  );
});
