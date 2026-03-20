import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import './firebase';
import App from "./App.jsx";
import UserContext from "./context/UserContext.jsx";
import CaptainContext from "./context/CaptainContext.jsx";
import SocketProvider from "./context/SocketContext.jsx";
import { RideProvider } from "./context/RideContext";
import axios from 'axios';
import { toast } from 'react-toastify';

// Inject device session token into all axios requests
axios.interceptors.request.use((config) => {
  try {
    const ds = localStorage.getItem('device_session_token');
    if (ds) {
      config.headers = config.headers || {};
      config.headers['x-session-token'] = ds;
    }
  } catch (e) {}
  return config;
}, (err) => Promise.reject(err));

// Global interceptor: if server returns 403 due to suspension, force logout
axios.interceptors.response.use(
  response => response,
  error => {
    try {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || '';
      if (status === 403 && (/suspend/i.test(message) || /pending admin approval/i.test(message) || /pending approval/i.test(message))) {
        try { localStorage.removeItem('token'); localStorage.removeItem('device_session_token'); } catch (e) {}
        try {
          window.dispatchEvent(new CustomEvent('show-global-modal', { detail: { title: 'Session', message: message || 'Session ended', redirect: '/captain-login' } }));
        } catch (e) {}
      }
      // Session expired due to login on another device
      if (status === 401 && /Session expired\. Your account is now active on another device\./i.test(message)) {
        try { localStorage.removeItem('token'); localStorage.removeItem('device_session_token'); } catch (e) {}
        try {
          window.dispatchEvent(new CustomEvent('show-global-modal', { detail: { title: 'Session Ended', message: 'Your session has been ended because your account was logged in on another device.', redirect: '/captain-login' } }));
        } catch (e) {}
      }
    } catch (e) {}
    return Promise.reject(error);
  }
);

// Wrap window.fetch to inject device session header and globally handle session-expiry messages
if (typeof window !== 'undefined' && window.fetch) {
  const _origFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      init = init || {};
      init.headers = init.headers || {};
      try {
        const ds = localStorage.getItem('device_session_token');
        if (ds) init.headers['x-session-token'] = ds;
      } catch (e) {}
      const res = await _origFetch(input, init);
      if (res && res.status === 401) {
        // try to read JSON body to inspect message
        let body = null;
        try { body = await res.clone().json(); } catch (e) { body = null; }
        const msg = body && body.message ? body.message : '';
        if (/Session expired\. Your account is now active on another device\./i.test(msg)) {
          try { localStorage.removeItem('token'); localStorage.removeItem('device_session_token'); } catch (e) {}
          try { toast.error('Your session has been ended because your account was logged in on another device.', { position: 'top-center', autoClose: 6000, theme: 'dark' }); } catch (e) {}
          if (typeof window !== 'undefined') window.location.href = '/captain-login';
        }
      }
      return res;
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CaptainContext>
      <UserContext>
        <RideProvider>
          <SocketProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SocketProvider>
        </RideProvider>
      </UserContext>
    </CaptainContext>
  </StrictMode>
);
