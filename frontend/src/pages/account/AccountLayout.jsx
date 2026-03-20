import React, { useContext } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { UserDataContext } from "../../context/UserContext";
import logoPath from "../../config/logo";
import MobileHeader from "../../components/MobileHeader";

const AccountLayout = () => {
  const { user } = useContext(UserDataContext);
  const location = useLocation();

  const navItems = [
    { path: "/account/profile", label: "Personal Info", icon: "👤" },
    { path: "/account/payment", label: "Payment Methods", icon: "💳" },
    { path: "/account/security", label: "Security", icon: "🔒" },
    { path: "/account/rides", label: "Ride History", icon: "🚗" },
  ];

  const isActive = (path) => location.pathname === path;

  // Get current page title based on route
  const getCurrentTitle = () => {
    const current = navItems.find((item) => isActive(item.path));
    return current?.label || "My Account";
  };

  return (
    <div className="min-h-screen">
      {/* Mobile Header with Back Button */}
      <MobileHeader title={getCurrentTitle()} showBack={true} />

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-white/10 mt-16">
          <Link to="/home" className="hover:scale-105 transition-transform duration-300">
          <img className="w-12" src={logoPath} alt="VexoMove Logo" />
        </Link>
        <h1 className="text-2xl font-bold text-white">My Account</h1>
        <div className="w-12" />
      </div>

      <div className="flex h-auto md:h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="hidden md:block w-64 bg-[#121826]/70 backdrop-blur-xl border-r border-white/10 p-6 overflow-y-auto">
          {/* User Summary */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl p-4 border border-indigo-500/30">
              <p className="text-sm text-gray-400 mb-1">Logged in as</p>
              <p className="text-white font-semibold">
                {user?.fullname?.firstname} {user?.fullname?.lastname}
              </p>
              <p className="text-xs text-gray-400 mt-2">{user?.email}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ${
                  isActive(item.path)
                    ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-semibold"
                    : "text-gray-300 hover:bg-white/10 border border-transparent hover:border-white/10"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
