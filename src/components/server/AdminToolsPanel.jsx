import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, Terminal, Users, RefreshCw, Shield, Send, ChevronDown, ChevronRight, Loader } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

function ToolSection({ title, color, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border" style={{ borderColor: open ? color + "44" : T.border }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
        style={{ background: open ? color + "08" : "transparent" }}
      >
        <Icon size={10} style={{ color }} />
        <span style={{ color, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", flex: 1 }}>{title}</span>
        {open ? <ChevronDown size={10} style={{ color: T.textFaint }} /> : <ChevronRight size={10} style={{ color: T.textFaint }} />}
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
            <div className="px-3 pb-3 pt-1 border-t space-y-2" style={{ borderColor: T.border }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickRconButton({ label, command, onRun, color = T.textDim }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
        className="w-full flex items-center gap-2 px-2 py-1.5 border text-left hover:opacity-80 transition-opacity"
        style={{ borderColor: color + "44", color, fontSize: "10px", background: color + "08" }}
      >
        {loading ? <Loader size={9} style={{ animation: "spin 1s linear infinite" }} /> : <Terminal size={9} />}
        <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>{label}</span>
        <span style={{ color: T.textFaint, marginLeft: "auto", fontSize: "9px" }}>{command}</span>
      </button>
      {result && (
        <div className="px-2 py-1 text-xs" style={{ color: result.ok ? T.green : T.red, fontSize: "9px", background: (result.ok ? T.green : T.red) + "11" }}>
          {result.ok ? "✓" : "✗"} {result.text?.slice(0, 80)}
        </div>
      )}
    </div>
  );
}

export default function AdminToolsPanel({ status }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [kickName, setKickName] = useState("");
  const [banName, setBanName] = useState("");
  const [customCmd, setCustomCmd] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  const getAiSuggestions = async () => {
    if (!status) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions(null);
    try {
      const res = await base44.functions.invoke('suggestRconCommands', { context: status });
      if (res.data?.suggestions) {
        setAiSuggestions(res.data.suggestions);
      } else {
        setAiError("No suggestions returned.");
      }
    } catch (e) {
      setAiError(e.message);
    }
    setAiLoading(false);
  };

  const runCmd = async (cmd, setter) => {
    setter && setter(null);
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
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: T.border }}>
        <Shield size={11} style={{ color: T.amber }} />
        <span style={{ color: T.amber, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em" }}>ADMIN TOOLS</span>
        <span style={{ color: T.textFaint, fontSize: "8px", marginLeft: "auto" }}>ADMIN ONLY</span>
      </div>

      {/* AI Command Suggestions */}
      <ToolSection title="AI RCON ADVISOR" color="#b48aff" icon={Bot} defaultOpen={true}>
        <button
          onClick={getAiSuggestions}
          disabled={aiLoading || !status}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border text-xs hover:opacity-80 transition-opacity"
          style={{ borderColor: "#b48aff44", color: "#b48aff", background: "#b48aff11", opacity: aiLoading || !status ? 0.5 : 1 }}
        >
          {aiLoading ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Bot size={10} />}
          {aiLoading ? "ANALYZING SERVER..." : "ANALYZE & SUGGEST COMMANDS"}
        </button>
        {aiError && (
          <div className="text-xs p-2" style={{ color: T.red, background: T.red + "11", fontSize: "9px" }}>✗ {aiError}</div>
        )}
        <AnimatePresence>
          {aiSuggestions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              {aiSuggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="border p-2"
                  style={{ borderColor: priorityColor(s.priority) + "44", background: priorityColor(s.priority) + "08" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: priorityColor(s.priority), fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
                      [{s.priority}]
                    </span>
                    <QuickRconButton label="EXECUTE" command={s.command} color={priorityColor(s.priority)} />
                  </div>
                  <div style={{ color: T.text, fontSize: "10px", fontFamily: "'Share Tech Mono', monospace" }}>{s.command}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px", marginTop: "2px" }}>{s.reason}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </ToolSection>

      {/* Quick Actions */}
      <ToolSection title="QUICK ACTIONS" color={T.cyan} icon={Zap} defaultOpen={true}>
        <div className="space-y-1">
          <QuickRconButton label="Restart Server" command="restart" color={T.red} />
          <QuickRconButton label="Save World" command="save" color={T.green} />
          <QuickRconButton label="List Players" command="players" color={T.cyan} />
          <QuickRconButton label="Server Status" command="status" color={T.textDim} />
          <QuickRconButton label="GC / Flush Memory" command="gc" color={T.amber} />
          <QuickRconButton label="Clear Loot Cache" command="clearloot" color={T.amber} />
        </div>
      </ToolSection>

      {/* Broadcast */}
      <ToolSection title="SERVER BROADCAST" color={T.amber} icon={Send}>
        <div className="space-y-1">
          <input
            className="w-full px-2 py-1 border text-xs outline-none"
            style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
            placeholder="Message to all players..."
            value={broadcastMsg}
            onChange={e => setBroadcastMsg(e.target.value)}
          />
          <button
            disabled={!broadcastMsg.trim()}
            onClick={() => runCmd(`say ${broadcastMsg}`, null).then(() => setBroadcastMsg(""))}
            className="w-full px-3 py-1.5 border text-xs hover:opacity-80 transition-opacity"
            style={{ borderColor: T.amber + "66", color: T.amber, opacity: broadcastMsg.trim() ? 1 : 0.4 }}
          >
            BROADCAST TO SERVER
          </button>
        </div>
        <div className="space-y-1 pt-1">
          <div style={{ color: T.textFaint, fontSize: "8px" }}>QUICK MESSAGES</div>
          {[
            "Server restart in 10 minutes. Please save!",
            "Server will go down for maintenance soon.",
            "Welcome to HumanitZ! Follow server rules.",
          ].map((msg, i) => (
            <button
              key={i}
              onClick={() => setBroadcastMsg(msg)}
              className="w-full text-left px-2 py-1 border text-xs hover:opacity-80"
              style={{ borderColor: T.border, color: T.textDim, fontSize: "9px" }}
            >
              {msg}
            </button>
          ))}
        </div>
      </ToolSection>

      {/* Player Management */}
      <ToolSection title="PLAYER MANAGEMENT" color={T.red} icon={Users}>
        <div className="space-y-2">
          <div>
            <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "3px" }}>KICK PLAYER</div>
            <div className="flex gap-1">
              <input
                className="flex-1 px-2 py-1 border text-xs outline-none"
                style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
                placeholder="Player name..."
                value={kickName}
                onChange={e => setKickName(e.target.value)}
              />
              <button
                disabled={!kickName.trim()}
                onClick={() => runCmd(`kick ${kickName}`, null).then(() => setKickName(""))}
                className="px-3 py-1 border text-xs hover:opacity-80"
                style={{ borderColor: T.amber + "66", color: T.amber, opacity: kickName.trim() ? 1 : 0.4 }}
              >
                KICK
              </button>
            </div>
          </div>
          <div>
            <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "3px" }}>BAN PLAYER</div>
            <div className="flex gap-1">
              <input
                className="flex-1 px-2 py-1 border text-xs outline-none"
                style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
                placeholder="Player name..."
                value={banName}
                onChange={e => setBanName(e.target.value)}
              />
              <button
                disabled={!banName.trim()}
                onClick={() => runCmd(`ban ${banName}`, null).then(() => setBanName(""))}
                className="px-3 py-1 border text-xs hover:opacity-80"
                style={{ borderColor: T.red + "66", color: T.red, opacity: banName.trim() ? 1 : 0.4 }}
              >
                BAN
              </button>
            </div>
          </div>
        </div>
      </ToolSection>

      {/* Custom Command */}
      <ToolSection title="CUSTOM RCON" color={T.green} icon={Terminal}>
        <div className="space-y-1">
          <input
            className="w-full px-2 py-1 border text-xs outline-none"
            style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.green, fontSize: "11px", fontFamily: "'Share Tech Mono', monospace" }}
            placeholder="> enter rcon command..."
            value={customCmd}
            onChange={e => setCustomCmd(e.target.value)}
            onKeyDown={e => e.key === "Enter" && customCmd.trim() && runCmd(customCmd, setCustomResult).then(() => setCustomCmd(""))}
          />
          <button
            disabled={!customCmd.trim() || customLoading}
            onClick={() => runCmd(customCmd, setCustomResult).then(() => setCustomCmd(""))}
            className="w-full px-3 py-1.5 border text-xs hover:opacity-80 flex items-center justify-center gap-2"
            style={{ borderColor: T.green + "66", color: T.green, opacity: customCmd.trim() ? 1 : 0.4 }}
          >
            {customLoading ? <Loader size={9} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={9} />}
            EXECUTE
          </button>
          {customResult && (
            <div className="p-2 text-xs" style={{ color: customResult.ok ? T.green : T.red, background: (customResult.ok ? T.green : T.red) + "11", fontSize: "9px" }}>
              {customResult.ok ? "✓" : "✗"} {customResult.text}
            </div>
          )}
        </div>
      </ToolSection>
    </div>
  );
}