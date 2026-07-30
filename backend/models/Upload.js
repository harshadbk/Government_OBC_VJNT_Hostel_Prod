import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  publicId: { type: String },
});

const uploadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  dueDate: { type: Date },
  requestedBy: { type: String, default: 'admin' },
  submissions: { type: [submissionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Upload', uploadSchema);
