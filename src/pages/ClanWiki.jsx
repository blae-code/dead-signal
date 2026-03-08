import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Plus, Edit2, Trash2, Pin, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";

const CATS = ["All","Base Building","Crafting","Survival","Weapons","Locations","Tactics","Rules","Other"];
const CAT_COLORS = { "Base Building": "#b8a890", Crafting: T.amber, Survival: T.green, Weapons: T.red, Locations: T.cyan, Tactics: T.orange, Rules: "#c8a0e0", Other: T.textDim };
const empty = { title: "", category: "Other", content: "", tags: "", pinned: false };

export default function ClanWiki() {
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [reading, setReading] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setIsAdmin(u.role === "admin");
      const data = await base44.entities.WikiArticle.list("-updated_date", 100);
      setArticles(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    const entry = {
      ...form,
      author_email: user.email,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : []
    };
    if (editingId) {
      const updated = await base44.entities.WikiArticle.update(editingId, entry);
      setArticles(prev => prev.map(a => a.id === editingId ? updated : a));
      if (reading?.id === editingId) setReading(updated);
    } else {
      const created = await base44.entities.WikiArticle.create(entry);
      setArticles(prev => [created, ...prev]);
    }
    setForm(empty);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.WikiArticle.delete(id);
    setArticles(prev => prev.filter(a => a.id !== id));
    if (reading?.id === id) setReading(null);
  };

  const handlePin = async (a) => {
    const updated = await base44.entities.WikiArticle.update(a.id, { pinned: !a.pinned });
    setArticles(prev => prev.map(x => x.id === a.id ? updated : x));
  };

  const handleEdit = (a) => {
    setForm({ title: a.title, category: a.category, content: a.content, tags: (a.tags || []).join(", "), pinned: a.pinned || false });
    setEditingId(a.id);
    setShowForm(true);
    setReading(null);
  };

  const filtered = articles
    .filter(a => filter === "All" || a.category === filter)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <PageHeader icon={BookOpen} title="CLAN WIKI" color={T.cyan}>
        {isAdmin && (
          <ActionBtn color={T.cyan} onClick={() => { setShowForm(!showForm); setForm(empty); setEditingId(null); setReading(null); }}>
            <Plus size={10} /> NEW ARTICLE
          </ActionBtn>
        )}
      </PageHeader>

      {showForm && (
        <FormPanel title={editingId ? "EDIT ARTICLE" : "NEW ARTICLE"} titleColor={T.cyan} onClose={() => { setShowForm(false); setEditingId(null); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TITLE *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="TAGS (comma separated)">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="e.g. guns, ak, loot" />
            </Field>
          </div>
          <Field label="CONTENT (Markdown supported) *">
            <textarea className="w-full border p-2 text-xs mt-1" rows={10}
              style={{ borderColor: T.border, background: T.bg1, color: T.text, fontFamily: "'Share Tech Mono', monospace", resize: "vertical" }}
              value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="Write your article here... Markdown is supported." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => { setShowForm(false); setEditingId(null); }}>CANCEL</ActionBtn>
            <ActionBtn color={T.cyan} onClick={handleSave} disabled={!form.title || !form.content}>PUBLISH</ActionBtn>
          </div>
        </FormPanel>
      )}

      {/* Reading view */}
      {reading && !showForm && (
        <div className="border p-4 space-y-3" style={{ borderColor: T.cyan + "44", background: T.bg1 }}>
          <div className="flex items-start justify-between pb-2 border-b" style={{ borderColor: T.border }}>
            <div>
              <div style={{ color: T.cyan, fontSize: "14px", fontWeight: "bold", fontFamily: "'Orbitron', monospace" }}>{reading.title}</div>
              <div style={{ color: CAT_COLORS[reading.category] || T.textDim, fontSize: "9px", marginTop: 2 }}>{reading.category}</div>
              {reading.tags?.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {reading.tags.map(t => <span key={t} style={{ color: T.textFaint, fontSize: "9px", border: `1px solid ${T.border}`, padding: "1px 4px" }}>{t}</span>)}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {isAdmin && <>
                <ActionBtn small color={T.textDim} onClick={() => handleEdit(reading)}>EDIT</ActionBtn>
                <ActionBtn small color={T.red + "aa"} onClick={() => handleDelete(reading.id)}>DELETE</ActionBtn>
              </>}
              <ActionBtn small color={T.textFaint} onClick={() => setReading(null)}>CLOSE</ActionBtn>
            </div>
          </div>
          <div style={{ color: T.text, fontSize: "12px", lineHeight: 1.7 }}
            className="prose prose-sm max-w-none"
          >
            <ReactMarkdown
              components={{
                h1: ({children}) => <h1 style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "14px", marginBottom: 8 }}>{children}</h1>,
                h2: ({children}) => <h2 style={{ color: T.cyan, fontSize: "12px", marginBottom: 6 }}>{children}</h2>,
                h3: ({children}) => <h3 style={{ color: T.textDim, fontSize: "11px", marginBottom: 4 }}>{children}</h3>,
                p: ({children}) => <p style={{ color: T.text, marginBottom: 8 }}>{children}</p>,
                li: ({children}) => <li style={{ color: T.text, marginBottom: 2 }}>{children}</li>,
                strong: ({children}) => <strong style={{ color: T.amber }}>{children}</strong>,
                code: ({children}) => <code style={{ color: T.green, background: T.bg0, padding: "1px 4px" }}>{children}</code>,
              }}
            >
              {reading.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* List */}
      {!reading && !showForm && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={10} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: T.textFaint }} />
              <input className="w-full border pl-7 pr-3 py-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." />
            </div>
            <div className="flex flex-wrap gap-1">
              {CATS.map(c => <FilterPill key={c} label={c} active={filter === c} color={T.cyan} onClick={() => setFilter(c)} />)}
            </div>
          </div>

          <Panel title={`ARTICLES (${filtered.length})`} titleColor={T.cyan}>
            {filtered.length === 0 ? <EmptyState message="NO ARTICLES — ADD CLAN KNOWLEDGE" /> :
              filtered.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-3 border-b cursor-pointer hover:bg-white hover:bg-opacity-5 transition-colors"
                  style={{ borderColor: T.border + "66" }}
                  onClick={() => setReading(a)}>
                  <div className="flex items-center gap-3">
                    {a.pinned && <Pin size={9} style={{ color: T.amber }} />}
                    <div>
                      <div style={{ color: T.text, fontSize: "12px" }}>{a.title}</div>
                      <div className="flex gap-2 mt-0.5">
                        <span style={{ color: CAT_COLORS[a.category] || T.textDim, fontSize: "9px" }}>{a.category}</span>
                        {a.tags?.map(t => <span key={t} style={{ color: T.textFaint, fontSize: "9px" }}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {isAdmin && <>
                      <button onClick={() => handlePin(a)} className="p-1 hover:opacity-70">
                        <Pin size={9} style={{ color: a.pinned ? T.amber : T.textFaint }} />
                      </button>
                      <button onClick={() => handleEdit(a)} className="p-1 hover:opacity-70">
                        <Edit2 size={9} style={{ color: T.textDim }} />
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-1 hover:opacity-70">
                        <Trash2 size={9} style={{ color: T.red + "88" }} />
                      </button>
                    </>}
                  </div>
                </div>
              ))
            }
          </Panel>
        </>
      )}
    </div>
  );
}