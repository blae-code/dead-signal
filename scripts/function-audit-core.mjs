import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CAPABILITY_SOURCE_PATH = "functions/_shared/functionCapabilities.ts";
const FUNCTION_CONSOLE_PATH = "src/pages/FunctionConsole.jsx";
const PAGES_CONFIG_PATH = "src/pages.config.js";
const PAYLOAD_TEMPLATE_PATH = "src/lib/function-payload-templates.js";
const SOURCE_DIR = "src";

const DISRUPTIVE_FUNCTIONS = new Set([
  "controlServerPower",
  "executeScheduledCommand",
  "scheduleServerRestart",
]);

const HIGH_RISK_LEVELS = new Set(["high", "critical"]);

const SURFACE_TITLES = {
  ops_center: "Ops Center",
  telemetry_pipeline_lab: "Telemetry Pipeline Lab",
  security_diagnostics: "Security/Diagnostics",
  ai_intel_studio: "AI/Intel Studio",
  field_ops: "Field Ops",
};

const SURFACE_ROUTE_HINTS = {
  ops_center: ["FunctionConsole", "ServerMonitor", "EngineeringOps"],
  telemetry_pipeline_lab: ["FunctionConsole", "EngineeringOps"],
  security_diagnostics: ["FunctionConsole", "ServerMonitor"],
  ai_intel_studio: ["FunctionConsole", "AIAgent", "Intel"],
  field_ops: ["FunctionConsole", "TacticalMap", "ClanMap"],
};

const readText = (root, relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const extractBetween = (source, startToken, endToken) => {
  const startIndex = source.indexOf(startToken);
  if (startIndex < 0) return "";
  const fromStart = source.slice(startIndex + startToken.length);
  const endIndex = fromStart.indexOf(endToken);
  if (endIndex < 0) return "";
  return fromStart.slice(0, endIndex);
};

const toSortedUnique = (values) => Array.from(new Set(values)).sort();

const recurseFiles = (rootDir, exts) => {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(resolved);
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        out.push(resolved);
      }
    }
  }
  return out;
};

const parseSchemaFields = (source) => {
  const fields = [];
  const fieldRegex = /schemaField\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(true|false)\s*,\s*"([^"]*)"\s*\)/g;
  let match;
  while ((match = fieldRegex.exec(source)) !== null) {
    fields.push({
      field: match[1],
      type: match[2],
      required: match[3] === "true",
      description: match[4],
    });
  }
  return fields;
};

