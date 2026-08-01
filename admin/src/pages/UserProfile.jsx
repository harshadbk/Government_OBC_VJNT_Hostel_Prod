import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiPhone, FiHome, FiBook, FiInfo, FiFileText, FiXCircle, FiTrendingUp, FiClock, FiCheckCircle, FiX } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function UserProfile({ onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [attendanceYear, setAttendanceYear] = useState(() => new Date().getFullYear());
  const [attendance, setAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const token = getAdminToken();
        if (!token) {
          if (typeof onLogout === 'function') onLogout();
          navigate('/login');
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          if (typeof onLogout === 'function') onLogout();
          navigate('/login');
          return;
        }

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
  }, [id, navigate, onLogout]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const token = getAdminToken();
        if (!token) return;
        setAttendanceLoading(true);
        setAttendanceError('');
        const response = await fetch(`${apiBaseUrl}/api/attendance/student/${id}/attendance?year=${attendanceYear}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load attendance.');
        }
        setAttendance(data);
      } catch (err) {
        setAttendanceError(err.message);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendance();
  }, [id, attendanceYear]);

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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>College:</span> <strong>{user.college_name || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Stream:</span> <strong>{user.stream || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Department:</span> <strong>{user.department || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Year:</span> <strong>{user.year || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Admission Date:</span> <strong>{user.admissionDate ? new Date(user.admissionDate).toLocaleDateString() : '-'}</strong></div>
              </div>
            </div>

            {/* Hostel Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiHome /> Hostel Allocation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Room Number:</span> <strong>{user.roomNumber ? `Room ${user.roomNumber}` : 'Unassigned'}</strong></div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiPhone /> Contact Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Email:</span> <strong>{user.email || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Mobile No:</span> <strong>{user.mobileNumber || user.phone || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Father's Mobile No:</span> <strong>{user.fathersMobileNumber || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Aadhaar No:</span> <strong>{user.aadhaarNumber || '-'}</strong></div>
              </div>
            </div>

            {/* Banking Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiInfo /> Bank Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Bank Name:</span> <strong>{user.BankName || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Branch:</span> <strong>{user.bankBranch || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Account No:</span> <strong>{user.accountNumber || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>IFSC Code:</span> <strong>{user.ifscCode || '-'}</strong></div>
              </div>
            </div>

            {/* Address Info */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}><FiInfo /> Address Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Village:</span> <strong>{user.village || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Taluka:</span> <strong>{user.taluka || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>District:</span> <strong>{user.district || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Full Address:</span> <strong>{user.address || '-'}</strong></div>
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

          <div className="attendance-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <div className="attendance-head">
              <div>
                <h3><FiTrendingUp /> Attendance</h3>
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
