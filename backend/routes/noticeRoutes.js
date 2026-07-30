import express from 'express';
import jwt from 'jsonwebtoken';
import Notice from '../models/Notice.js';

const router = express.Router();

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    const isAdmin =
      decoded?.role?.toString().toLowerCase() === 'admin' ||
      decoded?.username?.toString().toLowerCase() === 'admin' ||
      decoded?.userId === 'hardcoded-admin' ||
      decoded?.userId === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const notices = await Notice.find().sort({ createdAt: -1 }).limit(limit).lean();

    // Count notices uploaded in the last 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentCount = await Notice.countDocuments({ createdAt: { $gte: threeDaysAgo } });

    res.json({ notices, recentCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── GET /api/notices/all  (admin – all notices, paginated) ───────────────────
router.get('/all', adminAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [notices, total] = await Promise.all([
      Notice.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notice.countDocuments(),
    ]);

    res.json({ notices, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, content, severity } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      severity: severity || 'low'
    });

    res.status(201).json({ message: 'Notice created', notice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { title, content, severity } = req.body;
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { title: title?.trim(), content: content?.trim(), severity },
      { new: true, runValidators: true }
    );
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    res.json({ message: 'Notice updated', notice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    res.json({ message: 'Notice deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