const parseSchemaSection = (entrySource, sectionName) => {
  const sectionRegex = new RegExp(`${sectionName}:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = entrySource.match(sectionRegex);
  return match ? parseSchemaFields(match[1]) : [];
};

const parseExecutionMode = (functionId, capability, schema) => {
  if (!capability) return "unknown";
  if (DISRUPTIVE_FUNCTIONS.has(functionId)) return "deferred-disruptive";
  if (schema?.input_fields?.includes("dry_run")) return "dry-run";
  if (capability.observable_only) return "read-only";
  return "controlled-write";
};

const executionModeExpectation = (executionMode) => {
  if (executionMode === "read-only") return "Live read path returns envelope without mutation.";
  if (executionMode === "dry-run") return "Dry-run output is structured and does not mutate live state.";
  if (executionMode === "controlled-write") return "Write path executes with role gate, policy checks, and observable result.";
  if (executionMode === "deferred-disruptive") return "Disruptive operation is explicitly deferred without maintenance-window approval.";
  return "No expectation available.";
};

const readFunctionContract = (root, functionId) => {
  const source = readText(root, `functions/${functionId}.ts`);
  return {
    hasDenoServe: /Deno\.serve\(/.test(source),
    hasRequireMethod: /requireMethod\s*\(/.test(source),
    hasRequireAdmin: /requireAdmin\s*\(/.test(source),
    hasRequireAuthenticated: /requireAuthenticated\s*\(/.test(source),
    hasRequireTacticalWriter: /requireTacticalWriter\s*\(/.test(source),
    hasErrorResponse: /errorResponse\s*\(/.test(source),
    hasTryCatch: /try\s*\{[\s\S]*catch\s*\(/.test(source),
  };
};

const parseCapabilities = (root) => {
  const source = readText(root, CAPABILITY_SOURCE_PATH);
  const arrayBody = extractBetween(
    source,
    "const CAPABILITIES: CapabilitySeed[] = [",
    "];",
  );

  const entries = [];
  const byId = new Map();

  const entryRegex =
    /\{\s*function_id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*ui_surface:\s*"([^"]+)",\s*required_role:\s*"([^"]+)",\s*risk_level:\s*"([^"]+)",\s*confirmation_required:\s*(true|false),\s*observable_only:\s*(true|false),\s*\},/gs;
  let match;
  while ((match = entryRegex.exec(arrayBody)) !== null) {
    const entry = {
      function_id: match[1],
      title: match[2],
      description: match[3],
      ui_surface: match[4],
      required_role: match[5],
      risk_level: match[6],
      confirmation_required: match[7] === "true",
      observable_only: match[8] === "true",
    };
    entries.push(entry);
    byId.set(entry.function_id, entry);
  }

  return { entries, byId };
};

const parseCapabilitySchemas = (root) => {
  const source = readText(root, CAPABILITY_SOURCE_PATH);
  const schemasBody = extractBetween(
    source,
    "const CAPABILITY_SCHEMAS: Record<string, CapabilitySchemas> = {",
    "};\n\nconst CAPABILITIES_WITH_SCHEMAS",
  );

  const schemas = new Map();
  const entryRegex = /([A-Za-z0-9_]+):\s*\{([\s\S]*?)\n\s*\},/g;
  let match;
  while ((match = entryRegex.exec(schemasBody)) !== null) {
    const functionId = match[1];
    const body = match[2];
    const inputSchema = parseSchemaSection(body, "input_schema");
    const outputSchema = parseSchemaSection(body, "output_schema");
    schemas.set(functionId, {
      input_schema: inputSchema,
      output_schema: outputSchema,
      input_fields: inputSchema.map((field) => field.field),
      output_fields: outputSchema.map((field) => field.field),
      required_input_fields: inputSchema.filter((field) => field.required).map((field) => field.field),
    });
  }

  return schemas;
};

const parsePageKeys = (root) => {
  const source = readText(root, PAGES_CONFIG_PATH);
  const blockMatches = Array.from(source.matchAll(/export const PAGES = \{([\s\S]*?)\n\}/g));
  const pagesBlock = blockMatches.length > 0 ? blockMatches[blockMatches.length - 1][1] : "";
  if (!pagesBlock) return [];
  return Array.from(pagesBlock.matchAll(/"([A-Za-z0-9_]+)":\s+[A-Za-z0-9_]+,/g))
    .map((match) => match[1])
    .sort();
};

const collectInvokeReferences = (root) => {
  const files = recurseFiles(path.join(root, SOURCE_DIR), [".js", ".jsx", ".ts", ".tsx"]);
  const byFunction = new Map();
  for (const absolutePath of files) {
    const content = fs.readFileSync(absolutePath, "utf8");
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
    const invokeRegex = /base44\.functions\.invoke\(\s*["']([^"']+)["']/g;
    let match;
    while ((match = invokeRegex.exec(content)) !== null) {
      const functionId = match[1];
      if (!byFunction.has(functionId)) {
        byFunction.set(functionId, new Set());
      }
      byFunction.get(functionId).add(relativePath);
    }
  }
  return byFunction;
};

export const loadPayloadTemplates = async (root = process.cwd()) => {
  const moduleUrl = pathToFileURL(path.join(root, PAYLOAD_TEMPLATE_PATH)).href;
  const module = await import(moduleUrl);
  const templates = module.FUNCTION_PAYLOAD_TEMPLATES || {};
  return templates;
};

export const listFunctionIds = (root = process.cwd()) =>
  fs.readdirSync(path.join(root, "functions"))
    .filter((name) => name.endsWith(".ts") && !name.startsWith("_"))
    .map((name) => name.replace(/\.ts$/, ""))
    .sort();

export const runStaticAudit = async (root = process.cwd()) => {
  const functionIds = listFunctionIds(root);
  const { entries: capabilities, byId: capabilityById } = parseCapabilities(root);
  const schemaById = parseCapabilitySchemas(root);
  const pageKeys = parsePageKeys(root);
  const invokeReferences = collectInvokeReferences(root);
  const payloadTemplates = await loadPayloadTemplates(root);
  const payloadTemplateIds = Object.keys(payloadTemplates).sort();
  const functionConsoleSource = readText(root, FUNCTION_CONSOLE_PATH);
  const hasFunctionConsoleRoute = pageKeys.includes("FunctionConsole");
  const functionConsoleDynamicCoverage =
    hasFunctionConsoleRoute
    && /selectedGroup\?\.capabilities\.map/.test(functionConsoleSource)
    && /base44\.functions\.invoke\(functionId,\s*parsedPayload\)/.test(functionConsoleSource);

  const capabilityIds = capabilities.map((capability) => capability.function_id).sort();
  const missingCapabilities = functionIds.filter((functionId) => !capabilityById.has(functionId));
  const extraCapabilities = capabilityIds.filter((functionId) => !functionIds.includes(functionId));
  const missingSchemas = functionIds.filter((functionId) => !schemaById.has(functionId));
  const missingPayloadTemplates = functionIds.filter((functionId) => !payloadTemplateIds.includes(functionId));

  const surfaceRouteCoverage = Object.entries(SURFACE_ROUTE_HINTS).map(([surface, routeHints]) => ({
    surface,
    route_hints: routeHints,
    found_routes: routeHints.filter((routeKey) => pageKeys.includes(routeKey)),
  }));
  const missingSurfaceRoutes = surfaceRouteCoverage
    .filter((entry) => entry.found_routes.length === 0)
    .map((entry) => entry.surface);

  const globalIssues = [];
  if (!hasFunctionConsoleRoute) {
    globalIssues.push("pages.config is missing FunctionConsole route.");
  }
  if (!functionConsoleDynamicCoverage) {
    globalIssues.push("FunctionConsole is not dynamically rendering capability-based execution cards.");
  }
  if (missingCapabilities.length > 0) {
    globalIssues.push(`Missing capabilities for: ${missingCapabilities.join(", ")}`);
  }
  if (extraCapabilities.length > 0) {
    globalIssues.push(`Capability registry has unknown entries: ${extraCapabilities.join(", ")}`);
  }
  if (missingSchemas.length > 0) {
    globalIssues.push(`Missing capability schemas for: ${missingSchemas.join(", ")}`);
  }
  if (missingPayloadTemplates.length > 0) {
    globalIssues.push(`Missing payload templates for: ${missingPayloadTemplates.join(", ")}`);
  }
  if (missingSurfaceRoutes.length > 0) {
    globalIssues.push(`UI route coverage missing for surfaces: ${missingSurfaceRoutes.join(", ")}`);
  }

  const matrix = functionIds.map((functionId) => {
    const capability = capabilityById.get(functionId) || null;
    const schema = schemaById.get(functionId) || null;
    const functionContract = readFunctionContract(root, functionId);
    const directInvocations = toSortedUnique(Array.from(invokeReferences.get(functionId) || []))
      .filter((sourcePath) => sourcePath !== "src/pages/FunctionConsole.jsx");
    const rowIssues = [];

    if (!capability) {
      rowIssues.push("No capability registry entry.");
    } else {
      if (!capability.required_role || !capability.risk_level || !capability.ui_surface) {
        rowIssues.push("Capability entry is missing required role/risk/surface fields.");
      }
      if (capability.required_role === "admin" && !functionContract.hasRequireAdmin) {
        rowIssues.push("Admin capability is not enforced by requireAdmin in backend function.");
      }
      if (capability.required_role === "authenticated" && !functionContract.hasRequireAuthenticated) {
        rowIssues.push("Authenticated capability is not enforced by requireAuthenticated in backend function.");
      }
      if (capability.required_role === "tactical_writer" && !functionContract.hasRequireTacticalWriter) {
        rowIssues.push("Tactical-writer capability is not enforced by requireTacticalWriter in backend function.");
      }
      if (capability.required_role === "authenticated" && functionContract.hasRequireAdmin) {
        rowIssues.push("Authenticated capability is over-restricted by requireAdmin.");
      }
      if (capability.required_role !== "authenticated"
        && HIGH_RISK_LEVELS.has(capability.risk_level)
        && !capability.confirmation_required) {
        rowIssues.push("High-risk privileged capability must require confirmation.");
      }
    }

    if (!schema) {
      rowIssues.push("Capability schema entry is missing.");
    } else {
      if (schema.input_schema.length === 0 && schema.required_input_fields.length > 0) {
        rowIssues.push("Schema required-input metadata is inconsistent.");
      }
      if (schema.output_schema.length === 0) {
        rowIssues.push("Output schema is empty.");
      }
    }

    if (!payloadTemplateIds.includes(functionId)) {
      rowIssues.push("Payload template is missing.");
    } else if (schema) {
      const template = payloadTemplates[functionId];
      const templateKeys = template && typeof template === "object" ? Object.keys(template) : [];
      for (const requiredInputField of schema.required_input_fields) {
        if (!templateKeys.includes(requiredInputField)) {
          rowIssues.push(`Payload template is missing required field: ${requiredInputField}`);
        }
      }
    }

    if (!functionContract.hasDenoServe) rowIssues.push("Backend function is missing Deno.serve handler.");
    if (!functionContract.hasRequireMethod) rowIssues.push("Backend function is missing requireMethod guard.");
    if (!functionContract.hasErrorResponse) rowIssues.push("Backend function is missing errorResponse envelope path.");
    if (!functionContract.hasTryCatch) rowIssues.push("Backend function is missing top-level try/catch.");

    const uiLocations = [];
    if (capability && hasFunctionConsoleRoute) {
      const surfaceLabel = SURFACE_TITLES[capability.ui_surface] || capability.ui_surface;
      uiLocations.push(`FunctionConsole > ${surfaceLabel}`);
    }
    for (const sourcePath of directInvocations) {
      uiLocations.push(sourcePath);
    }
    if (uiLocations.length === 0) {
      rowIssues.push("No routed UI execution or observation path was detected.");
    }

    const executionMode = parseExecutionMode(functionId, capability, schema);
    const evidence = toSortedUnique([
      `functions/${functionId}.ts`,
      CAPABILITY_SOURCE_PATH,
      PAYLOAD_TEMPLATE_PATH,
      ...uiLocations.filter((location) => location.startsWith("src/")),
      hasFunctionConsoleRoute ? FUNCTION_CONSOLE_PATH : "",
    ].filter(Boolean));

    return {
      function_id: functionId,
      title: capability?.title || functionId,
      ui_surface: capability?.ui_surface || "unmapped",
      required_role: capability?.required_role || "unmapped",
      risk_level: capability?.risk_level || "unmapped",
      confirmation_required: capability?.confirmation_required ?? false,
      observable_only: capability?.observable_only ?? false,
      ui_location: uiLocations,
      execution_mode: executionMode,
      expected_result: executionModeExpectation(executionMode),
      evidence,
      direct_invocations: directInvocations,
      schema: schema || null,
      checks: functionContract,
      status: rowIssues.length === 0 ? "pass" : "fail",
      issues: rowIssues,
    };
  });

  const failedRows = matrix.filter((row) => row.status === "fail");
  const summary = {
    generated_at: new Date().toISOString(),
    function_count: functionIds.length,
    capability_count: capabilities.length,
    payload_template_count: payloadTemplateIds.length,
    route_count: pageKeys.length,
    passed_functions: matrix.length - failedRows.length,
    failed_functions: failedRows.length,
    missing_capabilities: missingCapabilities,
    extra_capabilities: extraCapabilities,
    missing_schemas: missingSchemas,
    missing_payload_templates: missingPayloadTemplates,
    missing_surface_routes: missingSurfaceRoutes,
    global_issues: globalIssues,
    function_console_route: hasFunctionConsoleRoute,
    function_console_dynamic_coverage: functionConsoleDynamicCoverage,
  };

  return {
    summary,
    matrix,
    page_keys: pageKeys,
    surface_route_coverage: surfaceRouteCoverage,
  };
};
