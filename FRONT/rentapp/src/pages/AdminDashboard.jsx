import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService"; // eslint-disable-line no-unused-vars

const API_BASE_URL = "http://localhost:8000";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    properties: 0,
    requests: 0,
    pendingRequests: 0,
    signedContracts: 0,
    sentContracts: 0,
    notifications: 0,
  });
  const [recentProperties, setRecentProperties] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [propRes, reqRes, contractRes, notifRes] = await Promise.all([
        api.get("/api/property/"),
        api.get("/api/rental_request/"),
        api.get("/api/contract/"),
        api.get("/api/notification/"),
      ]);

      const props = propRes.data;
      const reqs = reqRes.data;
      const contracts = contractRes.data;
      const notifs = notifRes.data;

      setStats({
        properties: props.length,
        requests: reqs.length,
        pendingRequests: reqs.filter((r) => r.status === "PENDING").length,
        signedContracts: contracts.filter((c) => c.status === "SIGNED").length,
        sentContracts: contracts.filter((c) => c.status === "SENT").length,
        notifications: notifs.filter((n) => !n.is_read).length,
      });

      setRecentProperties(props.slice(0, 5));
      setPendingRequests(
        reqs.filter((r) => r.status === "PENDING").slice(0, 5)
      );
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId, action, userId, propertyId) => {
    try {
      await api.post(`/api/rental-request/${requestId}/update/`, { action });

      if (action === "approve") {
        const Swal = (await import("sweetalert2")).default;
        Swal.fire({
          title: "Successfully Approved",
          text: "Redirecting to generate contract...",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        setTimeout(() => {
          navigate(`/AdminContracts?user=${userId}&property=${propertyId}`);
        }, 2000);
      } else {
        const Swal = (await import("sweetalert2")).default;
        Swal.fire({
          title: "Rejected",
          text: "Rental request has been rejected.",
          icon: "info",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchAdminData();
      }
    } catch (err) {
      console.error("Failed to update request:", err);
      const Swal = (await import("sweetalert2")).default;
      Swal.fire({
        title: "Error",
        text: "Failed to update request.",
        icon: "error",
      });
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/40x40?text=No+Image";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const statCards = [
    {
      label: "Total Properties",
      value: stats.properties,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      bg: "linear-gradient(135deg, var(--primary-50), var(--primary-100))",
      iconBg: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
      color: "var(--primary-700)",
    },
    {
      label: "Rental Requests",
      value: stats.requests,
      subtitle: `${stats.pendingRequests} pending`,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      bg: "linear-gradient(135deg, var(--warning-50), var(--warning-100))",
      iconBg: "linear-gradient(135deg, var(--warning-500), var(--warning-600))",
      color: "var(--warning-600)",
    },
    {
      label: "Contracts Status",
      value: stats.signedContracts,
      subtitle: `${stats.sentContracts} sent`,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6" />
          <path d="m9 15 3 3 3-3" />
        </svg>
      ),
      bg: "linear-gradient(135deg, var(--success-50), var(--success-100))",
      iconBg: "linear-gradient(135deg, var(--success-500), var(--success-600))",
      color: "var(--success-700)",
    },
    {
      label: "New Notifications",
      value: stats.notifications,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      bg: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
      iconBg: "linear-gradient(135deg, var(--accent-500), var(--accent-600))",
      color: "#6d28d9",
    },
  ];

  return (
    <MainLayout role="ADMIN">
      <div className="page-container">
        <div className="animate-fade-in-up" style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.8rem",
            fontWeight: 800,
            color: "var(--gray-900)",
            letterSpacing: "-0.02em",
          }}>
            Admin Dashboard
          </h1>
          <p style={{ color: "var(--gray-500)", marginTop: 4, fontSize: "0.95rem" }}>
            Overview of your rental platform
          </p>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: "var(--radius-xl)" }} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid-4 animate-fade-in-up">
              {statCards.map((card, i) => (
                <div
                  key={card.label}
                  className={`card animate-fade-in-up delay-${i + 1}`}
                  style={{
                    background: card.bg,
                    padding: 0,
                    cursor: "default",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.4)",
                  }} />
                  <div style={{ padding: "24px", position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: "var(--radius-lg)",
                        background: card.iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}>
                        {card.icon}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      color: card.color,
                      lineHeight: 1,
                      marginBottom: 4,
                    }}>
                      {card.value}
                    </div>
                    <div style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: card.color,
                      opacity: 0.8,
                    }}>
                      {card.label}
                    </div>
                    {card.subtitle && (
                      <div style={{
                        marginTop: 8,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--gray-600)",
                        background: "rgba(255,255,255,0.7)",
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "var(--radius-full)",
                      }}>
                        {card.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 32 }}>
              <div className="table-wrapper animate-fade-in-up delay-5">
                <div style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--gray-100)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <h3 style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--gray-800)",
                  }}>
                    Recent Properties
                  </h3>
                  <button
                    onClick={() => navigate("/uploadProperty")}
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--primary-600)", fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    Manage
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Property</th>
                        <th>Price</th>
                        <th>Status / Occupant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProperties.map((prop) => (
                        <tr key={prop.id}>
                          <td>
                            <img
                              src={getImageUrl(prop.image)}
                              alt={prop.title}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                                borderRadius: "var(--radius-md)",
                              }}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{prop.title}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--gray-500)" }}>
                              <span>📍</span>
                              <span>{prop.location}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--gray-800)" }}>
                            TZS {Number(prop.price).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${prop.is_available ? "badge-success" : prop.status === "Reserved" ? "badge-warning" : "badge-danger"}`}>
                              {prop.status || (prop.is_available ? "Available" : "Occupied")}
                            </span>
                            {prop.status === "Reserved" && prop.current_reservation?.customer_name && (
                              <div style={{ fontSize: "0.78rem", color: "#d97706", marginTop: 2, fontWeight: 600 }}>
                                👤 Reserved by: {prop.current_reservation.customer_name}
                              </div>
                            )}
                            {(prop.status === "Occupied" || (!prop.is_available && prop.status !== "Reserved")) && prop.current_occupant?.username && (
                              <div style={{ fontSize: "0.78rem", color: "#dc2626", marginTop: 2, fontWeight: 600 }}>
                                👤 Rented by: {prop.current_occupant.username}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {recentProperties.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", color: "var(--gray-400)", padding: 32 }}>
                            No properties yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="table-wrapper animate-fade-in-up delay-6">
                <div style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--gray-100)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <h3 style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--gray-800)",
                  }}>
                    Pending Rental Requests
                  </h3>
                  <button
                    onClick={() => navigate("/requests")}
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--primary-600)", fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    View all
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Client / User</th>
                        <th>Property</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((req) => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 700, color: "var(--primary-700)" }}>
                            👤 {req.user?.username || "Unknown User"}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {req.property?.title || `Property #${req.property?.id || req.property}`}
                          </td>
                          <td>
                            {req.start_date && req.end_date ? (
                              <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>
                                {req.start_date} to {req.end_date}
                              </span>
                            ) : (
                              <span style={{ color: "var(--gray-400)" }}>N/A</span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-warning">{req.status}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(req.id, "approve", req.user.id, req.property.id)
                                }
                                className="btn btn-success btn-sm"
                                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(req.id, "reject")}
                                className="btn btn-danger btn-sm"
                                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingRequests.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: 32 }}>
                            No pending requests
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default AdminDashboard;
