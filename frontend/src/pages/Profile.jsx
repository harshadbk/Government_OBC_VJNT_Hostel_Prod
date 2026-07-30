import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiSave, FiEdit3, FiXCircle, FiUser, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import '../css/Profile.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Profile({ user, profileImage, onProfileUpdate, onProfileImageChange, token }) {
  const [editable, setEditable] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    rollNumber: user?.rollNumber || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    year: user?.year || '',
    hostelBlock: user?.hostelBlock || '',
    roomNumber: user?.roomNumber || '',
    address: user?.address || '',
    village: user?.village || '',
    taluka: user?.taluka || '',
    district: user?.district || '',
    course: user?.course || '',
    classYear: user?.classYear || '',
    commonEntranceExam: user?.commonEntranceExam || '',
    mobileNumber: user?.mobileNumber || '',
    fathersMobileNumber: user?.fathersMobileNumber || '',
    aadhaarNumber: user?.aadhaarNumber || '',
    aadhaarBankName: user?.aadhaarBankName || '',
    bankBranch: user?.bankBranch || '',
    admissionDate: user?.admissionDate || '',
    accountNumber: user?.accountNumber || '',
    ifscCode: user?.ifscCode || ''
  });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(profileImage || '');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!token) return;
      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          onProfileUpdate(data.user, data.user.photoUrl || '');
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [token, onProfileUpdate]);

  useEffect(() => {
    setFormData({
      fullName: user?.fullName || '',
      rollNumber: user?.rollNumber || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      year: user?.year || '',
      hostelBlock: user?.hostelBlock || '',
      roomNumber: user?.roomNumber || '',
      address: user?.address || '',
      village: user?.village || '',
      taluka: user?.taluka || '',
      district: user?.district || '',
      course: user?.course || '',
      classYear: user?.classYear || '',
      commonEntranceExam: user?.commonEntranceExam || '',
      mobileNumber: user?.mobileNumber || '',
      fathersMobileNumber: user?.fathersMobileNumber || '',
      aadhaarNumber: user?.aadhaarNumber || '',
      aadhaarBankName: user?.aadhaarBankName || '',
      bankBranch: user?.bankBranch || '',
      admissionDate: user?.admissionDate || '',
      accountNumber: user?.accountNumber || '',
      ifscCode: user?.ifscCode || ''
    });
    setPreview(profileImage || '');
  }, [user, profileImage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setMessage('');
    setMessageType('');
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.fullName.trim()) nextErrors.fullName = 'Name is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email';
    if (!formData.phone.trim()) nextErrors.phone = 'Phone is required';
    else if (!/^\+?[0-9\s-]{7,15}$/.test(formData.phone)) nextErrors.phone = 'Enter a valid phone number';
    if (!formData.department.trim()) nextErrors.department = 'Department is required';
    if (!formData.year.trim()) nextErrors.year = 'Year is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setMessage('Please fix the highlighted fields.');
      setMessageType('error');
      return;
    }
    if (!token) {
      setMessage('Authentication token is missing. Please log in again.');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value || '');
      });

      if (selectedPhoto) {
        payload.append('studentPhoto', selectedPhoto);
      }

      const response = await fetch(`${apiBaseUrl}/api/admin/profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Save failed', data);
        setMessage(data.message || 'Unable to save profile.');
        setMessageType('error');
        return;
      }

      onProfileUpdate(data.user, data.user.photoUrl || preview);
      setSelectedPhoto(null);
      setMessage('Profile saved successfully.');
      setMessageType('success');
      setEditable(false);
    } catch (error) {
      console.error('Save exception', error);
      setMessage('Unable to save profile. Please try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setSelectedPhoto(file);
    setPreview(objectUrl);
    onProfileImageChange(objectUrl);
    setMessage('');
    setMessageType('');
  };

  const handleEditToggle = () => {
    if (editable) {
      setPreview(profileImage || '');
      onProfileImageChange(profileImage || '');
      setSelectedPhoto(null);
      setErrors({});
      setMessage('');
      setMessageType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setEditable((prev) => !prev);
  };

  return (
    <div className="profile-page">
      <section className="profile-hero glass-card">
        <div className="profile-avatar-wrap">
          <div className="avatar-shell">
            {preview ? <img src={preview} alt="Profile" className="profile-avatar" /> : <div className="profile-fallback">{user?.fullName?.[0] || 'S'}</div>}
          </div>
          <div className="profile-actions">
            <label className="button secondary">
              <FiCamera /> Change Picture
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
            </label>
            <Button label={editable ? 'Cancel' : 'Edit Profile'} variant="primary" onClick={handleEditToggle} icon={editable ? <FiXCircle /> : <FiEdit3 />} />
          </div>
        </div>
        <div className="profile-info">
          <ProfileCard user={user} profileImage={preview} />
          {editable ? (
            <div className="profile-form">
              <InputField label="Full Name" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} error={errors.fullName} icon={<FiUser />} required />
              <InputField label="Roll Number" id="rollNumber" name="rollNumber" value={formData.rollNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Department" id="department" name="department" value={formData.department} onChange={handleChange} error={errors.department} icon={<FiUser />} required />
              <InputField label="Year" id="year" name="year" value={formData.year} onChange={handleChange} error={errors.year} icon={<FiUser />} required />
              <InputField label="Email" id="email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} icon={<FiMail />} required />
              <InputField label="Phone" id="phone" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} icon={<FiPhone />} required />
              <InputField label="Mobile Number" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} icon={<FiPhone />} />
              <InputField label="Father's Mobile Number" id="fathersMobileNumber" name="fathersMobileNumber" value={formData.fathersMobileNumber} onChange={handleChange} icon={<FiPhone />} />
              <InputField label="Hostel Block" id="hostelBlock" name="hostelBlock" value={formData.hostelBlock} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Room Number" id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Village" id="village" name="village" value={formData.village} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Taluka" id="taluka" name="taluka" value={formData.taluka} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="District" id="district" name="district" value={formData.district} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Course" id="course" name="course" value={formData.course} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Class / Year" id="classYear" name="classYear" value={formData.classYear} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Entrance Exam" id="commonEntranceExam" name="commonEntranceExam" value={formData.commonEntranceExam} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Aadhaar Number" id="aadhaarNumber" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Aadhaar Bank Name" id="aadhaarBankName" name="aadhaarBankName" value={formData.aadhaarBankName} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Bank Branch" id="bankBranch" name="bankBranch" value={formData.bankBranch} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Admission Date" id="admissionDate" name="admissionDate" value={formData.admissionDate} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Account Number" id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="IFSC Code" id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Address" id="address" name="address" value={formData.address} onChange={handleChange} icon={<FiMapPin />} textarea />
            </div>
          ) : null}
          {message ? <p className={`profile-message ${messageType}`}>{message}</p> : null}
          {editable ? <div className="profile-actions" style={{ marginTop: '0.7rem' }}><Button label={saving ? 'Saving...' : 'Save Changes'} variant="primary" onClick={handleSave} loading={saving} icon={<FiSave />} /> </div> : null}
        </div>
      </section>
    </div>
  );
}

export default Profile;
