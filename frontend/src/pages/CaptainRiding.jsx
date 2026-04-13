import React, { useState, useEffect, useContext, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SocketContext } from '../context/SocketContext';
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "remixicon/fonts/remixicon.css";
import FinishRide from "../../components/FinishRide";
import LiveTracking from "../components/LiveTracking";
import { ToastContainer, toast } from "react-toastify";
import logoPath from "../config/logo";
import axios from "axios";
import polyline from "@mapbox/polyline";
import { getCurrentDevicePosition, hasDeviceGeolocation } from "../utils/deviceGeolocation";
import { API_BASE_URL } from "../config/api";

const CaptainRiding = () => {
  const [finishRidePanel, setFinishRidePanel] = React.useState(false);
  const finishRidePanelRef = React.useRef(null);
  const location = useLocation();
  const rideData = location.state?.ride;
  const socketCtx = useContext(SocketContext) || {};
  const socket = socketCtx.socket;
  const navigate = useNavigate();
  const [cancelPopup, setCancelPopup] = useState(null);

  // ── Navigation state ──────────────────────────────────────────────────
  // Phase: 'pickup' = heading to collect passenger, 'dropoff' = heading to destination
  const [navPhase, setNavPhase] = useState("pickup");
  const [routePolylinePath, setRoutePolylinePath] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { duration, distance }
  const [nextInstruction, setNextInstruction] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const fetchedPhaseRef = useRef(null);

  // ── Resolve target coords for current phase ───────────────────────────
  const getTargetCoords = (phase) => {
    if (phase === "pickup") {
      return rideData?.pickupCoords || rideData?.pickup?.coordinates || null;
    }
    return rideData?.dropCoords || rideData?.destination?.coordinates || null;
  };

  // ── Fetch directions from driver GPS → target ─────────────────────────
  useEffect(() => {
    if (!rideData) return;
    let cancelled = false;

    const fetchRoute = async () => {
      const dest = getTargetCoords(navPhase);
      if (!dest || !dest.lat || !dest.lng) return;

      const key = `${navPhase}-${dest.lat}-${dest.lng}`;
      if (fetchedPhaseRef.current === key) return;

      setLoadingRoute(true);
      try {
        let driverPos = null;
        if (hasDeviceGeolocation()) {
          const pos = await getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 });
          driverPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        if (!driverPos) return;

        const resp = await axios.get(`${API_BASE_URL}/maps/directions-proxy`, {
          params: {
            originLat: driverPos.lat,
            originLng: driverPos.lng,
            destLat: dest.lat,
            destLng: dest.lng,
          },
        });

        if (cancelled) return;

        const poly = resp.data?.overview_polyline?.points;
        if (poly) {
          const decoded = polyline.decode(poly);
          setRoutePolylinePath(decoded.map(([lat, lng]) => ({ lat, lng })));
          fetchedPhaseRef.current = key;
        }

        setRouteInfo({
          duration: resp.data?.duration?.text || null,
          distance: resp.data?.distance?.text || null,
        });

        // Pull first step instruction if available
        const firstStep = resp.data?.steps?.[0];
        if (firstStep) {
          setNextInstruction({
            text: firstStep.html_instructions?.replace(/<[^>]*>/g, "") || firstStep.maneuver || null,
            distance: firstStep.distance?.text || null,
          });
        }
      } catch (e) {
        console.warn("[CaptainRiding] route fetch failed", e?.message);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [navPhase, rideData]);

  // ── Build the ride object to pass to LiveTracking ─────────────────────
  const navRide = rideData
    ? {
        ...rideData,
        // Attach decoded route so LiveTracking draws the polyline
        routePath: routePolylinePath || rideData.routePath,
        // Tell LiveTracking which marker to show as the destination
        pickupCoords: getTargetCoords(navPhase),
      }
    : null;

  const navDestination = getTargetCoords(navPhase);

  // ── GSAP panel animation ──────────────────────────────────────────────
  useGSAP(
    function () {
      if (finishRidePanel) {
        gsap.to(finishRidePanelRef.current, { y: "0%", delay: 0.3 });
      } else {
        gsap.to(finishRidePanelRef.current, { y: "100%", display: "hidden" });
      }
    },
    [finishRidePanel]
  );

  // ── Ride cancelled by passenger ───────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ rideId, message, user }) => {
      try {
        const passengerName =
          user && (user.fullname || user.fullName || user.name)
            ? user.fullname || user.fullName || user.name
            : null;
        setCancelPopup({
          rideId: rideId || null,
          message: message || "Passenger cancelled the ride.",
          userName: passengerName,
        });
      } catch (e) {}
    };
    socket.on("ride-cancelled", handler);
    return () => { try { socket.off("ride-cancelled", handler); } catch (e) {} };
  }, [socket]);

  // ── Phase labels ──────────────────────────────────────────────────────
  const phaseLabel = navPhase === "pickup" ? "Heading to Pickup" : "Heading to Dropoff";
  const phaseColor = navPhase === "pickup" ? "#22c55e" : "#3b82f6"; // green for pickup, blue for dropoff

  return (
    <div>
      {/* ── Cancelled popup ── */}
      {cancelPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-[420px] max-w-[94%] text-center">
            <h3 className="text-lg font-semibold mb-2">Ride Cancelled</h3>
            <p className="text-sm text-gray-700 mb-4">
              {cancelPopup.userName
                ? `${cancelPopup.userName} has cancelled the ride.`
                : cancelPopup.message}
            </p>
            <button
              onClick={() => {
                try {
                  window.sessionStorage.removeItem("captain_pending_ride_request");
                  setFinishRidePanel(false);
                  setCancelPopup(null);
                  navigate("/captain-home");
                } catch (e) {}
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden h-screen w-screen relative">
        {/* ── Logo ── */}
        <div className="absolute top-0 left-0 ml-7 py-7 z-30">
          <Link>
            <img className="w-16" src={logoPath} alt="logo" />
          </Link>
        </div>

        {/* ── Logout ── */}
        <Link
          to="/captain-logout"
          className="absolute top-3 right-3 w-12 h-12 rounded-full bg-black flex items-center justify-center z-30"
        >
          <i style={{ color: "white" }} className="ri-logout-box-line ri-xl mb mr-0.5" />
        </Link>

        {/* ── MAP — full screen behind everything ── */}
        <div className="absolute w-screen h-full top-0 z-20">
          <LiveTracking
            ride={navRide}
            role="captain"
            navMode={true}
            navDestination={navDestination}
          />
        </div>

        {/* ── Google-Maps-style Navigation Header ── */}
        <div
          className="absolute top-0 left-0 right-0 z-40"
          style={{
            background: phaseColor,
            paddingTop: "env(safe-area-inset-top, 12px)",
          }}
        >
          {/* Phase banner */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <i
                className={
                  navPhase === "pickup"
                    ? "ri-map-pin-user-fill text-white text-xl"
                    : "ri-flag-2-fill text-white text-xl"
                }
              />
              <span className="text-white font-bold text-base tracking-wide">
                {phaseLabel}
              </span>
            </div>
            {/* Switch phase button */}
            {navPhase === "pickup" && (
              <button
                onClick={() => {
                  fetchedPhaseRef.current = null;
                  setRoutePolylinePath(null);
                  setRouteInfo(null);
                  setNextInstruction(null);
                  setNavPhase("dropoff");
                }}
                className="text-white text-xs font-semibold bg-white/20 px-3 py-1 rounded-full"
              >
                Passenger on board →
              </button>
            )}
          </div>

          {/* Turn instruction row */}
          {nextInstruction && (
            <div className="flex items-center gap-3 px-4 pb-2">
              <i className="ri-corner-up-right-fill text-white text-2xl" />
              <div>
                <p className="text-white font-semibold text-sm leading-tight">
                  {nextInstruction.text}
                </p>
                {nextInstruction.distance && (
                  <p className="text-white/80 text-xs">{nextInstruction.distance}</p>
                )}
              </div>
              {routeInfo?.duration && (
                <div className="ml-auto text-right">
                  <p className="text-white font-bold text-sm">{routeInfo.duration}</p>
                  {routeInfo.distance && (
                    <p className="text-white/80 text-xs">{routeInfo.distance}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading indicator */}
          {loadingRoute && !nextInstruction && (
            <div className="flex items-center gap-2 px-4 pb-2">
              <div className="w-3 h-3 rounded-full bg-white/60 animate-pulse" />
              <span className="text-white/80 text-xs">Getting directions…</span>
            </div>
          )}
        </div>

        {/* ── Finish ride panel (slides up from bottom) ── */}
        <div
          ref={finishRidePanelRef}
          className="bg-white absolute bottom-0 w-screen h-full z-40 rounded-t-lg overflow-y-auto overflow-x-hidden"
          style={{ transform: "translateY(100%)" }}
        >
          <FinishRide setFinishRidePanel={setFinishRidePanel} ride={rideData} />
        </div>

        {/* ── Bottom action bar ── */}
        <div
          style={{ background: "linear-gradient(to right, #f2994a, #f2c94c)" }}
          className="absolute bottom-0 w-screen rounded-t-lg overflow-y-auto overflow-x-hidden z-30"
        >
          <div className="flex flex-col justify-center items-center my-[8%]">
            <div className="w-[100%] flex flex-row px-2">
              {/* Distance / phase info */}
              <h2 className="w-[50%] flex justify-start text-2xl font-semibold font-sans pl-[15px] p-2">
                {routeInfo?.distance ? routeInfo.distance : "4KM Away"}
              </h2>
              <div className="w-[50%] flex justify-center items-center">
                <button
                  onClick={() => setFinishRidePanel(true)}
                  style={{ background: "linear-gradient(to right, #1d976c, #93f9b9)" }}
                  className="px-7 py-3 flex justify-center rounded-lg text-white font-semibold text-lg"
                >
                  Complete Ride
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default CaptainRiding;
