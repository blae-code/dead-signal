import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const listFunctionFiles = () =>
  fs.readdirSync(path.join(root, "functions"))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => name.replace(/\.ts$/, ""))
    .sort();

const listCapabilityIds = () => {
  const content = read("functions/_shared/functionCapabilities.ts");
  return Array.from(content.matchAll(/function_id:\s+"([^"]+)"/g)).map((match) => match[1]);
};

const listTemplateIds = async () => {
  const module = await import(pathToFileURL(path.join(root, "src/lib/function-payload-templates.js")).href);
  return Object.keys(module.FUNCTION_PAYLOAD_TEMPLATES || {}).sort();
};

test("every backend function has a capability entry", () => {
  const functionFiles = listFunctionFiles();
  const capabilityIds = listCapabilityIds().sort();
  assert.deepEqual(capabilityIds, functionFiles);
});

test("every capability id has schema entry", () => {
  const content = read("functions/_shared/functionCapabilities.ts");
  const schemaSection = content.split("const CAPABILITY_SCHEMAS")[1] || "";
  const capabilityIds = listCapabilityIds();
  capabilityIds.forEach((functionId) => {
    assert.ok(
      schemaSection.includes(`${functionId}: {`),
      `Missing schema definition for ${functionId}`,
    );
  });
});

test("every backend function has a payload template", async () => {
  const functionFiles = listFunctionFiles().sort();
  const templateIds = await listTemplateIds();
  assert.deepEqual(templateIds, functionFiles);
});
