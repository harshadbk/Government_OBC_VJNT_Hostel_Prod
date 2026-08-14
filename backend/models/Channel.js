import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['announcement', 'general'], required: true },
  isDefault: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, default: 'system' }
}, {
  timestamps: true
});

export default mongoose.model('Channel', channelSchema);
