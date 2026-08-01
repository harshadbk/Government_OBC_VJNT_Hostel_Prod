import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import LeaveApplication from '../models/LeaveApplication.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
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

const formatDate = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  const current = parseLeaveDate(startDate);
  const end = parseLeaveDate(endDate);
  if (!current || !end) return dates;

  while (current <= end) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const isValidDateRange = (startDate, endDate) => {
  const parsedStart = parseLeaveDate(startDate);
  const parsedEnd = parseLeaveDate(endDate);
  return parsedStart && parsedEnd && parsedStart <= parsedEnd;
};

const hasOverlappingActiveLeave = async (userId, startDate, endDate, excludeId = null) => {
  const query = {
    userId,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };
  if (excludeId) query._id = { $ne: excludeId };
  return LeaveApplication.exists(query);
};

const markApprovedLeaveAttendance = async (leaveApplication) => {
  if (!leaveApplication || leaveApplication.status !== 'Approved') return;

  const user = await User.findById(leaveApplication.userId).select('username roomNumber').lean();
  if (!user?.username || !user?.roomNumber) return;

  const leaveDates = getDatesInRange(leaveApplication.startDate, leaveApplication.endDate);
  await Promise.all(leaveDates.map(async (date) => {
    const attendanceDoc = await Attendance.findOne({ date }).lean();
    const existingStudents = Array.isArray(attendanceDoc?.students) ? attendanceDoc.students : [];
    const usernameKey = String(user.username).trim().toLowerCase();
    const filteredStudents = existingStudents.filter((entry) => (
      String(entry.username || '').trim().toLowerCase() !== usernameKey
    ));

    filteredStudents.push({
      username: user.username,
      roomNumber: String(user.roomNumber || '').trim(),
      status: 'Absent'
    });

    await Attendance.findOneAndUpdate(
      { date },
      {
        $set: {
          date,
          students: filteredStudents,
          markedBy: attendanceDoc?.markedBy || 'leave-auto'
        },
        $setOnInsert: {
          firstSavedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }));
};

const cleanupExpiredLeaveApplications = async () => {
  try {
    const allLeaves = await LeaveApplication.find({});
    const expiredIds = [];
    const now = new Date();

    allLeaves.forEach((leave) => {
      if (leave.status === 'Approved' && !leave.comebackMarked) return;
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
    if (!isValidDateRange(startDate, endDate)) {
      return res.status(400).json({ message: 'Leave start date and end date must be valid, and start date cannot be after end date.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'A photo/document upload is required.' });
    }
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const overlappingLeave = await hasOverlappingActiveLeave(user._id, startDate, endDate);
    if (overlappingLeave) {
      return res.status(409).json({ message: 'You already have a pending or approved leave in this date range. Apply for the next leave after the previous leave end date.' });
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
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid leave status.' });
    }

    const leaveApplication = await LeaveApplication.findById(req.params.id);

    if (!leaveApplication) {
      return res.status(404).json({ message: 'Leave application not found.' });
    }

    if (status === 'Approved') {
      const overlappingLeave = await hasOverlappingActiveLeave(
        leaveApplication.userId,
        leaveApplication.startDate,
        leaveApplication.endDate,
        leaveApplication._id
      );
      if (overlappingLeave) {
        return res.status(409).json({ message: 'Another pending or approved leave already overlaps this date range.' });
      }
    }

    leaveApplication.status = status;
    leaveApplication.adminNote = adminNote || '';
    if (status !== 'Approved') {
      leaveApplication.comebackMarked = false;
      leaveApplication.comebackDate = '';
      leaveApplication.comebackMarkedAt = null;
    }
    await leaveApplication.save();

    if (status === 'Approved') {
      await markApprovedLeaveAttendance(leaveApplication);
    }

    res.json({ message: 'Leave status updated.', leaveApplication });
  } catch (error) {
    console.error('Failed to update leave status:', error);
    res.status(500).json({ message: 'Failed to update leave status.' });
  }
});

router.patch('/:id/comeback', async (req, res) => {
  try {
    const comebackDate = req.body.comebackDate || formatDate();
    if (!parseLeaveDate(comebackDate)) {
      return res.status(400).json({ message: 'Comeback date must be in YYYY-MM-DD format.' });
    }

    const leaveApplication = await LeaveApplication.findById(req.params.id);
    if (!leaveApplication) {
      return res.status(404).json({ message: 'Leave application not found.' });
    }
    if (leaveApplication.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved leave can be marked as comeback.' });
    }

    leaveApplication.comebackMarked = true;
    leaveApplication.comebackDate = comebackDate;
    leaveApplication.comebackMarkedAt = new Date();
    await leaveApplication.save();

    res.json({ message: 'Student comeback marked.', leaveApplication });
  } catch (error) {
    console.error('Failed to mark comeback:', error);
    res.status(500).json({ message: 'Failed to mark comeback.' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    await cleanupExpiredLeaveApplications();
    const today = formatDate();
    const overdueLeaves = await LeaveApplication.find({
      status: 'Approved',
      comebackMarked: false,
      endDate: { $lt: today }
    }).sort({ endDate: 1 }).populate('userId', 'username fullName roomNumber');

    const notifications = overdueLeaves.map((leave) => ({
      _id: leave._id,
      type: 'leave-overdue',
      title: 'Student has not returned from leave',
      message: `${leave.fullName} was expected back after ${leave.endDate}. Mark comeback when the student reports to sir.`,
      studentName: leave.fullName,
      username: leave.username,
      roomNumber: leave.userId?.roomNumber || '',
      startDate: leave.startDate,
      endDate: leave.endDate
    }));

    res.json({ notifications });
  } catch (error) {
    console.error('Failed to fetch leave notifications:', error);
    res.status(500).json({ message: 'Failed to fetch leave notifications.' });
  }
});

setInterval(() => {
  cleanupExpiredLeaveApplications();
}, 60 * 60 * 1000);

cleanupExpiredLeaveApplications();

export { cleanupExpiredLeaveApplications };
export default router;
