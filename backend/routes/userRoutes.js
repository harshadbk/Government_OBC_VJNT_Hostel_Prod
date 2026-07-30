import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Document from '../models/Document.js';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const configureCloudinary = () => {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key    = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;

  const allPresent = [cloud_name, api_key, api_secret].every(
    (v) => v && !/your_|your-|replace|placeholder/i.test(v)
  );

  if (!allPresent) {
    throw new Error(
      'Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
    );
  }

  // Configure cloudinary here (at request time, after dotenv is loaded)
  cloudinary.config({ cloud_name, api_key, api_secret });
};

const uploadStudentPhoto = (buffer, filename, mimeType = 'image/jpeg') => {
  configureCloudinary();

  const isImage = mimeType?.startsWith('image/');
  const uploadOptions = {
    folder: 'hms_students',
    resource_type: 'image',
    public_id: filename,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  };

  if (!isImage) {
    uploadOptions.resource_type = 'auto';
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      console.log('Image uploaded to Cloudinary:', result.secure_url);
      resolve(result.secure_url);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const uploadDocumentToCloudinary = (buffer, filename, mimeType = 'application/octet-stream') => {
  configureCloudinary();

  const isPdf = mimeType?.includes('pdf');
  const uploadOptions = {
    folder: 'hms_documents',
    resource_type: 'auto',
    public_id: filename,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  };

  if (isPdf) {
    uploadOptions.transformation = [{ quality: 'auto' }];
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      console.log('Document uploaded to Cloudinary:', result.secure_url);
      resolve(result.secure_url);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Extracts the Cloudinary public_id from a secure_url.
 * Example URL: https://res.cloudinary.com/<cloud>/image/upload/v1234567890/hms_students/abc123.jpg
 * Returns: "hms_students/abc123"
 */
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    // Match everything after "/upload/v<version>/" (or "/upload/") up to (but not including) the file extension
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const deleteCloudinaryImage = async (photoUrl, resourceType = 'auto') => {
  const publicId = getCloudinaryPublicId(photoUrl);
  if (!publicId) return;
  try {
    configureCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Deleted old Cloudinary asset [${publicId}] (${resourceType}):`, result.result);
  } catch (err) {
    console.warn('Could not delete old Cloudinary asset:', err.message);
  }
};

const getPublicUserData = (user) => {
  const userData = user.toObject();
  delete userData.password;
  delete userData.__v;
  return userData;
};

const normalizeDocumentField = (fieldName) => {
  const normalizedField = fieldName?.replace(/Url$/, '');
  const fieldMap = {
    aadharCard: 'aadharCardUrl',
    aadharCardUrl: 'aadharCardUrl',
    casteCertificate: 'casteCertificateUrl',
    casteCertificateUrl: 'casteCertificateUrl',
    incomeCertificate: 'incomeCertificateUrl',
    incomeCertificateUrl: 'incomeCertificateUrl',
    domicileCertificate: 'domicileCertificateUrl',
    domicileCertificateUrl: 'domicileCertificateUrl',
    collegeAdmissionReceipt: 'collegeAdmissionReceiptUrl',
    collegeAdmissionReceiptUrl: 'collegeAdmissionReceiptUrl',
    bonafideCertificate: 'bonafideCertificateUrl',
    bonafideCertificateUrl: 'bonafideCertificateUrl',
    casteValidityCertificate: 'casteValidityCertificateUrl',
    casteValidityCertificateUrl: 'casteValidityCertificateUrl',
    previousYearMarksheet: 'previousYearMarksheetUrl',
    previousYearMarksheetUrl: 'previousYearMarksheetUrl',
  };

  return fieldMap[fieldName] || fieldMap[normalizedField] || fieldName;
};

const findAuthenticatedUser = async (tokenUser) => {
  if (tokenUser.userId && mongoose.isValidObjectId(tokenUser.userId)) {
    const user = await User.findById(tokenUser.userId).select('-password -__v');
    if (user) return user;
  }

  if (tokenUser.username) {
    return User.findOne({ username: tokenUser.username }).select('-password -__v');
  }

  return null;
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

    const normalizedUsername = username.trim();
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username: normalizedUsername, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User created', user: { id: user._id, username: user.username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── HARDCODED ADMIN CREDENTIALS (for testing only) ───────────────────────────
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@1234';
// ──────────────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Check hardcoded admin credentials first
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { userId: 'hardcoded-admin', username: ADMIN_USERNAME, role: 'admin' },
        process.env.JWT_SECRET || 'your_super_secret_key_here',
        { expiresIn: '7d' }
      );
      return res.json({
        message: 'Login successful',
        token,
        user: { _id: 'hardcoded-admin', username: ADMIN_USERNAME, role: 'admin' },
      });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
    };

    if (user.username?.trim().toLowerCase() === ADMIN_USERNAME) {
      tokenPayload.role = 'admin';
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your_super_secret_key_here',
      { expiresIn: '7d' }
    );

    const userData = getPublicUserData(user);
    if (tokenPayload.role === 'admin') {
      userData.role = 'admin';
    }

    res.json({ message: 'Login successful', token, user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await findAuthenticatedUser(req.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: getPublicUserData(user) });
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

    const currentUser = await findAuthenticatedUser(req.user);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (req.file) {
      // Delete the old Cloudinary image (if any) before uploading the new one
      if (currentUser.photoUrl) {
        await deleteCloudinaryImage(currentUser.photoUrl);
      }
      const uniquePhotoFilename = `${currentUser._id}_studentPhoto_${Date.now()}`;
      profileData.photoUrl = await uploadStudentPhoto(req.file.buffer, uniquePhotoFilename, req.file.mimetype);
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $set: profileData },
      { new: true, runValidators: true, fields: '-password -__v' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'Profile saved', user: getPublicUserData(updatedUser) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const publicUsers = users.map(getPublicUserData);
    res.json({ users: publicUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: getPublicUserData(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.photoUrl) {
      await deleteCloudinaryImage(user.photoUrl);
    }
    await User.findByIdAndDelete(req.params.id);
    // Also delete associated documents
    const doc = await Document.findOne({ userId: req.params.id });
    if (doc) {
      // In a real app we'd also delete the files from Cloudinary here
      await Document.findByIdAndDelete(doc._id);
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- Document Routes ---

router.get('/documents', authMiddleware, async (req, res) => {
  try {
    const currentUser = await findAuthenticatedUser(req.user);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    let doc = await Document.findOne({ userId: currentUser._id });
    if (!doc) {
      doc = new Document({
        email: currentUser.email || currentUser.username, // Fallback if no email
        userId: currentUser._id,
      });
      await doc.save();
    }
    
    const plainDoc = doc.toObject ? doc.toObject() : doc;
    res.json({ documents: plainDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/documents', authMiddleware, upload.any(), async (req, res) => {
  try {
    const currentUser = await findAuthenticatedUser(req.user);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let doc = await Document.findOne({ userId: currentUser._id });
    if (!doc) {
      doc = new Document({
        email: currentUser.email || currentUser.username,
        userId: currentUser._id,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No document file was provided.' });
    }

    // Process uploaded files
    for (const file of req.files) {
      const fieldName = normalizeDocumentField(file.fieldname);
      const uniqueFilename = `${currentUser._id}_${fieldName}_${Date.now()}`;

      if (doc[fieldName]) {
        await deleteCloudinaryImage(doc[fieldName], 'auto');
      }

      const url = await uploadDocumentToCloudinary(file.buffer, uniqueFilename, file.mimetype);
      doc[fieldName] = url;
    }

    await doc.save();
    const plainDoc = doc.toObject ? doc.toObject() : doc;
    res.json({ message: 'Documents updated successfully', documents: plainDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/users/:id/documents', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ userId: req.params.id });
    const plainDoc = doc ? (doc.toObject ? doc.toObject() : doc) : null;
    res.json({ documents: plainDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;