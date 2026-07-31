import 'dotenv/config';

import express from 'express';
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
import User from './models/User.js';

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use('/api/notices', noticeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);

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

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');
    await ensureUsernameIndex();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });
