import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import Toast from '../components/Toast'
import API_BASE_URL from '../config/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .db-root {
    min-height: 100vh;
    background: #080810;
    font-family: 'DM Sans', sans-serif;
    color: #e2e2f0;
    position: relative;
    overflow-x: hidden;
  }

  /* ambient glows */
  .db-root::before {
    content: '';
    position: fixed;
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 500px;
    background: radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .db-root::after {
    content: '';
    position: fixed;
    bottom: -20%;
    right: -10%;
    width: 600px; height: 600px;
    background: radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
  }

  .db-wrap {
    position: relative; z-index: 1;
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 36px 80px;
  }

  /* ---- TOPBAR ---- */
  .db-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 48px;
    gap: 16px;
  }

  .db-title {
    font-family: 'Syne', sans-serif;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #f0f0fa;
  }
  .db-title span {
    background: linear-gradient(90deg, #6366f1, #10b981);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .db-topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .db-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #9090b8;
  }
  .db-pill.online {
    background: rgba(16,185,129,0.1);
    border-color: rgba(16,185,129,0.3);
    color: #10b981;
  }
  .db-pill.online::before {
    content: '';
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }

  .db-logout {
    padding: 8px 18px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
    color: #ef4444;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .db-logout:hover { background: rgba(239,68,68,0.18); }

  /* ---- SECTION LABEL ---- */
  .db-section-label {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #6366f1;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .db-section-label::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(99,102,241,0.2);
  }

  /* ---- HERO ROW (3 big stats) ---- */
  .db-hero-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .db-hero-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 22px;
    padding: 28px 26px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.25s, transform 0.25s;
  }
  .db-hero-card:hover {
    border-color: rgba(99,102,241,0.3);
    transform: translateY(-3px);
  }
  .db-hero-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
  }
  .db-hero-card.indigo::before { background: linear-gradient(90deg, #6366f1, #818cf8); }
  .db-hero-card.emerald::before { background: linear-gradient(90deg, #10b981, #34d399); }
  .db-hero-card.amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

  .db-hero-icon {
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    margin-bottom: 16px;
  }
  .db-hero-icon.indigo { background: rgba(99,102,241,0.15); }
  .db-hero-icon.emerald { background: rgba(16,185,129,0.15); }
  .db-hero-icon.amber { background: rgba(245,158,11,0.15); }

  .db-hero-num {
    font-family: 'Syne', sans-serif;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 8px;
  }
  .db-hero-num.indigo { color: #818cf8; }
  .db-hero-num.emerald { color: #34d399; }
  .db-hero-num.amber { color: #fbbf24; }

  .db-hero-label {
    font-size: 13px;
    color: #7070a0;
    font-weight: 400;
  }

  /* ---- METRICS GRID ---- */
  .db-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }

  .db-metric {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.055);
    border-radius: 18px;
    padding: 22px 20px;
    transition: all 0.22s;
    cursor: default;
  }
  .db-metric:hover {
    background: rgba(255,255,255,0.045);
    border-color: rgba(99,102,241,0.22);
    transform: translateY(-2px);
  }

  .db-metric-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #58588a;
    margin-bottom: 10px;
    font-weight: 500;
  }
  .db-metric-value {
    font-family: 'Syne', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: #e0e0f5;
    letter-spacing: -0.4px;
  }

  /* loader */
  .db-loader {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh;
    background: #080810;
    gap: 16px;
  }
  .db-spinner {
    width: 38px; height: 38px;
    border: 3px solid rgba(99,102,241,0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .db-loader-text { color: #5050a0; font-family: 'DM Sans', sans-serif; font-size: 14px; }

  @media (max-width: 900px) {
    .db-hero-row { grid-template-columns: 1fr 1fr; }
    .db-wrap { padding: 24px 18px 60px; }
    .db-topbar { flex-direction: column; align-items: flex-start; }
  }
  @media (max-width: 600px) {
    .db-hero-row { grid-template-columns: 1fr; }
  }
`

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  

  const fmt = (v) => `R${Number(v || 0).toFixed(2)}`

  // fetch stats from server and normalize to client shape
  async function fetchStats() {
    setLoading(true); setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_BASE_URL}/admin/stats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      setStats(mapServerToClient(res.data || {}))
    } catch (err) {
      setError('Unable to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    // initial load + periodic refresh
    fetchStats()
    const iv = setInterval(() => { if (mounted) fetchStats() }, 30000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  useEffect(() => {
    let mounted = true
    const enrich = async () => {
      if (!stats) return
      try {
        if (typeof stats.completedToday === 'undefined' || stats.completedToday === null) {
          try {
            const token = localStorage.getItem('token')
            const resLive = await axios.get(`${API_BASE_URL}/admin/dashboard-stats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            if (!mounted) return
            if (resLive?.data?.completedToday !== undefined)
              setStats(s => ({ ...(s || {}), completedToday: resLive.data.completedToday }))
          } catch {}
        }
        if (typeof stats.platformTotalCommission === 'undefined' || stats.platformTotalCommission === 0) {
          try {
            const token = localStorage.getItem('token')
            const res = await axios.get(`${API_BASE_URL}/admin/all-rides`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            if (!mounted) return
            const rides = Array.isArray(res.data) ? res.data : (res.data.rides || [])
            const sum = rides.reduce((acc, r) => acc + (Number(r.platformCommission ?? r.commission ?? 0) || 0), 0)
            setStats(s => ({ ...(s || {}), platformTotalCommission: Number(sum.toFixed(2)) }))
          } catch {}
        }
      } catch {}
    }
    enrich()
    return () => { mounted = false }
  }, [stats])

  const { socket } = useContext(SocketContext)
  useEffect(() => {
    if (!socket) return
    const handler = (payload) => {
      try {
        if (!payload) return
        if (typeof payload.totalOwed !== 'undefined')
          setStats(s => ({ ...(s || {}), owedToPlatform: Number(payload.totalOwed || 0) }))
      } catch {}
    }
    socket.on('owed-updated', handler)
    // listen for dashboard reset events from server
    const onReset = (payload) => {
      try {
        if (!payload) return
        // payload may use server keys (totalDrivers, totalUsers, etc.) — normalize to client shape
        setStats(mapServerToClient(payload))
      } catch (e) {}
    }
    socket.on('dashboard-reset', onReset)
    // update completed-today when server notifies of a new completed ride
    const onCompletedToday = (payload) => {
      try {
        if (!payload) return
        if (typeof payload.completedToday !== 'undefined') {
          setStats(s => ({ ...(s || {}), completedToday: Number(payload.completedToday || 0) }))
        }
      } catch (e) {}
    }
    socket.on('dashboard-ride-completed', onCompletedToday)
    return () => { socket.off('owed-updated', handler); socket.off('dashboard-reset', onReset); socket.off('dashboard-ride-completed', onCompletedToday); }
  }, [socket])

  // normalize server stats shape to client-expected fields
  function mapServerToClient(src) {
    if (!src) return src
    // if already in client shape, return as-is
    if (typeof src.activeDrivers !== 'undefined' || typeof src.activeRiders !== 'undefined') return src

    return {
      // map basic counts
      activeDrivers: Number(src.totalDrivers || src.activeDrivers || 0),
      activeRiders: Number(src.totalUsers || src.activeRiders || 0),
      totalRides: Number(src.totalRides || 0),
      // financials
      totalRevenue: Number(src.totalRevenue || src.todayRevenue || 0),
      todayRevenue: Number(src.todayRevenue || src.totalRevenue || 0),
      platformCommissionToday: Number(src.platformCommissionToday || src.platformCommissionTodayAmount || 0),
      platformTotalCommission: Number(src.platformTotalCommission || src.platformCommissionTotal || src.totalCommission || 0),
      avgPlatformCommissionPerDay: Number(src.avgPlatformCommissionPerDay || src.avgPlatformCommissionPerDay || 0),
      avgTripsPerDay: src.avgTripsPerDay || 0,
      avgDriverRating: Number(src.avgDriverRating || src.avgDriverRating || 0),
      owedToPlatform: Number(src.owedToPlatform || src.owedToPlatform || 0),
      completedToday: Number(src.completedToday || 0),
    }
  }

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="db-loader">
        <div className="db-spinner" />
        <p className="db-loader-text">Fetching dashboard data…</p>
      </div>
    </>
  )

  return (
    <>
      <style>{styles}</style>
      <div className="db-root">
        <div className="db-wrap">

          {/* TOPBAR */}
          <div className="db-topbar">
            <h1 className="db-title">Dashboard <span>Overview</span></h1>
            <div className="db-topbar-right">
              <span className="db-pill online">Online</span>
              <span className="db-pill">🔔 0 Alerts</span>
              <span className="db-pill">Super Admin</span>
              <button className="db-logout">Logout</button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#ef4444', marginBottom: 24, fontSize: 14 }}>
              {error}
            </div>
          )}

          {stats && (
            <>
              {/* HERO ROW */}
              <div className="db-section-label">At a Glance</div>
              <div className="db-hero-row" style={{ marginBottom: 24 }}>
                <div className="db-hero-card indigo">
                  <div className="db-hero-icon indigo">🚗</div>
                  <div className="db-hero-num indigo">{stats.activeDrivers ?? 0}</div>
                  <div className="db-hero-label">Active Drivers</div>
                </div>
                <div className="db-hero-card emerald">
                  <div className="db-hero-icon emerald">👤</div>
                  <div className="db-hero-num emerald">{stats.activeRiders ?? 0}</div>
                  <div className="db-hero-label">Active Riders</div>
                </div>
                <div className="db-hero-card amber">
                  <div className="db-hero-icon amber">✅</div>
                  <div className="db-hero-num amber">{stats.completedToday ?? 0}</div>
                  <div className="db-hero-label">Trips Completed Today</div>
                </div>
              </div>

              {/* METRICS */}
              <div className="db-section-label">Financials & Performance</div>
              <div className="db-metrics">
                {[
                  { label: "Today's Revenue", value: fmt(stats.todayRevenue) },
                  { label: "Platform Commission Today", value: fmt(stats.platformCommissionToday ?? stats.platformCommissionTodayAmount) },
                  { label: "Platform Total Commission", value: fmt(stats.platformTotalCommission ?? stats.platformCommissionTotal) },
                  { label: "Avg Commission / Day", value: fmt(stats.avgPlatformCommissionPerDay) },
                  { label: "Drivers Total Earnings", value: fmt(Number((Number(stats.totalRevenue ?? 0) - Number(stats.platformTotalCommission ?? stats.totalCommission ?? 0)).toFixed(2))) },
                  { label: "Avg Trips / Day", value: stats.avgTripsPerDay ?? '—' },
                  { label: "Avg Driver Rating", value: Number(stats.avgDriverRating ?? 0).toFixed(1) + ' ⭐' },
                  { label: "Owed to Platform", value: fmt(stats.owedToPlatform) },
                ].map(({ label, value }) => (
                  <div className="db-metric" key={label}>
                    <div className="db-metric-label">{label}</div>
                    <div className="db-metric-value">{value}</div>
                  </div>
                ))}
              </div>
              {/* reset button removed */}
            </>
          )}
          <Toast toast={toast} />
          {/* Dashboard reset feature removed */}
        </div>
      </div>
    </>
  )
}
