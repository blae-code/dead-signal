import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crosshair,
  Cpu,
  MapPinned,
  Menu,
  Package,
  Radio,
  Rocket,
  Users,
  X,
} from "lucide-react";
import HeaderChronometer from "@/components/HeaderChronometer";
import HeaderCommandPrompt from "@/components/HeaderCommandPrompt";
import InAppNotifications from "@/components/features/InAppNotifications";
import GlobalOperationsMap from "@/components/map/GlobalOperationsMap";
import { T } from "@/components/ui/TerminalCard";
import { useAnimationEnabled } from "@/hooks/use-animation-enabled";
import { useMapLayers } from "@/hooks/map/useMapLayers";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const CATEGORY_NAV = [
  {
    id: "ops",
    label: "Operations",
    short: "OPS",
    path: "/ops",
    icon: Crosshair,
    color: T.amber,
    hotkey: "G",
    tabs: [
      { label: "Overview", path: "/ops" },
      { label: "Missions", path: "/ops/missions" },
    ],
  },
  {
    id: "roster",
    label: "Roster",
    short: "ROS",
    path: "/roster",
    icon: Users,
    color: T.green,
    hotkey: "R",
    tabs: [
      { label: "All", path: "/roster" },
      { label: "Active", path: "/roster?view=active" },
      { label: "Roles", path: "/roster?view=roles" },
    ],
  },
  {
    id: "logistics",
    label: "Logistics",
    short: "LOG",
    path: "/logistics",
    icon: Package,
    color: T.teal,
    hotkey: "L",
    tabs: [
      { label: "Overview", path: "/logistics" },
      { label: "Inventory", path: "/logistics/inventory" },
      { label: "Engineering", path: "/logistics/engineering" },
    ],
  },
  {
    id: "systems",
    label: "Systems",
    short: "SYS",
    path: "/systems",
    icon: Cpu,
    color: T.cyan,
    hotkey: "S",
    tabs: [
      { label: "Overview", path: "/systems" },
      { label: "Server", path: "/systems/server" },
      { label: "Alerts", path: "/systems/alerts" },
      { label: "Automation", path: "/systems/automation" },
    ],
  },
  {
    id: "community",
    label: "Community/Comms",
    short: "COM",
    path: "/community",
    icon: Radio,
    color: T.purple || "#b060ff",
    hotkey: "C",
    tabs: [
      { label: "Overview", path: "/community" },
      { label: "Announcements", path: "/community/announcements" },
      { label: "Intel", path: "/community/intel" },
      { label: "Vouches", path: "/community/vouches" },
    ],
  },
];

const asObject = (value) => (value && typeof value === "object" ? value : {});
const asString = (value) => (typeof value === "string" ? value.trim() : "");
const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isInputTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, button, [role='textbox']"));
};

const openLaunchWindow = () => {
  const handle = window.open("", "_blank");
  if (!handle) return null;
  try {
    handle.opener = null;
  } catch {
    // noop
  }
  return handle;
};

const assignWindowLocation = (handle, uri) => {
  if (!handle || !uri) return false;
  try {
    if (handle.closed) return false;
    handle.location.href = uri;
    return true;
  } catch {
    return false;
  }
};

const resolveCategory = (pathname) => {
  const segment = pathname.split("/").filter(Boolean)[0] || "ops";
  return CATEGORY_NAV.find((entry) => entry.id === segment) || CATEGORY_NAV[0];
};

const resolveSelectedMarker = (location, markers) => {
  const missionMatch = matchPath("/ops/missions/:id", location.pathname);
  if (missionMatch?.params?.id) {
    return markers.find(
      (marker) => marker.kind === "mission" && String(marker.entityId) === String(missionMatch.params.id),
    ) || null;
  }

  const rosterMatch = matchPath("/roster/player/:id", location.pathname);
  if (rosterMatch?.params?.id) {
    return markers.find(
      (marker) => marker.kind === "player" && String(marker.entityId) === String(rosterMatch.params.id),
    ) || null;
  }

  const query = new URLSearchParams(location.search);
  const alertId = query.get("alert");
  if (alertId) {
    return markers.find((marker) => marker.kind === "system" && String(marker.entityId) === String(alertId)) || null;
  }

  const eventId = query.get("event");
  if (eventId) {
    return markers.find((marker) => marker.kind === "system" && String(marker.entityId) === String(eventId)) || null;
  }

  const resourceId = query.get("resource") || query.get("cache") || query.get("hotspot");
  if (resourceId) {
    return markers.find(
      (marker) => marker.kind === "resource" && String(marker.entityId) === String(resourceId),
    ) || null;
  }

  return null;
};

