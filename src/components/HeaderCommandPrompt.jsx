import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const C = {
  green: "#39ff14",
  amber: "#ffb000",
  red: "#ff2020",
  cyan: "#00e5ff",
  text: "#e0d4c0",
  textDim: "#b8a890",
  textFaint: "#8a7a6a",
  border: "#3a2a1a",
  accent: "#b8860b",
};

// All navigable pages + quick actions
const PAGES = [
  { cmd: "goto dashboard",     label: "COMMAND HQ",     page: "Dashboard" },
  { cmd: "goto server",        label: "SERVER MONITOR", page: "ServerMonitor" },
  { cmd: "goto map",           label: "TACTICAL MAP",   page: "TacticalMap" },
  { cmd: "goto roster",        label: "CLAN ROSTER",    page: "ClanRoster" },
  { cmd: "goto missions",      label: "MISSIONS",       page: "Missions" },
  { cmd: "goto inventory",     label: "INVENTORY",      page: "Inventory" },
  { cmd: "goto intel",         label: "INTEL FEED",     page: "Intel" },
  { cmd: "goto ai",            label: "AI AGENT",       page: "AIAgent" },
  { cmd: "goto stats",         label: "MY STATS",       page: "MyStats" },
  { cmd: "goto loot",          label: "LOOT TRACKER",   page: "LootTracker" },
  { cmd: "goto loadout",       label: "LOADOUT PLANNER",page: "LoadoutPlanner" },
  { cmd: "goto deaths",        label: "DEATH MAP",      page: "DeathMap" },
  { cmd: "goto treasury",      label: "CLAN TREASURY",  page: "ClanTreasury" },
  { cmd: "goto wiki",          label: "CLAN WIKI",      page: "ClanWiki" },
  { cmd: "goto calendar",      label: "CLAN CALENDAR",  page: "ClanCalendar" },
  { cmd: "goto vote",          label: "CLAN VOTING",    page: "ClanVoting" },
  { cmd: "goto challenges",    label: "CHALLENGES",     page: "Challenges" },
  { cmd: "goto board",         label: "CLAN BOARD",     page: "ClanBoard" },
];

const HELP_LINES = [
  { text: "NAVIGATION: goto <page>   — e.g. goto map, goto server", color: C.cyan },
  { text: "RCON:       rcon <cmd>    — send live server command", color: C.amber },
  { text: "ANNOUNCE:   announce <msg>— post intel announcement", color: C.textDim },
  { text: "SEARCH:     find <term>   — filter pages/commands", color: C.textDim },
  { text: "STATUS:     status        — show server status", color: C.textDim },
  { text: "CLEAR:      clear         — clear console output", color: C.textFaint },
  { text: "TIME:       time          — show real & in-game time", color: C.textFaint },
  { text: "WHOAMI:     whoami        — show your user info", color: C.textFaint },
  { text: "Pages: " + PAGES.map(p => p.cmd.replace("goto ", "")).join(", "), color: C.textFaint },
];

