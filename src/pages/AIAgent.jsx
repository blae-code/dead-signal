import { useState, useRef, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Send, Trash2, Zap, BookOpen, Wrench, Map } from "lucide-react";
import { T, PageHeader, accentLine } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const iconMap = {
  BookOpen,
  Wrench,
  Map,
  Zap,
};

const normalizeModes = (raw) => (
  Array.isArray(raw)
    ? raw
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: typeof entry.id === "string" ? entry.id : "",
        label: typeof entry.label === "string" ? entry.label : "",
        icon: typeof entry.icon === "string" ? entry.icon : "Zap",
        color: typeof entry.color === "string" ? entry.color : T.textDim,
        desc: typeof entry.desc === "string" ? entry.desc : "",
      }))
      .filter((entry) => entry.id)
    : []
);

const asRecord = (value) => (value && typeof value === "object" ? value : {});

export default function AIAgent() {
  const runtimeConfig = useRuntimeConfig();
  const modes = useMemo(
    () => normalizeModes(runtimeConfig.getArray(["ai", "modes"])),
    [runtimeConfig],
  );
  const systemPrompts = asRecord(runtimeConfig.config?.ai?.system_prompts);
  const quickPrompts = asRecord(runtimeConfig.config?.ai?.quick_prompts);
  const defaultMode = modes[0]?.id || "general";
  const [mode, setMode] = useState(defaultMode);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "> DEAD SIGNAL AI ONLINE\n> Select a mode and begin query.\n> All intel classified // CLAN EYES ONLY" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!modes.some((entry) => entry.id === mode) && modes.length > 0) {
      setMode(modes[0].id);
    }
  }, [mode, modes]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    const systemPrompt = typeof systemPrompts[mode] === "string" ? systemPrompts[mode] : null;
    if (!systemPrompt) {
      setMessages((prev) => [...prev, { role: "assistant", content: "RUNTIME AI CONFIG UNAVAILABLE FOR SELECTED MODE." }]);
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    const history = messages.filter((entry) => entry.role !== "system").slice(-8);
    const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${history.map((entry) => `${entry.role === "user" ? "USER" : "AI"}: ${entry.content}`).join("\n")}\n\nUSER: ${query}\n\nAI:`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: mode === "wiki",
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } finally {
      setLoading(false);
    }
  };

  const currentMode = modes.find((entry) => entry.id === mode) || null;

  const formatMessage = (content) => content.split("\n").map((line, index) => {
    let color = T.textDim;
    if (line.startsWith("//")) color = T.amber;
    else if (line.startsWith(">")) color = T.green;
    else if (line.startsWith("WARNING") || line.startsWith("⚠")) color = T.red;
    else if (line.startsWith("-") || line.startsWith("•")) color = T.cyan;
    return <div key={index} style={{ color, lineHeight: "1.7" }}>{line || "\u00a0"}</div>;
  });

  return (
    <div className="p-4 flex flex-col max-w-5xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={AlertTriangle} title="AI AGENT" color={T.cyan}>
        <button
          onClick={() => setMessages([{ role: "assistant", content: "> TERMINAL CLEARED\n> READY FOR NEW QUERY." }])}
          className="flex items-center gap-1 text-xs px-2 py-1 border transition-opacity hover:opacity-70"
          style={{ borderColor: T.border, color: T.textDim }}
        >
          <Trash2 size={10} /> CLEAR
        </button>
      </PageHeader>

      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs mb-3" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME AI CONFIG UNAVAILABLE
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {modes.map((entry) => {
          const Icon = iconMap[entry.icon] || Zap;
          return (
            <button
              key={entry.id}
              onClick={() => setMode(entry.id)}
              className="border p-2.5 text-left transition-all hover:opacity-90"
              style={{ borderColor: mode === entry.id ? entry.color : T.border, background: mode === entry.id ? entry.color + "0d" : T.bg1 }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} style={{ color: entry.color }} />
                <span className="font-bold tracking-wider" style={{ color: entry.color, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>
                  {entry.label}
                </span>
              </div>
              <div style={{ color: T.textFaint, fontSize: "9px", lineHeight: 1.4 }}>{entry.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="flex-1 border overflow-y-auto p-4 space-y-4 mb-3" style={{ borderColor: T.border, background: T.bg1, minHeight: "300px", maxHeight: "50vh" }}>
        {messages.map((message, index) => (
          <div key={index} className={`text-xs ${message.role === "user" ? "pl-3 border-l-2" : ""}`} style={{ borderColor: currentMode?.color || T.border }}>
            {message.role === "user" && (
              <div className="mb-1" style={{ color: (currentMode?.color || T.cyan) + "bb", fontSize: "9px", letterSpacing: "0.15em" }}>OPERATOR ›</div>
            )}
            {message.role === "assistant" && (
              <div className="mb-1" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>[{currentMode?.label || "AI"}] ›</div>
            )}
            <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {formatMessage(message.content)}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs cursor-blink" style={{ color: T.textDim }}>PROCESSING QUERY</div>}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Array.isArray(quickPrompts[mode]) ? quickPrompts[mode] : []).map((prompt) => (
          <button key={prompt} onClick={() => handleSend(prompt)} className="text-xs px-2 py-1 border transition-opacity hover:opacity-80" style={{ borderColor: T.border, color: T.textDim, fontSize: "10px" }}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex border" style={{ borderColor: (currentMode?.color || T.cyan) + "88" }}>
        <span className="px-3 py-2 text-xs" style={{ color: currentMode?.color || T.cyan }}>›</span>
        <input
          className="flex-1 bg-transparent text-xs py-2 pr-2 outline-none border-0"
          style={{ color: T.text, fontFamily: "'Share Tech Mono', monospace" }}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleSend()}
          placeholder={`Query ${currentMode?.label || "AI"}...`}
          disabled={loading}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="px-3 py-2 border-l transition-opacity" style={{ borderColor: (currentMode?.color || T.cyan) + "88", opacity: loading || !input.trim() ? 0.3 : 1 }}>
          <Send size={12} style={{ color: currentMode?.color || T.cyan }} />
        </button>
      </div>
    </div>
  );
}