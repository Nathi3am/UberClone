import React, { createContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import API_BASE_URL from '../config/api';

export const SocketContext = createContext();

const socket = io(API_BASE_URL, { transports: ['websocket'] });
export { socket };

export default function SocketProvider({ children }){
  const [connected, setConnected] = useState(false);
  const [newDeletedCount, setNewDeletedCount] = useState(0);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    // on connect, if admin info present in localStorage, join admin room
    const tryJoin = () => {
      try {
        const role = localStorage.getItem('role');
        const userId = localStorage.getItem('userId');
        if (role === 'admin' && userId) {
          socket.emit('join', { userId, userType: 'admin' });
        }
      } catch (e) {}
    };
    socket.on('connect', tryJoin);
    // listen for audit-created events and increment badge counter
    const onAuditCreated = (payload) => {
      try { setNewDeletedCount((c) => c + 1); } catch (e) {}
    };
    socket.on('audit-created', onAuditCreated);

    return () => {
      socket.off('connect', tryJoin);
      socket.off('audit-created', onAuditCreated);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, newDeletedCount, clearDeletedCount: () => setNewDeletedCount(0) }}>
      {children}
    </SocketContext.Provider>
  )
}
