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
VITE_LIVEKIT_URL=wss://your-livekit-host
VITE_LIVEKIT_API_KEY=optional_client_override_only
VITE_LIVEKIT_SECRET=optional_client_override_only

# Optional header DEPLOY launch fallbacks (used if runtime app.launch URLs are empty)
VITE_DEAD_SIGNAL_GAME_URL=
VITE_DEAD_SIGNAL_SERVER_URL=

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

For backend server-control functions, configure these function environment variables (Base44 secrets / function env):

```
BISECT_API=your_panel_api_token
BISECT_PANEL_URL=https://your-panel-host
BISECT_SERVER_ID=your_server_id
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-host
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

## Map-centric routing structure (v0.1)

The app now renders in a persistent map workspace shell (`layouts/MapLayout.jsx`) and all major views are route-driven overlays:

- Operations: `/ops`, `/ops/missions`, `/ops/missions/:id`
- Roster: `/roster`, `/roster/player/:id`
- Logistics: `/logistics`, `/logistics/inventory`, `/logistics/engineering`
- Systems: `/systems`, `/systems/server`, `/systems/alerts`, `/systems/automation`
- Community/Comms: `/community`, `/community/announcements`, `/community/intel`, `/community/vouches`

Legacy page paths such as `/Dashboard`, `/Missions`, `/ClanRoster`, and `/ServerMonitor` are preserved via redirects to the new category routes.

Map layers are normalized in `hooks/map/*` and feed the Leaflet map in `components/map/GlobalOperationsMap.jsx`:

- missions layer
- players layer
- resources layer
- systems/alerts layer

Coordinate parsing supports `Grid A-J + row` mission coordinates; unparseable missions are surfaced in the Operations drawer as **Unplaced Missions** with quick-edit links.

## LiveKit voice integration (v0.1)

Full multi-net tactical radio stack:

**Backend**
- `functions/livekitToken.ts` — LiveKit JWT minting. Accepts `netId` or `roomName`. Resolves against static net registry first, then Base44 VoiceNet entity, with fallback. Token metadata includes net category, discipline mode, radio profile, and callsign.

**Core voice hooks**
- `hooks/voice/useVoiceSession.jsx` — `VoiceSessionProvider` + `useVoiceSession()`. Manages multi-room LiveKit connections, participant state, PTT mode, emergency state, traffic log. Wraps `MapLayout` exclusively.
- `hooks/voice/usePushToTalk.js` — Keyboard (Space) + mouse PTT with hold/toggle modes.
- `hooks/voice/useVoiceDevices.js` — Enumerates system audio input/output devices (audioinput + audiooutput via LiveKit static API).
- `hooks/voice/useVoicePermissions.js` — Role-based access checks: `canAccessNet`, `canTransmitOn`, `isNetControl`, `canOpenEmergency`.

**Voice library**
- `lib/voice/nets.js` — Static `VOICE_NETS` registry (6 nets: command, squad-alpha, squad-bravo, logistics, emergency, proximity).
- `lib/voice/voiceNetResolver.js` — `getNetById`, `getNetByRoomName`, `getNetsByCategory`, `resolveMemoryChannel`.
- `lib/voice/voiceTransportAdapter.js` — Thin wrapper over `livekitRoomService`: connect, disconnect, mic enable, volume, status.
- `lib/voice/livekitRoomService.js` — Multi-room LiveKit Room manager with connection registry.
- `lib/voice/livekitTokenService.js` — Client-side token fetch via `base44.functions.invoke('livekitToken', ...)`.
- `lib/voice/models.js` — Canonical domain types: `VoiceNet`, `RadioDeviceState`, `VoiceSessionState`, `VoiceParticipant`.
- `lib/voice/constants.js` — `INITIAL_VOICE_SESSION_STATE`, `INITIAL_RADIO_DEVICE_STATE`.
- `lib/voice/memory-channels.js` — M1–M6 memory channel presets.

**Voice UI components**
- `components/voice/CommsRail.jsx` — Persistent bottom comms strip: TX net indicator, monitored net pills, active speaker, connection health LED, PTT button, emergency banner.
- `components/voice/RadioRack.jsx` — Slide-in panel hosting 4 `RadioPanel` instances.
- `components/voice/RadioPanel.jsx` — Single radio: frequency display, signal meter, volume/squelch sliders, memory buttons (M1–M6), mode buttons (MON/TX/SCN), TX/RX LEDs, profile badge.
- `components/voice/AnnunciatorBar.jsx` — Severity-ordered alert strip (critical/warn/info) with severity icons. Alerts: NET DOWN, LINK DEGRADED, WEAK SIGNAL, TX LOCKED, SCAN ACTIVE/HOLD, MIC MUTED, EMERGENCY TRAFFIC, BRIDGE ACTIVE.
- `components/voice/TrafficLogPanel.jsx` — Scrollable RX/TX/SYSTEM event log with filter buttons and auto-scroll.
- `components/voice/DevicePanel.jsx` — Audio device selector (input/output).

**Token contract**
- Function: `livekitToken`
- Input: `{ netId?: string, roomName?: string, userId?: string }`
- Access: authenticated users; room name derived from net registry.
- Token TTL: 2 hours.
- Response: `{ token, roomName, netId, netDisplayName, netCategory, disciplineMode, radioProfile, callsign }`

---

## v0.1 Release Notes

**What's in v0.1**

- Map-centric workspace shell (`MapLayout`) with animated detail drawer and RadioRack slide-in panel.
- Full 6-net tactical voice system with LiveKit multi-room backend.
- Persistent CommsRail (bottom) with PTT, TX indicator, net pills, speaker display, health LED.
- 4-radio RadioRack with memory channels, signal meters, and instrument-panel styling.
- AnnunciatorBar with severity icons and priority-sorted alerts wired to real voice state.
- Terminal instrument aesthetic: Share Tech Mono + Orbitron fonts, LED CSS classes, scanline FX, CSS custom property range sliders.
- Dashboard: animated mission rows with status accent strips, pulsing online roster dots, `StatusBadge` severity labels on server feed.
- Missions: priority-accent left strips on rows, glow status dots, active voice room indicator.
- Category nav rail with hotkeys (G/M/R/L/S/C/Esc), mobile slide-in nav, tab sub-navigation.
- Backend: server power control, RCON governance, fleet multi-target, live data sync, alert automation.

**Known limitations / Deferred to v0.2**

- CommsConsole drawer (tabbed RADIO/NETS/LOG/DEVICES view) — deferred Phase 2.
- Spatial audio (WebAudio PannerNode per participant) — deferred Phase 3.
- Radio audio profiles (analog bandpass, encrypted, etc.) — deferred Phase 3.
- Net bridge / soft routing — deferred Phase 3.
- Emergency traffic full-overlay panel — deferred Phase 3.
- FrequencyDial rotary control and signal simulation — deferred Phase 2.
- VoiceMapOverlay (speaking rings on map markers) — deferred Phase 2.
- PTTButton as standalone polished component — deferred Phase 2.
- DirectContactPanel / whisper rooms — deferred Phase 2.
- ParticipantVoiceList grouped by net — deferred Phase 2.
- Voice diagnostics panel — deferred Phase 3.
- Scan loop logic — scan mode button renders and toggles state, but automatic channel-cycle logic is not implemented.

---

## Smoke-test checklist (v0.1 QA)

**Environment**
- [ ] `.env.local` created with all required variables (see above)
- [ ] LiveKit server reachable at `VITE_LIVEKIT_URL`
- [ ] Base44 app ID and backend URL correct

**App shell**
- [ ] App loads at `/ops` with map visible behind drawer
- [ ] Detail drawer opens/closes (Esc to close, click category nav to reopen)
- [ ] Category hotkeys work: G → `/ops`, M → `/ops/missions`, R → `/roster`, L → `/logistics`, S → `/systems`, C → `/community`
- [ ] Header chronometer shows correct time in configured timezone
- [ ] DEPLOY button opens game/server URLs in separate tabs (if configured)
- [ ] Mobile: hamburger opens slide-in nav

**Voice comms — CommsRail**
- [ ] CommsRail visible at bottom of map shell
- [ ] TX indicator shows active net name and frequency
- [ ] PTT button responds on mouse hold (hold mode) and changes to "TX LIVE" state
- [ ] Connection health LED shows correct state (green/amber/red)
- [ ] AnnunciatorBar shows "MIC MUTED" when mic is muted
- [ ] AnnunciatorBar shows severity icons (triangle/circle/info) on each alert pill

**Voice comms — RadioRack**
- [ ] COMMS button in header opens RadioRack slide-in panel
- [ ] RadioRack shows 4 radio panels
- [ ] Memory buttons M1–M6 visible on each radio
- [ ] Volume and squelch sliders respond to drag
- [ ] Clicking TX indicator in CommsRail also opens RadioRack

**Dashboard**
- [ ] COMMAND HQ loads with stat grid (active ops, operators, alerts, inventory)
- [ ] Mission rows show left accent strip by status color
- [ ] Online roster members show pulsing green dot
- [ ] Server feed entries show colored StatusBadge (INFO/WARN/ALERT/CRITICAL)
- [ ] RadioRack and TrafficLogPanel render in right column

**Missions**
- [ ] MISSION BOARD loads with status counter grid
- [ ] Each counter box shows top accent hairline in status color
- [ ] Mission rows show left priority accent strip
- [ ] Expanding a mission row reveals briefing, coords, reward, deadline
- [ ] Admin: NEW MISSION form opens and saves correctly
- [ ] Voice room indicator shows "● VOICE" (green, glowing) when connected to that mission's LiveKit room

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
