import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, Terminal, Users, Shield, Send, ChevronDown, ChevronRight, Loader } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

// ── Collapsible section ───────────────────────────────────────────────────────
function ToolSection({ title, color, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="relative overflow-hidden"
      style={{
        border: `1px solid ${open ? color + "44" : T.border}`,
        background: open
          ? `linear-gradient(160deg, ${color}06 0%, #08060200 100%)`
          : "linear-gradient(160deg, #0d0a07 0%, #08060200 100%)",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Top accent */}
      {open && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
      >
        <Icon size={10} style={{ color, filter: `drop-shadow(0 0 4px ${color}88)` }} />
        <span style={{ color, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.16em", flex: 1, textShadow: open ? `0 0 8px ${color}55` : "none" }}>
          {title}
        </span>
        {open
          ? <ChevronDown size={9}  style={{ color: T.textFaint }} />
          : <ChevronRight size={9} style={{ color: T.textFaint }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 pt-1.5 border-t space-y-2" style={{ borderColor: T.border + "88" }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Quick RCON button ─────────────────────────────────────────────────────────
function QuickRconButton({ label, command, onRun, color = T.textDim }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendRconCommand', { command });
      setResult({ ok: res.data?.success, text: res.data?.output || res.data?.error || "Done" });
      await base44.entities.RconHistory.create({ command, output: res.data?.output || "", success: res.data?.success }).catch(() => {});
    } catch (e) {
      setResult({ ok: false, text: e.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:opacity-80 transition-opacity relative overflow-hidden"
        style={{
          border: `1px solid ${color}33`,
          color,
          fontSize: "9px",
          background: `${color}07`,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: color + "66" }} />
        {loading
          ? <Loader size={8} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
          : <Terminal size={8} style={{ flexShrink: 0, opacity: 0.7 }} />}
        <span style={{ fontFamily: "'Share Tech Mono', monospace", flex: 1 }}>{label}</span>
        <span style={{ color: T.textFaint, fontSize: "8px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.06em" }}>{command}</span>
      </button>
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ color: result.ok ? T.green : T.red, fontSize: "8px", background: (result.ok ? T.green : T.red) + "0d", padding: "4px 10px", borderLeft: `2px solid ${result.ok ? T.green : T.red}` }}
          >
            {result.ok ? "✓" : "✗"} {result.text?.slice(0, 80)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AdminToolsPanel({ status }) {
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError,       setAiError]       = useState(null);
  const [broadcastMsg,  setBroadcastMsg]  = useState("");
  const [kickName,      setKickName]      = useState("");
  const [banName,       setBanName]       = useState("");
  const [customCmd,     setCustomCmd]     = useState("");
  const [customResult,  setCustomResult]  = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  const getAiSuggestions = async () => {
    if (!status) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions(null);
    try {
      const res = await base44.functions.invoke('suggestRconCommands', { context: status });
      if (res.data?.suggestions) setAiSuggestions(res.data.suggestions);
      else setAiError("No suggestions returned.");
    } catch (e) {
      setAiError(e.message);
    }
    setAiLoading(false);
  };

  const runCmd = async (cmd) => {
    setCustomLoading(true);
    try {
      const res = await base44.functions.invoke('sendRconCommand', { command: cmd });
      setCustomResult({ ok: res.data?.success, text: res.data?.output || res.data?.error || "Done" });
      await base44.entities.RconHistory.create({ command: cmd, output: res.data?.output || "", success: res.data?.success }).catch(() => {});
    } catch (e) {
      setCustomResult({ ok: false, text: e.message });
    }
    setCustomLoading(false);
  };

  const priorityColor = (p) => ({ HIGH: T.red, MEDIUM: T.amber, LOW: T.green }[p] || T.textDim);

  return (
    <div className="space-y-2">
      {/* Panel header */}
      <div
        className="relative flex items-center gap-3 px-3 py-2.5 overflow-hidden"
        style={{
          border: `1px solid ${T.amber}33`,
          background: "linear-gradient(135deg, #100a04, #0a0704)",
          boxShadow: `inset 0 1px 0 ${T.amber}18`,
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.amber}66, transparent)` }} />
        <div style={{
          width: "24px", height: "24px",
          border: `1px solid ${T.amber}44`,
          background: `radial-gradient(circle, ${T.amber}18, transparent 70%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 8px ${T.amber}22`,
        }}>
          <Shield size={11} style={{ color: T.amber }} />
        </div>
        <div>
          <div style={{ color: T.amber, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.24em", textShadow: `0 0 10px ${T.amber}66` }}>
            ADMIN TOOLS
          </div>
          <div style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.16em" }}>RESTRICTED ACCESS</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: T.green, boxShadow: `0 0 5px ${T.green}` }} />
          <span style={{ color: T.green, fontSize: "7px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.14em" }}>AUTHORIZED</span>
        </div>
      </div>

      {/* AI RCON Advisor */}
      <ToolSection title="AI RCON ADVISOR" color="#b48aff" icon={Bot} defaultOpen={true}>
        <button
          onClick={getAiSuggestions}
          disabled={aiLoading || !status}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs hover:opacity-80 transition-opacity relative overflow-hidden"
          style={{
            border: `1px solid #b48aff44`,
            color: "#b48aff",
            background: "linear-gradient(135deg, #b48aff12, #b48aff07)",
            opacity: aiLoading || !status ? 0.5 : 1,
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, #b48aff55, transparent)" }} />
          {aiLoading
            ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} />
            : <Bot size={10} />}
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "8.5px", letterSpacing: "0.12em" }}>
            {aiLoading ? "ANALYZING SERVER..." : "ANALYZE & SUGGEST COMMANDS"}
          </span>
        </button>

        {aiError && (
          <div style={{ color: T.red, fontSize: "8px", background: T.red + "0d", padding: "6px 8px", borderLeft: `2px solid ${T.red}` }}>
            ✗ {aiError}
          </div>
        )}

        <AnimatePresence>
          {aiSuggestions && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
              {aiSuggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="relative p-2.5 overflow-hidden"
                  style={{ border: `1px solid ${priorityColor(s.priority)}33`, background: `${priorityColor(s.priority)}08` }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: priorityColor(s.priority) }} />
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ color: priorityColor(s.priority), fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em" }}>
                      [{s.priority}]
                    </span>
                    <QuickRconButton label="RUN" command={s.command} color={priorityColor(s.priority)} />
                  </div>
                  <div style={{ color: T.text, fontSize: "10px", fontFamily: "'Share Tech Mono', monospace" }}>{s.command}</div>
                  <div style={{ color: T.textFaint, fontSize: "8px", marginTop: "3px", lineHeight: 1.4 }}>{s.reason}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </ToolSection>

      {/* Quick Actions */}
      <ToolSection title="QUICK ACTIONS" color={T.cyan} icon={Zap} defaultOpen={true}>
        <div className="space-y-1">
          <QuickRconButton label="Restart Server"    command="restart"    color={T.red} />
          <QuickRconButton label="Save World"        command="save"       color={T.green} />
          <QuickRconButton label="List Players"      command="players"    color={T.cyan} />
          <QuickRconButton label="Server Status"     command="status"     color={T.textDim} />
          <QuickRconButton label="GC / Flush Memory" command="gc"         color={T.amber} />
          <QuickRconButton label="Clear Loot Cache"  command="clearloot"  color={T.amber} />
        </div>
      </ToolSection>

      {/* Broadcast */}
      <ToolSection title="SERVER BROADCAST" color={T.amber} icon={Send}>
        <div className="space-y-1.5">
          <input
            className="w-full px-2.5 py-1.5 outline-none"
            style={{ border: `1px solid ${T.border}`, background: "rgba(15,10,5,0.95)", color: T.text, fontSize: "10px", fontFamily: "'Share Tech Mono', monospace" }}
            placeholder="Message to all players..."
            value={broadcastMsg}
            onChange={e => setBroadcastMsg(e.target.value)}
          />
          <button
            disabled={!broadcastMsg.trim()}
            onClick={() => runCmd(`say ${broadcastMsg}`).then(() => setBroadcastMsg(""))}
            className="w-full px-3 py-1.5 text-xs hover:opacity-80 transition-opacity relative overflow-hidden"
            style={{ border: `1px solid ${T.amber}55`, color: T.amber, background: `${T.amber}0a`, opacity: broadcastMsg.trim() ? 1 : 0.35, fontFamily: "'Orbitron', monospace", fontSize: "8.5px", letterSpacing: "0.1em" }}
          >
            BROADCAST TO ALL PLAYERS
          </button>
          <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.12em", marginTop: "6px", marginBottom: "4px" }}>QUICK MESSAGES</div>
          {[
            "Server restart in 10 minutes. Please save!",
            "Server will go down for maintenance soon.",
            "Welcome to HumanitZ! Follow server rules.",
          ].map((msg, i) => (
            <button
              key={i}
              onClick={() => setBroadcastMsg(msg)}
              className="w-full text-left px-2.5 py-1.5 hover:opacity-80 transition-opacity"
              style={{ border: `1px solid ${T.border}`, color: T.textDim, fontSize: "8.5px", fontFamily: "'Share Tech Mono', monospace", background: "rgba(255,255,255,0.015)" }}
            >
              {msg}
            </button>
          ))}
        </div>
      </ToolSection>

      {/* Player Management */}
      <ToolSection title="PLAYER MANAGEMENT" color={T.red} icon={Users}>
        <div className="space-y-2.5">
          {[
            { label: "KICK PLAYER", name: kickName, setter: setKickName, action: () => runCmd(`kick ${kickName}`).then(() => setKickName("")), btnLabel: "KICK", btnColor: T.amber },
            { label: "BAN PLAYER",  name: banName,  setter: setBanName,  action: () => runCmd(`ban ${banName}`).then(() => setBanName("")),   btnLabel: "BAN",  btnColor: T.red },
          ].map(({ label, name, setter, action, btnLabel, btnColor }) => (
            <div key={label}>
              <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.14em", marginBottom: "4px" }}>{label}</div>
              <div className="flex gap-1.5">
                <input
                  className="flex-1 px-2 py-1.5 outline-none"
                  style={{ border: `1px solid ${T.border}`, background: "rgba(15,10,5,0.95)", color: T.text, fontSize: "10px", fontFamily: "'Share Tech Mono', monospace" }}
                  placeholder="Player name..."
                  value={name}
                  onChange={e => setter(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && name.trim() && action()}
                />
                <button
                  disabled={!name.trim()}
                  onClick={action}
                  className="px-3 py-1 hover:opacity-80 transition-opacity"
                  style={{ border: `1px solid ${btnColor}55`, color: btnColor, background: `${btnColor}0a`, opacity: name.trim() ? 1 : 0.3, fontFamily: "'Orbitron', monospace", fontSize: "8px", letterSpacing: "0.08em" }}
                >
                  {btnLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      </ToolSection>

      {/* Custom RCON */}
      <ToolSection title="CUSTOM RCON" color={T.green} icon={Terminal}>
        <div className="space-y-1.5">
          <input
            className="w-full px-2.5 py-1.5 outline-none"
            style={{ border: `1px solid ${T.border}`, background: "rgba(15,10,5,0.95)", color: T.green, fontSize: "11px", fontFamily: "'Share Tech Mono', monospace" }}
            placeholder="> enter rcon command..."
            value={customCmd}
            onChange={e => setCustomCmd(e.target.value)}
            onKeyDown={e => e.key === "Enter" && customCmd.trim() && runCmd(customCmd).then(() => setCustomCmd(""))}
          />
          <button
            disabled={!customCmd.trim() || customLoading}
            onClick={() => runCmd(customCmd).then(() => setCustomCmd(""))}
            className="w-full px-3 py-1.5 hover:opacity-80 flex items-center justify-center gap-2 transition-opacity relative overflow-hidden"
            style={{ border: `1px solid ${T.green}55`, color: T.green, background: `${T.green}0a`, opacity: customCmd.trim() ? 1 : 0.35, fontFamily: "'Orbitron', monospace", fontSize: "8.5px", letterSpacing: "0.1em" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.green}44, transparent)` }} />
            {customLoading ? <Loader size={9} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={9} />}
            EXECUTE COMMAND
          </button>
          <AnimatePresence>
            {customResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ color: customResult.ok ? T.green : T.red, fontSize: "8.5px", background: (customResult.ok ? T.green : T.red) + "0d", padding: "5px 10px", borderLeft: `2px solid ${customResult.ok ? T.green : T.red}` }}
              >
                {customResult.ok ? "✓" : "✗"} {customResult.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ToolSection>
    </div>
  );
}