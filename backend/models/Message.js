import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const messageSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true
  },
  senderModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [reactionSchema],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    default: null
  },
  deletedByRole: {
    type: String,
    enum: ['owner', 'admin', null],
    default: null
  }
}, {
  timestamps: true
});

messageSchema.index({ channelId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
