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
              <InputField label="College Name" id="college_name" name="college_name" value={formData.college_name} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Stream" id="stream" name="stream" value={formData.stream} onChange={handleChange} icon={<FiUser />} />
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
              <InputField label="Aadhaar Number" id="aadhaarNumber" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Bank Name" id="BankName" name="BankName" value={formData.BankName} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Bank Branch" id="bankBranch" name="bankBranch" value={formData.bankBranch} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Account Number" id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} icon={<FiUser />} />
              <InputField label="IFSC Code" id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} icon={<FiUser />} />
              <InputField label="Admission Date" id="admissionDate" name="admissionDate" type="date" value={formData.admissionDate} onChange={handleChange} icon={<FiCalendar />} />
              <InputField label="New Password" id="newPassword" name="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<FiKey />} placeholder="Leave blank to keep current password" />
              <InputField label="Address" id="address" name="address" value={formData.address} onChange={handleChange} icon={<FiMapPin />} textarea />
            </div>
          ) : null}
          {message ? <p className={`profile-message ${messageType}`}>{message}</p> : null}
          {editable ? <div className="profile-actions" style={{ marginTop: '0.7rem' }}><Button label={saving ? 'Saving...' : 'Save Changes'} variant="primary" onClick={handleSave} loading={saving} icon={<FiSave />} /> </div> : null}
        </div>
      </section>

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
                  <button onClick={() => setPreviewDocUrl(preview)} className="doc-view-btn">
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
                    <button onClick={() => setPreviewDocUrl(documents[doc.key])} className="doc-view-btn">
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

      {/* --- Preview Modal --- */}
      {previewDocUrl && (
        <div className="doc-preview-overlay" onClick={(e) => e.target === e.currentTarget && setPreviewDocUrl(null)}>
          <div className="doc-preview-modal">
            <div className="doc-preview-header">
              <h3>Document Preview</h3>
              <button onClick={() => setPreviewDocUrl(null)} className="doc-preview-close"><FiXCircle /></button>
            </div>
            <div className="doc-preview-body">
              {previewDocUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDocUrl} className="doc-preview-iframe" title="Document Preview" />
              ) : (
                <img src={previewDocUrl} alt="Document Preview" className="doc-preview-image" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;

