import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { API_BASE_URL } from '../../config/api';
import { getCurrentDevicePosition, hasDeviceGeolocation } from '../../utils/deviceGeolocation';

/**
 * In-app turn-by-turn navigation overlay.
 * Fetches directions from driver → target, shows current step, ETA, distance.
 * Periodically re-fetches as driver moves.
 *
 * Props:
 *  - targetCoords: { lat, lng }
 *  - targetLabel: string (e.g. "Pickup" or "Dropoff")
 *  - onRouteUpdate: (routeData) => void  — called with { polyline, steps, duration, distance }
 *  - onClose: () => void
 */
const NavigationBar = ({ targetCoords, targetLabel = 'Pickup', onRouteUpdate, onClose }) => {
  const [steps, setSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchDirections = async () => {
    if (!targetCoords || !targetCoords.lat || !targetCoords.lng) return;
    try {
      let driverPos = null;
      if (hasDeviceGeolocation()) {
        const pos = await getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 });
        driverPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      if (!driverPos) return;

      const resp = await axios.get(`${API_BASE_URL}/maps/directions-proxy`, {
        params: {
          originLat: driverPos.lat,
          originLng: driverPos.lng,
          destLat: targetCoords.lat,
          destLng: targetCoords.lng,
        },
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
        duration: s.duration?.text || '',
        maneuver: s.maneuver || '',
        startLat: s.start_location?.lat,
        startLng: s.start_location?.lng,
      }));

      setSteps(parsedSteps);
      setCurrentStepIdx(0);
      setEta(data?.duration?.text || leg?.duration?.text || null);
      setDistance(data?.distance?.text || leg?.distance?.text || null);
      setLoading(false);

      if (poly && onRouteUpdate) {
        onRouteUpdate({
          polyline: poly,
          steps: parsedSteps,
          duration: data?.duration || leg?.duration || null,
          distance: data?.distance || leg?.distance || null,
        });
      }

      // Advance step based on proximity to step start locations
      if (parsedSteps.length > 1 && driverPos) {
        const threshold = 0.0004; // ~40m
        for (let i = parsedSteps.length - 1; i >= 0; i--) {
          const s = parsedSteps[i];
          if (s.startLat && s.startLng) {
            const dLat = Math.abs(driverPos.lat - s.startLat);
            const dLng = Math.abs(driverPos.lng - s.startLng);
            if (dLat < threshold && dLng < threshold) {
              setCurrentStepIdx(i);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[NavigationBar] directions fetch failed', e?.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirections();
    // Re-fetch every 30s to update as driver moves
    intervalRef.current = setInterval(fetchDirections, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetCoords?.lat, targetCoords?.lng]);

  const currentStep = steps[currentStepIdx] || null;
  const nextStep = steps[currentStepIdx + 1] || null;

  // Maneuver → icon mapping
  const getManeuverIcon = (maneuver) => {
    if (!maneuver) return '⬆️';
    if (maneuver.includes('left')) return '⬅️';
    if (maneuver.includes('right')) return '➡️';
    if (maneuver.includes('uturn')) return '↩️';
    if (maneuver.includes('roundabout')) return '🔄';
    if (maneuver.includes('merge')) return '↗️';
    if (maneuver.includes('ramp')) return '↗️';
    return '⬆️';
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      {/* Main nav card */}
      <div className="pointer-events-auto mx-2 mt-2 rounded-2xl bg-[#1a1f35]/95 backdrop-blur-lg border border-white/10 shadow-2xl overflow-hidden">
        {/* ETA / Distance header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-emerald-600/90">
          <div className="flex items-center gap-3">
            <span className="text-white text-lg font-bold">{eta || '...'}</span>
            <span className="text-white/70 text-sm">{distance || ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-medium">{targetLabel}</span>
            <button
              onClick={onClose}
              className="ml-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div className="px-4 py-3 text-white/60 text-sm">Loading route...</div>
        )}

        {/* Current step */}
        {currentStep && !loading && (
          <div className="px-4 py-3 flex items-start gap-3">
            <div className="text-3xl flex-shrink-0 mt-0.5">{getManeuverIcon(currentStep.maneuver)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-base leading-tight">
                {stripHtml(currentStep.instruction)}
              </div>
              <div className="text-white/50 text-xs mt-1">
                {currentStep.distance}{currentStep.duration ? ` · ${currentStep.duration}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Next step preview */}
        {nextStep && !loading && (
          <div className="px-4 pb-2 flex items-center gap-3 border-t border-white/5 pt-2">
            <div className="text-lg flex-shrink-0 opacity-60">{getManeuverIcon(nextStep.maneuver)}</div>
            <div className="text-white/40 text-xs truncate">
              Then: {stripHtml(nextStep.instruction)}
            </div>
          </div>
        )}

        {/* Step counter */}
        {steps.length > 0 && !loading && (
          <div className="px-4 pb-2 flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${i <= currentStepIdx ? 'bg-emerald-400 w-4' : 'bg-white/15 w-2'}`}
                />
              ))}
            </div>
            <span className="text-white/30 text-[10px]">{currentStepIdx + 1}/{steps.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationBar;
