import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Send, Trash2, Zap, BookOpen, Wrench, Map } from "lucide-react";

const AGENT_MODES = [
  { id: "wiki", label: "WIKI AGENT", icon: BookOpen, color: "#00e5ff", desc: "Ask anything about HumanitZ game mechanics, items, enemies" },
  { id: "crafting", label: "CRAFTING AI", icon: Wrench, color: "#ffb000", desc: "Get crafting recipes, material requirements, chains" },
  { id: "intel", label: "TACTICAL AI", icon: Map, color: "#ff2020", desc: "Tactical advice, loot routes, survival strategies" },
  { id: "general", label: "COMMAND AI", icon: Zap, color: "#39ff14", desc: "General assistant for clan ops & server management" },
];

const SYSTEM_PROMPTS = {
  wiki: `You are DEAD SIGNAL — an AI embedded in a HumanitZ game companion terminal. You are a comprehensive HumanitZ game knowledge base. Answer questions about the survival game HumanitZ: items, weapons, crafting, base building, zombies, mechanics, tips and tricks. Keep answers concise and formatted for a terminal interface. Use military/survival tone. Format with headers using // and bullet points with >.`,
  crafting: `You are DEAD SIGNAL CRAFTING UNIT — an AI specialist in HumanitZ crafting systems. Help players understand crafting recipes, material requirements, crafting chains, and priority items to craft. Be specific about quantities and materials. Use a gritty terminal format with // headers and > bullets. Keep it tight and tactical.`,
  intel: `You are DEAD SIGNAL TACTICAL — a survival and tactical AI for HumanitZ players. Provide advice on loot routes, base defense, PvP tactics, zombie strategies, resource management, and survival tips. Think like a military tactician. Terminal format with // headers, > bullets, tactical tone.`,
  general: `You are DEAD SIGNAL COMMAND — the AI core of a clan companion app for HumanitZ. Help with clan management, server administration questions, player coordination, base planning, and any general questions about running a private HumanitZ server. Professional, no-nonsense terminal tone.`,
};

const QUICK_PROMPTS = {
  wiki: ["What are the best weapons?", "How does base building work?", "What do zombies drop?", "Best survival tips for beginners"],
  crafting: ["What can I craft with wood and metal?", "How do I craft a rifle?", "Best early game crafts?", "What materials do I need for a generator?"],
  intel: ["Best loot zones on the map?", "How to defend a base from raids?", "Best loadout for PvP?", "Early game survival strategy"],
  general: ["How do I manage server whitelists?", "Best clan roles setup?", "How to track player activity?", "Server performance tips"],
};

export default function AIAgent() {
  const [mode, setMode] = useState("wiki");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "> DEAD SIGNAL AI ONLINE\n> Select a mode and begin query.\n> All intel classified // CLAN EYES ONLY" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput("");

    const userMsg = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = messages.filter(m => m.role !== "system").slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const fullPrompt = `${SYSTEM_PROMPTS[mode]}

Conversation so far:
${history.map(m => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`).join("\n")}

USER: ${query}

AI:`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: mode === "wiki",
    });

    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setLoading(false);
  };

  const handleClear = () => {
    setMessages([{ role: "assistant", content: "> TERMINAL CLEARED\n> READY FOR NEW QUERY." }]);
  };

  const currentMode = AGENT_MODES.find(m => m.id === mode);

  const formatMessage = (content) => {
    return content.split("\n").map((line, i) => {
      let color = "#39ff1088";
      if (line.startsWith("//")) color = "#ffb000";
      else if (line.startsWith(">")) color = "#39ff14";
      else if (line.startsWith("WARNING") || line.startsWith("⚠")) color = "#ff2020";
      else if (line.startsWith("-") || line.startsWith("•")) color = "#00e5ff";
      return <div key={i} style={{ color, lineHeight: "1.6" }}>{line || " "}</div>;
    });
  };

  return (
    <div className="p-4 h-full flex flex-col max-w-5xl mx-auto" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <AlertTriangle size={16} style={{ color: "#00e5ff" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#00e5ff", fontFamily: "'Orbitron', monospace" }}>AI AGENT</span>
        <button onClick={handleClear} className="ml-auto flex items-center gap-1 text-xs px-2 py-1 border"
          style={{ borderColor: "#1e3a1e", color: "#39ff1044" }}>
          <Trash2 size={10} /> CLEAR
        </button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {AGENT_MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className="border p-2 text-left transition-all"
            style={{ borderColor: mode === m.id ? m.color : "#1e3a1e", background: mode === m.id ? "#0a0f0a" : "#060606" }}>
            <div className="flex items-center gap-1 mb-1">
              <m.icon size={11} style={{ color: m.color }} />
              <span className="text-xs font-bold" style={{ color: m.color, fontSize: "9px", letterSpacing: "0.1em" }}>{m.label}</span>
            </div>
            <div className="text-xs" style={{ color: "#39ff1033", fontSize: "9px" }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 border overflow-y-auto p-3 space-y-3 mb-3"
        style={{ borderColor: "#1e3a1e", background: "#060606", minHeight: "300px", maxHeight: "50vh" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs ${msg.role === "user" ? "pl-4 border-l-2" : ""}`}
            style={{ borderColor: currentMode?.color }}>
            {msg.role === "user" && (
              <div className="mb-1 text-xs" style={{ color: currentMode?.color, opacity: 0.7 }}>
                OPERATOR &gt;
              </div>
            )}
            {msg.role === "assistant" && (
              <div className="mb-1 text-xs" style={{ color: "#39ff1044" }}>
                [{currentMode?.label}] &gt;
              </div>
            )}
            <div className="text-xs" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs" style={{ color: "#39ff1066" }}>
            <span className="cursor-blink">PROCESSING QUERY</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1 mb-3">
        {QUICK_PROMPTS[mode]?.map(q => (
          <button key={q} onClick={() => handleSend(q)}
            className="text-xs px-2 py-1 border"
            style={{ borderColor: "#1e3a1e", color: "#39ff1055" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex border" style={{ borderColor: currentMode?.color }}>
        <span className="px-3 py-2 text-xs" style={{ color: currentMode?.color }}>&gt;</span>
        <input
          className="flex-1 bg-transparent text-xs py-2 pr-2 outline-none border-0"
          style={{ color: "#39ff14", fontFamily: "'Share Tech Mono', monospace" }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={`Query ${currentMode?.label}...`}
          disabled={loading}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          className="px-3 py-2 border-l" style={{ borderColor: currentMode?.color }}>
          <Send size={12} style={{ color: loading ? "#39ff1033" : currentMode?.color }} />
        </button>
      </div>
    </div>
  );
}