import { useEffect, useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { RideContext } from "../context/RideContext";
import GoogleMapReact from "google-map-react";
import axios from "axios";
import API_BASE_URL from '../config/api';

const DriverMarker = () => (
  <div style={{ fontSize: "28px" }}>🚗</div>
);

const PickupMarker = () => (
  <div style={{ fontSize: "26px" }}>📍</div>
);

export default function Riding() {
  const location = useLocation();
  const rideFromState = location.state?.ride;
  const { activeRide } = useContext(RideContext);
  const ride = activeRide || rideFromState;

  const [driverLocation, setDriverLocation] = useState(null);

  // Use driver location from activeRide (set by socket) when available
  useEffect(() => {
    const loc = (ride && (ride.driverLocation || (ride.captain && ride.captain.location) || ride.driverCoords)) || null;
    if (!loc) return;
    // normalise keys
    const lat = loc.lat ?? loc.ltd ?? loc.latitude ?? null;
    const lng = loc.lng ?? loc.lng ?? loc.longitude ?? loc.long ?? null;
    if (lat && lng) setDriverLocation({ lat: Number(lat), lng: Number(lng) });
  }, [ride]);

  if (!ride) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        No active ride
      </div>
    );
  }

  return (
              <p style={{ color: 'gray', margin: 0 }}>Arriving in {ride.eta ?? (ride.etaMinutes || '—')} min</p>

      {/* MAP SECTION */}
      <div style={{ height: "60vh", width: "100%" }}>

          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                await axios.post(`${API_BASE_URL}/rides/${ride._id || ride.rideId}/cancel`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
              } catch (e) {
                // ignore
              }
              try { setActiveRide(null); } catch (e) {}
            }} style={{ flex: 1, padding: '12px 16px', background: '#ef4444', color: '#fff', borderRadius: 12, border: 'none' }}>
              Cancel Ride
            </button>
            <button onClick={() => { /* optional: open chat or call */ }} style={{ padding: '12px 16px', background: '#111827', color: '#fff', borderRadius: 12, border: 'none' }}>
              Contact Driver
            </button>
          </div>
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_KEY }}
          defaultCenter={ride.pickupCoords}
          defaultZoom={14}
        >
          <PickupMarker
            lat={ride.pickupCoords.lat}
            lng={ride.pickupCoords.lng}
          />

          {driverLocation && (
            <DriverMarker
              lat={driverLocation.lat}
              lng={driverLocation.lng}
            />
          )}
        </GoogleMapReact>
      </div>

      {/* BOTTOM TRACKING PANEL (clean) */}
      {ride && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          background: '#fff',
          color: '#000',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          boxShadow: '0 -5px 20px rgba(0,0,0,0.2)'
        }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            {(() => {
              const candidate = ride.driverImage || ride.captainProfileImage || (ride.driver && ride.driver.profileImage) || '';
              const src = (typeof candidate === 'string' && candidate.startsWith('/')) ? `${API_BASE_URL}${candidate}` : candidate;
              return (
                <img src={src}
                  alt={ride.driverName || ride.captainName || (ride.driver && ride.driver.fullName) || 'Driver'}
                  style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', background: '#eee' }}
                />
              );
            })()}

            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{ride.driverName || ride.captainName || (ride.driver && ride.driver.fullName) || 'Driver'}</h3>
              <p style={{ color: 'gray', margin: 0 }}>Arriving in {ride.eta ?? (ride.etaMinutes || '—')} min</p>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
