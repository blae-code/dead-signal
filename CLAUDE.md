# CLAUDE.md — Dead Signal Codebase Guide

This file provides context for AI assistants working in this repository. It covers architecture, conventions, workflows, and key decisions.

---

## Project Overview

**Dead Signal** is a survival game server operations and coordination platform. It is a React SPA backed by Base44 serverless functions, providing:

- Mission creation, tracking, and tactical analysis
- Real-time server monitoring via Pterodactyl panel (RCON, power control)
- Team roster, player vitals, and squad management
- Resource logistics, inventory, and supply-chain tracking
- Live voice communications via LiveKit (rooms, whispers, squad channels)
- Intelligence sharing, player vouching, community announcements
- Scheduled automation, alert evaluation, and server health checks

**Deployment:** Base44 cloud platform (no Docker, no CI/CD pipelines). Publish via the Base44 dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite 6 |
| Routing | React Router v6 (layout-based with `<Outlet>`) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (new-york style, Radix UI) |
| Server state | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Maps | Leaflet + React Leaflet |
| Voice | LiveKit Client, Server SDK, React Components |
| Charts | Recharts |
| Animation | Framer Motion |
| 3D | Three.js |
| Backend | Deno-based TypeScript serverless functions (Base44) |
| Backend API | Pterodactyl game panel REST + WebSocket |
| Auth | Base44 SDK (`@base44/sdk`) |

---

## Directory Structure

```
dead-signal/
├── components/          # Reusable React components (90+ files)
│   ├── survival/        # Survival-specific UI (vitals, status)
│   ├── features/        # Feature-specific panels
│   ├── map/             # Leaflet map layers and overlays
│   ├── inventory/       # Inventory management UI
│   ├── server/          # Server status and control widgets
│   ├── trading/         # Resource trading components
│   ├── voice/           # LiveKit voice UI components
│   └── ui/              # shadcn/ui component library (do not manually edit)
├── pages/               # Route-level page components (43+ files)
│   ├── operations/      # Missions, mission detail, ops home
│   ├── logistics/       # Inventory, engineering panel
│   ├── roster/          # Player profiles, roster list
│   ├── community/       # Announcements, intel, vouches
│   └── systems/         # Server panel, alerts, automation
├── layouts/
│   └── MapLayout.jsx    # Persistent map workspace shell (all views overlay this)
├── functions/           # Backend serverless functions (40 TypeScript files)
│   └── _shared/         # Shared utilities: backend.ts, runtimeConfig.ts, etc.
├── hooks/               # Custom React hooks
├── lib/                 # Context providers, utilities, LiveKit helpers
├── api/                 # Base44 client and function invocation helpers
├── src/                 # Compatibility shims (mirrors hooks/, components/ui/, lib/)
├── tests/               # Node.js built-in test runner (3 files, LiveKit utils)
├── utils/               # Frontend utilities
├── App.jsx              # Root component: auth, QueryClient, LiveKit, Router
├── Layout.jsx           # Main layout wrapper with sidebar/header routing logic
├── main.jsx             # React DOM entry point
├── index.css            # Global styles — terminal design system
├── pages.config.js      # Auto-generated page registry (mainPage: "ServerMonitor")
├── vite.config.js       # Vite config with Base44 plugin and path alias
├── jsconfig.json        # Path aliasing: @/ → project root
├── tailwind.config.js   # Custom theme: dark mode, terminal colors, animations
└── components.json      # shadcn/ui config
```

---

## Development Workflow

### Setup

```bash
npm install
```

Create `.env.local` with these variables:

```
# Frontend
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your_backend_url
VITE_LIVEKIT_URL=wss://your_livekit_host
VITE_DEAD_SIGNAL_GAME_URL=optional
VITE_DEAD_SIGNAL_SERVER_URL=optional
```

Backend function secrets are configured via the Base44 dashboard (not `.env.local`), including `BISECT_API`, `BISECT_PANEL_URL`, `BISECT_SERVER_ID`, `LIVEKIT_API_KEY`, `LIVEKIT_SECRET`, etc.

