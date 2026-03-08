**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

For backend server-control functions, configure these function environment variables (Base44 secrets / function env):

```
BISECT_API=your_panel_api_token
BISECT_PANEL_URL=https://your-panel-host
BISECT_SERVER_ID=your_server_id
```

Optional advanced backend config (multi-targets, resiliency, live external sources, command governance):

```
# Multi-target (fleet) support
BISECT_DEFAULT_TARGET_ID=default
BISECT_TARGETS_JSON=[
  {"target_id":"default","panel_url":"https://panel-a.example.com","server_id":"srv_a","api_key_env":"BISECT_API"},
  {"target_id":"secondary","panel_url":"https://panel-b.example.com","server_id":"srv_b","api_key_env":"BISECT_API_SECONDARY"}
]
BISECT_API_SECONDARY=secondary_panel_token

# Panel transport hardening
PANEL_TIMEOUT_MS=10000
PANEL_RETRIES=2
PANEL_RETRY_BACKOFF_MS=250
PANEL_CIRCUIT_MAX_FAILURES=3
PANEL_CIRCUIT_OPEN_MS=15000

# RCON governance
RCON_RATE_LIMIT_PER_MINUTE=30
RCON_REQUIRE_APPROVAL_FOR_SENSITIVE=true
RCON_APPROVAL_TTL_MINUTES=15
RCON_ALLOW_PATTERNS=
RCON_BLOCK_PATTERNS=
RCON_SENSITIVE_PATTERNS=

# Optional external live-source ingestion
LIVE_SOURCE_TIMEOUT_MS=8000
LIVE_SOURCE_RETRIES=1
LIVE_SOURCE_URLS_JSON=[
  {"source_id":"public_status","url":"https://status.example.com/api/live"}
]

# Optional automation and security diagnostics
AUTOMATION_ENABLE_HEALTH_POWER_RECOVERY=false
AUTOMATION_ALLOW_SENSITIVE_REMEDIATION=false
PTERODACTYL_PANEL_VERSION=v1.12.1
PTERODACTYL_WINGS_VERSION=v1.12.1
```

## Backend control and ingestion functions

All functions below are backend-only in this pass:

- `getServerStatus` - live server status + metric availability/source metadata.
- `sendRconCommand` - admin-only command dispatch with policy, rate limit, idempotency, and optional approval requirement.
- `requestRconApproval` - create approval request for sensitive RCON command.
- `approveRconApproval` - second-admin approval workflow.
- `controlServerPower` - admin power actions (`start|stop|restart|kill`).
- `getPanelWebsocketAuth` - fetch live websocket auth token/socket endpoint for real-time consumers.
- `capturePanelWebsocketSample` - captures short live websocket event samples (stats/console/events) for ingestion/testing.
- `syncLiveData` - comprehensive live sync from panel endpoints + optional external sources; optional persistence.
- `runAutomationCycle` - orchestrates live sync + alert evaluation/remediation + optional auto-recovery.
- `getFleetStatus` - live status across all configured panel targets.
- `checkStackSecurity` - checks configured panel/wings versions vs latest GitHub releases and advisories.
- `checkAlerts` - admin-only live alert checks with optional remediation commands.
- `logServerPerformance` - admin-only live performance ingestion (provider-derived fields only).
- `executeScheduledCommand` - admin-only scheduled dispatch; updates schedule metadata only after successful downstream execution.

Optional entity note:
- `RconCommandApproval`, `PanelSnapshot`, `PanelStreamSample`, and `AutomationRun` are used when present.
- If those entities are not defined yet, the backend falls back gracefully without failing core control operations.

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
