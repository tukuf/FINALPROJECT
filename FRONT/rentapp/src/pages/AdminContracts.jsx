import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import { FaEye, FaDownload, FaEdit, FaTrash } from "react-icons/fa";

function AdminContracts() {
  const location = useLocation();
  const [contracts, setContracts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    user: "",
    property: "",
    rent_amount: "",
    start_date: "",
    end_date: "",
    terms: "",
  });

  const [summary, setSummary] = useState({
    clientName: "",
    propertyName: "",
    propertyPrice: 0,
    totalRent: 0,
    durationMonths: 0,
  });

  // Modal states
  const [viewContract, setViewContract] = useState(null);
  const [editContract, setEditContract] = useState(null);
  const [editForm, setEditForm] = useState({
    rent_amount: "",
    start_date: "",
    end_date: "",
    terms: "",
    status: "",
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(location.search);
    const userId = params.get("user");
    const propertyId = params.get("property");
    if (userId && propertyId) {
      setForm((prev) => ({ ...prev, user: userId, property: propertyId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (requests.length > 0 && form.user && form.property) {
      const matched = requests.find(
        (r) =>
          String(r.user.id) === String(form.user) &&
          String(r.property.id) === String(form.property)
      );
      if (matched) autoFillFromRequest(matched);
    }
  }, [form.user, form.property, requests]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, requestsRes] = await Promise.all([
        api.get("/api/contract/"),
        api.get("/api/rental_request/"),
      ]);
      setContracts(contractsRes.data);
      setRequests(requestsRes.data.filter((r) => r.status === "APPROVED"));
    } catch (err) {
      Swal.fire("Error", "Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const autoFillFromRequest = (request) => {
    let durationMonths = 1;
    if (request.start_date && request.end_date) {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      durationMonths = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24 * 30)));
    }
    const price = parseFloat(request.property.price) || 0;
    const totalRent = durationMonths * price;

    setForm({
      user: String(request.user.id),
      property: String(request.property.id),
      rent_amount: totalRent.toFixed(2),
      start_date: request.start_date || "",
      end_date: request.end_date || "",
      terms: "",
    });
    setSummary({
      clientName: request.user.username,
      propertyName: request.property.title,
      propertyPrice: price,
      totalRent,
      durationMonths,
    });

    Swal.fire({
      title: "Request Auto-Filled",
      html: "<strong>" + request.user.username + "</strong> requested <strong>" + request.property.title + "</strong> for <strong>" + durationMonths + " month(s)</strong><br/>Total rent: <strong>$" + totalRent.toFixed(2) + "</strong>",
      icon: "info",
      confirmButtonText: "OK",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "user" || name === "property") {
      if (value) {
        const matched = requests.find(
          (r) =>
            String(r.user.id) === String(name === "user" ? value : form.user) &&
            String(r.property.id) === String(name === "property" ? value : form.property)
        );
        if (matched) {
          const price = parseFloat(matched.property.price) || 0;
          let durationMonths = 1;
          if (matched.start_date && matched.end_date) {
            const start = new Date(matched.start_date);
            const end = new Date(matched.end_date);
            durationMonths = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24 * 30)));
          }
          const totalRent = durationMonths * price;
          setSummary({ clientName: matched.user.username, propertyName: matched.property.title, propertyPrice: price, totalRent, durationMonths });
        } else {
          setSummary({ clientName: "", propertyName: "", propertyPrice: 0, totalRent: 0, durationMonths: 0 });
        }
      }
    }

    if (name === "start_date" || name === "end_date") {
      const startVal = name === "start_date" ? value : form.start_date;
      const endVal = name === "end_date" ? value : form.end_date;
      if (startVal && endVal) {
        const start = new Date(startVal);
        const end = new Date(endVal);
        if (end > start) {
          const durationMonths = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24 * 30)));
          const price = summary.propertyPrice || 0;
          if (price > 0) {
            setSummary((prev) => ({ ...prev, durationMonths, totalRent: durationMonths * price }));
            setForm((prev) => ({ ...prev, rent_amount: (durationMonths * price).toFixed(2) }));
          }
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user || !form.property || !form.rent_amount || !form.start_date || !form.end_date || !form.terms) {
      Swal.fire("Validation Error", "Please fill in all required fields.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/contract/", {
        user: parseInt(form.user),
        property: parseInt(form.property),
        rent_amount: parseFloat(form.rent_amount),
        start_date: form.start_date,
        end_date: form.end_date,
        terms: form.terms,
      });
      Swal.fire({ title: "Contract Created!", text: "The contract has been sent successfully.", icon: "success", confirmButtonText: "Great!" });
      setForm({ user: "", property: "", rent_amount: "", start_date: "", end_date: "", terms: "" });
      setSummary({ clientName: "", propertyName: "", propertyPrice: 0, totalRent: 0, durationMonths: 0 });
      fetchData();
    } catch (err) {
      Swal.fire("Error", "Failed to create contract.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (contractId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/contract/${contractId}/`);
          setContracts((prev) => prev.filter((c) => c.id !== contractId));
          Swal.fire("Deleted!", "The contract has been deleted.", "success");
        } catch (err) {
          Swal.fire("Error", "Failed to delete the contract.", "error");
        }
      }
    });
  };

  const openEditModal = (contract) => {
    setEditContract(contract);
    setEditForm({
      rent_amount: contract.rent_amount,
      start_date: contract.start_date,
      end_date: contract.end_date,
      terms: contract.terms,
      status: contract.status,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.patch(`/api/contract/${editContract.id}/`, {
        rent_amount: parseFloat(editForm.rent_amount),
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        terms: editForm.terms,
        status: editForm.status,
      });
      setContracts((prev) => prev.map((c) => (c.id === editContract.id ? res.data : c)));
      Swal.fire("Updated!", "Contract details have been updated.", "success");
      setEditContract(null);
    } catch (err) {
      Swal.fire("Error", "Failed to update contract.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const generatePDF = (contract) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    
    // Helper function for centered text
    const centerText = (text, y, fontSize, fontStyle = "normal", color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.setTextColor(...color);
      doc.text(text, pw / 2, y, { align: "center" });
    };

    // Header Background
    doc.setFillColor(31, 41, 55); // Dark Slate Gray
    doc.rect(0, 0, pw, 35, "F");

    // "Logo" and Title
    centerText("RentalHub", 16, 22, "bold", [255, 255, 255]);
    centerText("RESIDENTIAL LEASE AGREEMENT", 26, 11, "bold", [200, 200, 200]);

    let y = 45;
    const leftMargin = 15;
    const rightMargin = pw - 15;
    
    // Contract Meta
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(`Contract Reference: #${contract.id}`, leftMargin, y);
    doc.text(`Execution Date: ${new Date().toLocaleDateString()}`, rightMargin - 45, y);
    
    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(leftMargin, y, rightMargin, y);
    y += 6;

    // Parties & Property Layout
    const half = pw / 2;
    doc.setFontSize(10);
    
    // Left Column (Parties)
    doc.setFont("helvetica", "bold");
    doc.text("1. PARTIES", leftMargin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Tenant (Customer): ${contract.user?.username || "N/A"}`, leftMargin, y);
    y += 5;
    doc.text(`Landlord (Owner/Admin): ${contract.property?.owner?.username || "RentalHub Administration"}`, leftMargin, y);

    // Right Column (Property Info)
    let yProp = y - 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. PROPERTY DETAILS", half, yProp);
    yProp += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Title: ${contract.property?.title || "N/A"}`, half, yProp);
    yProp += 5;
    
    const locLines = doc.splitTextToSize(`Location: ${contract.property?.location || "N/A"}`, half - 15);
    doc.text(locLines, half, yProp);
    yProp += locLines.length * 5;
    
    doc.setFont("helvetica", "italic");
    const desc = doc.splitTextToSize(`Description: ${contract.property?.description || "N/A"}`, half - 15);
    doc.text(desc, half, yProp);
    yProp += desc.length * 5;
    
    if (contract.property?.has_virtual_tour) {
      doc.text(`Virtual Tour: Local tour configured`, half, yProp);
    }
    
    y = Math.max(y + 8, yProp + 5);
    
    // Rental Period and Payment
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("3. RENTAL PERIOD & PAYMENT", leftMargin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Lease Term: ${contract.start_date || "N/A"} to ${contract.end_date || "N/A"}`, leftMargin, y);
    doc.text(`Monthly Rate: $${parseFloat(contract.property?.price || 0).toFixed(2)}`, half, y);
    y += 5;
    doc.text(`Total Contract Value: $${parseFloat(contract.rent_amount || 0).toFixed(2)}`, leftMargin, y);
    
    y += 6;
    doc.line(leftMargin, y, rightMargin, y);
    y += 8;

    // Terms and Conditions
    centerText("TERMS AND CONDITIONS", y, 11, "bold", [0, 0, 0]);
    y += 7;

    doc.setFontSize(8.5);
    
    const termsList = [
      { t: "Customer Responsibility:", d: "The customer agrees to maintain the property in good condition, respect the house rules, and use all facilities responsibly." },
      { t: "Maintenance Responsibility:", d: "The customer is responsible for basic daily maintenance and must report damages or technical issues to the property owner/management promptly." },
      { t: "Proper Usage Rules:", d: "The property must only be used for approved residential purposes. Illegal activities, unauthorized modifications, or misuse of facilities are not allowed." },
      { t: "Damage and Repair Conditions:", d: "Any damage caused by negligence or misuse may require the customer to cover repair or replacement costs according to the agreement." },
      { t: "Termination and Cancellation Conditions:", d: "The agreement may be terminated according to the rental terms, cancellation policy, or violation of contract conditions." },
      { t: "Privacy and Security Rules:", d: "Both parties must protect personal information and respect the security and privacy of the property and occupants." },
      { t: "Agreement and Acceptance:", d: "By accepting this contract, both parties confirm that they understand and agree to all stated terms and conditions." }
    ];

    termsList.forEach(term => {
      doc.setFont("helvetica", "bold");
      doc.text(term.t, leftMargin, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(term.d, pw - leftMargin * 2);
      doc.text(lines, leftMargin, y + 4);
      y += (lines.length * 4) + 3;
    });

    // Final agreement statement and Signatures
    y = ph - 55; // Align to bottom
    doc.setDrawColor(200, 200, 200);
    doc.line(leftMargin, y, rightMargin, y);
    y += 5;
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    const statement = "By signing below, both parties acknowledge that they have read, understood, and accept this entire agreement, including all terms and conditions stated above.";
    const statementLines = doc.splitTextToSize(statement, pw - leftMargin * 2);
    doc.text(statementLines, leftMargin, y);
    
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    
    // Landlord Sig
    doc.text("_____________________________________", leftMargin, y);
    doc.text("Property Owner / Authorized Admin", leftMargin, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text("Date: __________________", leftMargin, y + 10);
    
    // Tenant Sig
    doc.setFont("helvetica", "bold");
    doc.text("_____________________________________", half + 10, y);
    doc.text("Tenant (Customer)", half + 10, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text("Date: __________________", half + 10, y + 10);

    // Footer
    centerText("This is an electronically generated document by RentalHub Management System. It serves as a legally binding contract.", ph - 8, 7, "italic", [150, 150, 150]);

    doc.save(`RentalHub_Contract_${contract.id}_${contract.user?.username || "Client"}.pdf`);

    if (contract.status === "SENT") {
      updateContractStatus(contract.id, "SIGNED");
    }
  };

  const updateContractStatus = async (contractId, newStatus) => {
    try {
      await api.patch("/api/contract/" + contractId + "/", { status: newStatus });
      setContracts((prev) => prev.map((c) => (c.id === contractId ? { ...c, status: newStatus } : c)));
      Swal.fire({ title: "Status Updated", text: "Contract has been marked as " + newStatus + ".", icon: "success", timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", "Failed to update status.", "error");
    }
  };

  const pendingContracts = requests.filter(
    (r) => !contracts.some((c) => c.user?.username === r.user?.username && c.property?.id === r.property?.id)
  );

  const fmt = (val) => "$" + parseFloat(val || 0).toFixed(2);

  return (
    <MainLayout role="ADMIN">
      <div className="page-container">
        <div className="section-header animate-fade-in-up">
          <div>
            <h1 className="section-title">Contract Management</h1>
            <p className="section-subtitle">Create, manage, and track rental contracts</p>
          </div>
        </div>

        {/* Generate New Contract */}
        <div className="card animate-fade-in-up delay-1" style={{ padding: "28px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: "20px" }}>Generate New Contract</h2>

          {summary.clientName && summary.propertyName && (
            <div style={{ background: "var(--primary-50)", borderRadius: "var(--radius-md)", padding: "16px 20px", marginBottom: "16px", border: "1px solid var(--primary-100)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>Client:</span>
                <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>{summary.clientName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>Property:</span>
                <span style={{ fontWeight: 600, color: "var(--gray-800)" }}>{summary.propertyName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>Monthly Price:</span>
                <span style={{ fontWeight: 600, color: "var(--primary-600)" }}>{"$" + summary.propertyPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>Duration:</span>
                <span style={{ fontWeight: 600 }}>{summary.durationMonths} month(s)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>Total Rent:</span>
                <span style={{ fontWeight: 700, color: "var(--success-600)", fontSize: "1.1rem" }}>{"$" + summary.totalRent.toFixed(2)}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="input-group">
                <label style={labelStyle}>Client ID *</label>
                <input type="number" name="user" value={form.user} onChange={handleChange} placeholder="Enter client ID" className="input-field" required />
              </div>
              <div className="input-group">
                <label style={labelStyle}>Property ID *</label>
                <input type="number" name="property" value={form.property} onChange={handleChange} placeholder="Enter property ID" className="input-field" required />
              </div>
              <div className="input-group">
                <label style={labelStyle}>Rent Amount *</label>
                <input type="number" name="rent_amount" value={form.rent_amount} onChange={handleChange} placeholder="0.00" step="0.01" className="input-field" required />
              </div>
              <div className="input-group">
                <label style={labelStyle}>Start Date *</label>
                <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="input-field" required />
              </div>
              <div className="input-group">
                <label style={labelStyle}>End Date *</label>
                <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className="input-field" required />
              </div>
            </div>
            <div className="input-group">
              <label style={labelStyle}>Terms & Conditions *</label>
              <textarea name="terms" value={form.terms} onChange={handleChange} placeholder="Enter contract terms and conditions..." className="input-field" rows="4" required />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-success btn-lg" style={{ alignSelf: "flex-start" }}>
              {submitting ? "Sending..." : "Send Contract to Client"}
            </button>
          </form>
        </div>

        {/* Pending Contracts */}
        <div className="card animate-fade-in-up delay-2" style={{ padding: "28px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--warning-600)", marginBottom: "20px" }}>Pending Contracts (Approved Requests)</h2>
          {pendingContracts.length > 0 ? (
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--gray-50)", borderBottom: "1px solid var(--gray-100)" }}>
                    <th style={thStyle}>Client</th>
                    <th style={thStyle}>Property</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingContracts.map((req) => (
                    <tr key={req.id} style={{ borderBottom: "1px solid var(--gray-50)" }}>
                      <td style={tdStyle}>{req.user.username}</td>
                      <td style={tdStyle}>{req.property.title}</td>
                      <td style={tdStyle}>{fmt(req.property.price)}/mo</td>
                      <td style={tdStyle}>
                        <button onClick={() => autoFillFromRequest(req)} className="btn btn-primary btn-sm">Prepare Contract</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--gray-400)", textAlign: "center", padding: "24px" }}>No pending approved requests.</p>
          )}
        </div>

        {/* All Contracts */}
        <div className="card animate-fade-in-up delay-3" style={{ padding: "28px" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: "20px" }}>Sent / Signed Contracts</h2>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--gray-400)" }}>Loading...</div>
          ) : (
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--gray-50)", borderBottom: "1px solid var(--gray-100)" }}>
                    <th style={thStyle}>Client</th>
                    <th style={thStyle}>Property</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--gray-50)" }}>
                      <td style={tdStyle}>{c.user.username}</td>
                      <td style={tdStyle}>{c.property.title}</td>
                      <td style={tdStyle}>{fmt(c.rent_amount)}</td>
                      <td style={tdStyle}>
                        <span className={c.status === "SIGNED" ? "badge badge-success" : "badge badge-warning"}>{c.status}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => setViewContract(c)} className="btn btn-ghost btn-sm" title="View Details" style={{ color: "var(--primary-600)" }}>
                            <FaEye />
                          </button>
                          <button onClick={() => generatePDF(c)} className="btn btn-ghost btn-sm" title="Download PDF" style={{ color: "var(--success-600)" }}>
                            <FaDownload />
                          </button>
                          <button onClick={() => openEditModal(c)} className="btn btn-ghost btn-sm" title="Edit" style={{ color: "var(--warning-600)" }}>
                            <FaEdit />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="btn btn-ghost btn-sm" title="Delete" style={{ color: "var(--danger-600)" }}>
                            <FaTrash />
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
      </div>

      {/* View Modal */}
      {viewContract && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="animate-scale-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Contract Details</h2>
              <button onClick={() => setViewContract(null)} style={closeBtnStyle}>&times;</button>
            </div>
            <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
              <div><strong>Client:</strong> {viewContract.user?.username}</div>
              <div><strong>Property:</strong> {viewContract.property?.title}</div>
              <div><strong>Rent Amount:</strong> {fmt(viewContract.rent_amount)}</div>
              <div><strong>Start Date:</strong> {viewContract.start_date}</div>
              <div><strong>End Date:</strong> {viewContract.end_date}</div>
              <div><strong>Status:</strong> {viewContract.status}</div>
              <div>
                <strong>Terms:</strong>
                <div style={{ background: "var(--gray-50)", padding: "12px", borderRadius: "8px", marginTop: "8px", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                  {viewContract.terms}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewContract(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editContract && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="animate-scale-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Edit Contract</h2>
              <button onClick={() => setEditContract(null)} style={closeBtnStyle}>&times;</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="input-group">
                <label style={labelStyle}>Rent Amount</label>
                <input type="number" name="rent_amount" value={editForm.rent_amount} onChange={handleEditChange} step="0.01" className="input-field" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" name="start_date" value={editForm.start_date} onChange={handleEditChange} className="input-field" required />
                </div>
                <div className="input-group">
                  <label style={labelStyle}>End Date</label>
                  <input type="date" name="end_date" value={editForm.end_date} onChange={handleEditChange} className="input-field" required />
                </div>
              </div>
              <div className="input-group">
                <label style={labelStyle}>Status</label>
                <select name="status" value={editForm.status} onChange={handleEditChange} className="input-field" required>
                  <option value="SENT">SENT</option>
                  <option value="SIGNED">SIGNED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div className="input-group">
                <label style={labelStyle}>Terms</label>
                <textarea name="terms" value={editForm.terms} onChange={handleEditChange} className="input-field" rows="4" required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setEditContract(null)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={updating} className="btn btn-success">{updating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

const modalOverlayStyle = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
};
const modalContentStyle = {
  background: "#fff", padding: "32px", borderRadius: "16px",
  width: "100%", maxWidth: "500px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  maxHeight: "90vh", overflowY: "auto"
};
const closeBtnStyle = {
  background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--gray-500)"
};

const labelStyle = { fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)" };
const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray-500)" };
const tdStyle = { padding: "14px 16px", fontSize: "0.9rem", color: "var(--gray-700)" };

export default AdminContracts;
