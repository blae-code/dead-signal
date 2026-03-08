# Function Wiring Audit Runbook

## Local static audit

Run the static coverage audit (function files, capabilities, schemas, templates, and UI routing):

```bash
npm run audit:functions
```

Artifacts:

- `audit/function-audit-summary.json`
- `audit/function-audit-matrix.json`
- `audit/function-audit-report.md`
- `audit/evidence/<timestamp>-function-static-audit.json`

## Live production audit (phased)

Required environment:

- `BASE44_APP_ID` (or `VITE_BASE44_APP_ID`)
- `AUDIT_ADMIN_TOKEN` (admin user token)

Optional environment:

- `BASE44_SERVER_URL` (default: `https://base44.app`)
- `AUDIT_NONADMIN_TOKEN` (for permission phase validation)

Default run (safe):

```bash
npm run audit:functions:live
```

Default behavior:

- Runs `read-only`, `permission`, and `dry-run` phases when credentials are available.
- Defers `controlled-write` and `deferred-disruptive` operations unless explicitly enabled.

Enable controlled writes:

```bash
npm run audit:functions:live -- --allow-controlled-write
```

Enable disruptive phase (maintenance window only):

```bash
npm run audit:functions:live -- --allow-controlled-write --allow-disruptive
```

Strict mode (non-zero exit if credentials are missing):

```bash
npm run audit:functions:live -- --strict
```

Live artifacts:

- `audit/function-live-audit-report.md`
- `audit/evidence/<timestamp>-function-live-audit.json`
