import { createContext, useState, useCallback } from "react";

export const RideContext = createContext();

// localStorage key for cancelled ride IDs — survives page refresh
const CANCELLED_KEY = "vexo_cancelled_ride_ids";

const loadCancelledIds = () => {
  try {
    const raw = localStorage.getItem(CANCELLED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch (e) {
    return new Set();
  }
};

const saveCancelledIds = (set) => {
  try {
    // Only keep the last 50 IDs to avoid localStorage bloat
    const arr = [...set].slice(-50);
    localStorage.setItem(CANCELLED_KEY, JSON.stringify(arr));
  } catch (e) {}
};

export const RideProvider = ({ children }) => {
  const [activeRide, setActiveRideRaw] = useState(null);

  // Wrap setActiveRide: if we're setting a ride that was already cancelled, silently block it
  const setActiveRide = useCallback((rideOrUpdater) => {
    setActiveRideRaw((prev) => {
      const next = typeof rideOrUpdater === "function" ? rideOrUpdater(prev) : rideOrUpdater;
      if (!next) return null;
      // Block any ride ID that has been cancelled
      const cancelledIds = loadCancelledIds();
      if (cancelledIds.has(next._id)) return null;
      return next;
    });
  }, []);

  // Call this when a ride is cancelled — persists across refresh
  const markRideCancelled = useCallback((rideId) => {
    if (!rideId) return;
    const ids = loadCancelledIds();
    ids.add(String(rideId));
    saveCancelledIds(ids);
    setActiveRideRaw(null);
  }, []);

  // Check if a ride ID has been cancelled (used in Rides.jsx fetchRides)
  const isRideCancelled = useCallback((rideId) => {
    if (!rideId) return false;
    return loadCancelledIds().has(String(rideId));
  }, []);

  return (
    <RideContext.Provider value={{ activeRide, setActiveRide, markRideCancelled, isRideCancelled }}>
      {children}
    </RideContext.Provider>
  );
};

export default RideProvider;
