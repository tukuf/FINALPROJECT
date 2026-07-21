import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/authService";
import "../styles/sidebar.css";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ),
  property: (
    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  search: (
    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  contract: (
    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
  star: (
    <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  contact: (
    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  ),
  reservation: (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 15 11 17 15 13"/></svg>
  ),
};

function Sidebar({ role, isCollapsed, onToggle, isMobileOpen, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getUser();

  const [unreadCount, setUnreadCount] = useState(0);
  const [unsignedContractCount, setUnsignedContractCount] = useState(0);

  const prevPathRef = useRef(location.pathname);

  const fetchNotificationCount = useCallback(async () => {
    if (role !== "CLIENT") return;
    try {
      const res = await api.get("/api/notification/");
      const count = res.data.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } catch {
      // silently fail — badge stays at last known count
    }
  }, [role]);

  const fetchContractCount = useCallback(async () => {
    if (role !== "CLIENT") return;
    try {
      const res = await api.get("/api/contract/");
      const count = res.data.filter((c) => c.status === "SENT").length;
      setUnsignedContractCount(count);
    } catch {
      // silently fail
    }
  }, [role]);

  useEffect(() => {
    if (role === "CLIENT") {
      fetchNotificationCount();
      fetchContractCount();
    }
  }, [role, fetchNotificationCount, fetchContractCount]);

  useEffect(() => {
    if (role !== "CLIENT") return;
    const prevPath = prevPathRef.current;
    const currPath = location.pathname;

    if (prevPath === "/Customercontracts" && currPath !== "/Customercontracts") {
      fetchContractCount();
    }
    if (prevPath === "/CustomerNotifications" && currPath !== "/CustomerNotifications") {
      fetchNotificationCount();
    }

    prevPathRef.current = currPath;
  }, [location.pathname, role, fetchContractCount, fetchNotificationCount]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const menuItems = {
    ADMIN: [
      { path: "/adminDashboard", label: "Dashboard", icon: "dashboard" },
      { path: "/userManagement", label: "User Management", icon: "users" },
      { path: "/uploadProperty", label: "Manage Properties", icon: "property" },
      { path: "/requests", label: "Rental Requests", icon: "mail" },
      { path: "/AdminContracts", label: "Contracts", icon: "contract" },
      { path: "/AdminNotifications", label: "Notifications", icon: "bell" },
      { path: "/contactUs", label: "Contact Us", icon: "contact" },
    ],
    CLIENT: [
      { path: "/customerDashboard", label: "Dashboard", icon: "dashboard" },
      { path: "/properties", label: "Browse Properties", icon: "search" },
      { path: "/myRentals", label: "My Rentals", icon: "reservation" },
      { path: "/Customercontracts", label: "My Contracts", icon: "contract" },
      { path: "/CustomerNotifications", label: "Notifications", icon: "bell" },
      { path: "/SavedProperty", label: "Favourites", icon: "star" },
      { path: "/contactUs", label: "Contact Us", icon: "contact" },
    ],
  };

  const currentMenu = menuItems[role] || [];
  const isActive = (path) => location.pathname === path;

  const renderBadge = (item) => {
    if (role !== "CLIENT") return null;

    if (item.icon === "bell" && unreadCount > 0) {
      return (
        <span className="sidebar-badge">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      );
    }

    if (item.icon === "contract" && unsignedContractCount > 0) {
      return <span className="sidebar-dot" />;
    }

    return null;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? "active" : ""}`}
        onClick={onMobileClose}
      />

      <nav
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${
          isMobileOpen ? "mobile-open" : ""
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Toggle Button */}
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          {icons.chevronLeft}
        </button>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="14" width="11" height="16" rx="1.5" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
              <rect x="19" y="8" width="11" height="22" rx="1.5" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
              <rect x="5" y="17" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="9" y="17" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="5" y="22" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="9" y="22" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="22" y="11" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="26.5" y="11" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="22" y="16" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="26.5" y="16" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="22" y="21" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="26.5" y="21" width="2.5" height="2.5" rx="0.5" fill="rgba(59,130,246,0.7)"/>
              <rect x="14.5" y="2" width="3" height="28" rx="1" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
              <circle cx="16" cy="7" r="1.5" fill="rgba(250,204,21,0.9)"/>
              <rect x="15.3" y="11" width="1.5" height="1.5" rx="0.3" fill="rgba(59,130,246,0.7)"/>
              <rect x="15.3" y="15" width="1.5" height="1.5" rx="0.3" fill="rgba(59,130,246,0.7)"/>
              <rect x="15.3" y="19" width="1.5" height="1.5" rx="0.3" fill="rgba(59,130,246,0.7)"/>
              <rect x="15.3" y="23" width="1.5" height="1.5" rx="0.3" fill="rgba(59,130,246,0.7)"/>
            </svg>
          </div>
          <span className="sidebar-logo-text">Virtual House Renting</span>
        </div>

        {/* User Profile */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username || "User"}</div>
            <div className="sidebar-user-role">{role === "ADMIN" ? "Administrator" : "Client"}</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          <div className="sidebar-nav-label">
            <span className="sidebar-nav-label-text">Navigation</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {currentMenu.map((item) => (
              <li key={item.path} className="sidebar-nav-item">
                <Link
                  to={item.path}
                  className={`sidebar-nav-link ${isActive(item.path) ? "active" : ""}`}
                  data-tooltip={isCollapsed ? item.label : undefined}
                  title={isCollapsed ? item.label : ""}
                  onClick={isMobileOpen ? onMobileClose : undefined}
                >
                  <span className="sidebar-nav-icon">{icons[item.icon]}</span>
                  <span className="sidebar-nav-label-text">{item.label}</span>
                  {renderBadge(item)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Logout */}
        <div className="sidebar-bottom">
          <button className="sidebar-logout" onClick={handleLogout} title={isCollapsed ? "Sign Out" : ""}>
            <span className="sidebar-nav-icon">{icons.logout}</span>
            <span className="sidebar-nav-label-text">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
