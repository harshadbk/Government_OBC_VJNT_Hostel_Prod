import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  roomNumber: { 
    type: String, 
    required: true,
    trim: true 
  },
  date: { 
    type: String, 
    required: true, 
    trim: true 
  }, // Format: YYYY-MM-DD
  status: { 
    type: String, 
    enum: ['Present', 'Absent'], 
    required: true 
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

// Prevent duplicate attendance records for the same student on the same date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
// Performance index queries
attendanceSchema.index({ roomNumber: 1, date: 1 });
attendanceSchema.index({ date: 1 });

export default mongoose.model('Attendance', attendanceSchema);
