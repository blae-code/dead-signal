import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Radio,
  Map,
  Users,
  Package,
  Cpu,
  Crosshair,
  Terminal,
  Menu,
  X,
  Activity,
  Skull,
  Bot,
  Wrench,
  Rocket,
} from "lucide-react";
import InAppNotifications from "@/components/features/InAppNotifications";
import HeaderCommandPrompt from "@/components/HeaderCommandPrompt";
import HeaderChronometer from "@/components/HeaderChronometer";
import { useAnimationEnabled } from "@/hooks/use-animation-enabled";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const iconByName = {
  Radio,
  Map,
  Users,
  Package,
  Cpu,
  Crosshair,
  Terminal,
  Activity,
  Skull,
  Bot,
  Wrench,
};

const C = {
  text: "#eee5d6",
  textDim: "#d0bfa6",
  textFaint: "#a79b8f",
  border: "#2a1e10",
  accent: "#ffaa00",
  cyan: "#00e8ff",
  red: "#ff2020",
  scan: "rgba(255, 170, 0, 0.05)",
};

const FALLBACK_NAV_SECTIONS = [
  {
    label: "// OPS CENTER",
    items: [
      { label: "COMMAND", page: "Dashboard", code: "HQ", color: "#ffaa00", dot: "#39ff14", icon: "Terminal" },
      { label: "SERVER", page: "ServerMonitor", code: "SRV", color: "#00e8ff", dot: "#00e8ff", icon: "Cpu" },
    ],
  },
  {
    label: "// FIELD OPS",
    items: [
      { label: "TACTICAL MAP", page: "TacticalMap", code: "MAP", color: "#ffaa00", dot: "#ffaa00", icon: "Map" },
      { label: "CLAN ROSTER", page: "ClanRoster", code: "OPS", color: "#d0bfa6", dot: "#39ff14", icon: "Users" },
      { label: "MISSIONS", page: "Missions", code: "MIS", color: "#ff2020", dot: "#ff2020", icon: "Crosshair" },
    ],
  },
  {
    label: "// LOGISTICS",
    items: [
      { label: "INVENTORY", page: "Inventory", code: "INV", color: "#d0bfa6", dot: "#a79b8f", icon: "Package" },
      { label: "ENGINEERING", page: "EngineeringOps", code: "ENG", color: "#00e8ff", dot: "#00e8ff", icon: "Wrench" },
      { label: "INTEL FEED", page: "Intel", code: "INT", color: "#ffaa00", dot: "#ffaa00", icon: "Radio" },
      { label: "AI AGENT", page: "AIAgent", code: "AI", color: "#39ff14", dot: "#39ff14", icon: "Bot" },
    ],
  },
];

const normalizeNavSections = (sections) => (
  Array.isArray(sections)
    ? sections
      .filter((section) => section && typeof section === "object")
      .map((section) => ({
        label: typeof section.label === "string" ? section.label : "",
        items: Array.isArray(section.items)
          ? section.items
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              label: typeof item.label === "string" ? item.label : "",
              page: typeof item.page === "string" ? item.page : "",
              code: typeof item.code === "string" ? item.code : "",
              color: typeof item.color === "string" ? item.color : C.textDim,
              dot: typeof item.dot === "string" ? item.dot : C.textFaint,
              icon: typeof item.icon === "string" ? item.icon : "Terminal",
            }))
            .filter((item) => item.page)
          : [],
      }))
    : []
);

