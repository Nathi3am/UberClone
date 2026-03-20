import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import API_BASE_URL from '../config/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .drv-root {
    min-height: 100vh;
    background: #080810;
    font-family: 'DM Sans', sans-serif;
    color: #e2e2f0;
    position: relative;
    overflow-x: hidden;
  }
  .drv-root::before {
    content: '';
    position: fixed;
    top: -15%;
    right: -10%;
    width: 700px; height: 700px;
    background: radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
  }

  .drv-wrap {
    position: relative; z-index: 1;
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 36px 80px;
  }

  /* ---- PAGE HEADER ---- */
  .drv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 48px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .drv-page-title {
    font-family: 'Syne', sans-serif;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #f0f0fa;
  }
  .drv-page-title span {
    background: linear-gradient(90deg, #6366f1, #10b981);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* ---- SECTION LABEL ---- */
  .drv-section-label {
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
  .drv-section-label::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(99,102,241,0.2);
  }

  /* ---- TABLE CONTAINER ---- */
  .drv-table-wrap {
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 22px;
    overflow: hidden;
    position: relative;
  }
  .drv-table-wrap::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #10b981);
  }

  .drv-table {
    width: 100%;
    border-collapse: collapse;
    color: #e2e2f0;
  }

  .drv-table thead tr {
    background: rgba(0,0,0,0.3);
  }
  .drv-table thead th {
    padding: 14px 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #5050a0;
    text-align: left;
    white-space: nowrap;
  }

  .drv-table tbody tr {
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.18s;
  }
  .drv-table tbody tr:last-child { border-bottom: none; }
  .drv-table tbody tr:hover { background: rgba(99,102,241,0.05); }

  .drv-table td {
    padding: 14px 16px;
    font-size: 13px;
    vertical-align: middle;
  }

  /* ---- AVATAR ---- */
  .drv-avatar {
    width: 42px; height: 42px;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid rgba(255,255,255,0.1);
  }

  /* ---- NAME CELL ---- */
  .drv-name { font-weight: 600; font-size: 14px; color: #f0f0fa; margin-bottom: 3px; }
  .drv-email { font-size: 12px; color: #5858a0; }

  /* ---- VEHICLE CELL ---- */
  .drv-vehicle-model { font-weight: 500; color: #c0c0e0; }
  .drv-vehicle-plate { font-size: 11px; color: #5858a0; margin-top: 2px; font-family: monospace; letter-spacing: 0.05em; }

  /* ---- BADGES ---- */
  .drv-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 30px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .drv-badge-online { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
  .drv-badge-offline { background: rgba(255,255,255,0.05); color: #58558a0; border: 1px solid rgba(255,255,255,0.07); }
  .drv-badge-approved { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
  .drv-badge-pending { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
  .drv-badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  /* ---- BUTTONS ---- */
  .drv-btn {
    padding: 7px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.02em;
    border: none;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
  .drv-btn:hover { transform: translateY(-1px); opacity: 0.88; }
  .drv-btn-view { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
  .drv-btn-approve { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }

  /* ---- PAGINATION ---- */
  .drv-pagination {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    justify-content: flex-end;
  }
  .drv-page-btn {
    padding: 8px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #9090c0;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s;
    font-family: 'DM Sans', sans-serif;
  }
  .drv-page-btn:hover:not(:disabled) {
    background: rgba(99,102,241,0.12);
    border-color: rgba(99,102,241,0.3);
    color: #818cf8;
  }
  .drv-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .drv-page-info {
    font-size: 12px;
    color: #5050a0;
    padding: 0 6px;
  }

  /* ---- EMPTY STATE ---- */
  .drv-empty {
    text-align: center;
    padding: 48px 20px;
    color: #4040a0;
    font-size: 14px;
  }

  /* ---- LOADER ---- */
  .drv-loader {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh; background: #080810; gap: 16px;
  }
  .drv-spinner {
    width: 38px; height: 38px;
    border: 3px solid rgba(99,102,241,0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .drv-loader-text { color: #5050a0; font-size: 14px; }

  @media (max-width: 900px) {
    .drv-wrap { padding: 24px 14px 60px; }
    .drv-table thead th:nth-child(4),
    .drv-table td:nth-child(4),
    .drv-table thead th:nth-child(7),
    .drv-table td:nth-child(7) { display: none; }
  }
`

export default function Drivers() {
  const [pendingDrivers, setPendingDrivers] = useState([])
  const [approvedDrivers, setApprovedDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingPage, setPendingPage] = useState(1)
  const [pendingTotalPages, setPendingTotalPages] = useState(1)
  const [approvedPage, setApprovedPage] = useState(1)
  const [approvedTotalPages, setApprovedTotalPages] = useState(1)
  const [approvingId, setApprovingId] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadPending(page) {
      try {
        setLoading(true); setError(null)
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API_BASE_URL}/admin/drivers/pending?page=${page}&limit=5`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (!mounted) return
        setPendingDrivers(res.data?.drivers || [])
        setPendingTotalPages(res.data?.totalPages || 1)
      } catch {
        if (!mounted) return
        setError('Unable to load drivers. Ensure the backend is running and you are logged in as admin.')
      } finally { if (mounted) setLoading(false) }
    }
    loadPending(pendingPage)
    return () => { mounted = false }
  }, [pendingPage])

  useEffect(() => {
    let mounted = true
    async function loadApproved(page) {
      try {
        setLoading(true); setError(null)
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API_BASE_URL}/admin/drivers/approved?page=${page}&limit=5`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (!mounted) return
        setApprovedDrivers(res.data?.drivers || [])
        setApprovedTotalPages(res.data?.totalPages || 1)
      } catch {
        if (!mounted) return
        setError('Unable to load drivers.')
      } finally { if (mounted) setLoading(false) }
    }
    loadApproved(approvedPage)
    return () => { mounted = false }
  }, [approvedPage])

  const handleApprove = async (driverId) => {
    setApprovingId(driverId)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${API_BASE_URL}/admin/drivers/${driverId}/approve`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      setPendingDrivers(prev => prev.filter(d => d._id !== driverId))
    } catch (e) {
      console.error('approve failed', e)
    }
    setApprovingId(null)
  }

  const renderTable = (driversArray, showApprove = false) => (
    <div className="drv-table-wrap">
      <table className="drv-table">
        <thead>
          <tr>
            <th></th>
            <th>Driver</th>
            <th>Vehicle</th>
            <th>Registered</th>
            <th>Trips</th>
            <th>Earnings</th>
            <th>Declined</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {driversArray.length === 0 ? (
            <tr>
              <td colSpan="9" className="drv-empty">No drivers found</td>
            </tr>
          ) : driversArray.map(driver => (
            <tr key={driver._id}>
              <td>
                {(() => {
                  const API = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || API_BASE_URL
                  let src = '/src/assests/logo.png'
                  if (driver.profileImage) {
                    if (driver.profileImage.startsWith('http')) {
                      src = driver.profileImage
                    } else if (driver.profileImage.startsWith('/')) {
                      src = `${API}${driver.profileImage}`
                    } else {
                      src = `${API}/${driver.profileImage}`
                    }
                  }
                  return <img src={src} alt="profile" className="drv-avatar" />
                })()}
              </td>
              <td>
                <div className="drv-name">
                  {driver.fullname?.firstname
                    ? `${driver.fullname.firstname} ${driver.fullname.lastname || ''}`.trim()
                    : (driver.email || '—')}
                </div>
                <div className="drv-email">{driver.email || '—'}</div>
              </td>
              <td>
                <div className="drv-vehicle-model">{driver.vehicleModel || driver.vehicle?.model || '—'}</div>
                <div className="drv-vehicle-plate">{driver.licensePlate || driver.vehicle?.plate || '—'}</div>
              </td>
              <td style={{ color: '#7070a0', fontSize: 12 }}>
                {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </td>
              <td style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#c0c0e0' }}>
                {driver.totalTrips ?? 0}
              </td>
              <td style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#10b981' }}>
                R{Number(driver.totalEarnings ?? 0).toFixed(2)}
              </td>
              <td style={{ color: '#7070a0' }}>{driver.declinedRequests ?? 0}</td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className={`drv-badge ${driver.status === 'online' ? 'drv-badge-online' : 'drv-badge-offline'}`}>
                    <span className="drv-badge-dot" />
                    {driver.status || 'offline'}
                  </span>
                  <span className={`drv-badge ${driver.isApproved ? 'drv-badge-approved' : 'drv-badge-pending'}`}>
                    {driver.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/admin/drivers/${driver._id}`} className="drv-btn drv-btn-view">
                    View →
                  </Link>
                  {showApprove && !driver.isApproved && (
                    <button
                      className="drv-btn drv-btn-approve"
                      onClick={() => handleApprove(driver._id)}
                      disabled={approvingId === driver._id}
                    >
                      {approvingId === driver._id ? '…' : '✓ Approve'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (loading && pendingDrivers.length === 0 && approvedDrivers.length === 0) return (
    <>
      <style>{styles}</style>
      <div className="drv-loader">
        <div className="drv-spinner" />
        <p className="drv-loader-text">Loading drivers…</p>
      </div>
    </>
  )

  return (
    <>
      <style>{styles}</style>
      <div className="drv-root">
        <div className="drv-wrap">

          <div className="drv-header">
            <h1 className="drv-page-title">Driver <span>Management</span></h1>
          </div>

          {error && (
            <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#ef4444', marginBottom: 24, fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* PENDING */}
          <div className="drv-section-label">Pending Approval</div>
          {renderTable(pendingDrivers, true)}
          <div className="drv-pagination">
            <button className="drv-page-btn" disabled={pendingPage === 1} onClick={() => setPendingPage(p => p - 1)}>← Prev</button>
            <span className="drv-page-info">Page {pendingPage} of {pendingTotalPages}</span>
            <button className="drv-page-btn" disabled={pendingPage === pendingTotalPages} onClick={() => setPendingPage(p => p + 1)}>Next →</button>
          </div>

          {/* APPROVED */}
          <div className="drv-section-label" style={{ marginTop: 48 }}>Approved Drivers</div>
          {renderTable(approvedDrivers, false)}
          <div className="drv-pagination">
            <button className="drv-page-btn" disabled={approvedPage === 1} onClick={() => setApprovedPage(p => p - 1)}>← Prev</button>
            <span className="drv-page-info">Page {approvedPage} of {approvedTotalPages}</span>
            <button className="drv-page-btn" disabled={approvedPage === approvedTotalPages} onClick={() => setApprovedPage(p => p + 1)}>Next →</button>
          </div>

        </div>
      </div>
    </>
  )
}
