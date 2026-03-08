import test from "node:test";
import assert from "node:assert/strict";
import { runStaticAudit } from "../scripts/function-audit-core.mjs";

test("function wiring audit has complete static coverage", async () => {
  const report = await runStaticAudit(process.cwd());

  assert.equal(report.summary.function_count, report.summary.capability_count, "function/capability counts must match");
  assert.equal(report.summary.function_count, report.summary.payload_template_count, "function/template counts must match");
  assert.equal(report.summary.missing_capabilities.length, 0, "missing capabilities detected");
  assert.equal(report.summary.extra_capabilities.length, 0, "extra capabilities detected");
  assert.equal(report.summary.missing_schemas.length, 0, "missing schemas detected");
  assert.equal(report.summary.missing_payload_templates.length, 0, "missing payload templates detected");
  assert.equal(report.summary.missing_surface_routes.length, 0, "missing UI route coverage for at least one surface");
  assert.equal(report.summary.global_issues.length, 0, `global issues found: ${report.summary.global_issues.join("; ")}`);
  assert.equal(report.summary.failed_functions, 0, "one or more function rows failed static audit checks");
});
