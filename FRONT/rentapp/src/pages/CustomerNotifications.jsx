import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";

const KEYFRAMES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
`;

function CustomerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/notification/");
      const sorted = response.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setNotifications(sorted);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notification/${id}/`, { is_read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    try {
      await Promise.all(
        unread.map((n) => api.patch(`/api/notification/${n.id}/`, { is_read: true }))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      Swal.fire({
        title: "All Caught Up!",
        text: "All notifications marked as read.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", "Failed to update notifications.", "error");
    }
  };

  const deleteNotification = async (id) => {
    const result = await Swal.fire({
      title: "Delete Notification?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/notification/${id}/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      Swal.fire({ title: "Deleted", text: "Notification removed.", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", "Failed to delete notification.", "error");
    }
  };

  const getTypeConfig = (type) => {
    const configs = {
      RENT_REQUEST: {
        label: "Rent Request",
        bg: "#eef2ff",
        color: "#4f46e5",
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
      CONTRACT: {
        label: "Contract",
        bg: "#ecfdf5",
        color: "#059669",
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      GENERAL: {
        label: "General",
        bg: "#fef3c7",
        color: "#b45309",
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
    };
    return configs[type] || configs.GENERAL;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <MainLayout role="CLIENT">
      <style>{KEYFRAMES}</style>
      <div className="page-container" style={styles.pageContainer}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Notifications</h1>
            <p style={styles.subtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} style={styles.markAllBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Mark all as read
            </button>
          )}
        </div>

        <div style={styles.card}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIconBg}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <h3 style={styles.emptyTitle}>No notifications yet</h3>
              <p style={styles.emptyText}>We'll let you know when there's updates on your requests.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {notifications.map((n, index) => {
                const config = getTypeConfig(n.type);
                return (
                  <div
                    key={n.id}
                    style={{
                      ...styles.notifCard,
                      ...(n.is_read ? styles.notifCardRead : styles.notifCardUnread),
                      animationDelay: `${index * 0.04}s`,
                    }}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className="notif-card"
                  >
                    <div
                      style={{
                        ...styles.iconContainer,
                        backgroundColor: config.bg,
                      }}
                    >
                      {config.icon}
                    </div>

                    <div style={styles.notifBody}>
                      <div style={styles.notifTopRow}>
                        <span
                          style={{
                            ...styles.typeBadge,
                            backgroundColor: config.bg,
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </span>
                        <span style={styles.dot}>·</span>
                        <span style={styles.timestamp}>{formatDate(n.created_at)}</span>
                      </div>
                      <p
                        style={{
                          ...styles.notifMessage,
                          color: n.is_read ? "#6b7280" : "#1e293b",
                          fontWeight: n.is_read ? "400" : "500",
                        }}
                      >
                        {n.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      style={styles.deleteBtn}
                      title="Delete notification"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {!n.is_read && <div style={styles.unreadDot}></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <style>{`
          .page-container { animation: fadeInUp 0.4s ease-out both; }
          .notif-card { transition: all 0.2s ease, transform 0.15s ease; }
          .notif-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.07) !important; }
          .notif-card:active { transform: translateY(0); }
        `}</style>
      </div>
    </MainLayout>
  );
}

const styles = {
  pageContainer: {
    padding: "32px",
    maxWidth: "900px",
    margin: "0 auto",
    animation: "fadeInUp 0.4s ease-out both",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "#6b7280",
    margin: "4px 0 0",
  },
  markAllBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "10px",
    border: "1px solid #e0e7ff",
    background: "#eef2ff",
    color: "#4f46e5",
    fontSize: "0.8125rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  },
  list: {
    display: "flex",
    flexDirection: "column",
  },
  notifCard: {
    display: "flex",
    alignItems: "flex-start",
    padding: "20px 24px",
    position: "relative",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
    animation: "fadeInUp 0.4s ease-out both",
  },
  notifCardUnread: {
    backgroundColor: "#ffffff",
  },
  notifCardRead: {
    backgroundColor: "#f9fafb",
    opacity: 0.7,
  },
  iconContainer: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginRight: "16px",
  },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifTopRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "0.7rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  dot: {
    color: "#d1d5db",
    fontSize: "1.1rem",
    lineHeight: 1,
  },
  timestamp: {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  notifMessage: {
    fontSize: "0.925rem",
    lineHeight: "1.55",
    margin: 0,
    wordBreak: "break-word",
  },
  deleteBtn: {
    background: "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: "12px",
    transition: "all 0.15s ease",
  },
  unreadDot: {
    width: "9px",
    height: "9px",
    backgroundColor: "#3b82f6",
    borderRadius: "50%",
    position: "absolute",
    top: "24px",
    right: "20px",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.15)",
    animation: "pulse 2s ease-in-out infinite",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "64px 24px",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#4f46e5",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "0.875rem",
    color: "#6b7280",
    margin: 0,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "72px 24px",
    textAlign: "center",
  },
  emptyIconBg: {
    width: "96px",
    height: "96px",
    borderRadius: "50%",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  emptyTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 4px",
  },
  emptyText: {
    fontSize: "0.875rem",
    color: "#9ca3af",
    margin: 0,
    maxWidth: "320px",
  },
};

export default CustomerNotifications;
