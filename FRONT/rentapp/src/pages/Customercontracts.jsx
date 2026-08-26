import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";
import jsPDF from "jspdf";

const Customercontracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      const res = await api.get("/api/contract/");
      setContracts(res.data);
    } catch (err) {
      Swal.fire("Error", "Failed to load contracts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const generatePDF = (contract) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const prop = contract.property;

    // Helper function for centered text
    const centerText = (text, y, fontSize, fontStyle = "normal", color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.setTextColor(...color);
      doc.text(text, pw / 2, y, { align: "center" });
    };

    // Draw borders (elegant double-line border)
    doc.setDrawColor(200, 180, 140); // Gold-ish color for border
    doc.setLineWidth(1.5);
    doc.rect(8, 8, pw - 16, ph - 16);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pw - 20, ph - 20);

    // Title
    centerText("HOUSE RENTAL AGREEMENT", 25, 20, "bold", [0, 0, 0]);

    // Subtitle
    const dateFormatted = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    centerText(`THIS HOUSE RENTAL AGREEMENT IS MADE AND ENTERED INTO THIS ${dateFormatted}, BY AND BETWEEN:`, 35, 8, "normal", [60, 60, 60]);

    // Top Header Boxes (Landlord & Tenant)
    let y = 42;
    doc.setDrawColor(200, 180, 140);
    doc.setLineWidth(0.5);
    doc.line(10, y, pw - 10, y);
    
    // Vertical line for columns
    doc.line(pw / 2, y, pw / 2, y + 25);
    
    // Landlord & Tenant Box content
    const boxY = y + 5;
    
    // Landlord
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("LANDLORD", pw / 4, boxY, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Name    : ${prop?.owner?.username || "RentalHub Admin"}`, 15, boxY + 8);
    doc.text(`Address : ${prop?.owner?.address || "RentalHub Office"}`, 15, boxY + 13);
    doc.text(`Phone   : ${prop?.owner?.phone || "N/A"}`, 15, boxY + 18);

    // Tenant
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TENANT", (pw / 4) * 3, boxY, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Name    : ${contract.user?.username || "N/A"}`, pw / 2 + 5, boxY + 8);
    doc.text(`Address : ${contract.user?.address || "N/A"}`, pw / 2 + 5, boxY + 13);
    doc.text(`Phone   : ${contract.user?.phone || "N/A"}`, pw / 2 + 5, boxY + 18);

    y += 25;
    doc.line(10, y, pw - 10, y);
    
    y += 8;

    // Body Text Clauses
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    
    const termsList = [
      { t: "1. Property Description", d: `The Landlord hereby agrees to rent to the Tenant the residential property located at ${prop?.location || "N/A"}, including all fixtures, appliances, and furniture currently on the premises.` },
      { t: "2. Term of Lease", d: `This rental agreement shall commence on ${contract.start_date || "N/A"}, and shall continue until ${contract.end_date || "N/A"}, unless otherwise terminated in accordance with the terms of this agreement.` },
      { t: "3. Rental Payment", d: `The monthly rent shall be TZS ${Number(prop?.price || 0).toLocaleString()}, payable on the 1st day of each month. Payment shall be made via bank transfer to the Landlord's designated account.` },
      { t: "4. Security Deposit", d: `The Tenant agrees to pay a security deposit prior to occupancy. The deposit shall cover damages beyond normal wear and tear, if any.` },
      { t: "5. Use of Property", d: `The Tenant shall use the premises solely for residential purposes and shall not sublease or assign this agreement without written consent from the Landlord.` },
      { t: "6. Maintenance and Repairs", d: `The Tenant shall keep the property clean and in good condition. The Landlord is responsible for major repairs unless damages are caused by the Tenant's negligence.` },
      { t: "7. Termination", d: `Either party may terminate this agreement by providing a 30-day written notice. Upon termination, the Tenant agrees to return the property in its original condition, excluding normal wear and tear.` },
      { t: "8. Governing Law", d: `This agreement shall be governed by and construed in accordance with the generally accepted principles of contract law in international jurisdictions.` },
      { t: "9. Miscellaneous", d: `Any amendments to this agreement must be in writing and signed by both parties. This document constitutes the entire agreement between the Landlord and the Tenant.\n\nAdditional terms: ${contract.terms || "None"}` }
    ];

    const leftMargin = 15;
    termsList.forEach(term => {
      doc.setFont("helvetica", "bold");
      doc.text(term.t, leftMargin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(term.d, pw - 30);
      doc.text(lines, leftMargin, y);
      y += (lines.length * 4) + 4;
    });

    // Signature Area
    y = ph - 55;
    doc.setFont("helvetica", "italic");
    doc.text(`Signed on this day, ${dateFormatted}.`, leftMargin, y);
    
    y += 10;
    doc.setDrawColor(200, 180, 140);
    doc.line(10, y, pw - 10, y);
    
    y += 15;
    // Signatures
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    doc.text("_________________________", pw / 4, y, { align: "center" });
    doc.text("Landlord Signature", pw / 4, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(prop?.owner?.username || "RentalHub Admin", pw / 4, y + 12, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.text("_________________________", (pw / 4) * 3, y, { align: "center" });
    doc.text("Tenant Signature", (pw / 4) * 3, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(contract.user?.username || "Tenant", (pw / 4) * 3, y + 12, { align: "center" });

    // --- PAYMENT SUCCESS STAMP ---
    const stampX = pw / 2;
    const stampY = y - 5;
    
    doc.setDrawColor(34, 197, 94); // Green
    doc.setLineWidth(0.8);
    doc.circle(stampX, stampY, 20);
    doc.setLineWidth(0.3);
    doc.circle(stampX, stampY, 18);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    
    doc.setFontSize(7);
    doc.text("RENTAL AGREEMENT", stampX, stampY - 5, { align: "center" });
    
    doc.setFontSize(9);
    doc.text("PAID", stampX, stampY + 1, { align: "center" });
    
    doc.setFontSize(7);
    doc.text("PAYMENT SUCCESSFUL", stampX, stampY + 7, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    const payRef = contract.payment_reference || "N/A";
    doc.text(`Ref: ${payRef}`, stampX, stampY + 12, { align: "center" });
    // -----------------------------

    doc.save(`RentalHub_Contract_${contract.id}_${contract.user?.username || "Client"}.pdf`);
  };

  const handleSignAndDownload = async (contract) => {
    try {
      await api.patch(`/api/contract/${contract.id}/`, { status: "SIGNED" });
      setContracts((prev) =>
        prev.map((c) => (c.id === contract.id ? { ...c, status: "SIGNED" } : c))
      );
      generatePDF({ ...contract, status: "SIGNED" });
      Swal.fire("Success", "Contract signed and downloaded", "success");
    } catch (err) {
      Swal.fire("Error", "Failed to sign contract", "error");
    }
  };

  const handleDelete = async (contract) => {
    const result = await Swal.fire({
      title: "Delete Contract?",
      text: "This contract will be permanently removed. You won't be able to revert this.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/contract/${contract.id}/`);
        setContracts((prev) => prev.filter((c) => c.id !== contract.id));
        Swal.fire("Deleted!", "Contract has been removed.", "success");
      } catch (err) {
        Swal.fire("Error", "Failed to delete contract", "error");
      }
    }
  };

  const formatPrice = (price) => {
    return "TZS " + Number(price || 0).toLocaleString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const s = new Date(start);
    const e = new Date(end);
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const days = Math.round((e - s) / (1000 * 60 * 60 * 24));
    if (months >= 1) return `${months} month${months > 1 ? "s" : ""}`;
    return `${days} day${days > 1 ? "s" : ""}`;
  };

  const styles = {
    header: {
      marginBottom: "2rem",
    },
    title: {
      fontSize: "1.75rem",
      fontWeight: "700",
      color: "var(--text-primary, #1a1a2e)",
      margin: 0,
    },
    subtitle: {
      color: "var(--text-secondary, #6b7280)",
      fontSize: "0.95rem",
      marginTop: "0.35rem",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
      gap: "1.5rem",
    },
    card: {
      background: "var(--bg-card, #ffffff)",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      display: "flex",
      flexDirection: "column",
    },
    imageWrapper: {
      position: "relative",
      width: "100%",
      height: "200px",
      overflow: "hidden",
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    imagePlaceholder: {
      width: "100%",
      height: "100%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: "2rem",
      fontWeight: "700",
    },
    badge: {
      position: "absolute",
      top: "12px",
      right: "12px",
      padding: "5px 14px",
      borderRadius: "20px",
      fontSize: "0.75rem",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    badgeSent: {
      background: "rgba(251, 191, 36, 0.9)",
      color: "#78350f",
    },
    badgeSigned: {
      background: "rgba(34, 197, 94, 0.9)",
      color: "#052e16",
    },
    cardBody: {
      padding: "1.25rem",
      flex: 1,
      display: "flex",
      flexDirection: "column",
    },
    cardTitle: {
      fontSize: "1.1rem",
      fontWeight: "700",
      color: "var(--text-primary, #1a1a2e)",
      margin: "0 0 0.25rem 0",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    cardLocation: {
      fontSize: "0.85rem",
      color: "var(--text-secondary, #6b7280)",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      marginBottom: "1rem",
    },
    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.4rem 0",
      borderBottom: "1px solid var(--border, #f3f4f6)",
    },
    detailLabel: {
      fontSize: "0.8rem",
      color: "var(--text-secondary, #6b7280)",
      fontWeight: "500",
    },
    detailValue: {
      fontSize: "0.85rem",
      color: "var(--text-primary, #1a1a2e)",
      fontWeight: "600",
    },
    priceHighlight: {
      fontSize: "1.15rem",
      fontWeight: "700",
      color: "var(--primary, #2563eb)",
    },
    cardActions: {
      padding: "0 1.25rem 1.25rem",
    },
    btnPrimary: {
      width: "100%",
      padding: "0.7rem",
      border: "none",
      borderRadius: "10px",
      background: "var(--primary, #2563eb)",
      color: "#fff",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "background 0.2s ease",
    },
    btnSecondary: {
      width: "100%",
      padding: "0.7rem",
      border: "2px solid var(--primary, #2563eb)",
      borderRadius: "10px",
      background: "transparent",
      color: "var(--primary, #2563eb)",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "all 0.2s ease",
    },
    btnDanger: {
      width: "100%",
      padding: "0.7rem",
      border: "none",
      borderRadius: "10px",
      background: "#ef4444",
      color: "#fff",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "background 0.2s ease",
    },
    skeletonCard: {
      background: "var(--bg-card, #ffffff)",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    },
    skeletonImage: {
      width: "100%",
      height: "200px",
      background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    },
    skeletonBody: {
      padding: "1.25rem",
    },
    skeletonLine: {
      height: "14px",
      borderRadius: "6px",
      background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      marginBottom: "0.6rem",
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 2rem",
      textAlign: "center",
      color: "var(--text-secondary, #6b7280)",
    },
    emptyIcon: {
      fontSize: "4rem",
      marginBottom: "1rem",
      opacity: 0.5,
    },
    emptyTitle: {
      fontSize: "1.2rem",
      fontWeight: "600",
      color: "var(--text-primary, #1a1a2e)",
      marginBottom: "0.5rem",
    },
  };

  const keyframes = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;

  return (
    <MainLayout role="CLIENT">
      <style>{keyframes}</style>
      <div className="page-container">
        <div style={styles.header}>
          <h1 style={styles.title}>My Contracts</h1>
          <p style={styles.subtitle}>
            View and manage your rental agreements
          </p>
        </div>

        {loading ? (
          <div style={styles.grid}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={styles.skeletonCard}>
                <div style={styles.skeletonImage} />
                <div style={styles.skeletonBody}>
                  <div style={{ ...styles.skeletonLine, width: "75%" }} />
                  <div style={{ ...styles.skeletonLine, width: "50%" }} />
                  <div style={{ ...styles.skeletonLine, width: "90%" }} />
                  <div style={{ ...styles.skeletonLine, width: "65%" }} />
                  <div style={{ ...styles.skeletonLine, width: "80%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>&#128203;</div>
            <h3 style={styles.emptyTitle}>No Contracts Found</h3>
            <p>You don't have any rental contracts yet.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {contracts.map((contract) => {
              const isSigned = contract.status === "SIGNED";
              return (
                <div key={contract.id} style={styles.card}>
                  <div style={styles.imageWrapper}>
                    {contract.property?.image ? (
                      <img
                        src={contract.property.image}
                        alt={contract.property.title}
                        style={styles.image}
                      />
                    ) : (
                      <div style={styles.imagePlaceholder}>
                        {(contract.property?.title || "P").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      style={{
                        ...styles.badge,
                        ...(isSigned ? styles.badgeSigned : styles.badgeSent),
                      }}
                    >
                      {contract.status}
                    </span>
                  </div>

                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>
                      {contract.property?.title || "Untitled Property"}
                    </h3>
                    <div style={styles.cardLocation}>
                      &#128205; {contract.property?.location || "Location not specified"}
                    </div>

                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Rent</span>
                      <span style={styles.priceHighlight}>
                        {formatPrice(contract.rent_amount)}/mo
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Start Date</span>
                      <span style={styles.detailValue}>
                        {formatDate(contract.start_date)}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>End Date</span>
                      <span style={styles.detailValue}>
                        {formatDate(contract.end_date)}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Duration</span>
                      <span style={styles.detailValue}>
                        {calculateDuration(contract.start_date, contract.end_date)}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    {isSigned ? (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          style={{ ...styles.btnSecondary, flex: 1 }}
                          onClick={() => generatePDF(contract)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--primary, #2563eb)";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--primary, #2563eb)";
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                        <button
                          style={{ ...styles.btnDanger, flex: 1 }}
                          onClick={() => handleDelete(contract)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#dc2626";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#ef4444";
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    ) : (
                      <button
                        style={styles.btnPrimary}
                        onClick={() => handleSignAndDownload(contract)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--primary-dark, #1d4ed8)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--primary, #2563eb)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Customercontracts;
