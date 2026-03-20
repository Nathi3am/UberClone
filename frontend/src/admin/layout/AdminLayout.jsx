import React, { useContext } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { AdminContext } from '../context/AdminContext';
import { Outlet, Navigate } from 'react-router-dom';
import theme from '../theme';

const AdminLayout = () => {
  const { token } = useContext(AdminContext);

  if (!token) return <Navigate to="/admin/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.gradients.page, color: theme.colors.textPrimary }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 28 }}>
        <Header />
        <div style={{ background: 'transparent' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
