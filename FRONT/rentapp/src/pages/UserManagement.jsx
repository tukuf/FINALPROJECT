import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../services/authService";
import Swal from "sweetalert2";
import { FaEye, FaEdit, FaTrash, FaSearch } from "react-icons/fa";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Modal states
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    is_active: true,
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = users.filter((u) => 
      u.username?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/user/");
      setUsers(response.data);
    } catch (err) {
      Swal.fire("Error", "Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (userId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Deleting a user will also delete their related data!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete user!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/user/${userId}/`);
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          Swal.fire("Deleted!", "The user has been deleted.", "success");
        } catch (err) {
          Swal.fire("Error", "Failed to delete the user.", "error");
        }
      }
    });
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      address: user.address || "",
      is_active: user.is_active,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.patch(`/api/user/${editUser.id}/`, editForm);
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? res.data : u)));
      Swal.fire("Updated!", "User details have been updated.", "success");
      setEditUser(null);
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : "Failed to update user.";
      Swal.fire("Error", errorMsg, "error");
    } finally {
      setUpdating(false);
    }
  };

  // Pagination Logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <MainLayout role="ADMIN">
      <div className="page-container">
        <div className="section-header animate-fade-in-up">
          <div>
            <h1 className="section-title">User Management</h1>
            <p className="section-subtitle">View, edit, and manage registered users</p>
          </div>
        </div>

        <div className="card animate-fade-in-up delay-1" style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--gray-800)", margin: 0 }}>All Users</h2>
            <div style={{ position: "relative", width: "300px" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: "36px" }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--gray-400)" }}>Loading users...</div>
          ) : (
            <>
              <div className="table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--gray-50)", borderBottom: "1px solid var(--gray-100)" }}>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Username</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.length > 0 ? currentUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--gray-50)" }}>
                        <td style={tdStyle}>{u.id}</td>
                        <td style={tdStyle}><span style={{ fontWeight: 600 }}>{u.username}</span></td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}>
                          <span className={`badge ${u.is_staff ? "badge-primary" : "badge-secondary"}`}>
                            {u.is_staff ? "Admin" : "Client"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => setViewUser(u)} className="btn btn-ghost btn-sm" title="View Details" style={{ color: "var(--primary-600)" }}>
                              <FaEye />
                            </button>
                            <button onClick={() => openEditModal(u)} className="btn btn-ghost btn-sm" title="Edit" style={{ color: "var(--warning-600)" }}>
                              <FaEdit />
                            </button>
                            {/* Prevent self deletion visually, although backend allows it */}
                            <button onClick={() => handleDelete(u.id)} className="btn btn-ghost btn-sm" title="Delete" style={{ color: "var(--danger-600)" }}>
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--gray-400)" }}>
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>
                    Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} entries
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-ghost btn-sm"
                    >
                      Prev
                    </button>
                    <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: "0.9rem", fontWeight: 600 }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-ghost btn-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewUser && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="animate-scale-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>User Details</h2>
              <button onClick={() => setViewUser(null)} style={closeBtnStyle}>&times;</button>
            </div>
            <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
              <div><strong>ID:</strong> {viewUser.id}</div>
              <div><strong>Username:</strong> {viewUser.username}</div>
              <div><strong>Email:</strong> {viewUser.email}</div>
              <div><strong>First Name:</strong> {viewUser.first_name || "N/A"}</div>
              <div><strong>Last Name:</strong> {viewUser.last_name || "N/A"}</div>
              <div><strong>Phone:</strong> {viewUser.phone || "N/A"}</div>
              <div><strong>Address:</strong> {viewUser.address || "N/A"}</div>
              <div><strong>Role:</strong> {viewUser.is_staff ? "Admin" : "Client"}</div>
              <div><strong>Status:</strong> <span style={{ color: viewUser.is_active ? "var(--success-600)" : "var(--danger-600)", fontWeight: 600 }}>{viewUser.is_active ? "Active" : "Inactive"}</span></div>
              <div><strong>Date Joined:</strong> {new Date(viewUser.date_joined).toLocaleDateString()}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewUser(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle} className="animate-scale-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Edit User</h2>
              <button onClick={() => setEditUser(null)} style={closeBtnStyle}>&times;</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label style={labelStyle}>Username</label>
                  <input type="text" name="username" value={editForm.username} onChange={handleEditChange} className="input-field" required />
                </div>
                <div className="input-group">
                  <label style={labelStyle}>Email</label>
                  <input type="email" name="email" value={editForm.email} onChange={handleEditChange} className="input-field" required />
                </div>
                <div className="input-group">
                  <label style={labelStyle}>First Name</label>
                  <input type="text" name="first_name" value={editForm.first_name} onChange={handleEditChange} className="input-field" />
                </div>
                <div className="input-group">
                  <label style={labelStyle}>Last Name</label>
                  <input type="text" name="last_name" value={editForm.last_name} onChange={handleEditChange} className="input-field" />
                </div>
                <div className="input-group">
                  <label style={labelStyle}>Phone</label>
                  <input type="text" name="phone" value={editForm.phone} onChange={handleEditChange} className="input-field" />
                </div>
                <div className="input-group">
                  <label style={labelStyle}>Status</label>
                  <div style={{ display: "flex", alignItems: "center", height: "40px" }}>
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={editForm.is_active} 
                      onChange={handleEditChange} 
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span style={{ marginLeft: "8px", fontWeight: 500, color: editForm.is_active ? "var(--success-600)" : "var(--gray-500)" }}>
                      {editForm.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label style={labelStyle}>Address</label>
                <textarea name="address" value={editForm.address} onChange={handleEditChange} className="input-field" rows="2" />
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setEditUser(null)} className="btn btn-ghost">Cancel</button>
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
  width: "100%", maxWidth: "600px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  maxHeight: "90vh", overflowY: "auto"
};
const closeBtnStyle = {
  background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--gray-500)"
};
const labelStyle = { fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)" };
const thStyle = { padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray-500)" };
const tdStyle = { padding: "14px 16px", fontSize: "0.9rem", color: "var(--gray-700)" };

export default UserManagement;
