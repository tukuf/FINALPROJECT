import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { authService } from "../services/authService";
import VirtualTourViewer from "../components/VirtualTourViewer";

export default function LandingPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTourPropertyId, setSelectedTourPropertyId] = useState(null);
  const [showTourModal, setShowTourModal] = useState(false);

  // Current logged in user
  const currentUser = authService.getUser();

  useEffect(() => {
    const fetchFeaturedProperties = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/properties/");
        if (Array.isArray(res.data) && res.data.length > 0) {
          setProperties(res.data);
          
          // Extract real reviews from database properties
          const allReviews = [];
          res.data.forEach((p) => {
            if (Array.isArray(p.reviews) && p.reviews.length > 0) {
              p.reviews.forEach((rev) => {
                allReviews.push({
                  ...rev,
                  property_title: p.title,
                });
              });
            }
          });
          setReviewsList(allReviews);
        } else {
          setProperties([]);
        }
      } catch (err) {
        console.log("Error fetching properties", err);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProperties();
  }, []);

  const handleDashboardRedirect = () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (currentUser.role === "ADMIN") {
      navigate("/adminDashboard");
    } else {
      navigate("/customerDashboard");
    }
  };

  const handleTourClick = (propertyId) => {
    setSelectedTourPropertyId(propertyId);
    setShowTourModal(true);
  };

  const handleReserveRentClick = () => {
    if (!currentUser) {
      navigate("/login");
    } else {
      navigate("/properties");
    }
  };

  const filteredProps = properties.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={pageStyle}>
      {/* ─── CSS KEYFRAME ANIMATION FOR 360 PANNING HERO ───────────────────── */}
      <style>{`
        @keyframes pan360Hero {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseHotspot {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 14px rgba(56, 189, 248, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }
        .hero-pan-bg {
          animation: pan360Hero 45s linear infinite;
        }
      `}</style>

      {/* ─── NAVBAR ────────────────────────────────────────────────────────── */}
      <nav style={navStyle}>
        <div style={navContainerStyle}>
          {/* Logo */}
          <Link to="/" style={logoStyle}>
            <div style={logoIconStyle}>🏠</div>
            <div>
              <span style={logoTitleStyle}>Virtual House Renting</span>
              <span style={logoSubStyle}>Online Platform</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div style={navLinksStyle} className="desktop-nav">
            <a href="#hero" style={navLinkStyle}>Home</a>
            <a href="#how-it-works" style={navLinkStyle}>How It Works</a>
            <a href="#features" style={navLinkStyle}>Features</a>
            <a href="#properties" style={navLinkStyle}>Properties</a>
            <a href="#about" style={navLinkStyle}>About</a>
            <a href="#testimonials" style={navLinkStyle}>Reviews</a>
            <a href="#contact" style={navLinkStyle}>Contact</a>
          </div>

          {/* Action Buttons */}
          <div style={navActionsStyle}>
            {currentUser ? (
              <button onClick={handleDashboardRedirect} style={dashboardBtnStyle}>
                <span>👤</span> Dashboard ({currentUser.username})
              </button>
            ) : (
              <>
                <button onClick={() => navigate("/login")} style={loginBtnStyle}>
                  Sign In
                </button>
                <button onClick={() => navigate("/register")} style={registerBtnStyle}>
                  Create Account
                </button>
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={hamburgerBtnStyle}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu Dropdown */}
        {mobileMenuOpen && (
          <div style={mobileDropdownStyle}>
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Home</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>How It Works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Features</a>
            <a href="#properties" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Properties</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>About</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Reviews</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Contact</a>
            {!currentUser && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                <button onClick={() => { setMobileMenuOpen(false); navigate("/login"); }} style={loginBtnStyle}>
                  Sign In
                </button>
                <button onClick={() => { setMobileMenuOpen(false); navigate("/register"); }} style={registerBtnStyle}>
                  Create Account
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ─── HERO SECTION WITH 360 PANNING BACKGROUND ───────────────────── */}
      <section id="hero" style={heroSectionStyle} className="hero-pan-bg">
        <div style={heroOverlayStyle} />
        <div style={heroContentStyle}>
          <div style={heroBadgeStyle}>
            <span style={{ animation: "pulseHotspot 2s infinite" }}>🎮</span> Live 360° Dragging & Room-by-Room Viewing
          </div>

          <h1 style={heroHeadlineStyle}>
            Find, Rent, and Manage Your <span style={gradientTextStyle}>Perfect Home Online</span>
          </h1>

          <p style={heroSubtextStyle}>
            Welcome to the Virtual House Renting Online Platform. Drag angle by angle to tour real houses in 360° virtually, reserve properties for 24 hours, sign digital agreements, and process payments securely in TZS Shillings.
          </p>

          {/* Quick Search Widget */}
          <div style={searchWidgetStyle}>
            <div style={searchInputGroupStyle}>
              <span style={{ fontSize: "1.2rem", marginLeft: "12px" }}>🔍</span>
              <input
                type="text"
                placeholder="Search by city, location (e.g. Fuoni, Tunguu), or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={searchInputStyle}
              />
            </div>
            <a href="#properties" style={searchBtnStyle}>
              Explore Houses
            </a>
          </div>

          {/* CTA Buttons */}
          <div style={heroCtaGroupStyle}>
            <button onClick={() => navigate("/register")} style={heroPrimaryCtaStyle}>
              🚀 Create Account
            </button>
            <button onClick={() => navigate("/login")} style={heroSecondaryCtaStyle}>
              🔑 Member Login
            </button>
          </div>

          {/* Interactive 360° Hotspot Preview Indicator */}
          <div style={hotspotPreviewBoxStyle}>
            <div style={{ fontWeight: 800, color: "#38bdf8", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
              <span>🔄 Continuous 360° Panning Angle Active</span>
              <span style={{ fontSize: "0.75rem", background: "rgba(56,189,248,0.2)", padding: "2px 8px", borderRadius: "12px" }}>Real House Photography</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div style={metricsGridStyle}>
            <div style={metricCardStyle}>
              <div style={metricNumberStyle}>{properties.length > 0 ? properties.length : "2"}</div>
              <div style={metricLabelStyle}>Real System Houses</div>
            </div>
            <div style={metricCardStyle}>
              <div style={metricNumberStyle}>360°</div>
              <div style={metricLabelStyle}>Virtual Hotspot Tours</div>
            </div>
            <div style={metricCardStyle}>
              <div style={metricNumberStyle}>24 Hrs</div>
              <div style={metricLabelStyle}>Hold Reservation Window</div>
            </div>
            <div style={metricCardStyle}>
              <div style={metricNumberStyle}>TZS</div>
              <div style={metricLabelStyle}>Tanzanian Shillings Payments</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─────────────────────────────────────────── */}
      <section id="how-it-works" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTagStyle}>STEP-BY-STEP WORKFLOW</span>
          <h2 style={sectionTitleStyle}>How Virtual House Renting Works</h2>
          <p style={sectionSubStyle}>
            Rent your next house completely digitally in 4 simple steps without hassle or stress.
          </p>
        </div>

        <div style={workflowGridStyle}>
          {workflowSteps.map((step, idx) => (
            <div key={idx} style={workflowCardStyle}>
              <div style={stepBadgeStyle}>{step.step}</div>
              <div style={stepIconWrapStyle}>{step.icon}</div>
              <h3 style={stepTitleStyle}>{step.title}</h3>
              <p style={stepDescStyle}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── KEY FEATURES SECTION ─────────────────────────────────────────── */}
      <section id="features" style={{ ...sectionStyle, background: "linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)" }}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTagStyle}>WHY CHOOSE US</span>
          <h2 style={sectionTitleStyle}>Built for Modern Tenants & Property Managers</h2>
          <p style={sectionSubStyle}>
            Everything you need for seamless online house exploration, reservation, and management.
          </p>
        </div>

        <div style={featuresGridStyle}>
          {featuresList.map((f, idx) => (
            <div key={idx} style={featureCardStyle}>
              <div style={featureIconStyle}>{f.icon}</div>
              <h3 style={featureTitleStyle}>{f.title}</h3>
              <p style={featureDescStyle}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURED PROPERTIES SECTION (CAPPED AT 3 MAXIMUM) ───────────── */}
      <section id="properties" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTagStyle}>FEATURED SYSTEM HOUSES</span>
          <h2 style={sectionTitleStyle}>Explore System Houses for Rent</h2>
          <p style={sectionSubStyle}>
            Showing real system properties featuring interactive 360° virtual room tours.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "1.1rem", color: "#64748b" }}>
            Loading properties...
          </div>
        ) : filteredProps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "1rem", color: "#94a3b8" }}>
            No properties found matching your search.
          </div>
        ) : (
          <div style={propertiesGridStyle}>
            {/* STRICTLY CAPPED AT MAXIMUM 3 FEATURED HOUSES ON LANDING PAGE */}
            {filteredProps.slice(0, 3).map((p) => (
              <div key={p.id} style={propertyCardStyle}>
                {/* Image & Status Badge */}
                <div style={propImageWrapStyle}>
                  <img
                    src={getImageUrl(p.image)}
                    alt={p.title}
                    style={propImageStyle}
                  />
                  <div style={propStatusBadgeStyle(p.is_available)}>
                    {p.status || (p.is_available ? "Available" : "Occupied")}
                  </div>
                  {p.has_virtual_tour && (
                    <div style={tourBadgeStyle}>
                      <span>🎮 360° Tour</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div style={propBodyStyle}>
                  <div style={propPriceStyle}>
                    TZS {Number(p.price).toLocaleString()}{" "}
                    <span style={propPriceSubStyle}>/ month</span>
                  </div>
                  <h3 style={propTitleStyle}>{p.title}</h3>
                  <div style={propLocationStyle}>
                    <span>📍</span> {p.location}
                  </div>
                  <p style={propDescStyle}>{p.description?.slice(0, 100)}...</p>

                  {/* Availability date note if occupied */}
                  {!p.is_available && (p.occupied_end_date || p.next_available_date) && (
                    <div style={propAvailabilityNoteStyle}>
                      📅 Free again starting: <strong>{p.occupied_end_date || p.next_available_date}</strong>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div style={propCardFooterStyle}>
                    {p.has_virtual_tour && (
                      <button
                        onClick={() => handleTourClick(p.id)}
                        style={startTourBtnStyle}
                      >
                        🎮 360° Tour
                      </button>
                    )}
                    <button
                      onClick={handleReserveRentClick}
                      style={viewDetailBtnStyle}
                    >
                      {currentUser ? "Rent / Reserve" : "Sign In to Rent"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── ABOUT SECTION ────────────────────────────────────────────────── */}
      <section id="about" style={{ ...sectionStyle, background: "#0f172a", color: "#fff" }}>
        <div style={aboutContainerStyle}>
          <div style={aboutTextStyle}>
            <span style={{ ...sectionTagStyle, color: "#38bdf8" }}>ABOUT OUR PLATFORM</span>
            <h2 style={{ ...sectionTitleStyle, color: "#fff", textAlign: "left" }}>
              Revolutionizing Real Estate Renting Online
            </h2>
            <p style={aboutDescStyle}>
              Virtual House Renting Online Platform bridges house seekers, property owners, and property managers in Tanzania. By combining realistic 360° hotspot walkthroughs, transparent rental dates, digital contract signing, and automated ClickPesa TZS payments, we make house renting easy.
            </p>

            <div style={aboutPointsStyle}>
              <div style={aboutPointItemStyle}>
                <span style={checkIconStyle}>✓</span>
                <div>
                  <strong>Transparent Availability:</strong> View start and end occupancy dates upfront to know when properties become free.
                </div>
              </div>
              <div style={aboutPointItemStyle}>
                <span style={checkIconStyle}>✓</span>
                <div>
                  <strong>24-Hour Hold Guarantee:</strong> Reserve a house online for 24 hours without immediate payment.
                </div>
              </div>
              <div style={aboutPointItemStyle}>
                <span style={checkIconStyle}>✓</span>
                <div>
                  <strong>ClickPesa TZS Payments:</strong> Secure transactions in Tanzanian Shillings with automatic digital contracts.
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <button onClick={() => navigate("/register")} style={heroPrimaryCtaStyle}>
                Join Virtual House Renting Today
              </button>
            </div>
          </div>

          <div style={aboutImageWrapStyle}>
            <img
              src="/hero_360_house.jpg"
              alt="Real 360 House Exterior"
              style={aboutImageStyle}
            />
          </div>
        </div>
      </section>

      {/* ─── REAL DATABASE REVIEWS SECTION ("WHAT OUR USERS SAY") ───────── */}
      <section id="testimonials" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTagStyle}>DATABASE CLIENT REVIEWS</span>
          <h2 style={sectionTitleStyle}>What Our Users Say</h2>
          <p style={sectionSubStyle}>
            Authentic client reviews and ratings fetched directly from our system database.
          </p>
        </div>

        {reviewsList.length > 0 ? (
          <div style={testimonialsGridStyle}>
            {reviewsList.map((rev, idx) => (
              <div key={idx} style={testimonialCardStyle}>
                <div style={starsWrapStyle}>
                  {"★".repeat(rev.rating || 5)}
                  <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "6px" }}>
                    ({rev.rating || 5}.0 / 5)
                  </span>
                </div>
                <p style={quoteStyle}>"{rev.comment || "Great property experience!"}"</p>
                <div style={{ fontSize: "0.78rem", color: "#2563eb", fontWeight: 700, marginBottom: "12px" }}>
                  🏠 Reviewed: {rev.property_title}
                </div>
                <div style={authorWrapStyle}>
                  <div style={authorAvatarStyle}>
                    {(rev.user || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={authorNameStyle}>{rev.user || "Client Renter"}</div>
                    <div style={authorRoleStyle}>Verified Renter • {rev.date || "2026"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>💬</div>
            <h4 style={{ color: "#1e293b", fontWeight: 700 }}>Real System Reviews</h4>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Reviews and ratings submitted by authenticated tenants appear here automatically.
            </p>
          </div>
        )}
      </section>

      {/* ─── CTA BANNER SECTION ───────────────────────────────────────────── */}
      <section style={ctaBannerSectionStyle}>
        <div style={ctaContentStyle}>
          <h2 style={ctaHeadlineStyle}>Ready to Find Your Next Home Virtually?</h2>
          <p style={ctaSubtextStyle}>
            Create your account now to start exploring houses in 360°, reserving properties, and managing rentals online.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/register")} style={ctaWhiteBtnStyle}>
              ✨ Get Started Free
            </button>
            <button onClick={() => navigate("/login")} style={ctaOutlineBtnStyle}>
              🔑 Member Login
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer id="contact" style={footerStyle}>
        <div style={footerContainerStyle}>
          <div style={footerColStyle}>
            <div style={logoStyle}>
              <div style={logoIconStyle}>🏠</div>
              <div>
                <span style={{ ...logoTitleStyle, color: "#fff" }}>Virtual House Renting</span>
                <span style={logoSubStyle}>Online Platform</span>
              </div>
            </div>
            <p style={footerDescStyle}>
              The complete digital platform for virtual 360° house tours, online property reservations, secure ClickPesa TZS payments, and tenant-landlord management.
            </p>
          </div>

          <div style={footerColStyle}>
            <h4 style={footerHeadingStyle}>Quick Links</h4>
            <a href="#hero" style={footerLinkStyle}>Home</a>
            <a href="#how-it-works" style={footerLinkStyle}>How It Works</a>
            <a href="#features" style={footerLinkStyle}>Features</a>
            <a href="#properties" style={footerLinkStyle}>Featured Properties</a>
            <a href="#about" style={footerLinkStyle}>About Us</a>
            <a href="#testimonials" style={footerLinkStyle}>Client Reviews</a>
          </div>

          <div style={footerColStyle}>
            <h4 style={footerHeadingStyle}>Account Access</h4>
            <Link to="/login" style={footerLinkStyle}>Sign In</Link>
            <Link to="/register" style={footerLinkStyle}>Register Account</Link>
            <Link to="/contactUs" style={footerLinkStyle}>Contact Support</Link>
          </div>

          <div style={footerColStyle}>
            <h4 style={footerHeadingStyle}>Contact Us</h4>
            <div style={footerContactItemStyle}>📍 Zanzibar & Dar es Salaam, Tanzania</div>
            <div style={footerContactItemStyle}>📞 +255 700 123 456 / +255 600 987 654</div>
            <div style={footerContactItemStyle}>✉️ support@virtualhouserenting.com</div>
          </div>
        </div>

        <div style={footerBottomStyle}>
          <div>© {new Date().getFullYear()} Virtual House Renting Online Platform. All rights reserved.</div>
        </div>
      </footer>

      {/* ─── VIRTUAL TOUR MODAL ───────────────────────────────────────────── */}
      {showTourModal && selectedTourPropertyId && (
        <div style={modalOverlayStyle} onClick={() => setShowTourModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseBtnStyle} onClick={() => setShowTourModal(false)}>
              ✕ Close Tour
            </button>
            <VirtualTourViewer propertyId={selectedTourPropertyId} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HELPER FOR IMAGE URL ──────────────────────────────────────────────────────
function getImageUrl(path) {
  if (!path) return "/hero_360_house.jpg";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://localhost:8000${path}`;
}

// ─── DATA LISTS ───────────────────────────────────────────────────────────────
const workflowSteps = [
  {
    step: "01",
    icon: "👤",
    title: "Create Account & Sign In",
    description: "Register in seconds as a tenant or manager to access verified house listings and online tools.",
  },
  {
    step: "02",
    icon: "🔍",
    title: "Find & Filter Houses",
    description: "Search properties by price in TZS, location, room specs, and real-time availability.",
  },
  {
    step: "03",
    icon: "🎮",
    title: "360° Virtual Hotspot Tour",
    description: "Inspect houses room-by-room virtually via hotspot navigation without leaving your home.",
  },
  {
    step: "04",
    icon: "💳",
    title: "Reserve & Pay Online (TZS)",
    description: "Hold any house for 24 hours, sign digital agreements, and process safe payments via ClickPesa.",
  },
];

const featuresList = [
  {
    icon: "🌐",
    title: "Interactive 360° Virtual Tours",
    description: "Walk through living rooms, bedrooms, kitchens, and bathrooms using interactive hotspot icons.",
  },
  {
    icon: "⏱️",
    title: "24-Hour Hold Reservation",
    description: "Lock in your favorite house for 24 hours while reviewing lease details before payment.",
  },
  {
    icon: "📅",
    title: "Transparent Availability Schedules",
    description: "View exact start and end dates for occupied properties to plan your move ahead of time.",
  },
  {
    icon: "🔒",
    title: "Secure ClickPesa TZS Payments",
    description: "Complete transactions securely in Tanzanian Shillings with instant contract updates.",
  },
  {
    icon: "📄",
    title: "Digital Rental Contracts",
    description: "Generate and manage legal digital rental agreements online for landlords and tenants.",
  },
  {
    icon: "🔔",
    title: "Real-Time Notifications",
    description: "Receive instant updates on rental approvals, payment status, and contract renewals.",
  },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
const pageStyle = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  color: "#1e293b",
  backgroundColor: "#ffffff",
  lineHeight: 1.6,
  overflowX: "hidden",
};

const navStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1000,
  backgroundColor: "rgba(255, 255, 255, 0.92)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #e2e8f0",
};

const navContainerStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "16px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textDecoration: "none",
};

const logoIconStyle = {
  fontSize: "1.8rem",
  background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
  padding: "8px",
  borderRadius: "12px",
  color: "#fff",
};

const logoTitleStyle = {
  fontWeight: 900,
  fontSize: "1.15rem",
  color: "#0f172a",
  display: "block",
  lineHeight: 1.1,
};

const logoSubStyle = {
  fontSize: "0.75rem",
  color: "#2563eb",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const navLinksStyle = {
  display: "flex",
  gap: "24px",
  alignItems: "center",
};

const navLinkStyle = {
  color: "#475569",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  transition: "color 0.2s",
};

const navActionsStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const loginBtnStyle = {
  padding: "9px 18px",
  borderRadius: "10px",
  border: "1.5px solid #cbd5e1",
  background: "#fff",
  color: "#1e293b",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const registerBtnStyle = {
  padding: "10px 20px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
};

const dashboardBtnStyle = {
  padding: "10px 20px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
};

const hamburgerBtnStyle = {
  display: "none",
  fontSize: "1.5rem",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#1e293b",
};

const mobileDropdownStyle = {
  display: "flex",
  flexDirection: "column",
  padding: "16px 24px",
  background: "#fff",
  borderBottom: "1px solid #e2e8f0",
  gap: "12px",
};

const mobileNavLinkStyle = {
  color: "#1e293b",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "1rem",
  padding: "6px 0",
};

const heroSectionStyle = {
  position: "relative",
  minHeight: "88vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: `url("/hero_360_house.jpg")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  padding: "80px 24px",
};

const heroOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 58, 138, 0.78) 100%)",
};

const heroContentStyle = {
  position: "relative",
  zIndex: 10,
  maxWidth: "920px",
  textAlign: "center",
  color: "#fff",
};

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(8px)",
  padding: "6px 16px",
  borderRadius: "30px",
  fontSize: "0.88rem",
  fontWeight: 700,
  marginBottom: "24px",
  border: "1px solid rgba(255, 255, 255, 0.25)",
};

const heroHeadlineStyle = {
  fontSize: "3.2rem",
  fontWeight: 900,
  lineHeight: 1.15,
  marginBottom: "20px",
  letterSpacing: "-0.02em",
};

const gradientTextStyle = {
  background: "linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const heroSubtextStyle = {
  fontSize: "1.15rem",
  color: "#cbd5e1",
  maxWidth: "780px",
  margin: "0 auto 32px",
  fontWeight: 400,
};

const searchWidgetStyle = {
  display: "flex",
  gap: "10px",
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(12px)",
  padding: "8px",
  borderRadius: "16px",
  maxWidth: "680px",
  margin: "0 auto 28px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
};

const searchInputGroupStyle = {
  display: "flex",
  alignItems: "center",
  flex: 1,
};

const searchInputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "none",
  background: "transparent",
  fontSize: "0.98rem",
  outline: "none",
  color: "#0f172a",
};

const searchBtnStyle = {
  padding: "12px 24px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  fontSize: "0.95rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const heroCtaGroupStyle = {
  display: "flex",
  gap: "16px",
  justifyContent: "center",
  marginBottom: "32px",
  flexWrap: "wrap",
};

const heroPrimaryCtaStyle = {
  padding: "16px 32px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "1.05rem",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)",
};

const heroSecondaryCtaStyle = {
  padding: "16px 32px",
  borderRadius: "12px",
  border: "2px solid rgba(255, 255, 255, 0.4)",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(8px)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "1.05rem",
  cursor: "pointer",
};

const hotspotPreviewBoxStyle = {
  background: "rgba(15, 23, 42, 0.65)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(56, 189, 248, 0.3)",
  padding: "10px 20px",
  borderRadius: "30px",
  display: "inline-block",
  marginBottom: "40px",
};

const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
  borderTop: "1px solid rgba(255, 255, 255, 0.15)",
  paddingTop: "32px",
};

const metricCardStyle = {
  textAlign: "center",
};

const metricNumberStyle = {
  fontSize: "2rem",
  fontWeight: 900,
  color: "#38bdf8",
};

const metricLabelStyle = {
  fontSize: "0.85rem",
  color: "#94a3b8",
  fontWeight: 600,
};

const sectionStyle = {
  padding: "90px 24px",
  maxWidth: "1280px",
  margin: "0 auto",
};

const sectionHeaderStyle = {
  textAlign: "center",
  maxWidth: "700px",
  margin: "0 auto 60px",
};

const sectionTagStyle = {
  color: "#2563eb",
  fontWeight: 800,
  fontSize: "0.82rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
};

const sectionTitleStyle = {
  fontSize: "2.4rem",
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1.2,
  marginBottom: "12px",
};

const sectionSubStyle = {
  fontSize: "1.05rem",
  color: "#64748b",
};

const workflowGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "24px",
};

const workflowCardStyle = {
  position: "relative",
  background: "#fff",
  padding: "32px 24px",
  borderRadius: "20px",
  border: "1.5px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
};

const stepBadgeStyle = {
  position: "absolute",
  top: "20px",
  right: "20px",
  fontSize: "1.5rem",
  fontWeight: 900,
  color: "#cbd5e1",
};

const stepIconWrapStyle = {
  fontSize: "2.2rem",
  marginBottom: "16px",
  background: "#eff6ff",
  width: "60px",
  height: "60px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const stepTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "8px",
};

const stepDescStyle = {
  fontSize: "0.92rem",
  color: "#64748b",
};

const featuresGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "28px",
};

const featureCardStyle = {
  background: "#fff",
  padding: "28px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
};

const featureIconStyle = {
  fontSize: "2.2rem",
  marginBottom: "14px",
};

const featureTitleStyle = {
  fontSize: "1.15rem",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "8px",
};

const featureDescStyle = {
  fontSize: "0.92rem",
  color: "#64748b",
};

const propertiesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "28px",
};

const propertyCardStyle = {
  background: "#fff",
  borderRadius: "20px",
  overflow: "hidden",
  border: "1.5px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
};

const propImageWrapStyle = {
  position: "relative",
  height: "220px",
  overflow: "hidden",
};

const propImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const propStatusBadgeStyle = (available) => ({
  position: "absolute",
  top: "14px",
  left: "14px",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "0.78rem",
  fontWeight: 800,
  color: "#fff",
  background: available ? "#10b981" : "#ef4444",
  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
});

const tourBadgeStyle = {
  position: "absolute",
  bottom: "14px",
  right: "14px",
  background: "rgba(15, 23, 42, 0.85)",
  backdropFilter: "blur(8px)",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "0.78rem",
  fontWeight: 800,
};

const propBodyStyle = {
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const propPriceStyle = {
  fontSize: "1.4rem",
  fontWeight: 900,
  color: "#2563eb",
  marginBottom: "4px",
};

const propPriceSubStyle = {
  fontSize: "0.82rem",
  color: "#64748b",
  fontWeight: 500,
};

const propTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "6px",
};

const propLocationStyle = {
  fontSize: "0.88rem",
  color: "#64748b",
  marginBottom: "12px",
};

const propDescStyle = {
  fontSize: "0.88rem",
  color: "#475569",
  marginBottom: "16px",
  flex: 1,
};

const propAvailabilityNoteStyle = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  padding: "8px 12px",
  borderRadius: "10px",
  fontSize: "0.8rem",
  marginBottom: "16px",
};

const propCardFooterStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "auto",
};

const startTourBtnStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "1.5px solid #2563eb",
  background: "#eff6ff",
  color: "#2563eb",
  fontWeight: 800,
  fontSize: "0.85rem",
  cursor: "pointer",
};

const viewDetailBtnStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.85rem",
  cursor: "pointer",
};

const aboutContainerStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "60px",
  alignItems: "center",
};

