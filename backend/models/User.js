import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  rollNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  department: { type: String, default: '' },
  year: { type: String, default: '' },
  hostelBlock: { type: String, default: '' },
  roomNumber: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  fullName: { type: String, default: '' },
  address: { type: String, default: '' },
  village: { type: String, default: '' },
  taluka: { type: String, default: '' },
  district: { type: String, default: '' },
  course: { type: String, default: '' },
  classYear: { type: String, default: '' },
  commonEntranceExam: { type: String, default: '' },
  mobileNumber: { type: String, default: '' },
  fathersMobileNumber: { type: String, default: '' },
  aadhaarNumber: { type: String, default: '' },
  aadhaarBankName: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  admissionDate: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, {
  id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.virtual('username').get(function() {
  return this._id;
});

export default mongoose.model('User', userSchema);
