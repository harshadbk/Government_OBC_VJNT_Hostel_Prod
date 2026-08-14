import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let ioInstance = null;
const onlineUsers = new Map(); // userId -> { socketIds: Set, userData }

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) {
        return next(new Error('Authentication error: Missing token'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');

      const isAdmin = decoded?.role?.toString().toLowerCase() === 'admin' ||
                      decoded?.username?.toString().toLowerCase() === 'admin' ||
                      decoded?.userId === 'hardcoded-admin';

      if (isAdmin) {
        socket.user = {
          _id: decoded.userId || 'hardcoded-admin',
          username: decoded.username || 'Admin',
          fullName: 'Hostel Admin',
          role: decoded.role || 'admin',
          isVerified: true,
          model: 'Admin'
        };
        return next();
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        _id: user._id.toString(),
        username: user.username,
        fullName: user.fullName || user.username,
        role: 'student',
        isVerified: true,
        model: 'User'
      };

      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id;

    // Track online presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, {
        socketIds: new Set([socket.id]),
        user: socket.user
      });
      io.emit('user:online', { userId, user: socket.user });
    } else {
      onlineUsers.get(userId).socketIds.add(socket.id);
    }

    // Join Channel Room (channelId or channel string name)
    socket.on('community:join', ({ channelId, channel }) => {
      const room = channelId || channel || 'general';
      socket.join(room);
    });

    // Leave Channel Room
    socket.on('community:leave', ({ channelId, channel }) => {
      const room = channelId || channel || 'general';
      socket.leave(room);
    });

    // Typing Indicators
    socket.on('typing:start', ({ channelId, channel }) => {
      const room = channelId || channel || 'general';
      socket.to(room).emit('typing:start', {
        channelId: room,
        channel: room,
        userId: socket.user._id,
        fullName: socket.user.fullName
      });
    });

    socket.on('typing:stop', ({ channelId, channel }) => {
      const room = channelId || channel || 'general';
      socket.to(room).emit('typing:stop', {
        channelId: room,
        channel: room,
        userId: socket.user._id
      });
    });

    // Disconnect Handler
    socket.on('disconnect', () => {
      const userPresence = onlineUsers.get(userId);
      if (userPresence) {
        userPresence.socketIds.delete(socket.id);
        if (userPresence.socketIds.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO is not initialized!');
  }
  return ioInstance;
};
