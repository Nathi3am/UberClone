import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config/api';

const SpecialRequests = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);

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
          setError('Could not load special requests, showing default items.');
          setItems([
            { id: 1, name: 'Small Van', description: 'Comfortable 5-seat small cargo van', ratePerHour: 150, ratePerDay: 1100 },
            { id: 2, name: 'Large Van', description: 'Spacious 9-seat van, ideal for group moves', ratePerHour: 230, ratePerDay: 1800 },
            { id: 3, name: 'Trailer', description: 'Heavy-duty trailer for equipment and luggage', ratePerHour: 120, ratePerDay: 900 },
            { id: 4, name: 'Pickup Truck', description: '4x4 pickup for rugged jobs', ratePerHour: 180, ratePerDay: 1300 },
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchItems();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      {/* ── Disclaimer Modal ── */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div
            className="max-w-md w-full rounded-3xl p-7 shadow-2xl text-white border border-white/10 relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f23 50%, #1a0a2e 100%)' }}
          >
            {/* accent bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.01 14A2 2 0 004.09 21h15.82a2 2 0 001.81-3.14l-8.01-14a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Important Notice</h2>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              Prices listed on this platform, <span className="font-semibold text-white">VexoMove</span>, are set independently by contractors and are not determined by the platform itself. If you have any inquiries regarding a specific listing, please contact the contractor directly.
            </p>
            <p className="text-sm text-gray-300 leading-relaxed mt-3">
              However, if you believe a listing is fraudulent or has been posted without your consent, please report it to our support team at{' '}
              <a href="mailto:support@vexomove.co.za" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">support@vexomove.co.za</a>.
            </p>

            <button
              onClick={() => setShowDisclaimer(false)}
              className="mt-6 w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-300 shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ── Page ── */}
      <div className="min-h-screen text-white pb-24">

        {/* Sticky header */}
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#060b19]/80 border-b border-white/5">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Marketplace</h1>
              <p className="text-[11px] text-gray-500">{items.length} listing{items.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-5">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" /></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading listings...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              </div>
              <p className="text-gray-500 text-sm">No listings available yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => {
                const rawImage = item.imageUrl || item.image || '';
                const imageSrc = rawImage
                  ? rawImage.startsWith('http') ? rawImage
                    : rawImage.startsWith('/') ? `${API_BASE_URL}${rawImage}`
                    : `${API_BASE_URL}/${rawImage}`
                  : '';
                const cardId = item._id || item.id;
                const isExpanded = expandedCard === cardId;

                return (
                  <div
                    key={cardId}
                    className="group rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 shadow-lg shadow-black/20"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(15,15,35,0.6) 100%)' }}
                  >
                    {/* Image banner */}
                    {imageSrc ? (
                      <div className="relative w-full h-48 overflow-hidden bg-slate-900">
                        <img src={imageSrc} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
                            {item.availableIn || 'Available Now'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-28 bg-gradient-to-br from-indigo-900/30 to-slate-900 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <div className="absolute bottom-3 left-3">
                          <span className="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-[11px] font-medium text-emerald-300/70 border border-emerald-500/10">
                            {item.availableIn || 'Available Now'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Card content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight capitalize">{item.name}</h2>
                        <p className="text-[13px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                      </div>

                      {/* Pricing pills */}
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 px-3 py-2.5 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-semibold">Hourly</p>
                          <p className="text-lg font-bold text-emerald-300 mt-0.5">R{Number(item.ratePerHour || item.hourly || 0).toFixed(0)}</p>
                        </div>
                        <div className="flex-1 rounded-xl bg-violet-500/[0.08] border border-violet-500/15 px-3 py-2.5 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-violet-400/60 font-semibold">Daily</p>
                          <p className="text-lg font-bold text-violet-300 mt-0.5">R{Number(item.ratePerDay || item.daily || 0).toFixed(0)}</p>
                        </div>
                      </div>

                      {/* Expandable contact section */}
                      {(item.contactName || item.contactPhone || item.contactEmail) && (
                        <>
                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : cardId)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors text-xs text-gray-400"
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              Contact Contractor
                            </span>
                            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </button>

                          {isExpanded && (
                            <div className="px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2.5 text-sm animate-[fadeIn_0.2s_ease]">
                              {item.contactName && (
                                <div className="flex items-center gap-2.5 text-gray-300">
                                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  </div>
                                  {item.contactName}
                                </div>
                              )}
                              {item.contactPhone && (
                                <a href={`tel:${item.contactPhone}`} className="flex items-center gap-2.5 text-indigo-400 hover:text-indigo-300 transition-colors">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                  </div>
                                  {item.contactPhone}
                                </a>
                              )}
                              {item.contactEmail && (
                                <a href={`mailto:${item.contactEmail}`} className="flex items-center gap-2.5 text-indigo-400 hover:text-indigo-300 transition-colors">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  </div>
                                  {item.contactEmail}
                                </a>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom floating button ── */}
      <div className="fixed bottom-5 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <Link
          to="/account/trips"
          className="pointer-events-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/25 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300 text-lg flex items-center gap-2.5"
        >
          <span>🚖</span>
          <span>Trips</span>
        </Link>
      </div>
    </>
  );
};

export default SpecialRequests;
