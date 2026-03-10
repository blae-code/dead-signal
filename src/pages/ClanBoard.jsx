import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, Pin, Trash2 } from "lucide-react";
import { T, PageHeader, ActionBtn, accentLine } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const CHAN_COLORS = { General: T.text, Ops: T.red, Loot: T.amber, Tactical: T.cyan, "Off-Topic": T.textDim };

export default function ClanBoard() {
  const runtimeConfig = useRuntimeConfig();
  const CHANNELS = runtimeConfig.getArray(["taxonomy", "clan_channels"]);
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [channel, setChannel] = useState("General");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (CHANNELS.length === 0) return;
    if (!CHANNELS.includes(channel)) {
      setChannel(CHANNELS[0]);
    }
  }, [CHANNELS, channel]);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setIsAdmin(u.role === "admin");
      const members = await base44.entities.ClanMember.filter({ user_email: u.email });
      if (members.length) setMember(members[0]);
      const msgs = await base44.entities.ClanMessage.filter({ channel }, "created_date", 100);
      setMessages(msgs);
    };
    load();

    const unsub = base44.entities.ClanMessage.subscribe((event) => {
      if (event.type === "create") setMessages(prev => [...prev, event.data]);
      if (event.type === "delete") setMessages(prev => prev.filter(m => m.id !== event.id));
      if (event.type === "update") setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const load = async () => {
      const msgs = await base44.entities.ClanMessage.filter({ channel }, "created_date", 100);
      setMessages(msgs);
    };
    load();
  }, [channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await base44.entities.ClanMessage.create({
      author_email: user.email,
      author_callsign: member?.callsign || user.full_name || user.email,
      body: input.trim(),
      channel,
      pinned: false
    });
    setInput("");
  };

  const handlePin = async (m) => {
    await base44.entities.ClanMessage.update(m.id, { pinned: !m.pinned });
  };

  const handleDelete = async (id) => {
    await base44.entities.ClanMessage.delete(id);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const chanMsgs = messages.filter(m => m.channel === channel);
  const pinned = chanMsgs.filter(m => m.pinned);
  const regular = chanMsgs.filter(m => !m.pinned);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 48px)" }}>
      <div className="p-4 pb-2">
        <PageHeader icon={MessageSquare} title="CLAN BOARD" color={T.green} />
      </div>
      {runtimeConfig.error && (
        <div className="mx-4 mb-2 border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-3">
        {/* Channel sidebar */}
        <div className="flex flex-col gap-1 w-36 flex-shrink-0">
          <div style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace", marginBottom: 6, paddingLeft: 2 }}>// CHANNELS</div>
          {CHANNELS.map(c => {
            const cc = CHAN_COLORS[c] || T.textDim;
            const active = channel === c;
            return (
              <button key={c} onClick={() => setChannel(c)}
                className="relative text-left px-2 py-2 overflow-hidden transition-all"
                style={{
                  border: `1px solid ${active ? cc + "66" : T.borderHi}`,
                  color: active ? cc : T.textDim,
                  background: active ? `linear-gradient(90deg, ${cc}14, transparent)` : "transparent",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "11px",
                  boxShadow: active ? `inset 0 0 12px ${cc}08` : "none",
                }}>
                {active && <div style={accentLine(cc)} />}
                {active && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: cc, boxShadow: `0 0 6px ${cc}` }} />}
                <span className="pl-2"># {c}</span>
              </button>
            );
          })}
        </div>

        {/* Main chat area */}
        <div className="flex flex-col flex-1 relative overflow-hidden" style={{
          border: `1px solid ${T.borderHi}`,
          background: `linear-gradient(180deg, ${T.bg3} 0%, ${T.bg1} 100%)`,
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
        }}>
          {/* Channel header */}
          <div className="relative px-3 py-2.5 border-b flex items-center gap-3 overflow-hidden" style={{ borderColor: T.border, background: T.bg2 }}>
            <div style={accentLine(CHAN_COLORS[channel] || T.textDim)} />
            <div style={{ width: "3px", height: "12px", background: CHAN_COLORS[channel] || T.textDim, boxShadow: `0 0 5px ${CHAN_COLORS[channel] || T.textDim}` }} />
            <span style={{ color: CHAN_COLORS[channel] || T.amber, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em", textShadow: `0 0 8px ${CHAN_COLORS[channel] || T.amber}55` }}>
              #{channel.toUpperCase()}
            </span>
            <span style={{ color: T.textFaint, fontSize: "9px" }}>— {chanMsgs.length} MSG</span>
          </div>

          {/* Pinned messages */}
          {pinned.length > 0 && (
            <div className="border-b px-3 py-2 relative overflow-hidden" style={{ borderColor: T.amber + "44", background: T.amber + "08" }}>
              <div style={accentLine(T.amber)} />
              <div style={{ color: T.amber, fontSize: "8px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em", marginBottom: 4 }}>▲ PINNED TRANSMISSIONS</div>
              {pinned.map(m => (
                <div key={m.id} style={{ color: T.textDim, fontSize: "11px", lineHeight: 1.5 }}>
                  <span style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>[{m.author_callsign}]</span>
                  <span style={{ marginLeft: 6 }}>{m.body}</span>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {regular.length === 0 && (
              <div style={{ color: T.textFaint, fontSize: "9px", textAlign: "center", marginTop: 40, fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>
                ▸ CHANNEL EMPTY — BE THE FIRST TO TRANSMIT
              </div>
            )}
            {regular.map(m => {
              const isOwn = m.author_email === user?.email;
              const ts = m.created_date ? new Date(m.created_date).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }) : "";
              const nameColor = isOwn ? T.cyan : T.amber;
              return (
                <div key={m.id} className="group flex items-start gap-2 relative">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span style={{ color: nameColor, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.08em", textShadow: `0 0 6px ${nameColor}66` }}>
                        {m.author_callsign || m.author_email}
                      </span>
                      <span style={{ color: T.textFaint + "88", fontSize: "9px" }}>{ts}</span>
                    </div>
                    <div style={{ color: T.text, fontSize: "12px", lineHeight: 1.6, fontFamily: "'Share Tech Mono', monospace", paddingLeft: 2, borderLeft: `1px solid ${nameColor}22` }}>
                      {m.body}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                    {isAdmin && (
                      <button onClick={() => handlePin(m)} className="p-1 border hover:opacity-70"
                        style={{ borderColor: m.pinned ? T.amber + "55" : T.border, background: m.pinned ? T.amber + "0d" : "transparent" }}>
                        <Pin size={9} style={{ color: m.pinned ? T.amber : T.textFaint }} />
                      </button>
                    )}
                    {(isOwn || isAdmin) && (
                      <button onClick={() => handleDelete(m.id)} className="p-1 border hover:opacity-70"
                        style={{ borderColor: T.red + "33", background: T.red + "08" }}>
                        <Trash2 size={9} style={{ color: T.red + "88" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t flex items-center gap-2 px-3 py-2" style={{ borderColor: T.border, background: T.bg2 }}>
            <span style={{ color: T.green, fontSize: "12px", fontFamily: "'Share Tech Mono', monospace" }}>›</span>
            <input
              className="flex-1 bg-transparent text-xs py-1 outline-none"
              style={{ color: T.text, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.04em" }}
              placeholder={`Transmit to #${channel}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <ActionBtn color={T.green} onClick={handleSend} disabled={!input.trim()}>
              <Send size={10} /> SEND
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
}