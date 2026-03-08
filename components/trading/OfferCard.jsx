import { T, Panel, StatusBadge, ActionBtn } from "@/components/ui/TerminalCard";

export default function OfferCard({ offer, listing, onAccept, onReject, isLister }) {
  const statusColor = offer.status === "pending" ? T.amber : offer.status === "accepted" ? T.green : T.red;

  return (
    <Panel
      title={`OFFER FROM ${offer.offerer_email.split("@")[0].toUpperCase()}`}
      titleColor={statusColor}
      accentBorder={statusColor}
    >
      <div className="p-3 space-y-2">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <StatusBadge label={offer.status.toUpperCase()} color={statusColor} />
          {offer.proposed_convoy_id && (
            <span style={{ color: T.olive, fontSize: "7px" }}>CONVOY {offer.proposed_convoy_id.slice(0, 8)}</span>
          )}
        </div>

        {/* Quantity requested */}
        <div style={{ color: T.textDim, fontSize: "9px" }}>
          Requested: <span style={{ color: T.text, fontWeight: "bold" }}>{offer.requested_quantity}</span> × {listing.item_name}
        </div>

        {/* Offered items for trades */}
        {listing.listing_type === "trade" && offer.offered_items?.length > 0 && (
          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "4px" }}>OFFERED IN RETURN:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {offer.offered_items.map((item, idx) => (
                <div key={idx} style={{ color: T.textDim, fontSize: "8px" }}>
                  • {item.item_name} × {item.quantity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {offer.notes && (
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px", fontSize: "8px", color: T.textFaint, borderLeft: `2px solid ${T.borderBt}` }}>
            "{offer.notes}"
          </div>
        )}

        {/* Actions */}
        {isLister && offer.status === "pending" && (
          <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: T.border }}>
            <ActionBtn
              color={T.green}
              small
              onClick={() => onAccept(offer)}
            >
              ACCEPT
            </ActionBtn>
            <ActionBtn
              color={T.red}
              small
              onClick={() => onReject(offer)}
            >
              REJECT
            </ActionBtn>
          </div>
        )}
      </div>
    </Panel>
  );
}