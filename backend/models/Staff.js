import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  position: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  imageUrl: { type: String, trim: true, default: '' },
  publicId: { type: String, trim: true, default: '' },
}, {
  timestamps: true,
});

export default mongoose.model('Staff', staffSchema);
