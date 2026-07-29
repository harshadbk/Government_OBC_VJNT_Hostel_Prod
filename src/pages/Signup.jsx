import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUploadCloud, FiUser, FiMail, FiPhone, FiLock, FiMapPin, FiHome, FiBookOpen } from 'react-icons/fi';
import InputField from '../components/InputField';
import Button from '../components/Button';
import '../css/Login.css';

const initialState = {
  fullName: '',
  rollNumber: '',
  email: '',
  phone: '',
  department: '',
  year: '',
  gender: '',
  password: '',
  confirmPassword: '',
  hostelBlock: '',
  roomNumber: '',
  address: ''
};

function Signup({ onSignup }) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const passwordStrength = useMemo(() => {
    const value = formData.password;
    if (value.length >= 10 && /[A-Z]/.test(value) && /[0-9]/.test(value)) return { label: 'Strong', className: 'strong' };
    if (value.length >= 6) return { label: 'Medium', className: 'medium' };
    return { label: 'Weak', className: '' };
  }, [formData.password]);

  const validate = () => {
    const nextErrors = {};
    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!formData.rollNumber.trim()) nextErrors.rollNumber = 'Roll number is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email';
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required';
    else if (!/^\+?[0-9\s-]{7,15}$/.test(formData.phone)) nextErrors.phone = 'Enter a valid phone number';
    if (!formData.department.trim()) nextErrors.department = 'Department is required';
    if (!formData.year.trim()) nextErrors.year = 'Year is required';
    if (!formData.gender.trim()) nextErrors.gender = 'Gender is required';
    if (!formData.password) nextErrors.password = 'Password is required';
    else if (formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) nextErrors.confirmPassword = 'Confirm password is required';
    else if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords must match';
    if (!formData.hostelBlock.trim()) nextErrors.hostelBlock = 'Hostel block is required';
    if (!formData.roomNumber.trim()) nextErrors.roomNumber = 'Room number is required';
    if (!formData.address.trim()) nextErrors.address = 'Address is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      onSignup({ ...formData }, imagePreview);
      setLoading(false);
    }, 900);
  };

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero glass-card">
          <h2>Create a premium student account</h2>
          <p>Build a strong profile for hostel access and student life in just a few comfortable steps.</p>
          <div className="profile-upload">
            <label className="upload-area" htmlFor="avatarUpload">
              <FiUploadCloud size={24} />
              <div>Drag or click to upload profile picture</div>
            </label>
            <input id="avatarUpload" type="file" accept="image/*" onChange={handleImageUpload} hidden />
            {imagePreview ? <img src={imagePreview} alt="Preview" className="preview-image" /> : null}
          </div>
        </div>
        <div className="auth-card glass-card">
          <h3>Create account</h3>
          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <div className="select-grid">
              <InputField label="Full Name" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} error={errors.fullName} placeholder="Enter full name" icon={<FiUser />} required />
              <InputField label="Roll Number" id="rollNumber" name="rollNumber" value={formData.rollNumber} onChange={handleChange} error={errors.rollNumber} placeholder="eg. CSE-202301" icon={<FiBookOpen />} required />
            </div>
            <div className="select-grid">
              <InputField label="College Email" id="email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="Enter college email" icon={<FiMail />} required />
              <InputField label="Phone Number" id="phone" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} placeholder="Phone number" icon={<FiPhone />} required />
            </div>
            <div className="select-grid">
              <InputField label="Department" id="department" name="department" value={formData.department} onChange={handleChange} error={errors.department} placeholder="Department" icon={<FiBookOpen />} required />
              <InputField label="Year" id="year" name="year" value={formData.year} onChange={handleChange} error={errors.year} placeholder="Year" icon={<FiHome />} required />
            </div>
            <div className="select-grid">
              <InputField label="Gender" id="gender" name="gender" value={formData.gender} onChange={handleChange} error={errors.gender} placeholder="Gender" icon={<FiUser />} required />
              <InputField label="Hostel Block" id="hostelBlock" name="hostelBlock" value={formData.hostelBlock} onChange={handleChange} error={errors.hostelBlock} placeholder="Hostel block" icon={<FiHome />} required />
            </div>
            <InputField label="Room Number" id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} error={errors.roomNumber} placeholder="Room number" icon={<FiHome />} required />
            <InputField label="Address" id="address" name="address" value={formData.address} onChange={handleChange} error={errors.address} placeholder="Residential address" icon={<FiMapPin />} textarea required />
            <div className="select-grid">
              <InputField label="Password" id="password" name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} placeholder="Create a password" icon={<FiLock />} required />
              <InputField label="Confirm Password" id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} placeholder="Repeat password" icon={<FiLock />} required />
            </div>
            <div className={`password-strength ${passwordStrength.className}`}>Password strength: {passwordStrength.label}</div>
            <div className="form-row">
              <Button label="Create Account" variant="primary" type="submit" loading={loading} />
              <Link to="/">
                <Button label="Cancel" variant="secondary" />
              </Link>
            </div>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>
    </section>
  );
}

export default Signup;
