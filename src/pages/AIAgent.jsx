import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Send, Trash2, Zap, BookOpen, Wrench, Map } from "lucide-react";
import { T, PageHeader } from "@/components/ui/TerminalCard";

const MODES = [
  { id: "wiki",     label: "WIKI AGENT",   icon: BookOpen, color: T.cyan,  desc: "Game mechanics, items, enemies" },
  { id: "crafting", label: "CRAFTING AI",  icon: Wrench,   color: T.amber, desc: "Recipes, materials, crafting chains" },
  { id: "intel",    label: "TACTICAL AI",  icon: Map,      color: T.red,   desc: "Loot routes, tactics, survival" },
  { id: "general",  label: "COMMAND AI",   icon: Zap,      color: T.green, desc: "Clan ops & server management" },
];

const SYSTEM_PROMPTS = {
  wiki:     `You are DEAD SIGNAL — an AI embedded in a HumanitZ game companion terminal. Answer questions about the survival game HumanitZ: items, weapons, crafting, base building, zombies, mechanics, tips and tricks. Keep answers concise and formatted for a terminal interface. Use military/survival tone. Format with headers using // and bullet points with >.`,
  crafting: `You are DEAD SIGNAL CRAFTING UNIT — an AI specialist in HumanitZ crafting systems. Help players understand crafting recipes, material requirements, crafting chains, and priority items to craft. Be specific about quantities and materials. Terminal format with // headers and > bullets.`,
  intel:    `You are DEAD SIGNAL TACTICAL — a survival and tactical AI for HumanitZ players. Provide advice on loot routes, base defense, PvP tactics, zombie strategies, resource management. Terminal format with // headers, > bullets, tactical tone.`,
  general:  `You are DEAD SIGNAL COMMAND — the AI core of a clan companion app for HumanitZ. Help with clan management, server administration, player coordination, base planning. Professional, no-nonsense terminal tone.`,
};

const QUICK_PROMPTS = {
  wiki:     ["Best weapons?", "How does base building work?", "What do zombies drop?", "Beginner survival tips"],
  crafting: ["Craft with wood and metal?", "How to craft a rifle?", "Best early crafts?", "Generator materials?"],
  intel:    ["Best loot zones?", "Defend base from raids?", "Best PvP loadout?", "Early game strategy"],
  general:  ["Manage whitelists?", "Best clan role setup?", "Track player activity?", "Server performance tips"],
};

export default function AIAgent() {
  const [mode, setMode] = useState("wiki");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "> DEAD SIGNAL AI ONLINE\n> Select a mode and begin query.\n> All intel classified // CLAN EYES ONLY" }
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setLoading(true);

    const history = messages.filter(m => m.role !== "system").slice(-8);
    const fullPrompt = `${SYSTEM_PROMPTS[mode]}\n\nConversation so far:\n${history.map(m => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`).join("\n")}\n\nUSER: ${query}\n\nAI:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt, add_context_from_internet: mode === "wiki" });
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setLoading(false);
  };

  const currentMode = MODES.find(m => m.id === mode);

  const formatMessage = (content) => content.split("\n").map((line, i) => {
    let color = T.textDim;
    if (line.startsWith("//"))                          color = T.amber;
    else if (line.startsWith(">"))                      color = T.green;
    else if (line.startsWith("WARNING") || line.startsWith("⚠")) color = T.red;
    else if (line.startsWith("-") || line.startsWith("•"))        color = T.cyan;
    return <div key={i} style={{ color, lineHeight: "1.7" }}>{line || "\u00a0"}</div>;
  });

  return (
    <div className="p-4 flex flex-col max-w-5xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={AlertTriangle} title="AI AGENT" color={T.cyan}>
        <button onClick={() => setMessages([{ role: "assistant", content: "> TERMINAL CLEARED\n> READY FOR NEW QUERY." }])}
          className="flex items-center gap-1 text-xs px-2 py-1 border transition-opacity hover:opacity-70"
          style={{ borderColor: T.border, color: T.textDim }}>
          <Trash2 size={10} /> CLEAR
        </button>
      </PageHeader>

      {/* Mode selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className="border p-2.5 text-left transition-all hover:opacity-90"
            style={{ borderColor: mode === m.id ? m.color : T.border, background: mode === m.id ? m.color + "0d" : T.bg1 }}>
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon size={11} style={{ color: m.color }} />
              <span className="font-bold tracking-wider" style={{ color: m.color, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{m.label}</span>
            </div>
            <div style={{ color: T.textFaint, fontSize: "9px", lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 border overflow-y-auto p-4 space-y-4 mb-3"
        style={{ borderColor: T.border, background: T.bg1, minHeight: "300px", maxHeight: "50vh" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs ${msg.role === "user" ? "pl-3 border-l-2" : ""}`}
            style={{ borderColor: currentMode?.color }}>
            {msg.role === "user" && (
              <div className="mb-1" style={{ color: currentMode?.color + "bb", fontSize: "9px", letterSpacing: "0.15em" }}>OPERATOR ›</div>
            )}
            {msg.role === "assistant" && (
              <div className="mb-1" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>[{currentMode?.label}] ›</div>
            )}
            <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs cursor-blink" style={{ color: T.textDim }}>PROCESSING QUERY</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_PROMPTS[mode]?.map(q => (
          <button key={q} onClick={() => handleSend(q)}
            className="text-xs px-2 py-1 border transition-opacity hover:opacity-80"
            style={{ borderColor: T.border, color: T.textDim, fontSize: "10px" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex border" style={{ borderColor: currentMode?.color + "88" }}>
        <span className="px-3 py-2 text-xs" style={{ color: currentMode?.color }}>›</span>
        <input
          className="flex-1 bg-transparent text-xs py-2 pr-2 outline-none border-0"
          style={{ color: T.text, fontFamily: "'Share Tech Mono', monospace" }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={`Query ${currentMode?.label}...`}
          disabled={loading}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          className="px-3 py-2 border-l transition-opacity"
          style={{ borderColor: currentMode?.color + "88", opacity: loading || !input.trim() ? 0.3 : 1 }}>
          <Send size={12} style={{ color: currentMode?.color }} />
        </button>
      </div>
    </div>
  );
}