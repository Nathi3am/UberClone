import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { getCurrentDevicePosition, hasDeviceGeolocation, watchDevicePosition, clearDeviceWatch } from '../../utils/deviceGeolocation';

/**
 * Google-Maps-style full-screen navigation overlay.
 * Top banner: big maneuver arrow + distance + street name
 * Bottom bar: ETA + total distance + arrival time
 * Voice announcements via Web Speech API.
 */
const NavigationBar = ({ targetCoords, targetLabel = 'Pickup', onRouteUpdate, onClose, onArrived }) => {
  const [steps, setSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [eta, setEta] = useState(null);
  const [etaValue, setEtaValue] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [speed, setSpeed] = useState(null); // km/h

  const stepsRef = useRef([]);
  const stepIdxRef = useRef(0);
  const mutedRef = useRef(false);
  const arrivedRef = useRef(false);
  const spokenStepRef = useRef(-1);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const driverPosRef = useRef(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { arrivedRef.current = arrived; }, [arrived]);

  // ─── Voice ───
  const speak = useCallback((text) => {
    if (!text || mutedRef.current) return;
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 1.0; u.volume = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }, []);

  const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

  // Extract street name from instruction (the text inside <b>...</b> tags)
  const extractStreet = (html) => {
    if (!html) return '';
    const match = html.match(/<b>([^<]+)<\/b>/);
    return match ? match[1] : '';
  };

  // ─── Fetch directions ───
  const fetchDirections = useCallback(async () => {
    if (!targetCoords?.lat || !targetCoords?.lng) return;
    try {
      let driverPos = driverPosRef.current;
      if (!driverPos && hasDeviceGeolocation()) {
        const pos = await getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 });
        driverPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        driverPosRef.current = driverPos;
      }
      if (!driverPos) return;

      const resp = await axios.get(`${API_BASE_URL}/maps/directions-proxy`, {
        params: { originLat: driverPos.lat, originLng: driverPos.lng, destLat: targetCoords.lat, destLng: targetCoords.lng },
      });

      const data = resp.data;
      const poly = data?.overview_polyline?.points;
      const raw = data?.raw;
      const route = raw?.routes?.[0];
      const leg = route?.legs?.[0];
      const rawSteps = leg?.steps || [];

      const parsedSteps = rawSteps.map((s) => ({
        instruction: s.html_instructions || '',
        distance: s.distance?.text || '',
        distanceValue: s.distance?.value || 0,
        duration: s.duration?.text || '',
        maneuver: s.maneuver || '',
        startLat: s.start_location?.lat,
        startLng: s.start_location?.lng,
        endLat: s.end_location?.lat,
        endLng: s.end_location?.lng,
      }));

      stepsRef.current = parsedSteps;
      setSteps(parsedSteps);
      setEta(data?.duration?.text || leg?.duration?.text || null);
      setEtaValue(data?.duration?.value || leg?.duration?.value || null);
      setDistance(data?.distance?.text || leg?.distance?.text || null);
      setLoading(false);

      if (parsedSteps.length > 0 && spokenStepRef.current === -1) {
        stepIdxRef.current = 0;
        setCurrentStepIdx(0);
        spokenStepRef.current = 0;
        // Announce starting route then first direction
        speak(`Starting route to ${targetLabel || 'destination'}`);
        const firstText = stripHtml(parsedSteps[0].instruction);
        if (firstText) setTimeout(() => speak(`In ${parsedSteps[0].distance || 'a moment'}, ${firstText}`), 3500);
      }

      if (poly && onRouteUpdate) {
        onRouteUpdate({ polyline: poly, steps: parsedSteps, duration: data?.duration || leg?.duration || null, distance: data?.distance || leg?.distance || null });
      }
    } catch (e) {
      console.warn('[NavigationBar] directions fetch failed', e?.message);
      setLoading(false);
    }
  }, [targetCoords?.lat, targetCoords?.lng, onRouteUpdate, speak]);

  // Haversine
  const distanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ─── GPS handler ───
  const handlePositionUpdate = useCallback((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    driverPosRef.current = { lat, lng };

    // Speed in km/h
    if (position.coords.speed != null && position.coords.speed >= 0) {
      setSpeed(Math.round(position.coords.speed * 3.6));
    }

    const allSteps = stepsRef.current;
    if (!allSteps.length) return;

    if (targetCoords?.lat && targetCoords?.lng) {
      const distToDest = distanceMeters(lat, lng, targetCoords.lat, targetCoords.lng);
      if (distToDest < 50 && !arrivedRef.current) {
        arrivedRef.current = true;
        setArrived(true);
        speak(`You are arriving at the ${targetLabel || 'destination'}`);
        if (typeof onArrived === 'function') {
          setTimeout(() => onArrived(targetLabel), 3000);
        }
        return;
      }
    }

    const currentIdx = stepIdxRef.current;
    let bestIdx = currentIdx;

    for (let i = currentIdx + 1; i < allSteps.length; i++) {
      const s = allSteps[i];
      if (!s.startLat || !s.startLng) continue;
      if (distanceMeters(lat, lng, s.startLat, s.startLng) < 40) { bestIdx = i; break; }
    }

    if (bestIdx === currentIdx && currentIdx < allSteps.length - 1) {
      const cur = allSteps[currentIdx];
      if (cur.endLat && cur.endLng && distanceMeters(lat, lng, cur.endLat, cur.endLng) < 30) bestIdx = currentIdx + 1;
    }

    if (bestIdx !== currentIdx) {
      stepIdxRef.current = bestIdx;
      setCurrentStepIdx(bestIdx);
      if (spokenStepRef.current !== bestIdx) {
        spokenStepRef.current = bestIdx;
        const text = stripHtml(allSteps[bestIdx].instruction);
        if (text) speak(text);
        const next = allSteps[bestIdx + 1];
        if (next) {
          const nextText = stripHtml(next.instruction);
          if (nextText && next.distanceValue > 0) setTimeout(() => { if (stepIdxRef.current === bestIdx) speak(`Then in ${next.distance || 'a moment'}, ${nextText}`); }, 4000);
        }
      }
    }

    if (currentIdx < allSteps.length - 1) {
      const nextS = allSteps[currentIdx + 1];
      if (nextS.startLat && nextS.startLng) {
        const d = distanceMeters(lat, lng, nextS.startLat, nextS.startLng);
        if (d < 120 && d > 35 && spokenStepRef.current === currentIdx) {
          spokenStepRef.current = currentIdx + 0.5;
          const text = stripHtml(nextS.instruction);
          if (text) speak(`In ${Math.round(d)} meters, ${text}`);
        }
      }
    }
  }, [targetCoords, targetLabel, speak]);

  useEffect(() => {
    fetchDirections();
    intervalRef.current = setInterval(fetchDirections, 25000);
    let watchId = null;
    if (hasDeviceGeolocation()) {
      watchDevicePosition(handlePositionUpdate, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 })
        .then((id) => { watchId = id; watchIdRef.current = id; }).catch(() => {});
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchId !== null) clearDeviceWatch(watchId).catch(() => {});
      try { window.speechSynthesis?.cancel(); } catch (e) {}
    };
  }, [targetCoords?.lat, targetCoords?.lng, fetchDirections, handlePositionUpdate]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch (e) {} }, []);

  const currentStep = steps[currentStepIdx] || null;
  const nextStep = steps[currentStepIdx + 1] || null;

  // Arrival time
  const arrivalTime = etaValue ? new Date(Date.now() + etaValue * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  // ─── Maneuver SVG icons (Google-Maps-style arrows) ───
  const ManeuverArrow = ({ maneuver }) => {
    const cls = 'w-10 h-10';
    if (!maneuver) return <svg className={cls} viewBox="0 0 24 24" fill="white"><path d="M12 2l-2 8h4l-2 8V2z" /><path d="M12 2v20" stroke="white" strokeWidth="2.5" strokeLinecap="round" /><path d="M7 8l5-6 5 6" fill="white" /></svg>;
    if (maneuver.includes('sharp-left') || maneuver.includes('uturn-left'))
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6"/><path d="M5 12l7-7"/></svg>;
    if (maneuver.includes('left'))
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18V10a3 3 0 0 0-3-3H5"/><path d="M9 11L5 7l4-4"/></svg>;
    if (maneuver.includes('sharp-right') || maneuver.includes('uturn-right'))
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6"/><path d="M19 12l-7-7"/></svg>;
    if (maneuver.includes('right'))
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V10a3 3 0 0 1 3-3h7"/><path d="M15 11l4-4-4-4"/></svg>;
    if (maneuver.includes('roundabout'))
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 16v5"/><path d="M12 3v5"/></svg>;
    if (maneuver.includes('merge') || maneuver.includes('ramp'))
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>;
    // straight
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>;
  };

  // ─── RENDER ───
  return (
    <>
      {/* ═══ TOP BANNER — maneuver + distance + street ═══ */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-auto">
        {loading && (
          <div className="mx-3 mt-3 rounded-2xl bg-[#1a5d3a] px-5 py-4 shadow-2xl">
            <div className="text-white/70 text-sm">Loading route...</div>
          </div>
        )}

        {arrived && !loading && (
          <div className="mx-3 mt-3 rounded-2xl bg-[#1a5d3a] px-5 py-5 shadow-2xl flex items-center gap-4">
            <div className="text-4xl">📍</div>
            <div>
              <div className="text-white text-xl font-bold">You have arrived</div>
              <div className="text-white/70 text-sm mt-0.5">{targetLabel}</div>
            </div>
          </div>
        )}

        {currentStep && !loading && !arrived && (
          <div className="mx-3 mt-3 rounded-2xl bg-[#1a5d3a] shadow-2xl overflow-hidden">
            {/* Main instruction */}
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                <ManeuverArrow maneuver={currentStep.maneuver} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-2xl font-bold leading-tight">{currentStep.distance}</div>
                <div className="text-white text-lg font-medium mt-0.5 truncate">
                  {extractStreet(currentStep.instruction) || stripHtml(currentStep.instruction)}
                </div>
              </div>
            </div>

            {/* Next step preview bar */}
            {nextStep && (
              <div className="bg-[#145230] px-5 py-2.5 flex items-center gap-3 border-t border-white/10">
                <div className="flex-shrink-0 opacity-70">
                  <ManeuverArrow maneuver={nextStep.maneuver} />
                </div>
                <div className="text-white/70 text-sm truncate flex-1">
                  Then {nextStep.distance} — {extractStreet(nextStep.instruction) || stripHtml(nextStep.instruction)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ SPEED indicator — bottom left ═══ */}
      {speed !== null && !arrived && (
        <div className="absolute bottom-20 left-3 z-30 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white shadow-lg flex flex-col items-center justify-center">
            <span className="text-gray-900 text-lg font-bold leading-none">{speed}</span>
            <span className="text-gray-500 text-[9px] font-medium leading-none">km/h</span>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM BAR — ETA + distance + arrival time ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <div className="mx-3 mb-3 rounded-2xl bg-[#1a1f35]/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            {/* ETA */}
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 text-2xl font-bold">{eta || '...'}</span>
            </div>

            {/* Distance + arrival */}
            <div className="flex items-center gap-2 text-white/60 text-sm">
              {distance && <span>{distance}</span>}
              {distance && arrivalTime && <span>·</span>}
              {arrivalTime && <span>{arrivalTime}</span>}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMuted((m) => { if (!m) { try { window.speechSynthesis?.cancel(); } catch (e) {} } return !m; })}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white text-base"
              >
                {muted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => { try { window.speechSynthesis?.cancel(); } catch (e) {} onClose(); }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/80 text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Progress dots */}
          {steps.length > 1 && (
            <div className="px-4 pb-2 flex gap-0.5">
              {steps.map((_, i) => (
                <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= currentStepIdx ? 'bg-emerald-400' : 'bg-white/10'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NavigationBar;
