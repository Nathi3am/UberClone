import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const FOOD_EMOJIS = ['🍔', '🍕', '🌮', '🥗', '🍜', '🥩', '🍱', '🥘'];

export default function LetsEatLocal() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/vendors`);
        const raw = res.data;
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (raw && Array.isArray(raw.vendors)) list = raw.vendors;
        else if (raw && Array.isArray(raw.data)) list = raw.data;
        else if (raw && raw.vendor) list = [raw.vendor];
        if (mounted) setVendors(list);
      } catch (err) {
        console.error('Failed to load vendors', err);
        if (mounted) setError('Failed to load vendors');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchVendors();
    return () => (mounted = false);
  }, []);

  const filtered = vendors.filter(v =>
    !search || (v.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --cream: #fdf6ec;
          --amber: #e8873a;
          --amber-dark: #c9681f;
          --amber-light: #fbb96b;
          --charcoal: #1c1a17;
          --charcoal-mid: #2e2b25;
          --charcoal-light: #4a4640;
          --text-warm: #7a6f63;
          --text-light: #b0a89e;
          --card-bg: #242018;
          --card-border: rgba(232,135,58,0.15);
          --glow: rgba(232,135,58,0.25);
        }

        .eatlocal-root * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .eatlocal-root {
          font-family: 'DM Sans', sans-serif;
          background-color: var(--charcoal);
          min-height: 100vh;
          color: var(--cream);
        }

        /* ── Hero ── */
        .el-hero {
          position: relative;
          padding: 72px 24px 56px;
          text-align: center;
          overflow: hidden;
        }
        .el-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,135,58,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 20% 100%, rgba(232,135,58,0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .el-hero-tag {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--amber);
          border: 1px solid rgba(232,135,58,0.4);
          border-radius: 999px;
          padding: 5px 16px;
          margin-bottom: 20px;
          backdrop-filter: blur(4px);
        }
        .el-hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.4rem, 6vw, 4.2rem);
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }
        .el-hero h1 em {
          font-style: italic;
          color: var(--amber);
        }
        .el-hero-sub {
          font-size: 1rem;
          color: var(--text-warm);
          max-width: 480px;
          margin: 0 auto 36px;
          line-height: 1.6;
          font-weight: 300;
        }

        /* floating food emojis */
        .el-float-emoji {
          position: absolute;
          font-size: 1.6rem;
          opacity: 0.18;
          animation: floatUp 6s ease-in-out infinite;
          pointer-events: none;
          user-select: none;
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-14px) rotate(5deg); }
        }

        /* ── Search ── */
        .el-search-wrap {
          position: relative;
          max-width: 420px;
          margin: 0 auto;
        }
        .el-search-wrap svg {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-warm);
          pointer-events: none;
        }
        .el-search {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(232,135,58,0.2);
          border-radius: 999px;
          padding: 12px 20px 12px 44px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          color: var(--cream);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .el-search::placeholder { color: var(--text-warm); }
        .el-search:focus {
          border-color: var(--amber);
          box-shadow: 0 0 0 3px var(--glow);
        }

        /* ── Divider ── */
        .el-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: 1080px;
          margin: 0 auto 32px;
          padding: 0 24px;
        }
        .el-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(232,135,58,0.25), transparent);
        }
        .el-divider-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--amber);
          opacity: 0.5;
        }
        .el-count {
          font-size: 0.8rem;
          color: var(--text-light);
          font-weight: 500;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        /* ── Grid ── */
        .el-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 28px;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        /* ── Card ── */
        .el-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          cursor: pointer;
          animation: cardIn 0.5s ease both;
        }
        .el-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,135,58,0.35);
          border-color: rgba(232,135,58,0.35);
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* card image */
        .el-card-img-wrap {
          position: relative;
          height: 190px;
          background: var(--charcoal-mid);
          overflow: hidden;
        }
        .el-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .el-card:hover .el-card-img { transform: scale(1.06); }
        .el-card-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.5rem;
          opacity: 0.3;
          background: repeating-linear-gradient(
            -45deg,
            rgba(255,255,255,0.02) 0px,
            rgba(255,255,255,0.02) 4px,
            transparent 4px,
            transparent 12px
          );
        }
        .el-card-img-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(24,22,17,0.95) 0%, rgba(24,22,17,0.2) 50%, transparent 100%);
        }

        /* avatar */
        .el-avatar {
          position: absolute;
          bottom: -22px;
          left: 20px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid var(--charcoal);
          overflow: hidden;
          background: var(--charcoal-mid);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 2;
        }
        .el-avatar img, .el-avatar-placeholder {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }

        /* open badge */
        .el-open-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(22,163,74,0.9);
          color: #fff;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
          backdrop-filter: blur(6px);
          z-index: 2;
        }

        /* card body */
        .el-card-body {
          padding: 32px 20px 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .el-card-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--cream);
          line-height: 1.2;
          margin-top: 4px;
        }
        .el-card-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .el-card-meta-row {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.83rem;
          color: var(--text-light);
          font-weight: 400;
        }
        .el-card-meta-row svg { flex-shrink: 0; color: var(--amber); opacity: 0.8; }
        .el-card-meta-row a {
          color: var(--text-light);
          text-decoration: none;
        }
        .el-card-meta-row a:hover { color: var(--amber-light); }

        /* menu chips */
        .el-menu-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }
        .el-chip {
          background: rgba(232,135,58,0.1);
          border: 1px solid rgba(232,135,58,0.2);
          color: var(--amber-light);
          font-size: 0.72rem;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 999px;
          letter-spacing: 0.02em;
        }

        /* delivery/collection tags */
        .el-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .el-tag {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 6px;
        }
        .el-tag-delivery { background: rgba(16,185,129,0.12); color: #6ee7b7; }
        .el-tag-collection { background: rgba(99,102,241,0.12); color: #a5b4fc; }

        /* card footer */
        .el-card-footer {
          padding: 14px 20px 18px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .el-view-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, var(--amber) 0%, var(--amber-dark) 100%);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 8px 18px;
          border-radius: 999px;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(232,135,58,0.3);
        }
        .el-view-btn:hover {
          opacity: 0.92;
          transform: scale(1.04);
          box-shadow: 0 6px 20px rgba(232,135,58,0.45);
        }

        /* ── Empty / Loading / Error ── */
        .el-state {
          min-height: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-warm);
          font-size: 1rem;
        }
        .el-state-emoji { font-size: 3rem; opacity: 0.5; }
        .el-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(232,135,58,0.15);
          border-top-color: var(--amber);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .el-grid { grid-template-columns: 1fr; padding: 0 16px 60px; }
          .el-hero { padding: 56px 16px 40px; }
        }
      `}</style>

      <div className="eatlocal-root">
        {/* Hero */}
        <div className="el-hero">
          {/* floating emojis */}
          {FOOD_EMOJIS.map((em, i) => (
            <span
              key={i}
              className="el-float-emoji"
              style={{
                left: `${8 + i * 12}%`,
                top: `${10 + (i % 3) * 22}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${4 + i * 0.5}s`,
                fontSize: `${1.2 + (i % 3) * 0.5}rem`,
              }}
            >{em}</span>
          ))}

          <div className="el-hero-tag">🍽 Estcourt Eats</div>
          <h1>Discover <em>Local</em><br />Flavours Near You</h1>
          <p className="el-hero-sub">
            From home kitchens to street stalls — explore the freshest local vendors in your community.
          </p>

          <div className="el-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="el-search"
              placeholder="Search by name or area…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="el-divider">
          <div className="el-divider-line" />
          <div className="el-divider-dot" />
          {!loading && (
            <span className="el-count">
              {filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'} found
            </span>
          )}
          <div className="el-divider-dot" />
          <div className="el-divider-line" />
        </div>

        {/* States */}
        {loading && (
          <div className="el-state">
            <div className="el-spinner" />
            <span>Finding local flavours…</span>
          </div>
        )}
        {!loading && error && (
          <div className="el-state">
            <span className="el-state-emoji">⚠️</span>
            <span style={{ color: '#f87171' }}>{error}</span>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="el-state">
            <span className="el-state-emoji">🍽</span>
            <span>{search ? 'No vendors match your search.' : 'No vendors found yet.'}</span>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="el-grid">
            {filtered.map((v, idx) => {
              const imageUrl =
                (v.profileImage && (v.profileImage.url || v.profileImage.secure_url)) ||
                (v.images && v.images[0] && (typeof v.images[0] === 'string' ? v.images[0] : v.images[0].url)) ||
                '';
              const phone = Array.isArray(v.phones) && v.phones.length
                ? v.phones[0]
                : (v.phone || v.contactPhone || '');
              const menuItems = v.menuItems || v.menu || [];
              const emoji = FOOD_EMOJIS[idx % FOOD_EMOJIS.length];

              return (
                <div
                  key={v._id || v.id || idx}
                  className="el-card"
                  style={{ animationDelay: `${idx * 0.07}s` }}
                >
                  {/* Image */}
                  <div className="el-card-img-wrap">
                    {imageUrl
                      ? <img src={imageUrl} alt={v.name} className="el-card-img" />
                      : <div className="el-card-img-placeholder">{emoji}</div>
                    }
                    <div className="el-card-img-gradient" />

                    {/* Avatar */}
                    <div className="el-avatar">
                      {imageUrl
                        ? <img src={imageUrl} alt={v.name} />
                        : <div className="el-avatar-placeholder" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>{emoji}</div>
                      }
                    </div>

                    {/* Open badge — show if any hours are marked open */}
                    {Array.isArray(v.weeklyHours) && v.weeklyHours.some(h => h.open) && (
                      <div className="el-open-badge">Open</div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="el-card-body">
                    <div className="el-card-name">{v.name || 'Unnamed Vendor'}</div>

                    <div className="el-card-meta">
                      {phone && (
                        <div className="el-card-meta-row">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16l.19.92z"/>
                          </svg>
                          <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>
                        </div>
                      )}
                      {v.address && (
                        <div className="el-card-meta-row">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {v.address}
                        </div>
                      )}
                      {v.website && (
                        <div className="el-card-meta-row">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          <a href={v.website} target="_blank" rel="noopener noreferrer">
                            {v.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Menu chips */}
                    {menuItems.length > 0 && (
                      <div className="el-menu-chips">
                        {menuItems.slice(0, 4).map((m, i) => (
                          <span key={i} className="el-chip">
                            {m.name || m.title || m}
                          </span>
                        ))}
                        {menuItems.length > 4 && (
                          <span className="el-chip">+{menuItems.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Delivery / Collection tags */}
                    {(v.deliveryOption || v.delivery || v.collectionOption || v.collection) && (
                      <div className="el-tags">
                        {(v.deliveryOption || v.delivery) && <span className="el-tag el-tag-delivery">🛵 Delivery</span>}
                        {(v.collectionOption || v.collection) && <span className="el-tag el-tag-collection">🏪 Collection</span>}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="el-card-footer">
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                      {menuItems.length > 0 ? `${menuItems.length} menu item${menuItems.length !== 1 ? 's' : ''}` : 'View details'}
                    </span>
                    <Link
                      to={`/vendors/${v._id || v.id}`}
                      state={{ vendor: v }}
                      className="el-view-btn"
                    >
                      View Menu
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
