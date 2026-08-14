import mongoose from 'mongoose';

const messageReportSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['Spam', 'Harassment', 'Abusive content', 'Inappropriate content', 'Misleading information', 'Other'],
    required: true
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['Pending', 'Reviewed', 'Dismissed', 'Action Taken'],
    default: 'Pending',
    index: true
  },
  reviewedBy: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('MessageReport', messageReportSchema);
