import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API from "../config/api";
const CaptainLogout = () => {
  const Navigate = useNavigate();
  const token = localStorage.getItem("token");
  const response = axios.get(`${API}/captain/logout`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  useEffect(() => {
    localStorage.removeItem("token");
    try { localStorage.removeItem('captainToken'); } catch (e) {}
    try { localStorage.removeItem('device_session_token'); } catch (e) {}
    try { localStorage.removeItem('captainProfile'); } catch (e) {}
    // console.log("User Logged Out");
    Navigate("/captain-login");
  }, [Navigate, response]);
  return <div>CaptainLogout</div>;
};

export default CaptainLogout;
