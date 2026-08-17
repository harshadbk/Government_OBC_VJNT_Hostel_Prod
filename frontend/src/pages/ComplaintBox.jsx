import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiSend,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiUploadCloud,
  FiX,
  FiShield,
  FiTool,
  FiUser,
  FiHome,
  FiPhone,
  FiMessageSquare,
  FiRefreshCw,
  FiLock,
  FiAlertTriangle,
  FiEdit2
} from 'react-icons/fi';
import '../css/ComplaintBox.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const CATEGORIES = [
  'Room Maintenance',
  'Electrical',
  'Plumbing',
  'Cleanliness & Hygiene',
  'Mess & Food',
  'Wi-Fi & Internet',
  'Security',
  'Other'
];

export default function ComplaintBox({ user, token }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'my'

  // Student Profile Data
  const [studentName, setStudentName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Room Maintenance');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');

  // Status & List State
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState(null);

  const fileInputRef = useRef(null);

  const currentUser = user || (() => {
    try {
      const stored = localStorage.getItem('hostelUser');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  })();

  const currentToken = token || localStorage.getItem('hostelToken');

  // Automatically fetch & bind resident profile info
  useEffect(() => {
    if (currentUser) {
      setStudentName(currentUser.fullName || currentUser.username || '');
      setRoomNumber(currentUser.roomNumber || '');
      setStudentPhone(currentUser.mobileNumber || currentUser.phone || '');
      setStudentEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Check missing details in profile
  const missingMobile = !studentPhone || !studentPhone.trim();
  const missingRoom = !roomNumber || !roomNumber.trim();
  const hasMissingProfileInfo = Boolean(currentUser && (missingMobile || missingRoom));

  // Fetch my complaints
  const fetchMyComplaints = async () => {
    const activeToken = token || localStorage.getItem('hostelToken');
    if (!activeToken) return;
    setLoadingMy(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/complaints/my`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Error fetching my complaints:', err);
    } finally {
      setLoadingMy(false);
    }
  };

  useEffect(() => {
    const activeToken = token || localStorage.getItem('hostelToken');
    if (activeToken) {
      fetchMyComplaints();
    }
  }, [activeTab, token]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    const activeToken = token || localStorage.getItem('hostelToken');
    if (!activeToken) {
      setAlertMsg({ type: 'error', text: 'You must be logged in as a registered student to submit a complaint.' });
      return;
    }

    if (!title.trim()) {
      setAlertMsg({ type: 'error', text: 'Please enter a complaint title.' });
      return;
    }
    if (!description.trim()) {
      setAlertMsg({ type: 'error', text: 'Please provide a detailed complaint description.' });
      return;
    }

    setSubmitting(true);
    setAlertMsg(null);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('studentName', studentName);
    formData.append('roomNumber', roomNumber);
    formData.append('studentPhone', studentPhone);
    formData.append('studentEmail', studentEmail);
    formData.append('isAnonymous', 'false');

    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/complaints/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setAlertMsg({
          type: 'success',
          text: 'Complaint registered successfully! The hostel administration has been notified.'
        });
        // Reset inputs
        setTitle('');
        setDescription('');
        removeSelectedFile();
        fetchMyComplaints();
        setTimeout(() => {
          setActiveTab('my');
        }, 1200);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to submit complaint.' });
      }
    } catch (err) {
      console.error('Submission error:', err);
      setAlertMsg({ type: 'error', text: 'An unexpected network error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="complaint-page">
      <div className="complaint-page-container">
        {/* Header */}
        <div className="complaint-hero">
          <div className="complaint-eyebrow">
            <FiShield /> Official Student Grievance Portal
          </div>
          <h1>Hostel Complaint & Maintenance Box</h1>
          <p>
            Report room maintenance, electrical, plumbing, mess, or Wi-Fi issues directly to the
            hostel warden office with real-time status tracking.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="complaint-features-bar">
          <div className="feature-pill-card">
            <div className="feature-pill-icon">
              <FiTool />
            </div>
            <div className="feature-pill-text">
              <h4>Quick Action</h4>
              <p>Maintenance staff assigned promptly</p>
            </div>
          </div>
          <div className="feature-pill-card">
            <div className="feature-pill-icon">
              <FiCheckCircle />
            </div>
            <div className="feature-pill-text">
              <h4>Live Tracking</h4>
              <p>Direct warden replies & status updates</p>
            </div>
          </div>
          <div className="feature-pill-card">
            <div className="feature-pill-icon">
              <FiShield />
            </div>
            <div className="feature-pill-text">
              <h4>Direct Redressal</h4>
              <p>Verified resident records & accountability</p>
            </div>
          </div>
        </div>

        {/* If student is NOT logged in, restrict access to filing complaints */}
        {!user || !token ? (
          <div className="complaint-form-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1.25rem' }}>
              <FiLock />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text, #0f172a)' }}>
              Student Login Required
            </h2>
            <p style={{ color: 'var(--muted, #64748b)', maxWidth: '500px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              To ensure authentic resident reports and direct technician coordination, students must log in to submit complaints and track live grievance responses.
            </p>
            <Link to="/login" className="button primary" style={{ display: 'inline-flex', padding: '0.75rem 1.75rem' }}>
              <span>Log In to Your Student Account</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="complaint-tabs">
              <button
                className={`complaint-tab-btn ${activeTab === 'file' ? 'active' : ''}`}
                onClick={() => setActiveTab('file')}
              >
                <FiAlertCircle /> File a Complaint
              </button>
              <button
                className={`complaint-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                onClick={() => setActiveTab('my')}
              >
                <FiClock /> My Grievances & Live Status
              </button>
            </div>

            {/* Missing Phone/Room Warning Notification */}
            {hasMissingProfileInfo && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '0.75rem',
                  padding: '0.9rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FiAlertTriangle style={{ color: '#f59e0b', fontSize: '1.25rem', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text, #0f172a)' }}>
                    Your profile is missing{' '}
                    <strong>
                      {missingRoom && missingMobile
                        ? 'Room Number and Mobile Number'
                        : missingRoom
                        ? 'Room Number'
                        : 'Mobile Number'}
                    </strong>
                    . Please update your profile so maintenance staff can reach your room.
                  </span>
                </div>
                <Link
                  to="/profile"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.85rem',
                    background: '#f59e0b',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    borderRadius: '0.5rem',
                    textDecoration: 'none'
                  }}
                >
                  <FiEdit2 /> Update Profile
                </Link>
              </div>
            )}

            {/* Submission Alerts */}
            {alertMsg && (
              <div className={`alert-box ${alertMsg.type}`}>
                {alertMsg.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                <span>{alertMsg.text}</span>
              </div>
            )}

            {/* Tab 1: File Complaint Form */}
            {activeTab === 'file' && (
              <div className="complaint-form-card">
                <form onSubmit={handleSubmitComplaint}>
                  <div className="form-group">
                    <label>
                      <FiAlertCircle /> Complaint Title *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Water leakage in Room 204 / Wi-Fi disconnected on 2nd floor"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Category *</label>
                      <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Urgency Level</label>
                      <select
                        className="form-select"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="Low">Low - General inquiry / minor fix</option>
                        <option value="Medium">Medium - Standard issue</option>
                        <option value="High">High - Affecting daily routine</option>
                        <option value="Urgent">Urgent - Electrical/Water emergency</option>
                      </select>
                    </div>
                  </div>

                  {/* Auto-Fetched Resident Details */}
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>
                        <FiHome /> Room Number
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. A-104"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <FiPhone /> Contact Mobile Number (From Profile)
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="Not available in profile"
                        value={studentPhone}
                        readOnly
                        disabled
                        style={{ cursor: 'not-allowed', opacity: 0.85 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Detailed Description *</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Describe the issue in detail (location, exact problem, when it started)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  {/* Photo Upload Attachment */}
                  <div className="form-group">
                    <label>
                      <FiImage /> Photo / Evidence Attachment (Optional)
                    </label>
                    <div
                      className="image-upload-zone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiUploadCloud />
                      <p style={{ margin: '0.25rem 0', fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                        Click to upload photo evidence
                      </p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted, #64748b)' }}>
                        JPG, PNG, WebP up to 10MB
                      </span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                    </div>

                    {filePreview && (
                      <div className="upload-preview-container">
                        <img src={filePreview} alt="Preview" className="upload-preview-image" />
                        <button
                          type="button"
                          className="btn-remove-image"
                          onClick={removeSelectedFile}
                          title="Remove attachment"
                        >
                          <FiX />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn-submit-complaint"
                    disabled={submitting}
                  >
                    <FiSend />
                    <span>{submitting ? 'Submitting Grievance...' : 'Submit Complaint'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: My Complaints List */}
            {activeTab === 'my' && (
              <div className="my-complaints-view">
                {loadingMy ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <FiRefreshCw className="spin-icon" style={{ fontSize: '2rem', color: '#2563eb' }} />
                    <p style={{ color: 'var(--muted, #64748b)', marginTop: '0.75rem' }}>Loading your complaints...</p>
                  </div>
                ) : myComplaints.length === 0 ? (
                  <div className="complaint-form-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <FiCheckCircle style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '0.75rem' }} />
                    <h3 style={{ margin: '0 0 0.4rem 0' }}>No Active Grievances</h3>
                    <p style={{ color: 'var(--muted, #64748b)', marginBottom: '1.25rem' }}>
                      You have not submitted any complaints yet. Everything in your room and hostel looks good!
                    </p>
                    <button
                      className="button primary"
                      onClick={() => setActiveTab('file')}
                      style={{ display: 'inline-flex' }}
                    >
                      File a New Complaint
                    </button>
                  </div>
                ) : (
                  <div className="my-complaints-list">
                    {myComplaints.map((complaint) => {
                      const statusClass = (complaint.status || 'Pending').toLowerCase().replace(' ', '-');
                      const priorityClass = (complaint.priority || 'Medium').toLowerCase();
                      const isPending = complaint.status === 'Pending';
                      const isInProgress = complaint.status === 'In Progress';
                      const isResolved = complaint.status === 'Resolved';

                      return (
                        <div key={complaint._id} className="complaint-item-card">
                          {/* Card Top Row */}
                          <div className="item-header">
                            <div className="item-tags-row">
                              <span className={`badge-status ${statusClass}`}>
                                {complaint.status || 'Pending'}
                              </span>
                              <span className={`badge-priority ${priorityClass}`}>
                                {complaint.priority || 'Medium'} Priority
                              </span>
                              <span className="badge-category">{complaint.category}</span>
                            </div>
                            <span className="item-date">
                              Submitted {new Date(complaint.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <h3 className="item-title">{complaint.title}</h3>
                          <p className="item-description">{complaint.description}</p>

                          {/* Room & Contact Meta (if available) */}
                          {(complaint.roomNumber || complaint.studentPhone) && (
                            <div className="item-meta-bar">
                              {complaint.roomNumber && (
                                <span className="item-meta-pill">
                                  <FiHome /> Room {complaint.roomNumber}
                                </span>
                              )}
                              {complaint.studentPhone && (
                                <span className="item-meta-pill">
                                  <FiPhone /> {complaint.studentPhone}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Live Status Progress Stepper */}
                          <div className="progress-stepper-wrap">
                            <div className="stepper-track">
                              {/* Step 1: Registered */}
                              <div className="stepper-step completed">
                                <div className="step-circle">✓</div>
                                <div className="step-info">
                                  <span className="step-label">Submitted</span>
                                  <span className="step-sub">Logged in system</span>
                                </div>
                              </div>

                              <div className={`stepper-connector ${!isPending ? 'active' : ''}`} />

                              {/* Step 2: Under Review */}
                              <div className={`stepper-step ${isInProgress ? 'active' : isResolved ? 'completed' : ''}`}>
                                <div className="step-circle">{isResolved ? '✓' : '2'}</div>
                                <div className="step-info">
                                  <span className="step-label">In Progress</span>
                                  <span className="step-sub">Warden / Staff assigned</span>
                                </div>
                              </div>

                              <div className={`stepper-connector ${isResolved ? 'active' : ''}`} />

                              {/* Step 3: Resolved */}
                              <div className={`stepper-step ${isResolved ? 'completed' : ''}`}>
                                <div className="step-circle">{isResolved ? '✓' : '3'}</div>
                                <div className="step-info">
                                  <span className="step-label">Resolved</span>
                                  <span className="step-sub">{isResolved ? 'Closed' : 'Pending fix'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Photo Attachment if present */}
                          {complaint.imageUrl && (
                            <div className="item-attachment-row">
                              <button
                                type="button"
                                className="btn-view-image"
                                onClick={() => setPreviewModalImage(complaint.imageUrl)}
                              >
                                <FiImage /> View Attached Evidence Photo
                              </button>
                            </div>
                          )}

                          {/* Official Administration Reply */}
                          {complaint.adminResponse?.response && (
                            <div className="official-reply-box">
                              <div className="reply-header">
                                <FiMessageSquare /> Official Administration Response
                              </div>
                              <p className="reply-content">{complaint.adminResponse.response}</p>
                              {complaint.adminResponse.respondedAt && (
                                <div className="reply-date">
                                  Updated on {new Date(complaint.adminResponse.respondedAt).toLocaleString()} by{' '}
                                  {complaint.adminResponse.respondedBy || 'Hostel Warden'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Preview Zoom Modal */}
      {previewModalImage && (
        <div className="modal-overlay" onClick={() => setPreviewModalImage(null)}>
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0f172a',
              padding: '0.75rem',
              borderRadius: '1rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setPreviewModalImage(null)}
            >
              <FiX />
            </button>
            <img
              src={
                previewModalImage.startsWith('http')
                  ? previewModalImage
                  : `${apiBaseUrl}${previewModalImage}`
              }
              alt="Complaint attachment preview"
              style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '0.5rem' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