const aboutTextStyle = {
  display: "flex",
  flexDirection: "column",
};

const aboutDescStyle = {
  fontSize: "1.05rem",
  color: "#94a3b8",
  marginBottom: "24px",
};

const aboutPointsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const aboutPointItemStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  color: "#cbd5e1",
  fontSize: "0.95rem",
};

const checkIconStyle = {
  color: "#38bdf8",
  fontWeight: 900,
  fontSize: "1.2rem",
};

const aboutImageWrapStyle = {
  borderRadius: "24px",
  overflow: "hidden",
  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
};

const aboutImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const testimonialsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "28px",
};

const testimonialCardStyle = {
  background: "#fff",
  padding: "32px",
  borderRadius: "20px",
  border: "1.5px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
};

const starsWrapStyle = {
  color: "#f59e0b",
  fontSize: "1.2rem",
  marginBottom: "12px",
};

const quoteStyle = {
  fontSize: "0.98rem",
  color: "#334155",
  fontStyle: "italic",
  marginBottom: "14px",
};

const authorWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const authorAvatarStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
  color: "#fff",
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.1rem",
};

const authorNameStyle = {
  fontWeight: 800,
  color: "#0f172a",
  fontSize: "0.95rem",
};

const authorRoleStyle = {
  fontSize: "0.78rem",
  color: "#64748b",
};

