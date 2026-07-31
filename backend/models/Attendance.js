import mongoose from 'mongoose';

const studentStatusSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  roomNumber: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    required: true
  }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    trim: true
  }, // Format: YYYY-MM-DD
  students: {
    type: [studentStatusSchema],
    default: []
  },
  markedBy: {
    type: String,
    default: 'admin'
  },
  firstSavedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Prevent duplicate attendance records for the same date
attendanceSchema.index({ date: 1 }, { unique: true });
// Performance index queries
attendanceSchema.index({ date: 1 });

export default mongoose.model('Attendance', attendanceSchema);
