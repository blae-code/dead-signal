import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, Pin, Trash2 } from "lucide-react";
import { T, PageHeader, ActionBtn } from "@/components/ui/TerminalCard";

const CHANNELS = ["General","Ops","Loot","Tactical","Off-Topic"];
const CHAN_COLORS = { General: T.text, Ops: T.red, Loot: T.amber, Tactical: T.cyan, "Off-Topic": T.textDim };

export default function ClanBoard() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [channel, setChannel] = useState("General");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const bottomRef = useRef(null);

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

      <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-3">
        {/* Channel sidebar */}
        <div className="flex flex-col gap-1 w-32 flex-shrink-0">
          <div style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.15em", marginBottom: 4 }}>// CHANNELS</div>
          {CHANNELS.map(c => (
            <button key={c} onClick={() => setChannel(c)}
              className="text-left px-2 py-2 border text-xs transition-colors"
              style={{
                borderColor: channel === c ? CHAN_COLORS[c] : T.border,
                color: channel === c ? CHAN_COLORS[c] : T.textDim,
                background: channel === c ? CHAN_COLORS[c] + "11" : "transparent",
                fontFamily: "'Share Tech Mono', monospace"
              }}>
              # {c}
            </button>
          ))}
        </div>

        {/* Main chat area */}
        <div className="flex flex-col flex-1 border" style={{ borderColor: T.border, background: T.bg1 }}>
          {/* Channel header */}
          <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
            <span style={{ color: CHAN_COLORS[channel], fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>#{channel.toUpperCase()}</span>
            <span style={{ color: T.textFaint, fontSize: "9px" }}>— {chanMsgs.length} messages</span>
          </div>

          {/* Pinned messages */}
          {pinned.length > 0 && (
            <div className="border-b px-3 py-2" style={{ borderColor: T.amber + "44", background: T.amber + "08" }}>
              <div style={{ color: T.amber, fontSize: "9px", marginBottom: 4 }}>📌 PINNED</div>
              {pinned.map(m => (
                <div key={m.id} style={{ color: T.textDim, fontSize: "11px" }}>
                  <span style={{ color: T.amber }}>[{m.author_callsign}]</span> {m.body}
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {regular.length === 0 && (
              <div style={{ color: T.textFaint, fontSize: "10px", textAlign: "center", marginTop: 40 }}>
                // CHANNEL EMPTY — BE THE FIRST TO TRANSMIT
              </div>
            )}
            {regular.map(m => {
              const isOwn = m.author_email === user?.email;
              const ts = m.created_date ? new Date(m.created_date).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={m.id} className="group flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span style={{ color: isOwn ? T.cyan : T.amber, fontSize: "10px", fontWeight: "bold" }}>
                        {m.author_callsign || m.author_email}
                      </span>
                      <span style={{ color: T.textFaint, fontSize: "9px" }}>{ts}</span>
                    </div>
                    <div style={{ color: T.text, fontSize: "12px", lineHeight: 1.5 }}>{m.body}</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    {isAdmin && (
                      <button onClick={() => handlePin(m)} className="p-1 hover:opacity-70">
                        <Pin size={9} style={{ color: m.pinned ? T.amber : T.textFaint }} />
                      </button>
                    )}
                    {(isOwn || isAdmin) && (
                      <button onClick={() => handleDelete(m.id)} className="p-1 hover:opacity-70">
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
          <div className="border-t flex items-center gap-2 px-3 py-2" style={{ borderColor: T.border }}>
            <input
              className="flex-1 border p-2 text-xs"
              style={{ borderColor: T.border, background: "transparent", color: T.text, fontFamily: "'Share Tech Mono', monospace" }}
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