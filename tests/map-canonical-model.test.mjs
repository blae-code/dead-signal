import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("clan map is an alias of tactical map (single authoritative map surface)", () => {
  const source = read("src/pages/ClanMap.jsx");
  assert.ok(source.includes('import TacticalMap from "@/pages/TacticalMap";'));
  assert.ok(source.includes("return <TacticalMap />;"));
});

test("legacy split map entities are not referenced in frontend runtime code", () => {
  const targetDirs = [
    path.join(root, "src/pages"),
    path.join(root, "src/components"),
  ];
  const legacyTokens = ["ClanPosition", "TacticalOverlay", "ClanBroadcast"];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!entry.name.endsWith(".js") && !entry.name.endsWith(".jsx")) continue;
      const source = fs.readFileSync(absolute, "utf8");
      for (const token of legacyTokens) {
        assert.equal(
          source.includes(token),
          false,
          `Unexpected legacy token "${token}" found in ${path.relative(root, absolute)}`,
        );
      }
    }
  };

  targetDirs.forEach(walk);
});

test("map canvas uses maplibre-gl and tactical writes flow through mutateMapDomain", () => {
  const canvas = read("src/components/map/MapCanvas.jsx");
  const tacticalMap = read("src/pages/TacticalMap.jsx");
  assert.ok(canvas.includes('import maplibregl from "maplibre-gl";'));

  assert.ok(tacticalMap.includes('base44.functions.invoke("mutateMapDomain"'));
  assert.equal(tacticalMap.includes("base44.entities.MapPin.create("), false);
  assert.equal(tacticalMap.includes("base44.entities.MapPin.update("), false);
  assert.equal(tacticalMap.includes("base44.entities.MapPin.delete("), false);
  assert.equal(tacticalMap.includes("base44.entities.MapBroadcast.create("), false);
});
