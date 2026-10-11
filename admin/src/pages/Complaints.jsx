import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  FiRefreshCcw,
  FiSearch,
  FiUser,
  FiHome,
  FiPhone,
  FiCalendar,
  FiImage,
  FiMessageSquare,
  FiX,
  FiSend
} from 'react-icons/fi';
import '../css/Complaints.css';
import toast, { useToastMessage } from '../utils/toast';

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
  useToastMessage(actionSuccess, 'success');

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
        toast.error('Failed to update response. Please try again.');
      }
    } catch (err) {
      console.error('Error updating complaint response:', err);
      toast.error('An error occurred while saving response.');
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

  const imageSrc = (url) => (url.startsWith('http') ? url : `${apiBaseUrl}${url}`);
  const statusKey = (status) => (status || 'Pending').toLowerCase().replace(' ', '-');

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />

      <main className="dashboard-main admin-main cx-page">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Residents</p>
            <h2>Complaints</h2>
            <p className="cx-sub">Issues reported by residents. Open one to change its status or reply.</p>
          </div>
          <div className="topbar-actions">
            <button className="secondary-btn cx-refresh" onClick={() => fetchComplaints()} disabled={refreshing}>
              <FiRefreshCcw className={refreshing ? 'spin-icon' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="cx-summary">
          <div><span>Pending</span><strong className="pending">{stats.pending || 0}</strong></div>
          <div><span>In progress</span><strong className="in-progress">{stats.inProgress || 0}</strong></div>
          <div><span>Resolved</span><strong className="resolved">{stats.resolved || 0}</strong></div>
          <div><span>Total</span><strong>{stats.total || 0}</strong></div>
        </div>

        <section className="panel-card cx-panel">
          <div className="cx-filters">
            <div className="cx-search">
              <FiSearch />
              <input
                type="text"
                placeholder="Search title, student, room…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="cx-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select className="cx-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
              ))}
            </select>
            <select className="cx-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="All">All priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <p className="cx-count">
            {filteredComplaints.length === complaints.length
              ? `${complaints.length} complaints`
              : `Showing ${filteredComplaints.length} of ${complaints.length}`}
          </p>

          {loading ? (
            <p className="cx-empty">Loading complaints…</p>
          ) : filteredComplaints.length === 0 ? (
            <p className="cx-empty">No complaints match these filters.</p>
          ) : (
            <ul className="cx-list">
              {filteredComplaints.map((complaint) => (
                <li key={complaint._id} className={`cx-item status-${statusKey(complaint.status)}`}>
                  <div className="cx-item-main">
                    <div className="cx-item-top">
                      <h3>{complaint.title}</h3>
                      <span className={`cx-status ${statusKey(complaint.status)}`}>{complaint.status}</span>
                    </div>

                    <p className="cx-meta">
                      <span>{complaint.category}</span>
                      <span className={`cx-priority ${(complaint.priority || 'Medium').toLowerCase()}`}>{complaint.priority} priority</span>
                      <span><FiUser /> {complaint.studentName}</span>
                      {complaint.roomNumber && <span><FiHome /> Room {complaint.roomNumber}</span>}
                      {complaint.studentPhone && <span><FiPhone /> {complaint.studentPhone}</span>}
                      <span><FiCalendar /> {new Date(complaint.createdAt).toLocaleDateString()}</span>
                    </p>

                    <p className="cx-desc">{complaint.description}</p>

                    {complaint.adminResponse?.response && (
                      <p className="cx-reply"><strong>Reply:</strong> {complaint.adminResponse.response}</p>
                    )}
                  </div>

                  <div className="cx-item-actions">
                    <button className="primary-btn" onClick={() => openActionModal(complaint)}>
                      <FiMessageSquare /> Respond
                    </button>
                    {complaint.imageUrl && (
                      <button className="secondary-btn" onClick={() => setPreviewImage(complaint.imageUrl)}>
                        <FiImage /> Photo
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {selectedComplaint && (
        <div className="cx-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="cx-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="cx-modal-head">
              <h2>{selectedComplaint.title}</h2>
              <button className="cx-close" onClick={() => setSelectedComplaint(null)} aria-label="Close">
                <FiX />
              </button>
            </div>

            <div className="cx-modal-body">
              <dl className="cx-details">
                <div><dt>Student</dt><dd>{selectedComplaint.studentName}</dd></div>
                <div><dt>Room</dt><dd>{selectedComplaint.roomNumber || 'Not specified'}</dd></div>
                <div><dt>Phone</dt><dd>{selectedComplaint.studentPhone || 'Not provided'}</dd></div>
                <div><dt>Email</dt><dd>{selectedComplaint.studentEmail || 'N/A'}</dd></div>
                <div><dt>Category</dt><dd>{selectedComplaint.category}</dd></div>
                <div><dt>Submitted</dt><dd>{new Date(selectedComplaint.createdAt).toLocaleString()}</dd></div>
              </dl>

              <p className="cx-modal-desc">{selectedComplaint.description}</p>

              {selectedComplaint.imageUrl && (
                <img
                  src={imageSrc(selectedComplaint.imageUrl)}
                  alt="Complaint attachment"
                  className="cx-modal-image"
                  title="Click to enlarge"
                  onClick={() => setPreviewImage(selectedComplaint.imageUrl)}
                />
              )}

              <form id="response-form" onSubmit={handleSaveResponse} className="cx-form">
                <div className="cx-form-row">
                  <label>
                    Status
                    <select className="cx-select" value={responseStatus} onChange={(e) => setResponseStatus(e.target.value)}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </label>
                  <label>
                    Priority
                    <select className="cx-select" value={responsePriority} onChange={(e) => setResponsePriority(e.target.value)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </label>
                </div>

                <label>
                  Reply to student
                  <textarea
                    className="cx-textarea"
                    placeholder="What was done, or what the student should do next"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                </label>

                <div className="cx-templates">
                  <span>Common replies:</span>
                  {QUICK_RESPONSES.map((tmpl, idx) => (
                    <button key={idx} type="button" onClick={() => setResponseText(tmpl)}>
                      {tmpl}
                    </button>
                  ))}
                </div>
              </form>
            </div>

            <div className="cx-modal-foot">
              <button type="button" className="secondary-btn" onClick={() => setSelectedComplaint(null)}>
                Cancel
              </button>
              <button type="submit" form="response-form" className="primary-btn" disabled={submittingResponse}>
                <FiSend />
                {submittingResponse ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="cx-overlay" onClick={() => setPreviewImage(null)}>
          <div className="cx-preview" onClick={(e) => e.stopPropagation()}>
            <button className="cx-close" onClick={() => setPreviewImage(null)} aria-label="Close">
              <FiX />
            </button>
            <img src={imageSrc(previewImage)} alt="Full preview" />
          </div>
        </div>
      )}
    </div>
  );
}
