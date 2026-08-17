import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  FiAlertCircle,
  FiRefreshCcw,
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiUser,
  FiHome,
  FiPhone,
  FiCalendar,
  FiImage,
  FiMessageSquare,
  FiX,
  FiSend,
  FiCheck,
  FiLayers
} from 'react-icons/fi';
import '../css/Complaints.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const QUICK_RESPONSES = [
  'Technician has been notified and scheduled to visit.',
  'Maintenance team has inspected and resolved the issue.',
  'Replacement parts ordered; will be fixed within 24 hours.',
  'Cleaning staff assigned for immediate action.',
  'Network administrator is investigating the internet issue.',
  'Please visit the hostel warden office for further details.'
];

export default function Complaints({ onLogout }) {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form inside modal
  const [responseStatus, setResponseStatus] = useState('Pending');
  const [responsePriority, setResponsePriority] = useState('Medium');
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  const fetchComplaints = async (isSilent = false) => {
    const token = getAdminToken();
    if (!token) {
      if (typeof onLogout === 'function') onLogout();
      navigate('/login');
      return;
    }

    if (!isSilent) setRefreshing(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/complaints/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiBaseUrl}/api/complaints/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (listRes.status === 401 || listRes.status === 403) {
        if (typeof onLogout === 'function') onLogout();
        navigate('/login');
        return;
      }

      if (listRes.ok) {
        const data = await listRes.json();
        setComplaints(data.complaints || []);
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    const interval = setInterval(() => fetchComplaints(true), 12000);
    return () => clearInterval(interval);
  }, []);

  const openActionModal = (complaint) => {
    setSelectedComplaint(complaint);
    // If pending, default next action to 'In Progress' or keep current status
    setResponseStatus(complaint.status === 'Pending' ? 'In Progress' : (complaint.status || 'In Progress'));
    setResponsePriority(complaint.priority || 'Medium');
    setResponseText(complaint.adminResponse?.response || '');
    setActionSuccess('');
  };

  const handleSaveResponse = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const token = getAdminToken();
    if (!token) return;

    setSubmittingResponse(true);
    setActionSuccess('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/complaints/${selectedComplaint._id}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: responseStatus,
          priority: responsePriority,
          response: responseText
        })
      });

      if (res.ok) {
        const updated = await res.json();
        const newComplaint = updated.complaint;
        setActionSuccess('Response updated successfully!');

        // Immediately update complaints list
        setComplaints((prev) =>
          prev.map((c) => (c._id === selectedComplaint._id ? newComplaint : c))
        );

        // Immediately update metric counters
        setStats((prevStats) => {
          const oldStatus = selectedComplaint.status;
          const newStatus = newComplaint.status;
          if (oldStatus === newStatus) return prevStats;
          const next = { ...prevStats };
          if (oldStatus === 'Pending' && next.pending > 0) next.pending -= 1;
          if (oldStatus === 'In Progress' && next.inProgress > 0) next.inProgress -= 1;
          if (oldStatus === 'Resolved' && next.resolved > 0) next.resolved -= 1;

          if (newStatus === 'Pending') next.pending += 1;
          if (newStatus === 'In Progress') next.inProgress += 1;
          if (newStatus === 'Resolved') next.resolved += 1;
          return next;
        });

        setSelectedComplaint(newComplaint);
        fetchComplaints(true);
        setTimeout(() => {
          setSelectedComplaint(null);
        }, 900);
      } else {
        alert('Failed to update response. Please try again.');
      }
    } catch (err) {
      console.error('Error updating complaint response:', err);
      alert('An error occurred while saving response.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      if (priorityFilter !== 'All' && c.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = c.title?.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        const studentMatch = c.studentName?.toLowerCase().includes(q);
        const roomMatch = c.roomNumber?.toLowerCase().includes(q);
        const catMatch = c.category?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !studentMatch && !roomMatch && !catMatch) {
          return false;
        }
      }
      return true;
    });
  }, [complaints, statusFilter, categoryFilter, priorityFilter, searchQuery]);

  const categories = [
    'All',
    'Room Maintenance',
    'Electrical',
    'Plumbing',
    'Cleanliness & Hygiene',
    'Mess & Food',
    'Wi-Fi & Internet',
    'Security',
    'Other'
  ];

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />

      <main className="dashboard-main admin-main">
        {/* Standard Topbar matching other admin pages */}
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Resident Grievances</p>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiAlertCircle style={{ color: '#ef4444' }} /> Complaint Box ({complaints.length})
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Review resident maintenance issues, assign priorities, and submit resolution responses.
            </p>
          </div>
          <div className="topbar-actions">
            <button
              className="action-btn"
              onClick={() => fetchComplaints()}
              disabled={refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)', background: 'var(--glass)', color: 'var(--text)', cursor: 'pointer' }}
            >
              <FiRefreshCcw className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Metric Overview Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon pending">
              <FiAlertCircle />
            </div>
            <div className="metric-info">
              <h4>Pending Review</h4>
              <p>{stats.pending || 0}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon in-progress">
              <FiClock />
            </div>
            <div className="metric-info">
              <h4>In Progress</h4>
              <p>{stats.inProgress || 0}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon resolved">
              <FiCheckCircle />
            </div>
            <div className="metric-info">
              <h4>Resolved</h4>
              <p>{stats.resolved || 0}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon total">
              <FiLayers />
            </div>
            <div className="metric-info">
              <h4>Total Grievances</h4>
              <p>{stats.total || 0}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="complaints-controls">
          <div className="search-wrap">
            <FiSearch />
            <input
              type="text"
              placeholder="Search by title, student, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Complaints Container Card */}
        <div className="panel-card complaints-container-card">
          <div className="panel-head complaints-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="complaints-head-icon">
                <FiAlertCircle />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                  Resident Complaints & Grievances
                </h3>
                <small style={{ color: 'var(--muted)' }}>
                  Showing {filteredComplaints.length} of {complaints.length} total tickets
                </small>
              </div>
            </div>

            <span className="complaints-counter-badge">
              {filteredComplaints.length} {filteredComplaints.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          {/* Complaints List */}
          {loading ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
              <FiRefreshCcw className="spin-icon" style={{ fontSize: '2rem' }} />
              <p style={{ marginTop: '0.75rem' }}>Loading complaints...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
              <FiCheckCircle style={{ color: '#10b981', fontSize: '2.5rem' }} />
              <h3 style={{ margin: '0.75rem 0 0.25rem' }}>No Complaints Found</h3>
              <p style={{ margin: 0, color: 'var(--muted)' }}>No grievances match your current filters.</p>
            </div>
          ) : (
            <div className="complaints-list">
              {filteredComplaints.map((complaint) => {
                const statusClass = (complaint.status || 'Pending').toLowerCase().replace(' ', '-');
                const priorityClass = (complaint.priority || 'Medium').toLowerCase();

                return (
                  <div key={complaint._id} className="complaint-card">
                    <div className="complaint-main-content">
                      <div className="complaint-badges">
                        <span className={`badge-status ${statusClass}`}>{complaint.status}</span>
                        <span className={`badge-priority ${priorityClass}`}>
                          {complaint.priority} Priority
                        </span>
                        <span className="badge-category">{complaint.category}</span>
                      </div>

                      <h3 className="complaint-title">{complaint.title}</h3>
                      <p className="complaint-desc">{complaint.description}</p>

                      {complaint.adminResponse?.response && (
                        <div className="complaint-admin-feedback">
                          <strong>Response:</strong> {complaint.adminResponse.response}
                        </div>
                      )}

                      <div className="complaint-meta">
                        <span className="complaint-meta-item">
                          <FiUser /> {complaint.studentName}
                        </span>
                        {complaint.roomNumber && (
                          <span className="complaint-meta-item">
                            <FiHome /> Room {complaint.roomNumber}
                          </span>
                        )}
                        {complaint.studentPhone && (
                          <span className="complaint-meta-item">
                            <FiPhone /> {complaint.studentPhone}
                          </span>
                        )}
                        <span className="complaint-meta-item">
                          <FiCalendar /> {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="complaint-card-actions">
                      <button
                        className="btn-action-respond"
                        onClick={() => openActionModal(complaint)}
                      >
                        <FiMessageSquare /> Respond / Update
                      </button>

                      {complaint.imageUrl && (
                        <button
                          className="btn-view-image"
                          onClick={() => setPreviewImage(complaint.imageUrl)}
                        >
                          <FiImage /> View Photo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Action / Response Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="complaint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Complaint & Respond</h2>
              <button className="modal-close-btn" onClick={() => setSelectedComplaint(null)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {actionSuccess && (
                <div style={{ background: '#10b98120', color: '#10b981', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiCheck /> {actionSuccess}
                </div>
              )}

              {/* Student Details */}
              <div className="modal-section">
                <h4>Resident Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.45rem', fontSize: '0.88rem' }}>
                  <div><strong>Name:</strong> {selectedComplaint.studentName}</div>
                  <div><strong>Room:</strong> {selectedComplaint.roomNumber || 'Not specified'}</div>
                  <div><strong>Phone:</strong> {selectedComplaint.studentPhone || 'Not provided'}</div>
                  <div><strong>Email:</strong> {selectedComplaint.studentEmail || 'N/A'}</div>
                  <div><strong>Submitted:</strong> {new Date(selectedComplaint.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Complaint Info */}
              <div className="modal-section">
                <h4>Complaint Details</h4>
                <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--text, #f8fbff)', fontSize: '1.05rem' }}>
                  {selectedComplaint.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--muted, #8cb2ff)', lineHeight: 1.5, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                  {selectedComplaint.description}
                </p>

                {selectedComplaint.imageUrl && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>
                      Attached Evidence Photo (Click to zoom):
                    </div>
                    <img
                      src={selectedComplaint.imageUrl.startsWith('http') ? selectedComplaint.imageUrl : `${apiBaseUrl}${selectedComplaint.imageUrl}`}
                      alt="Complaint attachment"
                      className="modal-image-preview"
                      onClick={() => setPreviewImage(selectedComplaint.imageUrl)}
                    />
                  </div>
                )}
              </div>

              {/* Admin Response Form */}
              <form id="response-form" onSubmit={handleSaveResponse}>
                <div className="modal-section">
                  <h4>Update Resolution Status & Response</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div className="response-form-group">
                      <label>Status</label>
                      <select
                        className="filter-select"
                        value={responseStatus}
                        onChange={(e) => setResponseStatus(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="response-form-group">
                      <label>Priority</label>
                      <select
                        className="filter-select"
                        value={responsePriority}
                        onChange={(e) => setResponsePriority(e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="response-form-group">
                    <label>Quick Response Templates</label>
                    <div className="quick-templates">
                      {QUICK_RESPONSES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn-template"
                          onClick={() => setResponseText(tmpl)}
                        >
                          {tmpl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="response-form-group">
                    <label>Official Administration Response (Visible to resident)</label>
                    <textarea
                      className="response-textarea"
                      placeholder="Write resolution notes, technician details, or instructions for the student..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedComplaint(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="response-form"
                className="btn-submit-response"
                disabled={submittingResponse}
              >
                <FiSend />
                <span>{submittingResponse ? 'Saving...' : 'Save & Update Status'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Zoom Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0b1329',
              padding: '0.65rem',
              borderRadius: '0.85rem',
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
              onClick={() => setPreviewImage(null)}
            >
              <FiX />
            </button>
            <img
              src={previewImage.startsWith('http') ? previewImage : `${apiBaseUrl}${previewImage}`}
              alt="Full Preview"
              style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '0.45rem' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
