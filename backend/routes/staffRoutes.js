import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import jwt from 'jsonwebtoken';
import Staff from '../models/Staff.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  return match ? match[1] : null;
};

const deleteCloudinaryAsset = async (url) => {
  const publicId = getCloudinaryPublicId(url);
  if (!publicId) return;
  try {
    configureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn('Cloudinary delete error:', err.message);
  }
};

const uploadImageToCloudinary = async (buffer, filename) => {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'hms_staff', resource_type: 'image', public_id: filename, transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 }).lean();
    res.json({ staff });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, position, email, phone } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    let imageUrl = '';
    let publicId = '';

    if (req.file) {
      const uploadResult = await uploadImageToCloudinary(req.file.buffer, `staff_${Date.now()}`);
      imageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    const staff = await Staff.create({
      name: name.trim(),
      position: position?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      imageUrl,
      publicId,
    });

    res.status(201).json({ message: 'Staff member created', staff });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, position, email, phone } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff member not found.' });

    if (req.file) {
      if (staff.publicId) await deleteCloudinaryAsset(staff.imageUrl);
      const uploadResult = await uploadImageToCloudinary(req.file.buffer, `staff_${Date.now()}`);
      staff.imageUrl = uploadResult.secure_url;
      staff.publicId = uploadResult.public_id;
    }

    staff.name = name?.trim() || staff.name;
    staff.position = position?.trim() || staff.position;
    staff.email = email?.trim() || staff.email;
    staff.phone = phone?.trim() || staff.phone;

    await staff.save();
    res.json({ message: 'Staff member updated', staff });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff member not found.' });
    if (staff.publicId) await deleteCloudinaryAsset(staff.imageUrl);
    await staff.deleteOne();
    res.json({ message: 'Staff member deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
