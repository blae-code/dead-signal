import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { T, FormPanel, Field, ActionBtn, inputStyle } from "@/components/ui/TerminalCard";
import OfferCard from "./OfferCard";

export default function ListingDetailModal({ listing, user, onClose, onListingUpdated }) {
  const [isLoading, setIsLoading] = useState(false);
  const [offerData, setOfferData] = useState({
    requested_quantity: listing.quantity,
    offered_items: [],
    notes: "",
  });
  const [newOfferedItem, setNewOfferedItem] = useState({ item_name: "", quantity: 1 });

  // Fetch offers for this listing
  const { data: offers = [], refetch: refetchOffers } = useQuery({
    queryKey: ["offers", listing.id],
    queryFn: () => base44.entities.TradeOffer.filter({ listing_id: listing.id }),
  });

  const isLister = user?.email === listing.lister_email;
  const canMakeOffer = !isLister && listing.status === "available" && user;

  const handleAddOfferedItem = () => {
    if (newOfferedItem.item_name.trim()) {
      setOfferData(prev => ({
        ...prev,
        offered_items: [...prev.offered_items, { ...newOfferedItem }],
      }));
      setNewOfferedItem({ item_name: "", quantity: 1 });
    }
  };

  const handleRemoveOfferedItem = (idx) => {
    setOfferData(prev => ({
      ...prev,
      offered_items: prev.offered_items.filter((_, i) => i !== idx),
    }));
  };

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (offerData.requested_quantity <= 0 || offerData.requested_quantity > listing.quantity) return;

    setIsLoading(true);
    try {
      await base44.entities.TradeOffer.create({
        listing_id: listing.id,
        offerer_email: user.email,
        requested_quantity: Number(offerData.requested_quantity),
        offered_items: listing.listing_type === "trade" ? offerData.offered_items : undefined,
        notes: offerData.notes,
      });
      refetchOffers();
      setOfferData({
        requested_quantity: listing.quantity,
        offered_items: [],
        notes: "",
      });
    } catch (err) {
      console.error("Error creating offer:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOffer = async (offer) => {
    setIsLoading(true);
    try {
      // Update offer status
      await base44.entities.TradeOffer.update(offer.id, { status: "accepted" });
      
      // Update listing status to pending_trade
      await base44.entities.ResourceListing.update(listing.id, { status: "pending_trade" });
      
      refetchOffers();
      onListingUpdated();
    } catch (err) {
      console.error("Error accepting offer:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectOffer = async (offer) => {
    setIsLoading(true);
    try {
      await base44.entities.TradeOffer.update(offer.id, { status: "rejected" });
      refetchOffers();
    } catch (err) {
      console.error("Error rejecting offer:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <FormPanel
          title={`${listing.item_name.toUpperCase()} × ${listing.quantity}`}
          titleColor={listing.listing_type === "trade" ? T.amber : T.green}
          onClose={onClose}
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Listing details */}
            <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderLeft: `2px solid ${T.border}` }}>
              <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "4px" }}>LISTING DETAILS</div>
              <div style={{ color: T.textDim, fontSize: "9px", lineHeight: "1.6" }}>
                <div>Type: <span style={{ color: T.text }}>{listing.listing_type.toUpperCase()}</span></div>
                <div>Category: <span style={{ color: T.text }}>{listing.resource_type.toUpperCase()}</span></div>
                <div>Location: <span style={{ color: T.text }}>{listing.base_id}</span></div>
                <div>Status: <span style={{ color: T.text }}>{listing.status.toUpperCase()}</span></div>
                {listing.notes && <div style={{ marginTop: "4px", fontStyle: "italic" }}>"{listing.notes}"</div>}
              </div>
            </div>

            {/* Desired items for trades */}
            {listing.listing_type === "trade" && listing.desired_items?.length > 0 && (
              <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderLeft: `2px solid ${T.amber}` }}>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "4px" }}>LISTER WANTS</div>
                {listing.desired_items.map((item, idx) => (
                  <div key={idx} style={{ color: T.textDim, fontSize: "9px" }}>
                    • {item.item_name} × {item.quantity}
                  </div>
                ))}
              </div>
            )}

            {/* Make an offer (if user can) */}
            {canMakeOffer && (
              <form onSubmit={handleMakeOffer} className="space-y-2 pt-2 border-t" style={{ borderColor: T.border }}>
                <div style={{ color: T.green, fontSize: "9px", letterSpacing: "0.1em" }}>MAKE AN OFFER</div>

                <Field label="QUANTITY REQUESTED">
                  <input
                    type="number"
                    value={offerData.requested_quantity}
                    onChange={(e) => setOfferData(prev => ({ ...prev, requested_quantity: Math.max(1, Number(e.target.value)) }))}
                    min="1"
                    max={listing.quantity}
                    style={inputStyle}
                    className="w-full px-3 py-2 border text-xs"
                  />
                </Field>

                {listing.listing_type === "trade" && (
                  <Field label="OFFER IN RETURN">
                    <div className="space-y-2">
                      {offerData.offered_items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-2 py-1 border text-xs" style={{ borderColor: T.border }}>
                          <span style={{ color: T.text }}>{item.item_name} × {item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOfferedItem(idx)}
                            style={{ color: T.red }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 text-xs">
                        <input
                          type="text"
                          value={newOfferedItem.item_name}
                          onChange={(e) => setNewOfferedItem(prev => ({ ...prev, item_name: e.target.value }))}
                          placeholder="Item"
                          style={inputStyle}
                          className="flex-1 px-2 py-1 border"
                        />
                        <input
                          type="number"
                          value={newOfferedItem.quantity}
                          onChange={(e) => setNewOfferedItem(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                          min="1"
                          style={inputStyle}
                          className="w-16 px-2 py-1 border"
                        />
                        <button
                          type="button"
                          onClick={handleAddOfferedItem}
                          className="px-2 border"
                          style={{ borderColor: T.green, color: T.green }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </Field>
                )}

                <Field label="NOTES">
                  <textarea
                    value={offerData.notes}
                    onChange={(e) => setOfferData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any comments..."
                    style={inputStyle}
                    className="w-full px-3 py-2 border h-12 text-xs"
                  />
                </Field>

                <div className="flex gap-2 justify-end">
                  <ActionBtn color={T.green} small onClick={handleMakeOffer} disabled={isLoading || offerData.requested_quantity <= 0}>
                    {isLoading ? "SUBMITTING..." : "SUBMIT OFFER"}
                  </ActionBtn>
                </div>
              </form>
            )}

            {/* Offers section */}
            {offers.length > 0 && (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: T.border }}>
                <div style={{ color: T.amber, fontSize: "9px", letterSpacing: "0.1em" }}>
                  OFFERS ({offers.length})
                </div>
                {offers.map(offer => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    listing={listing}
                    isLister={isLister}
                    onAccept={() => handleAcceptOffer(offer)}
                    onReject={() => handleRejectOffer(offer)}
                  />
                ))}
              </div>
            )}

            {offers.length === 0 && (
              <div style={{ color: T.textFaint, fontSize: "8px", textAlign: "center", padding: "8px" }}>
                // NO OFFERS YET
              </div>
            )}
          </div>
        </FormPanel>
      </div>
    </div>
  );
}