const ctaBannerSectionStyle = {
  background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
  padding: "80px 24px",
  textAlign: "center",
  color: "#fff",
};

const ctaContentStyle = {
  maxWidth: "760px",
  margin: "0 auto",
};

const ctaHeadlineStyle = {
  fontSize: "2.5rem",
  fontWeight: 900,
  marginBottom: "16px",
};

const ctaSubtextStyle = {
  fontSize: "1.1rem",
  color: "#bfdbfe",
  marginBottom: "32px",
};

const ctaWhiteBtnStyle = {
  padding: "16px 36px",
  borderRadius: "12px",
  border: "none",
  background: "#fff",
  color: "#1e3a8a",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
};

const ctaOutlineBtnStyle = {
  padding: "16px 36px",
  borderRadius: "12px",
  border: "2px solid rgba(255,255,255,0.4)",
  background: "transparent",
  color: "#fff",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
};

const footerStyle = {
  background: "#090d16",
  color: "#94a3b8",
  padding: "80px 24px 30px",
  borderTop: "1px solid #1e293b",
};

const footerContainerStyle = {
  maxWidth: "1280px",
  margin: "0 auto 60px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "40px",
};

const footerColStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const footerDescStyle = {
  fontSize: "0.88rem",
  color: "#64748b",
  marginTop: "12px",
};

const footerHeadingStyle = {
  color: "#fff",
  fontWeight: 800,
  fontSize: "1rem",
  marginBottom: "4px",
};

const footerLinkStyle = {
  color: "#94a3b8",
  textDecoration: "none",
  fontSize: "0.9rem",
  transition: "color 0.2s",
};

const footerContactItemStyle = {
  fontSize: "0.88rem",
  color: "#94a3b8",
};

const footerBottomStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
  paddingTop: "24px",
  borderTop: "1px solid #1e293b",
  textAlign: "center",
  fontSize: "0.85rem",
  color: "#64748b",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(15, 23, 42, 0.85)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const modalContentStyle = {
  position: "relative",
  background: "#fff",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "1000px",
  maxHeight: "90vh",
  overflow: "auto",
  padding: "24px",
};

const modalCloseBtnStyle = {
  position: "absolute",
  top: "16px",
  right: "16px",
  zIndex: 100,
  padding: "8px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.88rem",
  cursor: "pointer",
};