const asObject = (value) => (value && typeof value === "object" ? value : {});
const asString = (value) => (typeof value === "string" ? value.trim() : "");
const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const openLaunchWindow = () => {
  const handle = window.open("", "_blank");
  if (!handle) return null;
  try {
    handle.opener = null;
  } catch {
    // ignore browser security constraints
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

import { TrafficLogPanel } from "@/components/voice/TrafficLogPanel";
import { CommsRail } from "@/components/voice/CommsRail";
import { RadioRack } from "@/components/voice/RadioRack";

export default function Layout({ children, currentPageName }) {
  useEffect(() => { document.title = "DEAD SIGNAL PROTOCOL"; }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [launching, setLaunching] = useState(false);
  const [launchWarning, setLaunchWarning] = useState("");
  const animationEnabled = useAnimationEnabled();
  const runtimeConfig = useRuntimeConfig();

  const configuredNavSections = useMemo(
    () => normalizeNavSections(runtimeConfig.getArray(["navigation", "sections"])),
    [runtimeConfig],
  );
  const hasConfiguredNavSections = configuredNavSections.length > 0;
  const navSections = hasConfiguredNavSections ? configuredNavSections : FALLBACK_NAV_SECTIONS;
  const appConfig = runtimeConfig.config?.app && typeof runtimeConfig.config.app === "object"
    ? runtimeConfig.config.app
    : {};
  const moduleCount = useMemo(
    () => navSections.reduce((count, section) => count + section.items.length, 0),
    [navSections],
  );
  const appBuild = typeof appConfig.build === "string" ? appConfig.build : "UNAVAILABLE";
  const appVersion = typeof appConfig.version === "string" ? appConfig.version : "UNAVAILABLE";
  const timezone = typeof appConfig.timezone === "string" ? appConfig.timezone : "America/Vancouver";
  const launchConfig = asObject(appConfig.launch);
  const envLaunchGameUrl = asString(import.meta.env.VITE_DEAD_SIGNAL_GAME_URL);
  const envLaunchServerUrl = asString(import.meta.env.VITE_DEAD_SIGNAL_SERVER_URL);
  const launchGameUrl = asString(launchConfig.game_url) || asString(launchConfig.gameUrl) || envLaunchGameUrl;
  const launchServerUrl = asString(launchConfig.server_url) || asString(launchConfig.serverUrl) || envLaunchServerUrl;
  const launchDelayRaw = launchConfig.open_server_delay_ms ?? launchConfig.openServerDelayMs;
  const launchDelayMs = Math.max(0, asNumber(launchDelayRaw, 2500));
  const launchLabel = asString(launchConfig.label) || "DEPLOY";
  const launchEnabledFlag = launchConfig.enabled !== false;
  const launchHasTargets = Boolean(launchGameUrl || launchServerUrl);
  const launchDisabledReason = !launchEnabledFlag
    ? "launch_disabled"
    : (!launchHasTargets ? "missing_urls" : null);
  const launchEnabled = launchDisabledReason === null;
  const launchTooltip = launchWarning
    || (launchDisabledReason === "launch_disabled"
      ? "Launch disabled via app.launch.enabled=false."
      : launchDisabledReason === "missing_urls"
        ? "Launch URLs not configured. Set app.launch.game_url/app.launch.server_url (or gameUrl/serverUrl), or VITE_DEAD_SIGNAL_GAME_URL/VITE_DEAD_SIGNAL_SERVER_URL."
        : asString(launchConfig.tooltip) || `Launch game and connect (${launchDelayMs}ms relay)`);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLaunch = () => {
    if (launching) return;
    if (!launchEnabled) return;

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

    if (hasGameTarget && gameWindow) {
      if (!assignWindowLocation(gameWindow, launchGameUrl)) blocked = true;
    }

    const openServer = () => {
      if (!hasServerTarget) return;
      if (!serverWindow || !assignWindowLocation(serverWindow, launchServerUrl)) {
        markLaunchBlocked();
      }
    };
    const serverDelayMs = hasGameTarget && hasServerTarget ? launchDelayMs : 0;
    if (hasServerTarget) {
      if (serverDelayMs > 0) {
        window.setTimeout(openServer, serverDelayMs);
      } else {
        openServer();
      }
    }

    if (blocked) {
      markLaunchBlocked();
    }

    window.setTimeout(() => setLaunching(false), Math.max(serverDelayMs + 1500, 2000));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#27272a", fontFamily: "'Share Tech Mono', monospace" }}>
      <header className="ds-header-shell border-b flex items-center justify-between px-4 py-2 z-50 relative overflow-hidden" style={{ borderColor: C.border }}>
        <div className={animationEnabled ? "layout-header-scan" : undefined} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(90deg, transparent 0%, ${C.scan} 50%, transparent 100%)`, backgroundSize: "200% 100%" }} />

        <div className="ds-header-segment flex items-center gap-3 relative px-2 py-1">
          <button className="md:hidden" style={{ color: C.text }} onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-3">
            <Skull size={14} style={{ color: C.accent }} />
            <span className="font-bold tracking-widest" style={{ color: C.accent, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              {typeof appConfig.title === "string" ? appConfig.title : "DEAD SIGNAL"}
            </span>
            <span style={{ color: C.border }}>|</span>
            <span className="hidden sm:block text-xs" style={{ color: C.textDim, letterSpacing: "0.15em" }}>HUMANITZ OPS CENTER</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <HeaderCommandPrompt currentPageName={currentPageName} />
        </div>

        <div className="ml-auto flex items-center mr-2 ds-header-segment p-1 gap-2">
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!launchEnabled || launching}
            title={launchTooltip}
            className="flex items-center gap-1.5 border px-2 py-1 transition-opacity"
            style={{
              borderColor: launchEnabled ? (launchWarning ? `${C.red}88` : `${C.cyan}88`) : C.border,
              background: launchEnabled ? (launchWarning ? "rgba(255, 32, 32, 0.14)" : "rgba(0, 232, 255, 0.14)") : "rgba(24, 24, 28, 0.8)",
              color: launchEnabled ? (launchWarning ? C.red : C.cyan) : C.textFaint,
              opacity: launchEnabled ? 1 : 0.65,
              fontSize: "9px",
              letterSpacing: "0.14em",
              fontFamily: "'Orbitron', monospace",
              boxShadow: launchEnabled
                ? (launchWarning ? "0 0 10px rgba(255, 32, 32, 0.22)" : "0 0 10px rgba(0, 232, 255, 0.22)")
                : "none",
            }}
          >
            <Rocket size={11} />
            <span>{launching ? "DEPLOYING..." : launchLabel}</span>
          </button>
          {launchWarning && (
            <span style={{ color: C.red, fontSize: "8px", letterSpacing: "0.08em", maxWidth: "170px", lineHeight: 1.2 }}>
              {launchWarning}
            </span>
          )}
        </div>

        <HeaderChronometer animationEnabled={animationEnabled} runtimeConfig={runtimeConfig} appTimezone={timezone} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav
          className={`fixed md:relative z-40 h-full flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{
            width: "210px",
            background: "#1f1f23",
            borderRight: `1px solid ${C.border}`,
            minHeight: "calc(100vh - 41px)",
            boxShadow: "inset 1px 0 2px rgba(78, 58, 34, 0.25)",
          }}
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: C.border, background: "rgba(28, 28, 32, 0.9)" }}>
            <div className="flex items-center gap-2">
              <Activity size={9} className={animationEnabled ? "layout-nav-dot-pulse" : undefined} style={{ color: "#39ff14" }} />
              <span style={{ color: C.textDim, fontSize: "9px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>SYS.NAV</span>
            </div>
            <span style={{ color: C.textFaint, fontSize: "8px" }}>{moduleCount} MODULES</span>
          </motion.div>

          <div className="flex-1 overflow-y-auto py-1">
            {runtimeConfig.error && !hasConfiguredNavSections && (
              <div className="px-3 py-2 text-xs border-b" style={{ borderColor: C.border, color: C.accent }}>
                RUNTIME CONFIG UNAVAILABLE - USING DEFAULT NAV
              </div>
            )}
            {navSections.map((section, sectionIndex) => (
              <div key={section.label || `section-${sectionIndex}`}>
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <span style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.2em" }}>{section.label}</span>
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8 }} style={{ flex: 1, height: "1px", background: C.border, transformOrigin: "left" }} />
                </div>

                {section.items.map(({ label, page, icon, code, color, dot }) => {
                  const active = currentPageName === page;
                  const IconComponent = iconByName[icon] || Terminal;
                  return (
                    <motion.div key={page} whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                      <Link
                        to={createPageUrl(page)}
                        onClick={() => setMobileOpen(false)}
                        className="layout-nav-item-hover flex items-center gap-2 px-3 py-2 text-xs relative"
                        style={{
                          background: active ? "#18181c" : "transparent",
                          borderLeft: active ? `2px solid ${color}` : "2px solid transparent",
                          letterSpacing: "0.08em",
                          textDecoration: "none",
                          display: "flex",
                        }}
                      >
                        <motion.div
                          animate={animationEnabled && active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                          transition={animationEnabled && active ? { duration: 2, repeat: Infinity } : undefined}
                          style={{ width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0, background: active ? dot : C.textFaint, boxShadow: active ? `0 0 6px ${dot}` : "none" }}
                        />
                        <IconComponent size={11} className="nav-icon" style={{ flexShrink: 0, color: active ? color : C.textFaint, opacity: active ? 1 : 0.5, transition: "color 0.15s, opacity 0.15s" }} />
                        <span className="nav-label" style={{ flex: 1, color: active ? color : C.textDim, fontSize: "10px", transition: "color 0.15s" }}>
                          {label}
                        </span>
                        <span className="nav-code" style={{ color: active ? color : C.textFaint, fontSize: "8px", opacity: active ? 0.9 : 0, fontFamily: "'Orbitron', monospace", transition: "opacity 0.15s", letterSpacing: "0.05em" }}>
                          {code}
                        </span>
                        {active && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at left, ${color}0d 0%, transparent 70%)`, pointerEvents: "none" }} />}
                        {active && (
                          <motion.div
                            layoutId="activeBar"
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "15%",
                              bottom: "15%",
                              width: "2px",
                              background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
                            }}
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          <motion.div className="border-t" style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(31, 31, 35, 0.92) 0%, rgba(24, 24, 28, 0.92) 100%)" }}>
            <div className="px-3 pt-2 pb-1 flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
              <motion.div animate={animationEnabled && online ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={animationEnabled && online ? { duration: 2, repeat: Infinity } : undefined} style={{ width: "5px", height: "5px", borderRadius: "50%", background: online ? "#39ff14" : "#ff2020" }} />
              <span style={{ color: online ? "#39ff14" : "#ff2020", fontSize: "8px", letterSpacing: "0.15em" }}>
                {online ? "NET: ONLINE" : "NET: OFFLINE"}
              </span>
            </div>
            <div className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>BUILD</span>
                <span style={{ color: C.textDim, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>{appBuild}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>VER</span>
                <span style={{ color: C.textDim, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>{appVersion}</span>
              </div>
              <div style={{ height: "1px", background: `linear-gradient(90deg, ${C.textFaint}44, transparent)`, margin: "4px 0" }} />
              <div className="flex items-center gap-1">
                <Skull size={8} style={{ color: C.textDim }} />
                <span style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.12em" }}>DEAD SIGNAL PROTOCOL</span>
              </div>
              <div style={{ color: "#776b5f", fontSize: "7px", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", opacity: 0.4, marginTop: "2px" }}>
                {`SYS:0x${Date.now().toString(16).toUpperCase().slice(-8)}`}
              </div>
            </div>
          </motion.div>
        </nav>

        {mobileOpen && <div className="fixed inset-0 z-30 bg-black bg-opacity-80 md:hidden" onClick={() => setMobileOpen(false)} />}

        <main className="flex-1 overflow-auto p-4" style={{ background: "#27272a" }}>
          {children}
        </main>
      </div>
      <InAppNotifications />
      <CommsRail />
      {/* CRT scanline overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9997, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.065) 2px, rgba(0,0,0,0.065) 3px)", backgroundSize: "100% 3px" }} />
      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9996, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)" }} />
    </div>
  );
}