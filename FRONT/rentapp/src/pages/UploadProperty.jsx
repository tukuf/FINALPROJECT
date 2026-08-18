import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";

function UploadProperty() {
  const [currentStep, setCurrentStep] = useState(0); // 0: list, 1: details, 2: upload rooms, 3: config rooms, 4: hotspots
  const [formData, setFormData] = useState({
    title: "", description: "", price: "", location: "",
    is_available: true, available_from: "", image: null,
  });
  
  const [editingId, setEditingId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Virtual Tour State
  const [rooms, setRooms] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [roomFile, setRoomFile] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [hotspotData, setHotspotData] = useState({
    source_room_id: "", target_room_id: "", title: "", pitch: 0, yaw: 0
  });

  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    if (currentStep === 0) fetchMyProperties();
  }, [currentStep]);

  const fetchMyProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/property/");
      setProperties(response.data);
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (propertyId) => {
    try {
      const res = await api.get(`/api/property/${propertyId}/tour/rooms/`);
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHotspots = async (propertyId) => {
    try {
      const res = await api.get(`/api/property/${propertyId}/tour/hotspots/`);
      setHotspots(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors({ ...errors, image: "Please select a valid image file" });
        return;
      }
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = "Price must be greater than 0";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.image && !editingId) newErrors.image = "Property image is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("location", formData.location);
      data.append("is_available", formData.is_available);
      if (formData.available_from) data.append("available_from", formData.available_from);
      if (formData.image) data.append("image", formData.image);

      let propId = editingId;
      if (editingId) {
        await api.patch(`/api/property/${editingId}/`, data, { headers: { "Content-Type": "multipart/form-data" } });
        Swal.fire("Success", "Property updated successfully!", "success");
      } else {
        const res = await api.post("/api/property/", data, { headers: { "Content-Type": "multipart/form-data" } });
        propId = res.data.id;
        setEditingId(propId);
        Swal.fire("Success", "Property uploaded successfully!", "success");
      }
      
      // Move to next step
      await fetchRooms(propId);
      setCurrentStep(2);
    } catch (error) {
      console.error("Upload error:", error);
      Swal.fire("Error", "Action failed. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (property) => {
    setEditingId(property.id);
    setFormData({
      title: property.title, description: property.description,
      price: property.price, location: property.location,
      is_available: property.is_available, available_from: property.available_from || "",
      image: null,
    });
    setImagePreview(getImageUrl(property.image));
    setCurrentStep(1);
  };

  const handleTourConfig = async (property) => {
    setEditingId(property.id);
    await fetchRooms(property.id);
    setCurrentStep(2);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?", text: "You won't be able to revert this!", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#d33", cancelButtonColor: "#3085d6", confirmButtonText: "Yes, delete it!"
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/api/property/${id}/`);
        Swal.fire("Deleted!", "Property has been removed.", "success");
        fetchMyProperties();
      } catch (err) {
        Swal.fire("Error", "Failed to delete property", "error");
      }
    }
  };

  const handleMakeAvailable = async (property) => {
    try {
      await api.patch(`/api/property/${property.id}/`, {
        status: "Available",
        is_available: true
      });
      Swal.fire("Success", "Property is now available!", "success");
      fetchMyProperties();
    } catch (err) {
      Swal.fire("Error", "Failed to update property status.", "error");
    }
  };

  const handleRemoveReservation = async (property) => {
    const result = await Swal.fire({
      title: "Remove Reservation?",
      text: "This will cancel any active 24-hour reservation and make the house free immediately. Proceed?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, free the house!"
    });
    
    if (result.isConfirmed) {
      try {
        await api.post(`/api/property/${property.id}/remove-reservation/`);
        Swal.fire("Success", "Reservation removed. The house is now free.", "success");
        fetchMyProperties();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Failed to remove reservation.", "error");
      }
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/50x50?text=No+Image";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  // --- VIRTUAL TOUR FUNCTIONS ---
  const handleUploadRoom = async (e) => {
    e.preventDefault();
    if (!roomFile || !roomName.trim()) return Swal.fire("Error", "Name and image required", "error");
    
    const data = new FormData();
    data.append("room_name", roomName);
    data.append("image", roomFile);
    
    try {
      await api.post(`/api/property/${editingId}/tour/rooms/`, data, { headers: { "Content-Type": "multipart/form-data" } });
      Swal.fire("Success", "Room uploaded", "success");
      setRoomFile(null); setRoomName("");
      fetchRooms(editingId);
    } catch (err) {
      Swal.fire("Error", "Failed to upload room", "error");
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if(!window.confirm("Delete this room?")) return;
    try {
      await api.delete(`/api/property/${editingId}/tour/rooms/${roomId}/`);
      fetchRooms(editingId);
    } catch (err) {
      Swal.fire("Error", "Failed to delete room", "error");
    }
  };

  const handleSetInitialRoom = async (roomId) => {
    try {
      await api.patch(`/api/property/${editingId}/tour/rooms/${roomId}/`, { is_initial_room: true });
      fetchRooms(editingId);
      Swal.fire("Success", "Initial room set", "success");
    } catch (err) {
      Swal.fire("Error", "Failed to set initial room", "error");
    }
  };

  const handleAddHotspot = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/property/${editingId}/tour/hotspots/`, hotspotData);
      Swal.fire("Success", "Hotspot added", "success");
      setHotspotData({ source_room_id: "", target_room_id: "", title: "", pitch: 0, yaw: 0 });
      fetchHotspots(editingId);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Failed to add hotspot", "error");
    }
  };

  const handleDeleteHotspot = async (hotspotId) => {
    if(!window.confirm("Delete hotspot?")) return;
    try {
      await api.delete(`/api/property/${editingId}/tour/hotspots/${hotspotId}/`);
      fetchHotspots(editingId);
    } catch (err) {
      Swal.fire("Error", "Failed to delete hotspot", "error");
    }
  };

  return (
    <MainLayout role="ADMIN">
      <div className="upload-property-container">
        <style>{css}</style>
        
        {currentStep > 0 && (
          <div className="wizard-steps">
            <button className={currentStep === 1 ? "active" : ""} onClick={() => setCurrentStep(1)}>1. Details</button>
            <button className={currentStep === 2 ? "active" : ""} onClick={() => { fetchRooms(editingId); setCurrentStep(2); }} disabled={!editingId}>2. Upload Rooms</button>
            <button className={currentStep === 3 ? "active" : ""} onClick={() => { fetchRooms(editingId); setCurrentStep(3); }} disabled={!editingId}>3. Config Rooms</button>
            <button className={currentStep === 4 ? "active" : ""} onClick={() => { fetchRooms(editingId); fetchHotspots(editingId); setCurrentStep(4); }} disabled={!editingId}>4. Hotspots</button>
            <button onClick={() => setCurrentStep(0)} className="btn-close">Finish & Close</button>
          </div>
        )}

        {currentStep === 0 && (
          <div className="manage-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="manage-title">Property Inventory Management</h2>
              <button onClick={() => { 
                setEditingId(null); 
                setFormData({title: "", description: "", price: "", location: "", is_available: true, available_from: "", image: null});
                setImagePreview(null);
                setCurrentStep(1); 
              }} className="btn-action btn-success">➕ Add New Property</button>
            </div>
            
            {loading ? <div className="loading-state">Loading properties...</div> : (
              <div className="table-wrapper">
                <table className="property-table">
                  <thead>
                    <tr><th>ID</th><th>Image</th><th>Title</th><th>Availability</th><th>Price</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {properties.map(p => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td><img src={getImageUrl(p.image)} alt={p.title} className="table-thumb" /></td>
                        <td><div className="cell-title">{p.title}</div><div className="cell-location">📍 {p.location}</div></td>
                        <td><span className={`badge ${p.is_available ? "badge-success" : "badge-danger"}`}>{p.is_available ? "Available" : "Occupied"}</span></td>
                        <td className="cell-price">${p.price}</td>
                        <td>
                          <div className="action-buttons">
                            {p.status === "Reserved" && (
                              <button onClick={() => handleRemoveReservation(p)} className="btn-action btn-success">🔓 Remove Reserved</button>
                            )}
                            {(p.status === "Occupied" || (!p.is_available && p.status !== "Reserved")) && (
                              <button onClick={() => handleMakeAvailable(p)} className="btn-action btn-success">✅ Make Available</button>
                            )}
                            <button onClick={() => handleEdit(p)} className="btn-action btn-warning">✏️ Edit</button>
                            <button onClick={() => handleTourConfig(p)} className="btn-action btn-info">📷 Tour Config</button>
                            <button onClick={() => handleDelete(p.id)} className="btn-action btn-danger">🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {properties.length === 0 && <tr><td colSpan="6" className="empty-state">No properties found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="upload-form-card">
            <h2>{editingId ? "Edit Property Details" : "Upload Property Details"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required min="0" step="0.01"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Available From</label>
                  <input type="date" name="available_from" value={formData.available_from} onChange={handleChange} className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="form-textarea" required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Property Cover Image *</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="form-input" />
                </div>
                <div className="form-group checkbox-wrapper">
                  <input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleChange} id="avail" />
                  <label htmlFor="avail">Property is available</label>
                </div>
              </div>
              {imagePreview && <img src={imagePreview} style={{maxHeight: 150, marginTop: 10}} alt="preview" />}
              <div className="form-actions mt-4">
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save & Continue to Rooms ➡️"}
                </button>
              </div>
            </form>
          </div>
        )}

        {currentStep === 2 && (
          <div className="upload-form-card">
            <h2>Upload 360° Rooms</h2>
            <form onSubmit={handleUploadRoom} className="form-grid" style={{alignItems: 'end'}}>
              <div className="form-group">
                <label className="form-label">Room Name *</label>
                <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} className="form-input" placeholder="e.g. Living Room" required />
              </div>
              <div className="form-group">
                <label className="form-label">360 Image *</label>
                <input type="file" accept="image/*" onChange={e => setRoomFile(e.target.files[0])} className="form-input" required />
              </div>
              <button type="submit" className="submit-btn">Upload Room</button>
            </form>

            <h3 className="mt-4">Uploaded Rooms ({rooms.length})</h3>
            <div className="room-grid">
              {rooms.map(r => (
                <div key={r.id} className="room-card">
                  <img src={r.image_url || getImageUrl(r.image)} alt={r.room_name} />
                  <p>{r.room_name}</p>
                  <button onClick={() => handleDeleteRoom(r.id)} className="btn-action btn-danger">Delete</button>
                </div>
              ))}
            </div>
            
            <div className="form-actions mt-4">
              <button onClick={() => setCurrentStep(3)} className="submit-btn">Continue to Configuration ➡️</button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="upload-form-card">
            <h2>Configure Rooms (Initial Room)</h2>
            <p>Select which room should be the starting point of the virtual tour.</p>
            <table className="property-table mt-4">
              <thead><tr><th>Room Name</th><th>Initial?</th><th>Actions</th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td>{r.room_name}</td>
                    <td>{r.is_initial_room ? <span className="badge badge-success">Yes</span> : "No"}</td>
                    <td>
                      {!r.is_initial_room && (
                        <button onClick={() => handleSetInitialRoom(r.id)} className="btn-action btn-info">Set as Initial</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="form-actions mt-4">
              <button onClick={() => {fetchHotspots(editingId); setCurrentStep(4);}} className="submit-btn">Continue to Hotspots ➡️</button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="upload-form-card">
            <h2>Configure Hotspots</h2>
            <p>Connect rooms together so users can navigate between them.</p>
            
            <form onSubmit={handleAddHotspot} className="form-grid mt-4">
              <div className="form-group">
                <label className="form-label">Source Room</label>
                <select className="form-input" required value={hotspotData.source_room_id} onChange={e => setHotspotData({...hotspotData, source_room_id: e.target.value})}>
                  <option value="">Select...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target Room</label>
                <select className="form-input" required value={hotspotData.target_room_id} onChange={e => setHotspotData({...hotspotData, target_room_id: e.target.value})}>
                  <option value="">Select...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hotspot Title / Label</label>
                <input type="text" className="form-input" required value={hotspotData.title} onChange={e => setHotspotData({...hotspotData, title: e.target.value})} placeholder="e.g. Go to Kitchen" />
              </div>
              <div className="form-group">
                <label className="form-label">Pitch (Vertical Angle)</label>
                <input type="number" className="form-input" value={hotspotData.pitch} onChange={e => setHotspotData({...hotspotData, pitch: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Yaw (Horizontal Angle)</label>
                <input type="number" className="form-input" value={hotspotData.yaw} onChange={e => setHotspotData({...hotspotData, yaw: e.target.value})} />
              </div>
              <div className="form-group" style={{justifyContent: 'end'}}>
                <button type="submit" className="submit-btn" style={{height: 44}}>Add Hotspot</button>
              </div>
            </form>

            <h3 className="mt-4">Current Hotspots ({hotspots.length})</h3>
            <table className="property-table">
              <thead><tr><th>Source</th><th>Target</th><th>Label</th><th>Pitch/Yaw</th><th>Actions</th></tr></thead>
              <tbody>
                {hotspots.map(h => (
                  <tr key={h.id}>
                    <td>{rooms.find(r => r.id === h.source_room_id)?.room_name || h.source_room_id}</td>
                    <td>{rooms.find(r => r.id === h.target_room_id)?.room_name || h.target_room_id}</td>
                    <td>{h.title}</td>
                    <td>{h.pitch} / {h.yaw}</td>
                    <td><button onClick={() => handleDeleteHotspot(h.id)} className="btn-action btn-danger">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="form-actions mt-4">
              <button onClick={() => setCurrentStep(0)} className="submit-btn">✅ Finish Setup</button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

const css = `
  :root {
    --primary-600: #2563eb; --primary-700: #1d4ed8;
    --gray-50: #f9fafb; --gray-100: #f3f4f6; --gray-200: #e5e7eb; --gray-300: #d1d5db;
    --gray-500: #6b7280; --gray-700: #374151; --gray-800: #1f2937; --gray-900: #111827;
    --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.08); --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
  }
  .upload-property-container { max-width: 1200px; margin: 0 auto; padding: 24px; font-family: 'Inter', sans-serif; }
  .wizard-steps { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
  .wizard-steps button { padding: 10px 20px; border: none; border-radius: var(--radius-md); background: var(--gray-200); cursor: pointer; font-weight: 600; }
  .wizard-steps button.active { background: var(--primary-600); color: white; }
  .wizard-steps button:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-close { margin-left: auto; background: var(--gray-800) !important; color: white; }
  .upload-form-card { background: #fff; border-radius: var(--radius-lg); padding: 36px; box-shadow: var(--shadow-lg); border: 1px solid var(--gray-100); }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
  .form-group { display: flex; flex-direction: column; margin-bottom: 16px; }
  .form-label { font-size: 0.88rem; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; }
  .form-input, .form-textarea, .form-select { padding: 11px 14px; border: 1.5px solid var(--gray-300); border-radius: var(--radius-md); font-size: 0.95rem; }
  .form-textarea { resize: vertical; min-height: 100px; }
  .checkbox-wrapper { flex-direction: row; align-items: center; gap: 10px; }
  .submit-btn { padding: 13px 28px; background: #16a34a; color: #fff; border: none; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; }
  .submit-btn:disabled { background: var(--gray-400); }
  .manage-section { background: #fff; border-radius: var(--radius-lg); padding: 32px; box-shadow: var(--shadow-lg); }
  .manage-title { font-size: 1.6rem; margin: 0; }
  .table-wrapper { overflow-x: auto; border: 1px solid var(--gray-200); border-radius: var(--radius-md); }
  .property-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  .property-table th { background: var(--gray-50); padding: 14px; text-align: left; }
  .property-table td { padding: 14px; border-bottom: 1px solid var(--gray-100); }
  .table-thumb { width: 60px; height: 40px; object-fit: cover; border-radius: 4px; }
  .badge { padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
  .badge-success { background: #dcfce7; color: #166534; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .action-buttons { display: flex; gap: 8px; }
  .btn-action { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; font-size: 0.8rem;}
  .btn-warning { background: #f59e0b; }
  .btn-info { background: #0891b2; }
  .btn-danger { background: #ef4444; }
  .btn-success { background: #10b981; font-size: 0.95rem; padding: 10px 20px;}
  .room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
  .room-card { border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 10px; text-align: center; }
  .room-card img { width: 100%; height: 120px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 10px; }
  .mt-4 { margin-top: 1.5rem; }
`;

export default UploadProperty;
