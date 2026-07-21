import { useState, useEffect, useCallback } from "react";
import api from "../services/authService";
import Swal from "sweetalert2";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

const fmtMoney = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    v ?? 0
  );

function calcMonths(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(m, 1);
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
export function CountdownTimer({ expiryTime, onExpired }) {
  const [remaining, setRemaining] = useState(0);

  const computeRemaining = useCallback(() => {
    const diff = Math.max(0, new Date(expiryTime) - Date.now());
    setRemaining(Math.floor(diff / 1000));
  }, [expiryTime]);

  useEffect(() => {
    computeRemaining();
    const id = setInterval(() => {
      computeRemaining();
    }, 1000);
    return () => clearInterval(id);
  }, [computeRemaining]);

  useEffect(() => {
    if (remaining === 0 && onExpired) {
      onExpired();
    }
  }, [remaining, onExpired]);

  if (remaining <= 0)
    return (
      <span style={expiredStyle}>
        <span>⏰</span> Reservation Expired
      </span>
    );

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div style={timerWrapStyle}>
      <div style={timerUnitStyle}>
        <span style={timerDigitStyle}>{pad(hours)}</span>
        <span style={timerLabelStyle}>Hrs</span>
      </div>
      <span style={timerColonStyle}>:</span>
      <div style={timerUnitStyle}>
        <span style={timerDigitStyle}>{pad(minutes)}</span>
        <span style={timerLabelStyle}>Min</span>
      </div>
      <span style={timerColonStyle}>:</span>
      <div style={timerUnitStyle}>
        <span style={timerDigitStyle}>{pad(seconds)}</span>
        <span style={timerLabelStyle}>Sec</span>
      </div>
    </div>
  );
}

