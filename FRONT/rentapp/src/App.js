import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/login";
import RegisterPage from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import UploadProperty from "./pages/UploadProperty";
import Properties from "./pages/Properties";
import Requests from "./pages/CustRequests";
import Contracts from "./pages/AdminContracts";
import CustomerContracts from "./pages/Customercontracts";
import AdminNotifications from "./pages/AdminNotifications";
import CustomerNotifications from "./pages/CustomerNotifications";
import SavedProperty from "./pages/SavedProperty";
import UserManagement from "./pages/UserManagement";
import ContactUs from "./pages/ContactUs";
import MyRentals from "./pages/MyRentals";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Admin Routes */}
        <Route path="/adminDashboard" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/userManagement" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UserManagement /></ProtectedRoute>} />
        <Route path="/uploadProperty" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UploadProperty /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Requests /></ProtectedRoute>} />
        <Route path="/AdminContracts" element={<ProtectedRoute allowedRoles={["ADMIN"]}><Contracts /></ProtectedRoute>} />
        <Route path="/AdminNotifications" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminNotifications /></ProtectedRoute>} />

        {/* Client Routes */}
        <Route path="/customerDashboard" element={<ProtectedRoute allowedRoles={["CLIENT"]}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute allowedRoles={["CLIENT"]}><Properties /></ProtectedRoute>} />
        <Route path="/Customercontracts" element={<ProtectedRoute allowedRoles={["CLIENT"]}><CustomerContracts /></ProtectedRoute>} />
        <Route path="/CustomerNotifications" element={<ProtectedRoute allowedRoles={["CLIENT"]}><CustomerNotifications /></ProtectedRoute>} />
        <Route path="/SavedProperty" element={<ProtectedRoute allowedRoles={["CLIENT"]}><SavedProperty /></ProtectedRoute>} />
        <Route path="/myRentals" element={<ProtectedRoute allowedRoles={["CLIENT"]}><MyRentals /></ProtectedRoute>} />

        {/* Common Routes */}
        <Route path="/contactUs" element={<ProtectedRoute allowedRoles={["ADMIN", "CLIENT"]}><ContactUs /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
