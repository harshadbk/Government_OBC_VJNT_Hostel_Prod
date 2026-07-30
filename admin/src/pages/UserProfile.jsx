import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiUser, FiPhone, FiMail, FiHome, FiBook, FiInfo, FiFileText, FiXCircle } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function UserProfile({ onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewDocUrl, setPreviewDocUrl] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setUser(data.user);

        // Fetch documents
        const docRes = await fetch(`${apiBaseUrl}/api/admin/users/${id}/documents`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          setDocuments(docData.documents);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-shell admin-dashboard-shell">
        <Sidebar onLogout={onLogout} />
        <main className="dashboard-main admin-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p>Loading user profile...</p>
        </main>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="dashboard-shell admin-dashboard-shell">
        <Sidebar onLogout={onLogout} />
        <main className="dashboard-main admin-main">
          <button onClick={() => navigate('/users')} className="secondary-btn" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiArrowLeft /> Back to Users
          </button>
          <div className="panel-card">
            <p style={{ color: 'red' }}>Error: {error || 'User not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Resident Details</p>
            <h2>User Profile</h2>
          </div>
          <button onClick={() => navigate('/users')} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiArrowLeft /> Back
          </button>
        </header>

        <div className="panel-card profile-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="avatar-shell" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.fullName || user.username} className="profile-avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <div className="profile-fallback" style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {(user.fullName || user.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>{user.fullName || user.username}</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1.1rem' }}>@{user.username}</p>
              {user.rollNumber && <p style={{ margin: '0.5rem 0 0 0', fontWeight: '500', display: 'inline-block', background: 'rgba(26, 54, 93, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>Roll: {user.rollNumber}</p>}
            </div>
          </div>

          <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Academic Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiBook /> Academic Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Course:</span> <strong>{user.course || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Department:</span> <strong>{user.department || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Year:</span> <strong>{user.year || user.classYear || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Entrance Exam:</span> <strong>{user.commonEntranceExam || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Admission Date:</span> <strong>{user.admissionDate || '-'}</strong></div>
              </div>
            </div>

            {/* Hostel Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiHome /> Hostel Allocation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Block:</span> <strong>{user.hostelBlock || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Room Number:</span> <strong>{user.roomNumber || '-'}</strong></div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiPhone /> Contact Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Email:</span> <strong>{user.email || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Mobile No:</span> <strong>{user.mobileNumber || user.phone || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Father's Mobile No:</span> <strong>{user.fathersMobileNumber || '-'}</strong></div>
              </div>
            </div>

            {/* Address Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiInfo /> Address Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Address:</span> <strong>{user.address || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Village:</span> <strong>{user.village || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Taluka:</span> <strong>{user.taluka || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>District:</span> <strong>{user.district || '-'}</strong></div>
              </div>
            </div>

          </div>
          
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--text)' }}><FiBook /> Uploaded Documents</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Passport Size Photo</h4>
                {user.photoUrl ? (
                  <button onClick={() => setPreviewDocUrl(user.photoUrl)} style={{ color: 'var(--primary)', fontWeight: '500', fontSize: '0.9rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FiFileText /> Preview
                  </button>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Not Uploaded</span>
                )}
              </div>
              
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
                <div key={doc.key} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{doc.label}</h4>
                  {documents && documents[doc.key] ? (
                    <button onClick={() => setPreviewDocUrl(documents[doc.key])} style={{ color: 'var(--primary)', fontWeight: '500', fontSize: '0.9rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FiFileText /> Preview
                    </button>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Not Uploaded</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {previewDocUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '900px', height: '100%', maxHeight: '800px', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Document Preview</h3>
              <button onClick={() => setPreviewDocUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}><FiXCircle /></button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
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

export default UserProfile;