// ─── Reservation Panel (shown inside the property details modal) ──────────────
export default function ReservationPanel({ property, onReservationCreated, onRentNow }) {
  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalMonths = calcMonths(startDate, endDate);
  const monthlyRent = parseFloat(property?.price ?? 0);
  const totalAmount = monthlyRent * totalMonths;

  const handleReserve = async () => {
    if (!startDate || !endDate) {
      Swal.fire("Missing Dates", "Please select both start and end dates.", "warning");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      Swal.fire("Invalid Dates", "End date must be after start date.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Reservation",
      html: `
        <div style="text-align:left;padding:4px 0">
          <p style="margin:0 0 8px"><strong>Property:</strong> ${property.title}</p>
          <p style="margin:0 0 8px"><strong>Period:</strong> ${fmt(startDate)} – ${fmt(endDate)}</p>
          <p style="margin:0 0 8px"><strong>Duration:</strong> ${totalMonths} month${totalMonths !== 1 ? "s" : ""}</p>
          <p style="margin:0 0 8px"><strong>Monthly Rent:</strong> ${fmtMoney(monthlyRent)}</p>
          <p style="margin:0;font-size:1.1em"><strong>Total Amount:</strong> <span style="color:#2563eb">${fmtMoney(totalAmount)}</span></p>
          <hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb"/>
          <p style="margin:0;font-size:0.85em;color:#6b7280">
            🔒 Your reservation holds this property for <strong>24 hours</strong>.<br>
            No payment is collected now.
          </p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: "🏷️ Reserve for 24 Hours",
      confirmButtonColor: "#2563eb",
      cancelButtonText: "Go Back",
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await api.post("/api/reservation/", {
        property_id: property.id,
        start_date: startDate,
        end_date: endDate,
      });
      Swal.fire({
        title: "🎉 Reserved!",
        html: `Your reservation for <strong>${property.title}</strong> is confirmed.<br>
               You have <strong>24 hours</strong> to complete payment.`,
        icon: "success",
        confirmButtonColor: "#2563eb",
      });
      if (onReservationCreated) onReservationCreated(res.data);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Failed to create reservation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Property not available
  const isReserved = property?.status === "Reserved";
  const isOccupied = property?.status === "Occupied" || !property?.is_available;

  if (isReserved) {
    return (
      <div style={statusBannerStyle("#fef3c7", "#92400e", "#fde68a")}>
        <span style={{ fontSize: "1.3rem" }}>🔒</span>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Currently Reserved</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            This property is reserved by another customer. Check back later.
          </div>
        </div>
      </div>
    );
  }

  if (isOccupied) {
    return (
      <div style={statusBannerStyle("#fee2e2", "#7f1d1d", "#fecaca")}>
        <span style={{ fontSize: "1.3rem" }}>🚫</span>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Currently Occupied</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            This property is not available for rent at this time.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={panelHeaderStyle}>
        <div style={panelIconStyle}>🏷️</div>
        <div>
          <div style={panelTitleStyle}>Rent This Property</div>
          <div style={panelSubStyle}>Reserve for 24 hours, pay later</div>
        </div>
      </div>

      {/* Date Inputs */}
      <div style={dateGridStyle}>
        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        <div style={fieldGroupStyle}>
          <label style={fieldLabelStyle}>End Date</label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      </div>

      {/* Summary */}
      {startDate && endDate && totalMonths > 0 && (
        <div style={summaryStyle}>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Monthly Rent</span>
            <span style={summaryValueStyle}>{fmtMoney(monthlyRent)}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryLabelStyle}>Duration</span>
            <span style={summaryValueStyle}>
              {totalMonths} month{totalMonths !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.3)", margin: "8px 0" }} />
          <div style={{ ...summaryRowStyle }}>
            <span style={{ ...summaryLabelStyle, fontWeight: 700, fontSize: "0.95rem" }}>
              Total Amount
            </span>
            <span style={{ ...summaryValueStyle, fontWeight: 800, fontSize: "1.1rem" }}>
              {fmtMoney(totalAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Reserve Button */}
      <button
        onClick={handleReserve}
        disabled={submitting || !startDate || !endDate || totalMonths < 1}
        style={reserveBtnStyle(submitting || !startDate || !endDate)}
      >
        {submitting ? (
          <>
            <span style={spinnerStyle} /> Reserving…
          </>
        ) : (
          <>
            <span>🏷️</span>
            Reserve for 24 Hours
          </>
        )}
      </button>

      {/* Pay Now Button */}
      <button
        onClick={async () => {
          if (!startDate || !endDate) {
            Swal.fire("Missing Dates", "Please select both start and end dates.", "warning");
            return;
          }
          if (new Date(endDate) <= new Date(startDate)) {
            Swal.fire("Invalid Dates", "End date must be after start date.", "warning");
            return;
          }

          setSubmitting(true);
          try {
            const res = await api.post("/api/reservation/", {
              property_id: property.id,
              start_date: startDate,
              end_date: endDate,
            });
            if (onRentNow) onRentNow(res.data);
          } catch (err) {
            Swal.fire("Error", err.response?.data?.error || "Failed to process.", "error");
          } finally {
            setSubmitting(false);
          }
        }}
        disabled={submitting || !startDate || !endDate || totalMonths < 1}
        style={payNowBtnStyle(submitting || !startDate || !endDate)}
      >
        {submitting ? (
          <>
            <span style={spinnerStyle} /> Processing…
          </>
        ) : (
          <>
            <span>💳</span>
            Pay Now
          </>
        )}
      </button>

      <p style={disclaimerStyle}>
        🔒 No payment now. Your reservation holds the property for 24 hours.
      </p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const panelStyle = {
  background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
  border: "1.5px solid #bfdbfe",
  borderRadius: "16px",
  padding: "20px",
  marginTop: "20px",
};
const panelHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
};
const panelIconStyle = {
  fontSize: "1.6rem",
  width: "44px",
  height: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dbeafe",
  borderRadius: "12px",
  flexShrink: 0,
};
const panelTitleStyle = {
  fontWeight: 800,
  fontSize: "1rem",
  color: "#1e3a5f",
};
const panelSubStyle = {
  fontSize: "0.78rem",
  color: "#3b82f6",
  fontWeight: 500,
};
const dateGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "14px",
};
const fieldGroupStyle = { display: "flex", flexDirection: "column" };
const fieldLabelStyle = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "5px",
};
const dateInputStyle = {
  padding: "9px 12px",
  border: "1.5px solid #bfdbfe",
  borderRadius: "10px",
  fontSize: "0.9rem",
  background: "#fff",
  color: "#1f2937",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const summaryStyle = {
  background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
  borderRadius: "12px",
  padding: "14px 16px",
  marginBottom: "14px",
  color: "#fff",
};
const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "6px",
};
const summaryLabelStyle = { fontSize: "0.85rem", opacity: 0.85 };
const summaryValueStyle = { fontWeight: 700, fontSize: "0.9rem" };
const reserveBtnStyle = (disabled) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  padding: "13px 20px",
  background: disabled
    ? "#e5e7eb"
    : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: disabled ? "#9ca3af" : "#fff",
  border: "none",
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.25s",
  boxShadow: disabled ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
  letterSpacing: "0.01em",
});
const payNowBtnStyle = (disabled) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  padding: "13px 20px",
  marginTop: "10px",
  background: disabled
    ? "#e5e7eb"
    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: disabled ? "#9ca3af" : "#fff",
  border: "none",
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "0.95rem",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.25s",
  boxShadow: disabled ? "none" : "0 4px 14px rgba(16,185,129,0.35)",
  letterSpacing: "0.01em",
});
const disclaimerStyle = {
  textAlign: "center",
  fontSize: "0.75rem",
  color: "#6b7280",
  margin: "10px 0 0",
};
const spinnerStyle = {
  display: "inline-block",
  width: "14px",
  height: "14px",
  border: "2px solid rgba(255,255,255,0.4)",
  borderTop: "2px solid #fff",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
const expiredStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "#dc2626",
  fontWeight: 700,
  fontSize: "0.9rem",
};
const timerWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  justifyContent: "center",
};
const timerUnitStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const timerDigitStyle = {
  fontFamily: "monospace",
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "#1e3a5f",
  background: "#dbeafe",
  borderRadius: "8px",
  padding: "4px 10px",
  minWidth: "48px",
  textAlign: "center",
};
const timerLabelStyle = {
  fontSize: "0.65rem",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginTop: "3px",
};
const timerColonStyle = {
  fontSize: "1.4rem",
  fontWeight: 800,
  color: "#93c5fd",
  marginBottom: "14px",
};
const statusBannerStyle = (bg, color, border) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "16px",
  background: bg,
  border: `1.5px solid ${border}`,
  borderRadius: "12px",
  color,
  marginTop: "16px",
});
