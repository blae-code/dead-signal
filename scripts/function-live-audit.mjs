import fs from "node:fs";
import path from "node:path";
import { createClient } from "@base44/sdk";
import { loadPayloadTemplates, runStaticAudit } from "./function-audit-core.mjs";

const root = process.cwd();
const auditDir = path.join(root, "audit");
const evidenceDir = path.join(auditDir, "evidence");
const nowStamp = new Date().toISOString().replace(/[:.]/g, "-");

const BLOCKED_CODES = new Set([
  "missing_panel_config",
  "invalid_runtime_config",
  "panel_unreachable",
  "panel_timeout",
  "panel_circuit_open",
  "entity_unavailable",
  "unknown_panel_target",
]);

const DEFAULT_PHASES = [
  "read-only",
  "permission",
  "dry-run",
  "controlled-write",
  "deferred-disruptive",
];

const parseArgs = (argv) => {
  const phasesArg = argv.find((arg) => arg.startsWith("--phases="));
  const phases = phasesArg
    ? phasesArg.split("=")[1].split(",").map((value) => value.trim()).filter(Boolean)
    : DEFAULT_PHASES;
  return {
    phases,
    allowControlledWrite: argv.includes("--allow-controlled-write"),
    allowDisruptive: argv.includes("--allow-disruptive"),
    strict: argv.includes("--strict"),
  };
};

const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const responseSnippet = (value) => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value).slice(0, 2000);
  } catch {
    return String(value).slice(0, 2000);
  }
};

const invokeFunction = async (client, functionId, payload) => {
  const started = Date.now();
  try {
    const response = await client.functions.invoke(functionId, payload);
    const data = response?.data ?? null;
    const status = typeof response?.status === "number" ? response.status : 200;
    const hasError = Boolean(data?.error);
    return {
      ok: !hasError && status < 400,
      status,
      code: typeof data?.code === "string" ? data.code : null,
      error: hasError ? String(data.error) : null,
      latency_ms: Date.now() - started,
      response: data,
    };
  } catch (error) {
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? null;
    const message = data?.error || error?.message || "invoke_failed";
    return {
      ok: false,
      status,
      code: typeof data?.code === "string" ? data.code : null,
      error: String(message),
      latency_ms: Date.now() - started,
      response: data,
    };
  }
};

const classifyStandardOutcome = (result) => {
  if (result.ok) return "pass";
  if (result.code && BLOCKED_CODES.has(result.code)) return "blocked";
  return "fail";
};

const classifyPermissionOutcome = (result) => {
  if (result.status === 403 || result.code === "forbidden") return "pass";
  if (result.status === 401 || result.code === "unauthorized") return "blocked";
  if (result.ok) return "fail";
  return "fail";
};

const classifyAllowOutcome = (result) => classifyStandardOutcome(result);

const shouldRunPhase = (phaseName, selectedPhases) => selectedPhases.includes(phaseName);

