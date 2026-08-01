import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Document from '../models/Document.js';
import Upload from '../models/Upload.js';
import Attendance from '../models/Attendance.js';


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
  delete userData.tempPassword;
  delete userData.__v;
  return userData;
};

const getAdminUserData = (user) => {
  const userData = user.toObject();
  delete userData.password;
  delete userData.tempPassword;
  delete userData.__v;
  return userData;
};

const formatDate = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    const isAdmin = decoded?.role?.toString().toLowerCase() === 'admin' || decoded?.username?.toString().toLowerCase() === 'admin' || decoded?.userId === 'hardcoded-admin';
    if (!isAdmin) return res.status(403).json({ message: 'Admin access required.' });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
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

router.post('/add-user', adminAuth, async (req, res) => {
  try {
    const { username, password, roomNumber } = req.body;
    if (!username || !password || !roomNumber) {
      return res.status(400).json({ message: 'Username, password, and room number are required.' });
    }

    const normalizedUsername = username.trim();
    const normalizedRoom = roomNumber.trim();
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const roomConfig = process.env.ROOM_OVERVIEW || Array.from({ length: 20 }, (_, i) => `${i + 1}:4`).join(',');
    const rooms = roomConfig.split(',').map((item) => {
      const [roomNumberRaw, capacityRaw] = item.split(':').map((v) => v.trim());
      return {
        roomNumber: roomNumberRaw || '',
        capacity: Number(capacityRaw) || 4,
      };
    }).filter((item) => item.roomNumber);

    const selectedRoom = rooms.find((room) => String(room.roomNumber) === normalizedRoom);
    if (!selectedRoom) {
      return res.status(400).json({ message: 'Selected room is not valid.' });
    }

    const currentOccupancy = await User.countDocuments({ roomNumber: normalizedRoom });
    if (currentOccupancy >= selectedRoom.capacity) {
      return res.status(400).json({ message: 'Capacity full: selected room is already full.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username: normalizedUsername, password: hashedPassword, tempPassword: password, roomNumber: normalizedRoom });
    await user.save();

    res.status(201).json({
      message: 'User created',
      user: { id: user._id, username: user.username, roomNumber: user.roomNumber },
      tempPassword: password,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (ADMIN_USERNAME && ADMIN_PASSWORD && username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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
      'college_name',
      'stream',
      'department',
      'year',
      'address',
      'village',
      'taluka',
      'district',
      'mobileNumber',
      'fathersMobileNumber',
      'aadhaarNumber',
      'BankName',
      'bankBranch',
      'admissionDate',
      'accountNumber',
      'ifscCode',
    ];

    const profileData = profileFields.reduce((data, field) => {
      if (typeof req.body[field] !== 'undefined') {
        if (field === 'admissionDate') {
          const rawDate = req.body[field];
          if (!rawDate) {
            data[field] = null;
          } else {
            const dateValue = new Date(rawDate);
            if (!Number.isNaN(dateValue.getTime())) {
              data[field] = dateValue;
            }
          }
        } else {
          data[field] = req.body[field];
        }
      }
      return data;
    }, {});

    if (req.body.newPassword) {
      if (typeof req.body.newPassword !== 'string' || req.body.newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      const hashedNewPassword = await bcrypt.hash(req.body.newPassword, 10);
      profileData.password = hashedNewPassword;
    }

    const currentUser = await findAuthenticatedUser(req.user);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (req.file) {
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

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    const attendanceDocs = await Attendance.find({}).select('date students').lean();
    const attendanceByUsername = new Map();

    attendanceDocs.forEach((doc) => {
      const studentEntries = Array.isArray(doc.students) ? doc.students : [];
      studentEntries.forEach((entry) => {
        const username = String(entry.username || '').trim().toLowerCase();
        if (!username) return;
        if (!attendanceByUsername.has(username)) {
          attendanceByUsername.set(username, { presentDates: new Set(), markedDates: new Set() });
        }
        const attendanceSummary = attendanceByUsername.get(username);
        attendanceSummary.markedDates.add(doc.date);
        if (entry.status === 'Present') {
          attendanceSummary.presentDates.add(doc.date);
        }
      });
    });

    const publicUsers = users.map((user) => {
      const userData = getAdminUserData(user);
      const createdDate = formatDate(user.createdAt || new Date(0));
      const username = String(user.username || '').trim().toLowerCase();
      const attendanceSummary = attendanceByUsername.get(username) || { presentDates: new Set(), markedDates: new Set() };
      userData.presentDaysSinceCreated = [...attendanceSummary.presentDates].filter((date) => date >= createdDate).length;
      userData.totalAttendanceDaysSinceCreated = [...attendanceSummary.markedDates].filter((date) => date >= createdDate).length;
      return userData;
    });
    res.json({ users: publicUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/rooms-overview', adminAuth, async (req, res) => {
  try {

    const roomConfig = process.env.ROOM_OVERVIEW || Array.from({ length: 20 }, (_, i) => `${i + 1}:4`).join(',');
    const rooms = roomConfig.split(',').map((item) => {
      const [roomNumberRaw, capacityRaw] = item.split(':').map((v) => v.trim());
      const roomNumber = roomNumberRaw || '';
      const capacity = Number(capacityRaw) || 4;
      return { roomNumber, capacity };
    }).filter((item) => item.roomNumber);

    const users = await User.find().select('roomNumber');
    const occupancyByRoom = users.reduce((acc, user) => {
      const roomKey = String(user.roomNumber || '').trim();
      if (!roomKey) return acc;
      acc[roomKey] = (acc[roomKey] || 0) + 1;
      return acc;
    }, {});

    const overview = rooms.map(({ roomNumber, capacity }) => {
      const occupancy = occupancyByRoom[roomNumber] || 0;
      return {
        roomNumber,
        capacity,
        occupancy,
        available: Math.max(capacity - occupancy, 0),
        status: occupancy >= capacity ? 'alloted' : 'free',
      };
    });

    const totalRooms = overview.length;
    const totalCapacity = overview.reduce((sum, room) => sum + room.capacity, 0);
    const totalOccupied = overview.reduce((sum, room) => sum + room.occupancy, 0);
    const totalFree = totalCapacity - totalOccupied;

    res.json({ overview, totalRooms, totalCapacity, totalOccupied, totalFree });
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
    const tokenIsAdmin = req.user?.role?.toString().toLowerCase() === 'admin' || req.user?.username?.toString().toLowerCase() === 'admin' || req.user?.userId === 'hardcoded-admin';
    const userData = tokenIsAdmin ? getAdminUserData(user) : getPublicUserData(user);
    res.json({ user: userData });
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

    await Attendance.updateMany(
      {},
      {
        $pull: {
          students: {
            username: user.username
          }
        }
      }
    );

    // Remove upload submissions belonging to the deleted user
    await Upload.updateMany(
      { 'submissions.userId': req.params.id },
      { $pull: { submissions: { userId: req.params.id } } }
    );

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
