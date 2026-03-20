import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../config/api";

const UserLogout = () => {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(true);

  const performLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      try {
        await axios.get(`${API}/user/logout`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (e) {
        // ignore network errors — still clear local session
        console.warn('User logout network error', e);
      }
      localStorage.removeItem("token");
      try { localStorage.removeItem("userProfile"); } catch (e) {}
      toast.info("Logged out", { position: "top-center" });
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
      toast.error("Logout failed");
    }
  };

  const cancel = () => {
    setConfirming(false);
    navigate(-1);
  };

  if (!confirming) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={cancel} />
      <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 w-[90%] max-w-md text-center">
        <h3 className="text-lg font-semibold text-white mb-4">Logging out?</h3>
        <p className="text-sm text-gray-300 mb-6">Are you sure you want to log out?</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={performLogout}
            className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold"
          >
            Yes
          </button>
          <button
            onClick={cancel}
            className="px-5 py-2 rounded-lg bg-gray-700 text-white font-semibold"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserLogout;
