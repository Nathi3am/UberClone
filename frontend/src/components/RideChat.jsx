import { useState, useEffect, useRef } from "react";

const RideChat = ({ socket, ride, user, otherUser, onClose, initialMessages = [], onOpen }) => {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // initialize with any buffered messages
    try {
      if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    } catch (e) {}

    if (!socket) return;

    // generic handler that deduplicates incoming messages against optimistic local echoes
    const handleIncoming = (incoming) => {
      try {
        if (!incoming || incoming.rideId !== ride._id) return;
        const payload = {
          senderId: incoming.senderId || incoming.from || incoming.fromId || incoming.sender || null,
          message: incoming.message || incoming.text || '',
          rideId: incoming.rideId,
          timestamp: incoming.timestamp || new Date().toISOString()
        };

        setMessages(prev => {
          // try to find a matching local echo (same sender and same message text) and replace it
          const lastIndex = prev.map(m => m && m.message).lastIndexOf(payload.message);
          if (lastIndex >= 0) {
            const candidate = prev[lastIndex];
            if (candidate && candidate.localEcho && String(candidate.senderId) === String(payload.senderId)) {
              const copy = prev.slice();
              copy[lastIndex] = payload; // replace optimistic echo with server authoritative message
              return copy;
            }
          }

          return [...prev, payload];
        });

        try { if (typeof onOpen === 'function') onOpen(); } catch (e) {}
      } catch (e) {}
    };

    // support multiple event names for compatibility, but funnel through one handler
    socket.on('receive-message', handleIncoming);
    socket.on('receive-ride-message', handleIncoming);
    socket.on('chat-message', handleIncoming);

    return () => {
      try { socket.off('receive-message', handleIncoming); } catch (e) {}
      try { socket.off('receive-ride-message', handleIncoming); } catch (e) {}
      try { socket.off('chat-message', handleIncoming); } catch (e) {}
    };
  }, [socket, ride, initialMessages, onOpen]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    const messageData = {
      rideId: ride._id,
      from: user && (user._id || user.id) ? (user._id || user.id) : null,
      to: otherUser && (otherUser._id || otherUser.id) ? (otherUser._id || otherUser.id) : null,
      message: input,
      timestamp: new Date().toISOString(),
      senderId: user && (user._id || user.id) ? (user._id || user.id) : null
    };

    try {
      // Emit a single canonical chat event. Server will broadcast back to both parties.
      socket.emit('send-chat-message', { rideId: messageData.rideId, text: messageData.message });
    } catch (e) {}

    // Add optimistic local echo; mark it so incoming server echo can replace it and avoid duplicates
    const localMessage = Object.assign({}, messageData, { localEcho: true });
    setMessages(prev => [...prev, localMessage]);
    setInput("");
  };

  const listRef = useRef(null);

  // auto-scroll to bottom when messages update
  useEffect(() => {
    try {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    } catch (e) {}
  }, [messages]);

  return (
    <div className="fixed bottom-20 right-6 w-96 max-w-[92vw] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl z-50 flex flex-col border border-slate-200">

      <div className="bg-slate-900 text-white p-3 rounded-t-2xl flex items-center justify-between">
        <span className="font-semibold">Ride Chat</span>
        <button onClick={onClose} className="text-sm bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600">X</button>
      </div>

      <div ref={listRef} className="flex-1 p-3 overflow-y-auto bg-white">
        {messages.map((msg, index) => {
          const senderId = msg && (msg.senderId || msg.from || msg.fromId || msg.sender);
          const isOwn = String(senderId) === String(user && (user._id || user.id));
          return (
            <div key={index} className={`mb-3 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] px-3 py-2 rounded-xl ${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-slate-800'} ${msg.localEcho ? 'opacity-80 italic' : ''}`}>
                <div className="break-words">{msg.message || msg.text}</div>
                <div className={`text-[10px] mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 p-3 border-t bg-white">
        <input
          className="flex-1 p-2 rounded-md outline-none bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:border-blue-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type message..."
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-md shadow"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>

    </div>
  );
};

export default RideChat;
