import React, { useContext } from 'react';
import { AdminContext } from './context/AdminContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, roles }) => {
  const { token, admin } = useContext(AdminContext);

  if (!token) return <Navigate to="/admin/login" replace />;

  if (roles && roles.length > 0) {
    const role = admin && (admin.role || admin?.permissions?.role);
    if (!role || !roles.includes(role)) return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
