import React, { useEffect, useState, useContext } from "react";
import { CaptainDataContext } from "../context/CaptainContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API from '../config/api';

const CaptainProtectedWrapper = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("captainToken") || localStorage.getItem("token");
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/captain-login");
    }

    axios
      .get(`${API}/captain/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (response.status === 200) {
          const c = response.data.captain || {};
          if (c.profileImage && typeof c.profileImage === 'string' && c.profileImage.startsWith('/')) {
            c.profileImage = `${API}${c.profileImage}`;
          }
          setCaptain(c);
          try { localStorage.setItem("captainProfile", JSON.stringify(c)); } catch (e) {}
          setIsLoading(false);
        }
      })
      .catch((error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("captainToken");
            localStorage.removeItem("device_session_token");
            localStorage.removeItem("captainProfile");
          } catch (e) {}
          navigate("/captain-login");
          return;
        }

        try {
          const cached = localStorage.getItem("captainProfile");
          if (cached) {
            setCaptain(JSON.parse(cached));
            setIsLoading(false);
            return;
          }
        } catch (e) {}

        setIsLoading(false);
      });
  }, [token, navigate, setCaptain]);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return <>{children}</>;
};

export default CaptainProtectedWrapper;
