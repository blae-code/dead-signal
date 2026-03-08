import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { T, PageHeader, ActionBtn } from "@/components/ui/TerminalCard";
import { Radio } from "lucide-react";
import ListingCard from "@/components/trading/ListingCard";
import CreateListingModal from "@/components/trading/CreateListingModal";
import ListingDetailModal from "@/components/trading/ListingDetailModal";

export default function ResourceTradingHub() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, trade, donation

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    fetchUser();
  }, []);

  // Fetch listings
  const { data: listings = [], refetch: refetchListings } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.ResourceListing.list(),
  });

  // Filter listings
  const filteredListings = filterType === "all" 
    ? listings 
    : listings.filter(l => l.listing_type === filterType);

  const availableListings = filteredListings.filter(l => l.status === "available");
  const activeListings = filteredListings.filter(l => l.lister_email === user?.email && l.status !== "completed");

  const handleListingCreated = () => {
    setShowCreateModal(false);
    refetchListings();
  };

  return (
    <div className="p-4 space-y-4" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <PageHeader icon={Radio} title="RESOURCE TRADING HUB" color={T.amber}>
        <ActionBtn color={T.green} onClick={() => setShowCreateModal(true)}>
          + NEW LISTING
        </ActionBtn>
      </PageHeader>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {["all", "trade", "donation"].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className="px-3 py-1 text-xs border transition-all"
            style={{
              borderColor: filterType === type ? T.amber : T.border,
              color: filterType === type ? T.amber : T.textFaint,
              background: filterType === type ? `${T.amber}18` : "transparent",
              boxShadow: filterType === type ? `0 0 8px ${T.amber}33` : "none",
              fontFamily: "'Share Tech Mono', monospace",
            }}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Available listings (left, wider) */}
        <div className="lg:col-span-2 space-y-3">
          <div style={{ color: T.amber, fontSize: "10px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>
            AVAILABLE LISTINGS ({availableListings.length})
          </div>
          {availableListings.length === 0 ? (
            <div style={{ color: T.textFaint, fontSize: "9px", padding: "16px", textAlign: "center" }}>
              // NO LISTINGS AVAILABLE
            </div>
          ) : (
            <div className="space-y-2">
              {availableListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  showActions={true}
                  onSelect={() => setSelectedListing(listing)}
                  onMakeOffer={() => setSelectedListing(listing)}
                />
              ))}
            </div>
          )}
        </div>

        {/* User's active listings (right) */}
        <div className="space-y-3">
          <div style={{ color: T.green, fontSize: "10px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>
            YOUR LISTINGS ({activeListings.length})
          </div>
          {activeListings.length === 0 ? (
            <div style={{ color: T.textFaint, fontSize: "9px", padding: "16px", textAlign: "center" }}>
              // NO ACTIVE LISTINGS
            </div>
          ) : (
            <div className="space-y-2">
              {activeListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  showActions={false}
                  onSelect={() => setSelectedListing(listing)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateListingModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleListingCreated}
        />
      )}

      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          user={user}
          onClose={() => setSelectedListing(null)}
          onListingUpdated={refetchListings}
        />
      )}
    </div>
  );
}