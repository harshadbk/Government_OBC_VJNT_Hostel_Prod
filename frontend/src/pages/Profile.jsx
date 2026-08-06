import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiSave, FiEdit3, FiXCircle, FiUser, FiMail, FiPhone, FiMapPin, FiFileText, FiUpload, FiCheckCircle, FiCalendar, FiKey, FiTrendingUp, FiClock, FiX, FiSend } from 'react-icons/fi';
import compressImageFile from '../utils/compressImage';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import '../css/Profile.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Profile({ user, profileImage, onProfileUpdate, onProfileImageChange, token }) {
  const [editable, setEditable] = useState(false);
  const fileInputRef = useRef(null);
  const normalizeDateValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    rollNumber: user?.rollNumber || '',
    email: user?.email || '',
    phone: user?.phone || '',
    college_name: user?.college_name || '',
    stream: user?.stream || '',
    department: user?.department || '',
    year: user?.year || '',
    roomNumber: user?.roomNumber || '',
    address: user?.address || '',
    village: user?.village || '',
    taluka: user?.taluka || '',
    district: user?.district || '',
    mobileNumber: user?.mobileNumber || '',
    fathersMobileNumber: user?.fathersMobileNumber || '',
    aadhaarNumber: user?.aadhaarNumber || '',
    BankName: user?.BankName || '',
    bankBranch: user?.bankBranch || '',
    admissionDate: normalizeDateValue(user?.admissionDate),
    accountNumber: user?.accountNumber || '',
    ifscCode: user?.ifscCode || ''
  });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(profileImage || '');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [passwordStep, setPasswordStep] = useState('input');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [documents, setDocuments] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState('');
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [attendanceYear, setAttendanceYear] = useState(() => new Date().getFullYear());
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    reason: '',
    startDate: '',
    endDate: '',
    mobileNumber: user?.mobileNumber || ''
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveAttachment, setLeaveAttachment] = useState(null);
  const [leaveMessage, setLeaveMessage] = useState('');
  const [leaveMessageType, setLeaveMessageType] = useState('');
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveHistoryLoading, setLeaveHistoryLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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

    async function fetchDocuments() {
      if (!token) return;
      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/documents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setDocuments(data.documents);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchProfile();
    fetchDocuments();

    return () => {
      cancelled = true;
    };
  }, [token, onProfileUpdate]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaveHistory() {
      if (!token) return;
      setLeaveHistoryLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/leaves/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load leave history.');
        }
        if (!cancelled) {
          setLeaveHistory(data.leaves || []);
        }
      } catch (err) {
        if (!cancelled) {
          setLeaveMessage(err.message);
          setLeaveMessageType('error');
        }
      } finally {
        if (!cancelled) {
          setLeaveHistoryLoading(false);
        }
      }
    }

    fetchLeaveHistory();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function fetchAttendance() {
      if (!token) return;
      setAttendanceLoading(true);
      setAttendanceError('');
      try {
        const response = await fetch(`${apiBaseUrl}/api/attendance/student/my-attendance?year=${attendanceYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load attendance.');
        }
        if (!cancelled) {
          setAttendance(data);
        }
      } catch (err) {
        if (!cancelled) {
          setAttendanceError(err.message);
        }
      } finally {
        if (!cancelled) {
          setAttendanceLoading(false);
        }
      }
    }

    fetchAttendance();

    return () => {
      cancelled = true;
    };
  }, [token, attendanceYear]);

  const getFileExtension = (url = '') => {
    if (!url) return '';
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  };

  const isImageUrl = (url) => /\.(jpe?g|png|gif|jfif|webp|svg)$/i.test(url);
  const isPdfUrl = (url) => /\.pdf$/i.test(url);
  const isOfficeDocUrl = (url) => /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(url);
  const isTextUrl = (url) => /\.(txt|csv|json|md|log)$/i.test(url);

  const getPreviewType = (url = '') => {
    if (!url) return 'download';
    if (isImageUrl(url)) return 'image';
    if (isPdfUrl(url)) return 'pdf';
    if (isOfficeDocUrl(url)) return 'office';
    if (isTextUrl(url)) return 'text';
    return 'download';
  };

  const openPreview = async (url) => {
    if (!url) return;
    setPreviewDocUrl(url);
    setPreviewText('');
    setPreviewLoading(false);

    if (getPreviewType(url) === 'text') {
      try {
        setPreviewLoading(true);
        const response = await fetch(url);
        const text = await response.text();
        setPreviewText(text.slice(0, 8000));
      } catch (err) {
        setPreviewText('Unable to load text preview for this file.');
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const closePreview = () => {
    setPreviewDocUrl(null);
    setPreviewText('');
    setPreviewLoading(false);
  };

  const yearOptions = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);
  const heatmapWeeks = (() => {
    const days = attendance?.heatmapData || [];
    const weeks = [];
    let currentWeek = [];
    days.forEach((day, index) => {
      if (index === 0) {
        for (let gap = 0; gap < day.dayOfWeek; gap += 1) currentWeek.push(null);
      }
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    return weeks;
  })();
  const attendanceHistoryByMonth = (() => {
    const formatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
    return (attendance?.history || []).reduce((groups, record) => {
      const date = new Date(`${record.date}T00:00:00`);
      const monthLabel = Number.isNaN(date.getTime()) ? 'Other Records' : formatter.format(date);
      if (!groups[monthLabel]) groups[monthLabel] = [];
      groups[monthLabel].push(record);
      return groups;
    }, {});
  })();

  useEffect(() => {
    setFormData({
      fullName: user?.fullName || '',
      rollNumber: user?.rollNumber || '',
      email: user?.email || '',
      phone: user?.phone || '',
      college_name: user?.college_name || '',
      stream: user?.stream || '',
      department: user?.department || '',
      year: user?.year || '',
      roomNumber: user?.roomNumber || '',
      address: user?.address || '',
      village: user?.village || '',
      taluka: user?.taluka || '',
      district: user?.district || '',
      mobileNumber: user?.mobileNumber || '',
      fathersMobileNumber: user?.fathersMobileNumber || '',
      aadhaarNumber: user?.aadhaarNumber || '',
      BankName: user?.BankName || '',
      bankBranch: user?.bankBranch || '',
      admissionDate: normalizeDateValue(user?.admissionDate),
      accountNumber: user?.accountNumber || '',
      ifscCode: user?.ifscCode || ''
    });
    setNewPassword('');
    setOtpCode('');
    setPasswordStep('input');
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
        if (key === 'roomNumber') return;
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

  const handleSendOtp = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage('Please enter a new password with at least 6 characters.');
      setMessageType('error');
      return;
    }

    if (!token) {
      setMessage('Authentication token is missing. Please log in again.');
      setMessageType('error');
      return;
    }

    setPasswordLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/profile/password/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword, email: formData.email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to send verification code.');
      }
      setPasswordStep('verify');
      setMessage(data.message || 'Verification code sent to your email.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Unable to send verification code.');
      setMessageType('error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setMessage('Please enter the verification code.');
      setMessageType('error');
      return;
    }

    setPasswordLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/profile/password/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: otpCode, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to verify code.');
      }
      setPasswordStep('input');
      setNewPassword('');
      setOtpCode('');
      setMessage(data.message || 'Password updated successfully.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Unable to verify code.');
      setMessageType('error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file, { maxSizeMB: 0.8, maxWidthOrHeight: 2400 });
    const objectUrl = URL.createObjectURL(compressed);
    setSelectedPhoto(compressed);
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

  const handleLeaveChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
    setLeaveMessage('');
    setLeaveMessageType('');
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setLeaveMessage('Please log in to submit a leave request.');
      setLeaveMessageType('error');
      return;
    }

    if (!leaveForm.reason.trim() || !leaveForm.startDate || !leaveForm.endDate) {
      setLeaveMessage('Reason, start date, and end date are required.');
      setLeaveMessageType('error');
      return;
    }

    if (!leaveAttachment) {
      setLeaveMessage('A photo or document upload is required.');
      setLeaveMessageType('error');
      return;
    }

    setLeaveSubmitting(true);
    setLeaveMessage('');
    setLeaveMessageType('');

    try {
      const payload = new FormData();
      payload.append('reason', leaveForm.reason);
      payload.append('startDate', leaveForm.startDate);
      payload.append('endDate', leaveForm.endDate);
      payload.append('mobileNumber', leaveForm.mobileNumber || '');
      const attachmentFile = await compressImageFile(leaveAttachment, { maxSizeMB: 0.8, maxWidthOrHeight: 2400 });
      payload.append('attachment', attachmentFile);

      const response = await fetch(`${apiBaseUrl}/api/leaves/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit leave request.');
      }

      setLeaveForm({ reason: '', startDate: '', endDate: '', mobileNumber: user?.mobileNumber || '' });
      setLeaveAttachment(null);
      setLeaveMessage('Leave request submitted successfully.');
      setLeaveMessageType('success');
      setShowLeaveModal(false);
      setLeaveHistory((current) => [data.leaveApplication, ...current]);
    } catch (err) {
      setLeaveMessage(err.message || 'Unable to submit leave request.');
      setLeaveMessageType('error');
    } finally {
      setLeaveSubmitting(false);
    }
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
              <InputField label="Roll Number" id="rollNumber" name="rollNumber" value={formData.rollNumber} onChange={handleChange} icon={<FiUser />} disabled/>
              <InputField label="College Name" id="college_name" name="college_name" value={formData.college_name} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Stream" id="stream" name="stream" value={formData.stream} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Department" id="department" name="department" value={formData.department} onChange={handleChange} error={errors.department} icon={<FiUser />} required />
              <InputField label="Course Duration" id="year" name="year" value={formData.year} onChange={handleChange} error={errors.year} icon={<FiUser />} required />
              <InputField label="Email" id="email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} icon={<FiMail />} required disabled />
              <InputField label="Phone" id="phone" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} icon={<FiPhone />} required />
              <InputField label="Friends Number" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} icon={<FiPhone />} />
              <InputField label="Father's Mobile Number" id="fathersMobileNumber" name="fathersMobileNumber" value={formData.fathersMobileNumber} onChange={handleChange} icon={<FiPhone />} />
              <InputField label="Room Number" id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} icon={<FiMapPin />} disabled />
              <InputField label="Village" id="village" name="village" value={formData.village} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Taluka" id="taluka" name="taluka" value={formData.taluka} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="District" id="district" name="district" value={formData.district} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Aadhaar Number" id="aadhaarNumber" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Bank Name" id="BankName" name="BankName" value={formData.BankName} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Bank Branch" id="bankBranch" name="bankBranch" value={formData.bankBranch} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Account Number" id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="IFSC Code" id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Admission Date" id="admissionDate" name="admissionDate" type="date" value={formData.admissionDate} onChange={handleChange} icon={<FiCalendar />} />
              <InputField label="Address" id="address" name="address" value={formData.address} onChange={handleChange} icon={<FiMapPin />} textarea />
            </div>
          ) : null}
          {message ? <p className={`profile-message ${messageType}`}>{message}</p> : null}
          {editable ? <div className="profile-actions" style={{ marginTop: '0.7rem' }}><Button label={saving ? 'Saving...' : 'Save Changes'} variant="primary" onClick={handleSave} loading={saving} icon={<FiSave />} /> </div> : null}
        </div>
      </section>

      {editable ? (
        <section className="password-section glass-card" style={{ margin: '1rem 0 0', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.7rem', color: 'var(--accent)' }}>Change Password</h3>
          <p style={{ margin: '0 0 0.9rem', color: 'var(--muted)', fontSize: '0.92rem' }}>Enter a new password and verify it through an OTP sent to your email.</p>
          <div className="password-verification-card" style={{ border: '1px solid rgba(114, 227, 255, 0.25)', borderRadius: '12px', padding: '1rem', background: 'rgba(255,255,255,0.05)' }}>
            <InputField label="New Password" id="newPassword" name="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<FiKey />} placeholder="Enter new password" />
            {passwordStep === 'verify' ? (
              <InputField label="Verification OTP" id="otpCode" name="otpCode" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} icon={<FiSend />} placeholder="Enter 6-digit OTP" />
            ) : null}
            <div className="profile-actions" style={{ marginTop: '0.8rem', justifyContent: 'flex-start' }}>
              {passwordStep === 'verify' ? (
                <Button label={passwordLoading ? 'Verifying...' : 'Verify OTP'} variant="primary" onClick={handleVerifyOtp} loading={passwordLoading} icon={<FiSend />} />
              ) : (
                <Button label={passwordLoading ? 'Sending...' : 'Send OTP'} variant="primary" onClick={handleSendOtp} loading={passwordLoading} icon={<FiSend />} />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* --- Documents Section --- */}
      <section className="documents-section glass-card">
        <div className="documents-container">
          <h2 className="documents-title">
            <FiFileText /> Required Documents
          </h2>
          <div className="documents-info-banner">
            <p>
              Please ensure you have uploaded clear, legible copies (PDF or Image) of the following required documents:
            </p>
            <ul className="documents-checklist">
              <li>Passport Size Photo (via Profile Picture)</li>
              <li>Aadhar Card</li>
              <li>Caste Certificate &amp; Validity</li>
              <li>Income Certificate</li>
              <li>Domicile Certificate</li>
              <li>College Admission Receipt</li>
              <li>Bonafide Certificate</li>
              <li>Previous Year Marksheet</li>
            </ul>
          </div>
          
          {/* Scrollable documents list */}
          <div className="documents-scroll-area">
            {/* Passport Photo Card */}
            <div className={`doc-card ${preview ? 'uploaded' : 'missing'}`}>
              <div className="doc-card-info">
                <h4>Passport Size Photo</h4>
                {preview ? (
                   <span className="doc-status success"><FiCheckCircle /> Uploaded (from profile)</span>
                ) : (
                   <span className="doc-status danger">Not Uploaded</span>
                )}
              </div>
              <div className="doc-card-actions">
                {preview && (
                  <button onClick={() => openPreview(preview)} className="doc-view-btn">
                    <FiFileText /> View
                  </button>
                )}
              </div>
            </div>

            {/* Other Documents */}
            {[
              { key: 'aadharCardUrl', label: 'Aadhar Card' },
              { key: 'casteCertificateUrl', label: 'Caste Certificate' },
              { key: 'incomeCertificateUrl', label: 'Income Certificate' },
              { key: 'domicileCertificateUrl', label: 'Domicile Certificate' },
              { key: 'collegeAdmissionReceiptUrl', label: 'College Admission Receipt' },
              { key: 'bonafideCertificateUrl', label: 'Bonafide Certificate' },
              { key: 'casteValidityCertificateUrl', label: 'Caste Validity Certificate' },
              { key: 'previousYearMarksheetUrl', label: 'Previous Year Marksheet' },
            ].map(doc => (
              <div key={doc.key} className={`doc-card ${documents && documents[doc.key] ? 'uploaded' : 'missing'}`}>
                <div className="doc-card-info">
                  <h4>{doc.label}</h4>
                  {documents && documents[doc.key] ? (
                    <span className="doc-status success"><FiCheckCircle /> Uploaded</span>
                  ) : (
                    <span className="doc-status danger">Not Uploaded</span>
                  )}
                </div>
                <div className="doc-card-actions">
                  <label className="doc-upload-label">
                    <FiUpload /> {documents && documents[doc.key] ? 'Update' : 'Upload'}
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      hidden 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setDocUploading(true);
                        setDocMessage(`Uploading ${doc.label}...`);
                        
                        const formData = new FormData();
                        formData.append(doc.key.replace('Url', ''), file);
                        
                        try {
                          const res = await fetch(`${apiBaseUrl}/api/admin/documents`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData
                          });
                          const data = await res.json().catch(() => ({}));

                          if (res.ok && data.documents) {
                            const normalizedDocuments = data.documents.toObject ? data.documents.toObject() : data.documents;
                            setDocuments(normalizedDocuments);
                            setDocMessage(`${doc.label} uploaded successfully.`);
                          } else {
                            setDocMessage(data.message || `Failed to upload ${doc.label}.`);
                          }
                        } catch (err) {
                          setDocMessage(`Error uploading ${doc.label}.`);
                        } finally {
                          setDocUploading(false);
                          setTimeout(() => setDocMessage(''), 4000);
                        }
                      }} 
                    />
                  </label>
                  
                  {documents && documents[doc.key] && (
                    <button onClick={() => openPreview(documents[doc.key])} className="doc-view-btn">
                      <FiFileText /> View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {docMessage && (
            <p className={`doc-message ${docUploading ? '' : 'done'}`}>{docMessage}</p>
          )}
        </div>
      </section>

      <section className="leave-section glass-card">
        <div className="attendance-head">
          <div>
            <h2><FiCalendar /> Leave Application</h2>
            <p>Submit leave requests with a supporting document for the admin review.</p>
          </div>
          <button type="button" className="leave-open-btn" onClick={() => setShowLeaveModal(true)}>
            <FiCalendar /> Apply for Leave
          </button>
        </div>

        {leaveMessage ? <p className={`profile-message ${leaveMessageType}`}>{leaveMessage}</p> : null}

        <div className="attendance-history">
          <h3><FiClock /> Your leave history</h3>
          {leaveHistoryLoading ? (
            <p className="attendance-muted">Loading leave history...</p>
          ) : leaveHistory.length === 0 ? (
            <p className="attendance-muted">No leave requests yet.</p>
          ) : (
            <div className="attendance-history-scroll">
              {leaveHistory.map((leave) => (
                <div className="attendance-history-row" key={leave._id}>
                  <span>{leave.startDate} → {leave.endDate}</span>
                  <strong className={leave.status === 'Approved' ? 'present-text' : leave.status === 'Rejected' ? 'absent-text' : ''}>{leave.status || 'Pending'}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="attendance-section glass-card">
        <div className="attendance-head">
          <div>
            <h2><FiTrendingUp /> Attendance</h2>
            <p>Daily status, percentages, history, and yearly presence heatmap.</p>
          </div>
          <label className="attendance-year">
            Year
            <select value={attendanceYear} onChange={(e) => setAttendanceYear(Number(e.target.value))}>
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </div>

        {attendanceLoading ? (
          <p className="attendance-muted">Loading attendance...</p>
        ) : attendanceError ? (
          <p className="profile-message error">{attendanceError}</p>
        ) : (
          <>
            <div className="attendance-stats">
              <div className={`attendance-stat ${attendance?.todayStatus === 'Present' ? 'present' : attendance?.todayStatus === 'Absent' ? 'absent' : ''}`}>
                <span>Today</span>
                <strong>{attendance?.todayStatus || 'Not Marked'}</strong>
              </div>
              <div className="attendance-stat">
                <span>This Month</span>
                <strong>{attendance?.summary?.monthlyPercentage ?? 0}%</strong>
              </div>
              <div className="attendance-stat">
                <span>{attendanceYear}</span>
                <strong>{attendance?.summary?.yearlyPercentage ?? 0}%</strong>
              </div>
              <div className="attendance-stat">
                <span>Present Days</span>
                <strong>{attendance?.summary?.totalPresentDays ?? 0}/{attendance?.summary?.totalMarkedDays ?? 0}</strong>
              </div>
            </div>

            <div className="attendance-heatmap-wrap">
              <div className="attendance-heatmap">
                {heatmapWeeks.map((week, weekIndex) => (
                  <div className="attendance-week" key={`week-${weekIndex}`}>
                    {week.map((day, dayIndex) => (
                      <span
                        key={day?.date || `blank-${weekIndex}-${dayIndex}`}
                        className={`attendance-day ${day ? day.status.toLowerCase() : 'empty'}`}
                        title={day ? `${day.date}: ${day.status}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="attendance-legend">
                <span><i className="attendance-day present" /> Present</span>
                <span><i className="attendance-day absent" /> Absent</span>
                <span><i className="attendance-day notmarked" /> Not marked</span>
              </div>
            </div>

            <div className="attendance-history">
              <h3><FiClock /> Attendance History</h3>
              {(attendance?.history || []).length === 0 ? (
                <p className="attendance-muted">No attendance records yet.</p>
              ) : (
                <div className="attendance-history-scroll">
                  {Object.entries(attendanceHistoryByMonth).map(([monthLabel, records]) => (
                    <div className="attendance-month-group" key={monthLabel}>
                      <h4>{monthLabel}</h4>
                      {records.map((record) => (
                        <div className="attendance-history-row" key={record._id}>
                          <span>{record.date}</span>
                          <strong className={record.status === 'Present' ? 'present-text' : 'absent-text'}>
                            {record.status === 'Present' ? <FiCheckCircle /> : <FiX />} {record.status}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {showLeaveModal && (
        <div className="leave-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowLeaveModal(false)}>
          <div className="leave-modal-card">
            <div className="leave-modal-header">
              <div>
                <h3><FiCalendar /> Leave Request</h3>
                <p>Fill in your details and upload proof for admin review.</p>
              </div>
              <button type="button" className="leave-modal-close" onClick={() => setShowLeaveModal(false)}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="leave-form-grid">
              <label className="leave-field">
                <span>Full name</span>
                <input value={user?.fullName || ''} readOnly />
              </label>
              <label className="leave-field">
                <span>Mobile number</span>
                <input name="mobileNumber" value={leaveForm.mobileNumber} onChange={handleLeaveChange} />
              </label>
              <label className="leave-field">
                <span>Start date</span>
                <input type="date" name="startDate" value={leaveForm.startDate} onChange={handleLeaveChange} required />
              </label>
              <label className="leave-field">
                <span>End date</span>
                <input type="date" name="endDate" value={leaveForm.endDate} onChange={handleLeaveChange} required />
              </label>
              <label className="leave-field leave-field-full">
                <span>Reason for leave</span>
                <textarea name="reason" rows="4" value={leaveForm.reason} onChange={handleLeaveChange} required />
              </label>
              <label className="leave-field leave-field-full">
                <span>Upload photo / document</span>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => setLeaveAttachment(e.target.files?.[0] || null)} required />
              </label>
              <div className="leave-actions leave-field-full">
                <button type="submit" className="leave-submit-btn primary-btn" disabled={leaveSubmitting}>
                  <span className="leave-submit-label">
                    {leaveSubmitting ? 'Submitting...' : 'Submit Leave Request'}
                  </span>
                </button>
                {leaveAttachment ? <span>{leaveAttachment.name}</span> : <span>No file selected</span>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Preview Modal --- */}
      {previewDocUrl && (
        <div className="doc-preview-overlay" onClick={(e) => e.target === e.currentTarget && closePreview()}>
          <div className="doc-preview-modal">
            <div className="doc-preview-header">
              <h3>Document Preview</h3>
              <button onClick={closePreview} className="doc-preview-close"><FiXCircle /></button>
            </div>
            <div className="doc-preview-body">
              {getPreviewType(previewDocUrl) === 'image' ? (
                <img src={previewDocUrl} alt="Document Preview" className="doc-preview-image" />
              ) : getPreviewType(previewDocUrl) === 'pdf' ? (
                <iframe
                  src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(previewDocUrl)}`}
                  className="doc-preview-iframe"
                  title="Document Preview"
                />
              ) : getPreviewType(previewDocUrl) === 'office' ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocUrl)}`}
                  className="doc-preview-iframe"
                  title="Document Preview"
                />
              ) : getPreviewType(previewDocUrl) === 'text' ? (
                <div className="doc-preview-text">
                  {previewLoading ? <p>Loading preview…</p> : <pre>{previewText || 'No text content available.'}</pre>}
                </div>
              ) : (
                <div className="doc-preview-text">
                  <p>This file type cannot be previewed inline.</p>
                  <a href={previewDocUrl} target="_blank" rel="noreferrer">Open in new tab</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;
