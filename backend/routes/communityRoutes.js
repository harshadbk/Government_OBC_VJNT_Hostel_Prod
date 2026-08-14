import express from 'express';
import mongoose from 'mongoose';
import authMiddleware, { optionalAuth, adminAuth } from '../middleware/authMiddleware.js';
import Message from '../models/Message.js';
import MessageReport from '../models/MessageReport.js';
import User from '../models/User.js';
import { getIO } from '../socket/socketHandler.js';

const router = express.Router();

const STATIC_CHANNELS = [
  {
    _id: 'announcement',
    name: 'Announcements',
    type: 'announcement',
    description: 'Official notice board broadcast by hostel administration.',
    isDefault: true,
    isActive: true
  },
  {
    _id: 'general',
    name: 'General',
    type: 'general',
    description: 'General discussion channel for verified hostel residents.',
    isDefault: true,
    isActive: true
  }
];

// Helper to sanitize message payload for response
const formatMessage = (msg) => {
  const obj = msg.toObject ? msg.toObject() : msg;
  let content = obj.content;
  if (obj.isDeleted) {
    if (obj.deletedByRole === 'admin') {
      content = 'This message was removed by Admin for violating community guidelines.';
    } else if (obj.deletedByRole === 'owner') {
      const senderName = obj.senderId?.fullName || obj.senderId?.username || 'User';
      content = `${senderName}'s message was deleted by ${senderName}`;
    } else {
      content = 'This message was deleted.';
    }
  }

  const rawCh = (obj.channel || obj.channelId || 'general').toString().toLowerCase();
  const channelName = rawCh.includes('announc') || rawCh === '6a7f42c37931c1185207e2ec' ? 'announcement' : 'general';

  return {
    _id: obj._id,
    channelId: channelName,
    channel: channelName,
    senderId: obj.senderId,
    senderModel: obj.senderModel || 'User',
    content,
    replyTo: obj.replyTo,
    reactions: obj.reactions || [],
    isEdited: obj.isEdited || false,
    isDeleted: obj.isDeleted || false,
    deletedAt: obj.deletedAt || null,
    deletedBy: obj.deletedBy || null,
    deletedByRole: obj.deletedByRole || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

// ==========================================
// 1. GET ALL CHANNELS (Public / Optional Auth)
// ==========================================
router.get('/channels', optionalAuth, async (req, res) => {
  res.json({ success: true, channels: STATIC_CHANNELS });
});

// ==========================================
// 2. GET MESSAGES FOR A CHANNEL (Public / Optional Auth)
// ==========================================
router.get('/channels/:channelId/messages', optionalAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, limit = 50 } = req.query;

    const reqChStr = (channelId || '').toLowerCase();
    const isAnnouncementReq = reqChStr === 'announcement' || reqChStr === '6a7f42c37931c1185207e2ec' || reqChStr.includes('announc');
    const targetChannel = isAnnouncementReq ? 'announcement' : 'general';

    const query = {
      $or: [
        { channel: new RegExp(`^${targetChannel}$`, 'i') },
        { channelId: new RegExp(`^${targetChannel}$`, 'i') },
        { channelId: new RegExp(`^${channelId}$`, 'i') }
      ]
    };

    if (!isAnnouncementReq) {
      query.$or.push({ channel: { $exists: false } });
      query.$or.push({ channel: null });
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate({
        path: 'senderId',
        select: 'fullName username roomNumber photoUrl role',
      })
      .populate({
        path: 'replyTo',
        select: 'content senderId isDeleted',
        populate: {
          path: 'senderId',
          select: 'fullName username'
        }
      })
      .populate({
        path: 'reactions.users',
        select: 'fullName username'
      });

    // Return chronological order (oldest first)
    const reversed = messages.reverse().map(formatMessage);
    res.json({ success: true, messages: reversed });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages.', error: error.message });
  }
});

// ==========================================
// 3. SEND MESSAGE IN A CHANNEL
// ==========================================
router.post('/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, replyTo } = req.body;

    const reqChStr = (channelId || '').toLowerCase();
    const channelName = reqChStr.includes('announc') ? 'announcement' : 'general';

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 2000) {
      return res.status(400).json({ message: 'Message exceeds maximum length of 2000 characters.' });
    }

    // Role Enforcement for Announcements Channel
    const isUserAdmin = req.user?.role?.toString().toLowerCase() === 'admin' ||
                        req.user?.username?.toString().toLowerCase() === 'admin' ||
                        req.user?.userId === 'hardcoded-admin';

    if (channelName === 'announcement' && !isUserAdmin) {
      return res.status(403).json({ message: 'Only hostel administration can post in the Announcements channel.' });
    }

    let validReplyTo = null;
    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      const replyMsg = await Message.findById(replyTo);
      if (replyMsg) validReplyTo = replyMsg._id;
    }

    const senderModel = isUserAdmin ? 'Admin' : 'User';
    let senderId = req.user.userId || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      if (isUserAdmin) {
        senderId = new mongoose.Types.ObjectId();
      } else {
        return res.status(400).json({ message: 'Invalid sender ID.' });
      }
    }

    const newMessage = new Message({
      channel: channelName,
      channelId: channelName,
      senderId,
      senderModel,
      content: trimmedContent,
      replyTo: validReplyTo,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate({
        path: 'senderId',
        select: 'fullName username roomNumber photoUrl role',
      })
      .populate({
        path: 'replyTo',
        select: 'content senderId isDeleted',
        populate: {
          path: 'senderId',
          select: 'fullName username'
        }
      })
      .populate({
        path: 'reactions.users',
        select: 'fullName username'
      });

    const formatted = formatMessage(populatedMessage);

    // Emit Socket event to room
    try {
      const io = getIO();
      io.to(channelName).emit('message:receive', formatted);
    } catch (e) {
      console.warn('Socket emit failed:', e.message);
    }

    res.status(201).json({ success: true, message: formatted });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message.', error: error.message });
  }
});

