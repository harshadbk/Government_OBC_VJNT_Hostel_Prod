import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiSave, FiEdit3, FiXCircle, FiUser, FiMail, FiPhone, FiMapPin, FiFileText, FiUpload, FiCheckCircle, FiCalendar, FiKey } from 'react-icons/fi';
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
    department: user?.department || '',
    year: user?.year || '',
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
  const [newPassword, setNewPassword] = useState('');
  
  const [documents, setDocuments] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState('');
  const [previewDocUrl, setPreviewDocUrl] = useState(null);

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
    setFormData({
      fullName: user?.fullName || '',
      rollNumber: user?.rollNumber || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      year: user?.year || '',
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
      admissionDate: normalizeDateValue(user?.admissionDate),
      accountNumber: user?.accountNumber || '',
      ifscCode: user?.ifscCode || ''
    });
    setNewPassword('');
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
      if (newPassword) {
        payload.append('newPassword', newPassword);
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
      setNewPassword('');
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
                      <InputField label="Room Number" id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} icon={<FiMapPin />} disabled />
              <InputField label="Village" id="village" name="village" value={formData.village} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Taluka" id="taluka" name="taluka" value={formData.taluka} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="District" id="district" name="district" value={formData.district} onChange={handleChange} icon={<FiMapPin />} />
              <InputField label="Course" id="course" name="course" value={formData.course} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Class / Year" id="classYear" name="classYear" value={formData.classYear} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Entrance Exam" id="commonEntranceExam" name="commonEntranceExam" value={formData.commonEntranceExam} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Aadhaar Number" id="aadhaarNumber" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Admission Date" id="admissionDate" name="admissionDate" type="date" value={formData.admissionDate} onChange={handleChange} icon={<FiCalendar />} />
              <InputField label="New Password" id="newPassword" name="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<FiKey />} placeholder="Leave blank to keep current password" />
              <InputField label="Account Number" id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="IFSC Code" id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Address" id="address" name="address" value={formData.address} onChange={handleChange} icon={<FiMapPin />} textarea />
            </div>
          ) : null}
          {message ? <p className={`profile-message ${messageType}`}>{message}</p> : null}
          {editable ? <div className="profile-actions" style={{ marginTop: '0.7rem' }}><Button label={saving ? 'Saving...' : 'Save Changes'} variant="primary" onClick={handleSave} loading={saving} icon={<FiSave />} /> </div> : null}
        </div>
      </section>

      {/* --- Documents Section --- */}
      <section className="glass-card" style={{ marginTop: '2rem', padding: '2rem', borderRadius: '32px' }}>
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FiFileText /> Required Documents
          </h2>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text)', marginBottom: '0.5rem', fontWeight: '500' }}>
              Please ensure you have uploaded clear, legible copies (PDF or Image) of the following required documents:
            </p>
            <ul style={{ color: 'var(--muted)', listStyle: 'none', padding: 0, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', maxWidth: '600px', textAlign: 'left' }}>
              <li>Passport Size Photo (via Profile Picture)</li>
              <li>Aadhar Card</li>
              <li>Caste Certificate & Validity</li>
              <li>Income Certificate</li>
              <li>Domicile Certificate</li>
              <li>College Admission Receipt</li>
              <li>Bonafide Certificate</li>
              <li>Previous Year Marksheet</li>
            </ul>
          </div>
          
          <div className="documents-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="document-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <h4 style={{ margin: 0 }}>Passport Size Photo</h4>
                {preview ? (
                   <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}><FiCheckCircle /> Uploaded (from profile)</span>
                ) : (
                   <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Not Uploaded</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {preview && (
                  <button onClick={() => setPreviewDocUrl(preview)} className="icon-btn" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
              <div key={doc.key} className="document-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                
                {/* Left Side: Name and Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <h4 style={{ margin: 0 }}>{doc.label}</h4>
                  {documents && documents[doc.key] ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}><FiCheckCircle /> Uploaded</span>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Not Uploaded</span>
                  )}
                </div>
                
                {/* Right Side: Upload and View Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label className="button secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'inline-flex', cursor: 'pointer', margin: 0 }}>
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
                            setDocMessage(`${doc.label} uploaded successfully. You can preview it now.`);
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
                    <button onClick={() => setPreviewDocUrl(documents[doc.key])} className="icon-btn" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <FiFileText /> View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {docMessage && <p style={{ marginTop: '1rem', color: docUploading ? 'var(--text)' : 'var(--primary)' }}>{docMessage}</p>}
        </div>
      </section>

      {/* --- Preview Modal --- */}
      {previewDocUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '900px', height: '100%', maxHeight: '800px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Document Preview</h3>
              <button onClick={() => setPreviewDocUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}><FiXCircle /></button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
              {previewDocUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDocUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Preview" />
              ) : (
                <img src={previewDocUrl} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;
