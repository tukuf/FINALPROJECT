import { useState, useEffect, useCallback } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import { Link } from "react-router-dom";
import { CountdownTimer } from "../components/ReservationModal";
import PaymentModal from "../components/PaymentModal";

const API_BASE_URL = "http://localhost:8000";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

const fmtMoney = (v) => "TZS " + Number(v ?? 0).toLocaleString();

const getImageUrl = (img) => {
  if (!img) return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop";
  if (img.startsWith("http")) return img;
  return `${API_BASE_URL}${img.startsWith("/") ? img : `/${img}`}`;
};

// ─── Tab constants ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "reserved", label: "Reserved Properties", icon: "🏷️" },
  { id: "active", label: "Active Rentals", icon: "🏠" },
  { id: "history", label: "Rental History", icon: "📋" },
];

// ─── ReservationCard ──────────────────────────────────────────────────────────
function ReservationCard({ reservation, onCancelled, onPayNow }) {
  const prop = reservation.property;

  const handleCancel = async () => {
    const result = await import("sweetalert2").then((s) =>
      s.default.fire({
        title: "Cancel Reservation?",
        text: `Are you sure you want to cancel your reservation for "${prop.title}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Cancel It",
        confirmButtonColor: "#dc2626",
        cancelButtonText: "Keep Reservation",
      })
    );
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/reservation/${reservation.id}/`);
      if (onCancelled) onCancelled(reservation.id);
      import("sweetalert2").then((s) =>
        s.default.fire({ title: "Cancelled", text: "Your reservation has been cancelled.", icon: "success", timer: 1800, showConfirmButton: false })
      );
    } catch (err) {
      import("sweetalert2").then((s) =>
        s.default.fire("Error", err.response?.data?.error || "Failed to cancel.", "error")
      );
    }
  };

  const statusConfig = {
    RESERVED: { bg: "#fef3c7", color: "#92400e", border: "#fde68a", label: "🏷️ Reserved" },
    PENDING_PAYMENT: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", label: "💳 Pending Payment" },
    PAYMENT_PROCESSING: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "⏳ Waiting for Payment" },
    PENDING_APPROVAL: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", label: "✅ Paid - Pending Approval" },
    EXPIRED: { bg: "#fee2e2", color: "#7f1d1d", border: "#fecaca", label: "⏰ Expired" },
    CANCELLED: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db", label: "❌ Cancelled" },
  };

  const sc = statusConfig[reservation.reservation_status] || statusConfig.RESERVED;
  const canPay = ["RESERVED", "PENDING_PAYMENT", "PAYMENT_PROCESSING"].includes(
    reservation.reservation_status
  );
  const canCancel = ["RESERVED", "PENDING_PAYMENT"].includes(
    reservation.reservation_status
  );

  return (
    <div style={cardWrap}>
      {/* Image */}
      <div style={cardImgWrap}>
        <img src={getImageUrl(prop?.image)} alt={prop?.title} style={cardImg} loading="lazy" />
        <div style={{ position: "absolute", top: 10, left: 10, ...statusPillStyle(sc.bg, sc.color, sc.border) }}>
          {sc.label}
        </div>
      </div>

      {/* Body */}
      <div style={cardBody}>
        <h3 style={cardTitle}>{prop?.title}</h3>
        <div style={cardLocation}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {prop?.location}
        </div>

        {/* Rental Info */}
        <div style={infoGrid}>
          <InfoCell label="Start Date" value={fmt(reservation.start_date)} />
          <InfoCell label="End Date" value={fmt(reservation.end_date)} />
          <InfoCell label="Monthly" value={fmtMoney(reservation.monthly_price)} />
          <InfoCell label="Duration" value={`${reservation.total_months} mo`} />
        </div>

        {/* Total */}
        <div style={totalRow}>
          <span style={totalLabel}>Total Amount</span>
          <span style={totalValue}>{fmtMoney(reservation.total_amount)}</span>
        </div>

        {/* Countdown / Expiry info */}
        {canPay && (
          <div style={timerBox}>
            <div style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
              ⏳ Reservation expires in
            </div>
            <CountdownTimer
              expiryTime={reservation.expiry_time}
              onExpired={() => {
                if (onCancelled) onCancelled(reservation.id, true);
              }}
            />
            <div style={{ textAlign: "center", marginTop: 6, fontSize: "0.75rem", color: "#6b7280" }}>
              Reserved until: <strong>{fmt(reservation.expiry_time)}</strong>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div style={btnRow}>
          {canPay && (
            <>
              <button
                style={payNowBtn}
                onClick={() => {
                  if (onPayNow) onPayNow(reservation);
                }}
              >
                {reservation.reservation_status === "PAYMENT_PROCESSING"
                  ? "Check / Retry Payment"
                  : "💳 Pay Now"}
              </button>
              {canCancel && (
                <button style={cancelBtn} onClick={handleCancel}>
                  ✕ Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div style={infoCellStyle}>
      <div style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1f2937" }}>{value}</div>
    </div>
  );
}

// ─── RentalCard for active rentals (approved requests / signed contracts) ─────
function RentalCard({ rental, type }) {
  const prop = type === "contract" ? rental.property : rental.property;
  const startDate = rental.start_date;
  const endDate = rental.end_date;

  return (
    <div style={cardWrap}>
      <div style={cardImgWrap}>
        <img src={getImageUrl(prop?.image)} alt={prop?.title} style={cardImg} loading="lazy" />
        <div style={{ position: "absolute", top: 10, left: 10, ...statusPillStyle("#dcfce7", "#14532d", "#bbf7d0") }}>
          {type === "contract" ? "📄 Contract" : "✅ Approved"}
        </div>
      </div>
      <div style={cardBody}>
        <h3 style={cardTitle}>{prop?.title}</h3>
        <div style={cardLocation}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {prop?.location}
        </div>
        <div style={infoGrid}>
          <InfoCell label="Start Date" value={fmt(startDate)} />
          <InfoCell label="End Date" value={fmt(endDate)} />
          {rental.rent_amount && <InfoCell label="Monthly" value={fmtMoney(rental.rent_amount)} />}
          {type === "contract" && (
            <InfoCell label="Status" value={rental.status === "SIGNED" ? "✅ Signed" : "📤 Sent"} />
          )}
        </div>
        {type === "contract" && (
          <Link to="/Customercontracts" style={{ ...payLaterBtn, textDecoration: "none", marginTop: 12 }}>
            View Contract
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function MyRentals() {
  const [activeTab, setActiveTab] = useState("reserved");
  const [reservations, setReservations] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Trigger expiry check first
      await api.post("/api/reservation/check-expiry/").catch(() => {});

      const [reservRes, contractRes, requestRes] = await Promise.all([
        api.get("/api/reservation/"),
        api.get("/api/contract/"),
        api.get("/api/rental_request/"),
      ]);

      setReservations(reservRes.data);

      // Active rentals = signed contracts + approved requests
      const signedContracts = contractRes.data.filter(
        (c) => c.status === "SIGNED" || c.status === "SENT"
      );
      const approvedRequests = requestRes.data.filter((r) => r.status === "APPROVED");
      setActiveRentals([
        ...signedContracts.map((c) => ({ ...c, _type: "contract" })),
        ...approvedRequests.map((r) => ({ ...r, _type: "request" })),
      ]);

      // Rental history = expired/cancelled reservations + rejected requests
      const historyItems = [
        ...reservRes.data.filter((r) =>
          ["EXPIRED", "CANCELLED"].includes(r.reservation_status)
        ),
        ...requestRes.data.filter((r) =>
          ["REJECTED"].includes(r.status)
        ).map((r) => ({ ...r, _isRequest: true })),
      ];
      setHistory(historyItems);
    } catch (err) {
      console.error("Error fetching My Rentals data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll for expiry updates every 60s
    const poll = setInterval(() => {
      api.post("/api/reservation/check-expiry/").catch(() => {});
      api.get("/api/reservation/").then((res) => setReservations(res.data)).catch(() => {});
    }, 60000);
    return () => clearInterval(poll);
  }, [fetchData]);

  const handleCancelled = (id, wasExpired = false) => {
    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, reservation_status: wasExpired ? "EXPIRED" : "CANCELLED" }
          : r
      )
    );
  };

  const handlePaymentSuccess = () => {
    setSelectedReservation(null);
    fetchData();
  };

  // Filtered sets
  const activeReservations = reservations.filter(
    (r) => ["RESERVED", "PENDING_PAYMENT", "PAYMENT_PROCESSING"].includes(r.reservation_status)
  );
  const historyReservations = reservations.filter((r) =>
    ["EXPIRED", "CANCELLED"].includes(r.reservation_status)
  );

  // Counts for tab badges
  const tabCounts = {
    reserved: activeReservations.length,
    active: activeRentals.length,
    history: history.length,
  };

  return (
    <MainLayout role="CLIENT">
      <div className="page-container">
        {/* Page Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: 32 }}>
          <h1 className="section-title">My Rentals</h1>
          <p className="section-subtitle">
            Track your reservations, active rentals, and rental history.
          </p>
        </div>

        {/* Tabs */}
        <div style={tabBarStyle}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={tabBtnStyle(activeTab === tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span style={tabBadge(activeTab === tab.id)}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={skeletonGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 360, borderRadius: 16 }} />
            ))}
          </div>
        ) : (
          <>
            {/* Reserved Properties Tab */}
            {activeTab === "reserved" && (
              <div>
                {activeReservations.length === 0 ? (
                  <EmptyState
                    icon="🏷️"
                    title="No Active Reservations"
                    desc="Reserve a property from the Browse Properties page."
                    link="/properties"
                    linkText="Browse Properties"
                  />
                ) : (
                  <div style={cardsGrid}>
                    {activeReservations.map((r) => (
                      <ReservationCard
                        key={r.id}
                        reservation={r}
                        onCancelled={handleCancelled}
                        onPayNow={(res) => setSelectedReservation(res)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Rentals Tab */}
            {activeTab === "active" && (
              <div>
                {activeRentals.length === 0 ? (
                  <EmptyState
                    icon="🏠"
                    title="No Active Rentals"
                    desc="You don't have any active rental agreements yet."
                    link="/properties"
                    linkText="Find a Property"
                  />
                ) : (
                  <div style={cardsGrid}>
                    {activeRentals.map((r) => (
                      <RentalCard key={r.id} rental={r} type={r._type} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <div>
                {history.length === 0 ? (
                  <EmptyState
                    icon="📋"
                    title="No Rental History"
                    desc="Your completed or expired reservations will appear here."
                  />
                ) : (
                  <div style={cardsGrid}>
                    {historyReservations.map((r) => (
                      <ReservationCard key={r.id} reservation={r} onCancelled={() => {}} />
                    ))}
                    {history
                      .filter((h) => h._isRequest)
                      .map((r) => (
                        <div key={r.id} style={cardWrap}>
                          <div style={cardBody}>
                            <div style={{ ...statusPillStyle("#fee2e2", "#7f1d1d", "#fecaca"), marginBottom: 10, display: "inline-flex" }}>
                              ❌ Rental Request Rejected
                            </div>
                            <h3 style={cardTitle}>{r.property?.title}</h3>
                            <div style={cardLocation}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {r.property?.location}
                            </div>
                            <div style={infoGrid}>
                              <InfoCell label="Requested" value={fmt(r.created_at)} />
                              <InfoCell label="Status" value="Rejected" />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal Overlay */}
      {selectedReservation && (
        <PaymentModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </MainLayout>
  );
}

function EmptyState({ icon, title, desc, link, linkText }) {
  return (
    <div style={emptyStyle}>
      <div style={emptyIconStyle}>{icon}</div>
      <h3 style={{ color: "var(--gray-700)", marginBottom: 8 }}>{title}</h3>
      <p style={{ color: "var(--gray-500)", fontSize: "0.95rem", marginBottom: link ? 20 : 0 }}>
        {desc}
      </p>
      {link && (
        <Link to={link} style={emptyLinkBtn}>
          {linkText}
        </Link>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tabBarStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "28px",
  borderBottom: "2px solid var(--gray-100)",
  paddingBottom: "0",
  overflowX: "auto",
  flexWrap: "nowrap",
};

const tabBtnStyle = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 20px",
  borderRadius: "10px 10px 0 0",
  border: "none",
  background: active
    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
    : "transparent",
  color: active ? "#fff" : "var(--gray-500)",
  fontWeight: active ? 700 : 500,
  fontSize: "0.88rem",
  cursor: "pointer",
  transition: "all 0.2s",
  whiteSpace: "nowrap",
  borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
  marginBottom: "-2px",
});

const tabBadge = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  background: active ? "rgba(255,255,255,0.25)" : "#dbeafe",
  color: active ? "#fff" : "#1d4ed8",
  fontSize: "0.7rem",
  fontWeight: 800,
});

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: "24px",
};

const skeletonGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: "24px",
};

const cardWrap = {
  background: "#fff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
  border: "1px solid var(--gray-100)",
  display: "flex",
  flexDirection: "column",
  transition: "all 0.3s",
};

const cardImgWrap = {
  position: "relative",
  height: "180px",
  overflow: "hidden",
  flexShrink: 0,
};

const cardImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const cardBody = { padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1 };
const cardTitle = { fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 800, color: "#111827", margin: "0 0 6px" };
const cardLocation = { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.83rem", color: "var(--gray-500)", marginBottom: "14px" };

const infoGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" };
const infoCellStyle = { background: "#f9fafb", borderRadius: "8px", padding: "8px 10px", border: "1px solid #e5e7eb" };

const totalRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "linear-gradient(135deg, #eff6ff, #f0fdf4)", borderRadius: "10px", border: "1px solid #bfdbfe", marginBottom: "12px" };
const totalLabel = { fontSize: "0.82rem", fontWeight: 600, color: "#374151" };
const totalValue = { fontSize: "1.1rem", fontWeight: 800, color: "#2563eb" };

const timerBox = {
  background: "#f8faff",
  border: "1.5px solid #bfdbfe",
  borderRadius: "12px",
  padding: "14px 12px",
  marginBottom: "14px",
};

const btnRow = { display: "flex", gap: "8px", marginTop: "auto", paddingTop: "10px" };

const payNowBtn = {
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "10px 16px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "0.88rem",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: "0 4px 10px rgba(16,185,129,0.25)",
};

const payLaterBtn = {
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "10px 16px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "0.88rem",
  cursor: "pointer",
  textDecoration: "none",
  transition: "all 0.2s",
};

const cancelBtn = {
  padding: "10px 14px",
  background: "#fee2e2",
  color: "#dc2626",
  border: "1.5px solid #fecaca",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
  transition: "all 0.2s",
};

const statusPillStyle = (bg, color, border) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  background: bg,
  color,
  border: `1px solid ${border}`,
  borderRadius: "999px",
  fontSize: "0.72rem",
  fontWeight: 700,
});

const emptyStyle = {
  textAlign: "center",
  padding: "64px 20px",
  color: "var(--gray-500)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const emptyIconStyle = { fontSize: "3rem", marginBottom: "16px" };
const emptyLinkBtn = {
  display: "inline-flex",
  alignItems: "center",
  padding: "11px 24px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "0.9rem",
  textDecoration: "none",
  boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
};

export default MyRentals;
