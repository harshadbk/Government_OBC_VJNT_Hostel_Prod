import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localUploadDir = path.join(__dirname, '..', 'uploads');

// Cloudinary config
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

// Local storage fallback
const saveLocalAttachment = async (buffer, originalName) => {
  if (!buffer || !buffer.length) return '';
  await fs.mkdir(localUploadDir, { recursive: true });
  const safeName = `complaint-${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
  const filePath = path.join(localUploadDir, safeName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${safeName}`;
};

// Upload handler
const uploadImage = async (buffer, originalName) => {
  if (!buffer || !buffer.length) return '';
  const isCloudinary = configureCloudinary();
  if (!isCloudinary) {
    return saveLocalAttachment(buffer, originalName);
  }

  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'hostel-complaints',
          resource_type: 'image',
          public_id: `complaint-${Date.now()}-${originalName.replace(/\s+/g, '_')}`,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url || '');
        }
      );
      stream.end(buffer);
    });
  } catch (error) {
    console.warn('Cloudinary complaint upload failed, fallback to local storage:', error.message);
    return saveLocalAttachment(buffer, originalName);
  }
};

// Optional / Required Auth Middlewares
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    } catch (err) {
      // Ignore expired token for optional auth
    }
  }
  next();
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    const isAdmin = decoded?.role?.toString().toLowerCase() === 'admin' ||
                    decoded?.username?.toString().toLowerCase() === 'admin' ||
                    decoded?.userId === 'hardcoded-admin';
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin privileges required.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

/**
 * POST /api/complaints/submit
 * Submit a complaint (requires student authentication)
 */
router.post('/submit', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      studentName,
      studentEmail,
      studentPhone,
      roomNumber,
      imageUrl: directImageUrl
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Complaint title is required.' });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: 'Complaint description is required.' });
    }

    let imageUrl = directImageUrl || '';
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, req.file.originalname);
    }

    // Auto-resolve user details from authenticated student
    let linkedUserId = req.user?.userId;
    let finalStudentName = studentName?.trim() || '';
    let finalStudentEmail = studentEmail?.trim() || '';
    let finalStudentPhone = studentPhone?.trim() || '';
    let finalRoomNumber = roomNumber?.trim() || '';

    if (req.user?.userId) {
      const user = await User.findById(req.user.userId).lean();
      if (user) {
        linkedUserId = user._id;
        if (!finalStudentName) finalStudentName = user.fullName || user.username;
        if (!finalStudentEmail) finalStudentEmail = user.email || '';
        if (!finalStudentPhone) finalStudentPhone = user.mobileNumber || user.parentMobile || '';
        if (!finalRoomNumber) finalRoomNumber = user.roomNumber || '';
      }
    }

    if (!finalStudentName) {
      finalStudentName = 'Resident Student';
    }

    const complaint = await Complaint.create({
      title: title.trim(),
      description: description.trim(),
      category: category || 'Room Maintenance',
      priority: priority || 'Medium',
      imageUrl: imageUrl || '',
      status: 'Pending',
      studentName: finalStudentName,
      studentEmail: finalStudentEmail,
      studentPhone: finalStudentPhone,
      roomNumber: finalRoomNumber,
      userId: linkedUserId,
      isAnonymous: false,
    });

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint
    });
  } catch (error) {
    console.error('Failed to submit complaint:', error);
    res.status(500).json({ message: 'Failed to submit complaint. ' + error.message });
  }
});

/**
 * GET /api/complaints/my
 * Get student's submitted complaints
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    
    // Build flexible query matching userId or student credentials
    const queryConditions = [{ userId: req.user.userId }];
    if (user?.username) queryConditions.push({ studentName: user.username });
    if (user?.fullName) queryConditions.push({ studentName: user.fullName });
    if (user?.email) queryConditions.push({ studentEmail: user.email });

    const complaints = await Complaint.find({ $or: queryConditions })
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (error) {
    console.error('Failed to fetch user complaints:', error);
    res.status(500).json({ message: 'Failed to fetch complaints.' });
  }
});

/**
 * GET /api/complaints/stats
 * Get complaint box and community statistics for home page and admin sidebar
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      communityMessagesCount,
      totalUsersCount
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Message.countDocuments().catch(() => 0),
      User.countDocuments().catch(() => 0)
    ]);

    // Compute resolution rate percentage
    const resolutionRate = totalComplaints > 0
      ? Math.round((resolvedComplaints / totalComplaints) * 100)
      : 100;

    res.json({
      total: totalComplaints,
      pending: pendingComplaints,
      inProgress: inProgressComplaints,
      resolved: resolvedComplaints,
      resolutionRate,
      activeComplaints: pendingComplaints + inProgressComplaints,
      communityMessages: communityMessagesCount,
      totalStudents: totalUsersCount
    });
  } catch (error) {
    console.error('Failed to get complaint stats:', error);
    res.status(500).json({ message: 'Failed to get stats.' });
  }
});

/**
 * GET /api/complaints/all
 * Admin list all complaints with filtering, search and pagination
 */
router.get('/all', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (priority && priority !== 'All') {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { studentName: regex },
        { roomNumber: regex },
        { category: regex }
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate('userId', 'username fullName roomNumber mobileNumber email')
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (error) {
    console.error('Failed to fetch all complaints:', error);
    res.status(500).json({ message: 'Failed to fetch complaints.' });
  }
});

/**
 * GET /api/complaints/:id
 * Get single complaint by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'username fullName roomNumber mobileNumber email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Failed to fetch complaint detail:', error);
    res.status(500).json({ message: 'Failed to fetch complaint.' });
  }
});

/**
 * PATCH /api/complaints/:id/respond
 * Admin update status and submit response
 */
router.patch('/:id/respond', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, response, priority } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    let nextStatus = status;
    // If complaint is currently Pending and response is provided, automatically advance to In Progress
    if ((!nextStatus || nextStatus === 'Pending') && complaint.status === 'Pending' && response && response.trim()) {
      nextStatus = 'In Progress';
    }

    if (nextStatus && ['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(nextStatus)) {
      complaint.status = nextStatus;
      if (nextStatus === 'Resolved' && !complaint.resolvedAt) {
        complaint.resolvedAt = new Date();
      }
      if (nextStatus !== 'Resolved') {
        complaint.resolvedAt = null;
      }
    }

    if (priority && ['Low', 'Medium', 'High', 'Urgent'].includes(priority)) {
      complaint.priority = priority;
    }

    if (response !== undefined) {
      complaint.adminResponse = {
        response: response.trim(),
        respondedBy: req.user?.username || 'Hostel Warden / Admin',
        respondedAt: new Date()
      };
    }

    await complaint.save();

    res.json({
      message: 'Complaint updated successfully.',
      complaint
    });
  } catch (error) {
    console.error('Failed to respond to complaint:', error);
    res.status(500).json({ message: 'Failed to update complaint response.' });
  }
});

/**
 * DELETE /api/complaints/:id
 * Admin delete complaint
 */
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json({ message: 'Complaint deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete complaint:', error);
    res.status(500).json({ message: 'Failed to delete complaint.' });
  }
});

export default router;
