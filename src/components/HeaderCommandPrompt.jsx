import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAnimationEnabled } from "@/hooks/use-animation-enabled";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { invokeFunctionOrFallback } from "@/api/function-invoke";

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

const staticHelpPrefix = [
  { text: "NAVIGATION: goto <page>   — route navigation", color: C.cyan },
  { text: "RCON:       rcon <cmd>    — send live server command", color: C.amber },
  { text: "ANNOUNCE:   announce <msg>— post intel announcement", color: C.textDim },
  { text: "SEARCH:     find <term>   — filter pages/commands", color: C.textDim },
  { text: "STATUS:     status        — show live server status", color: C.textDim },
  { text: "CLEAR:      clear         — clear console output", color: C.textFaint },
  { text: "TIME:       time          — show live timestamp", color: C.textFaint },
  { text: "WHOAMI:     whoami        — show your user info", color: C.textFaint },
];

export default function HeaderCommandPrompt({ currentPageName }) {
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
  const animationEnabled = useAnimationEnabled();
  const runtimeConfig = useRuntimeConfig();

  const pages = useMemo(() => {
    const configured = runtimeConfig.getArray(["terminal", "pages"]);
    return configured
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        cmd: typeof entry.cmd === "string" ? entry.cmd.toLowerCase() : "",
        label: typeof entry.label === "string" ? entry.label : "",
        page: typeof entry.page === "string" ? entry.page : "",
      }))
      .filter((entry) => entry.cmd && entry.page);
  }, [runtimeConfig]);

  const helpLines = useMemo(() => {
    const pageNames = pages.map((entry) => entry.cmd.replace(/^goto\s+/i, "")).join(", ");
    return [
      ...staticHelpPrefix,
      { text: pageNames ? `Pages: ${pageNames}` : "Pages: runtime config unavailable", color: C.textFaint },
    ];
  }, [pages]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "`" && !event.target.matches("input, textarea")) {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const push = (text, color = C.text) => {
    setLines((prev) => [...prev.slice(-60), { text, color }]);
  };

  const updateSuggestions = (value) => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const lower = value.toLowerCase();
    const pageMatches = pages
      .filter((page) => page.cmd.includes(lower) || page.label.toLowerCase().includes(lower))
      .slice(0, 5);
    setSuggestions(pageMatches);
  };

  const handleInput = (event) => {
    setInput(event.target.value);
    updateSuggestions(event.target.value);
    setHistoryIdx(-1);
  };

  const executeCommand = async (rawCommand) => {
    if (!rawCommand) return;
    push(`> ${rawCommand}`, C.cyan);
    setHistory((prev) => [rawCommand, ...prev.slice(0, 49)]);
    setInput("");
    setSuggestions([]);
    setHistoryIdx(-1);

    const lower = rawCommand.toLowerCase();
    const [first, ...rest] = rawCommand.split(" ");
    const cmd = first.toLowerCase();
    const args = rest.join(" ");

    if (cmd === "help") {
      helpLines.forEach((line) => push(line.text, line.color));
      return;
    }

    if (cmd === "clear") {
      setLines([{ text: "Console cleared.", color: C.textFaint }]);
      return;
    }

    if (cmd === "time") {
      push(`REAL TIME: ${new Date().toISOString()}`, C.text);
      return;
    }

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

    if (cmd === "status") {
      push("Fetching live server status...", C.textFaint);
      try {
        const status = await invokeFunctionOrFallback("getServerStatus", {}, () => ({
          state: null,
          online: null,
          uptime: null,
          cpu: null,
          ramUsedMB: null,
          responseTime: null,
          playerCount: null,
          metric_available: {},
        }));
        push(`SERVER STATE: ${status?.state?.toUpperCase?.() || "UNAVAILABLE"}`, status?.online ? C.green : C.red);
        push(`UPTIME:       ${status?.uptime || "UNAVAILABLE"}`, C.amber);
        push(`CPU:          ${status?.metric_available?.cpu ? `${status.cpu}%` : "UNAVAILABLE"}`, C.text);
        push(`RAM:          ${status?.metric_available?.ramUsedMB ? `${status.ramUsedMB} MB used` : "UNAVAILABLE"}`, C.text);
        push(`PING:         ${status?.metric_available?.responseTime ? `${status.responseTime} ms` : "UNAVAILABLE"}`, C.cyan);
        push(`PLAYERS:      ${status?.metric_available?.playerCount ? `${status.playerCount}` : "UNAVAILABLE"}`, C.text);
      } catch (error) {
        push(`ERROR: ${error.message}`, C.red);
      }
      return;
    }

    if (cmd === "rcon") {
      if (!args) {
        push("Usage: rcon <command>", C.amber);
        return;
      }
      push(`Sending RCON: ${args}`, C.textFaint);
      try {
        const response = await base44.functions.invoke("sendRconCommand", { command: args });
        if (response.data?.success) {
          push(`✓ ${response.data.output}`, C.green);
        } else {
          push(`✗ ${response.data?.error || "Unknown error"}`, C.red);
        }
      } catch (error) {
        push(`ERROR: ${error.message}`, C.red);
      }
      return;
    }

    if (cmd === "announce") {
      if (!args) {
        push("Usage: announce <message>", C.amber);
        return;
      }
      try {
        await base44.entities.Announcement.create({ title: "OPS TERMINAL", body: args, type: "Alert" });
        push(`✓ Announcement posted: "${args}"`, C.green);
      } catch (error) {
        push(`ERROR: ${error.message}`, C.red);
      }
      return;
    }

    if (cmd === "goto" || cmd === "go") {
      if (pages.length === 0) {
        push("Runtime navigation config unavailable.", C.red);
        return;
      }
      const target = pages.find((page) =>
        page.cmd === `goto ${args.toLowerCase()}`
        || page.label.toLowerCase().includes(args.toLowerCase())
        || page.page.toLowerCase() === args.toLowerCase()
      );
      if (target) {
        push(`Navigating to ${target.label}...`, C.green);
        setTimeout(() => { navigate(createPageUrl(target.page)); setOpen(false); }, 300);
      } else {
        push(`Unknown page: "${args}". Type "help" to list pages.`, C.red);
      }
      return;
    }

    if (cmd === "find" || cmd === "search") {
      const matches = pages.filter((page) =>
        page.label.toLowerCase().includes(args.toLowerCase())
        || page.page.toLowerCase().includes(args.toLowerCase())
      );
      if (matches.length === 0) {
        push(`No matches for "${args}"`, C.amber);
        return;
      }
      matches.forEach((match) => push(`  ${match.cmd.padEnd(20)} → ${match.label}`, C.textDim));
      return;
    }

    const pageMatch = pages.find((page) =>
      page.page.toLowerCase() === lower
      || page.label.toLowerCase() === lower
      || page.cmd === `goto ${lower}`
    );
    if (pageMatch) {
      push(`Navigating to ${pageMatch.label}...`, C.green);
      setTimeout(() => { navigate(createPageUrl(pageMatch.page)); setOpen(false); }, 300);
      return;
    }

    push(`Unknown command: "${rawCommand}". Type "help" for commands.`, C.red);
  };

  const handleKeyDown = async (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const index = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(index);
      if (history[index]) setInput(history[index]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const index = Math.max(historyIdx - 1, -1);
      setHistoryIdx(index);
      setInput(index === -1 ? "" : history[index]);
      return;
    }
    if (event.key === "Tab" && suggestions.length > 0) {
      event.preventDefault();
      setInput(suggestions[0].cmd);
      setSuggestions([]);
      return;
    }
    if (event.key === "Enter") {
      await executeCommand(input.trim());
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
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

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
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
              <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={animationEnabled ? { opacity: [1, 0, 1] } : { opacity: 1 }}
                    transition={animationEnabled ? { duration: 0.8, repeat: Infinity } : undefined}
                    style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green }}
                  />
                  <span style={{ color: C.accent, fontSize: "9px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>
                    OPS TERMINAL
                  </span>
                  <span style={{ color: C.textFaint, fontSize: "8px" }}>// {currentPageName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: C.textFaint, fontSize: "8px" }}>ESC to close · Tab autocomplete · ↑↓ history</span>
                  <button onClick={() => setOpen(false)} style={{ color: C.textFaint, fontSize: "12px" }}>✕</button>
                </div>
              </div>

              <div ref={outputRef} className="overflow-y-auto px-3 py-2 space-y-0.5" style={{ height: "180px", fontFamily: "'Share Tech Mono', monospace" }}>
                {lines.map((line, index) => (
                  <div key={index} className="text-xs leading-5" style={{ color: line.color, wordBreak: "break-all" }}>
                    {line.text}
                  </div>
                ))}
              </div>

              {suggestions.length > 0 && (
                <div className="border-t px-3 py-1 flex flex-wrap gap-2" style={{ borderColor: C.border }}>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.page}-${index}`}
                      onMouseDown={() => { setInput(suggestion.cmd); setSuggestions([]); inputRef.current?.focus(); }}
                      className="text-xs px-2 py-0.5 border transition-colors hover:bg-white hover:bg-opacity-5"
                      style={{ borderColor: C.border, color: C.textDim, fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {suggestion.cmd} <span style={{ color: C.textFaint }}>— {suggestion.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: C.accent + "33" }}>
                <span style={{ color: C.green, fontSize: "11px", flexShrink: 0 }}>▶</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder='type command... ("help" to list all)'
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: C.text, fontFamily: "'Share Tech Mono', monospace", caretColor: C.green, border: "none", boxShadow: "none" }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <span style={{ color: C.textFaint, fontSize: "8px", flexShrink: 0 }}>ENTER ↵</span>
              </div>

              <div className="flex flex-wrap gap-1 px-3 pb-2 border-t" style={{ borderColor: C.border }}>
                {pages.slice(0, 8).map((page) => (
                  <button
                    key={page.page}
                    onMouseDown={() => executeCommand(page.cmd)}
                    className="text-xs px-1.5 py-0.5 border transition-colors hover:bg-white hover:bg-opacity-5"
                    style={{
                      borderColor: currentPageName === page.page ? C.accent + "66" : C.border,
                      color: currentPageName === page.page ? C.accent : C.textFaint,
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "8px",
                    }}
                  >
                    {page.label}
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