export default function HeaderCommandPrompt({ currentPageName, inGameTime }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([
    { text: "DEAD SIGNAL :: OPS TERMINAL READY", color: C.green },
    { text: 'Type "help" for all commands.', color: C.textFaint },
  ]);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Keyboard shortcut: ` or Ctrl+` to open
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "`" && !e.target.matches("input, textarea")) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const push = (text, color = C.text) => {
    setLines(prev => [...prev.slice(-60), { text, color }]);
  };

  const updateSuggestions = (val) => {
    if (!val.trim()) { setSuggestions([]); return; }
    const lower = val.toLowerCase();
    const pageMatches = PAGES.filter(p =>
      p.cmd.includes(lower) || p.label.toLowerCase().includes(lower)
    ).slice(0, 5);
    setSuggestions(pageMatches);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    updateSuggestions(e.target.value);
    setHistoryIdx(-1);
  };

  const handleKeyDown = async (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      if (history[idx]) setInput(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? "" : history[idx]);
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      setInput(suggestions[0].cmd);
      setSuggestions([]);
    } else if (e.key === "Enter") {
      await executeCommand(input.trim());
    }
  };

  const executeCommand = async (raw) => {
    if (!raw) return;
    push(`> ${raw}`, C.cyan);
    setHistory(prev => [raw, ...prev.slice(0, 49)]);
    setInput("");
    setSuggestions([]);
    setHistoryIdx(-1);

    const lower = raw.toLowerCase();
    const parts = raw.split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    // HELP
    if (cmd === "help") {
      HELP_LINES.forEach(l => push(l.text, l.color));
      return;
    }

    // CLEAR
    if (cmd === "clear") {
      setLines([{ text: "Console cleared.", color: C.textFaint }]);
      return;
    }

    // TIME
    if (cmd === "time") {
      const now = new Date();
      push(`REAL TIME:    ${now.toLocaleTimeString("en-US", { hour12: false })} — ${now.toLocaleDateString()}`, C.text);
      push(`IN-GAME TIME: ${inGameTime.hour}:${inGameTime.min} (${inGameTime.isDaytime ? "DAYTIME" : "NIGHTTIME"})`, C.amber);
      return;
    }

    // WHOAMI
    if (cmd === "whoami") {
      try {
        const user = await base44.auth.me();
        push(`NAME:  ${user.full_name || "Unknown"}`, C.green);
        push(`EMAIL: ${user.email}`, C.textDim);
        push(`ROLE:  ${user.role?.toUpperCase() || "USER"}`, user.role === "admin" ? C.amber : C.textDim);
      } catch {
        push("Not authenticated.", C.red);
      }
      return;
    }

    // STATUS
    if (cmd === "status") {
      push("Fetching server status...", C.textFaint);
      try {
        const res = await base44.functions.invoke("getServerStatus", {});
        const s = res.data;
        if (s?.error) { push(`ERROR: ${s.error}`, C.red); return; }
        push(`SERVER STATE:   ${s?.state?.toUpperCase() || "UNKNOWN"}`, s?.online ? C.green : C.red);
        push(`UPTIME:         ${s?.uptime || "--"}`, C.amber);
        push(`CPU:            ${s?.cpu_percent?.toFixed(1) ?? "--"}%`, C.text);
        push(`RAM:            ${s?.ram_used_mb?.toFixed(0) ?? "--"} MB used`, C.text);
        push(`PING:           ${s?.ping_ms ?? "--"} ms`, C.cyan);
        push(`PACKET LOSS:    ${s?.packet_loss_percent?.toFixed(1) ?? "--"}%`, C.text);
        push(`PLAYERS:        ${s?.player_count ?? "0"}`, C.text);
      } catch (err) {
        push(`ERROR: ${err.message}`, C.red);
      }
      return;
    }

    // RCON
    if (cmd === "rcon") {
      if (!args) { push("Usage: rcon <command>", C.amber); return; }
      push(`Sending RCON: ${args}`, C.textFaint);
      try {
        const res = await base44.functions.invoke("sendRconCommand", { command: args });
        if (res.data?.success) {
          push(`✓ ${res.data.output}`, C.green);
        } else {
          push(`✗ ${res.data?.error || "Unknown error"}`, C.red);
        }
      } catch (err) {
        push(`ERROR: ${err.message}`, C.red);
      }
      return;
    }

    // ANNOUNCE
    if (cmd === "announce") {
      if (!args) { push("Usage: announce <message>", C.amber); return; }
      try {
        await base44.entities.Announcement.create({ title: "OPS TERMINAL", body: args, type: "Alert" });
        push(`✓ Announcement posted: "${args}"`, C.green);
      } catch (err) {
        push(`ERROR: ${err.message}`, C.red);
      }
      return;
    }

    // GOTO / navigation
    if (cmd === "goto" || cmd === "go") {
      const target = PAGES.find(p => p.cmd === `goto ${args.toLowerCase()}` || p.label.toLowerCase().includes(args.toLowerCase()) || p.page.toLowerCase() === args.toLowerCase());
      if (target) {
        push(`Navigating to ${target.label}...`, C.green);
        setTimeout(() => { navigate(createPageUrl(target.page)); setOpen(false); }, 300);
      } else {
        push(`Unknown page: "${args}". Type "help" to list pages.`, C.red);
      }
      return;
    }

    // FIND / SEARCH suggestions
    if (cmd === "find" || cmd === "search") {
      const matches = PAGES.filter(p => p.label.toLowerCase().includes(args.toLowerCase()) || p.page.toLowerCase().includes(args.toLowerCase()));
      if (matches.length === 0) { push(`No matches for "${args}"`, C.amber); return; }
      matches.forEach(m => push(`  ${m.cmd.padEnd(20)} → ${m.label}`, C.textDim));
      return;
    }

    // Bare page names
    const pageMatch = PAGES.find(p => p.page.toLowerCase() === lower || p.label.toLowerCase() === lower || p.cmd === `goto ${lower}`);
    if (pageMatch) {
      push(`Navigating to ${pageMatch.label}...`, C.green);
      setTimeout(() => { navigate(createPageUrl(pageMatch.page)); setOpen(false); }, 300);
      return;
    }

    push(`Unknown command: "${raw}". Type "help" for commands.`, C.red);
  };

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="hidden md:flex items-center gap-2 px-3 py-1 border transition-all"
        style={{
          borderColor: open ? C.accent + "88" : C.border,
          background: open ? "rgba(184,134,11,0.08)" : "transparent",
          color: open ? C.accent : C.textDim,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.12em",
        }}
        title="Open command terminal (` key)"
      >
        <span style={{ color: open ? C.green : C.textFaint }}>█</span>
        <span>TERMINAL</span>
        <span style={{ color: C.textFaint, fontSize: "8px" }}>[ ` ]</span>
      </button>

      {/* Dropdown terminal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50"
              style={{
                top: "44px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(680px, 96vw)",
                background: "linear-gradient(135deg, rgba(10,8,5,0.98) 0%, rgba(20,14,8,0.98) 100%)",
                border: `1px solid ${C.accent}44`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.9), 0 0 0 1px ${C.border}`,
              }}
            >
              {/* Terminal header bar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-2">
                  <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green }} />
                  <span style={{ color: C.accent, fontSize: "9px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>
                    OPS TERMINAL
                  </span>
                  <span style={{ color: C.textFaint, fontSize: "8px" }}>// {currentPageName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: C.textFaint, fontSize: "8px" }}>ESC to close · Tab to autocomplete · ↑↓ history</span>
                  <button onClick={() => setOpen(false)} style={{ color: C.textFaint, fontSize: "12px" }}>✕</button>
                </div>
              </div>

              {/* Output lines */}
              <div
                ref={outputRef}
                className="overflow-y-auto px-3 py-2 space-y-0.5"
                style={{ height: "180px", fontFamily: "'Share Tech Mono', monospace" }}
              >
                {lines.map((line, i) => (
                  <div key={i} className="text-xs leading-5" style={{ color: line.color, wordBreak: "break-all" }}>
                    {line.text}
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="border-t px-3 py-1 flex flex-wrap gap-2" style={{ borderColor: C.border }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={() => { setInput(s.cmd); setSuggestions([]); inputRef.current?.focus(); }}
                      className="text-xs px-2 py-0.5 border transition-colors hover:bg-white hover:bg-opacity-5"
                      style={{ borderColor: C.border, color: C.textDim, fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {s.cmd} <span style={{ color: C.textFaint }}>— {s.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: C.accent + "33" }}>
                <span style={{ color: C.green, fontSize: "11px", flexShrink: 0 }}>▶</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder='type command... ("help" to list all)'
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{
                    color: C.text,
                    fontFamily: "'Share Tech Mono', monospace",
                    caretColor: C.green,
                    border: "none",
                    boxShadow: "none",
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span style={{ color: C.textFaint, fontSize: "8px", flexShrink: 0 }}>ENTER ↵</span>
              </div>

              {/* Quick-nav shortcuts row */}
              <div className="flex flex-wrap gap-1 px-3 pb-2 border-t" style={{ borderColor: C.border }}>
                {PAGES.slice(0, 8).map(p => (
                  <button
                    key={p.page}
                    onMouseDown={() => executeCommand(p.cmd)}
                    className="text-xs px-1.5 py-0.5 border transition-colors hover:bg-white hover:bg-opacity-5"
                    style={{
                      borderColor: currentPageName === p.page ? C.accent + "66" : C.border,
                      color: currentPageName === p.page ? C.accent : C.textFaint,
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "8px",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}