import { AnnunciatorBar } from "@/components/voice/AnnunciatorBar";
import { CommsRail } from "@/components/voice/CommsRail";
import { RadioRack } from "@/components/voice/RadioRack";
import {
  VoiceSessionProvider
} from "@/hooks/voice/useVoiceSession";

export default function MapLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const runtimeConfig = useRuntimeConfig();
  const animationEnabled = useAnimationEnabled();
  const mapLayers = useMapLayers();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [railExpanded, setRailExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [radioRackOpen, setRadioRackOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchWarning, setLaunchWarning] = useState("");

  const activeCategory = useMemo(() => resolveCategory(location.pathname), [location.pathname]);
  const activeTabs = activeCategory.tabs || [];

  const activeTab = useMemo(() => {
    const exactMatch = activeTabs.find((entry) => entry.path === `${location.pathname}${location.search}`);
    if (exactMatch) return exactMatch;
    const pathMatch = activeTabs.find((entry) => {
      const [base] = entry.path.split("?");
      return location.pathname === base || location.pathname.startsWith(`${base}/`);
    });
    return pathMatch || activeTabs[0] || null;
  }, [activeTabs, location.pathname, location.search]);

  const selectedMarker = useMemo(
    () => resolveSelectedMarker(location, mapLayers.markers),
    [location, mapLayers.markers],
  );

  const appConfig = runtimeConfig.config?.app && typeof runtimeConfig.config.app === "object" ?
    runtimeConfig.config.app :
    {};
  const timezone = typeof appConfig.timezone === "string" ? appConfig.timezone : "America/Vancouver";
  const launchConfig = asObject(appConfig.launch);
  const envLaunchGameUrl = asString(import.meta.env.VITE_DEAD_SIGNAL_GAME_URL);
  const envLaunchServerUrl = asString(import.meta.env.VITE_DEAD_SIGNAL_SERVER_URL);
  const launchGameUrl = asString(launchConfig.game_url) || asString(launchConfig.gameUrl) || envLaunchGameUrl;
  const launchServerUrl = asString(launchConfig.server_url) || asString(launchConfig.serverUrl) || envLaunchServerUrl;
  const launchDelayRaw = launchConfig.open_server_delay_ms ?? launchConfig.openServerDelayMs;
  const launchDelayMs = Math.max(0, asNumber(launchDelayRaw, 2500));
  const launchEnabledFlag = launchConfig.enabled !== false;
  const launchHasTargets = Boolean(launchGameUrl || launchServerUrl);
  const launchDisabledReason = !launchEnabledFlag ? "launch_disabled" : (!launchHasTargets ? "missing_urls" : null);
  const launchEnabled = launchDisabledReason === null;
  const launchLabel = asString(launchConfig.label) || "DEPLOY";
  const launchTooltip = launchWarning ||
    (launchDisabledReason === "launch_disabled" ?
      "Launch disabled via app.launch.enabled=false." :
      launchDisabledReason === "missing_urls" ?
      "Set app.launch.game_url/app.launch.server_url or VITE_DEAD_SIGNAL_GAME_URL/VITE_DEAD_SIGNAL_SERVER_URL." :
      asString(launchConfig.tooltip) || "Launch game and server in separate tabs/windows.");

  useEffect(() => {
    setDrawerOpen(true);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || isInputTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "g") {
        event.preventDefault();
        navigate("/ops");
        setDrawerOpen(true);
        return;
      }
      if (key === "m") {
        event.preventDefault();
        navigate("/ops/missions");
        setDrawerOpen(true);
        return;
      }
      if (key === "r") {
        event.preventDefault();
        navigate("/roster");
        setDrawerOpen(true);
        return;
      }
      if (key === "l") {
        event.preventDefault();
        navigate("/logistics");
        setDrawerOpen(true);
        return;
      }
      if (key === "s") {
        event.preventDefault();
        navigate("/systems");
        setDrawerOpen(true);
        return;
      }
      if (key === "c") {
        event.preventDefault();
        navigate("/community");
        setDrawerOpen(true);
        return;
      }
      if (key === "escape") {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const handleMarkerSelect = (marker) => {
    if (marker?.routePath) {
      navigate(marker.routePath);
      setDrawerOpen(true);
    }
  };

  const handleLaunch = () => {
    if (launching || !launchEnabled) return;
    setLaunching(true);
    setLaunchWarning("");
    let blocked = false;

    const markLaunchBlocked = () => {
      setLaunchWarning("Launch blocked by browser pop-up settings.");
      window.setTimeout(() => setLaunchWarning(""), 5000);
    };

    const hasGameTarget = Boolean(launchGameUrl);
    const hasServerTarget = Boolean(launchServerUrl);
    const gameWindow = hasGameTarget ? openLaunchWindow() : null;
    const serverWindow = hasServerTarget ? openLaunchWindow() : null;

    if (hasGameTarget && !gameWindow) blocked = true;
    if (hasServerTarget && !serverWindow) blocked = true;
    if (hasGameTarget && gameWindow && !assignWindowLocation(gameWindow, launchGameUrl)) blocked = true;

    const openServer = () => {
      if (!hasServerTarget) return;
      if (!serverWindow || !assignWindowLocation(serverWindow, launchServerUrl)) {
        markLaunchBlocked();
      }
    };

    const serverDelay = hasGameTarget && hasServerTarget ? launchDelayMs : 0;
    if (hasServerTarget) {
      if (serverDelay > 0) {
        window.setTimeout(openServer, serverDelay);
      } else {
        openServer();
      }
    }

    if (blocked) {
      markLaunchBlocked();
    }
    window.setTimeout(() => setLaunching(false), Math.max(serverDelay + 1500, 1800));
  };

  return (
    <VoiceSessionProvider>
      <div className="h-screen w-full overflow-hidden" style={{ background: T.bg0, fontFamily: "'Share Tech Mono', monospace" }}>
        <header
          className="relative z-[910] h-[46px] border-b flex items-center px-2 md:px-3 gap-2"
          style={{
          borderColor: T.border,
          background: "linear-gradient(180deg, rgba(31,31,35,0.96) 0%, rgba(24,24,28,0.96) 100%)",
        }}
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen((value) => !value)}
            className="md:hidden inline-flex items-center justify-center border p-1"
            style={{ borderColor: T.border, color: T.textDim }}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={14} /> : <Menu size={14} />}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <MapPinned size={12} style={{ color: activeCategory.color }} />
            <span
              style={{
              color: activeCategory.color,
              fontFamily: "'Orbitron', monospace",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
            >
              Dead Signal Workspace
            </span>
          </div>

          <div className="hidden md:flex ml-2">
            <HeaderCommandPrompt currentPageName={activeTab?.label || activeCategory.label} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRadioRackOpen((v) => !v)}
              title="Radio Rack (voice comms)"
              className="inline-flex items-center gap-1.5 border px-2 py-1 transition-colors"
              style={{
                borderColor: radioRackOpen ? "#00e8ff88" : T.border,
                background: radioRackOpen ? "rgba(0,232,255,0.12)" : "rgba(24,24,28,0.86)",
                color: radioRackOpen ? "#00e8ff" : T.textDim,
                fontSize: "9px",
                letterSpacing: "0.12em",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              <Radio size={10} />
              COMMS
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={!launchEnabled || launching}
              title={launchTooltip}
              className="inline-flex items-center gap-1.5 border px-2 py-1 transition-opacity"
              style={{
              borderColor: launchEnabled ? `${T.cyan}88` : T.border,
              background: launchEnabled ? "rgba(0,232,255,0.12)" : "rgba(24,24,28,0.86)",
              color: launchEnabled ? T.cyan : T.textFaint,
              opacity: launchEnabled ? 1 : 0.65,
              fontSize: "9px",
              letterSpacing: "0.12em",
              fontFamily: "'Orbitron', monospace",
            }}
            >
              <Rocket size={10} />
              {launching ? "DEPLOYING..." : launchLabel}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen((value) => !value)}
              className="hidden md:inline-flex items-center border px-2 py-1 text-[9px]"
              style={{ borderColor: T.border, color: T.textDim, letterSpacing: "0.1em" }}
              title="Toggle detail drawer (Esc)"
            >
              {drawerOpen ? "HIDE DRAWER" : "SHOW DRAWER"}
            </button>
            <HeaderChronometer
              animationEnabled={animationEnabled}
              runtimeConfig={runtimeConfig}
              appTimezone={timezone}
            />
          </div>
        </header>

        <div className="relative h-[calc(100vh-46px)] w-full flex overflow-hidden">
          <aside
            className="relative z-[905] hidden md:flex flex-col border-r transition-[width] duration-200"
            style={{
            width: railExpanded ? "226px" : "72px",
            borderColor: T.border,
            background: "rgba(31,31,35,0.92)",
          }}
            onMouseEnter={() => setRailExpanded(true)}
            onMouseLeave={() => setRailExpanded(false)}
          >
            <div className="px-2 py-2 border-b" style={{ borderColor: T.border }}>
              <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.16em" }}>
                {railExpanded ? "CATEGORIES" : "NAV"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {CATEGORY_NAV.map((entry) => {
              const Icon = entry.icon;
              const active = activeCategory.id === entry.id;
              return (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => navigate(entry.path)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 border-l-2 transition-colors"
                  style={{
                    borderLeftColor: active ? entry.color : "transparent",
                    background: active ? "rgba(24,24,28,0.88)" : "transparent",
                  }}
                  title={`${entry.label} (${entry.hotkey})`}
                >
                  <Icon size={14} style={{ color: active ? entry.color : T.textFaint, flexShrink: 0 }} />
                  {railExpanded && (
                    <div className="flex items-center justify-between min-w-0 flex-1">
                      <span style={{ color: active ? entry.color : T.textDim, fontSize: "10px", letterSpacing: "0.1em" }}>
                        {entry.label}
                      </span>
                      <span style={{ color: T.textFaint, fontSize: "8px" }}>{entry.hotkey}</span>
                    </div>
                  )}
                </button>
              );
            })}
            </div>
          </aside>

          <AnimatePresence>
            {mobileNavOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[905] bg-black/70 md:hidden"
                  onClick={() => setMobileNavOpen(false)}
                />
                <motion.aside
                  initial={{ x: -260 }}
                  animate={{ x: 0 }}
                  exit={{ x: -260 }}
                  transition={{ duration: 0.2 }}
                  className="fixed left-0 top-[46px] bottom-0 z-[906] w-[240px] border-r md:hidden"
                  style={{ borderColor: T.border, background: "rgba(31,31,35,0.96)" }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: T.border, color: T.textFaint, fontSize: "9px", letterSpacing: "0.15em" }}>
                    CATEGORY NAV
                  </div>
                  <div className="py-1">
                    {CATEGORY_NAV.map((entry) => {
                    const Icon = entry.icon;
                    const active = activeCategory.id === entry.id;
                    return (
                      <button
                        type="button"
                        key={entry.id}
                        onClick={() => {
                          navigate(entry.path);
                          setMobileNavOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 border-l-2"
                        style={{
                          borderLeftColor: active ? entry.color : "transparent",
                          background: active ? "rgba(24,24,28,0.82)" : "transparent",
                        }}
                      >
                        <Icon size={13} style={{ color: active ? entry.color : T.textFaint }} />
                        <span style={{ color: active ? entry.color : T.textDim, fontSize: "10px", letterSpacing: "0.1em" }}>
                          {entry.label}
                        </span>
                        <span className="ml-auto" style={{ color: T.textFaint, fontSize: "8px" }}>
                          {entry.hotkey}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <div className="relative flex-1 overflow-hidden">
            <GlobalOperationsMap
              markers={mapLayers.markers}
              selectedMarker={selectedMarker}
              onMarkerSelect={handleMarkerSelect}
            />

            <div
              className="pointer-events-none absolute left-2 top-2 border px-2 py-1"
              style={{
              borderColor: `${activeCategory.color}66`,
              background: "rgba(24,24,28,0.78)",
              color: activeCategory.color,
              fontFamily: "'Orbitron', monospace",
              fontSize: "8px",
              letterSpacing: "0.16em",
            }}
            >
              {activeCategory.label}
            </div>

            <div
              className="pointer-events-none absolute right-2 top-2 border px-2 py-1 hidden lg:block"
              style={{ borderColor: `${T.border}bb`, background: "rgba(24,24,28,0.78)", color: T.textFaint, fontSize: "8px", letterSpacing: "0.12em" }}
            >
              SHORTCUTS: G MAP • M MISSIONS • R ROSTER • L LOGISTICS • S SYSTEMS • C COMMS • ESC CLOSE
            </div>

            <AnimatePresence>
              {drawerOpen && (
                <motion.aside
                  key="detail-drawer"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-0 right-0 bottom-[46px] sm:bottom-[44px] z-[902] w-full sm:w-[86vw] md:w-[min(60vw,700px)] xl:w-[min(44vw,760px)] border-l shadow-2xl"
                  style={{
                  borderColor: T.border,
                  background: "linear-gradient(180deg, rgba(28,28,32,0.96) 0%, rgba(24,24,28,0.96) 100%)",
                  backdropFilter: "blur(6px)",
                }}
                >
                  <div className="border-b px-3 py-2 flex items-center justify-between" style={{ borderColor: T.border }}>
                    <div className="min-w-0">
                      <div style={{ color: activeCategory.color, fontSize: "9px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace" }}>
                        {activeCategory.label}
                      </div>
                      <div style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>
                        MAP WORKSPACE / {activeTab?.label || "VIEW"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="inline-flex items-center justify-center border p-1"
                      style={{ borderColor: T.border, color: T.textDim }}
                      aria-label="Close detail drawer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div className="border-b px-2 py-1.5 flex flex-wrap gap-1" style={{ borderColor: T.border }}>
                    {activeTabs.map((tab) => (
                      <NavLink
                        key={tab.path}
                        to={tab.path}
                        className="px-2 py-1 border text-[9px] tracking-[0.12em] no-underline"
                        style={({ isActive }) => ({
                        borderColor: isActive ? `${activeCategory.color}66` : T.border,
                        color: isActive ? activeCategory.color : T.textDim,
                        background: isActive ? `${activeCategory.color}14` : "transparent",
                        fontFamily: "'Orbitron', monospace",
                      })}
                      >
                        {tab.label}
                      </NavLink>
                    ))}
                  </div>

                  <div className="h-[calc(100%-82px)] overflow-y-auto">
                    <Outlet
                      context={{
                      mapLayers,
                      selectedMarker,
                      setDrawerOpen,
                    }}
                    />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {radioRackOpen && (
                <motion.div
                  key="radio-rack-panel"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-0 right-0 bottom-[90px] z-[904] border-l shadow-2xl overflow-y-auto"
                  style={{
                    borderColor: "#00e8ff44",
                    background: "rgba(18,18,22,0.97)",
                    backdropFilter: "blur(8px)",
                    width: "min(96vw, 940px)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-3 py-2 border-b"
                    style={{ borderColor: "#2a1e10" }}
                  >
                    <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "#00e8ff", fontFamily: "'Orbitron', monospace" }}>
                      RADIO RACK
                    </span>
                    <button
                      type="button"
                      onClick={() => setRadioRackOpen(false)}
                      className="inline-flex items-center justify-center border p-1"
                      style={{ borderColor: "#2a1e10", color: "#a79b8f" }}
                      aria-label="Close radio rack"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="p-3">
                    <RadioRack />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute left-0 right-0 bottom-0 z-[903] px-2 pb-2 pointer-events-none">
              <div
                className="pointer-events-auto border p-1 flex flex-col gap-1"
                style={{
                borderColor: T.border,
                background: "rgba(24,24,28,0.9)",
              }}
              >
                <AnnunciatorBar />
                <CommsRail onOpenRadioRack={() => setRadioRackOpen((v) => !v)} />
              </div>
            </div>
          </div>
        </div>
        <InAppNotifications />
      </div>
    </VoiceSessionProvider>
  );
}
