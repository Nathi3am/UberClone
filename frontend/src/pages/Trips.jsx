import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config/api';

const Trips = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);

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
        setError('Could not load trips drivers.');
        setDrivers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDrivers();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen text-white pb-24">

      {/* Sticky header */}
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-[#060b19]/80 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/special-requests" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Special Trips</h1>
            <p className="text-[11px] text-gray-500">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} available</p>
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
            <p className="text-sm text-gray-500">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-gray-500 text-sm">No drivers available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {drivers.map((driver) => {
              const rawImage = driver.imageUrl || '';
              const imageSrc = rawImage
                ? rawImage.startsWith('http') ? rawImage
                  : rawImage.startsWith('/') ? `${API_BASE_URL}${rawImage}`
                  : `${API_BASE_URL}/${rawImage}`
                : '';
              const cardId = driver._id || driver.id;
              const isExpanded = expandedCard === cardId;
              const fullName = [driver.name, driver.surname].filter(Boolean).join(' ');

              return (
                <div
                  key={cardId}
                  className="group rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 shadow-lg shadow-black/20"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(15,15,35,0.6) 100%)' }}
                >
                  {/* Driver header with photo */}
                  <div className="p-4 pb-0">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        {imageSrc ? (
                          <img src={imageSrc} alt={fullName} className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/10" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center ring-2 ring-white/10">
                            <span className="text-lg font-bold text-indigo-300">{(driver.name || '?')[0]}</span>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f0f23]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-white truncate">{fullName}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                          <span className="text-xs text-gray-400 font-mono">{driver.plateNumber || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info chips */}
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {driver.vehicleType && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/[0.08] border border-blue-500/15 text-[11px] text-blue-300 font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 4h4m4 0h.01M3 21h18M3 10h18M3 7l2-4h14l2 4" /></svg>
                          {driver.vehicleType}
                        </span>
                      )}
                      {driver.vehicleCapacity && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/15 text-[11px] text-cyan-300 font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {driver.vehicleCapacity}
                        </span>
                      )}
                      {(driver.places && (Array.isArray(driver.places) ? driver.places.length : driver.places)) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/15 text-[11px] text-amber-300 font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                          {Array.isArray(driver.places) ? driver.places.join(', ') : driver.places}
                        </span>
                      )}
                    </div>

                    {/* Pricing pills */}
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 px-3 py-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-semibold">Hourly</p>
                        <p className="text-lg font-bold text-emerald-300 mt-0.5">R{Number(driver.hourlyRate || 0).toFixed(0)}</p>
                      </div>
                      <div className="flex-1 rounded-xl bg-violet-500/[0.08] border border-violet-500/15 px-3 py-2.5 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-violet-400/60 font-semibold">Daily</p>
                        <p className="text-lg font-bold text-violet-300 mt-0.5">R{Number(driver.dayRate || 0).toFixed(0)}</p>
                      </div>
                    </div>

                    {/* Expandable contact */}
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : cardId)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors text-xs text-gray-400"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        Contact Driver
                      </span>
                      <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2.5 text-sm">
                        {driver.email && (
                          <a href={`mailto:${driver.email}`} className="flex items-center gap-2.5 text-indigo-400 hover:text-indigo-300 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            {driver.email}
                          </a>
                        )}
                        {driver.phone && (
                          <a href={`tel:${driver.phone}`} className="flex items-center gap-2.5 text-indigo-400 hover:text-indigo-300 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            </div>
                            {driver.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom floating button ── */}
      <div className="fixed bottom-5 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <Link
          to="/special-requests"
          className="pointer-events-auto px-7 py-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/25 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-300 text-sm flex items-center gap-2.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Marketplace
        </Link>
      </div>
    </div>
  );
};

export default Trips;
