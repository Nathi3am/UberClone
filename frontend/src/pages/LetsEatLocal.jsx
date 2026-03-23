import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vexomove.onrender.com';

export default function LetsEatLocal() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/vendors`);
        const data = res.data;
        if (Array.isArray(data)) setVendors(data);
        else if (data && Array.isArray(data.vendors)) setVendors(data.vendors);
        else setVendors([]);
      } catch (e) {
        setError('Failed to load vendors');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-slate-900/30 p-4 rounded-xl backdrop-blur-sm border border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Lets Eat Local</h1>
            <div className="w-64">
              <input
                className="w-full rounded-md bg-slate-900/40 border border-slate-700 px-3 py-2 text-sm placeholder-slate-400"
                placeholder="Search vendors or dishes..."
                onChange={() => {}}
              />
            </div>
          </div>
        </div>
      </div>

      {loading && <p className="text-slate-300">Loading vendors...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && vendors.length === 0 && <p className="text-slate-400">No vendors found.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {vendors.map((vendor) => (
          <div
            key={vendor._id || vendor.id}
            className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 flex gap-4 items-start hover:shadow-lg transition-shadow"
          >
            <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-slate-800 border border-slate-700">
              {Array.isArray(vendor.images) && vendor.images[0] ? (
                // use first image
                <img src={vendor.images[0].url} alt={vendor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">No Image</div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{vendor.name}</h2>
                <span className="text-sm text-slate-400">{vendor.distance || ''}</span>
              </div>
              {vendor.phone && <p className="text-sm text-slate-400 mt-1">Phone: {vendor.phone}</p>}
              {vendor.address && <p className="text-sm text-slate-400 mt-1">{vendor.address}</p>}
              {/* website + social icons */}
              <div className="vendor-links mt-2">
                {vendor.website && (
                  <a href={vendor.website} target="_blank" rel="noreferrer" className="vendor-link text-sm">
                    <i className="ri-global-line"></i>
                    <span className="ml-2 text-slate-300 truncate max-w-[140px] block">{vendor.website}</span>
                  </a>
                )}
                {vendor.social && vendor.social.length > 0 && (
                  <div className="vendor-social flex items-center gap-2">
                    {vendor.social.map((s, i) => {
                      const p = (s.platform || '').toLowerCase();
                      let icon = 'ri-link';
                      if (p.includes('facebook')) icon = 'ri-facebook-fill';
                      else if (p.includes('instagram')) icon = 'ri-instagram-fill';
                      else if (p.includes('twitter')) icon = 'ri-twitter-fill';
                      else if (p.includes('tiktok')) icon = 'ri-tiktok-fill';
                      else if (p.includes('youtube')) icon = 'ri-youtube-fill';
                      else if (p.includes('whatsapp')) icon = 'ri-whatsapp-fill';
                      let handle = s.platform || '';
                      if (!handle) {
                        try {
                          const u = new URL(s.url);
                          // prefer pathname (last segment) as handle
                          const parts = (u.pathname || '').split('/').filter(Boolean);
                          handle = parts.length ? parts[parts.length-1] : u.hostname;
                        } catch (e) {
                          handle = s.url;
                        }
                      }
                      return (
                        <a key={i} href={s.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-2">
                          <i className={icon}></i>
                          <span className="text-sm text-slate-300">{handle}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              {Array.isArray(vendor.menuItems) && vendor.menuItems.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-slate-300 font-semibold mb-1">Top dishes</div>
                  <div className="flex flex-wrap gap-2">
                    {vendor.menuItems.slice(0, 4).map((item) => (
                      <span key={item.id || item.title} className="text-xs bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1">
                        {item.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={() => navigate(`/vendors/${vendor._id || vendor.id}`)}
                  className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
