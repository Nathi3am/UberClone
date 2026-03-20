import React, { createContext, useEffect, useContext } from "react";
import { io } from "socket.io-client";
import { UserDataContext } from './UserContext';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config/api';

export const SocketContext = createContext();

// Resolve socket URL from env or fallback to backend API URL.
// Using window.location.origin here caused the client dev server origin
// to be used (eg http://localhost:5173) which is NOT the socket server
// and leads to connection errors when running multiple frontends.
const SOCKET_URL = API_BASE_URL;
console.log('[socket] connecting to', SOCKET_URL);
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});

const SocketProvider = ({ children }) => {
  const { user } = useContext(UserDataContext);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log('Socket disconnected');
    });

    socket.io.on('error', (err) => {
      try { console.error('[socket] engine error', err); } catch (e) {}
    });
    socket.on('connect_error', (err) => {
      try { console.error('[socket] connect_error', err && err.message ? err.message : err); } catch (e) {}
    });

    socket.on('force-logout', (payload) => {
      try {
        const msg = (payload && payload.message) ? payload.message : 'You have been logged out';
        try { localStorage.removeItem('token'); } catch (e) {}
        // choose redirect based on user role if available
        const redirect = (user && user.role === 'captain') ? '/captain-login' : '/login';
        try { window.dispatchEvent(new CustomEvent('show-global-modal', { detail: { title: 'Logged out', message: msg, redirect } })); } catch (e) {}
        try { playToastSound && playToastSound(); } catch (e) {}
      } catch (e) {}
    });

    // When a ride is confirmed for a user, ensure they are shown the ride details.
    socket.on('ride-confirmed', (ride) => {
      try {
        console.debug('Socket event ride-confirmed received', ride && (ride._id || ride.id || ride.rideId));
        if (!ride) return;
        const rideId = ride._id || ride.id || ride.rideId || null;
        // If user is not currently on the rides page, navigate there and include rideId so UI can expand it
        const ridesPath = '/account/rides';
        if (typeof window !== 'undefined') {
          // persist ride payload so the Rides page can show it even if fetching history fails
          try { window.sessionStorage.setItem('incomingRide', JSON.stringify(ride)); } catch (e) {}
          const current = window.location.pathname;
          if (current !== ridesPath) {
            const sep = ridesPath.includes('?') ? '&' : '?';
            window.location.href = `${ridesPath}${sep}rideId=${rideId}`;
            return;
          }
        }
      } catch (e) {
        // ignore any navigation errors
      }
    });

    // Add debug listeners for common ride events so frontend receives are visible in dev console
    const debugHandler = (eventName) => (payload) => {
      try {
        console.log(`Socket event ${eventName} received:`, payload && (payload._id || payload.rideId || payload.id) ? (payload._id || payload.rideId || payload.id) : payload);
      } catch (e) {}
    };

    socket.on('ride-completed', debugHandler('ride-completed'));
    socket.on('ride-ended', debugHandler('ride-ended'));
    socket.on('rideStatusUpdate', debugHandler('rideStatusUpdate'));
    socket.on('ride-accepted', debugHandler('ride-accepted'));
    // Inform passenger when a driver has accepted their ride
    socket.on('ride-accepted', (ride) => {
      try {
        // If current user is a passenger (not a captain), show notification
        if (!user || (user && user.role === 'captain')) return;
        try { toast.info('A driver has been found for your request', { position: 'top-right', autoClose: 6000 }); } catch (e) {}
        try { playToastSound && playToastSound(); } catch (e) { try { playNotificationSound(); } catch (ee) { playBeep(); } }
        // store incoming ride so Rides page can show it immediately
        try { window.sessionStorage.setItem('incomingRide', JSON.stringify(ride)); } catch (e) {}
      } catch (e) {}
    });
    socket.on('ride-started', debugHandler('ride-started'));
    // small helper: short beep using Web Audio API (no asset required)
    const playBeep = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.26);
        // close context shortly after to free resources
        setTimeout(() => { try { ctx.close(); } catch (e) {} }, 500);
      } catch (e) {}
    };

    // Try to play a provided MP3 from public assets, fallback to beep
    const playNotificationSound = async () => {
      try {
        // try playing bundled sound placed under /public/sounds/
        const soundPath = '/sounds/denielcz-done-463074.mp3';
        const audio = new Audio(soundPath);
        audio.volume = 0.9;
        // play returns a promise in modern browsers
        await audio.play();
        return;
      } catch (e) {
        // fallback to WebAudio beep if audio asset missing or play rejected
        try { playBeep(); } catch (err) {}
      }
    };

    // Play the toast-specific notification (uses a different MP3), fallback to the general notification or beep
    const playToastSound = async () => {
      try {
        const toastPath = '/sounds/universfield-new-notification-031-480569.mp3';
        const audio = new Audio(toastPath);
        audio.volume = 0.9;
        await audio.play();
        return;
      } catch (e) {
        try { await playNotificationSound(); } catch (err) { try { playBeep(); } catch (ee) {} }
      }
    };

    // When a passenger submits a rating, notify the captain with a toast + beep
    socket.on('passenger-rated', (payload) => {
      try {
        const name = payload && payload.passengerName ? payload.passengerName : 'Passenger';
        const rating = payload && (payload.rating !== undefined) ? payload.rating : '';
        try { toast.info(`${name} rated you ${rating}`, { position: 'top-right', autoClose: 5000 }); } catch (e) {}
        try { playBeep(); } catch (e) {}
      } catch (e) {}
    });

    // When a new ride request arrives for a captain, play notification sound
    socket.on('new-ride', (ride) => {
      try {
        // Play the preferred MP3 if available, otherwise fallback to beep
        try { playNotificationSound(); } catch (e) { playBeep(); }
      } catch (e) {}
    });

    // If the socket connects and the local preference says captain should be online, re-announce
    socket.on('connect', () => {
      try {
        const keepOnline = localStorage.getItem('captainOnline');
        if (keepOnline === 'true' && user && user.role === 'captain' && user._id) {
          try { socket.emit('captain-online', user._id); } catch (e) {}
          try { socket.emit('driver-online', user._id); } catch (e) {}
        }
      } catch (e) {}
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off('ride-completed');
      socket.off('ride-ended');
      socket.off('rideStatusUpdate');
      socket.off('ride-accepted');
      socket.off('ride-started');
      socket.off('passenger-rated');
    };
  }, []);

  // join personal room after user logs in or when user changes
  useEffect(() => {
    try {
      if (user && user._id) {
        socket.emit('join', { userId: user._id, userType: user.role || 'user' });
        try { socket.emit('join-room', user._id.toString()); } catch (e) {}
      }
    } catch (e) {}
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
