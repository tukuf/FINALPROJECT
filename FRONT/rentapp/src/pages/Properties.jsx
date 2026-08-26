import { useState, useEffect, useCallback, useRef } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";
import VirtualTourViewer from "../components/VirtualTourViewer";
import ReservationPanel from "../components/ReservationModal";
import PaymentModal from "../components/PaymentModal";

const API_BASE_URL = "http://localhost:8000";

function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [savedProperties, setSavedProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [tourPropertyId, setTourPropertyId] = useState(null);
  const [selectedReservationForPayment, setSelectedReservationForPayment] = useState(null);
  // Tracks which property IDs have already had their visit recorded this session
  const visitedRef = useRef(new Set());

  useEffect(() => {
    fetchProperties();
    fetchSavedProperties();
  }, []);

  const closeModal = useCallback(() => setSelectedProperty(null), []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") closeModal(); };
    if (selectedProperty) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      // Only record the visit once per property per session to avoid an
      // infinite loop: recordVisit called setSelectedProperty which
      // re-triggered this effect which called recordVisit again.
      if (!visitedRef.current.has(selectedProperty.id)) {
        visitedRef.current.add(selectedProperty.id);
        recordVisit(selectedProperty.id);
      }
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [selectedProperty, closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const savePreferences = () => {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || '{"searches":[], "locations":[]}');
      let updated = false;
      if (searchTerm.trim().length > 2) {
        if (!prefs.searches.includes(searchTerm.trim().toLowerCase())) {
          prefs.searches.push(searchTerm.trim().toLowerCase());
          if (prefs.searches.length > 10) prefs.searches.shift();
          updated = true;
        }
      }
      if (filterLocation.trim().length > 2) {
        if (!prefs.locations.includes(filterLocation.trim().toLowerCase())) {
          prefs.locations.push(filterLocation.trim().toLowerCase());
          if (prefs.locations.length > 5) prefs.locations.shift();
          updated = true;
        }
      }
      if (updated) localStorage.setItem("userPreferences", JSON.stringify(prefs));
    };
    const timer = setTimeout(savePreferences, 2000);
    return () => clearTimeout(timer);
  }, [searchTerm, filterLocation]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/property/");
      setProperties(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load properties. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedProperties = async () => {
    try {
      const response = await api.get("/api/saved_property/");
      setSavedProperties(response.data);
    } catch (err) {
      console.error("Error fetching saved properties:", err);
    }
  };

  const recordVisit = async (propertyId) => {
    try {
      const response = await api.post(`/api/property/${propertyId}/record-visit/`);
      // Update the count in the properties list only — do NOT call
      // setSelectedProperty here, as that would re-trigger the useEffect
      // above and cause an infinite POST loop.
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId ? { ...p, unique_review_count: response.data.count } : p
        )
      );
    } catch (err) {
      // Silently fail — visit recording is non-critical
      console.error("Error recording visit:", err);
    }
  };

  const isSaved = (propertyId) => savedProperties.some((sp) => sp.property.id === propertyId);

  const handleToggleSave = async (property) => {
    const savedItem = savedProperties.find((sp) => sp.property.id === property.id);
    if (savedItem) {
      try {
        await api.delete(`/api/saved_property/${savedItem.id}/`);
        setSavedProperties(savedProperties.filter((sp) => sp.id !== savedItem.id));
        if (selectedProperty && selectedProperty.id === property.id) {
          setSelectedProperty({ ...selectedProperty, _saved: false });
        }
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Failed to unsave", "error");
      }
    } else {
      try {
        const response = await api.post("/api/saved_property/", { property: property.id });
        setSavedProperties([...savedProperties, response.data]);
        Swal.fire({ title: "Saved!", text: "Property added to favourites", icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err) {
        Swal.fire("Error", "Failed to save property", "error");
      }
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !filterLocation || property.location.toLowerCase().includes(filterLocation.toLowerCase());
    const matchesPrice = (!priceRange.min || parseFloat(property.price) >= parseFloat(priceRange.min)) &&
      (!priceRange.max || parseFloat(property.price) <= parseFloat(priceRange.max));
    const matchesAvailability = !showAvailableOnly || property.is_available;
    return matchesSearch && matchesLocation && matchesPrice && matchesAvailability;
  });

  const handleRate = async (property) => {
    const { value: formValues } = await Swal.fire({
      title: `Rate ${property.title}`,
      html: `<div style="text-align:left"><label style="display:block;margin-bottom:5px;font-weight:bold">Your Rating:</label><select id="swal-rating" class="swal2-input" style="width:100%;margin:0 0 15px"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Below Average</option><option value="1">1 - Poor</option></select><label style="display:block;margin-bottom:5px;font-weight:bold">Your Review:</label><textarea id="swal-review" class="swal2-textarea" placeholder="How was your experience?" style="width:100%;margin:0"></textarea></div>`,
      showCancelButton: true,
      confirmButtonText: "Submit Review",
      confirmButtonColor: "#3b82f6",
      preConfirm: () => {
        const rating = document.getElementById("swal-rating").value;
        const review = document.getElementById("swal-review").value;
        if (!review) { Swal.showValidationMessage("Please write a review"); return false; }
        return { rating: parseInt(rating), review };
      },
    });
    if (formValues) {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const newReview = { user: user.username || "Anonymous", rating: formValues.rating, comment: formValues.review, date: new Date().toISOString().split("T")[0] };
        const updatedReviews = [newReview, ...(property.reviews || [])];
        await api.patch(`/api/property/${property.id}/`, {
          total_rating: property.total_rating + formValues.rating,
          rating_count: property.rating_count + 1,
          reviews_json: JSON.stringify(updatedReviews),
        });
        Swal.fire("Thank you!", "Your review has been posted.", "success");
        fetchProperties();
      } catch (err) {
        Swal.fire("Error", "Failed to submit rating", "error");
      }
    }
  };

  const showReviews = (property) => {
    const reviews = property.reviews || [];
    if (reviews.length === 0) {
      Swal.fire("No reviews yet", "Be the first to review!", "info");
      return;
    }
    const html = reviews.map((r) => `
      <div style="text-align:left;padding:12px;border-bottom:1px solid var(--gray-100)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:var(--gray-800)">${r.user}</strong>
          <span style="color:#f1c40f;font-size:0.85rem">${"\u2605".repeat(r.rating)}${"\u2606".repeat(5 - r.rating)}</span>
        </div>
        <p style="color:var(--gray-600);margin:6px 0 4px;font-size:0.9rem">${r.comment}</p>
        <small style="color:var(--gray-400)">${r.date}</small>
      </div>
    `).join("");
    Swal.fire({ title: `Reviews for ${property.title}`, html: `<div style="max-height:400px;overflow-y:auto">${html}</div>`, confirmButtonText: "Close", customClass: { popup: "swal-custom" } });
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatPrice = (p) => "TZS " + Number(p || 0).toLocaleString();

  const getImageUrl = (img) => {
    if (!img) return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop";
    if (img.startsWith("http")) return img;
    return `${API_BASE_URL}${img.startsWith("/") ? img : `/${img}`}`;
  };

  return (
    <MainLayout role="CLIENT">
      <div className="page-container">
        {/* Header */}
        <div style={{ marginBottom: "32px" }} className="animate-fade-in-up">
          <h1 className="section-title">Find Your Perfect Home</h1>
          <p className="section-subtitle">Browse available rental properties and find your next place to live</p>
        </div>

        {/* Filters */}
        <div style={filterCardStyle} className="animate-fade-in-up delay-1">
          <div style={filterRowStyle}>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Search</label>
              <div style={searchInputWrapperStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder="Search by name, description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={searchInputStyle} />
              </div>
            </div>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Location</label>
              <input type="text" placeholder="Filter by location..." value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} style={filterInputStyle} />
            </div>
          </div>
          <div style={{ ...filterRowStyle, marginBottom: 0 }}>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Min Price</label>
              <input type="number" placeholder="Min" value={priceRange.min} onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))} style={filterInputStyle} />
            </div>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Max Price</label>
              <input type="number" placeholder="Max" value={priceRange.max} onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))} style={filterInputStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={showAvailableOnly} onChange={(e) => setShowAvailableOnly(e.target.checked)} style={checkboxStyle} />
                <span>Available only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: "20px", color: "var(--gray-500)", fontSize: "0.9rem" }} className="animate-fade-in">
          Showing <strong style={{ color: "var(--gray-800)" }}>{filteredProperties.length}</strong> properties
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="skeleton" style={{ borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                <div className="skeleton skeleton-image" />
                <div style={{ padding: "20px" }}>
                  <div className="skeleton skeleton-text" style={{ width: "70%", height: 18 }} />
                  <div className="skeleton skeleton-text" style={{ width: "50%" }} />
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text" style={{ width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <div style={{ color: "var(--danger-500)", textAlign: "center", padding: "40px" }}>{error}</div>}

        {/* Properties Grid */}
        {!loading && !error && (
          <div style={gridStyle}>
            {filteredProperties.map((property, index) => (
              <div key={property.id} style={cardStyle} className={`animate-fade-in-up delay-${Math.min(index + 1, 6)}`}>
                {/* Image - clickable */}
                <div
                  style={imageContainerStyle}
                  onClick={() => setSelectedProperty(property)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedProperty(property); } }}
                >
                  <img
                    src={getImageUrl(property.image)}
                    alt={property.title}
                    style={imageStyle}
                    loading="lazy"
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                  <div style={statusBadgeStyle(property.status || (property.is_available ? "Available" : "Occupied"))}>
                    {property.status || (property.is_available ? "Available" : "Occupied")}
                  </div>
                  <button
                    style={heartBtnStyle}
                    onClick={(e) => { e.stopPropagation(); handleToggleSave(property); }}
                    aria-label={isSaved(property.id) ? "Remove from favourites" : "Add to favourites"}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved(property.id) ? "#ef4444" : "none"} stroke={isSaved(property.id) ? "#ef4444" : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                {/* Content - clickable */}
                <div style={contentStyle} onClick={() => setSelectedProperty(property)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedProperty(property); } }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <h3 style={titleStyle}>{property.title}</h3>
                    <span style={priceStyle}>{formatPrice(property.price)}<span style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 500 }}>/mo</span></span>
                  </div>
                  <div style={locationStyle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {property.location}
                  </div>
                  <div style={ratingRowStyle}>
                    <div style={{ display: "flex", gap: "1px" }}>
                      {[1,2,3,4,5].map((s) => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= Math.round(property.average_rating || 0) ? "#f1c40f" : "none"} stroke={s <= Math.round(property.average_rating || 0) ? "#f1c40f" : "var(--gray-300)"} strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>{property.average_rating || 0} ({property.unique_review_count || 0} Reviews)</span>
                  </div>
                  <p style={descStyle}>{property.description}</p>
                  {!property.is_available && (property.occupied_start_date || property.next_available_date) && (
                    <div style={nextAvailableTag}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <div>
                        {property.occupied_start_date && property.occupied_end_date ? (
                          <>Occupied: {formatDate(property.occupied_start_date)} to {formatDate(property.occupied_end_date)} (Free again: {formatDate(property.occupied_end_date)})</>
                        ) : (
                          <>Available again: {formatDate(property.next_available_date)}</>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredProperties.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--gray-500)" }} className="animate-fade-in">
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <h3 style={{ color: "var(--gray-700)", marginBottom: "8px" }}>No properties found</h3>
            <p style={{ fontSize: "0.95rem" }}>Try adjusting your filters or search criteria</p>
          </div>
        )}
      </div>

      {/* ===== PROPERTY DETAIL MODAL ===== */}
      {selectedProperty && (
        <div style={modalOverlayStyle} onClick={closeModal} role="dialog" aria-modal="true" aria-label={selectedProperty.title}>
          <div style={modalContainerStyle} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button style={modalCloseBtnStyle} onClick={closeModal} aria-label="Close modal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Image */}
            <div style={modalImageWrapStyle}>
              <img
                src={getImageUrl(selectedProperty.image)}
                alt={selectedProperty.title}
                style={modalImageStyle}
              />
              <div style={statusBadgeStyle(selectedProperty.status || (selectedProperty.is_available ? "Available" : "Occupied"))}>
                {selectedProperty.status || (selectedProperty.is_available ? "Available" : "Occupied")}
              </div>
            </div>

            {/* Body */}
            <div style={modalBodyStyle}>
              {/* Title & Price */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
                <h2 style={modalTitleStyle}>{selectedProperty.title}</h2>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={modalPriceStyle}>{formatPrice(selectedProperty.price)}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-400)", fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              {/* Location */}
              <div style={modalLocationStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {selectedProperty.location}
              </div>

              {/* Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill={s <= Math.round(selectedProperty.average_rating || 0) ? "#f1c40f" : "none"} stroke={s <= Math.round(selectedProperty.average_rating || 0) ? "#f1c40f" : "var(--gray-300)"} strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--gray-700)" }}>{selectedProperty.average_rating || 0}</span>
                <span style={{ fontSize: "0.85rem", color: "var(--gray-400)" }}>({selectedProperty.rating_count || 0} reviews)</span>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--gray-100)", marginBottom: "20px" }} />

              {/* Description */}
              <div style={modalSectionStyle}>
                <h3 style={modalSectionTitleStyle}>Description</h3>
                <p style={modalDescStyle}>{selectedProperty.description}</p>
              </div>

              {/* Available Again Date */}
              {!selectedProperty.is_available && (selectedProperty.occupied_start_date || selectedProperty.next_available_date) && (
                <div style={modalAvailableAgainStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Occupied Period</div>
                    {selectedProperty.occupied_start_date && selectedProperty.occupied_end_date && (
                      <div style={{ fontSize: "0.82rem", opacity: 0.9 }}>
                        From <strong>{formatDate(selectedProperty.occupied_start_date)}</strong> to <strong>{formatDate(selectedProperty.occupied_end_date)}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#15803d", marginTop: 4 }}>
                      Available (free) again starting on: {formatDate(selectedProperty.occupied_end_date || selectedProperty.next_available_date)}
                    </div>
                  </div>
                </div>
              )}

              {/* Property Details Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>Status</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: selectedProperty.status === "Available" ? "var(--success-600)" : selectedProperty.status === "Reserved" ? "#d97706" : "var(--danger-500)" }}>
                    {selectedProperty.status || (selectedProperty.is_available ? "Available" : "Occupied")}
                  </span>
                </div>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>Listed</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--gray-800)" }}>{formatDate(selectedProperty.created_at)}</span>
                </div>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>Price</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary-600)" }}>{formatPrice(selectedProperty.price)}/mo</span>
                </div>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>Reviews</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--gray-800)" }}>{selectedProperty.unique_review_count || 0} Reviews</span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--gray-100)", marginBottom: "20px" }} />

              {/* Reviews Section */}
              <div style={modalSectionStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={modalSectionTitleStyle}>Reviews</h3>
                  <button style={modalLinkBtnStyle} onClick={() => showReviews(selectedProperty)}>
                    View all ({(selectedProperty.reviews || []).length})
                  </button>
                </div>
                {(selectedProperty.reviews || []).length === 0 ? (
                  <p style={{ fontSize: "0.9rem", color: "var(--gray-400)", fontStyle: "italic" }}>No reviews yet. Be the first to review!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(selectedProperty.reviews || []).slice(0, 3).map((r, i) => (
                      <div key={i} style={modalReviewCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--gray-800)" }}>{r.user}</span>
                          <span style={{ color: "#f1c40f", fontSize: "0.8rem" }}>{"\u2605".repeat(r.rating)}{"\u2606".repeat(5 - r.rating)}</span>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", margin: 0 }}>{r.comment}</p>
                        <small style={{ color: "var(--gray-400)", fontSize: "0.75rem" }}>{r.date}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
                {selectedProperty.has_virtual_tour && (
                  <button
                    onClick={() => {
                      // Save the property ID before closing the modal,
                      // since closeModal() clears selectedProperty.
                      setTourPropertyId(selectedProperty.id);
                      closeModal();
                      setShowVirtualTour(true);
                    }}
                    className="btn-tour"
                    style={modalVirtualTourBtnStyle}
                  >
                    <span className="icon">🎮</span> Start Virtual Tour
                  </button>
                )}

                {/* ── Reservation Panel (replaces old Rent Now button) ── */}
                <ReservationPanel
                  property={selectedProperty}
                  onReservationCreated={(reservation) => {
                    // Update the property status in state without a full refetch
                    setProperties((prev) =>
                      prev.map((p) =>
                        p.id === selectedProperty.id
                          ? { ...p, status: "Reserved", is_available: false }
                          : p
                      )
                    );
                    setSelectedProperty((prev) =>
                      prev ? { ...prev, status: "Reserved", is_available: false } : prev
                    );
                    // Full refresh in background
                    fetchProperties();
                  }}
                  onRentNow={(reservation) => {
                    setProperties((prev) =>
                      prev.map((p) =>
                        p.id === selectedProperty.id
                          ? { ...p, status: "Reserved", is_available: false }
                          : p
                      )
                    );
                    setSelectedProperty((prev) =>
                      prev ? { ...prev, status: "Reserved", is_available: false } : prev
                    );
                    fetchProperties();
                    closeModal();
                    setSelectedReservationForPayment(reservation);
                  }}
                />

                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    style={{ ...modalActionBtnStyle, flex: 1 }}
                    onClick={() => { closeModal(); handleRate(selectedProperty); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Rate
                  </button>
                  <button
                    style={{ ...modalActionBtnStyle, flex: 1 }}
                    onClick={() => { closeModal(); showReviews(selectedProperty); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Reviews
                  </button>
                </div>
                <button
                  style={{ ...modalActionBtnStyle, width: "100%", background: isSaved(selectedProperty.id) ? "var(--danger-50)" : "transparent", color: isSaved(selectedProperty.id) ? "var(--danger-500)" : "var(--gray-700)", border: isSaved(selectedProperty.id) ? "1.5px solid var(--danger-200)" : "1.5px solid var(--gray-200)" }}
                  onClick={() => handleToggleSave(selectedProperty)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved(selectedProperty.id) ? "#ef4444" : "none"} stroke={isSaved(selectedProperty.id) ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {isSaved(selectedProperty.id) ? "Remove from Favourites" : "Save Property"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVirtualTour && tourPropertyId && (
        <VirtualTourViewer
          propertyId={tourPropertyId}
          onClose={() => { setShowVirtualTour(false); setTourPropertyId(null); }}
        />
      )}

      {selectedReservationForPayment && (
        <PaymentModal
          reservation={selectedReservationForPayment}
          onClose={() => setSelectedReservationForPayment(null)}
          onPaymentSuccess={() => {
            setSelectedReservationForPayment(null);
            closeModal();
            fetchProperties();
          }}
        />
      )}
    </MainLayout>
  );
}

// ── Card Styles ─────────────────────────────────────────
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: "24px",
};
const filterCardStyle = { background: "#fff", borderRadius: "var(--radius-xl)", padding: "24px", marginBottom: "24px", boxShadow: "var(--shadow-card)", border: "1px solid var(--gray-100)" };
const filterRowStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" };
const filterGroupStyle = { display: "flex", flexDirection: "column" };
const filterLabelStyle = { fontSize: "0.8rem", fontWeight: 600, color: "var(--gray-600)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" };
const searchInputWrapperStyle = { display: "flex", alignItems: "center", gap: "8px", padding: "0 12px", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", background: "#fff" };
const searchInputStyle = { flex: 1, padding: "10px 0", border: "none", outline: "none", fontSize: "0.9rem", background: "transparent" };
const filterInputStyle = { padding: "10px 14px", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-md)", fontSize: "0.9rem", background: "#fff", outline: "none" };
const checkboxLabelStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "var(--gray-600)", cursor: "pointer", padding: "10px 0" };
const checkboxStyle = { width: 16, height: 16, accentColor: "var(--primary-500)" };
const cardStyle = { background: "#fff", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-card)", border: "1px solid var(--gray-100)", transition: "all 0.35s var(--ease-out)", cursor: "pointer" };
const imageContainerStyle = { position: "relative", height: "210px", overflow: "hidden" };
const imageStyle = { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s var(--ease-out)" };
const statusBadgeStyle = (status) => {
  const colorMap = {
    Available: { bg: "rgba(34,197,94,0.9)", color: "#fff" },
    Reserved:  { bg: "rgba(234,179,8,0.95)", color: "#fff" },
    Occupied:  { bg: "rgba(239,68,68,0.9)", color: "#fff" },
  };
  // backwards compat: boolean
  const key =
    status === true
      ? "Available"
      : status === false
      ? "Occupied"
      : status || "Available";
  const { bg, color } = colorMap[key] || colorMap.Available;
  return {
    position: "absolute",
    top: "12px",
    right: "12px",
    padding: "5px 12px",
    borderRadius: "var(--radius-full)",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    background: bg,
    color,
    backdropFilter: "blur(8px)",
    zIndex: 2,
  };
};
const heartBtnStyle = { position: "absolute", top: "12px", left: "12px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", transition: "all 0.2s", zIndex: 2 };
const contentStyle = { padding: "18px 20px 20px" };
const titleStyle = { fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "var(--gray-900)", margin: 0, lineHeight: 1.3, flex: 1 };
const priceStyle = { fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 800, color: "var(--primary-600)", whiteSpace: "nowrap" };
const locationStyle = { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "var(--gray-500)", marginBottom: "10px" };
const ratingRowStyle = { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" };
const descStyle = { fontSize: "0.85rem", color: "var(--gray-500)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "8px" };
const nextAvailableTag = { display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--warning-50)", color: "var(--warning-600)", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600, border: "1px solid var(--warning-100)", width: "fit-content" };

// ── Modal Styles ────────────────────────────────────────
const modalOverlayStyle = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px",
  animation: "fadeIn 0.2s ease-out",
};
const modalContainerStyle = {
  background: "#fff", borderRadius: "var(--radius-2xl, 24px)",
  width: "100%", maxWidth: "680px", maxHeight: "90vh",
  overflow: "hidden", position: "relative",
  boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
  display: "flex", flexDirection: "column",
  animation: "scaleIn 0.25s var(--ease-out)",
};
const modalCloseBtnStyle = {
  position: "absolute", top: "16px", right: "16px", zIndex: 10,
  width: "40px", height: "40px", borderRadius: "50%",
  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  border: "none", cursor: "pointer", color: "#fff",
  transition: "all 0.2s",
};
const modalImageWrapStyle = {
  position: "relative", width: "100%", height: "320px", overflow: "hidden", flexShrink: 0,
};
const modalImageStyle = {
  width: "100%", height: "100%", objectFit: "cover",
};
const modalBodyStyle = {
  padding: "28px 32px 32px", overflowY: "auto", flex: 1,
};
const modalTitleStyle = {
  fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
  fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)",
  margin: 0, lineHeight: 1.25, flex: 1,
};
const modalPriceStyle = {
  fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, color: "var(--primary-600)",
};
const modalLocationStyle = {
  display: "flex", alignItems: "center", gap: "6px",
  fontSize: "0.95rem", color: "var(--gray-500)", marginBottom: "12px",
};
const modalSectionStyle = { marginBottom: "20px" };
const modalSectionTitleStyle = {
  fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700,
  color: "var(--gray-900)", marginBottom: "10px",
};
const modalDescStyle = {
  fontSize: "0.92rem", color: "var(--gray-600)", lineHeight: 1.7, margin: 0,
};
const modalAvailableAgainStyle = {
  display: "flex", alignItems: "center", gap: "12px",
  padding: "14px 18px", borderRadius: "var(--radius-lg)",
  background: "linear-gradient(135deg, #fff7ed, #fef3c7)",
  border: "1px solid #fed7aa", color: "#c2410c",
  marginBottom: "20px",
};
const modalDetailCardStyle = {
  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px",
  padding: "14px 16px", borderRadius: "var(--radius-lg)",
  background: "var(--gray-50)", border: "1px solid var(--gray-100)",
};
const modalReviewCardStyle = {
  padding: "12px 14px", borderRadius: "var(--radius-md)",
  background: "var(--gray-50)", border: "1px solid var(--gray-100)",
};
const modalLinkBtnStyle = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: "0.85rem", fontWeight: 600, color: "var(--primary-600)",
  padding: "4px 8px", borderRadius: "var(--radius-sm)",
};
const modalVirtualTourBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  width: "100%", padding: "14px 20px", borderRadius: "var(--radius-lg)",
  fontSize: "0.95rem", fontWeight: 700, border: "2px solid var(--primary-400)",
  cursor: "pointer", transition: "all 0.25s var(--ease-out)",
  background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))",
  color: "#fff", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
};
const modalActionBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
  padding: "12px 18px", borderRadius: "var(--radius-lg)",
  fontSize: "0.9rem", fontWeight: 600, border: "1.5px solid var(--gray-200)",
  background: "var(--gray-100)", color: "var(--gray-700)",
  cursor: "pointer", transition: "all 0.2s var(--ease-out)",
};

export default Properties;
