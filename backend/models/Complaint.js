import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Room Maintenance',
      'Electrical',
      'Plumbing',
      'Cleanliness & Hygiene',
      'Mess & Food',
      'Wi-Fi & Internet',
      'Security',
      'Other'
    ],
    default: 'Room Maintenance'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  imageUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
    default: 'Pending'
  },
  studentName: {
    type: String,
    trim: true,
    default: 'Anonymous Student'
  },
  studentEmail: {
    type: String,
    trim: true,
    default: ''
  },
  studentPhone: {
    type: String,
    trim: true,
    default: ''
  },
  roomNumber: {
    type: String,
    trim: true,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  adminResponse: {
    response: { type: String, default: '' },
    respondedBy: { type: String, default: '' },
    respondedAt: { type: Date, default: null }
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