### NPM Scripts

```bash
npm run dev        # Vite dev server with hot reload
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check (quiet mode)
npm run lint:fix   # Auto-fix lint issues
npm run test       # Run Node.js tests: node --test tests/*.test.mjs
npm run typecheck  # TypeScript type check via tsc
```

### Running Tests

Tests use Node.js built-in `node --test`. There are currently 3 test files, all covering LiveKit utilities:

```bash
npm test
```

No coverage tooling is configured. Tests are pure unit tests with no network calls.

---

## Routing Architecture

All routes render as overlays on top of `MapLayout.jsx`, which mounts a persistent Leaflet map. Navigation never unmounts the map — panels slide in as overlays.

**Primary routes (in Layout.jsx / App.jsx):**
- `/ops` → Operations Home, Missions
- `/roster` → Player Profiles, Roster
- `/logistics` → Inventory, Engineering Panel
- `/systems` → Server Panel, Alerts, Automation
- `/community` → Announcements, Intel, Vouches

Legacy routes (pre-map-centric refactor) are preserved as redirects in `App.jsx`.

---

## Design System & Styling Conventions

The app uses a **terminal/military aesthetic** defined in `index.css`. Always follow this palette — do not introduce other color schemes.

**Core Colors:**
- Amber/primary: `#ffaa00`
- Cyan/accent: `#00e8ff`
- Green/positive: `#39ff14`
- Dark background: `#1c1c20`
- Light text: `#eee5d6`
- Border/surface: `#2a1e10`

**Styling approach:**
- Use Tailwind utility classes as the primary method
- Inline `style` objects are common for dynamic or theme-critical values
- A shared color constants object (`C`) is used in many components for consistency
- shadcn/ui components live in `components/ui/` — use them for all generic UI (buttons, dialogs, inputs, etc.)
- Do not modify files in `components/ui/` directly; configure through `components.json` and Tailwind theme

**Dark mode:** Always on. The app uses `dark` class strategy in Tailwind. Do not add light-mode styles.

---

## Frontend Code Conventions

### Imports

Use the `@/` alias (maps to project root):

```jsx
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { useLiveKit } from "@/hooks/use-livekit";
```

### Components

- Functional components only (no class components except `ErrorBoundary` in `App.jsx`)
- Co-locate component logic with the component file unless a hook is reused in 2+ places
- Keep page files focused on layout and data fetching; delegate rendering to `components/`

### State Management

- **Local UI state:** `useState`, `useReducer`
- **Server/async state:** TanStack React Query (`useQuery`, `useMutation`)
- **Global auth:** `useAuth()` from `lib/AuthContext.jsx`
- **Voice/LiveKit:** `useLiveKit()` from `hooks/use-livekit.jsx`
- **Runtime config:** `useRuntimeConfig()` from `hooks/use-runtime-config.js`
- Avoid prop drilling beyond 2 levels — use Context or React Query

### Forms

Use React Hook Form with Zod schemas:

```jsx
const schema = z.object({ name: z.string().min(1) });
const form = useForm({ resolver: zodResolver(schema) });
```

### Error Handling

- Wrap async operations in `try/catch`
- Use the `ErrorBoundary` in `App.jsx` for top-level component crashes
- Backend functions return structured error objects via `errorResponse()`

---

## Backend Functions (Serverless)

Functions live in `/functions/` and are TypeScript files running on the Deno runtime.

### Deno Specifics

- Access env vars with `Deno.env.get("VAR_NAME")`
- Import npm packages with `npm:` prefix: `import Stripe from "npm:stripe"`
- Import shared utilities from `"./_shared/backend.ts"` etc.

### Shared Utilities (`functions/_shared/`)

| File | Purpose |
|---|---|
| `backend.ts` | Pterodactyl panel API client, RCON auth, error response helpers |
| `runtimeConfig.ts` | Config validation and multi-target support (30+ env vars) |
| `panelMetrics.ts` | Parse Pterodactyl metric payloads |
| `rconApprovals.ts` | RCON command approval workflow logic |
| `liveTelemetryStore.ts` | Metric storage availability helpers |

