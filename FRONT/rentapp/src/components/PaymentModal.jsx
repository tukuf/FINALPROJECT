import { useState } from "react";
import api from "../services/authService";
import Swal from "sweetalert2";

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

const PAYMENT_METHODS = [
  { id: "MPESA", name: "M-Pesa", color: "#4ade80", icon: "🟢" }, // Placeholder icons
  { id: "AIRTEL", name: "Airtel Money", color: "#ef4444", icon: "🔴" },
  { id: "TIGO", name: "Tigo Pesa", color: "#3b82f6", icon: "🔵" },
  { id: "HALOPESA", name: "HaloPesa", color: "#f97316", icon: "🟠" },
];

export default function PaymentModal({ reservation, onClose, onPaymentSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MPESA");
  const [submitting, setSubmitting] = useState(false);

  const prop = reservation?.property;

  if (!reservation) return null;

  const handlePay = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      Swal.fire("Required", "Please enter your mobile money phone number.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/api/payment/initiate/", {
        reservation_id: reservation.id,
        payment_method: paymentMethod,
        phone_number: phoneNumber,
        amount: reservation.total_amount,
      });

      await Swal.fire({
        title: "Payment Initiated",
        html: `<strong>${res.data.message}</strong><br/><br/><span style="color:var(--gray-500);font-size:0.9rem;">(This is a mock UI flow. Payment recorded successfully in the system.)</span>`,
        icon: "info",
        confirmButtonColor: "#2563eb",
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(res.data.payment);
      }
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.error || "Failed to initiate payment.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose}>
          ✕
        </button>

        <h2 style={titleStyle}>Complete Payment</h2>
        <p style={subtitleStyle}>Secure your reservation for {prop?.title}</p>

        {/* Summary Card */}
        <div style={summaryCardStyle}>
          <div style={summaryGrid}>
            <SummaryItem label="Property Name" value={prop?.title} />
            <SummaryItem label="Monthly Rent" value={fmtMoney(reservation.monthly_price)} />
            <SummaryItem label="Duration" value={`${reservation.total_months} Month(s)`} />
            <SummaryItem label="Start Date" value={fmt(reservation.start_date)} />
            <SummaryItem label="End Date" value={fmt(reservation.end_date)} />
          </div>
          <div style={totalDivider} />
          <div style={totalRow}>
            <span style={totalLabel}>Total Amount to Pay</span>
            <span style={totalValue}>{fmtMoney(reservation.total_amount)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handlePay} style={formStyle}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Select Payment Method</label>
            <div style={methodsGrid}>
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.id}
                  style={methodItemStyle(paymentMethod === method.id, method.color)}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <span style={{ fontSize: "1.2rem" }}>{method.icon}</span>
                  <span style={methodNameStyle}>{method.name}</span>
                  {paymentMethod === method.id && (
                    <span style={{ marginLeft: "auto", color: method.color }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Mobile Money Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0700 000 000"
              style={inputStyle}
              required
            />
          </div>

          <button type="submit" disabled={submitting} style={payBtnStyle(submitting)}>
            {submitting ? "Processing..." : `Pay ${fmtMoney(reservation.total_amount)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={summaryItemStyle}>
      <span style={summaryItemLabel}>{label}</span>
      <span style={summaryItemValue}>{value}</span>
    </div>
  );
}

// --- Styles ---
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(17, 24, 39, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const modalStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "500px",
  padding: "28px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  position: "relative",
  animation: "fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const closeBtnStyle = {
  position: "absolute",
  top: "20px",
  right: "20px",
  background: "#f3f4f6",
  border: "none",
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  color: "#4b5563",
  cursor: "pointer",
  transition: "all 0.2s",
};

const titleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.4rem",
  fontWeight: 800,
  color: "#111827",
  margin: "0 0 4px",
};

const subtitleStyle = {
  fontSize: "0.9rem",
  color: "#6b7280",
  margin: "0 0 24px",
};

const summaryCardStyle = {
  background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid #e2e8f0",
  marginBottom: "24px",
};

const summaryGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const summaryItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const summaryItemLabel = {
  fontSize: "0.85rem",
  color: "#64748b",
  fontWeight: 500,
};

const summaryItemValue = {
  fontSize: "0.9rem",
  color: "#1e293b",
  fontWeight: 700,
  textAlign: "right",
};

const totalDivider = {
  height: "1px",
  background: "#cbd5e1",
  margin: "14px 0",
};

const totalRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const totalLabel = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#0f172a",
};

const totalValue = {
  fontSize: "1.3rem",
  fontWeight: 900,
  color: "#2563eb",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const fieldGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelStyle = {
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "#374151",
};

const inputStyle = {
  padding: "12px 16px",
  border: "1.5px solid #d1d5db",
  borderRadius: "12px",
  fontSize: "1rem",
  color: "#1f2937",
  outline: "none",
  transition: "border-color 0.2s",
};

const methodsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const methodItemStyle = (active, color) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px",
  borderRadius: "12px",
  border: active ? `2px solid ${color}` : "2px solid #e5e7eb",
  background: active ? `${color}10` : "#fff",
  cursor: "pointer",
  transition: "all 0.2s",
});

const methodNameStyle = {
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "#1f2937",
};

const payBtnStyle = (disabled) => ({
  marginTop: "10px",
  padding: "16px",
  background: disabled ? "#9ca3af" : "linear-gradient(135deg, #10b981, #059669)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "1.05rem",
  fontWeight: 800,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : "0 8px 20px rgba(16,185,129,0.3)",
  transition: "all 0.2s",
});
