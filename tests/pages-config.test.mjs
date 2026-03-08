import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pageFiles = fs.readdirSync(path.join(root, "src/pages"))
  .filter((name) => name.endsWith(".jsx"))
  .map((name) => name.replace(/\.jsx$/, ""))
  .sort();

const pagesConfigSource = fs.readFileSync(path.join(root, "src/pages.config.js"), "utf8");
const pagesMatches = Array.from(pagesConfigSource.matchAll(/export const PAGES = \{([\s\S]*?)\n\}/g));
const pagesBlock = pagesMatches.length > 0 ? pagesMatches[pagesMatches.length - 1][1] : "";
const pageKeys = Array.from(pagesBlock.matchAll(/"([A-Za-z0-9_]+)":\s+[A-Za-z0-9_]+,/g))
  .map((match) => match[1])
  .sort();

test("all page modules are present in pages.config", () => {
  assert.deepEqual(pageKeys, pageFiles);
});