### Auth Pattern

Every function should call:
```ts
const user = await requireAuthenticated(req);
// For admin-only operations:
if (!user.isAdmin) return errorResponse("Forbidden", 403);
```

### Error Response Pattern

```ts
return errorResponse("Description of what went wrong", 400);
// or for unexpected errors:
return errorResponse("Internal error", 500);
```

### Rate Limiting

RCON commands are rate-limited. Read the limit from `runtimeConfig`:
```ts
const config = await getRuntimeConfig();
// config.rconRateLimitPerMinute is the configured limit
```

### Key Backend Functions

**Server Control:**
- `getServerStatus.ts` — Live metrics from Pterodactyl
- `sendRconCommand.ts` — Execute RCON with rate limiting and optional approval flow
- `controlServerPower.ts` — Start / stop / restart / kill
- `syncLiveData.ts` — Full sync: panel + external sources

**Automation:**
- `runAutomationCycle.ts` — Orchestrates sync → alert check → remediation
- `checkAlerts.ts` — Evaluate alert rules; runs auto-remediation actions
- `scheduleServerRestart.ts` / `executeScheduledCommand.ts`

**AI / Intelligence:**
- `generateMissionBriefing.ts` — AI-generated mission summaries
- `generateIntelSummary.ts` — Intel synthesis
- `playerBehaviorAnalysis.ts` — Activity pattern analysis
- `predictResourceNeeds.ts` — Resource forecasting
- `optimizeTacticalPlan.ts` — Tactical suggestions

**Voice:**
- `livekitToken.ts` — JWT token minting for LiveKit rooms; logs audit events

---

## LiveKit Integration

LiveKit provides real-time voice channels.

- Token minting: `functions/livekitToken.ts`
- Room lifecycle + whisper helpers: `hooks/use-livekit.jsx`
- Voice UI: `components/voice/`
- Frontend configuration: `VITE_LIVEKIT_URL` env var

Rooms are scoped by squad/channel. The hook exposes `joinRoom()`, `leaveRoom()`, and whisper utilities.

---

## Base44 Platform Notes

- **Entities:** Data models managed by the Base44 platform. Access them via `base44.entities.*` in frontend code. Key entities include `Mission`, `ClanMember`, `RconCommandApproval`, `PanelSnapshot`, `AutomationRun`.
- **Auth:** `@base44/sdk` handles session management. Wrap protected routes with the auth context.
- **Function invocation:** Use helpers in `api/function-invoke.js` to call backend functions from the frontend.
- **Publishing:** Deployments go through the Base44 dashboard, not a CI pipeline.

---

## Git Conventions

Commit messages follow Conventional Commits style:

```
feat: add new feature
fix: resolve bug description
style: visual or CSS changes
refactor: restructure without behavior change
chore: tooling, deps, config
```

Do not commit:
- `.env.local` or any file containing secrets
- `dist/` build artifacts
- `audit/` directory (auto-generated, in `.gitignore`)
- `node_modules/`

---

## Key Invariants & Gotchas

1. **Map is always mounted.** `MapLayout.jsx` is the persistent shell. Never navigate away in a way that unmounts it. Route panels are overlays.
2. **Dark terminal theme only.** Do not use light backgrounds, white base colors, or non-terminal fonts.
3. **`src/` is a shim layer.** Files in `src/` re-export from the real locations at the root. Do not add logic there.
4. **`components/ui/` is generated.** Do not edit shadcn/ui primitives directly. Add configuration through `components.json` or Tailwind.
5. **Deno runtime for functions.** Do not use Node.js APIs (`fs`, `path`, `process.env`) in `functions/`. Use `Deno.*` APIs.
6. **RCON commands require approval** for destructive operations. Check `rconApprovals.ts` logic before adding new command types.
7. **`pages.config.js` is auto-generated.** Do not hand-edit it; the Base44 tooling regenerates it.
8. **`jsconfig.json` not `tsconfig.json`** governs the frontend. TypeScript strict mode is not enabled; avoid relying on it for runtime safety.
