import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config/api';

export default function Trips() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchDrivers = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/admin/special-trips-drivers`);
        if (!response.ok) throw new Error('Failed to load trips drivers');
        const data = await response.json();
        if (mounted) setDrivers(data.data || []);
      } catch (err) {
        if (mounted) {
          setError('Could not load drivers.');
          setDrivers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDrivers();
    return () => { mounted = false; };
  }, []);

  const filtered = search
    ? drivers.filter(d => {
        const name = `${d.name || ''} ${d.surname || ''}`.toLowerCase();
        const places = Array.isArray(d.places) ? d.places.join(' ') : (d.places || '');
        return name.includes(search.toLowerCase()) || places.toLowerCase().includes(search.toLowerCase());
      })
    : drivers;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .tr-root { font-family: 'DM Sans', sans-serif; background: #080c14; min-height: 100vh; color: #e8edf5; }
        .tr-root * { box-sizing: border-box; }

        /* ── Header ── */
        .tr-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(8,12,20,0.9); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tr-header-inner {
          max-width: 640px; margin: 0 auto;
          padding: 14px 20px; display: flex; align-items: center; gap: 14px;
        }
        .tr-back-btn {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: #94a3b8; text-decoration: none; flex-shrink: 0;
          transition: background 0.2s, color 0.2s;
        }
        .tr-back-btn:hover { background: rgba(255,255,255,0.1); color: #e8edf5; }
        .tr-header-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.3rem; font-weight: 800; color: #e8edf5; line-height: 1;
        }
        .tr-header-sub { font-size: 0.7rem; color: #475569; margin-top: 2px; }

        /* ── Hero ── */
        .tr-hero {
          position: relative; overflow: hidden;
          padding: 44px 20px 36px;
          background: linear-gradient(160deg, #0c1628 0%, #080c14 70%);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .tr-hero::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 100% 0%, rgba(99,102,241,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 0% 100%, rgba(16,185,129,0.07) 0%, transparent 60%);
          pointer-events: none;
        }
        /* road line decoration */
        .tr-road-lines {
          position: absolute; right: 0; top: 0; bottom: 0; width: 180px;
          opacity: 0.04; pointer-events: none;
          background: repeating-linear-gradient(
            90deg,
            transparent 0px, transparent 30px,
            rgba(255,255,255,0.6) 30px, rgba(255,255,255,0.6) 34px
          );
        }
        .tr-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: #818cf8;
          border: 1px solid rgba(129,140,248,0.25);
          padding: 4px 12px; border-radius: 999px; margin-bottom: 14px;
        }
        .tr-hero-heading {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.8rem, 7vw, 2.6rem);
          font-weight: 800; line-height: 1.08; color: #e8edf5;
          max-width: 480px;
        }
        .tr-hero-heading span { color: #818cf8; }
        .tr-hero-sub {
          font-size: 0.88rem; color: #475569; margin-top: 10px;
          max-width: 400px; line-height: 1.6;
        }

        /* stats strip */
        .tr-stats {
          display: flex; gap: 20px; margin-top: 22px;
        }
        .tr-stat { display: flex; flex-direction: column; }
        .tr-stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem; font-weight: 800; color: #e8edf5; line-height: 1;
        }
        .tr-stat-label { font-size: 0.7rem; color: #475569; margin-top: 2px; }
        .tr-stat-div { width: 1px; background: rgba(255,255,255,0.07); }

        /* ── Search ── */
        .tr-search-wrap {
          max-width: 640px; margin: 0 auto;
          padding: 16px 20px 0; position: relative;
        }
        .tr-search-icon {
          position: absolute; left: 34px; top: 50%; transform: translateY(-20%);
          color: #475569; pointer-events: none;
        }
        .tr-search {
          width: 100%; padding: 11px 16px 11px 42px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; color: #e8edf5;
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .tr-search::placeholder { color: #475569; }
        .tr-search:focus {
          border-color: rgba(129,140,248,0.4);
          box-shadow: 0 0 0 3px rgba(129,140,248,0.1);
        }

        /* ── Content ── */
        .tr-content {
          max-width: 640px; margin: 0 auto;
          padding: 20px 20px 100px;
          display: flex; flex-direction: column; gap: 14px;
        }

        /* ── Error ── */
        .tr-error {
          padding: 12px 16px; border-radius: 12px;
          background: rgba(251,146,60,0.08); border: 1px solid rgba(251,146,60,0.18);
          color: #fbbf24; font-size: 0.82rem;
          display: flex; align-items: center; gap: 8px;
        }

        /* ── State ── */
        .tr-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px;
          color: #334155; text-align: center;
        }
        .tr-spinner {
          width: 40px; height: 40px;
          border: 2px solid rgba(99,102,241,0.12);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: trSpin 0.8s linear infinite;
        }
        @keyframes trSpin { to { transform: rotate(360deg); } }

        /* ── Driver Card ── */
        .tr-card {
          border-radius: 20px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(150deg, #0f1623 0%, #0b0f1a 100%);
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
          animation: trCardIn 0.4s ease both;
        }
        .tr-card:hover {
          border-color: rgba(99,102,241,0.25);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.12);
        }
        @keyframes trCardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* card top: driver info */
        .tr-card-top {
          padding: 18px 18px 0;
          display: flex; align-items: center; gap: 14px;
        }
        .tr-driver-avatar {
          position: relative; flex-shrink: 0;
        }
        .tr-driver-img {
          width: 60px; height: 60px; border-radius: 14px;
          object-fit: cover;
          border: 2px solid rgba(99,102,241,0.3);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        .tr-driver-placeholder {
          width: 60px; height: 60px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%);
          border: 2px solid rgba(99,102,241,0.2);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 800; color: #818cf8;
        }
        .tr-online-dot {
          position: absolute; bottom: -2px; right: -2px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #10b981; border: 2px solid #080c14;
        }
        .tr-driver-name {
          font-family: 'Syne', sans-serif;
          font-size: 1.1rem; font-weight: 800; color: #e8edf5; line-height: 1.2;
        }
        .tr-plate {
          display: inline-flex; align-items: center; gap: 5px;
          margin-top: 4px; font-size: 0.75rem; color: #64748b;
          font-family: monospace; letter-spacing: 0.05em;
        }

        /* chips */
        .tr-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 14px 18px 0;
        }
        .tr-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 8px;
          font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;
        }
        .tr-chip-vehicle { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); color: #93c5fd; }
        .tr-chip-seats   { background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.15); color: #67e8f9; }
        .tr-chip-places  { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); color: #fcd34d; }

        /* pricing */
        .tr-pricing { display: flex; gap: 10px; padding: 14px 18px 0; }
        .tr-price-box {
          flex: 1; padding: 12px 10px; border-radius: 12px; text-align: center;
        }
        .tr-price-box--hourly {
          background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.14);
        }
        .tr-price-box--daily {
          background: rgba(139,92,246,0.07); border: 1px solid rgba(139,92,246,0.14);
        }
        .tr-price-label {
          font-size: 0.62rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
        }
        .tr-price-box--hourly .tr-price-label { color: rgba(110,231,183,0.5); }
        .tr-price-box--daily .tr-price-label { color: rgba(167,139,250,0.5); }
        .tr-price-value {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem; font-weight: 800; margin-top: 2px; line-height: 1;
        }
        .tr-price-box--hourly .tr-price-value { color: #6ee7b7; }
        .tr-price-box--daily .tr-price-value { color: #c4b5fd; }
        .tr-price-unit { font-size: 0.62rem; opacity: 0.4; margin-top: 2px; }

        /* places row */
        .tr-places-row {
          margin: 12px 18px 0; padding: 10px 14px;
          border-radius: 10px;
          background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.1);
          display: flex; align-items: flex-start; gap: 8px;
        }
        .tr-places-row svg { color: #fbbf24; flex-shrink: 0; margin-top: 1px; }
        .tr-places-text { font-size: 0.8rem; color: #94a3b8; line-height: 1.5; }
        .tr-places-text strong { color: #fbbf24; display: block; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px; }

        /* contact */
        .tr-card-footer { padding: 12px 18px 16px; }
        .tr-contact-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 11px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          color: #64748b; font-size: 0.8rem; font-weight: 500; cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .tr-contact-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(99,102,241,0.25); color: #cbd5e1; }
        .tr-contact-btn-left { display: flex; align-items: center; gap: 8px; }
        .tr-chevron { transition: transform 0.2s; }
        .tr-chevron.open { transform: rotate(180deg); }
        .tr-contact-panel {
          margin-top: 8px; padding: 14px; border-radius: 10px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
          display: flex; flex-direction: column; gap: 10px;
        }
        .tr-contact-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; text-decoration: none; color: #64748b;
          transition: color 0.2s;
        }
        .tr-contact-row:hover { color: #818cf8; }
        .tr-contact-icon {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.12);
          display: flex; align-items: center; justify-content: center; color: #818cf8;
        }

        /* ── FAB ── */
        .tr-fab {
          position: fixed; bottom: 20px; left: 0; right: 0;
          display: flex; justify-content: center; z-index: 50;
          pointer-events: none;
        }
        .tr-fab a {
          pointer-events: auto;
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 28px; border-radius: 18px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; text-decoration: none;
          font-family: 'Syne', sans-serif;
          font-size: 1rem; font-weight: 800; letter-spacing: 0.04em;
          box-shadow: 0 12px 40px rgba(99,102,241,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .tr-fab a:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(99,102,241,0.5); }
        .tr-fab a:active { transform: scale(0.97); }
      `}</style>

      <div className="tr-root">
        {/* Header */}
        <div className="tr-header">
          <div className="tr-header-inner">
            <Link to="/special-requests" className="tr-back-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <div>
              <div className="tr-header-title">Special Trips</div>
              <div className="tr-header-sub">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} available</div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="tr-hero">
          <div className="tr-road-lines" />
          <div style={{maxWidth:640, margin:'0 auto', position:'relative'}}>
            <div className="tr-hero-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              Trip Drivers
            </div>
            <div className="tr-hero-heading">
              Book Your <span>Next Adventure</span>
            </div>
            <p className="tr-hero-sub">
              Comfortable, reliable drivers for long trips, group outings, airport runs and special occasions.
            </p>
            {!loading && drivers.length > 0 && (
              <div className="tr-stats">
                <div className="tr-stat">
                  <span className="tr-stat-val">{drivers.length}</span>
                  <span className="tr-stat-label">Drivers</span>
                </div>
                <div className="tr-stat-div" />
                <div className="tr-stat">
                  <span className="tr-stat-val">{[...new Set(drivers.flatMap(d => Array.isArray(d.places) ? d.places : []))].length || '—'}</span>
                  <span className="tr-stat-label">Destinations</span>
                </div>
                <div className="tr-stat-div" />
                <div className="tr-stat">
                  <span className="tr-stat-val">{Math.min(...drivers.map(d => Number(d.hourlyRate || d.dayRate || 0)).filter(Boolean)) > 0 ? `R${Math.min(...drivers.map(d => Number(d.hourlyRate || 0)).filter(Boolean))}` : '—'}</span>
                  <span className="tr-stat-label">From / hr</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="tr-search-wrap">
          <svg className="tr-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="tr-search"
            placeholder="Search by driver name or destination…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        <div className="tr-content">
          {error && (
            <div className="tr-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="tr-state">
              <div className="tr-spinner" />
              <span style={{fontSize:'0.85rem', color:'#475569'}}>Finding drivers near you…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="tr-state">
              <span style={{fontSize:'2.5rem', opacity:0.3}}>🗺</span>
              <span style={{fontSize:'0.88rem'}}>{search ? 'No drivers match your search.' : 'No drivers available yet.'}</span>
            </div>
          ) : (
            filtered.map((driver, idx) => {
              const rawImage = driver.imageUrl || '';
              const imageSrc = rawImage
                ? rawImage.startsWith('http') ? rawImage
                  : rawImage.startsWith('/') ? `${API_BASE_URL}${rawImage}`
                  : `${API_BASE_URL}/${rawImage}`
                : '';
              const cardId = driver._id || driver.id;
              const isExpanded = expandedCard === cardId;
              const fullName = [driver.name, driver.surname].filter(Boolean).join(' ');
              const places = Array.isArray(driver.places)
                ? driver.places.join(', ')
                : (driver.places || '');

              return (
                <div key={cardId} className="tr-card" style={{animationDelay:`${idx * 0.06}s`}}>
                  {/* Driver header */}
                  <div className="tr-card-top">
                    <div className="tr-driver-avatar">
                      {imageSrc
                        ? <img src={imageSrc} alt={fullName} className="tr-driver-img" />
                        : <div className="tr-driver-placeholder">{(driver.name || '?')[0].toUpperCase()}</div>
                      }
                      <div className="tr-online-dot" />
                    </div>
                    <div>
                      <div className="tr-driver-name">{fullName || 'Driver'}</div>
                      {driver.plateNumber && (
                        <div className="tr-plate">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="10" rx="2"/>
                          </svg>
                          {driver.plateNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info chips */}
                  <div className="tr-chips">
                    {driver.vehicleType && (
                      <span className="tr-chip tr-chip-vehicle">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/></svg>
                        {driver.vehicleType}
                      </span>
                    )}
                    {driver.vehicleCapacity && (
                      <span className="tr-chip tr-chip-seats">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {driver.vehicleCapacity} seats
                      </span>
                    )}
                  </div>

                  {/* Destinations */}
                  {places && (
                    <div className="tr-places-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18M12 3l9 9-9 9"/>
                      </svg>
                      <div className="tr-places-text">
                        <strong>Destinations</strong>
                        {places}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="tr-pricing">
                    <div className="tr-price-box tr-price-box--hourly">
                      <div className="tr-price-label">Per Hour</div>
                      <div className="tr-price-value">R{Number(driver.hourlyRate || 0).toFixed(0)}</div>
                      <div className="tr-price-unit">hourly rate</div>
                    </div>
                    <div className="tr-price-box tr-price-box--daily">
                      <div className="tr-price-label">Full Day</div>
                      <div className="tr-price-value">R{Number(driver.dayRate || 0).toFixed(0)}</div>
                      <div className="tr-price-unit">daily rate</div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="tr-card-footer">
                    <button
                      className="tr-contact-btn"
                      onClick={() => setExpandedCard(isExpanded ? null : cardId)}
                    >
                      <div className="tr-contact-btn-left">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16l.19.92z"/>
                        </svg>
                        Contact Driver
                      </div>
                      <svg className={`tr-chevron ${isExpanded ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="tr-contact-panel">
                        {driver.email && (
                          <a href={`mailto:${driver.email}`} className="tr-contact-row">
                            <div className="tr-contact-icon">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            </div>
                            {driver.email}
                          </a>
                        )}
                        {driver.phone && (
                          <a href={`tel:${driver.phone}`} className="tr-contact-row">
                            <div className="tr-contact-icon">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16l.19.92z"/></svg>
                            </div>
                            {driver.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="tr-fab">
        <Link to="/special-requests">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          Browse Rentals
        </Link>
      </div>
    </>
  );
}
