import { io } from 'socket.io-client';

let socket = null;

export const getSocket = (token, onStatusChange) => {
  if (!token) return null;

  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin;

    socket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      path: '/socket.io/'
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected to community hub.');
      if (onStatusChange) onStatusChange('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (onStatusChange) onStatusChange('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      if (onStatusChange) onStatusChange('reconnecting');
    });

    socket.io.on('reconnect_attempt', () => {
      if (onStatusChange) onStatusChange('reconnecting');
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
