import { memo, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import WorldStatus from "@/components/WorldStatus";
import InAppNotifications from "@/components/features/InAppNotifications";
import HeaderCommandPrompt from "@/components/HeaderCommandPrompt";
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
  text: "#e0d4c0",
  textDim: "#b8a890",
  textFaint: "#8a7a6a",
  border: "#3a2a1a",
  accent: "#b8860b",
  scan: "rgba(184, 134, 11, 0.01)",
};

const FALLBACK_NAV_SECTIONS = [
  {
    label: "// OPS CENTER",
    items: [
      { label: "COMMAND", page: "Dashboard", code: "HQ", color: "#ffb000", dot: "#39ff14", icon: "Terminal" },
      { label: "SERVER", page: "ServerMonitor", code: "SRV", color: "#00e5ff", dot: "#00e5ff", icon: "Cpu" },
    ],
  },
  {
    label: "// FIELD OPS",
    items: [
      { label: "TACTICAL MAP", page: "TacticalMap", code: "MAP", color: "#ffb000", dot: "#ffb000", icon: "Map" },
      { label: "CLAN ROSTER", page: "ClanRoster", code: "OPS", color: "#b8a890", dot: "#39ff14", icon: "Users" },
      { label: "MISSIONS", page: "Missions", code: "MIS", color: "#ff2020", dot: "#ff2020", icon: "Crosshair" },
    ],
  },
  {
    label: "// LOGISTICS",
    items: [
      { label: "INVENTORY", page: "Inventory", code: "INV", color: "#b8a890", dot: "#8a7a6a", icon: "Package" },
      { label: "ENGINEERING", page: "EngineeringOps", code: "ENG", color: "#00e5ff", dot: "#00e5ff", icon: "Wrench" },
      { label: "INTEL FEED", page: "Intel", code: "INT", color: "#ffb000", dot: "#ffb000", icon: "Radio" },
      { label: "AI AGENT", page: "AIAgent", code: "AI", color: "#39ff14", dot: "#39ff14", icon: "Bot" },
    ],
  },
];

const HeaderClock = memo(function HeaderClock({ animationEnabled, timezoneLabel = "America/Vancouver" }) {
  const [time, setTime] = useState(() => new Date());
  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-1 text-xs relative flex-1">
      <motion.div
        animate={animationEnabled ? { opacity: [1, 0, 1] } : { opacity: 1 }}
        transition={animationEnabled ? { duration: 1, repeat: Infinity } : undefined}
        style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.accent, flexShrink: 0 }}
      />
      <div className="flex flex-col" style={{ lineHeight: 1.3 }}>
        <motion.span
          key={timeStr}
          initial={animationEnabled ? { opacity: 0.4 } : false}
          animate={{ opacity: 1 }}
          transition={animationEnabled ? { duration: 0.2 } : undefined}
          style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "12px", letterSpacing: "0.12em" }}
        >
          {timeStr}
        </motion.span>
        <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}>
          {dateStr} · {timezoneLabel.toUpperCase()}
        </span>
      </div>
    </div>
  );
});

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

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [weather, setWeather] = useState(null);
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
    const fetchWeather = async () => {
      try {
        const response = await fetch("https://api.weather.gov/points/49.28,-123.12");
        const data = await response.json();
        const forecastUrl = data.properties?.forecast;
        if (!forecastUrl) return;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();
        const current = forecastData.properties?.periods?.[0];
        if (!current) return;
        setWeather({
          temp: current.temperature,
          shortForecast: current.shortForecast,
          isDaytime: current.isDaytime,
        });
      } catch {
        // Intentionally silent for ambient weather display.
      }
    };
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600_000);
    return () => clearInterval(weatherInterval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1a1410 0%, #2d1f0f 100%)", fontFamily: "'Share Tech Mono', monospace" }}>
      <header className="border-b flex items-center justify-between px-4 py-2 z-50 relative overflow-hidden" style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(20, 15, 10, 0.95) 0%, rgba(30, 20, 15, 0.95) 100%)" }}>
        <div className={animationEnabled ? "layout-header-scan" : undefined} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(90deg, transparent 0%, ${C.scan} 50%, transparent 100%)`, backgroundSize: "200% 100%" }} />

        <div className="flex items-center gap-3 relative">
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

        <HeaderClock animationEnabled={animationEnabled} timezoneLabel={timezone} />

        <div className="hidden xl:flex flex-1 justify-center">
          <div style={{ width: "460px" }}>
            <WorldStatus weather={weather} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav
          className={`fixed md:relative z-40 h-full flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{
            width: "210px",
            background: "linear-gradient(135deg, #0f0a07 0%, #1a1410 100%)",
            borderRight: `1px solid ${C.border}`,
            minHeight: "calc(100vh - 41px)",
            boxShadow: "inset 1px 0 2px rgba(139, 69, 19, 0.3)",
          }}
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(20, 15, 10, 0.8) 0%, rgba(25, 18, 12, 0.8) 100%)" }}>
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
                          background: active ? "#0d0d0d" : "transparent",
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

          <motion.div className="border-t" style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(20, 15, 10, 0.8) 0%, rgba(25, 18, 12, 0.8) 100%)" }}>
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
            </div>
          </motion.div>
        </nav>

        {mobileOpen && <div className="fixed inset-0 z-30 bg-black bg-opacity-80 md:hidden" onClick={() => setMobileOpen(false)} />}

        <main className="flex-1 overflow-auto" style={{ background: "linear-gradient(135deg, #1a1410 0%, #2d1f0f 100%)" }}>
          {children}
        </main>
      </div>
      <InAppNotifications />
    </div>
  );
}
