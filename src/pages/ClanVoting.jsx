import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Vote, Plus, CheckCircle, Lock } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";

const empty = { question: "", options: ["",""], closes_at: "" };

export default function ClanVoting() {
  const [user, setUser] = useState(null);
  const [votes, setVotes] = useState([]);
  const [filter, setFilter] = useState("Open");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setIsAdmin(u.role === "admin");
      const data = await base44.entities.ClanVote.list("-created_date", 50);
      setVotes(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    const entry = {
      question: form.question,
      options: form.options.filter(o => o.trim()),
      votes: [],
      created_by: user.email,
      closes_at: form.closes_at || null,
      status: "Open"
    };
    const created = await base44.entities.ClanVote.create(entry);
    setVotes(prev => [created, ...prev]);
    setForm(empty);
    setShowForm(false);
  };

  const handleVote = async (poll, optionIdx) => {
    const existing = (poll.votes || []).find(v => v.voter_email === user.email);
    if (existing) return; // Already voted
    const updated = await base44.entities.ClanVote.update(poll.id, {
      votes: [...(poll.votes || []), { voter_email: user.email, option_index: optionIdx }]
    });
    setVotes(prev => prev.map(v => v.id === poll.id ? updated : v));
  };

  const handleClose = async (poll) => {
    const updated = await base44.entities.ClanVote.update(poll.id, { status: "Closed" });
    setVotes(prev => prev.map(v => v.id === poll.id ? updated : v));
  };

  const handleDelete = async (id) => {
    await base44.entities.ClanVote.delete(id);
    setVotes(prev => prev.filter(v => v.id !== id));
  };

  const getResults = (poll) => {
    const counts = (poll.options || []).map((opt, i) => ({
      opt,
      count: (poll.votes || []).filter(v => v.option_index === i).length
    }));
    const total = counts.reduce((a, c) => a + c.count, 0);
    return { counts, total };
  };

  const filtered = filter === "All" ? votes : votes.filter(v => v.status === filter);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <PageHeader icon={Vote} title="CLAN VOTING" color={T.green}>
        {isAdmin && (
          <ActionBtn color={T.green} onClick={() => setShowForm(!showForm)}>
            <Plus size={10} /> NEW VOTE
          </ActionBtn>
        )}
      </PageHeader>

      {showForm && isAdmin && (
        <FormPanel title="CREATE VOTE" titleColor={T.green} onClose={() => setShowForm(false)}>
          <Field label="QUESTION *">
            <input className="w-full border p-2 text-xs mb-3" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
              value={form.question} onChange={e => setForm({...form, question: e.target.value})} placeholder="What are we voting on?" />
          </Field>
          <div style={{ color: T.textFaint, fontSize: "9px", marginBottom: 6, letterSpacing: "0.1em" }}>// OPTIONS</div>
          {form.options.map((opt, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="flex-1 border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={opt} onChange={e => {
                  const opts = [...form.options]; opts[i] = e.target.value; setForm({...form, options: opts});
                }} placeholder={`Option ${i + 1}`} />
              {form.options.length > 2 && (
                <button onClick={() => setForm({...form, options: form.options.filter((_, j) => j !== i)})}
                  style={{ color: T.red, fontSize: "16px" }}>✕</button>
              )}
            </div>
          ))}
          {form.options.length < 6 && (
            <ActionBtn small color={T.textDim} onClick={() => setForm({...form, options: [...form.options, ""]})}>
              + ADD OPTION
            </ActionBtn>
          )}
          <Field label="CLOSES AT (OPTIONAL)">
            <input type="datetime-local" className="w-full border p-2 text-xs mt-2" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
              value={form.closes_at} onChange={e => setForm({...form, closes_at: e.target.value})} />
          </Field>
          <div className="flex justify-end gap-2 pt-3">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.green} onClick={handleSave} disabled={!form.question || form.options.filter(o => o.trim()).length < 2}>
              CREATE VOTE
            </ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex gap-1">
        {["Open","Closed","All"].map(f => <FilterPill key={f} label={f} active={filter === f} color={T.green} onClick={() => setFilter(f)} />)}
      </div>

      {filtered.length === 0 ? <EmptyState message="NO VOTES — DEMOCRACY NEEDS YOU" /> :
        filtered.map(poll => {
          const { counts, total } = getResults(poll);
          const myVote = (poll.votes || []).find(v => v.voter_email === user?.email);
          const isClosed = poll.status === "Closed" || (poll.closes_at && new Date(poll.closes_at) < new Date());

          return (
            <Panel key={poll.id} title={isClosed ? `[CLOSED] ${poll.question}` : poll.question}
              titleColor={isClosed ? T.textDim : T.green}>
              <div className="p-3 space-y-3">
                {counts.map((c, i) => {
                  const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                  const isMyVote = myVote?.option_index === i;
                  const isLeading = c.count > 0 && c.count === Math.max(...counts.map(x => x.count));
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => !isClosed && !myVote && handleVote(poll, i)}
                          className="flex items-center gap-2 text-left"
                          disabled={!!myVote || isClosed}
                          style={{ cursor: (myVote || isClosed) ? "default" : "pointer" }}>
                          {isMyVote && <CheckCircle size={10} style={{ color: T.green }} />}
                          <span style={{ color: isMyVote ? T.green : T.text, fontSize: "12px" }}>{c.opt}</span>
                        </button>
                        <span style={{ color: isLeading ? T.green : T.textDim, fontSize: "11px", fontFamily: "'Orbitron', monospace" }}>
                          {c.count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 4, background: T.border }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: isLeading ? T.green : T.cyan + "88", transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1">
                  <span style={{ color: T.textFaint, fontSize: "9px" }}>
                    {total} vote{total !== 1 ? "s" : ""} cast
                    {poll.closes_at && ` · closes ${new Date(poll.closes_at).toLocaleDateString()}`}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      {!isClosed && (
                        <ActionBtn small color={T.amber} onClick={() => handleClose(poll)}>
                          <Lock size={8} /> CLOSE
                        </ActionBtn>
                      )}
                      <ActionBtn small color={T.red + "aa"} onClick={() => handleDelete(poll.id)}>DELETE</ActionBtn>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          );
        })
      }
    </div>
  );
}