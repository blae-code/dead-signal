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
    <div className="min-h-screen flex flex-col" style={{ background: "#3c3c42", fontFamily: "'Share Tech Mono', monospace" }}>
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
            width: "220px",
            background: "linear-gradient(180deg, #313138 0%, #2d2d35 100%)",
            borderRight: `1px solid ${C.border}`,
            minHeight: "calc(100vh - 41px)",
            boxShadow: "inset -1px 0 0 rgba(255,170,0,0.06), 2px 0 16px rgba(0,0,0,0.6)",
          }}
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="px-3 py-2.5 border-b flex items-center justify-between relative overflow-hidden" style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(52,52,60,0.98) 0%, rgba(44,44,52,0.98) 100%)" }}>
            {/* top accent line */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg, transparent 0%, rgba(255,170,0,0.4) 40%, rgba(255,170,0,0.6) 50%, rgba(255,170,0,0.4) 60%, transparent 100%)" }} />
            <div className="flex items-center gap-2">
              <div style={{ width:18, height:18, border:"1px solid rgba(57,255,20,0.3)", background:"rgba(57,255,20,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Activity size={9} className={animationEnabled ? "layout-nav-dot-pulse" : undefined} style={{ color: "#39ff14" }} />
              </div>
              <span style={{ color: C.textDim, fontSize: "9px", letterSpacing: "0.22em", fontFamily: "'Orbitron', monospace" }}>SYS.NAV</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, border:"1px solid rgba(42,30,16,0.8)", padding:"1px 6px", background:"rgba(24,24,28,0.6)" }}>
              <span style={{ color: C.textFaint, fontSize: "8px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.1em" }}>{moduleCount}</span>
              <span style={{ color: C.textGhost || "#4a3f35", fontSize: "7px", letterSpacing:"0.08em" }}>MOD</span>
            </div>
          </motion.div>

          <div className="flex-1 overflow-y-auto py-1">
            {runtimeConfig.error && !hasConfiguredNavSections && (
              <div className="px-3 py-2 text-xs border-b" style={{ borderColor: C.border, color: C.accent }}>
                RUNTIME CONFIG UNAVAILABLE - USING DEFAULT NAV
              </div>
            )}
            {navSections.map((section, sectionIndex) => (
              <div key={section.label || `section-${sectionIndex}`}>
                <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                  <span style={{ color: C.textFaint, fontSize: "7.5px", letterSpacing: "0.25em", fontFamily:"'Orbitron', monospace", opacity: 0.7 }}>{section.label}</span>
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8 }} style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${C.border}, transparent)`, transformOrigin: "left" }} />
                </div>

                {section.items.map(({ label, page, icon, code, color, dot }) => {
                  const active = currentPageName === page;
                  const IconComponent = iconByName[icon] || Terminal;
                  return (
                    <motion.div key={page} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                      <Link
                        to={createPageUrl(page)}
                        onClick={() => setMobileOpen(false)}
                        className="layout-nav-item-hover flex items-center gap-2.5 px-3 py-2.5 text-xs relative"
                        style={{
                          background: active
                            ? `linear-gradient(90deg, ${color}12 0%, ${color}05 60%, transparent 100%)`
                            : "transparent",
                          borderLeft: active ? `2px solid ${color}` : "2px solid transparent",
                          letterSpacing: "0.08em",
                          textDecoration: "none",
                          display: "flex",
                        }}
                      >
                        {/* icon box */}
                        <div style={{
                          width: 22, height: 22, flexShrink: 0,
                          border: `1px solid ${active ? color + "55" : C.border}`,
                          background: active ? `${color}18` : "rgba(28,28,32,0.6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "border-color 0.15s, background 0.15s",
                          boxShadow: active ? `0 0 8px ${color}22, inset 0 0 8px ${color}0a` : "none",
                        }}>
                          <IconComponent size={11} className="nav-icon" style={{ color: active ? color : C.textFaint, opacity: active ? 1 : 0.55, transition: "color 0.15s, opacity 0.15s" }} />
                        </div>

                        <span className="nav-label" style={{ flex: 1, color: active ? color : C.textDim, fontSize: "10px", fontFamily: "'Share Tech Mono', monospace", transition: "color 0.15s", letterSpacing: "0.06em" }}>
                          {label}
                        </span>

                        {/* code badge */}
                        <span className="nav-code" style={{
                          color: active ? color : C.textFaint,
                          fontSize: "7.5px",
                          opacity: active ? 1 : 0,
                          fontFamily: "'Orbitron', monospace",
                          transition: "opacity 0.15s",
                          letterSpacing: "0.05em",
                          border: active ? `1px solid ${color}44` : "1px solid transparent",
                          padding: "0px 4px",
                          background: active ? `${color}10` : "transparent",
                        }}>
                          {code}
                        </span>

                        {/* active status dot */}
                        {active && (
                          <motion.div
                            animate={animationEnabled ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                            transition={animationEnabled ? { duration: 2, repeat: Infinity } : undefined}
                            style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: dot, boxShadow: `0 0 6px ${dot}` }}
                          />
                        )}

                        {active && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at left, ${color}0a 0%, transparent 65%)`, pointerEvents: "none" }} />}
                        {active && (
                          <motion.div
                            layoutId="activeBar"
                            style={{
                              position: "absolute", right: 0, top: "10%", bottom: "10%", width: "2px",
                              background: `linear-gradient(180deg, transparent, ${color}cc, transparent)`,
                              boxShadow: `0 0 6px ${color}`,
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

          <motion.div className="border-t relative overflow-hidden" style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(52,52,60,0.98) 0%, rgba(40,40,46,0.98) 100%)" }}>
            {/* top accent */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg, transparent 0%, rgba(255,170,0,0.25) 50%, transparent 100%)" }} />

            {/* net status bar */}
            <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
                <motion.div
                  animate={animationEnabled && online ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={animationEnabled && online ? { duration: 2, repeat: Infinity } : undefined}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: online ? "#39ff14" : "#ff2020", boxShadow: online ? "0 0 6px #39ff14" : "0 0 6px #ff2020", flexShrink: 0 }}
                />
                <span style={{ color: online ? "#39ff14" : "#ff2020", fontSize: "8px", letterSpacing: "0.15em", fontFamily:"'Orbitron', monospace" }}>
                  {online ? "NET: CONNECTED" : "NET: OFFLINE"}
                </span>
              </div>
            </div>

            {/* build / version row */}
            <div className="px-3 py-2 grid grid-cols-2 gap-y-1.5 border-b" style={{ borderColor: C.border }}>
              {[["BUILD", appBuild], ["VER", appVersion]].map(([lbl, val]) => (
                <div key={lbl} className="flex items-center justify-between col-span-1">
                  <span style={{ color: "#4a3f35", fontSize: "7.5px", letterSpacing: "0.12em" }}>{lbl}</span>
                  <span style={{ color: C.textFaint, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* branding */}
            <div className="px-3 py-2.5 flex items-center gap-2">
              <div style={{ width:18, height:18, border:`1px solid ${C.border}`, background:"rgba(24,24,28,0.8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Skull size={9} style={{ color: C.textFaint }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.14em", fontFamily:"'Orbitron', monospace", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>DEAD SIGNAL</div>
                <div style={{ color: "#4a3f35", fontSize: "7px", letterSpacing: "0.08em", marginTop: 1 }}>
                  {`SYS:0x${Date.now().toString(16).toUpperCase().slice(-8)}`}
                </div>
              </div>
            </div>
          </motion.div>
        </nav>

        {mobileOpen && <div className="fixed inset-0 z-30 bg-black bg-opacity-80 md:hidden" onClick={() => setMobileOpen(false)} />}

        <main className="flex-1 overflow-auto p-5" style={{ background: "#3c3c42" }}>
          {children}
        </main>
      </div>
      <InAppNotifications />
      <CommsRail />
      {/* Ambient dot grid texture */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9995, pointerEvents: "none", backgroundImage: "radial-gradient(circle, rgba(255, 170, 0, 0.038) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      {/* CRT scanline overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9997, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.065) 2px, rgba(0,0,0,0.065) 3px)", backgroundSize: "100% 3px" }} />
      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9996, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)" }} />
    </div>
  );
}