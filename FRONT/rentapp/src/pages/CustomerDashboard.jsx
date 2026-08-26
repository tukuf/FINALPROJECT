import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import api, { authService } from "../services/authService";
import { Link } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000";

function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    requests: 0,
    contracts: 0,
    notifications: 0,
    reservations: 0,
  });
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = authService.getUser();
    setUser(userData);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [reqRes, contractRes, notifRes, propRes, reservRes] = await Promise.all([
        api.get("/api/rental_request/"),
        api.get("/api/contract/"),
        api.get("/api/notification/"),
        api.get("/api/property/"),
        api.get("/api/reservation/").catch(() => ({ data: [] })),
      ]);

      const activeReservations = (reservRes.data || []).filter(
        (r) => r.reservation_status === "RESERVED"
      );

      setStats({
        requests: reqRes.data.length,
        contracts: contractRes.data.length,
        notifications: notifRes.data.filter((n) => !n.is_read).length,
        reservations: activeReservations.length,
      });

      setRecentNotifications(notifRes.data.slice(0, 5));

      const allProps = propRes.data;
      const sortedByRating = [...allProps]
        .filter((p) => (p.rating_count || 0) > 0)
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      setTopRated(sortedByRating.slice(0, 4));

      const prefs = JSON.parse(
        localStorage.getItem("userPreferences") ||
          '{"searches":[], "locations":[]}',
      );

      const recs = [];
      const seenIds = new Set();

      allProps.forEach((prop) => {
        if (!prop.is_available || seenIds.has(prop.id)) return;

        const matchesSearch = prefs.searches.some(
          (s) =>
            prop.title.toLowerCase().includes(s) ||
            (prop.description && prop.description.toLowerCase().includes(s)),
        );

        if (matchesSearch) {
          recs.push({
            ...prop,
            recMessage:
              "Your recent or related searched house is now available",
          });
          seenIds.add(prop.id);
          return;
        }

        const matchesLocation = prefs.locations.some((l) =>
          prop.location.toLowerCase().includes(l),
        );

        if (matchesLocation) {
          recs.push({
            ...prop,
            recMessage: "New house added to your favourite renting area",
          });
          seenIds.add(prop.id);
        }
      });

      setRecommendations(recs.slice(0, 4));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath)
      return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "RENT_REQUEST":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case "CONTRACT":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "RENT_REQUEST":
        return { bg: "var(--primary-50)", color: "var(--primary-600)", border: "var(--primary-100)" };
      case "CONTRACT":
        return { bg: "var(--success-50)", color: "var(--success-600)", border: "var(--success-100)" };
      default:
        return { bg: "var(--warning-50)", color: "var(--warning-600)", border: "var(--warning-100)" };
    }
  };

  const renderStars = (rating) => {
    const rounded = Math.round(rating || 0);
    return (
      <div style={{ display: "flex", gap: "2px" }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= rounded ? "#f1c40f" : "none"} stroke={s <= rounded ? "#f1c40f" : "var(--gray-300)"} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <MainLayout role="CLIENT">
      <div className="page-container">
        {/* Header */}
        <div className="animate-fade-in-up" style={{ marginBottom: "36px" }}>
          <h1 className="section-title" style={{ marginBottom: "4px" }}>
            Welcome back, {user?.username || "Customer"}!
          </h1>
          <p className="section-subtitle">
            Manage your rental activities and find your next home.
          </p>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "160px", borderRadius: "var(--radius-xl)" }} />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div style={statsGridStyle}>
              <div className="card animate-fade-in-up delay-1" style={statCardStyle}>
                <div style={{ ...statIconWrapStyle, background: "var(--primary-50)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div style={statValueStyle}>{stats.requests}</div>
                <div style={statLabelStyle}>Rental Requests</div>
                <Link to="/customerRequests" style={statLinkStyle}>
                  View all
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              <div className="card animate-fade-in-up delay-2" style={statCardStyle}>
                <div style={{ ...statIconWrapStyle, background: "var(--success-50)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <polyline points="9 15 11 17 15 13" />
                  </svg>
                </div>
                <div style={statValueStyle}>{stats.contracts}</div>
                <div style={statLabelStyle}>Active Contracts</div>
                <Link to="/Customercontracts" style={statLinkStyle}>
                  View contracts
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              <div className="card animate-fade-in-up delay-3" style={statCardStyle}>
                <div style={{ ...statIconWrapStyle, background: "var(--warning-50)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div style={statValueStyle}>{stats.notifications}</div>
                <div style={statLabelStyle}>New Notifications</div>
                <Link to="/CustomerNotifications" style={statLinkStyle}>
                  See details
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              {/* Reservations */}
              <div className="card animate-fade-in-up delay-4" style={statCardStyle}>
                <div style={{ ...statIconWrapStyle, background: "#fef3c7" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="9 15 11 17 15 13" />
                  </svg>
                </div>
                <div style={statValueStyle}>{stats.reservations}</div>
                <div style={statLabelStyle}>Active Reservations</div>
                <Link to="/myRentals" style={statLinkStyle}>
                  View reservations
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Smart Recommendations */}
            {recommendations.length > 0 && (
              <section className="animate-fade-in-up delay-4" style={{ marginBottom: "40px" }}>
                <div className="section-header" style={{ marginBottom: "20px" }}>
                  <div>
                    <h2 className="section-title" style={{ fontSize: "1.3rem" }}>
                      Recommendations for You
                    </h2>
                    <p className="section-subtitle" style={{ marginTop: "2px" }}>
                      Properties matching your interests and search history
                    </p>
                  </div>
                </div>
                <div style={propertyGridStyle}>
                  {recommendations.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className={`card animate-fade-in-up delay-${Math.min(idx + 1, 6)}`}
                      style={propertyCardStyle}
                    >
                      <div style={imageContainerStyle}>
                        <img
                          src={getImageUrl(rec.image)}
                          alt={rec.title}
                          style={imageStyle}
                          loading="lazy"
                        />
                        <div style={recBadgeOverlayStyle}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          {rec.recMessage}
                        </div>
                      </div>
                      <div style={cardBodyStyle}>
                        <h4 style={cardTitleStyle}>{rec.title}</h4>
                        <div style={cardLocationStyle}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {rec.location}
                        </div>
                        <div style={cardFooterStyle}>
                          <span style={cardPriceStyle}>TZS {Number(rec.price).toLocaleString()}<span style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 500 }}>/mo</span></span>
                          <Link to="/properties" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top Rated Houses */}
            {topRated.length > 0 && (
              <section className="animate-fade-in-up delay-5" style={{ marginBottom: "40px" }}>
                <div className="section-header" style={{ marginBottom: "20px" }}>
                  <div>
                    <h2 className="section-title" style={{ fontSize: "1.3rem" }}>
                      Top Rated Houses
                    </h2>
                    <p className="section-subtitle" style={{ marginTop: "2px" }}>
                      Highest rated properties from our community
                    </p>
                  </div>
                </div>
                <div style={propertyGridStyle}>
                  {topRated.map((house, idx) => (
                    <div
                      key={house.id}
                      className={`card animate-fade-in-up delay-${Math.min(idx + 1, 6)}`}
                      style={propertyCardStyle}
                    >
                      <div style={imageContainerStyle}>
                        <img
                          src={getImageUrl(house.image)}
                          alt={house.title}
                          style={imageStyle}
                          loading="lazy"
                        />
                        <div style={topRatedBadgeStyle}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          {house.average_rating}/5
                        </div>
                      </div>
                      <div style={cardBodyStyle}>
                        <h4 style={cardTitleStyle}>{house.title}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                          {renderStars(house.average_rating)}
                          <span style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 500 }}>
                            ({house.rating_count} {house.rating_count === 1 ? "review" : "reviews"})
                          </span>
                        </div>
                        <div style={cardFooterStyle}>
                          <span style={cardPriceStyle}>TZS {Number(house.price).toLocaleString()}<span style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 500 }}>/mo</span></span>
                          <Link to="/properties" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Notifications */}
            <section className="card animate-fade-in-up delay-4" style={{ marginBottom: "40px", overflow: "hidden" }}>
              <div style={sectionCardHeaderStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-md)", background: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={sectionCardTitleStyle}>Recent Notifications</h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--gray-500)", margin: 0 }}>Stay updated on your activities</p>
                  </div>
                </div>
                <Link to="/CustomerNotifications" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
                  View All
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>

              {recentNotifications.length > 0 ? (
                <div style={{ padding: "4px 0" }}>
                  {recentNotifications.map((n, idx) => {
                    const nc = getNotificationColor(n.type);
                    return (
                      <div
                        key={n.id}
                        style={{
                          ...notifItemStyle,
                          borderBottom: idx < recentNotifications.length - 1 ? "1px solid var(--gray-50)" : "none",
                        }}
                      >
                        <div style={{ ...notifIconStyle, background: nc.bg, color: nc.color, border: `1px solid ${nc.border}` }}>
                          {getNotificationIcon(n.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            ...notifMessageStyle,
                            fontWeight: n.is_read ? 500 : 600,
                            color: n.is_read ? "var(--gray-600)" : "var(--gray-800)",
                          }}>
                            {n.message}
                          </p>
                          <span style={notifDateStyle}>
                            {new Date(n.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {!n.is_read && (
                          <div style={unreadDotStyle} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--gray-400)" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px" }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <p style={{ fontSize: "0.9rem" }}>No recent notifications</p>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="animate-fade-in-up delay-5" style={{ marginBottom: "40px" }}>
              <div className="section-header" style={{ marginBottom: "20px" }}>
                <div>
                  <h2 className="section-title" style={{ fontSize: "1.3rem" }}>
                    Quick Actions
                  </h2>
                  <p className="section-subtitle" style={{ marginTop: "2px" }}>
                    Jump to key areas of your dashboard
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <Link to="/properties" className="card" style={actionCardStyle}>
                  <div style={{ ...actionIconWrapStyle, background: "var(--primary-50)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={actionTitleStyle}>Browse Properties</h4>
                    <p style={actionDescStyle}>Find your next perfect home</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <Link to="/SavedProperty" className="card" style={actionCardStyle}>
                  <div style={{ ...actionIconWrapStyle, background: "var(--warning-50)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={actionTitleStyle}>View Saved</h4>
                    <p style={actionDescStyle}>Review your favourite properties</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <Link to="/Customercontracts" className="card" style={actionCardStyle}>
                  <div style={{ ...actionIconWrapStyle, background: "var(--success-50)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <polyline points="9 15 11 17 15 13" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={actionTitleStyle}>My Contracts</h4>
                    <p style={actionDescStyle}>Manage your active agreements</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                {/* My Rentals quick action */}
                <Link to="/myRentals" className="card" style={actionCardStyle}>
                  <div style={{ ...actionIconWrapStyle, background: "#fef3c7" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <polyline points="9 15 11 17 15 13" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={actionTitleStyle}>My Rentals</h4>
                    <p style={actionDescStyle}>Reservations, active rentals & history</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "24px",
  marginBottom: "40px",
};

const statCardStyle = {
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  cursor: "default",
};

const statIconWrapStyle = {
  width: "52px",
  height: "52px",
  borderRadius: "var(--radius-lg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "16px",
};

const statValueStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "2.4rem",
  fontWeight: 800,
  color: "var(--gray-900)",
  lineHeight: 1,
  marginBottom: "4px",
};

const statLabelStyle = {
  fontSize: "0.88rem",
  color: "var(--gray-500)",
  fontWeight: 500,
  marginBottom: "14px",
};

const statLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "var(--primary-600)",
  textDecoration: "none",
  transition: "color 0.2s",
};

const propertyGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "24px",
};

const propertyCardStyle = {
  overflow: "hidden",
  cursor: "pointer",
};

const imageContainerStyle = {
  position: "relative",
  height: "180px",
  overflow: "hidden",
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.5s var(--ease-out)",
};

const recBadgeOverlayStyle = {
  position: "absolute",
  bottom: "10px",
  left: "10px",
  right: "10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  background: "rgba(34, 197, 94, 0.92)",
  backdropFilter: "blur(8px)",
  color: "#fff",
  borderRadius: "var(--radius-full)",
  fontSize: "0.68rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const topRatedBadgeStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "5px 10px",
  background: "rgba(255, 255, 255, 0.92)",
  backdropFilter: "blur(8px)",
  color: "var(--warning-600)",
  borderRadius: "var(--radius-full)",
  fontSize: "0.72rem",
  fontWeight: 700,
};

const cardBodyStyle = {
  padding: "16px 18px 18px",
};

const cardTitleStyle = {
  margin: "0 0 6px 0",
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--gray-900)",
  fontFamily: "var(--font-display)",
  lineHeight: 1.3,
};

const cardLocationStyle = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "0.84rem",
  color: "var(--gray-500)",
  marginBottom: "14px",
};

const cardFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardPriceStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.15rem",
  fontWeight: 800,
  color: "var(--primary-600)",
};

const sectionCardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px",
  borderBottom: "1px solid var(--gray-100)",
};

const sectionCardTitleStyle = {
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "var(--gray-900)",
  margin: 0,
};

const notifItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  padding: "14px 24px",
  transition: "background 0.15s",
};

const notifIconStyle = {
  width: "38px",
  height: "38px",
  borderRadius: "var(--radius-md)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const notifMessageStyle = {
  margin: 0,
  fontSize: "0.88rem",
  lineHeight: 1.5,
};

const notifDateStyle = {
  display: "block",
  marginTop: "3px",
  fontSize: "0.75rem",
  color: "var(--gray-400)",
};

const unreadDotStyle = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "var(--primary-500)",
  flexShrink: 0,
  marginTop: "6px",
};

const actionCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "20px",
  textDecoration: "none",
  transition: "all 0.3s var(--ease-out)",
};

const actionIconWrapStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "var(--radius-md)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const actionTitleStyle = {
  margin: 0,
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "var(--gray-900)",
};

const actionDescStyle = {
  margin: "3px 0 0 0",
  fontSize: "0.8rem",
  color: "var(--gray-500)",
};

export default ClientDashboard;
