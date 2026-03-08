import { T, FormPanel, Field, ActionBtn, inputStyle, selectStyle } from "@/components/ui/TerminalCard";
import { Save } from "lucide-react";

const PIN_TYPES = ["Loot Cache","Safe House","Danger Zone","Resource Node","Enemy Sighting","Clan Base","Vehicle Spawn","Objective","Horde Sighting","Rally Point","Route Waypoint","Other"];
const HORDE_DIRS = ["N","NE","E","SE","S","SW","W","NW"];

export default function PinForm({ pin, onChange, onSave, onClose, expiryHours, onExpiryChange }) {
  return (
    <FormPanel title="NEW PIN" onClose={onClose}>
      <Field label="TITLE">
        <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
          placeholder="Title..." value={pin.title} onChange={e => onChange({ title: e.target.value })} />
      </Field>
      <Field label="TYPE">
        <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
          value={pin.type} onChange={e => onChange({ type: e.target.value })}>
          {PIN_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>

      {pin.type === "Horde Sighting" && (
        <>
          <Field label="HORDE SIZE (approx)">
            <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
              placeholder="e.g. 20" value={pin.horde_size || ""} onChange={e => onChange({ horde_size: parseInt(e.target.value) || 0 })} />
          </Field>
          <Field label="MOVEMENT DIRECTION">
            <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
              value={pin.horde_direction || "N"} onChange={e => onChange({ horde_direction: e.target.value })}>
              {HORDE_DIRS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </>
      )}

      {pin.type === "Rally Point" && (
        <Field label="COUNTDOWN (minutes)">
          <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
            placeholder="e.g. 10" value={pin.rallyMins || ""} onChange={e => onChange({ rallyMins: parseInt(e.target.value) || 10 })} />
        </Field>
      )}

      <Field label="STATUS">
        <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
          value={pin.status} onChange={e => onChange({ status: e.target.value })}>
          {["Fresh","Looted","Unknown","Active","Cleared"].map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="EXPIRES IN (hours, 0 = never)">
        <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
          placeholder="0" value={expiryHours} onChange={e => onExpiryChange(e.target.value)} min={0} max={72} />
      </Field>
      <Field label="NOTES">
        <textarea className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" style={inputStyle}
          rows={2} placeholder="Notes..." value={pin.note} onChange={e => onChange({ note: e.target.value })} />
      </Field>
      <ActionBtn color={T.green} onClick={onSave}>
        <Save size={10} /> SAVE PIN
      </ActionBtn>
    </FormPanel>
  );
}