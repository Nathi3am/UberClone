import React, { useContext, useState, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Start from "./pages/Start";
import UserLogin from "./pages/UserLogin";
import UserSignup from "./pages/UserSignup";
import CaptainLogin from "./pages/CaptainLogin";
import CaptainSignup from "./pages/CaptainSignup";
import Home from "./pages/Home";
import UserProtectedWrapper from "./pages/UserProtectedWrapper";
import UserLogout from "./pages/UserLogout";
import CaptainHome from "./pages/CaptainHome";
import CaptainProtectedWrapper from "./pages/CaptainProtectWrapper";
import CaptainLogout from "./pages/CaptainLogout";
import RideStarted from "./pages/RideStarted";
import CaptainRiding from "./pages/CaptainRiding";
import AccountLayout from "./pages/account/AccountLayout";
import Profile from "./pages/account/Profile";
import Payment from "./pages/account/Payment";
import Security from "./pages/account/Security";
import Trips from "./pages/Trips";
import Rides from "./pages/account/Rides";
import CaptainDashboard from "./pages/captain/CaptainDashboard";
import CaptainProfile from "./pages/captain/CaptainProfile";
import CaptainVehicles from "./pages/captain/CaptainVehicles";
import Requests from "./pages/captain/Requests";
import CaptainRides from "./pages/captain/CaptainRides";
import SpecialRequests from "./pages/SpecialRequests";
import LetsEatLocal from "./pages/LetsEatLocal";
import VendorDetails from "./pages/VendorDetails";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminProvider } from "./admin/context/AdminContext";
import AdminLayout from "./admin/layout/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Users from "./admin/Users";
import Drivers from "./admin/pages/Drivers";
import RidesAdmin from "./admin/Rides";
import Settings from "./admin/pages/Settings";
import AdminSpecialRequests from "./admin/pages/SpecialRequests";
import AdminSpecialTripsDrivers from "./admin/pages/SpecialTripsDrivers";
import { ToastContainer } from "react-toastify";
import GlobalModal from './components/GlobalModal';
import BottomNav from "./components/BottomNav";
import FloatingRideButton from "./components/FloatingRideButton";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { UserDataContext } from "./context/UserContext.jsx";

const App = () => {
  const location = useLocation();
  const { user } = useContext(UserDataContext);

  // Push notifications: run at app level so they survive navigation.
  // Detect role from localStorage (captainToken set on captain login).
  const userToken = localStorage.getItem('token');
  const captainToken = localStorage.getItem('captainToken');
  const isCaptain = Boolean(captainToken);
  const isPushEnabled = Boolean(captainToken || userToken);
  usePushNotifications(isPushEnabled, isCaptain ? 'captain' : 'user');
  const hideNavRoutes = ["/login", "/signup", "/", "/account/trips", "/lets-eat-local"];
  const hiddenRoutes = [
    "/login",
    "/signup",
    "/captain-login",
    "/captain-signup",
    "/captain-home",
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', redirect: null });

  useEffect(() => {
    const handler = (e) => {
      const d = e && e.detail ? e.detail : {};
      setModalData({ title: d.title || 'Notice', message: d.message || '', redirect: d.redirect || null });
      setModalOpen(true);
    };
    window.addEventListener('show-global-modal', handler);
    return () => window.removeEventListener('show-global-modal', handler);
  }, []);

  const handleClose = () => {
    setModalOpen(false);
    try {
      if (modalData && modalData.redirect) window.location.href = modalData.redirect;
    } catch (e) {}
  };

  return (
    <div className="text-white min-h-screen relative z-[1]">
      <div className="pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <Routes location={location}>
              <Route path="/" element={<Start />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/signup" element={<UserSignup />} />
              <Route path="/captain-login" element={<CaptainLogin />} />
              <Route path="/captain-signup" element={<CaptainSignup />} />
              <Route path="/riding" element={<RideStarted />} />
              <Route
                path="/captain-home"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainHome />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain/dashboard"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainDashboard />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain/earnings"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainDashboard />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain-requests"
                element={
                  <CaptainProtectedWrapper>
                    <Requests />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain-rides"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainRides />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain-profile"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainProfile />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain-vehicles"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainVehicles />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/captain-security"
                element={
                  <CaptainProtectedWrapper>
                    <Security />
                  </CaptainProtectedWrapper>
                }
              />
              <Route
                path="/home"
                element={
                  <UserProtectedWrapper>
                    <Home />
                  </UserProtectedWrapper>
                }
              />
              <Route
                path="/account"
                element={
                  <UserProtectedWrapper>
                    <AccountLayout />
                  </UserProtectedWrapper>
                }
              >
                <Route path="profile" element={<Profile />} />
                <Route path="payment" element={<Payment />} />
                <Route path="security" element={<Security />} />
                <Route path="rides" element={<Rides />} />
              </Route>
              <Route
                path="/user-logout"
                element={
                  <UserProtectedWrapper>
                    <UserLogout />
                  </UserProtectedWrapper>
                }
              ></Route>
              <Route path="/account/trips" element={<Trips />} />
              <Route path="/captain-riding" element={<CaptainRiding />}></Route>
              <Route
                path="/captain-logout"
                element={
                  <CaptainProtectedWrapper>
                    <CaptainLogout />
                  </CaptainProtectedWrapper>
                }
              ></Route>
              <Route path="/special-requests" element={<SpecialRequests />} />
              <Route path="/lets-eat-local" element={<LetsEatLocal />} />
              <Route path="/vendors/:id" element={<VendorDetails />} />
              <Route path="/admin" element={<AdminProvider><AdminLayout /></AdminProvider>}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="users" element={<Users />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="rides" element={<RidesAdmin />} />
                <Route path="special-requests" element={<AdminSpecialRequests />} />
                <Route path="special-trips-drivers" element={<AdminSpecialTripsDrivers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="earnings" element={<div> Earnings summary coming soon </div>} />
              </Route>
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      {localStorage.getItem("token") && user && user.role === "user" && location.pathname === "/riding" && (
        <FloatingRideButton />
      )}
      {!hideNavRoutes.includes(location.pathname) && !location.pathname.startsWith("/captain") && (
        <BottomNav />
      )}
      <ToastContainer />
      <GlobalModal open={modalOpen} title={modalData.title} message={modalData.message} onClose={handleClose} />
    </div>
  );
};

export default App;
