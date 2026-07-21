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
    const prop = contract.property;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 60, 120);
    doc.text("RENTAL AGREEMENT", 105, 25, { align: "center" });

    doc.setDrawColor(30, 60, 120);
    doc.setLineWidth(0.8);
    doc.line(20, 30, 190, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    const leftX = 20;
    const rightX = 120;
    let y = 45;

    doc.setFont("helvetica", "bold");
    doc.text("Property Details", leftX, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Title: ${prop?.title || "N/A"}`, leftX, y);
    y += 7;
    doc.text(`Location: ${prop?.location || "N/A"}`, leftX, y);
    y += 7;
    doc.text(`Monthly Rent: ${formatPrice(contract.rent_amount)}`, leftX, y);
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.text("Contract Details", leftX, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Contract ID: #${contract.id}`, leftX, y);
    y += 7;
    doc.text(`Status: ${contract.status}`, leftX, y);
    y += 7;
    doc.text(`Start Date: ${formatDate(contract.start_date)}`, leftX, y);
    y += 7;
    doc.text(`End Date: ${formatDate(contract.end_date)}`, leftX, y);
    y += 7;
    doc.text(`Duration: ${calculateDuration(contract.start_date, contract.end_date)}`, leftX, y);
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", leftX, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const terms = contract.terms || "No specific terms provided.";
    const splitTerms = doc.splitTextToSize(terms, 170);
    doc.text(splitTerms, leftX, y);
    y += splitTerms.length * 6 + 14;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Tenant Signature", leftX, y);
    doc.text("Landlord Signature", rightX, y);
    y += 8;

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(leftX, y, leftX + 60, y);
    doc.line(rightX, y, rightX + 60, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(contract.user?.name || "Tenant", leftX, y);
    doc.text("Property Owner", rightX, y);

    doc.save(`contract_${contract.id}_${prop?.title || "agreement"}.pdf`);
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
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
