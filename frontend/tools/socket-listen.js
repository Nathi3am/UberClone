const { io } = require('socket.io-client');
const argv = process.argv.slice(2);
const userId = argv[0] || process.env.USER_ID;
if (!userId) {
  console.error('Usage: node socket-listen.js <userId>');
  process.exit(1);
}

const API_BASE_URL = process.env.VITE_API_URL || 'http://192.168.0.24:4000';
const socket = io(API_BASE_URL.replace(/\/api$/, ''), { transports: ['websocket'] });

socket.on('connect', () => {
  console.log('Connected as socket client, id=', socket.id);
  try { socket.emit('join', { userId, userType: 'user' }); } catch (e) {}
  try { socket.emit('join-room', userId); } catch (e) {}
});

const events = ['ride-completed','ride-ended','rideStatusUpdate','ride-accepted','ride-started','ride-confirmed'];

events.forEach(ev => {
  socket.on(ev, (payload) => {
    console.log(`EVENT ${ev}:`, JSON.stringify(payload && (payload._id || payload.rideId) ? (payload._id || payload.rideId) : payload));
  });
});

socket.on('disconnect', () => {
  console.log('disconnected');
});

// keep process alive
process.stdin.resume();
