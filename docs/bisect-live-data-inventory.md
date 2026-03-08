# Bisect Live Data Inventory

Last verified: 2026-03-08

## Official Sources

- API docs: https://games.bisecthosting.com/docs
- OpenAPI: https://games.bisecthosting.com/api-docs/openapi.json

## Real-Time Data Channels

### 1) REST polling (point-in-time snapshots)

Primary endpoint:

- `GET /api/client/servers/{server}/resources`

Documented fields in example payload:

- `attributes.current_state`
- `attributes.is_suspended`
- `attributes.resources.memory_bytes`
- `attributes.resources.cpu_absolute`
- `attributes.resources.disk_bytes`
- `attributes.resources.network_rx_bytes`
- `attributes.resources.network_tx_bytes`

Additional high-value polling endpoints:

- `GET /api/client/servers/{server}` (server metadata, limits, relationships)
- `GET /api/client/servers/{server}/activity` (audited activity log)
- `GET /api/client/servers/{server}/player` (players list, paginated)
- `GET /api/client/servers/{server}/player/online` (currently online players)
- `GET /api/client/servers/{server}/startup` (runtime/startup config context)
- `GET /api/client/servers/{server}/live-activity/{taskId}` (task progress logs)

### 2) WebSocket stream (true live event feed)

Auth bootstrap:

- `GET /api/client/servers/{server}/websocket` returns token + socket URL.
- Token expiry is documented (refresh cycle required).

Send events (client -> socket):

- `auth`
- `send command`
- `set state`
- `send logs`
- `send stats`
- `send player list`
- `send player chat`
- `send live activity update`

Receive events (socket -> client):

- `console output`
- `status`
- `stats`
- `install output`
- `backup completed`
- `player list`
- `player chat`
- `live activity`
- `daemon error`
- `jwt error`
- `token expiring`
- `token expired`

## What This Repo Already Ingests

### Implemented

- Panel resources (`/resources`) with normalization in `functions/_shared/panelMetrics.ts`
- Server details (`/servers/{server}`)
- Activity (`/activity`)
- Startup (`/startup`)
- Databases, schedules, backups, allocations, files (best-effort snapshot mode)
- WebSocket auth bootstrap (`/websocket`)
- WebSocket sample capture via `capturePanelWebsocketSample`

### Persisted telemetry (current data model)

- Core metrics: state, online, cpu, ram, disk, uptime, network rx/tx
- Extended optional metrics (when present in payload): playerCount, serverFps, responseTime, processCount, activeConnections
- Storage entities used by current functions:
  - `LiveTelemetryCurrent`
  - `LiveTelemetrySample`
  - `LiveSourceHealth`
  - `PanelSnapshot` (optional)

## Gaps vs Available Live Data

- Player endpoints are not currently part of the core ingestion path (`/player`, `/player/online`).
- WebSocket event types are sampled, but not yet normalized into typed event streams (console/status/chat/player/activity channels).
- No token refresh/live reconnect orchestration for a continuous WebSocket consumer yet.

## Recommended Ingestion Priorities

1. Add `/player/online` polling fallback to stabilize `playerCount` when `resources` does not provide it.
2. Build typed WebSocket ingestion pipeline for:
   - `stats` -> metric updates
   - `status` -> state transitions
   - `console output` -> log stream
   - `player list` / `player chat` -> live social feed
3. Add token-expiry handling (`token expiring`/`token expired`) with automatic re-authentication.
4. Persist normalized socket events into a dedicated rolling entity for UI replay/debugging.

