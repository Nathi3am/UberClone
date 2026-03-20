import React, { useEffect, useState, useContext } from "react";
import { SocketContext } from "../context/SocketContext";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Toast from '../components/Toast';
import API_BASE_URL from '../config/api';

const AdminDriverDetails = () => {
  const { driverId } = useParams();
  const [driver, setDriver] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [debtLoading, setDebtLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showVehicleRaw, setShowVehicleRaw] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDriver = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/driver/${driverId}`, { headers: getAuthHeaders() });
      // Merge top-level stats (totalTrips, totalEarnings, declinedRequests) into driver for easier rendering
      const payload = res.data || {};
      const drv = payload.driver || payload;
      const merged = Object.assign({}, drv, {
        totalTrips: typeof payload.totalTrips !== 'undefined' ? payload.totalTrips : (drv.totalTrips || 0),
        totalEarnings: typeof payload.totalEarnings !== 'undefined' ? payload.totalEarnings : (drv.totalEarnings || drv.totalEarnings || 0),
        declinedRequests: typeof payload.declinedRequests !== 'undefined' ? payload.declinedRequests : (drv.declinedRequests || 0),
      });
      setDriver(merged);
    } catch (err) {
      setError("Unable to load driver");
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/driver-wallet/${driverId}`, { headers: getAuthHeaders() });
      const walletResp = res.data?.wallet ?? res.data ?? {};
      const available = typeof walletResp.balance === "number" ? walletResp.balance : walletResp.walletBalance || 0;
      const owed = typeof res.data.owedToPlatform !== "undefined" ? Number(res.data.owedToPlatform || 0) : typeof walletResp.totalCommission === "number" ? Number(walletResp.totalCommission || 0) : 0;
      const driverPayout = typeof res.data.driverPayout !== "undefined" ? Number(res.data.driverPayout || 0) : Number((Number(available || 0) - Number(owed || 0)).toFixed(2));
      setWallet({ ...walletResp, balance: Number(available || 0), owedToPlatform: owed, driverPayout });
    } catch (err) {}
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await fetchDriver();
      await fetchWallet();
      if (mounted) setLoading(false);
    };
    init();
    return () => (mounted = false);
  }, [driverId]);

  const navigate = useNavigate();

  const { socket } = useContext(SocketContext);
  useEffect(() => {
    if (!socket) return;
    const h = (payload) => {
      try {
        if (!payload || payload.driverId !== driverId) return;
        setWallet((w) => {
          const prev = w || {};
          const available = typeof prev.balance === "number" ? prev.balance : prev.walletBalance || 0;
          const owed = Number(payload.owedToPlatform || 0);
          const payout = typeof payload.driverPayout !== "undefined" ? Number(payload.driverPayout) : Number((Number(available || 0) - Number(owed || 0)).toFixed(2));
          return { ...prev, owedToPlatform: owed, driverPayout: payout };
        });
      } catch (e) {}
    };
    socket.on("owed-updated", h);
    return () => socket.off("owed-updated", h);
  }, [socket, driverId]);

  // try to find a vehicle object from multiple possible shapes the backend might return
  const extractVehicle = (drv) => {
    if (!drv) return {};
    const v = drv.vehicle;
    if (v && typeof v === 'object') return Array.isArray(v) ? (v[0] || {}) : v;
    const candidates = [
      'vehicles', 'vehicleDetails', 'vehicle_details', 'vehicleInfo', 'vehicle_info',
      'vehicleData', 'car', 'auto', 'vehicleDetail'
    ];
    for (const key of candidates) {
      if (drv[key]) return Array.isArray(drv[key]) ? (drv[key][0] || {}) : drv[key];
    }
    // fallback: look for any key that contains 'vehicle'
    for (const key of Object.keys(drv)) {
      if (key.toLowerCase().includes('vehicle') && drv[key]) return Array.isArray(drv[key]) ? (drv[key][0] || {}) : drv[key];
    }
    return {};
  };

  const handlePayout = async () => {
    setPayoutLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/admin/payout-driver/${driverId}`, {}, { headers: getAuthHeaders() });
      showToast("Driver marked as paid ✓");
      fetchWallet();
    } catch {
      showToast("No available payout", "error");
    }
    setPayoutLoading(false);
  };

  const handleDebtSettlement = async () => {
    setDebtLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/admin/settle-driver-debt/${driverId}`, {}, { headers: getAuthHeaders() });
      showToast("Driver debt cleared ✓");
      fetchWallet();
    } catch {
      showToast("Driver has no debt", "error");
    }
    setDebtLoading(false);
  };

  const handleApprove = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/drivers/${driverId}/approve`, {}, { headers: getAuthHeaders() });
      await fetchDriver();
      showToast("Driver approved ✓");
    } catch {
      setError("Action failed");
    }
  };

  const handleToggleSuspend = async () => {
    try {
      if (!driver) return;
      if (driver.isSuspended) {
        await axios.patch(`${API_BASE_URL}/admin/drivers/${driverId}/unsuspend`, {}, { headers: getAuthHeaders() });
        try { await axios.patch(`${API_BASE_URL}/admin/drivers/${driverId}/approve`, {}, { headers: getAuthHeaders() }); } catch {}
        showToast("Driver reinstated ✓");
      } else {
        await axios.patch(`${API_BASE_URL}/admin/drivers/${driverId}/suspend`, {}, { headers: getAuthHeaders() });
        showToast("Driver suspended", "warning");
      }
      await fetchDriver();
    } catch {
      setError("Action failed");
    }
  };

  const handleDeleteProfile = async () => {
    setDeleteError(null);
    if (!deletePassword) return setDeleteError('Enter admin password to confirm');
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/admin/drivers/${driverId}`, { data: { password: deletePassword }, headers: getAuthHeaders() });
      showToast('Driver deleted ✓');
      setShowDeleteModal(false);
      navigate('/admin/drivers');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Delete failed';
      setDeleteError(msg);
    }
    setDeleteLoading(false);
  };

  const statusColor = driver?.isSuspended ? "#ef4444" : !driver?.isApproved ? "#f59e0b" : "#10b981";
  const statusLabel = driver?.isSuspended ? "Suspended" : !driver?.isApproved ? "Pending" : "Active";

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .dd-root {
      min-height: 100vh;
      background: #0a0a0f;
      font-family: 'DM Sans', sans-serif;
      color: #e8e8f0;
      padding: 0;
      position: relative;
      overflow-x: hidden;
    }

    .dd-root::before {
      content: '';
      position: fixed;
      top: -40%;
      right: -20%;
      width: 700px;
      height: 700px;
      background: radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 65%);
      pointer-events: none;
      z-index: 0;
    }

    .dd-root::after {
      content: '';
      position: fixed;
      bottom: -30%;
      left: -15%;
      width: 600px;
      height: 600px;
      background: radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 65%);
      pointer-events: none;
      z-index: 0;
    }

    .dd-content {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 32px 80px;
    }

    .dd-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #6366f1;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.03em;
      margin-bottom: 40px;
      padding: 8px 14px;
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 30px;
      transition: all 0.2s;
      background: rgba(99,102,241,0.06);
    }
    .dd-back:hover {
      background: rgba(99,102,241,0.14);
      border-color: rgba(99,102,241,0.5);
    }

    /* ---- HERO PROFILE ---- */
    .dd-hero {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 28px;
      align-items: center;
      background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 24px;
      padding: 32px;
      margin-bottom: 24px;
      backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
    }
    .dd-hero::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, #6366f1, #10b981, #6366f1);
    }

    .dd-avatar-wrap {
      position: relative;
    }
    .dd-avatar {
      width: 100px;
      height: 100px;
      border-radius: 20px;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.1);
    }
    .dd-status-dot {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid #0a0a0f;
    }

    .dd-name {
      font-family: 'Syne', sans-serif;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #f0f0fa;
      margin-bottom: 10px;
    }

    .dd-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .dd-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #9090b0;
    }
    .dd-meta-icon { opacity: 0.6; }

    .dd-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-top: 10px;
    }

    .dd-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
    }

    .dd-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .dd-btn:hover { transform: translateY(-1px); opacity: 0.9; }
    .dd-btn:active { transform: translateY(0); }
    .dd-btn-approve { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
    .dd-btn-suspend { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
    .dd-btn-reinstate { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
    .dd-btn-delete { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; }
    .dd-btn-payout { background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 12px 24px; font-size: 14px; }
    .dd-btn-debt { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; padding: 12px 24px; font-size: 14px; }
    .dd-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    /* ---- SECTION LABEL ---- */
    .dd-section-label {
      font-family: 'Syne', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #6366f1;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dd-section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(99,102,241,0.2);
    }

    /* ---- CARDS GRID ---- */
    .dd-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .dd-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 20px;
      transition: border-color 0.2s, background 0.2s;
    }
    .dd-card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(99,102,241,0.25);
    }

    .dd-card-label {
      font-size: 11px;
      color: #6060a0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .dd-card-value {
      font-family: 'Syne', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: #e8e8f0;
    }

    /* ---- STAT CARDS ---- */
    .dd-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }

    .dd-stat {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
      transition: all 0.2s;
    }
    .dd-stat:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(99,102,241,0.2);
      transform: translateY(-2px);
    }
    .dd-stat-num {
      font-family: 'Syne', sans-serif;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -1px;
      margin-bottom: 6px;
    }
    .dd-stat-desc { font-size: 12px; color: #6060a0; letter-spacing: 0.04em; text-transform: uppercase; }

    /* ---- WALLET PANEL ---- */
    .dd-wallet {
      background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 24px;
      padding: 32px;
      position: relative;
      overflow: hidden;
    }
    .dd-wallet::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, #10b981, #6366f1);
    }

    .dd-wallet-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin: 20px 0 24px;
    }

    .dd-wallet-card {
      background: rgba(0,0,0,0.25);
      border-radius: 16px;
      padding: 20px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .dd-wallet-card-label {
      font-size: 11px;
      color: #6060a0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 10px;
    }
    .dd-wallet-card-amount {
      font-family: 'Syne', sans-serif;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .dd-wallet-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* ---- TOAST ---- */
    .dd-toast {
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 9999;
      padding: 14px 22px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      animation: slideUp 0.3s ease;
    }
    .dd-toast-success { background: #10b981; color: #fff; }
    .dd-toast-error { background: #ef4444; color: #fff; }
    .dd-toast-warning { background: #f59e0b; color: #0a0a0f; }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ---- LOADING ---- */
    .dd-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0f;
      flex-direction: column;
      gap: 16px;
    }
    .dd-spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(99,102,241,0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dd-loader-text { color: #6060a0; font-family: 'DM Sans', sans-serif; font-size: 14px; }

    /* ---- RESPONSIVE ---- */
    @media (max-width: 768px) {
      .dd-hero { grid-template-columns: auto 1fr; }
      .dd-actions { flex-direction: row; align-items: center; grid-column: 1 / -1; }
      .dd-stat-grid { grid-template-columns: repeat(2, 1fr); }
      .dd-wallet-grid { grid-template-columns: 1fr; }
      .dd-content { padding: 24px 16px 60px; }
    }
  `;

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="dd-loader">
        <div className="dd-spinner" />
        <p className="dd-loader-text">Loading driver profile…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{styles}</style>
      <div className="dd-loader">
        <p style={{ color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
      </div>
    </>
  );

  const createdAt = driver?.createdAt ? new Date(driver.createdAt).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const driverName = driver?.fullname?.firstname ? `${driver.fullname.firstname} ${driver.fullname.lastname || ""}`.trim() : driver?.email || "Driver";

  // normalize vehicle fields to match either signup keys or stored keys
  const vehicle = extractVehicle(driver) || {};
  // prefer direct driver.vehicle keys, but merge with extracted vehicle for robustness
  const combinedVehicle = Object.assign({}, driver?.vehicle || {}, vehicle || {});
  const vehicleMake = combinedVehicle.model || combinedVehicle.make || combinedVehicle.vehicleMake || combinedVehicle.makeName || (combinedVehicle.make && typeof combinedVehicle.make === 'object' ? combinedVehicle.make.name : null) || combinedVehicle.brand || combinedVehicle.modelName || null;
  const vehicleColor = combinedVehicle.color || combinedVehicle.vehicleColor || combinedVehicle.colour || null;
  const vehicleYear = combinedVehicle.year || combinedVehicle.vehicleYear || combinedVehicle.yearOfManufacture || combinedVehicle.manufactureYear || combinedVehicle.modelYear || null;
  const vehiclePlate = combinedVehicle.licensePlate || combinedVehicle.plate || combinedVehicle.vehiclePlate || combinedVehicle.registration || combinedVehicle.reg || null;
  const vehicleType = combinedVehicle.type || combinedVehicle.vehicleType || combinedVehicle.vehicleKind || 'Car';

  return (
    <>
      <style>{styles}</style>

      <Toast toast={toast} />

      <div className="dd-root">
        <div className="dd-content">

          {/* BACK */}
          <Link to="/admin/drivers" className="dd-back">
            ← All Drivers
          </Link>

          {/* ---- HERO ---- */}
          <div className="dd-hero">
            <div className="dd-avatar-wrap">
              {(() => {
                const API = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || API_BASE_URL
                let src = '/src/assests/logo.png'
                if (driver && driver.profileImage) {
                  if (driver.profileImage.startsWith('http')) {
                    src = driver.profileImage
                  } else if (driver.profileImage.startsWith('/')) {
                    src = `${API}${driver.profileImage}`
                  } else {
                    src = `${API}/${driver.profileImage}`
                  }
                }
                return <img src={src} alt="profile" className="dd-avatar" />
              })()}
              <div className="dd-status-dot" style={{ background: statusColor }} />
            </div>

            <div>
              <div className="dd-name">{driverName}</div>
              <div className="dd-meta">
                <span className="dd-meta-item"><span className="dd-meta-icon">✉</span>{driver?.email || "—"}</span>
                <span className="dd-meta-item"><span className="dd-meta-icon">📞</span>{driver?.phone || "—"}</span>
                <span className="dd-meta-item"><span className="dd-meta-icon">📅</span>Joined {createdAt}</span>
                {driver?.rating != null && (
                  <span className="dd-meta-item"><span className="dd-meta-icon">⭐</span>{Number(driver.rating).toFixed(1)} rating</span>
                )}
              </div>
              <div
                className="dd-badge"
                style={{
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                {statusLabel}
              </div>
            </div>

            <div className="dd-actions">
              {!driver?.isApproved && !driver?.isSuspended && (
                <button className="dd-btn dd-btn-approve" onClick={handleApprove}>Approve Driver</button>
              )}
              <button
                className={`dd-btn ${driver?.isSuspended ? "dd-btn-reinstate" : "dd-btn-suspend"}`}
                onClick={handleToggleSuspend}
              >
                {driver?.isSuspended ? "Reinstate" : "Suspend"}
              </button>
              <button className="dd-btn dd-btn-delete" onClick={() => { setDeletePassword(''); setDeleteError(null); setShowDeleteModal(true); }} disabled={deleteLoading} style={{ marginTop: 6 }}>
                {deleteLoading ? 'Deleting…' : 'Delete profile'}
              </button>
            </div>
          </div>

          <ConfirmDeleteModal
            show={showDeleteModal}
            title={`Confirm Delete`}
            message={`Enter your admin password to permanently delete this driver and all associated data.`}
            password={deletePassword}
            setPassword={setDeletePassword}
            error={deleteError}
            loading={deleteLoading}
            onCancel={() => { setShowDeleteModal(false); setDeleteError(null); }}
            onConfirm={handleDeleteProfile}
          />

          {/* ---- PERFORMANCE ---- */}
          <div className="dd-section-label">Performance</div>
          <div className="dd-stat-grid">
            <div className="dd-stat">
              <div className="dd-stat-num" style={{ color: "#6366f1" }}>{driver?.totalTrips ?? 0}</div>
              <div className="dd-stat-desc">Trips Completed</div>
            </div>
            <div className="dd-stat">
              <div className="dd-stat-num" style={{ color: "#10b981" }}>R{Number(driver?.totalEarnings ?? 0).toFixed(0)}</div>
              <div className="dd-stat-desc">Total Earnings</div>
            </div>
            <div className="dd-stat">
              <div className="dd-stat-num" style={{ color: "#f59e0b" }}>
                {driver?.rating != null ? Number(driver.rating).toFixed(1) : "—"}
              </div>
              <div className="dd-stat-desc">Avg Rating</div>
            </div>
          </div>

          {/* ---- VEHICLE ---- */}
          {(combinedVehicle && Object.keys(combinedVehicle).length > 0) && (
            <>
              <div className="dd-section-label">Vehicle Details</div>
              <div className="dd-card-grid" style={{ marginBottom: 24 }}>
                {[
                  ["Make", vehicleMake],
                  ["Color", vehicleColor],
                  ["Year", vehicleYear],
                  ["Vehicle Plate", vehiclePlate],
                  ["Type", vehicleType],
                ].map(([label, value]) => (
                  <div className="dd-card" key={label}>
                    <div className="dd-card-label">{label}</div>
                    <div className="dd-card-value" style={{ textTransform: label === "Type" ? "capitalize" : "none" }}>
                      {value || "Not Provided"}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowVehicleRaw(s => !s)} style={{ background: 'none', border: 'none', color: '#9ca3ff', cursor: 'pointer', fontSize: 12 }}>
                  {showVehicleRaw ? 'Hide' : 'Show'} vehicle raw data
                </button>
                {showVehicleRaw && (
                  <pre style={{ marginTop: 8, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8, fontSize: 12, color: '#d1d5ff', maxHeight: 220, overflow: 'auto' }}>{JSON.stringify(combinedVehicle, null, 2)}</pre>
                )}
              </div>
            </>
          )}

          {/* ---- WALLET ---- */}
          {wallet && (
            <>
              <div className="dd-section-label">Wallet & Financials</div>
              <div className="dd-wallet">
                <div className="dd-wallet-grid">
                  <div className="dd-wallet-card">
                    <div className="dd-wallet-card-label">Total Earned</div>
                    <div className="dd-wallet-card-amount" style={{ color: "#10b981" }}>
                      R{Number(wallet.totalEarned || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="dd-wallet-card">
                    <div className="dd-wallet-card-label">Available for Payout</div>
                    <div className="dd-wallet-card-amount" style={{ color: "#60a5fa" }}>
                      R{wallet.balance > 0 ? Number(wallet.balance).toFixed(2) : "0.00"}
                    </div>
                  </div>
                  <div className="dd-wallet-card">
                    <div className="dd-wallet-card-label">Owed to Platform</div>
                    <div className="dd-wallet-card-amount" style={{ color: "#ef4444" }}>
                      R{Number(wallet.owedToPlatform != null ? wallet.owedToPlatform : wallet.balance < 0 ? Math.abs(wallet.balance) : 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="dd-wallet-card">
                    <div className="dd-wallet-card-label">Total Paid Out</div>
                    <div className="dd-wallet-card-amount" style={{ color: "#a78bfa" }}>
                      R{Number(wallet.totalPaidOut || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="dd-wallet-actions">
                  {wallet.driverPayout > 0 && (
                    <button
                      className="dd-btn dd-btn-payout"
                      onClick={handlePayout}
                      disabled={payoutLoading}
                    >
                      {payoutLoading ? "Processing…" : `Pay Driver — R${Number(wallet.driverPayout || 0).toFixed(2)}`}
                    </button>
                  )}
                  {(wallet.owedToPlatform > 0 || wallet.balance < 0) && (
                    <button
                      className="dd-btn dd-btn-debt"
                      onClick={handleDebtSettlement}
                      disabled={debtLoading}
                    >
                      {debtLoading ? "Clearing…" : "Clear Debt"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default AdminDriverDetails;
