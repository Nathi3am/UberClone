import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import API from '../../config/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserDataContext } from '../../context/UserContext';
import { CaptainDataContext } from '../../context/CaptainContext';

const Security = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useContext(UserDataContext);
  const { setCaptain } = useContext(CaptainDataContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswords = () => {
    if (!passwordData.currentPassword) {
      toast.error("Please enter your current password");
      return false;
    }
    if (!passwordData.newPassword) {
      toast.error("Please enter a new password");
      return false;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return false;
    }
    const strongRe = /(?=.*\d)(?=.*[^A-Za-z0-9])/;
    if (!strongRe.test(passwordData.newPassword)) {
      toast.error("New password must contain at least one number and one special character");
      return false;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("passwords dont match");
      return false;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password must be different from current password");
      return false;
    }
    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);
    const isCaptainRoute = location.pathname.includes('/captain');
    try {
      const endpoint = isCaptainRoute ? `${API}/captain/change-password` : `${API}/users/change-password`;
      const response = await fetch(
        endpoint,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
            confirmPassword: passwordData.confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully");
        try {
          const audio = new Audio('/sounds/universfield-new-notification-031-480569.mp3');
          audio.volume = 0.9;
          audio.play().catch(() => {});
        } catch (e) {}
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        // clear local auth and force re-login for the correct role
        try { localStorage.removeItem('token'); } catch (e) {}
        if (isCaptainRoute) {
          try { setCaptain && setCaptain(null); } catch (e) {}
          try { navigate('/captain-login'); } catch (e) {}
        } else {
          try { setUser && setUser(null); } catch (e) {}
          try { navigate('/login'); } catch (e) {}
        }
      } else {
        toast.error(data.message || "Failed to change password");
        try {
          const audio = new Audio('/sounds/denielcz-done-463074.mp3');
          audio.volume = 0.9;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("Error changing password. Please try again.");
      try {
        const audio = new Audio('/sounds/denielcz-done-463074.mp3');
        audio.volume = 0.9;
        audio.play().catch(() => {});
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Security Settings</h2>
        <p className="text-gray-400">Manage your account security and password</p>
      </div>

      {/* Change Password Section */}
      <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-6">Change Password</h3>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter your current password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-500 font-semibold"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPasswords.current ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter your new password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-500 font-semibold"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPasswords.new ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-500 font-semibold"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPasswords.confirm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Security Tips */}
      <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
          🔒 Security Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex gap-2">
            <span>✓</span>
            <span>Use a strong password with mixed characters</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Don't share your password with anyone</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Change your password periodically</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Log out from other sessions after changing password</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Never enter your password on unsecured networks</span>
          </li>
        </ul>
      </div>

      {/* Two-Factor Authentication Info */}
      <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Two-Factor Authentication
            </h3>
            <p className="text-gray-400 text-sm">
              Add an extra layer of security to your account
            </p>
          </div>
          <button className="px-6 py-2 rounded-lg bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20 transition-all duration-300 text-sm font-semibold">
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
};

export default Security;
