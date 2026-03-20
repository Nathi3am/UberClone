import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

const ChatPanel = ({ rideId, userType = 'user', onClose, initialMessages = [], onOpen }) => {
  const socketCtx = useContext(SocketContext);
  const socket = socketCtx?.socket || socketCtx;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (payload) => {
      try {
        if (!payload || payload.rideId !== rideId) return;
        setMessages((m) => [...m, payload]);
      } catch (e) {}
    };

    const onEnd = ({ rideId: r }) => {
      try {
        if (r !== rideId) return;
        setDisabled(true);
      } catch (e) {}
    };

    socket.on('chat-message', onMessage);
    socket.on('end-chat', onEnd);

    return () => {
      try { socket.off('chat-message', onMessage); } catch (e) {}
      try { socket.off('end-chat', onEnd); } catch (e) {}
    };
  }, [socket, rideId]);

  // Initialize with any buffered messages passed from parent (e.g., messages that arrived before mount)
  useEffect(() => {
    try {
      if (initialMessages && initialMessages.length > 0) {
        setMessages((m) => {
          // avoid duplicates by simple key check (timestamp+text)
          const existingKeys = new Set(m.map(x => `${x.timestamp}|${x.text}`));
          const merged = [...m];
          initialMessages.forEach(im => {
            const key = `${im.timestamp}|${im.text}`;
            if (!existingKeys.has(key)) {
              merged.push(im);
            }
          });
          return merged;
        });
      }
    } catch (e) {}
    try { if (typeof onOpen === 'function') onOpen(); } catch (e) {}
  }, []); // run once on mount

  const send = () => {
    if (!text || disabled) return;
    try {
      const payload = { rideId, text };
      socket.emit('send-chat-message', payload);
      setMessages((m) => [...m, { ...payload, from: userType, timestamp: new Date().toISOString() }]);
      setText('');
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div>
            <strong className="text-black">Chat</strong>
            <span className="text-xs text-gray-500 ml-2">{disabled ? ' (closed)' : ''}</span>
          </div>
          <div>
            <button onClick={() => { setDisabled(true); if (typeof onClose === 'function') onClose(); }} className="text-gray-500 hover:text-gray-800 px-2">✕</button>
          </div>
        </div>
        <div style={{ maxHeight: 220, overflowY: 'auto' }} className="p-3 bg-gray-50">
          {messages.length === 0 && <div className="text-sm text-gray-400">No messages yet</div>}
          {messages.map((m, i) => (
            <div key={i} className={`my-2 flex ${m.from === userType ? 'justify-end' : 'justify-start'}`}>
              <div className={`${m.from === userType ? 'bg-blue-600 text-white' : 'bg-white text-black'} rounded-lg px-3 py-2 shadow-sm max-w-[80%]`}>
                <div className="text-sm">{m.text}</div>
                <div className="text-xs text-gray-200 mt-1 text-right">{new Date(m.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t bg-white flex gap-2">
          <input disabled={disabled} value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? 'Chat ended' : 'Type a message'} className="flex-1 px-3 py-2 border rounded-lg" />
          <button disabled={disabled} onClick={send} className={`px-4 py-2 rounded-lg ${disabled ? 'bg-gray-300' : 'bg-blue-600 text-white'}`}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
