import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import LeaveApplication from '../models/LeaveApplication.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localUploadDir = path.join(__dirname, '..', 'uploads');

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    return true;
  }

  return false;
};

const saveLocalAttachment = async (buffer, originalName) => {
  if (!buffer || !buffer.length) return '';

  await fs.mkdir(localUploadDir, { recursive: true });
  const safeName = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
  const filePath = path.join(localUploadDir, safeName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${safeName}`;
};

const parseLeaveDate = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const [year, month, day] = trimmed.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const cleanupExpiredLeaveApplications = async () => {
  try {
    const allLeaves = await LeaveApplication.find({});
    const expiredIds = [];
    const now = new Date();

    allLeaves.forEach((leave) => {
      const endDate = parseLeaveDate(leave.endDate);
      if (!endDate) return;
      const deleteAfter = new Date(endDate);
      deleteAfter.setUTCDate(deleteAfter.getUTCDate() + 5);
      if (now >= deleteAfter) {
        expiredIds.push(leave._id);
      }
    });

    if (expiredIds.length > 0) {
      await LeaveApplication.deleteMany({ _id: { $in: expiredIds } });
    }
  } catch (error) {
    console.error('Leave cleanup failed:', error);
  }
};

const uploadToCloudinary = async (buffer, originalName) => {
  if (!buffer || !buffer.length) return '';

  const isConfigured = configureCloudinary();
  if (!isConfigured) {
    return saveLocalAttachment(buffer, originalName);
  }

  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'hostel-leaves',
          resource_type: 'auto',
          public_id: `${Date.now()}-${originalName.replace(/\s+/g, '_')}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url || '');
        }
      );

      stream.end(buffer);
    });
  } catch (error) {
    console.warn('Cloudinary leave upload failed, using local storage fallback:', error.message);
    return saveLocalAttachment(buffer, originalName);
  }
};

router.post('/submit', authMiddleware, upload.single('attachment'), async (req, res) => {
  await cleanupExpiredLeaveApplications();
  try {
    const { reason, startDate, endDate, mobileNumber } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'A photo/document upload is required.' });
    }
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const attachmentUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    const leaveApplication = await LeaveApplication.create({
      userId: user._id,
      username: user.username,
      fullName: user.fullName || user.username,
      reason,
      startDate,
      endDate,
      mobileNumber: mobileNumber || user.mobileNumber || '',
      attachmentUrl,
      status: 'Pending'
    });

    res.status(201).json({
      message: 'Leave application submitted successfully.',
      leaveApplication
    });
  } catch (error) {
    console.error('Leave submission failed:', error);
    res.status(500).json({ message: 'Failed to submit leave application.' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    await cleanupExpiredLeaveApplications();
    const leaves = await LeaveApplication.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ leaves });
  } catch (error) {
    console.error('Failed to fetch student leaves:', error);
    res.status(500).json({ message: 'Failed to fetch leave applications.' });
  }
});

router.get('/all', async (req, res) => {
  try {
    await cleanupExpiredLeaveApplications();
    const leaves = await LeaveApplication.find().sort({ createdAt: -1 }).populate('userId', 'username fullName roomNumber');
    res.json({ leaves });
  } catch (error) {
    console.error('Failed to fetch all leave applications:', error);
    res.status(500).json({ message: 'Failed to fetch leave applications.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const leaveApplication = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '' },
      { new: true }
    );

    if (!leaveApplication) {
      return res.status(404).json({ message: 'Leave application not found.' });
    }

    res.json({ message: 'Leave status updated.', leaveApplication });
  } catch (error) {
    console.error('Failed to update leave status:', error);
    res.status(500).json({ message: 'Failed to update leave status.' });
  }
});

setInterval(() => {
  cleanupExpiredLeaveApplications();
}, 60 * 60 * 1000);

cleanupExpiredLeaveApplications();

export { cleanupExpiredLeaveApplications };
export default router;
