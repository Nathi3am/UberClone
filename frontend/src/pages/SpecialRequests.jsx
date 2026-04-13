import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config/api';

const VEHICLE_ICONS = {
  van:     'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  trailer: 'M3 17h14M5 17V8h10v9M5 8l2-4h6l2 4M19 17h2M1 17h2',
  truck:   'M1 3h11v13H1zM12 8h4l3 3v5h-7V8zM4 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bakkie:  'M2 6h13v11H2zM15 10h4l3 4v3h-7v-7zM5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  default: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
};

function getVehicleIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('van')) return VEHICLE_ICONS.van;
  if (n.includes('trailer')) return VEHICLE_ICONS.trailer;
  if (n.includes('truck')) return VEHICLE_ICONS.truck;
  if (n.includes('bakkie') || n.includes('pickup')) return VEHICLE_ICONS.bakkie;
  return VEHICLE_ICONS.default;
}

const VEHICLE_EMOJIS = { van: '🚐', trailer: '🚛', truck: '🚚', bakkie: '🛻', default: '🚗' };
function getVehicleEmoji(name = '') {
  const n = name.toLowerCase();
  if (n.includes('van')) return '🚐';
  if (n.includes('trailer')) return '🚛';
  if (n.includes('truck')) return '🚚';
  if (n.includes('bakkie') || n.includes('pickup')) return '🛻';
  return '🚗';
}

export default function SpecialRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    const fetchItems = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/users/special-requests`);
        if (!response.ok) throw new Error('Failed to load special requests');
        const data = await response.json();
        if (mounted) setItems(data.data || []);
      } catch (err) {
        console.error('Error loading special requests:', err);
        if (mounted) {
          setError('Could not load live listings — showing demo items.');
          setItems([
            { id: 1, name: 'Small Van', description: 'Comfortable 5-seat small cargo van, great for moves and deliveries.', ratePerHour: 150, ratePerDay: 1100, contactName: 'John Dube', contactPhone: '082 000 0001' },
            { id: 2, name: 'Large Van', description: 'Spacious 9-seat van, ideal for group moves or large cargo.', ratePerHour: 230, ratePerDay: 1800, contactName: 'Mary Nkosi', contactPhone: '083 000 0002' },
            { id: 3, name: 'Trailer', description: 'Heavy-duty trailer for equipment, furniture and luggage.', ratePerHour: 120, ratePerDay: 900, contactName: 'Sipho Mthembu', contactPhone: '084 000 0003' },
            { id: 4, name: 'Bakkie', description: '4x4 pickup truck for rugged terrain and heavy loads.', ratePerHour: 180, ratePerDay: 1300, contactName: 'Themba Zulu', contactPhone: '085 000 0004' },
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchItems();
    return () => { mounted = false; };
  }, []);

  const categories = ['all', ...new Set(items.map(i => {
    const n = (i.name || '').toLowerCase();
    if (n.includes('van')) return 'van';
    if (n.includes('trailer')) return 'trailer';
    if (n.includes('truck')) return 'truck';
    if (n.includes('bakkie') || n.includes('pickup')) return 'bakkie';
    return 'other';
  }))];

  const filtered = filter === 'all' ? items : items.filter(i => {
    const n = (i.name || '').toLowerCase();
    if (filter === 'van') return n.includes('van');
    if (filter === 'trailer') return n.includes('trailer');
    if (filter === 'truck') return n.includes('truck');
    if (filter === 'bakkie') return n.includes('bakkie') || n.includes('pickup');
    return true;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .sr-root { font-family: 'DM Sans', sans-serif; background: #0d0d0f; min-height: 100vh; color: #f0ede8; }
        .sr-root * { box-sizing: border-box; }

        /* ── Disclaimer ── */
        .sr-disclaimer-overlay {
          position: fixed; inset: 0; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.88); backdrop-filter: blur(12px);
          padding: 20px;
        }
        .sr-disclaimer-box {
          max-width: 440px; width: 100%;
          background: linear-gradient(145deg, #18181c 0%, #111114 100%);
          border: 1px solid rgba(251,146,60,0.2);
          border-radius: 24px; padding: 32px;
          position: relative; overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,146,60,0.1);
        }
        .sr-disclaimer-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #f97316, #fb923c, #fbbf24);
        }
        .sr-disclaimer-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(251,146,60,0.12);
          border: 1px solid rgba(251,146,60,0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .sr-disclaimer-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.6rem; font-weight: 800; letter-spacing: 0.02em;
          color: #f0ede8; margin-bottom: 14px;
        }
        .sr-disclaimer-text { font-size: 0.875rem; color: #9ca3af; line-height: 1.65; }
        .sr-disclaimer-text + .sr-disclaimer-text { margin-top: 10px; }
        .sr-disclaimer-link { color: #fb923c; text-decoration: underline; text-underline-offset: 2px; }
        .sr-disclaimer-btn {
          margin-top: 24px; width: 100%; padding: 14px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff; font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.1rem; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; border: none; border-radius: 12px;
          cursor: pointer; transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 8px 24px rgba(249,115,22,0.35);
        }
        .sr-disclaimer-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .sr-disclaimer-btn:active { transform: scale(0.98); }

        /* ── Header ── */
        .sr-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(13,13,15,0.9); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sr-header-inner {
          max-width: 640px; margin: 0 auto;
          padding: 14px 20px; display: flex; align-items: center; gap: 14px;
        }
        .sr-back-btn {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: #9ca3af; text-decoration: none; flex-shrink: 0;
          transition: background 0.2s, color 0.2s;
        }
        .sr-back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .sr-header-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.4rem; font-weight: 800;
          letter-spacing: 0.04em; color: #f0ede8; line-height: 1;
        }
        .sr-header-sub { font-size: 0.72rem; color: #6b7280; margin-top: 2px; }

        /* ── Hero banner ── */
        .sr-hero {
          position: relative; overflow: hidden;
          padding: 40px 20px 32px;
          background: linear-gradient(160deg, #18130e 0%, #0d0d0f 60%);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .sr-hero::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 100% 0%, rgba(249,115,22,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 0% 100%, rgba(249,115,22,0.06) 0%, transparent 50%);
          pointer-events: none;
        }
        .sr-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: #fb923c;
          border: 1px solid rgba(251,146,60,0.3);
          padding: 4px 12px; border-radius: 999px;
          margin-bottom: 14px;
        }
        .sr-hero-heading {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(2rem, 8vw, 2.8rem);
          font-weight: 800; letter-spacing: 0.02em; line-height: 1.05;
          color: #f0ede8; max-width: 500px;
        }
        .sr-hero-heading span { color: #fb923c; }
        .sr-hero-sub {
          font-size: 0.88rem; color: #6b7280;
          margin-top: 10px; max-width: 400px; line-height: 1.6;
        }
        .sr-hero-emoji {
          position: absolute; right: 24px; top: 50%; transform: translateY(-50%);
          font-size: 5rem; opacity: 0.08; pointer-events: none; user-select: none;
        }

        /* ── Filter chips ── */
        .sr-filters {
          display: flex; gap: 8px; overflow-x: auto; padding: 16px 20px 0;
          max-width: 640px; margin: 0 auto;
          scrollbar-width: none;
        }
        .sr-filters::-webkit-scrollbar { display: none; }
        .sr-filter-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 999px;
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.04em;
          text-transform: capitalize; white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #9ca3af; cursor: pointer;
          transition: all 0.2s;
        }
        .sr-filter-chip:hover { border-color: rgba(251,146,60,0.3); color: #fb923c; }
        .sr-filter-chip.active {
          background: rgba(249,115,22,0.15);
          border-color: rgba(249,115,22,0.4);
          color: #fb923c;
        }

        /* ── Main content ── */
        .sr-content {
          max-width: 640px; margin: 0 auto;
          padding: 20px 20px 100px;
          display: flex; flex-direction: column; gap: 16px;
        }

        /* ── Error banner ── */
        .sr-error {
          padding: 12px 16px; border-radius: 12px;
          background: rgba(251,146,60,0.08); border: 1px solid rgba(251,146,60,0.2);
          color: #fbbf24; font-size: 0.82rem;
          display: flex; align-items: center; gap: 8px;
        }

        /* ── State ── */
        .sr-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px;
          color: #4b5563; text-align: center;
        }
        .sr-state-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: center; font-size: 1.8rem;
        }
        .sr-spinner {
          width: 40px; height: 40px;
          border: 2px solid rgba(249,115,22,0.15);
          border-top-color: #f97316;
          border-radius: 50%;
          animation: srSpin 0.8s linear infinite;
        }
        @keyframes srSpin { to { transform: rotate(360deg); } }

        /* ── Card ── */
        .sr-card {
          border-radius: 18px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          background: linear-gradient(160deg, #16141a 0%, #0f0f12 100%);
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
          animation: srCardIn 0.4s ease both;
        }
        .sr-card:hover {
          border-color: rgba(249,115,22,0.25);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.15);
        }
        @keyframes srCardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* card image */
        .sr-card-img-wrap {
          position: relative; height: 180px;
          background: #16141a; overflow: hidden;
        }
        .sr-card-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.6s ease;
        }
        .sr-card:hover .sr-card-img { transform: scale(1.05); }
        .sr-card-img-gradient {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(13,13,15,0.95) 0%, transparent 60%);
        }
        .sr-card-no-img {
          width: 100%; height: 120px;
          display: flex; align-items: center; justify-content: center;
          font-size: 3.5rem;
          background: linear-gradient(135deg, #1a1820 0%, #0f0f12 100%);
          opacity: 0.4;
        }
        .sr-avail-badge {
          position: absolute; bottom: 12px; left: 12px;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 11px; border-radius: 999px;
          background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.25);
          color: #6ee7b7; font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.05em; backdrop-filter: blur(6px);
        }
        .sr-avail-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

        /* card body */
        .sr-card-body { padding: 18px 18px 6px; }
        .sr-card-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.35rem; font-weight: 800; letter-spacing: 0.03em;
          color: #f0ede8; line-height: 1.1; text-transform: uppercase;
        }
        .sr-card-desc {
          font-size: 0.82rem; color: #6b7280; margin-top: 5px;
          line-height: 1.55; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        /* pricing */
        .sr-pricing { display: flex; gap: 10px; margin-top: 14px; }
        .sr-price-box {
          flex: 1; padding: 12px 10px;
          border-radius: 12px; text-align: center;
        }
        .sr-price-box--hourly {
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.15);
        }
        .sr-price-box--daily {
          background: rgba(139,92,246,0.07);
          border: 1px solid rgba(139,92,246,0.15);
        }
        .sr-price-label {
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
        }
        .sr-price-box--hourly .sr-price-label { color: rgba(110,231,183,0.6); }
        .sr-price-box--daily .sr-price-label { color: rgba(167,139,250,0.6); }
        .sr-price-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.6rem; font-weight: 700; margin-top: 2px; line-height: 1;
        }
        .sr-price-box--hourly .sr-price-value { color: #6ee7b7; }
        .sr-price-box--daily .sr-price-value { color: #c4b5fd; }
        .sr-price-unit { font-size: 0.65rem; opacity: 0.5; margin-top: 2px; }

        /* contact */
        .sr-card-footer { padding: 12px 18px 16px; }
        .sr-contact-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 11px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          color: #6b7280; font-size: 0.8rem; font-weight: 500; cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .sr-contact-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(249,115,22,0.2); color: #d1d5db; }
        .sr-contact-btn-left { display: flex; align-items: center; gap: 8px; }
        .sr-chevron { transition: transform 0.2s; }
        .sr-chevron.open { transform: rotate(180deg); }

        .sr-contact-panel {
          margin-top: 8px; padding: 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          display: flex; flex-direction: column; gap: 10px;
        }
        .sr-contact-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; text-decoration: none;
          color: #9ca3af; transition: color 0.2s;
        }
        .sr-contact-row:hover { color: #fb923c; }
        .sr-contact-icon {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.12);
          display: flex; align-items: center; justify-content: center; color: #fb923c;
        }

        /* ── Floating CTA ── */
        .sr-fab {
          position: fixed; bottom: 20px; left: 0; right: 0;
          display: flex; justify-content: center; z-index: 50;
          pointer-events: none;
        }
        .sr-fab a {
          pointer-events: auto;
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 28px; border-radius: 18px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #fff; text-decoration: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.1rem; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase;
          box-shadow: 0 12px 40px rgba(249,115,22,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sr-fab a:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(249,115,22,0.5); }
        .sr-fab a:active { transform: scale(0.97); }
      `}</style>

      {/* Disclaimer */}
      {showDisclaimer && (
        <div className="sr-disclaimer-overlay">
          <div className="sr-disclaimer-box">
            <div className="sr-disclaimer-bar" />
            <div className="sr-disclaimer-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2">
                <path d="M10.29 3.86l-8.01 14A2 2 0 004.09 21h15.82a2 2 0 001.81-3.14l-8.01-14a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="sr-disclaimer-title">Important Notice</div>
            <p className="sr-disclaimer-text">
              Prices on <strong style={{color:'#f0ede8'}}>VexoMove</strong> are set independently by contractors and not by the platform. Contact the contractor directly for any enquiries.
            </p>
            <p className="sr-disclaimer-text" style={{marginTop:10}}>
              To report a fraudulent listing, email{' '}
              <a href="mailto:support@vexomove.co.za" className="sr-disclaimer-link">support@vexomove.co.za</a>.
            </p>
            <button className="sr-disclaimer-btn" onClick={() => setShowDisclaimer(false)}>
              I Understand — Let's Go
            </button>
          </div>
        </div>
      )}

      <div className="sr-root">
        {/* Header */}
        <div className="sr-header">
          <div className="sr-header-inner">
            <Link to="/" className="sr-back-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <div>
              <div className="sr-header-title">Rental Marketplace</div>
              <div className="sr-header-sub">{items.length} listing{items.length !== 1 ? 's' : ''} available</div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="sr-hero">
          <span className="sr-hero-emoji">🚛</span>
          <div style={{maxWidth:640, margin:'0 auto'}}>
            <div className="sr-hero-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              Hire a Vehicle
            </div>
            <div className="sr-hero-heading">
              Find the Right<br /><span>Vehicle for the Job</span>
            </div>
            <p className="sr-hero-sub">Trailers, bakkies, vans and more — listed by local contractors. Hire by the hour or day.</p>
          </div>
        </div>

        {/* Filter chips */}
        {categories.length > 1 && (
          <div className="sr-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`sr-filter-chip ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="sr-content">
          {error && (
            <div className="sr-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="sr-state">
              <div className="sr-spinner" />
              <span style={{fontSize:'0.85rem', color:'#6b7280'}}>Loading listings…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="sr-state">
              <div className="sr-state-icon">🚗</div>
              <span style={{fontSize:'0.88rem'}}>No listings available yet</span>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const rawImage = item.imageUrl || item.image || '';
              const imageSrc = rawImage
                ? rawImage.startsWith('http') ? rawImage
                  : rawImage.startsWith('/') ? `${API_BASE_URL}${rawImage}`
                  : `${API_BASE_URL}/${rawImage}`
                : '';
              const cardId = item._id || item.id;
              const isExpanded = expandedCard === cardId;
              const emoji = getVehicleEmoji(item.name);

              return (
                <div key={cardId} className="sr-card" style={{animationDelay:`${idx*0.06}s`}}>
                  {/* Image or placeholder */}
                  {imageSrc ? (
                    <div className="sr-card-img-wrap">
                      <img src={imageSrc} alt={item.name} className="sr-card-img" />
                      <div className="sr-card-img-gradient" />
                      <div className="sr-avail-badge">
                        <span className="sr-avail-dot" />
                        {item.availableIn || 'Available Now'}
                      </div>
                    </div>
                  ) : (
                    <div style={{position:'relative'}}>
                      <div className="sr-card-no-img">{emoji}</div>
                      <div className="sr-avail-badge" style={{position:'absolute',bottom:10,left:12}}>
                        <span className="sr-avail-dot" />
                        {item.availableIn || 'Available Now'}
                      </div>
                    </div>
                  )}

                  <div className="sr-card-body">
                    <div className="sr-card-name">{item.name}</div>
                    {item.description && <p className="sr-card-desc">{item.description}</p>}

                    <div className="sr-pricing">
                      <div className="sr-price-box sr-price-box--hourly">
                        <div className="sr-price-label">Per Hour</div>
                        <div className="sr-price-value">R{Number(item.ratePerHour || item.hourly || 0).toFixed(0)}</div>
                        <div className="sr-price-unit">hourly rate</div>
                      </div>
                      <div className="sr-price-box sr-price-box--daily">
                        <div className="sr-price-label">Per Day</div>
                        <div className="sr-price-value">R{Number(item.ratePerDay || item.daily || 0).toFixed(0)}</div>
                        <div className="sr-price-unit">daily rate</div>
                      </div>
                    </div>
                  </div>

                  {(item.contactName || item.contactPhone || item.contactEmail) && (
                    <div className="sr-card-footer">
                      <button
                        className="sr-contact-btn"
                        onClick={() => setExpandedCard(isExpanded ? null : cardId)}
                      >
                        <div className="sr-contact-btn-left">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          Contact Contractor
                        </div>
                        <svg className={`sr-chevron ${isExpanded ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="sr-contact-panel">
                          {item.contactName && (
                            <div className="sr-contact-row">
                              <div className="sr-contact-icon">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              </div>
                              {item.contactName}
                            </div>
                          )}
                          {item.contactPhone && (
                            <a href={`tel:${item.contactPhone}`} className="sr-contact-row">
                              <div className="sr-contact-icon">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16l.19.92z"/></svg>
                              </div>
                              {item.contactPhone}
                            </a>
                          )}
                          {item.contactEmail && (
                            <a href={`mailto:${item.contactEmail}`} className="sr-contact-row">
                              <div className="sr-contact-icon">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                              </div>
                              {item.contactEmail}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="sr-fab">
        <Link to="/account/trips">
          <span>🚖</span>
          Need a Trip Driver?
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </>
  );
}
