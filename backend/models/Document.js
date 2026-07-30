import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  aadharCardUrl: { type: String, default: '' },
  casteCertificateUrl: { type: String, default: '' },
  incomeCertificateUrl: { type: String, default: '' },
  domicileCertificateUrl: { type: String, default: '' },
  collegeAdmissionReceiptUrl: { type: String, default: '' },
  bonafideCertificateUrl: { type: String, default: '' },
  casteValidityCertificateUrl: { type: String, default: '' },
  previousYearMarksheetUrl: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

export default mongoose.model('Document', documentSchema);
