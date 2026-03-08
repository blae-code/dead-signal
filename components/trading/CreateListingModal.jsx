import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { T, FormPanel, Field, ActionBtn, inputStyle } from "@/components/ui/TerminalCard";

const RESOURCE_TYPES = ["ammo", "food", "material", "medical", "power_cell", "other"];
const BASE_IDS = ["BASE_ALPHA", "BASE_BETA", "BASE_GAMMA"]; // Would fetch dynamically in production

export default function CreateListingModal({ user, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    quantity: 1,
    resource_type: "material",
    base_id: BASE_IDS[0],
    listing_type: "donation",
    notes: "",
    desired_items: [],
  });
  const [newDesiredItem, setNewDesiredItem] = useState({ item_name: "", quantity: 1 });

  const handleAddDesiredItem = () => {
    if (newDesiredItem.item_name.trim()) {
      setFormData(prev => ({
        ...prev,
        desired_items: [...prev.desired_items, { ...newDesiredItem }],
      }));
      setNewDesiredItem({ item_name: "", quantity: 1 });
    }
  };

  const handleRemoveDesiredItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      desired_items: prev.desired_items.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim()) return;

    setIsLoading(true);
    try {
      await base44.entities.ResourceListing.create({
        ...formData,
        lister_email: user.email,
        quantity: Number(formData.quantity),
      });
      onSuccess();
    } catch (err) {
      console.error("Error creating listing:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <FormPanel
        title="CREATE NEW LISTING"
        titleColor={T.green}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="ITEM NAME">
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
              placeholder="e.g., AK-47 Ammo"
              style={inputStyle}
              className="w-full px-3 py-2 border"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="QUANTITY">
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                min="1"
                style={inputStyle}
                className="w-full px-3 py-2 border"
              />
            </Field>

            <Field label="RESOURCE TYPE">
              <select
                value={formData.resource_type}
                onChange={(e) => setFormData(prev => ({ ...prev, resource_type: e.target.value }))}
                style={inputStyle}
                className="w-full px-3 py-2 border"
              >
                {RESOURCE_TYPES.map(type => (
                  <option key={type} value={type}>{type.toUpperCase()}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="BASE LOCATION">
            <select
              value={formData.base_id}
              onChange={(e) => setFormData(prev => ({ ...prev, base_id: e.target.value }))}
              style={inputStyle}
              className="w-full px-3 py-2 border"
            >
              {BASE_IDS.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </Field>

          <Field label="LISTING TYPE">
            <div className="flex gap-2">
              {["donation", "trade"].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, listing_type: type }))}
                  className="flex-1 px-3 py-2 border transition-all text-xs"
                  style={{
                    borderColor: formData.listing_type === type ? T.green : T.border,
                    color: formData.listing_type === type ? T.green : T.textFaint,
                    background: formData.listing_type === type ? `${T.green}18` : "transparent",
                  }}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>

          {formData.listing_type === "trade" && (
            <Field label="DESIRED ITEMS (for trade)">
              <div className="space-y-2">
                {formData.desired_items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-2 py-1 border" style={{ borderColor: T.border }}>
                    <span style={{ color: T.text, fontSize: "9px" }}>
                      {item.item_name} × {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDesiredItem(idx)}
                      style={{ color: T.red, fontSize: "10px" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    value={newDesiredItem.item_name}
                    onChange={(e) => setNewDesiredItem(prev => ({ ...prev, item_name: e.target.value }))}
                    placeholder="Item name"
                    style={inputStyle}
                    className="flex-1 px-2 py-1 border"
                  />
                  <input
                    type="number"
                    value={newDesiredItem.quantity}
                    onChange={(e) => setNewDesiredItem(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                    min="1"
                    style={inputStyle}
                    className="w-20 px-2 py-1 border"
                  />
                  <button
                    type="button"
                    onClick={handleAddDesiredItem}
                    className="px-3 border"
                    style={{ borderColor: T.green, color: T.green }}
                  >
                    +
                  </button>
                </div>
              </div>
            </Field>
          )}

          <Field label="NOTES (optional)">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any conditions or details..."
              style={inputStyle}
              className="w-full px-3 py-2 border h-16"
            />
          </Field>

          <div className="flex gap-2 justify-end pt-2 border-t" style={{ borderColor: T.border }}>
            <ActionBtn color={T.textFaint} small onClick={onClose}>
              CANCEL
            </ActionBtn>
            <ActionBtn color={T.green} small onClick={handleSubmit} disabled={isLoading || !formData.item_name.trim()}>
              {isLoading ? "CREATING..." : "CREATE"}
            </ActionBtn>
          </div>
        </form>
      </FormPanel>
    </div>
  );
}