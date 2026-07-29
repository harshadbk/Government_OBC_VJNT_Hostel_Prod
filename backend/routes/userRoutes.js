import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localStudentUploadDir = path.join(__dirname, '..', 'uploads', 'students');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'hms_students', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const hasCloudinaryConfig = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

const uploadToLocalStorage = async (req, file) => {
  await fs.mkdir(localStudentUploadDir, { recursive: true });

  const originalExtension = path.extname(file.originalname || '').toLowerCase();
  const mimeExtension = file.mimetype?.split('/')[1] ? `.${file.mimetype.split('/')[1]}` : '.jpg';
  const extension = originalExtension || mimeExtension;
  const safeUsername = String(req.user.username).replace(/[^a-z0-9_-]/gi, '_');
  const filename = `${safeUsername}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

  await fs.writeFile(path.join(localStudentUploadDir, filename), file.buffer);
  return `${req.protocol}://${req.get('host')}/uploads/students/${filename}`;
};

const uploadStudentPhoto = async (req, file) => {
  if (hasCloudinaryConfig()) {
    return uploadToCloudinary(file.buffer);
  }

  return uploadToLocalStorage(req, file);
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

router.post('/add-user', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const existingUser = await User.findById(username.trim());
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ _id: username.trim(), password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created', user: { username: user._id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await User.findById(username.trim());
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user._id },
      process.env.JWT_SECRET || 'your_super_secret_key_here',
      { expiresIn: '7d' }
    );

    const userData = user.toObject();
    userData.username = userData._id;
    delete userData.password;
    delete userData.__v;

    res.json({ message: 'Login successful', token, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.username).select('-password -__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const userData = user.toObject();
    userData.username = userData._id;
    res.json({ user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/profile', authMiddleware, upload.single('studentPhoto'), async (req, res) => {
  try {
    const profileFields = [
      'fullName',
      'rollNumber',
      'email',
      'phone',
      'department',
      'year',
      'hostelBlock',
      'roomNumber',
      'address',
      'village',
      'taluka',
      'district',
      'course',
      'classYear',
      'commonEntranceExam',
      'mobileNumber',
      'fathersMobileNumber',
      'aadhaarNumber',
      'aadhaarBankName',
      'bankBranch',
      'admissionDate',
      'accountNumber',
      'ifscCode',
    ];

    const profileData = profileFields.reduce((data, field) => {
      if (typeof req.body[field] !== 'undefined') {
        data[field] = req.body[field];
      }
      return data;
    }, {});

    if (req.file) {
      profileData.photoUrl = await uploadStudentPhoto(req, req.file);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.username,
      { $set: profileData },
      { new: true, runValidators: true, fields: '-password -__v' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userData = updatedUser.toObject();
    userData.username = userData._id;
    res.json({ message: 'Profile saved', user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
