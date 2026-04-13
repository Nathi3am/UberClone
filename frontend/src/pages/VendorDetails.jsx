import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vexomove.onrender.com';

const SOCIAL_ICONS = {
  facebook:  'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  instagram: 'M16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6zm-4 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm5.5-9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  twitter:   'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z',
  whatsapp:  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.029 18.88a9.896 9.896 0 0 1-5.03-1.372l-.36-.214-3.742.981.999-3.648-.235-.374A9.86 9.86 0 0 1 2.1 12.02C2.1 6.57 6.554 2.12 12.03 2.12a9.865 9.865 0 0 1 7.012 2.905 9.815 9.815 0 0 1 2.893 6.994c-.003 5.45-4.437 9.877-9.906 9.877z',
  tiktok:    'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z',
  youtube:   'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z',
};

function getSocialIcon(platform) {
  const p = (platform || '').toLowerCase();
  for (const [key, path] of Object.entries(SOCIAL_ICONS)) {
    if (p.includes(key)) return path;
  }
  return 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71';
}

export default function VendorDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(
    location.state && location.state.vendor ? location.state.vendor : null
  );
  const [loading, setLoading] = useState(!vendor);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    if (vendor) return;
    let isMounted = true;
    const fetchVendor = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/vendors`);
        const raw = res.data;
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (raw && Array.isArray(raw.vendors)) list = raw.vendors;
        else if (raw && Array.isArray(raw.data)) list = raw.data;
        else if (raw && raw.vendor) list = [raw.vendor];
        const found = list.find(v => v._id === id || v.id === id);
        if (isMounted) {
          setVendor(found || null);
          setError(found ? null : 'Vendor not found');
        }
      } catch (e) {
        if (isMounted) setError('Failed to load vendor');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchVendor();
    return () => { isMounted = false; };
  }, [id, vendor]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <>
        <style>{baseStyles}</style>
        <div className="vd-root">
          <div className="vd-state">
            <div className="vd-spinner" />
            <span>Loading vendor…</span>
          </div>
        </div>
      </>
    );
  }

  if (error || !vendor) {
    return (
      <>
        <style>{baseStyles}</style>
        <div className="vd-root">
          <div className="vd-state">
            <span className="vd-state-emoji">⚠️</span>
            <span style={{ color: '#f87171' }}>{error || 'Vendor not found'}</span>
            <button className="vd-back-btn" onClick={() => navigate(-1)}>← Go Back</button>
          </div>
        </div>
      </>
    );
  }

  const primaryPhone = Array.isArray(vendor.phones) && vendor.phones.length
    ? vendor.phones[0]
    : (vendor.phone || vendor.contactPhone || '');
  const allPhones = Array.isArray(vendor.phones) && vendor.phones.length
    ? vendor.phones
    : primaryPhone ? [primaryPhone] : [];

  const profileUrl =
    (vendor.profileImage && (vendor.profileImage.url || vendor.profileImage.secure_url)) ||
    (vendor.images && vendor.images[0] && (typeof vendor.images[0] === 'string' ? vendor.images[0] : vendor.images[0].url)) ||
    '';

  const images = (vendor.images || []).map(img =>
    typeof img === 'string' ? { url: img } : img
  ).filter(img => img.url);

  const menuItems = vendor.menuItems || vendor.menu || [];
  const socials = vendor.social || vendor.socials || [];
  const weeklyHours = vendor.weeklyHours || vendor.businessHours || [];
  const openDays = weeklyHours.filter(d => d.open);

  return (
    <>
      <style>{baseStyles}</style>
      <div className="vd-root">

        {/* Back button */}
        <div className="vd-topbar">
          <button className="vd-back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
        </div>

        {/* Hero banner */}
        <div className={`vd-hero ${mounted ? 'vd-hero--in' : ''}`}>
          <div className="vd-hero-bg">
            {profileUrl
              ? <img src={profileUrl} alt={vendor.name} className="vd-hero-bg-img" />
              : <div className="vd-hero-bg-placeholder">🍽</div>
            }
            <div className="vd-hero-overlay" />
          </div>

          <div className="vd-hero-content">
            <div className="vd-hero-avatar">
              {profileUrl
                ? <img src={profileUrl} alt={vendor.name} />
                : <span>🍽</span>
              }
            </div>
            <div className="vd-hero-info">
              <h1 className="vd-vendor-name">{vendor.name}</h1>
              {vendor.address && (
                <div className="vd-hero-meta">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {vendor.address}
                </div>
              )}
              {/* open/closed indicator */}
              <div className="vd-hero-badges">
                {openDays.length > 0
                  ? <span className="vd-badge vd-badge-open">● Open Some Days</span>
                  : <span className="vd-badge vd-badge-closed">● Hours Not Set</span>
                }
                {(vendor.deliveryOption || vendor.delivery) && <span className="vd-badge vd-badge-delivery">🛵 Delivery</span>}
                {(vendor.collectionOption || vendor.collection) && <span className="vd-badge vd-badge-collection">🏪 Collection</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="vd-body">

          {/* Contact strip */}
          <div className="vd-contact-strip">
            {allPhones.map((ph, i) => (
              <a key={i} href={`tel:${ph.replace(/\s+/g, '')}`} className="vd-contact-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16l.19.92z"/>
                </svg>
                {ph}
              </a>
            ))}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noreferrer" className="vd-contact-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                {vendor.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {socials.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="vd-contact-pill vd-contact-pill--social">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={getSocialIcon(s.platform)} />
                </svg>
                {s.platform || 'Social'}
              </a>
            ))}
          </div>

          {/* Cards grid */}
          <div className="vd-grid">

            {/* Trading Hours */}
            <div className="vd-card">
              <div className="vd-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Trading Hours
              </div>
              <div className="vd-card-body">
                {weeklyHours.length > 0 ? (
                  <ul className="vd-hours-list">
                    {weeklyHours.map((d, i) => (
                      <li key={i} className={`vd-hours-row ${d.open ? 'vd-hours-open' : 'vd-hours-closed'}`}>
                        <span className="vd-hours-day">{d.day}</span>
                        <span className="vd-hours-time">
                          {d.open
                            ? d.slots && d.slots.length > 0
                              ? d.slots.map((s, si) => `${s.start}–${s.end}`).join(', ')
                              : 'Open'
                            : 'Closed'
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="vd-empty-text">Trading hours not set.</p>
                )}
              </div>
            </div>

            {/* Menu */}
            <div className="vd-card">
              <div className="vd-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                Menu
              </div>
              <div className="vd-card-body">
                {menuItems.length > 0 ? (
                  <ul className="vd-menu-list">
                    {menuItems.map((m, i) => (
                      <li key={i} className="vd-menu-item">
                        <div className="vd-menu-item-left">
                          <span className="vd-menu-dot" />
                          <span className="vd-menu-name">{m.name || m.title || m}</span>
                        </div>
                        {m.price && <span className="vd-menu-price">R {m.price}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="vd-empty-text">No menu items listed.</p>
                )}
              </div>
            </div>

          </div>

          {/* Gallery */}
          {images.length > 0 && (
            <div className="vd-card vd-card--full">
              <div className="vd-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                Gallery
              </div>
              <div className="vd-card-body">
                <div className="vd-gallery">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="vd-gallery-thumb"
                      onClick={() => { setModalIndex(i); setShowModal(true); }}
                    >
                      <img src={img.url} alt={img.caption || `Image ${i + 1}`} />
                      <div className="vd-gallery-thumb-overlay">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>{/* end vd-body */}

        {/* Lightbox */}
        {showModal && images[modalIndex] && (
          <div
            className="vd-modal"
            onClick={() => setShowModal(false)}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchEndX.current = null; }}
            onTouchMove={e => { touchEndX.current = e.touches[0].clientX; }}
            onTouchEnd={() => {
              if (touchStartX.current == null || touchEndX.current == null) return;
              const diff = touchStartX.current - touchEndX.current;
              if (diff > 50) setModalIndex(i => Math.min(i + 1, images.length - 1));
              else if (diff < -50) setModalIndex(i => Math.max(i - 1, 0));
              touchStartX.current = null; touchEndX.current = null;
            }}
          >
            <button className="vd-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <button className="vd-modal-prev" onClick={e => { e.stopPropagation(); setModalIndex(i => Math.max(i - 1, 0)); }}>‹</button>
            <img
              src={images[modalIndex].url}
              alt={images[modalIndex].caption || `Image ${modalIndex + 1}`}
              className="vd-modal-img"
              onClick={e => e.stopPropagation()}
            />
            <button className="vd-modal-next" onClick={e => { e.stopPropagation(); setModalIndex(i => Math.min(i + 1, images.length - 1)); }}>›</button>
            <div className="vd-modal-counter">{modalIndex + 1} / {images.length}</div>
          </div>
        )}

      </div>
    </>
  );
}

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --cream: #fdf6ec;
    --amber: #e8873a;
    --amber-dark: #c9681f;
    --amber-light: #fbb96b;
    --charcoal: #1c1a17;
    --charcoal-mid: #2e2b25;
    --charcoal-light: #3a3630;
    --text-warm: #7a6f63;
    --text-light: #b0a89e;
    --card-bg: #242018;
    --card-border: rgba(232,135,58,0.15);
    --glow: rgba(232,135,58,0.25);
  }

  .vd-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .vd-root {
    font-family: 'DM Sans', sans-serif;
    background: var(--charcoal);
    min-height: 100vh;
    color: var(--cream);
  }

  /* ── Topbar ── */
  .vd-topbar {
    padding: 20px 24px 0;
    max-width: 860px;
    margin: 0 auto;
  }
  .vd-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-light);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .vd-back-btn:hover { background: rgba(255,255,255,0.1); color: var(--cream); }

  /* ── Hero ── */
  .vd-hero {
    position: relative;
    height: 280px;
    margin: 20px 24px 0;
    border-radius: 20px;
    overflow: hidden;
    max-width: 860px;
    margin-left: auto;
    margin-right: auto;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .vd-hero--in { opacity: 1; transform: translateY(0); }

  .vd-hero-bg { position: absolute; inset: 0; }
  .vd-hero-bg-img { width: 100%; height: 100%; object-fit: cover; filter: blur(3px) brightness(0.45); transform: scale(1.05); }
  .vd-hero-bg-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 5rem; opacity: 0.15;
    background: var(--charcoal-mid);
  }
  .vd-hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(28,26,23,1) 0%, rgba(28,26,23,0.5) 50%, rgba(28,26,23,0.1) 100%);
  }

  .vd-hero-content {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 24px;
    display: flex;
    align-items: flex-end;
    gap: 18px;
  }
  .vd-hero-avatar {
    width: 80px; height: 80px;
    border-radius: 16px;
    overflow: hidden;
    border: 3px solid rgba(232,135,58,0.5);
    background: var(--charcoal-mid);
    flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem;
  }
  .vd-hero-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .vd-vendor-name {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 900;
    line-height: 1.1;
    color: var(--cream);
    text-shadow: 0 2px 12px rgba(0,0,0,0.5);
  }
  .vd-hero-meta {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.85rem; color: var(--text-light);
    margin-top: 6px;
  }
  .vd-hero-badges {
    display: flex; gap: 7px; flex-wrap: wrap;
    margin-top: 10px;
  }
  .vd-badge {
    font-size: 0.7rem; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 4px 11px; border-radius: 999px;
    backdrop-filter: blur(6px);
  }
  .vd-badge-open    { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
  .vd-badge-closed  { background: rgba(100,100,100,0.2); color: #9ca3af; border: 1px solid rgba(100,100,100,0.3); }
  .vd-badge-delivery   { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2); }
  .vd-badge-collection { background: rgba(99,102,241,0.12); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); }

  /* ── Body ── */
  .vd-body {
    max-width: 860px;
    margin: 0 auto;
    padding: 24px 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Contact strip ── */
  .vd-contact-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .vd-contact-pill {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    color: var(--text-light);
    font-size: 0.82rem; font-weight: 500;
    padding: 8px 16px;
    border-radius: 999px;
    text-decoration: none;
    transition: border-color 0.2s, color 0.2s, box-shadow 0.2s;
  }
  .vd-contact-pill:hover {
    border-color: var(--amber);
    color: var(--amber-light);
    box-shadow: 0 0 0 3px var(--glow);
  }
  .vd-contact-pill svg { color: var(--amber); opacity: 0.8; flex-shrink: 0; }
  .vd-contact-pill--social { border-color: rgba(99,102,241,0.2); }
  .vd-contact-pill--social:hover { border-color: #818cf8; color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .vd-contact-pill--social svg { color: #818cf8; }

  /* ── Cards grid ── */
  .vd-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  @media (max-width: 600px) { .vd-grid { grid-template-columns: 1fr; } }

  .vd-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .vd-card:hover { border-color: rgba(232,135,58,0.3); }
  .vd-card--full { grid-column: 1 / -1; }

  .vd-card-header {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 0.95rem; font-weight: 600;
    color: var(--cream);
    letter-spacing: 0.01em;
  }
  .vd-card-header svg { color: var(--amber); flex-shrink: 0; }
  .vd-card-body { padding: 16px 20px; }

  /* ── Hours list ── */
  .vd-hours-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .vd-hours-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
  }
  .vd-hours-open  { background: rgba(16,185,129,0.07); }
  .vd-hours-closed { background: rgba(255,255,255,0.02); }
  .vd-hours-day { font-weight: 600; color: var(--cream); min-width: 96px; }
  .vd-hours-open .vd-hours-time  { color: #6ee7b7; }
  .vd-hours-closed .vd-hours-time { color: var(--text-warm); }

  /* ── Menu list ── */
  .vd-menu-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .vd-menu-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .vd-menu-item:last-child { border-bottom: none; }
  .vd-menu-item-left { display: flex; align-items: center; gap: 10px; }
  .vd-menu-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--amber); opacity: 0.7; flex-shrink: 0;
  }
  .vd-menu-name { font-size: 0.9rem; color: var(--cream); }
  .vd-menu-price {
    font-size: 0.85rem; font-weight: 600;
    color: var(--amber-light);
    background: rgba(232,135,58,0.1);
    border: 1px solid rgba(232,135,58,0.2);
    padding: 2px 10px; border-radius: 999px;
    white-space: nowrap;
  }

  /* ── Gallery ── */
  .vd-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }
  .vd-gallery-thumb {
    position: relative;
    aspect-ratio: 4/3;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    background: var(--charcoal-mid);
    border: 1px solid var(--card-border);
  }
  .vd-gallery-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
  .vd-gallery-thumb:hover img { transform: scale(1.08); }
  .vd-gallery-thumb-overlay {
    position: absolute; inset: 0;
    background: rgba(28,26,23,0.5);
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    color: white;
  }
  .vd-gallery-thumb:hover .vd-gallery-thumb-overlay { opacity: 1; }

  /* ── Lightbox ── */
  .vd-modal {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .vd-modal-img {
    max-width: 90vw; max-height: 85vh;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.7);
  }
  .vd-modal-close {
    position: absolute; top: 20px; right: 20px;
    background: rgba(255,255,255,0.1); border: none;
    color: white; font-size: 1.1rem;
    width: 40px; height: 40px; border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .vd-modal-close:hover { background: rgba(255,255,255,0.2); }
  .vd-modal-prev, .vd-modal-next {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(255,255,255,0.1); border: none;
    color: white; font-size: 2rem;
    width: 48px; height: 48px; border-radius: 50%;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .vd-modal-prev { left: 20px; }
  .vd-modal-next { right: 20px; }
  .vd-modal-prev:hover, .vd-modal-next:hover { background: rgba(255,255,255,0.2); }
  .vd-modal-counter {
    position: absolute; bottom: 20px;
    left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.5); color: white;
    font-size: 0.82rem; padding: 5px 14px; border-radius: 999px;
    backdrop-filter: blur(4px);
  }

  /* ── Empty / Loading ── */
  .vd-empty-text { font-size: 0.85rem; color: var(--text-warm); font-style: italic; }
  .vd-state {
    min-height: 400px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px; color: var(--text-warm);
  }
  .vd-state-emoji { font-size: 3rem; opacity: 0.5; }
  .vd-spinner {
    width: 40px; height: 40px;
    border: 3px solid rgba(232,135,58,0.15);
    border-top-color: var(--amber);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
