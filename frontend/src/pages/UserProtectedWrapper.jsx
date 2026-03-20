import React, { useContext, useEffect, useState } from "react";
import { UserDataContext } from "../context/UserContext";
import { SocketContext } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API from '../config/api';

const UserProtectWrapper = ({ children }) => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserDataContext);
  const { socket } = useContext(SocketContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }

    axios
      .get(`${API}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (response.status === 200) {
          const u = response.data.user || {};
          if (u.profileImage && typeof u.profileImage === 'string' && u.profileImage.startsWith('/')) {
            u.profileImage = `${API}${u.profileImage}`;
          }
          setUser(u);
          try { localStorage.setItem("userProfile", JSON.stringify(u)); } catch (e) {}
          try {
            if (socket && response.data.user && response.data.user._id) {
              socket.emit('join', { userId: response.data.user._id, userType: 'user' });
            }
          } catch (e) {}
          setIsLoading(false);
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          try { localStorage.removeItem("token"); localStorage.removeItem("userProfile"); } catch (e) {}
          navigate("/login");
          return;
        }

        try {
          const cached = localStorage.getItem("userProfile");
          if (cached) {
            setUser(JSON.parse(cached));
            setIsLoading(false);
            return;
          }
        } catch (e) {}

        setIsLoading(false);
      });
  }, [token, setUser, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default UserProtectWrapper;
