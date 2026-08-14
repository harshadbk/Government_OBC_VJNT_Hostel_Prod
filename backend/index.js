import 'dotenv/config';

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import User from './models/User.js';
import Document from './models/Document.js';
import { initSocket } from './socket/socketHandler.js';

const app = express();
const httpServer = http.createServer(app);
const DEFAULT_PORT = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Socket.IO
initSocket(httpServer);

const requiredAdminEnv = ['ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const missingAdminEnv = requiredAdminEnv.filter((key) => !process.env[key] || !process.env[key].trim());
if (missingAdminEnv.length > 0) {
  console.warn(`WARNING: Missing admin environment variables: ${missingAdminEnv.join(', ')}. Admin dashboard login will not work.`);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin', userRoutes);
app.use('/api', userRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/community', communityRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'HMS backend is running.' });
});

const ensureUsernameIndex = async () => {
  try {
    await User.collection.createIndex({ username: 1 }, { unique: true });
  } catch (error) {
    console.warn('Unable to ensure username index:', error.message);
  }
};

const ensureDocumentIndexes = async () => {
  try {
    await Document.collection.dropIndex('email_1').catch(() => {});
    await Document.collection.createIndex({ userId: 1 }, { unique: true });
  } catch (error) {
    console.warn('Unable to ensure document indexes:', error.message);
  }
};

const startServer = (port = DEFAULT_PORT, attempt = 0) => {
  const serverListener = httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  serverListener.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < 5) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Trying ${nextPort} instead.`);
      if (serverListener.listening) {
        serverListener.close(() => startServer(nextPort, attempt + 1));
      } else {
        startServer(nextPort, attempt + 1);
      }
      return;
    }

    console.error('Server error:', error.message);
    process.exit(1);
  });
};

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');
    await ensureUsernameIndex();
    await ensureDocumentIndexes();
    startServer();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });

