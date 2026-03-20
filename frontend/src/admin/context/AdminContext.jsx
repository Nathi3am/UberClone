import React, { createContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import API_BASE_URL from '../../config/api';

export const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      // start socket connection for real-time updates (lazy)
      try {
        const socketHost = API_BASE_URL.replace(/\/api$/, '');
        const s = io(socketHost, { auth: { token } });
        setSocket(s);
        s.on('connect', () => console.log('admin socket connected'));
        s.on('disconnect', () => console.log('admin socket disconnected'));
        s.on('new_trip', (data) => setNotifications(n => [data, ...n]));
      } catch (e) {
        // ignore socket errors in local dev
      }
    }
    return () => {
      if (socket && socket.disconnect) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (tokenValue, adminInfo) => {
    localStorage.setItem('token', tokenValue);
    setToken(tokenValue);
    setAdmin(adminInfo || null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAdmin(null);
    if (socket && socket.disconnect) socket.disconnect();
  };

  return (
    <AdminContext.Provider value={{ admin, setAdmin, token, login, logout, notifications, socket }}>
      {children}
    </AdminContext.Provider>
  );
}
