import { useState } from "react";
import { T, Panel, ActionBtn, StatusBadge } from "@/components/ui/TerminalCard";

export default function ListingCard({ listing, onSelect, showActions, onMakeOffer }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeColor = listing.listing_type === "trade" ? T.amber : T.green;
  const statusColor = listing.status === "available" ? T.green : listing.status === "pending_trade" ? T.amber : T.textFaint;

  return (
    <Panel
      title={`${listing.item_name.toUpperCase()} × ${listing.quantity}`}
      titleColor={typeColor}
      accentBorder={typeColor}
    >
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge label={listing.resource_type.toUpperCase()} color={T.cyan} />
            <StatusBadge label={listing.status} color={statusColor} />
          </div>
          <div style={{ color: T.textFaint, fontSize: "8px" }}>
            {listing.base_id}
          </div>
        </div>

        {/* Lister info */}
        <div style={{ color: T.textDim, fontSize: "9px" }}>
          Listed by: <span style={{ color: T.text }}>{listing.lister_email}</span>
        </div>

        {/* Notes if present */}
        {listing.notes && (
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px", fontSize: "8px", color: T.textFaint, borderLeft: `2px solid ${T.borderBt}` }}>
            {listing.notes}
          </div>
        )}

        {/* Desired items for trade listings */}
        {listing.listing_type === "trade" && listing.desired_items?.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "4px" }}>DESIRED ITEMS:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {listing.desired_items.map((item, idx) => (
                <div key={idx} style={{ color: T.textDim, fontSize: "8px" }}>
                  • {item.item_name} × {item.quantity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && listing.status === "available" && (
          <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: T.border }}>
            <ActionBtn
              color={typeColor}
              small
              onClick={() => onMakeOffer(listing)}
            >
              {listing.listing_type === "trade" ? "PROPOSE TRADE" : "REQUEST"}
            </ActionBtn>
            {onSelect && (
              <ActionBtn
                color={T.textFaint}
                small
                onClick={() => onSelect(listing)}
              >
                VIEW
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}