const toMarkdown = (report) => {
  const lines = [];
  lines.push("# Live Function Audit Report");
  lines.push("");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push("");
  lines.push("## Config");
  lines.push("");
  lines.push(`- app_id: ${report.config.app_id || "missing"}`);
  lines.push(`- server_url: ${report.config.server_url}`);
  lines.push(`- admin_token: ${report.config.admin_token_present ? "present" : "missing"}`);
  lines.push(`- non_admin_token: ${report.config.non_admin_token_present ? "present" : "missing"}`);
  lines.push(`- tactical_writer_token: ${report.config.tactical_writer_token_present ? "present" : "missing"}`);
  lines.push(`- allow_controlled_write: ${report.config.allow_controlled_write}`);
  lines.push(`- allow_disruptive: ${report.config.allow_disruptive}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- pass: ${report.summary.pass}`);
  lines.push(`- fail: ${report.summary.fail}`);
  lines.push(`- blocked: ${report.summary.blocked}`);
  lines.push(`- deferred: ${report.summary.deferred}`);
  lines.push(`- skipped: ${report.summary.skipped}`);
  lines.push("");
  for (const phase of report.phases) {
    lines.push(`## Phase: ${phase.phase}`);
    lines.push("");
    lines.push(`- status: ${phase.status}`);
    lines.push(`- pass: ${phase.summary.pass}`);
    lines.push(`- fail: ${phase.summary.fail}`);
    lines.push(`- blocked: ${phase.summary.blocked}`);
    lines.push(`- deferred: ${phase.summary.deferred}`);
    lines.push(`- skipped: ${phase.summary.skipped}`);
    lines.push("");
    if (phase.status === "skipped" && phase.reason) {
      lines.push(`Reason: ${phase.reason}`);
      lines.push("");
      continue;
    }
    lines.push("| function_id | case | outcome | latency_ms | status | code | error |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const item of phase.results) {
      const line = [
        item.function_id,
        item.case || "",
        item.outcome,
        item.latency_ms ?? "",
        item.status ?? "",
        item.code ?? "",
        (item.error || "").replace(/\|/g, "\\|"),
      ];
      lines.push(`| ${line.join(" | ")} |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
};

const summarizeResults = (results) =>
  results.reduce(
    (acc, item) => {
      const key = item.outcome;
      if (Object.prototype.hasOwnProperty.call(acc, key)) {
        acc[key] += 1;
      }
      return acc;
    },
    { pass: 0, fail: 0, blocked: 0, deferred: 0, skipped: 0 },
  );

const createClientFromToken = ({ appId, token, serverUrl }) =>
  createClient({
    appId,
    token,
    serverUrl,
    requiresAuth: false,
  });

const runPhase = async ({ phase, rows, client, payloadTemplates, classify, caseLabel = "" }) => {
  const results = [];
  for (const row of rows) {
    const basePayload = clone(payloadTemplates[row.function_id] || {});
    if (phase === "dry-run" && typeof basePayload === "object" && basePayload !== null && "dry_run" in basePayload) {
      basePayload.dry_run = true;
    }
    const result = await invokeFunction(client, row.function_id, basePayload);
    results.push({
      function_id: row.function_id,
      case: caseLabel,
      outcome: classify(result),
      latency_ms: result.latency_ms,
      status: result.status,
      code: result.code,
      error: result.error,
      payload: basePayload,
      response_snippet: responseSnippet(result.response),
    });
  }
  return results;
};

const main = async () => {
  ensureDir(auditDir);
  ensureDir(evidenceDir);

  const options = parseArgs(process.argv.slice(2));
  const staticAudit = await runStaticAudit(root);
  const payloadTemplates = await loadPayloadTemplates(root);
  const rows = staticAudit.matrix;

  const appId = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID || "";
  const serverUrl = process.env.BASE44_SERVER_URL || "https://base44.app";
  const adminToken = process.env.AUDIT_ADMIN_TOKEN || process.env.BASE44_ADMIN_TOKEN || "";
  const nonAdminToken = process.env.AUDIT_NONADMIN_TOKEN || process.env.BASE44_NONADMIN_TOKEN || "";
  const tacticalWriterToken = process.env.AUDIT_TACTICAL_WRITER_TOKEN || process.env.BASE44_TACTICAL_WRITER_TOKEN || "";

  const report = {
    generated_at: new Date().toISOString(),
    config: {
      app_id: appId || null,
      server_url: serverUrl,
      admin_token_present: Boolean(adminToken),
      non_admin_token_present: Boolean(nonAdminToken),
      tactical_writer_token_present: Boolean(tacticalWriterToken),
      allow_controlled_write: options.allowControlledWrite,
      allow_disruptive: options.allowDisruptive,
      phases: options.phases,
    },
    phases: [],
    summary: { pass: 0, fail: 0, blocked: 0, deferred: 0, skipped: 0 },
    prerequisites: [],
  };

  if (!appId) {
    report.prerequisites.push("Missing BASE44_APP_ID (or VITE_BASE44_APP_ID).");
  }
  if (!adminToken) {
    report.prerequisites.push("Missing AUDIT_ADMIN_TOKEN (or BASE44_ADMIN_TOKEN).");
  }

  if (report.prerequisites.length > 0) {
    for (const phaseName of options.phases) {
      report.phases.push({
        phase: phaseName,
        status: "skipped",
        reason: "Missing required credentials/config.",
        results: [],
        summary: { pass: 0, fail: 0, blocked: 0, deferred: 0, skipped: 0 },
      });
      report.summary.skipped += 1;
    }
    const jsonPath = path.join(evidenceDir, `${nowStamp}-function-live-audit.json`);
    const mdPath = path.join(auditDir, "function-live-audit-report.md");
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(mdPath, toMarkdown(report));
    console.log(`Live audit skipped. Missing prerequisites: ${report.prerequisites.join(" ")}`);
    console.log(`Evidence: ${path.relative(root, jsonPath).replace(/\\/g, "/")}`);
    if (options.strict) {
      process.exitCode = 1;
    }
    return;
  }

  const adminClient = createClientFromToken({ appId, token: adminToken, serverUrl });
  const nonAdminClient = nonAdminToken
    ? createClientFromToken({ appId, token: nonAdminToken, serverUrl })
    : null;
  const tacticalWriterClient = tacticalWriterToken
    ? createClientFromToken({ appId, token: tacticalWriterToken, serverUrl })
    : null;

  if (shouldRunPhase("read-only", options.phases)) {
    const phaseRows = rows.filter((row) => row.execution_mode === "read-only");
    const results = await runPhase({
      phase: "read-only",
      rows: phaseRows,
      client: adminClient,
      payloadTemplates,
      classify: classifyStandardOutcome,
      caseLabel: "admin_read",
    });
    report.phases.push({
      phase: "read-only",
      status: "completed",
      results,
      summary: summarizeResults(results),
    });
  }

  if (shouldRunPhase("permission", options.phases)) {
    const phaseResults = [];
    const notes = [];
    if (nonAdminClient) {
      const adminRows = rows.filter((row) => row.required_role === "admin");
      const adminDenied = await runPhase({
        phase: "permission",
        rows: adminRows,
        client: nonAdminClient,
        payloadTemplates,
        classify: classifyPermissionOutcome,
        caseLabel: "non_admin_denied_admin",
      });
      phaseResults.push(...adminDenied);

      const tacticalRows = rows.filter((row) => row.required_role === "tactical_writer");
      const tacticalDenied = await runPhase({
        phase: "permission",
        rows: tacticalRows,
        client: nonAdminClient,
        payloadTemplates,
        classify: classifyPermissionOutcome,
        caseLabel: "non_admin_denied_tactical",
      });
      phaseResults.push(...tacticalDenied);
    } else {
      notes.push("Missing AUDIT_NONADMIN_TOKEN (or BASE44_NONADMIN_TOKEN).");
    }

    if (tacticalWriterClient) {
      const tacticalRows = rows.filter((row) => row.required_role === "tactical_writer");
      const tacticalAllowed = await runPhase({
        phase: "permission",
        rows: tacticalRows,
        client: tacticalWriterClient,
        payloadTemplates,
        classify: classifyAllowOutcome,
        caseLabel: "tactical_writer_allowed",
      });
      phaseResults.push(...tacticalAllowed);
    } else {
      notes.push("Missing AUDIT_TACTICAL_WRITER_TOKEN (or BASE44_TACTICAL_WRITER_TOKEN).");
    }

    if (phaseResults.length === 0) {
      report.phases.push({
        phase: "permission",
        status: "skipped",
        reason: notes.join(" "),
        results: [],
        summary: { pass: 0, fail: 0, blocked: 0, deferred: 0, skipped: 1 },
      });
    } else {
      const results = phaseResults;
      report.phases.push({
        phase: "permission",
        status: "completed",
        results,
        summary: summarizeResults(results),
      });
    }
  }

  if (shouldRunPhase("dry-run", options.phases)) {
    const phaseRows = rows.filter((row) => row.execution_mode === "dry-run");
    const results = await runPhase({
      phase: "dry-run",
      rows: phaseRows,
      client: adminClient,
      payloadTemplates,
      classify: classifyStandardOutcome,
    });
    report.phases.push({
      phase: "dry-run",
      status: "completed",
      results,
      summary: summarizeResults(results),
    });
  }

  if (shouldRunPhase("controlled-write", options.phases)) {
    if (!options.allowControlledWrite) {
      const phaseRows = rows.filter((row) => row.execution_mode === "controlled-write");
      const results = phaseRows.map((row) => ({
        function_id: row.function_id,
        outcome: "deferred",
        latency_ms: null,
        status: null,
        code: null,
        error: "Deferred: run with --allow-controlled-write to execute.",
        payload: null,
        response_snippet: null,
      }));
      report.phases.push({
        phase: "controlled-write",
        status: "skipped",
        reason: "Controlled writes disabled by default.",
        results,
        summary: summarizeResults(results),
      });
    } else {
      const phaseRows = rows.filter((row) => row.execution_mode === "controlled-write");
      const results = await runPhase({
        phase: "controlled-write",
        rows: phaseRows,
        client: adminClient,
        payloadTemplates,
        classify: classifyStandardOutcome,
      });
      report.phases.push({
        phase: "controlled-write",
        status: "completed",
        results,
        summary: summarizeResults(results),
      });
    }
  }

  if (shouldRunPhase("deferred-disruptive", options.phases)) {
    const phaseRows = rows.filter((row) => row.execution_mode === "deferred-disruptive");
    if (!options.allowDisruptive) {
      const results = phaseRows.map((row) => ({
        function_id: row.function_id,
        outcome: "deferred",
        latency_ms: null,
        status: null,
        code: null,
        error: "Deferred disruptive operation (maintenance-window approval required).",
        payload: null,
        response_snippet: null,
      }));
      report.phases.push({
        phase: "deferred-disruptive",
        status: "skipped",
        reason: "Disruptive operations deferred by default.",
        results,
        summary: summarizeResults(results),
      });
    } else {
      const results = await runPhase({
        phase: "deferred-disruptive",
        rows: phaseRows,
        client: adminClient,
        payloadTemplates,
        classify: classifyStandardOutcome,
      });
      report.phases.push({
        phase: "deferred-disruptive",
        status: "completed",
        results,
        summary: summarizeResults(results),
      });
    }
  }

  for (const phase of report.phases) {
    report.summary.pass += phase.summary.pass;
    report.summary.fail += phase.summary.fail;
    report.summary.blocked += phase.summary.blocked;
    report.summary.deferred += phase.summary.deferred;
    report.summary.skipped += phase.summary.skipped;
  }

  const jsonPath = path.join(evidenceDir, `${nowStamp}-function-live-audit.json`);
  const mdPath = path.join(auditDir, "function-live-audit-report.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, toMarkdown(report));

  console.log(`Live audit complete. pass=${report.summary.pass} fail=${report.summary.fail} blocked=${report.summary.blocked} deferred=${report.summary.deferred}`);
  console.log(`Report: ${path.relative(root, mdPath).replace(/\\/g, "/")}`);
  console.log(`Evidence: ${path.relative(root, jsonPath).replace(/\\/g, "/")}`);

  if (report.summary.fail > 0) {
    process.exitCode = 1;
  }
};

await main();