// ==========================================
// 4. EDIT A MESSAGE
// ==========================================
router.put('/messages/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid message ID.' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content cannot be empty.' });
    }

    const message = await Message.findById(id);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found or already deleted.' });
    }

    const currentUserId = (req.user.userId || req.user._id)?.toString();
    const isUserAdmin = req.user?.role?.toString().toLowerCase() === 'admin' ||
                        req.user?.username?.toString().toLowerCase() === 'admin';

    if (!isUserAdmin && message.senderId.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate({ path: 'senderId', select: 'fullName username roomNumber photoUrl role' })
      .populate({ path: 'replyTo', select: 'content senderId isDeleted', populate: { path: 'senderId', select: 'fullName username' } })
      .populate({ path: 'reactions.users', select: 'fullName username' });

    const formatted = formatMessage(populated);
    const room = (message.channel || 'general').toLowerCase();

    try {
      const io = getIO();
      io.to(room).emit('message:update', formatted);
    } catch (e) {}

    res.json({ success: true, message: formatted });
  } catch (error) {
    res.status(500).json({ message: 'Error updating message.', error: error.message });
  }
});

// ==========================================
// 5. DELETE A MESSAGE (Soft Delete)
// ==========================================
router.delete('/messages/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid message ID.' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const currentUserId = (req.user.userId || req.user._id)?.toString();
    const isUserAdmin = req.user?.role?.toString().toLowerCase() === 'admin' ||
                        req.user?.username?.toString().toLowerCase() === 'admin';

    if (!isUserAdmin && message.senderId.toString() !== currentUserId) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.userId || req.user._id;
    message.deletedByRole = isUserAdmin ? 'admin' : 'owner';
    const senderName = message.senderId?.fullName || message.senderId?.username || 'User';
    message.content = isUserAdmin
      ? 'This message was removed by Admin for violating community guidelines.'
      : `${senderName}'s message was deleted by ${senderName}`;
    await message.save();

    const formatted = formatMessage(message);
    const room = (message.channel || 'general').toLowerCase();

    try {
      const io = getIO();
      io.to(room).emit('message:delete', { messageId: id, channelId: room });
    } catch (e) {}

    res.json({ success: true, message: formatted });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message.', error: error.message });
  }
});

// ==========================================
// 6. TOGGLE REACTION ON A MESSAGE
// ==========================================
router.post('/messages/:id/react', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid message ID.' });
    }

    const message = await Message.findById(id);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const userId = req.user.userId || req.user._id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID for reaction.' });
    }

    let reactionObj = message.reactions.find((r) => r.emoji === emoji);

    if (!reactionObj) {
      message.reactions.push({ emoji, users: [userId] });
    } else {
      const userIndex = reactionObj.users.findIndex((u) => u.toString() === userId.toString());
      if (userIndex > -1) {
        reactionObj.users.splice(userIndex, 1);
        if (reactionObj.users.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        reactionObj.users.push(userId);
      }
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate({ path: 'senderId', select: 'fullName username roomNumber photoUrl role' })
      .populate({ path: 'replyTo', select: 'content senderId isDeleted', populate: { path: 'senderId', select: 'fullName username' } })
      .populate({ path: 'reactions.users', select: 'fullName username' });

    const formatted = formatMessage(populated);
    const room = (message.channel || 'general').toLowerCase();

    try {
      const io = getIO();
      io.to(room).emit('message:react', formatted);
    } catch (e) {}

    res.json({ success: true, message: formatted });
  } catch (error) {
    res.status(500).json({ message: 'Error handling reaction.', error: error.message });
  }
});

// ==========================================
// 7. REPORT A MESSAGE (General Channel)
// ==========================================
router.post('/messages/:id/report', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid message ID.' });
    }

    const message = await Message.findById(id);
    if (!message || message.isDeleted) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    const reportedBy = req.user.userId || req.user._id;

    const newReport = new MessageReport({
      messageId: id,
      reportedBy,
      reason: reason || 'Other',
      description: description ? description.trim() : ''
    });

    await newReport.save();
    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting report.', error: error.message });
  }
});

// ==========================================
// 8. ADMIN GET ALL REPORTS
// ==========================================
router.get('/admin/reports', authMiddleware, adminAuth, async (req, res) => {
  try {
    const reports = await MessageReport.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'messageId',
        populate: { path: 'senderId', select: 'fullName username' }
      })
      .populate({ path: 'reportedBy', select: 'fullName username' });

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports.', error: error.message });
  }
});

// ==========================================
// 9. ADMIN UPDATE REPORT STATUS
// ==========================================
router.put('/admin/reports/:id', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID.' });
    }

    const report = await MessageReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    report.status = status || report.status;
    report.reviewedBy = req.user.username || 'Admin';
    report.reviewedAt = new Date();
    await report.save();

    if (action === 'delete_message' && report.messageId) {
      const msg = await Message.findById(report.messageId).populate('senderId', 'fullName username');
      if (msg && !msg.isDeleted) {
        msg.isDeleted = true;
        msg.deletedAt = new Date();
        msg.deletedByRole = 'admin';
        msg.content = 'This message was removed by Admin for violating community guidelines.';
        await msg.save();

        const room = (msg.channel || 'general').toLowerCase();
        try {
          const io = getIO();
          io.to(room).emit('message:delete', { messageId: msg._id, channelId: room });
        } catch (e) {}
      }
    }

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ message: 'Error updating report.', error: error.message });
  }
});

export default router;
