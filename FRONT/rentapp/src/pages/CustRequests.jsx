import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";

const styles = {
  pageContainer: {
    padding: "2rem",
    maxWidth: "1400px",
    margin: "0 auto",
    animation: "fadeInUp 0.5s ease-out",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    paddingBottom: "1rem",
    borderBottom: "2px solid #e5e7eb",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },
  tableWrapper: {
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    padding: "1rem 1.25rem",
    textAlign: "left",
    fontWeight: "600",
    color: "#4b5563",
    backgroundColor: "#f9fafb",
    borderBottom: "2px solid #e5e7eb",
    whiteSpace: "nowrap",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "1rem 1.25rem",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  },
  propertyCell: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  propertyImage: {
    width: "60px",
    height: "45px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  },
  propertyName: {
    fontWeight: "500",
    color: "#1f2937",
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: (status) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "0.35rem 0.85rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: "0.02em",
    backgroundColor:
      status === "APPROVED"
        ? "#d1fae5"
        : status === "REJECTED"
        ? "#fee2e2"
        : "#fef3c7",
    color:
      status === "APPROVED"
        ? "#065f46"
        : status === "REJECTED"
        ? "#991b1b"
        : "#92400e",
    border: `1px solid ${
      status === "APPROVED"
        ? "#a7f3d0"
        : status === "REJECTED"
        ? "#fecaca"
        : "#fde68a"
    }`,
  }),
  actionBtn: (variant) => ({
    padding: "0.4rem 0.9rem",
    borderRadius: "6px",
    border: "none",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: "0.5rem",
    backgroundColor:
      variant === "approve"
        ? "#10b981"
        : variant === "reject"
        ? "#ef4444"
        : variant === "delete"
        ? "#6b7280"
        : "#6b7280",
    color: "#ffffff",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  }),
  duration: {
    color: "#6b7280",
    fontSize: "0.85rem",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    gap: "1rem",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "0.95rem",
    fontWeight: "500",
  },
  emptyContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem 2rem",
    gap: "1rem",
  },
  emptyIcon: {
    fontSize: "3rem",
    color: "#d1d5db",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "1rem",
    fontWeight: "500",
    margin: 0,
  },
  emptySubtext: {
    color: "#9ca3af",
    fontSize: "0.85rem",
    margin: 0,
  },
  clientName: {
    fontWeight: "500",
    color: "#1f2937",
  },
  indexCell: {
    fontWeight: "600",
    color: "#9ca3af",
    width: "50px",
  },
  priceCell: {
    fontWeight: "600",
    color: "#059669",
    fontSize: "0.9rem",
  },
};

const CustRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/rental_request/");
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch rental requests. Please try again.",
        confirmButtonColor: "#3b82f6",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request) => {
    try {
      await api.post(`/api/rental-request/${request.id}/update/`, {
        action: "approve",
      });

      Swal.fire({
        icon: "success",
        title: "Request Approved",
        text: "The rental request has been approved successfully.",
        confirmButtonColor: "#10b981",
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        navigate(
          `/AdminContracts?user=${request.user.id}&property=${request.property.id}`
        );
      });
    } catch (error) {
      console.error("Error approving request:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to approve the request. Please try again.",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const handleReject = async (request) => {
    try {
      await api.post(`/api/rental-request/${request.id}/update/`, {
        action: "reject",
      });

      Swal.fire({
        icon: "success",
        title: "Request Rejected",
        text: "The rental request has been rejected.",
        confirmButtonColor: "#ef4444",
        timer: 2000,
        timerProgressBar: true,
      });

      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to reject the request. Please try again.",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const handleDelete = async (request) => {
    const propertyTitle = request.property?.title || "this property";
    const customerName = request.user?.username || "the customer";

    const result = await Swal.fire({
      title: "Delete Rental Request?",
      html: `<p>You are about to <strong>permanently remove</strong> the rental request for <strong>${propertyTitle}</strong> submitted by <strong>${customerName}</strong>.</p>
             <p style="margin-top:10px;color:#6b7280;font-size:0.9rem;">The customer will be notified that their request was removed by the administrator.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/rental_request/${request.id}/`);
        setRequests((prev) => prev.filter((r) => r.id !== request.id));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          html: `<p>The rental request for <strong>${propertyTitle}</strong> has been removed.</p>
                 <p style="margin-top:8px;color:#6b7280;font-size:0.9rem;">📬 <strong>${customerName}</strong> has been notified.</p>`,
          confirmButtonColor: "#10b981",
          timer: 3500,
          timerProgressBar: true,
        });
      } catch (error) {
        console.error("Error deleting request:", error);
        const errMsg =
          error?.response?.data?.error || "Failed to delete the request. Please try again.";
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errMsg,
          confirmButtonColor: "#3b82f6",
        });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        .action-btn:active {
          transform: translateY(0);
        }
        .table-row:hover {
          background-color: #f9fafb !important;
        }
      `}</style>
      <MainLayout role="ADMIN">
        <div style={styles.pageContainer}>
          <div style={styles.header}>
            <h1 style={styles.title}>Rental Requests</h1>
          </div>

          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading rental requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div style={styles.tableWrapper}>
              <div style={styles.emptyContainer}>
                <div style={styles.emptyIcon}>📋</div>
                <p style={styles.emptyText}>No rental requests found</p>
                <p style={styles.emptySubtext}>
                  There are currently no pending or processed rental requests.
                </p>
              </div>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Client</th>
                    <th style={styles.th}>Property</th>
                    <th style={styles.th}>Image</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request, index) => (
                    <tr
                      key={request.id}
                      className="table-row"
                      style={{ transition: "background-color 0.15s ease" }}
                    >
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>
                        <span style={styles.clientName}>
                          {request.user?.username || "Unknown User"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.propertyCell}>
                          <span style={styles.propertyName}>
                            {request.property?.title || "Unknown Property"}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        {request.property?.image ? (
                          <img
                            src={request.property.image}
                            alt={request.property?.title || "Property"}
                            style={styles.propertyImage}
                          />
                        ) : (
                          <div
                            style={{
                              ...styles.propertyImage,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "#f3f4f6",
                              color: "#9ca3af",
                              fontSize: "0.7rem",
                            }}
                          >
                            No Image
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.duration}>
                          <div>{formatDate(request.start_date)}</div>
                          <div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                            to
                          </div>
                          <div>{formatDate(request.end_date)}</div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.priceCell}>
                          {formatPrice(request.property?.price)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badge(request.status)}>
                          {request.status?.toLowerCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
                          {request.status === "PENDING" ? (
                            <>
                              <button
                                className="action-btn"
                                style={styles.actionBtn("approve")}
                                onClick={() => handleApprove(request)}
                              >
                                Approve
                              </button>
                              <button
                                className="action-btn"
                                style={styles.actionBtn("reject")}
                                onClick={() => handleReject(request)}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "0.8rem", marginRight: "0.5rem" }}>
                              {request.status === "APPROVED"
                                ? "Approved"
                                : "Rejected"}
                            </span>
                          )}
                          <button
                            className="action-btn"
                            style={{ ...styles.actionBtn("delete"), padding: "0.4rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            onClick={() => handleDelete(request)}
                            title="Delete request"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </MainLayout>
    </>
  );
};

export default CustRequests;
