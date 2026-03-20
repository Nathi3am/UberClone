import React, { useEffect, useState } from "react";
import axios from "axios";
import Toast from '../components/Toast';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const StatCard = ({ title, value }) => (
  <div style={{
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    padding: "20px",
    borderRadius: "12px"
  }}>
    <div style={{ opacity: 0.6 }}>{title}</div>
    <div style={{
      fontSize: "28px",
      fontWeight: "700",
      marginTop: "10px"
    }}>
      {value}
    </div>
  </div>
);

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserRides, setSelectedUserRides] = useState([]);
  const [showRides, setShowRides] = useState(false);
  const [ridePage, setRidePage] = useState(1);
  const RIDE_PAGE_SIZE = 20;
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    fetchUsers(currentPage, searchQuery);
  }, [currentPage]);

  const fetchUsers = async (page = 1, q = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const url = `http://localhost:4000/admin/users?page=${page}&limit=5${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error('Failed to load users', e);
    } finally { setLoading(false); }
  };

  const viewRides = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:4000/admin/users/${userId}/rides`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setSelectedUserRides(res.data || []);
      setRidePage(1);
      setShowRides(true);
    } catch (e) {
      console.error('Failed to load rides', e);
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setDeletePassword('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (!deletePassword) return setDeleteError('Admin password is required');
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('token');
      const url = `http://localhost:4000/admin/users/${userToDelete._id}`;
      const resp = await axios.delete(url, { data: { password: deletePassword }, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
      setShowDeleteModal(false);
      setUserToDelete(null);
      showToast('User deleted', 'success');
      // If server returned an audit record, dispatch local event so DeletedProfiles updates immediately
      try {
        const audit = resp && resp.data && resp.data.audit ? resp.data.audit : null;
        if (audit) {
          try { window.dispatchEvent(new CustomEvent('local-audit-created', { detail: audit })); } catch (e) {}
        }
      } catch (e) {}
    } catch (e) {
      console.error('Failed to delete user', e);
      setDeleteError(e.response?.data?.message || 'Failed to delete user');
      showToast(e.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeUsers = users.filter(u => u.activeRide).length;

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1 style={{ marginBottom: "30px" }}>Users Management</h1>

      {/* STATS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", alignItems: 'center' }}>
        <StatCard title="Total Users" value={users.length} />
        <StatCard title="Active Users" value={activeUsers} />
        <div style={{ marginLeft: 'auto' }}>
          <input
            placeholder="Search users by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'white' }}
          />
          <button
            onClick={() => { setCurrentPage(1); fetchUsers(1, searchQuery); }}
            style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none' }}
          >Search</button>
        </div>
      </div>

      {/* USERS TABLE */}
      <div style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: "16px",
        padding: "20px"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ opacity: 0.7 }}>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'left' }}>Email</th>
              <th style={{ textAlign: 'left' }}>Payment</th>
              <th style={{ textAlign: 'left' }}>Registered</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {users.map(user => (
              <tr key={user._id}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <td style={{ padding: "15px 0" }}>
                  <strong>{user.fullname?.firstname ? `${user.fullname.firstname} ${user.fullname.lastname || ''}` : (user.email || '—')}</strong>
                </td>
                <td>{user.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{user.paymentMethod || 'cash'}</td>
                <td>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </td>
                <td>
                  <button
                    onClick={() => viewRides(user._id)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#3b82f6",
                      color: "white",
                      cursor: "pointer"
                    }}
                  >
                    View Rides
                  </button>
                  <button
                    onClick={() => openDeleteModal(user)}
                    style={{
                      marginLeft: 8,
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#ef4444",
                      color: "white",
                      cursor: "pointer"
                    }}
                  >
                    Delete user
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: 'center' }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          style={{ padding: '8px 12px', borderRadius: 6 }}
        >
          Previous
        </button>

        <span>Page {currentPage} of {totalPages}</span>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
          style={{ padding: '8px 12px', borderRadius: 6 }}
        >
          Next
        </button>
      </div>

      {/* RIDE HISTORY PANEL */}
      {showRides && (
        <div style={{
          marginTop: "40px",
          background: "rgba(255,255,255,0.05)",
          padding: "20px",
          borderRadius: "16px"
        }}>
          <h2>User Ride History</h2>

          <table style={{ width: "100%", marginTop: "20px" }}>
            <thead>
              <tr style={{ opacity: 0.7 }}>
                <th style={{ textAlign: 'left' }}>Date</th>
                <th style={{ textAlign: 'left' }}>Driver</th>
                <th style={{ textAlign: 'left' }}>Fare</th>
                <th style={{ textAlign: 'left' }}>Payment Type</th>
                <th style={{ textAlign: 'left' }}>Platform Commission</th>
                <th style={{ textAlign: 'left' }}>Driver Earned</th>
                <th style={{ textAlign: 'left' }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {((selectedUserRides || []).slice((ridePage - 1) * RIDE_PAGE_SIZE, ridePage * RIDE_PAGE_SIZE)).map(ride => (
                <tr key={ride._id}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <td>
                    {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {ride.captain ? (ride.captain.fullname?.firstname ? `${ride.captain.fullname.firstname} ${ride.captain.fullname.lastname || ''}` : ride.captain.email) : '—'}
                  </td>
                  <td>R {Number(ride.totalFare ?? ride.fare ?? 0).toFixed(2)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{ride.paymentMethod || 'cash'}</td>
                  <td>R{Number(ride.platformCommission ?? ride.commission ?? 0).toFixed(2)}</td>
                  <td>R{Number(ride.driverEarnings ?? ride.driverEarned ?? 0).toFixed(2)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{ride.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              disabled={ridePage <= 1}
              onClick={() => setRidePage(p => Math.max(1, p - 1))}
              style={{ padding: '8px 12px', borderRadius: 6 }}
            >Previous</button>

            <div>Page {ridePage} of {Math.max(1, Math.ceil((selectedUserRides || []).length / RIDE_PAGE_SIZE))}</div>

            <button
              disabled={ridePage >= Math.ceil((selectedUserRides || []).length / RIDE_PAGE_SIZE)}
              onClick={() => setRidePage(p => p + 1)}
              style={{ padding: '8px 12px', borderRadius: 6 }}
            >Next</button>
          </div>

          <button
            onClick={() => setShowRides(false)}
            style={{
              marginTop: "20px",
              background: "#ff4d4d",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              color: "white"
            }}
          >
            Close
          </button>
        </div>
      )}

      <ConfirmDeleteModal
        show={showDeleteModal}
        title={`Confirm Delete`}
        message={`Enter your admin password to permanently delete this user and all associated data.`}
        password={deletePassword}
        setPassword={setDeletePassword}
        error={deleteError}
        loading={deleteLoading}
        onCancel={() => { setShowDeleteModal(false); setDeleteError(null); setUserToDelete(null); }}
        onConfirm={confirmDeleteUser}
      />

      <Toast toast={toast} />
    </div>
  );
}
