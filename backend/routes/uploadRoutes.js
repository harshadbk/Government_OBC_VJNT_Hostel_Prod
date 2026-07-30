import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Upload from '../models/Upload.js';
import User from '../models/User.js';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware helpers (reuse auth from userRoutes by importing?)
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing authorization header.' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing authorization header.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    const isAdmin = decoded?.role?.toString().toLowerCase() === 'admin' || decoded?.username?.toString().toLowerCase() === 'admin' || decoded?.userId === 'hardcoded-admin';
    if (!isAdmin) return res.status(403).json({ message: 'Admin access required.' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

router.get('/', async (req, res) => {
  let currentUser = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      currentUser = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'your_super_secret_key_here');
    } catch (err) {
      currentUser = null;
    }
  }

  try {
    const uploads = await Upload.find().sort({ createdAt: -1 }).limit(10).lean();
    if (!currentUser) return res.json({ uploads });

    const userId = currentUser.userId || currentUser._id || currentUser.id || currentUser.username;
    const enhanced = uploads.map((upload) => {
      const submission = upload.submissions?.find((s) => s.userId === userId.toString() || s.username === currentUser.username);
      return {
        ...upload,
        submitted: Boolean(submission),
        submission: submission || null,
      };
    });
    const pendingCount = enhanced.filter((upload) => !upload.submitted).length;
    return res.json({ uploads: enhanced, pendingCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const newUpload = await Upload.create({ title: title.trim(), description: description || '', dueDate: dueDate ? new Date(dueDate) : null, requestedBy: req.user.username || 'admin' });
    res.status(201).json({ message: 'Upload request created', upload: newUpload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/uploads/all - admin listing with submissions
router.get('/all', adminAuth, async (req, res) => {
  try {
    const uploads = await Upload.find().sort({ createdAt: -1 }).lean();
    res.json({ uploads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/uploads/:id - public details; admin sees submissions and student status
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const uploadDoc = await Upload.findById(req.params.id).lean();
    if (!uploadDoc) return res.status(404).json({ message: 'Upload not found.' });
    const isAdmin = req.user?.role?.toString().toLowerCase() === 'admin' || req.user?.username?.toString().toLowerCase() === 'admin' || req.user?.userId === 'hardcoded-admin';
    if (!isAdmin) {
      // for normal users, only return their submission (if any)
      const userSubmission = uploadDoc.submissions?.find((s) => s.userId === (req.user.userId || req.user._id || req.user.id) || s.username === req.user.username);
      return res.json({ upload: { ...uploadDoc, submissions: userSubmission ? [userSubmission] : [] } });
    }

    const users = await User.find().select('username fullName email _id').lean();
    const submissionMap = new Map();
    uploadDoc.submissions?.forEach((submission) => {
      if (submission.userId) submissionMap.set(submission.userId.toString(), submission);
      if (submission.username) submissionMap.set(submission.username, submission);
    });

    const submitted = [];
    const pending = [];
    const matchedKeys = new Set();

    users.forEach((user) => {
      const keyById = user._id?.toString();
      const keyByUsername = user.username;
      const submission = submissionMap.get(keyById) || submissionMap.get(keyByUsername);
      if (submission) {
        matchedKeys.add(submission.userId?.toString() || submission.username);
        submitted.push({
          userId: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          fileUrl: submission.fileUrl,
          publicId: submission.publicId,
          uploadedAt: submission.uploadedAt,
        });
      } else {
        pending.push({
          userId: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
        });
      }
    });

    const otherSubmissions = uploadDoc.submissions?.filter((submission) => {
      const key = submission.userId?.toString() || submission.username;
      return key && !matchedKeys.has(key);
    }) || [];

    res.json({
      upload: uploadDoc,
      studentStatus: {
        submitted,
        pending,
        others: otherSubmissions,
      },
      summary: {
        totalStudents: users.length,
        submittedCount: submitted.length,
        remainingCount: pending.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/uploads/:id/submit - authenticated student uploads a file for the request
router.post('/:id/submit', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const uploadDoc = await Upload.findById(req.params.id);
    if (!uploadDoc) return res.status(404).json({ message: 'Upload request not found.' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    // prefer Cloudinary upload when credentials are present
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    let publicUrl = null;
    let publicId = null;

    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
      });

      // helper to destroy previous resource
      const destroyResource = (publicId) => new Promise((resolve) => {
        if (!publicId) return resolve();
        try {
          cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }, (err, result) => {
            if (err) console.warn('Cloudinary destroy error', err);
            resolve(result);
          });
        } catch (e) {
          console.warn('Cloudinary destroy exception', e);
          resolve();
        }
      });

      // upload buffer via stream
      const streamUpload = (buffer, folder) => new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder: folder || 'hms_uploads', resource_type: 'auto' }, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });

      try {
        // if there is an existing submission by this user, delete its cloudinary resource
        const existing = uploadDoc.submissions?.find(s => s.userId === (req.user.userId || req.user._id || req.user.id || (req.user.username || '')));
        if (existing && existing.publicId) await destroyResource(existing.publicId);

        const result = await streamUpload(req.file.buffer, 'hms_uploads');
        publicUrl = result.secure_url;
        publicId = result.public_id;
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
        return res.status(500).json({ message: 'Cloudinary upload failed', detail: cloudErr.message || cloudErr.toString() });
      }
    } else {
      // fallback to local disk storage
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const timestamp = Date.now();
      const original = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filename = `${timestamp}_${original}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      publicUrl = `/uploads/${filename}`;
    }

    const username = req.user.username || req.user.email || req.user.userId || 'unknown';
    const userId = req.user.userId || req.user._id || req.user.id || username;

    // remove previous submission by same user if exists
    uploadDoc.submissions = uploadDoc.submissions.filter((s) => s.userId !== userId.toString());
    uploadDoc.submissions.push({ userId: userId.toString(), username: username.toString(), fileUrl: publicUrl, publicId: publicId || null, uploadedAt: new Date() });
    await uploadDoc.save();

    res.json({ message: 'File uploaded', fileUrl: publicUrl, upload: uploadDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
