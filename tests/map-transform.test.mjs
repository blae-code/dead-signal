import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = path.join(process.cwd(), "src/lib/map-transform.js");
const {
  hasUsableMapConfig,
  normalizedToWorld,
  worldToNormalized,
  mapPointWithTransform,
} = await import(pathToFileURL(modulePath).href);

const config = {
  map_id: "global-map",
  image_url: "https://example.com/map.png",
  image_width_px: 1000,
  image_height_px: 1000,
  world_bounds: { min_x: 0, max_x: 10000, min_y: 0, max_y: 10000 },
  control_points: [
    {
      id: "cp-1",
      image: { x: 100, y: 200 },
      world: { x: 1000, y: 2000 },
    },
    {
      id: "cp-2",
      image: { x: 900, y: 800 },
      world: { x: 9000, y: 8000 },
    },
  ],
};

test("map config is detected as usable", () => {
  assert.equal(hasUsableMapConfig(config), true);
});

test("normalized/world transforms are approximately reversible", () => {
  const world = normalizedToWorld({ x: 42.5, y: 67.25 }, config);
  assert.ok(world && Number.isFinite(world.x) && Number.isFinite(world.y));

  const normalized = worldToNormalized(world, config);
  assert.ok(normalized);
  assert.ok(Math.abs(normalized.x - 42.5) < 0.001);
  assert.ok(Math.abs(normalized.y - 67.25) < 0.001);
});

test("map point transform resolves from world coordinates when normalized fields are absent", () => {
  const point = mapPointWithTransform({ world_x: 2500, world_y: 3500 }, config);
  assert.ok(point);
  assert.ok(Number.isFinite(point.normalized_x));
  assert.ok(Number.isFinite(point.normalized_y));
  assert.ok(Number.isFinite(point.world_x));
  assert.ok(Number.isFinite(point.world_y));
});
