import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { authService } from "../services/authService";

function MainLayout({ children, role }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const toggleSidebar = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Responsive: auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 768);
      
      if (w <= 768) {
        setIsCollapsed(false);
        setIsMobileOpen(false);
      } else if (w <= 1024) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      } else {
        setIsCollapsed(false);
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll-to-top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [closeMobileSidebar]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--gray-50)" }}>
      {/* Sidebar */}
      <Sidebar
        role={role}
        isCollapsed={isCollapsed}
        onToggle={isMobile ? toggleSidebar : toggleCollapse}
        isMobileOpen={isMobileOpen}
        onMobileClose={closeMobileSidebar}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: !isMobile
            ? isCollapsed
              ? "var(--sidebar-collapsed-width)"
              : "var(--sidebar-width)"
            : "0",
          transition: "margin-left var(--duration-slow) cubic-bezier(0.16, 1, 0.3, 1)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Header */}
        <header style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger - always visible, works on all screen sizes */}
            <button
              onClick={isMobile ? toggleSidebar : toggleCollapse}
              style={hamburgerStyle}
              aria-label={isMobile && isMobileOpen ? "Close menu" : "Open menu"}
              onMouseOver={(e) => { e.currentTarget.style.background = "var(--gray-100)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={hamburgerLinesWrapStyle}>
                <span style={{
                  ...hamburgerLineStyle,
                  transform: isMobile && isMobileOpen ? "rotate(45deg) translate(5px, 5px)" : (!isMobile && isCollapsed ? "rotate(45deg) translate(5px, 5px)" : "none"),
                }} />
                <span style={{
                  ...hamburgerLineStyle,
                  opacity: (isMobile && isMobileOpen) || (!isMobile && isCollapsed) ? 0 : 1,
                  transform: (isMobile && isMobileOpen) || (!isMobile && isCollapsed) ? "translateX(10px)" : "none",
                }} />
                <span style={{
                  ...hamburgerLineStyle,
                  transform: isMobile && isMobileOpen ? "rotate(-45deg) translate(5px, -5px)" : (!isMobile && isCollapsed ? "rotate(-45deg) translate(5px, -5px)" : "none"),
                }} />
              </div>
            </button>
          </div>

          <div
            style={profileContainerStyle}
            onMouseLeave={() => setShowMenu(false)}
          >
            <button
              style={avatarButtonStyle}
              onClick={() => setShowMenu(!showMenu)}
              aria-label="User menu"
              aria-expanded={showMenu}
            >
              <div style={avatarCircleStyle}>
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={avatarInfoStyle}>
                <span style={avatarNameStyle}>{user?.username || "User"}</span>
                <span style={avatarRoleStyle}>{role === "ADMIN" ? "Admin" : "Client"}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s", transform: showMenu ? "rotate(180deg)" : "rotate(0)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showMenu && (
              <div style={dropdownStyle}>
                <div style={dropdownUserInfoStyle}>
                  <div style={dropdownAvatarStyle}>
                    {user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>{user?.username}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--gray-500)" }}>{user?.role || role}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "var(--gray-100)", margin: "6px 0" }} />
                <button
                  style={logoutItemStyle}
                  onClick={handleLogout}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main style={{ flex: 1, padding: "0" }}>
          {children}
        </main>
      </div>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={scrollTopStyle}
          aria-label="Scroll to top"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 32px",
  height: "var(--header-height)",
  backgroundColor: "rgba(255,255,255,0.8)",
  backdropFilter: "blur(12px) saturate(180%)",
  WebkitBackdropFilter: "blur(12px) saturate(180%)",
  borderBottom: "1px solid var(--gray-100)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const hamburgerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "var(--radius-md)",
  color: "var(--gray-600)",
  transition: "all 0.2s",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const hamburgerLinesWrapStyle = {
  width: "20px",
  height: "14px",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const hamburgerLineStyle = {
  display: "block",
  width: "100%",
  height: "2px",
  background: "var(--gray-700)",
  borderRadius: "2px",
  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  transformOrigin: "center",
};

const profileContainerStyle = {
  position: "relative",
  cursor: "pointer",
};

const avatarButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "5px 10px 5px 5px",
  borderRadius: "var(--radius-full)",
  border: "1.5px solid var(--gray-100)",
  background: "#fff",
  cursor: "pointer",
  transition: "all 0.2s var(--ease-out)",
  boxShadow: "var(--shadow-xs)",
};

const avatarCircleStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.9rem",
};

const avatarInfoStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  lineHeight: 1.2,
};

const avatarNameStyle = {
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "var(--gray-800)",
};

const avatarRoleStyle = {
  fontSize: "0.7rem",
  color: "var(--gray-500)",
  fontWeight: 500,
};

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  backgroundColor: "#fff",
  boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
  borderRadius: "var(--radius-lg)",
  padding: "8px",
  minWidth: "220px",
  zIndex: 1000,
  animation: "fadeInDown 0.2s var(--ease-out) both",
};

const dropdownUserInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
};

const dropdownAvatarStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "var(--radius-md)",
  background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "1rem",
  flexShrink: 0,
};

const logoutItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  padding: "10px 12px",
  background: "none",
  border: "none",
  color: "var(--danger-500)",
  fontWeight: 600,
  fontSize: "0.88rem",
  cursor: "pointer",
  borderRadius: "var(--radius-md)",
  transition: "background 0.15s",
};

const scrollTopStyle = {
  position: "fixed",
  bottom: "32px",
  right: "32px",
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 4px 16px rgba(59, 130, 246, 0.35)",
  zIndex: 900,
  animation: "fadeInUp 0.3s var(--ease-out) both",
  transition: "transform 0.2s, box-shadow 0.2s",
};

export default MainLayout;
