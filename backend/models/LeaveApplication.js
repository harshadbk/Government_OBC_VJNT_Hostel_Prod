import mongoose from 'mongoose';

const leaveApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    trim: true,
    default: ''
  },
  fullName: {
    type: String,
    trim: true,
    required: true
  },
  reason: {
    type: String,
    trim: true,
    required: true
  },
  startDate: {
    type: String,
    trim: true,
    required: true
  },
  endDate: {
    type: String,
    trim: true,
    required: true
  },
  mobileNumber: {
    type: String,
    trim: true,
    default: ''
  },
  attachmentUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  comebackMarked: {
    type: Boolean,
    default: false
  },
  comebackDate: {
    type: String,
    trim: true,
    default: ''
  },
  comebackMarkedAt: {
    type: Date,
    default: null
  },
  adminNote: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.model('LeaveApplication', leaveApplicationSchema);
