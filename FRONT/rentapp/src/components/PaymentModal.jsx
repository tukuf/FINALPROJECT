import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/authService";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

const fmtMoney = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "TZS" }).format(
    Number(v ?? 0)
  );

const PAID_STATUSES = ["SUCCESSFUL", "PAID", "COMPLETED"];
const FAILED_STATUSES = ["FAILED", "REJECTED", "CANCELLED", "TIMEOUT"];

function normalizeTanzaniaPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00255")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = `255${digits.slice(1)}`;
  else if ((digits.startsWith("7") || digits.startsWith("6")) && digits.length === 9) digits = `255${digits}`;
  return digits;
}

function validateTanzaniaPhone(value) {
  const normalized = normalizeTanzaniaPhone(value);
  return /^255[67]\d{8}$/.test(normalized) ? normalized : "";
}

export default function PaymentModal({ reservation, onClose, onPaymentSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState("READY");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const closeTimerRef = useRef(null);

  const prop = reservation?.property;
  const normalizedPhone = useMemo(() => validateTanzaniaPhone(phoneNumber), [phoneNumber]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!reservation) return null;

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollPaymentStatus = (paymentId) => {
    stopPolling();
    let isPolling = false;  // guard against overlapping requests
    pollRef.current = window.setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await api.get(`/api/payment/verify/${paymentId}/`);
        const latest = res.data;
        setPayment(latest);

        if (PAID_STATUSES.includes(latest.payment_status)) {
          stopPolling();
          setStatus("PAID");
          setMessage("house already occupied, and the payment successful");
          if (onPaymentSuccess) onPaymentSuccess(latest);
          closeTimerRef.current = window.setTimeout(() => {
            if (onClose) onClose();
          }, 2500);
        } else if (FAILED_STATUSES.includes(latest.payment_status)) {
          stopPolling();
          setStatus("FAILED");
          setError("Payment was not completed. You can retry with the same reservation.");
        }
      } catch (err) {
        stopPolling();
        setStatus("FAILED");
        setError(err.response?.data?.error || "Could not check payment status.");
      } finally {
        isPolling = false;
      }
    }, 8000);
  };


  const handlePay = async (e) => {
    e.preventDefault();
    stopPolling();
    setError("");

    if (!normalizedPhone) {
      setError("Enter a valid Tanzanian mobile number, for example 0712345678.");
      return;
    }

    setSubmitting(true);
    setStatus("INITIATING");
    setMessage("Sending payment request to your phone...");

    try {
      const res = await api.post("/api/payment/initiate/", {
        reservation_id: reservation.id,
        payment_method: "MOBILE_MONEY",
        phone_number: normalizedPhone,
        amount: reservation.total_amount,
      });

      setPayment(res.data.payment);
      setStatus("WAITING");
      setMessage(
        "Payment prompt sent to your phone. Enter your mobile-money PIN to complete the payment."
      );
      pollPaymentStatus(res.data.payment.id);
    } catch (err) {
      setStatus("FAILED");
      setError(err.response?.data?.error || "Failed to initiate payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const canRetry = status === "FAILED" || status === "WAITING";

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Complete payment">
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close payment modal">
          ×
        </button>

        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Complete Payment</h2>
            <p style={subtitleStyle}>Secure your reservation for {prop?.title}</p>
          </div>
          <div style={statusBadgeStyle(status)}>{statusLabel(status)}</div>
        </div>

        {/* ---- SUCCESS BANNER ---- */}
        {status === "PAID" && (
          <div style={successBannerStyle}>
            <span style={successIconStyle}>&#x2705;</span>
            <div>
              <strong style={successTitleStyle}>Payment Successful!</strong>
              <p style={successBodyStyle}>
                Your payment of <strong>{fmtMoney(payment?.amount ?? reservation.total_amount)}</strong> has been received.
                Your reservation for <strong>{prop?.title}</strong> is now pending admin approval.
                You will be notified once it is confirmed.
              </p>
            </div>
            <button style={closePaidBtnStyle} onClick={onClose}>Close</button>
          </div>
        )}

        {/* ---- SUMMARY + FORM (only when not yet paid) ---- */}
        {status !== "PAID" && (
          <>
            <div style={summaryCardStyle}>
              <div style={summaryGrid}>
                <SummaryItem label="Property" value={prop?.title} />
                <SummaryItem label="Location" value={prop?.location} />
                <SummaryItem label="Monthly Rent" value={fmtMoney(reservation.monthly_price)} />
                <SummaryItem label="Duration" value={`${reservation.total_months} month(s)`} />
                <SummaryItem label="Start Date" value={fmt(reservation.start_date)} />
                <SummaryItem label="End Date" value={fmt(reservation.end_date)} />
              </div>
              <div style={totalDivider} />
              <div style={totalRow}>
                <span style={totalLabel}>Amount to Pay</span>
                <span style={totalValue}>{fmtMoney(reservation.total_amount)}</span>
              </div>
            </div>

            {(message || error) && (
              <div style={noticeStyle(error ? "error" : status === "PAID" ? "success" : "info")}>
                <strong>{error ? "Payment update" : statusLabel(status)}</strong>
                <span>{error || message}</span>
              </div>
            )}

            <form onSubmit={handlePay} style={formStyle}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Tanzanian mobile number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                  style={inputStyle(Boolean(phoneNumber) && !normalizedPhone)}
                  disabled={submitting}
                  required
                />
                <small style={hintStyle}>
                  Accepted formats include 0712345678, +255712345678, 255712345678, or 712345678.
                </small>
              </div>

              <button type="submit" disabled={submitting || status === "INITIATING"} style={payBtnStyle(submitting || status === "INITIATING")}>
                {submitting ? "Initiating..." : canRetry ? "Retry Payment" : `Pay ${fmtMoney(reservation.total_amount)}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={summaryItemStyle}>
      <span style={summaryItemLabel}>{label}</span>
      <span style={summaryItemValue}>{value || "N/A"}</span>
    </div>
  );
}

function statusLabel(status) {
  const labels = {
    READY: "Ready",
    INITIATING: "Initiating",
    WAITING: "Waiting for confirmation",
    PAID: "Payment confirmed",
    FAILED: "Retry available",
  };
  return labels[status] || "Ready";
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.72)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 20000,
  padding: "20px",
};

const modalStyle = {
  background: "#ffffff",
  borderRadius: "14px",
  width: "100%",
  maxWidth: "560px",
  padding: "24px",
  boxShadow: "0 24px 50px rgba(0,0,0,0.22)",
  position: "relative",
  zIndex: 20001,
  maxHeight: "92vh",
  overflowY: "auto",
};

const closeBtnStyle = {
  position: "absolute",
  top: "16px",
  right: "16px",
  background: "#f3f4f6",
  border: "none",
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  fontSize: "20px",
  color: "#4b5563",
  cursor: "pointer",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginRight: "36px",
  marginBottom: "20px",
};

const titleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.35rem",
  fontWeight: 800,
  color: "#111827",
  margin: "0 0 4px",
};

const subtitleStyle = {
  fontSize: "0.9rem",
  color: "#6b7280",
  margin: 0,
};

const statusBadgeStyle = (status) => {
  const colors = {
    READY: ["#f3f4f6", "#374151", "#d1d5db"],
    INITIATING: ["#eff6ff", "#1d4ed8", "#bfdbfe"],
    WAITING: ["#fff7ed", "#c2410c", "#fed7aa"],
    PAID: ["#dcfce7", "#166534", "#bbf7d0"],
    FAILED: ["#fee2e2", "#991b1b", "#fecaca"],
  }[status] || ["#f3f4f6", "#374151", "#d1d5db"];
  return {
    flexShrink: 0,
    padding: "6px 10px",
    borderRadius: "999px",
    background: colors[0],
    color: colors[1],
    border: `1px solid ${colors[2]}`,
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
  };
};

const summaryCardStyle = {
  background: "#f8fafc",
  borderRadius: "10px",
  padding: "18px",
  border: "1px solid #e2e8f0",
  marginBottom: "18px",
};

const summaryGrid = { display: "flex", flexDirection: "column", gap: "10px" };
const summaryItemStyle = { display: "flex", justifyContent: "space-between", gap: "16px" };
const summaryItemLabel = { fontSize: "0.84rem", color: "#64748b", fontWeight: 600 };
const summaryItemValue = { fontSize: "0.9rem", color: "#1e293b", fontWeight: 800, textAlign: "right" };
const totalDivider = { height: "1px", background: "#cbd5e1", margin: "14px 0" };
const totalRow = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const totalLabel = { fontSize: "1rem", fontWeight: 800, color: "#0f172a" };
const totalValue = { fontSize: "1.25rem", fontWeight: 900, color: "#2563eb" };

const noticeStyle = (type) => {
  const palette = {
    info: ["#eff6ff", "#1e40af", "#bfdbfe"],
    success: ["#ecfdf5", "#166534", "#bbf7d0"],
    error: ["#fef2f2", "#991b1b", "#fecaca"],
  }[type];
  return {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px 14px",
    borderRadius: "10px",
    background: palette[0],
    color: palette[1],
    border: `1px solid ${palette[2]}`,
    fontSize: "0.9rem",
    marginBottom: "18px",
  };
};

const referenceStyle = { color: "inherit", opacity: 0.8, overflowWrap: "anywhere" };
const formStyle = { display: "flex", flexDirection: "column", gap: "18px" };
const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = { fontSize: "0.85rem", fontWeight: 800, color: "#374151" };

const inputStyle = (invalid) => ({
  padding: "12px 14px",
  border: `1.5px solid ${invalid ? "#ef4444" : "#d1d5db"}`,
  borderRadius: "10px",
  fontSize: "1rem",
  color: "#1f2937",
  outline: "none",
});

const hintStyle = { color: "#64748b", fontSize: "0.78rem", lineHeight: 1.4 };

const payBtnStyle = (disabled) => ({
  marginTop: "4px",
  padding: "14px",
  background: disabled ? "#9ca3af" : "linear-gradient(135deg, #10b981, #059669)",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontSize: "1rem",
  fontWeight: 900,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : "0 8px 18px rgba(16,185,129,0.25)",
});

const successBannerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  padding: "28px 20px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
  border: "2px solid #6ee7b7",
  textAlign: "center",
};

const successIconStyle = {
  fontSize: "3rem",
  lineHeight: 1,
};

const successTitleStyle = {
  fontSize: "1.3rem",
  fontWeight: 900,
  color: "#065f46",
  display: "block",
  marginBottom: "8px",
};

const successBodyStyle = {
  fontSize: "0.9rem",
  color: "#047857",
  lineHeight: 1.6,
  margin: 0,
};

const closePaidBtnStyle = {
  marginTop: "8px",
  padding: "12px 32px",
  background: "#059669",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontSize: "1rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(5,150,105,0.3)",
};

