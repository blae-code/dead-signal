import fs from "node:fs";
import path from "node:path";
import { runStaticAudit } from "./function-audit-core.mjs";

const root = process.cwd();
const auditDir = path.join(root, "audit");
const evidenceDir = path.join(auditDir, "evidence");

const nowStamp = new Date().toISOString().replace(/[:.]/g, "-");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const mdEscape = (value) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br/>");

const toMarkdown = (report) => {
  const lines = [];
  lines.push("# Function Wiring Audit Report");
  lines.push("");
  lines.push(`Generated: ${report.summary.generated_at}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Functions: ${report.summary.function_count}`);
  lines.push(`- Capabilities: ${report.summary.capability_count}`);
  lines.push(`- Payload templates: ${report.summary.payload_template_count}`);
  lines.push(`- Passed: ${report.summary.passed_functions}`);
  lines.push(`- Failed: ${report.summary.failed_functions}`);
  lines.push(`- FunctionConsole route: ${report.summary.function_console_route ? "present" : "missing"}`);
  lines.push(
    `- FunctionConsole dynamic coverage: ${report.summary.function_console_dynamic_coverage ? "present" : "missing"}`,
  );
  lines.push("");
  lines.push("## Matrix");
  lines.push("");
  lines.push("| function_id | surface | role | risk | execution_mode | ui_location | expected_result | evidence | status | issues |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of report.matrix) {
    lines.push(
      `| ${mdEscape(row.function_id)} | ${mdEscape(row.ui_surface)} | ${mdEscape(row.required_role)} | ${mdEscape(row.risk_level)} | ${mdEscape(row.execution_mode)} | ${mdEscape(row.ui_location.join("; "))} | ${mdEscape(row.expected_result)} | ${mdEscape(row.evidence.join("; "))} | ${mdEscape(row.status)} | ${mdEscape(row.issues.join("; "))} |`,
    );
  }
  lines.push("");
  lines.push("## Global Issues");
  lines.push("");
  if (report.summary.global_issues.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of report.summary.global_issues) {
      lines.push(`- ${issue}`);
    }
  }
  lines.push("");
  lines.push("## Surface Route Coverage");
  lines.push("");
  for (const surface of report.surface_route_coverage) {
    lines.push(
      `- ${surface.surface}: found [${surface.found_routes.join(", ")}], hints [${surface.route_hints.join(", ")}]`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
};

const main = async () => {
  ensureDir(auditDir);
  ensureDir(evidenceDir);

  const report = await runStaticAudit(root);

  const summaryPath = path.join(auditDir, "function-audit-summary.json");
  const matrixPath = path.join(auditDir, "function-audit-matrix.json");
  const markdownPath = path.join(auditDir, "function-audit-report.md");
  const evidenceJsonPath = path.join(evidenceDir, `${nowStamp}-function-static-audit.json`);

  fs.writeFileSync(summaryPath, `${JSON.stringify(report.summary, null, 2)}\n`);
  fs.writeFileSync(matrixPath, `${JSON.stringify(report.matrix, null, 2)}\n`);
  fs.writeFileSync(markdownPath, toMarkdown(report));
  fs.writeFileSync(evidenceJsonPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Function audit complete: ${report.summary.passed_functions}/${report.summary.function_count} pass`);
  console.log(`Summary: ${path.relative(root, summaryPath).replace(/\\/g, "/")}`);
  console.log(`Matrix: ${path.relative(root, matrixPath).replace(/\\/g, "/")}`);
  console.log(`Report: ${path.relative(root, markdownPath).replace(/\\/g, "/")}`);
  console.log(`Evidence: ${path.relative(root, evidenceJsonPath).replace(/\\/g, "/")}`);

  if (report.summary.failed_functions > 0 || report.summary.global_issues.length > 0) {
    process.exitCode = 1;
  }
};

await main();
