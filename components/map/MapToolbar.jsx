import { T, ActionBtn } from "@/components/ui/TerminalCard";
import { Plus, Radio, RadioTower, Route, Eye, EyeOff, Flame, Megaphone } from "lucide-react";

export default function MapToolbar({
  filterType, onFilterChange,
  sharing, onToggleSharing,
  placing, onTogglePlacing,
  routeMode, onToggleRoute,
  showFog, onToggleFog,
  showHeatmap, onToggleHeatmap,
  isAdmin, onBroadcast,
  pinTypes = [],
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="text-xs px-2 py-1.5 border outline-none" style={{ background: "rgba(20,15,10,0.95)", borderColor: T.border, color: T.text, fontSize: "11px", minWidth: "110px" }}
        value={filterType} onChange={e => onFilterChange(e.target.value)}>
        <option value="ALL">ALL TYPES</option>
        {pinTypes.map(t => <option key={t}>{t}</option>)}
      </select>

      <ActionBtn color={sharing ? T.green : T.textDim} onClick={onToggleSharing} small>
        {sharing ? <RadioTower size={9} /> : <Radio size={9} />}
        {sharing ? "SHARING" : "SHARE POS"}
      </ActionBtn>

      {isAdmin && (
        <ActionBtn color={placing ? T.amber : T.cyan} onClick={onTogglePlacing} small>
          <Plus size={9} /> {placing ? "CANCEL" : "DROP PIN"}
        </ActionBtn>
      )}

      <ActionBtn color={routeMode ? T.cyan : T.textDim} onClick={onToggleRoute} small>
        <Route size={9} /> {routeMode ? "ROUTING…" : "ROUTE"}
      </ActionBtn>

      <ActionBtn color={showHeatmap ? T.red : T.textDim} onClick={onToggleHeatmap} small>
        <Flame size={9} /> HEAT
      </ActionBtn>

      {isAdmin && (
        <ActionBtn color={showFog ? T.textDim : T.textFaint} onClick={onToggleFog} small>
          {showFog ? <EyeOff size={9} /> : <Eye size={9} />} FOG
        </ActionBtn>
      )}

      {isAdmin && (
        <ActionBtn color="#ff00ff" onClick={onBroadcast} small>
          <Megaphone size={9} /> BROADCAST
        </ActionBtn>
      )}
    </div>
  );
}
