import { useState, useEffect, useCallback } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";
import VirtualTourViewer from "../components/VirtualTourViewer";

const API_BASE_URL = "http://localhost:8000";

function SavedProperty() {
  const [savedProperties, setSavedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rentingId, setRentingId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showVirtualTour, setShowVirtualTour] = useState(false);

  useEffect(() => {
    fetchSavedProperties();
  }, []);

  const closeModal = useCallback(() => setSelectedProperty(null), []);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") closeModal(); };
    if (selectedProperty) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      // Record the customer's visit to this property
      recordVisit(selectedProperty.id);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [selectedProperty, closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordVisit = async (propertyId) => {
    try {
      const response = await api.post(`/api/property/${propertyId}/record-visit/`);
      // Update the cached count inside the savedProperties list
      setSavedProperties((prev) =>
        prev.map((sp) =>
          sp.property && sp.property.id === propertyId
            ? { ...sp, property: { ...sp.property, unique_review_count: response.data.count } }
            : sp
        )
      );
      setSelectedProperty((prev) =>
        prev && prev.id === propertyId ? { ...prev, unique_review_count: response.data.count } : prev
      );
    } catch (err) {
      // Silently fail — visit recording is non-critical
      console.error("Error recording visit:", err);
    }
  };

  const fetchSavedProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/saved_property/");
      setSavedProperties(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching saved properties:", err);
      setError("Failed to load your favorites. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (savedId) => {
    const result = await Swal.fire({
      title: "Remove from favourites?",
      text: "This property will be removed from your saved list.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#d1d5db",
      confirmButtonText: "Yes, remove it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/saved_property/${savedId}/`);
      setSavedProperties((prev) => prev.filter((sp) => sp.id !== savedId));
      Swal.fire({ title: "Removed", text: "Property removed from favourites", icon: "info", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error unsaving property:", err);
      Swal.fire("Error", "Failed to remove from favourites", "error");
    }
  };

  const handleRent = async (property) => {
    if (!property.is_available) return;
    const { value: formValues } = await Swal.fire({
      title: "Rent \"" + property.title + "\"",
      html: '<div style="text-align:left;padding:10px 0"><label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.85rem">Start Date</label><input id="rent-start-date" type="date" class="swal2-input" style="margin:0 0 15px;width:100%;font-size:0.9rem" /><label style="display:block;margin-bottom:5px;font-weight:600;font-size:0.85rem">End Date</label><input id="rent-end-date" type="date" class="swal2-input" style="margin:0;width:100%;font-size:0.9rem" /></div>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Send Request",
      confirmButtonColor: "#3b82f6",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      preConfirm: () => {
        const startDate = document.getElementById("rent-start-date").value;
        const endDate = document.getElementById("rent-end-date").value;
        if (!startDate || !endDate) { Swal.showValidationMessage("Please select both dates"); return false; }
        if (new Date(startDate) >= new Date(endDate)) { Swal.showValidationMessage("End date must be after start date"); return false; }
        if (new Date(startDate) < new Date().setHours(0, 0, 0, 0)) { Swal.showValidationMessage("Start date cannot be in the past"); return false; }
        return { start_date: startDate, end_date: endDate };
      },
    });
    if (formValues) {
      try {
        setRentingId(property.id);
        await api.post("/api/property/" + property.id + "/rent/", formValues);
        Swal.fire({ title: "Request Sent!", text: "Your rental request has been submitted successfully.", icon: "success", confirmButtonColor: "#3b82f6" });
      } catch (err) {
        console.error("Error sending rental request:", err);
        Swal.fire("Error", err.response?.data?.error || "Failed to send rental request", "error");
      } finally {
        setRentingId(null);
      }
    }
  };

  const handleRate = async (property) => {
    const { value: formValues } = await Swal.fire({
      title: "Rate " + property.title,
      html: '<div style="text-align:left"><label style="display:block;margin-bottom:5px;font-weight:bold">Your Rating:</label><select id="swal-rating" class="swal2-input" style="width:100%;margin:0 0 15px"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Below Average</option><option value="1">1 - Poor</option></select><label style="display:block;margin-bottom:5px;font-weight:bold">Your Review:</label><textarea id="swal-review" class="swal2-textarea" placeholder="How was your experience?" style="width:100%;margin:0"></textarea></div>',
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
        await api.patch("/api/property/" + property.id + "/", {
          total_rating: property.total_rating + formValues.rating,
          rating_count: property.rating_count + 1,
          reviews_json: JSON.stringify(updatedReviews),
        });
        Swal.fire("Thank you!", "Your review has been posted.", "success");
        fetchSavedProperties();
      } catch (err) {
        Swal.fire("Error", "Failed to submit rating", "error");
      }
    }
  };

  const showReviews = (property) => {
    const reviews = property.reviews || [];
    if (reviews.length === 0) { Swal.fire("No reviews yet", "Be the first to review!", "info"); return; }
    const html = reviews.map((r) =>
      '<div style="text-align:left;padding:12px;border-bottom:1px solid var(--gray-100)"><div style="display:flex;justify-content:space-between;align-items:center"><strong style="color:var(--gray-800)">' + r.user + '</strong><span style="color:#f1c40f;font-size:0.85rem">' + "\u2605".repeat(r.rating) + "\u2606".repeat(5 - r.rating) + '</span></div><p style="color:var(--gray-600);margin:6px 0 4px;font-size:0.9rem">' + r.comment + '</p><small style="color:var(--gray-400)">' + r.date + '</small></div>'
    ).join("");
    Swal.fire({ title: "Reviews for " + property.title, html: '<div style="max-height:400px;overflow-y:auto">' + html + "</div>", confirmButtonText: "Close" });
  };

  const isSaved = (propertyId) => savedProperties.some((sp) => sp.property.id === propertyId);

  const handleToggleSave = async (property) => {
    const savedItem = savedProperties.find((sp) => sp.property.id === property.id);
    if (savedItem) {
      try {
        await api.delete("/api/saved_property/" + savedItem.id + "/");
        setSavedProperties(savedProperties.filter((sp) => sp.id !== savedItem.id));
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Failed to unsave", "error");
      }
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop";
    if (imagePath.startsWith("http")) return imagePath;
    const normalizedPath = imagePath.startsWith("/") ? imagePath : "/" + imagePath;
    return API_BASE_URL + normalizedPath;
  };

  const formatPrice = (price) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <MainLayout role="CLIENT">
      <div className="page-container">
        {/* Header */}
        <div style={headerWrapStyle} className="animate-fade-in-up">
          <div style={headerLeftStyle}>
            <div style={iconCircleStyle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <h1 style={pageTitleStyle}>My Favourites</h1>
              <p style={pageSubtitleStyle}>Properties you've saved for later</p>
            </div>
          </div>
          {!loading && !error && savedProperties.length > 0 && (
            <div style={countBadgeStyle}>{savedProperties.length} {savedProperties.length === 1 ? "property" : "properties"}</div>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div style={gridStyle}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton" style={skeletonCardStyle}>
                <div className="skeleton skeleton-image" style={{ height: 210 }} />
                <div style={{ padding: "18px 20px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div className="skeleton skeleton-text" style={{ width: "55%", height: 20 }} />
                    <div className="skeleton skeleton-text" style={{ width: "25%", height: 20 }} />
                  </div>
                  <div className="skeleton skeleton-text" style={{ width: "40%", height: 14, marginBottom: 12 }} />
                  <div className="skeleton skeleton-text" style={{ width: "100%", height: 36, borderRadius: "var(--radius-md, 8px)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={errorCardStyle} className="animate-fade-in-up">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 style={{ color: "#374151", margin: "12px 0 6px" }}>Something went wrong</h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 20px" }}>{error}</p>
            <button onClick={fetchSavedProperties} style={retryBtnStyle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && savedProperties.length === 0 && (
          <div style={emptyCardStyle} className="animate-fade-in-up">
            <div style={emptyIconWrapStyle}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 style={{ color: "#374151", margin: "20px 0 8px", fontSize: "1.2rem" }}>No favourites yet</h3>
            <p style={{ color: "#6b7280", fontSize: "0.95rem", maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Browse properties and tap the heart icon to save the ones you love. They'll show up here for easy access.
            </p>
            <a href="/dashboard/properties" style={browseBtnStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Browse Properties
            </a>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && !error && savedProperties.length > 0 && (
          <div style={gridStyle}>
            {savedProperties.map((saved, index) => {
              const { property } = saved;
              if (!property) return null;
              const isAvailable = property.is_available;
              return (
                <div key={saved.id} style={cardStyle} className={"animate-fade-in-up delay-" + Math.min(index + 1, 6)}>
                  {/* Image - clickable */}
                  <div style={imageContainerStyle} onClick={() => setSelectedProperty(property)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedProperty(property); } }}>
                    <img src={getImageUrl(property.image)} alt={property.title} style={imageStyle} loading="lazy" onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.08)")} onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")} />
                    <div style={statusBadgeStyle(isAvailable)}>
                      <span style={statusDotStyle(isAvailable)} />
                      {isAvailable ? "Available" : "Occupied"}
                    </div>
                    <button style={heartBtnStyle} onClick={(e) => { e.stopPropagation(); handleUnsave(saved.id); }} aria-label="Remove from favourites">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  {/* Content - clickable */}
                  <div style={contentStyle} onClick={() => setSelectedProperty(property)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedProperty(property); } }}>
                    <div style={contentHeaderStyle}>
                      <h3 style={propertyTitleStyle}>{property.title}</h3>
                      <div style={priceBlockStyle}>
                        <span style={priceStyle}>{formatPrice(property.price)}</span>
                        <span style={pricePeriodStyle}>/mo</span>
                      </div>
                    </div>

                    <div style={locationRowStyle}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {property.location}
                    </div>

                    {!isAvailable && property.next_available_date && (
                      <div style={nextAvailableTagStyle}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Available again: {formatDate(property.next_available_date)}
                      </div>
                    )}

                    {/* Actions - stop propagation so they don't open modal */}
                    <div style={actionsRowStyle} onClick={(e) => e.stopPropagation()}>
                      <button style={rentBtnStyle(isAvailable, rentingId === property.id)} onClick={() => handleRent(property)} disabled={!isAvailable || rentingId === property.id}>
                        {rentingId === property.id ? (<><span style={spinnerStyle} /> Sending...</>) : isAvailable ? (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> Rent Now</>) : "Occupied"}
                      </button>
                      <button style={removeBtnStyle} onClick={() => handleUnsave(saved.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== PROPERTY DETAIL MODAL ===== */}
      {selectedProperty && (
        <div style={modalOverlayStyle} onClick={closeModal} role="dialog" aria-modal="true" aria-label={selectedProperty.title}>
          <div style={modalContainerStyle} onClick={(e) => e.stopPropagation()}>
            <button style={modalCloseBtnStyle} onClick={closeModal} aria-label="Close modal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div style={modalImageWrapStyle}>
              <img src={getImageUrl(selectedProperty.image)} alt={selectedProperty.title} style={modalImageStyle} />
              <div style={statusBadgeStyle(selectedProperty.is_available)}>{selectedProperty.is_available ? "Available" : "Occupied"}</div>
            </div>

            <div style={modalBodyStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
                <h2 style={modalTitleStyle}>{selectedProperty.title}</h2>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={modalPriceStyle}>{formatPrice(selectedProperty.price)}</span>
                  <span style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              <div style={modalLocationStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {selectedProperty.location}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill={s <= Math.round(selectedProperty.average_rating || 0) ? "#f1c40f" : "none"} stroke={s <= Math.round(selectedProperty.average_rating || 0) ? "#f1c40f" : "#d1d5db"} strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>{selectedProperty.average_rating || 0}</span>
                <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>({selectedProperty.rating_count || 0} reviews)</span>
              </div>

              <div style={{ height: "1px", background: "#f3f4f6", marginBottom: "20px" }} />

              <div style={modalSectionStyle}>
                <h3 style={modalSectionTitleStyle}>Description</h3>
                <p style={modalDescStyle}>{selectedProperty.description}</p>
              </div>

              {!selectedProperty.is_available && selectedProperty.next_available_date && (
                <div style={modalAvailableAgainStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Available Again</div>
                    <div style={{ fontSize: "0.82rem", opacity: 0.85 }}>{formatDate(selectedProperty.next_available_date)}</div>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Status</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: selectedProperty.is_available ? "#16a34a" : "#ef4444" }}>{selectedProperty.is_available ? "Available" : "Occupied"}</span>
                </div>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Price</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#2563eb" }}>{formatPrice(selectedProperty.price)}/mo</span>
                </div>
                <div style={modalDetailCardStyle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Reviews</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{selectedProperty.unique_review_count || 0} Reviews</span>
                </div>
              </div>

              <div style={{ height: "1px", background: "#f3f4f6", marginBottom: "20px" }} />

              <div style={modalSectionStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={modalSectionTitleStyle}>Reviews</h3>
                  <button style={modalLinkBtnStyle} onClick={() => showReviews(selectedProperty)}>View all ({(selectedProperty.reviews || []).length})</button>
                </div>
                {(selectedProperty.reviews || []).length === 0 ? (
                  <p style={{ fontSize: "0.9rem", color: "#9ca3af", fontStyle: "italic" }}>No reviews yet. Be the first to review!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(selectedProperty.reviews || []).slice(0, 3).map((r, i) => (
                      <div key={i} style={modalReviewCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1f2937" }}>{r.user}</span>
                          <span style={{ color: "#f1c40f", fontSize: "0.8rem" }}>{"\u2605".repeat(r.rating)}{"\u2606".repeat(5 - r.rating)}</span>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#4b5563", margin: 0 }}>{r.comment}</p>
                        <small style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{r.date}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
                {selectedProperty.has_virtual_tour && (
                  <button onClick={() => setShowVirtualTour(true)} style={modalVirtualTourBtnStyle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    Start Virtual Visiting
                  </button>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button style={{ ...modalActionBtnStyle, flex: 2, background: selectedProperty.is_available ? "#2563eb" : "#e5e7eb", color: selectedProperty.is_available ? "#fff" : "#6b7280", cursor: selectedProperty.is_available ? "pointer" : "not-allowed" }} onClick={() => { closeModal(); handleRent(selectedProperty); }} disabled={!selectedProperty.is_available}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {selectedProperty.is_available ? "Rent Now" : "Occupied"}
                  </button>
                  <button style={{ ...modalActionBtnStyle, flex: 1 }} onClick={() => { closeModal(); handleRate(selectedProperty); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Rate
                  </button>
                  <button style={{ ...modalActionBtnStyle, flex: 1 }} onClick={() => { closeModal(); showReviews(selectedProperty); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Reviews
                  </button>
                </div>
                <button style={{ ...modalActionBtnStyle, width: "100%", background: isSaved(selectedProperty.id) ? "#fef2f2" : "transparent", color: isSaved(selectedProperty.id) ? "#ef4444" : "#374151", border: isSaved(selectedProperty.id) ? "1.5px solid #fecaca" : "1.5px solid #e5e7eb" }} onClick={() => handleToggleSave(selectedProperty)}>
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

      {showVirtualTour && selectedProperty && (
        <VirtualTourViewer 
          propertyId={selectedProperty.id} 
          onClose={() => setShowVirtualTour(false)} 
        />
      )}
    </MainLayout>
  );
}

/* ── Styles ────────────────────────────────────────────── */
const headerWrapStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" };
const headerLeftStyle = { display: "flex", alignItems: "center", gap: "16px" };
const iconCircleStyle = { width: "52px", height: "52px", borderRadius: "var(--radius-lg, 12px)", background: "linear-gradient(135deg, #ef4444, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(239,68,68,0.25)" };
const pageTitleStyle = { fontFamily: "var(--font-display, 'Inter', sans-serif)", fontSize: "2rem", fontWeight: 800, color: "var(--gray-900, #111827)", margin: 0, lineHeight: 1.2 };
const pageSubtitleStyle = { fontSize: "0.95rem", color: "var(--gray-500, #6b7280)", margin: "4px 0 0" };
const countBadgeStyle = { padding: "6px 16px", borderRadius: "var(--radius-full, 9999px)", background: "var(--primary-50, #eff6ff)", color: "var(--primary-600, #2563eb)", fontSize: "0.85rem", fontWeight: 700, border: "1px solid var(--primary-100, #dbeafe)" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px" };
const skeletonCardStyle = { background: "#fff", borderRadius: "var(--radius-xl, 16px)", overflow: "hidden", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))", border: "1px solid var(--gray-100, #f3f4f6)" };
const cardStyle = { background: "#fff", borderRadius: "var(--radius-xl, 16px)", overflow: "hidden", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))", border: "1px solid var(--gray-100, #f3f4f6)", transition: "all 0.35s var(--ease-out, cubic-bezier(0.16,1,0.3,1))", cursor: "pointer" };
const imageContainerStyle = { position: "relative", height: "210px", overflow: "hidden" };
const imageStyle = { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s var(--ease-out, cubic-bezier(0.16,1,0.3,1))" };
const statusBadgeStyle = (isAvailable) => ({ position: "absolute", top: "12px", right: "12px", display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "var(--radius-full, 9999px)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: isAvailable ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)", color: "#fff", backdropFilter: "blur(8px)", zIndex: 2 });
const statusDotStyle = (isAvailable) => ({ width: "6px", height: "6px", borderRadius: "50%", background: "#fff", animation: isAvailable ? "pulse-dot 2s ease-in-out infinite" : "none" });
const heartBtnStyle = { position: "absolute", top: "12px", left: "12px", width: "38px", height: "38px", borderRadius: "50%", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", transition: "all 0.2s", zIndex: 2 };
const contentStyle = { padding: "18px 20px 20px" };
const contentHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "12px" };
const propertyTitleStyle = { fontFamily: "var(--font-display, 'Inter', sans-serif)", fontSize: "1.1rem", fontWeight: 700, color: "var(--gray-900, #111827)", margin: 0, lineHeight: 1.3, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const priceBlockStyle = { textAlign: "right", flexShrink: 0 };
const priceStyle = { fontFamily: "var(--font-display, 'Inter', sans-serif)", fontSize: "1.2rem", fontWeight: 800, color: "var(--primary-600, #2563eb)" };
const pricePeriodStyle = { fontSize: "0.75rem", color: "var(--gray-400, #9ca3af)", fontWeight: 500 };
const locationRowStyle = { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "var(--gray-500, #6b7280)", marginBottom: "16px" };
const nextAvailableTagStyle = { display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "var(--radius-md, 8px)", background: "linear-gradient(135deg, #fff7ed, #fef3c7)", border: "1px solid #fed7aa", color: "#c2410c", fontSize: "0.8rem", fontWeight: 600, marginBottom: "12px" };
const actionsRowStyle = { display: "flex", gap: "8px" };
const rentBtnStyle = (isAvailable, isRenting) => ({ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 16px", borderRadius: "var(--radius-md, 8px)", fontSize: "0.85rem", fontWeight: 600, border: "none", cursor: isAvailable && !isRenting ? "pointer" : "not-allowed", transition: "all 0.2s var(--ease-out, cubic-bezier(0.16,1,0.3,1))", background: isAvailable && !isRenting ? "var(--primary-500, #3b82f6)" : "var(--gray-200, #e5e7eb)", color: isAvailable && !isRenting ? "#fff" : "var(--gray-500, #6b7280)", opacity: isRenting ? 0.8 : 1 });
const removeBtnStyle = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 14px", borderRadius: "var(--radius-md, 8px)", fontSize: "0.85rem", fontWeight: 600, border: "1.5px solid var(--gray-200, #e5e7eb)", background: "transparent", color: "var(--gray-600, #4b5563)", cursor: "pointer", transition: "all 0.2s var(--ease-out, cubic-bezier(0.16,1,0.3,1))" };
const spinnerStyle = { display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" };
const errorCardStyle = { textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: "var(--radius-xl, 16px)", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))", border: "1px solid var(--gray-100, #f3f4f6)" };
const retryBtnStyle = { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 24px", borderRadius: "var(--radius-md, 8px)", background: "var(--primary-500, #3b82f6)", color: "#fff", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s var(--ease-out, cubic-bezier(0.16,1,0.3,1))" };
const emptyCardStyle = { textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: "var(--radius-xl, 16px)", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))", border: "1px solid var(--gray-100, #f3f4f6)" };
const emptyIconWrapStyle = { width: "100px", height: "100px", borderRadius: "50%", background: "var(--gray-50, #f9fafb)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" };
const browseBtnStyle = { display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", borderRadius: "var(--radius-md, 8px)", background: "var(--primary-500, #3b82f6)", color: "#fff", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer", textDecoration: "none", boxShadow: "0 4px 14px rgba(59,130,246,0.25)", transition: "all 0.2s var(--ease-out, cubic-bezier(0.16,1,0.3,1))" };

// Modal styles
const modalOverlayStyle = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" };
const modalContainerStyle = { background: "#fff", borderRadius: "var(--radius-2xl, 24px)", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflow: "hidden", position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", animation: "scaleIn 0.25s var(--ease-out, cubic-bezier(0.16,1,0.3,1))" };
const modalCloseBtnStyle = { position: "absolute", top: "16px", right: "16px", zIndex: 10, width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", color: "#fff", transition: "all 0.2s" };
const modalImageWrapStyle = { position: "relative", width: "100%", height: "320px", overflow: "hidden", flexShrink: 0 };
const modalImageStyle = { width: "100%", height: "100%", objectFit: "cover" };
const modalBodyStyle = { padding: "28px 32px 32px", overflowY: "auto", flex: 1 };
const modalTitleStyle = { fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)", fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900, #111827)", margin: 0, lineHeight: 1.25, flex: 1 };
const modalPriceStyle = { fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, color: "var(--primary-600, #2563eb)" };
const modalLocationStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.95rem", color: "var(--gray-500, #6b7280)", marginBottom: "12px" };
const modalSectionStyle = { marginBottom: "20px" };
const modalSectionTitleStyle = { fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, color: "var(--gray-900, #111827)", marginBottom: "10px" };
const modalDescStyle = { fontSize: "0.92rem", color: "var(--gray-600, #4b5563)", lineHeight: 1.7, margin: 0 };
const modalAvailableAgainStyle = { display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg, #fff7ed, #fef3c7)", border: "1px solid #fed7aa", color: "#c2410c", marginBottom: "20px" };
const modalDetailCardStyle = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "var(--gray-50, #f9fafb)", border: "1px solid var(--gray-100, #f3f4f6)" };
const modalReviewCardStyle = { padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--gray-50, #f9fafb)", border: "1px solid var(--gray-100, #f3f4f6)" };
const modalLinkBtnStyle = { background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "var(--primary-600, #2563eb)", padding: "4px 8px", borderRadius: "var(--radius-sm)" };
const modalVirtualTourBtnStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "14px 20px", borderRadius: "var(--radius-lg)", fontSize: "0.95rem", fontWeight: 700, border: "2px solid var(--primary-400, #60a5fa)", cursor: "pointer", transition: "all 0.25s var(--ease-out, cubic-bezier(0.16,1,0.3,1))", background: "linear-gradient(135deg, var(--primary-500, #3b82f6), var(--accent-500, #8b5cf6))", color: "#fff", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)" };
const modalActionBtnStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px 18px", borderRadius: "var(--radius-lg)", fontSize: "0.9rem", fontWeight: 600, border: "1.5px solid var(--gray-200, #e5e7eb)", background: "var(--gray-100, #f3f4f6)", color: "var(--gray-700, #374151)", cursor: "pointer", transition: "all 0.2s var(--ease-out, cubic-bezier(0.16,1,0.3,1))" };

export default SavedProperty;
