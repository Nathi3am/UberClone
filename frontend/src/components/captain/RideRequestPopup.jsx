import React, { useEffect, useState } from 'react';

const RideRequestPopup = ({ ride, onAccept, onDecline }) => {
  const [countdown, setCountdown] = useState(60);
  const [fixedEarnings, setFixedEarnings] = useState(null);
  const fixedEarningsRideIdRef = React.useRef(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);

  // Use a time-based countdown so parent re-renders or identity changes
  // won't cause the timer to jump or duplicate intervals.
  const countdownStartRef = React.useRef(null);
  const declinedRef = React.useRef(false);

  useEffect(() => {
    countdownStartRef.current = Date.now();
    declinedRef.current = false;
    setCountdown(60);

    const tick = () => {
      const elapsed = Math.floor((Date.now() - countdownStartRef.current) / 1000);
      const rem = Math.max(0, 60 - elapsed);
      setCountdown(rem);
      if (rem <= 0 && !declinedRef.current) {
        declinedRef.current = true;
        onDecline && onDecline(ride);
      }
    };

    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [ride && (ride._id || ride.id || ride.requestId || ride.request_id || null)]);

  

  if (!ride) return null;

  // Helper: robustly extract numeric price/distance from varied payload shapes
  function parseNumber(v) {
    if (v === null || typeof v === 'undefined') return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const cleaned = v.replace(/[^0-9.\-]/g, '').replace(/,(?=\d{3})/g, '');
      if (cleaned === '') return null;
      const n = Number(cleaned);
      return isNaN(n) ? null : n;
    }
    if (typeof v === 'object') {
      if (typeof v.value === 'number') return v.value;
      if (typeof v.value === 'string') return parseNumber(v.value);
      if (v.distance && typeof v.distance.value === 'number') return v.distance.value;
      if (v.distance && typeof v.distance === 'number') return v.distance;
    }
    return null;
  }

  // Distance resolution
  let distanceMeters = null;
  const candDist = ride.distanceDisplay ?? ride.distance ?? ride.distanceValue ?? ride.distanceMeters ?? ride.distanceKm ?? ride.distance_value ?? null;
  const parsedCand = parseNumber(candDist);
  if (parsedCand !== null) {
    if (parsedCand > 1000) distanceMeters = parsedCand;
    else if (parsedCand > 0 && parsedCand <= 1000) {
      if ((typeof candDist === 'string' && candDist.indexOf('.') !== -1) || (('distanceKm' in ride) || ('distance_km' in ride))) {
        distanceMeters = parsedCand * 1000;
      } else {
        distanceMeters = parsedCand > 10 ? parsedCand : parsedCand * 1000;
      }
    }
  } else {
    if (ride.distance && (ride.distance.value || ride.distance.value === 0)) distanceMeters = parseNumber(ride.distance.value);
    if (!distanceMeters && ride.distance && ride.distance.km) distanceMeters = parseNumber(ride.distance.km) * 1000;
  }

  const rawDistance = ride.distance ?? ride.distanceKm ?? ride.distance_km ?? ride.distanceMeters ?? null;
  let distanceKm = null;
  if (typeof rawDistance === 'number') {
    distanceKm = rawDistance > 1000 ? rawDistance / 1000 : rawDistance;
  } else if (typeof rawDistance === 'string') {
    const p = parseFloat(rawDistance.replace(/[^0-9.\-]/g, ''));
    if (!isNaN(p)) distanceKm = p > 1000 ? p / 1000 : p;
  }
  const distanceKmDisplay = distanceKm !== null ? Number(distanceKm).toFixed(2) : null;
  // Accept zero values as valid numbers and look for multiple possible field names.
  function extractNumericFields(obj, keys) {
    for (const k of keys) {
      if (!obj) continue;
      const val = obj[k];
      if (typeof val === 'number' && !isNaN(val)) return Number(val);
      if (typeof val === 'string' && val.trim() !== '') {
        const cleaned = val.replace(/[^0-9.\-]/g, '').replace(/,(?=\d{3})/g, '');
        if (cleaned === '') continue;
        const n = Number(cleaned);
        if (!isNaN(n)) return n;
      }
      if (val && typeof val === 'object') {
        if (typeof val.value === 'number' && !isNaN(val.value)) return Number(val.value);
        if (typeof val.value === 'string' && val.value.trim() !== '') {
          const cleaned = val.value.replace(/[^0-9.\-]/g, '');
          const n = Number(cleaned);
          if (!isNaN(n)) return n;
        }
      }
    }
    return null;
  }

  const earningsCandidate = extractNumericFields(ride, [
    'driverEarnings',
    'driver_earnings',
    'driverEarning',
    'earning',
    'earnings',
  ]);

  const fareCandidate = extractNumericFields(ride, [
    'totalFare',
    'fare',
    'price',
    'amount',
    'total_fare',
  ]);

  const commissionCandidate = extractNumericFields(ride, [
    'platformCommission',
    'platform_commission',
    'platformcommission',
    'commission',
    'commissionAmount',
    'commission_amount',
  ]);

  // Prefer computing final driver earnings from fare - commission when both are available.
  // Fall back to server-provided `driverEarnings` only when commission or fare are not present.
  let earningsDisplay = null;
  if (fareCandidate !== null && commissionCandidate !== null) {
    const computed = Math.max(0, Number(fareCandidate) - Number(commissionCandidate));
    if (!isNaN(computed)) earningsDisplay = computed.toFixed(2);
  } else if (earningsCandidate !== null) {
    const v = Number(earningsCandidate);
    if (!isNaN(v)) earningsDisplay = v.toFixed(2);
  }

  // Compute and freeze the displayed earnings ONCE when a new ride arrives.
  // Once a positive value is locked for a given ride ID, never overwrite it —
  // even if the parent re-renders with a different payload for the same ride.
  useEffect(() => {
    const id = ride && (ride._id || ride.id || ride.requestId || ride.request_id || null);

    // Different ride → reset
    if (id !== fixedEarningsRideIdRef.current) {
      fixedEarningsRideIdRef.current = id;
      setFixedEarnings(null); // will be set below if we have data
    }

    // If we already locked a positive value for this ride, don't touch it
    if (fixedEarnings !== null && fixedEarnings > 0 && id === fixedEarningsRideIdRef.current) {
      return;
    }

    if (!id) return;

    let val = null;
    if (fareCandidate !== null && commissionCandidate !== null) {
      const computed = Math.max(0, Number(fareCandidate) - Number(commissionCandidate));
      if (!isNaN(computed) && computed > 0) val = computed;
    }
    if (val === null && earningsCandidate !== null) {
      const n = Number(earningsCandidate);
      if (!isNaN(n) && n > 0) val = n;
    }

    if (val !== null) setFixedEarnings(val);
  });

  const eta = ride.etaDisplay || (ride.duration && (ride.duration.value || ride.durationSeconds)) || ride.durationSeconds || null;

  const passengerName =
    ride.userName ||
    (ride.user &&
      (ride.user.fullname &&
      (ride.user.fullname.firstname || ride.user.fullname.lastname)
        ? `${ride.user.fullname.firstname || ''} ${ride.user.fullname.lastname || ''}`.trim()
        : ride.user.fullname)) ||
    'Passenger';

  const avatar = (ride.user && (ride.user.avatar || ride.user.photo || ride.user.image || ride.user.profileImage)) || ride.userImage || null;
  const paymentMethod = (ride.paymentMethod || ride.payment || ride.pmt || ride.payment_method || 'card').toString();

  const pickupAddress = ride.pickupAddress || ride.pickup || ride.origin || '';
  const dropAddress = ride.dropAddress || ride.destination || ride.dropoff || '';
  const passengers = ride.passengers || ride.passengerCount || 1;

  const progressPct = Math.round((countdown / 60) * 100);
  const progressColor = countdown <= 10 ? '#ef4444' : countdown <= 20 ? '#f59e0b' : '#10b981';
  const countdownColor = countdown <= 10 ? 'text-red-300' : countdown <= 20 ? 'text-amber-300' : 'text-white';

  return (
    <>
    <div className="fixed top-4 left-1/2 z-50 w-[94%] max-w-md -translate-x-1/2 select-none">
      {/* Ambient glow ring behind card */}
      <div className="pointer-events-none absolute -inset-1 rounded-[28px] bg-gradient-to-br from-emerald-500/25 via-transparent to-blue-600/15 blur-2xl" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1120] shadow-[0_30px_70px_rgba(0,0,0,0.65)]">

        {/* ── Header ── */}
        <div className="relative flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 overflow-hidden">
          {/* subtle shimmer strip */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%]" />
          <div className="flex items-center gap-2.5">
            {/* live pulse dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="text-[11px] font-extrabold tracking-[0.15em] text-white/90 uppercase">
              New Ride Request
            </span>
          </div>
          <span className={`text-xl font-extrabold tabular-nums ${countdownColor}`}>{countdown}s</span>
        </div>

        {/* ── Countdown progress bar ── */}
        <div className="h-[3px] w-full bg-white/10">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%`, backgroundColor: progressColor }}
          />
        </div>

        {/* ── Passenger row + earnings ── */}
        <div className="flex items-center gap-3.5 px-5 pt-4 pb-4 border-b border-white/[0.06]">
          {/* Avatar */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                if (!avatar) return;
                setZoomSrc(avatar);
                setZoomOpen(true);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-lg font-extrabold shadow-lg shadow-emerald-900/60 overflow-hidden"
              aria-label="View passenger profile"
            >
              {avatar ? (
                <img src={avatar} alt="passenger" className="w-full h-full object-cover" />
              ) : (
                passengerName.charAt(0).toUpperCase()
              )}
            </button>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0b1120] bg-emerald-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white text-[15px] leading-tight">{passengerName}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 116 0 3 3 0 01-6 0zM17.2 16a1 1 0 01-1 1H3.8a1 1 0 01-1-1v-.5C2.8 13.567 6.034 12 10 12s7.2 1.567 7.2 3.5V16z" />
                </svg>
                <span className="text-[11px] text-gray-400">{passengers} {passengers === 1 ? 'passenger' : 'passengers'}</span>
              </div>
              <div className="ml-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.04]">
                <svg className="h-3.5 w-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {paymentMethod === 'cash' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                  )}
                </svg>
                <span className="text-[11px] text-gray-300 font-medium">{paymentMethod === 'cash' ? 'Cash' : 'Card'}</span>
              </div>
            </div>
          </div>

          {/* Earnings badge: show the frozen `fixedEarnings` value when it's positive */}
          {fixedEarnings !== null && !isNaN(Number(fixedEarnings)) && Number(fixedEarnings) > 0 && (
            <div className="shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">Earnings</p>
              <p className="text-[22px] font-extrabold leading-tight text-emerald-400">R{Number(fixedEarnings).toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* ── Route ── */}
        <div className="px-5 py-4 space-y-3">
          {/* Pickup */}
          <div className="flex items-start gap-3">
            <div className="flex shrink-0 flex-col items-center mt-1">
              <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_3px_rgba(52,211,153,0.55)]" />
              <div className="mt-1 h-4 w-px bg-gradient-to-b from-emerald-400/50 to-rose-400/50" />
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-400">Pickup</p>
              <p className="text-[13px] leading-snug text-gray-200 line-clamp-2">{pickupAddress || '—'}</p>
            </div>
          </div>

          {/* Dropoff */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-1">
              <div className="h-3 w-3 rotate-45 rounded-[2px] bg-rose-500 shadow-[0_0_8px_3px_rgba(244,63,94,0.45)]" />
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-rose-400">Drop-off</p>
              <p className="text-[13px] leading-snug text-gray-200 line-clamp-2">{dropAddress || '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {(distanceKmDisplay || eta) && (
          <div className="flex flex-wrap gap-2 px-5 pb-4">
            {distanceKmDisplay && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-[11px] font-semibold text-gray-300">{distanceKmDisplay} km</span>
              </div>
            )}
            {eta && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-semibold text-gray-300">
                  {ride.etaDisplay ||
                    `${Math.round(
                      ((ride.duration && (ride.duration.value || ride.durationSeconds)) || ride.durationSeconds || 0) / 60
                    )} min`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-3 border-t border-white/[0.06] bg-black/30 px-5 py-4">
          <button
            onClick={() => onDecline && onDecline(ride)}
            className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 text-[13px] font-semibold text-red-400 transition-all duration-150 active:scale-95 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
          >
            Decline
          </button>
          <button
            onClick={() => onAccept && onAccept(ride)}
            className="flex-[2] rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-[13px] font-extrabold text-white shadow-lg shadow-emerald-900/50 transition-all duration-150 active:scale-95 hover:from-emerald-400 hover:to-teal-400"
          >
            Accept Ride
          </button>
        </div>
      </div>
    </div>
    {/* Image zoom modal */}
    {zoomOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" onClick={() => setZoomOpen(false)} />
        <div className="relative z-60 max-w-[90%] max-h-[90%] p-4">
          <button onClick={() => setZoomOpen(false)} className="absolute -top-3 -right-3 z-70 bg-white/10 text-white rounded-full w-9 h-9 flex items-center justify-center">✕</button>
          {zoomSrc ? (
            <img src={zoomSrc} alt="passenger-large" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg" />
          ) : (
            <div className="bg-white/5 text-white p-8 rounded-lg">No image available</div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default RideRequestPopup;
