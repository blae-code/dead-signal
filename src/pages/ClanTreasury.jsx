import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Database, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, TableHeader, TableRow, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";

const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const pickFirstNonAll = (values) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() !== "all") || pickFirst(values);

const buildEmpty = (categories, actions) => ({
  item_name: "",
  category: pickFirstNonAll(categories),
  quantity: 1,
  action: pickFirstNonAll(actions),
  reason: "",
});

export default function ClanTreasury() {
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const categories = runtimeConfig.getArray(["taxonomy", "loot_categories"]);
  const actions = runtimeConfig.getArray(["taxonomy", "treasury_actions"]);
  const actionFilters = runtimeConfig.getArray(["taxonomy", "treasury_action_filters"]);

  const allCategoryFilter = useMemo(() => pickByToken(categories, "all") || pickFirst(categories), [categories]);
  const allActionFilter = useMemo(() => pickByToken(actionFilters, "all") || pickFirst(actionFilters), [actionFilters]);
  const depositAction = useMemo(() => pickByToken(actions, "deposit") || pickFirst(actions), [actions]);
  const withdrawalAction = useMemo(() => pickByToken(actions, "withdrawal"), [actions]);

  const [filter, setFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(categories, actions));

  const { data: user = null } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const { data: member = null } = useQuery({
    queryKey: ["clan-treasury", "member", user?.email || ""],
    queryFn: async () => {
      const records = await base44.entities.ClanMember.filter({ user_email: user.email });
      return records[0] || null;
    },
    enabled: Boolean(user?.email),
    staleTime: 30_000,
  });
  const { data: entries = [] } = useRealtimeEntityList({
    queryKey: ["clan-treasury", "entries"],
    entityName: "TreasuryEntry",
    queryFn: () => base44.entities.TreasuryEntry.list("-created_date", 200),
    patchStrategy: "patch",
  });

  useEffect(() => {
    if (!form.category || !form.action) {
      setForm((prev) => ({ ...prev, ...buildEmpty(categories, actions) }));
    }
  }, [actions, categories, form.action, form.category]);

  useEffect(() => {
    if (!filter && allCategoryFilter) setFilter(allCategoryFilter);
  }, [allCategoryFilter, filter]);

  useEffect(() => {
    if (!actionFilter && allActionFilter) setActionFilter(allActionFilter);
  }, [actionFilter, allActionFilter]);

  const handleSave = async () => {
    if (!user?.email) return;
    const entry = {
      ...form,
      contributor_email: user.email,
      contributor_callsign: member?.callsign || user.full_name || user.email,
      quantity: Number(form.quantity),
    };
    await base44.entities.TreasuryEntry.create(entry);
    queryClient.invalidateQueries({ queryKey: ["clan-treasury", "entries"] });
    setForm(buildEmpty(categories, actions));
    setShowForm(false);
  };

  const stock = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      if (!map[entry.item_name]) map[entry.item_name] = { item: entry.item_name, category: entry.category, total: 0 };
      map[entry.item_name].total += entry.action === depositAction ? entry.quantity : -entry.quantity;
    });
    return Object.values(map).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  }, [depositAction, entries]);

  const filtered = entries.filter((entry) => {
    const categoryOk = !filter || filter === allCategoryFilter || entry.category === filter;
    const actionOk = !actionFilter || actionFilter === allActionFilter || entry.action === actionFilter;
    return categoryOk && actionOk;
  });

  const totalDeposits = depositAction ? entries.filter((entry) => entry.action === depositAction).reduce((sum, entry) => sum + entry.quantity, 0) : 0;
  const totalWithdrawals = withdrawalAction ? entries.filter((entry) => entry.action === withdrawalAction).reduce((sum, entry) => sum + entry.quantity, 0) : 0;

  const getActionColor = (action) => {
    if (action === depositAction) return T.green;
    if (withdrawalAction && action === withdrawalAction) return T.red;
    return T.amber;
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Database} title="CLAN TREASURY" color={T.amber}>
        <ActionBtn color={T.amber} onClick={() => setShowForm(!showForm)}>
          <Plus size={10} /> LOG TRANSACTION
        </ActionBtn>
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TOTAL IN</div>
          <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{totalDeposits}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TOTAL OUT</div>
          <div style={{ color: T.red, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{totalWithdrawals}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>UNIQUE ITEMS</div>
          <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{stock.length}</div>
        </div>
      </div>

      {stock.length > 0 && (
        <Panel title="CURRENT STOCK" titleColor={T.green}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
            {stock.map((item) => (
              <div key={item.item} className="border px-3 py-2 flex items-center justify-between" style={{ borderColor: T.border, background: T.bg0 }}>
                <div>
                  <div style={{ color: T.text, fontSize: "11px" }}>{item.item}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>{item.category}</div>
                </div>
                <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "16px" }}>{item.total}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {showForm && (
        <FormPanel title="LOG TRANSACTION" titleColor={T.amber} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ITEM NAME *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {categories.filter((category) => category.toLowerCase() !== "all").map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="QTY">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
            </Field>
            <Field label="ACTION">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })}>
                {actions.map((action) => (
                  <option key={action}>{action}</option>
                ))}
              </select>
            </Field>
            <Field label="REASON">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Optional reason" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>
              CANCEL
            </ActionBtn>
            <ActionBtn color={T.amber} onClick={handleSave} disabled={!form.item_name}>
              LOG
            </ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {actionFilters.map((action) => (
            <FilterPill key={action} label={action} active={actionFilter === action} color={getActionColor(action)} onClick={() => setActionFilter(action)} />
          ))}
        </div>
        <div className="flex gap-1">
          {categories.slice(0, 7).map((category) => (
            <FilterPill key={category} label={category} active={filter === category} color={T.amber} onClick={() => setFilter(category)} />
          ))}
        </div>
      </div>

      <Panel title={`TRANSACTION LOG (${filtered.length})`} titleColor={T.amber}>
        <TableHeader columns={["ITEM", "CAT", "QTY", "ACTION", "BY", "REASON", "DATE"]} style={{ gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1.5fr 2fr 1fr" }} />
        {filtered.length === 0 ? (
          <EmptyState message="NO TRANSACTIONS LOGGED" />
        ) : (
          filtered.map((entry) => (
            <TableRow key={entry.id} style={{ gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1.5fr 2fr 1fr" }}>
              <span style={{ color: T.text, fontSize: "11px" }}>{entry.item_name}</span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{entry.category}</span>
              <span style={{ color: T.cyan, fontSize: "10px" }}>{entry.quantity}</span>
              <span style={{ color: getActionColor(entry.action), fontSize: "10px" }}>
                {entry.action === depositAction ? "↑" : "↓"} {entry.action}
              </span>
              <span style={{ color: T.amber, fontSize: "10px" }}>{entry.contributor_callsign || entry.contributor_email}</span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{entry.reason || "—"}</span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{entry.created_date?.slice(0, 10)}</span>
            </TableRow>
          ))
        )}
      </Panel>
    </div>
  );
}
