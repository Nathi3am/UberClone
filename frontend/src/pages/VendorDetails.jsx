import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vexomove.onrender.com';

export default function VendorDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(location.state && location.state.vendor ? location.state.vendor : null);
  const [loading, setLoading] = useState(!vendor);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (vendor) return;
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/vendors`);
        const list = Array.isArray(res.data) ? res.data : (res.data && res.data.vendors) || [];
        const found = list.find((v) => (v._id === id) || (v.id === id));
        if (mounted) {
          setVendor(found || null);
          setError(found ? null : 'Vendor not found');
        }
      } catch (e) {
        if (mounted) setError('Failed to load vendor');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => (mounted = false);
  }, [id, vendor]);

  if (loading) return <div className="px-4 py-8 text-slate-300">Loading vendor...</div>;
  if (error) return <div className="px-4 py-8 text-red-400">{error}</div>;
  if (!vendor) return <div className="px-4 py-8 text-slate-400">Vendor not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-start gap-6">
        <div className="w-28 h-28 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
          {vendor.images && vendor.images[0] ? (
            <img src={vendor.images[0].url} alt={vendor.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">No Image</div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{vendor.name}</h1>
            <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-white">Back</button>
          </div>
          {vendor.phone && <p className="text-slate-400 mt-1">{vendor.phone}</p>}
          {vendor.address && <p className="text-slate-400 mt-1">{vendor.address}</p>}
          {/* Website and social icons */}
          <div className="vendor-links">
            {vendor.website && (
              <div className="vendor-link">
                <a href={vendor.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-2">
                  <i className="ri-global-line"></i>
                  <span className="text-sm text-slate-300 truncate max-w-xs">{vendor.website}</span>
                </a>
              </div>
            )}

            {vendor.social && vendor.social.length > 0 && (
              <div className="vendor-social">
                {vendor.social.map((s, i) => {
                  const p = (s.platform || '').toLowerCase();
                  let icon = 'ri-link';
                  if (p.includes('facebook')) icon = 'ri-facebook-fill';
                  else if (p.includes('instagram')) icon = 'ri-instagram-fill';
                  else if (p.includes('twitter')) icon = 'ri-twitter-fill';
                  else if (p.includes('tiktok')) icon = 'ri-tiktok-fill';
                  else if (p.includes('youtube')) icon = 'ri-youtube-fill';
                  else if (p.includes('whatsapp')) icon = 'ri-whatsapp-fill';
                  return (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer" title={s.platform || s.url}>
                      <i className={icon}></i>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-lg font-medium mb-2">Trading Hours</div>
              {Array.isArray(vendor.weeklyHours) && vendor.weeklyHours.length > 0 ? (
                <ul className="text-sm text-slate-300 space-y-1">
                  {vendor.weeklyHours.map((d, idx) => (
                    <li key={idx}>
                      <strong className="text-slate-200">{d.day}:</strong>{' '}
                      {d.open ? (
                        d.slots && d.slots.length > 0 ? (
                          d.slots.map((s, i) => (
                            <span key={i} className="inline-block ml-1">{s.start}-{s.end}{i < d.slots.length - 1 ? ', ' : ''}</span>
                          ))
                        ) : (
                          <span className="ml-1">Open</span>
                        )
                      ) : (
                        <span className="ml-1 text-slate-500">Closed</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-400">Trading hours not set.</div>
              )}
            </div>

            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-lg font-medium mb-2">Menu</div>
              {Array.isArray(vendor.menuItems) && vendor.menuItems.length > 0 ? (
                <ul className="text-sm text-slate-300 space-y-1">
                  {vendor.menuItems.map((m, i) => (
                    <li key={i}>{m.title}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-400">No menu items</div>
              )}
            </div>

            {vendor.images && vendor.images.length > 0 && (
              <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                <div className="text-lg font-medium mb-2">Gallery</div>
                <div className="flex gap-2 flex-wrap">
                  {vendor.images.map((img, i) => (
                    <div key={i} className="w-24 h-16 rounded overflow-hidden bg-slate-800 border border-slate-700">
                      <img src={img.url} alt={`img-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
