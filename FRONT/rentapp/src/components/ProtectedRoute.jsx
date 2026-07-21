import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = authService.getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "ADMIN" ? "/adminDashboard" : "/customerDashboard"} replace />;
  }

  return children;
};

export default ProtectedRoute;
