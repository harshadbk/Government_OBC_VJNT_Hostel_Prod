import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiRefreshCcw, FiCheckCircle, FiXCircle, FiClipboard, FiEye, FiX } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function LeaveManagement({ onLogout }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [comebackLeave, setComebackLeave] = useState(null);
  const [comebackDate, setComebackDate] = useState(new Date().toISOString().slice(0, 10));
  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  const fetchLeaves = async () => {
    const token = getAdminToken();
    if (!token) {
      if (typeof onLogout === 'function') onLogout();
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/leaves/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        if (typeof onLogout === 'function') onLogout();
        navigate('/login');
        return;
      }
      const data = await response.json();
      setLeaves(data.leaves || []);
    } catch (err) {
      console.error('Failed to fetch leave applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const getAttachmentPreviewType = (url = '') => {
    if (!url) return 'download';
    if (/\.(jpe?g|png|gif|jfif|webp|svg)$/i.test(url)) return 'image';
    if (/\.pdf$/i.test(url)) return 'pdf';
    if (/\.(txt|csv|json|md|log)$/i.test(url)) return 'text';
    return 'download';
  };

  const updateStatus = async (id, status) => {
    const token = getAdminToken();
    if (!token) return;
    setBusyId(id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/leaves/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        const data = await response.json();
        setLeaves((current) => current.map((item) => item._id === id ? { ...item, ...data.leaveApplication } : item));
      }
    } finally {
      setBusyId(null);
    }
  };

  const openComebackPrompt = (leave) => {
    setComebackLeave(leave);
    setComebackDate(new Date().toISOString().slice(0, 10));
  };

  const markComeback = async () => {
    if (!comebackLeave) return;
    const token = getAdminToken();
    if (!token) return;
    setBusyId(comebackLeave._id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/leaves/${comebackLeave._id}/comeback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comebackDate })
      });
      if (response.ok) {
        const data = await response.json();
        setLeaves((current) => current.map((item) => item._id === comebackLeave._id ? { ...item, ...data.leaveApplication } : item));
        setComebackLeave(null);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Leave Applications</p>
            <h2>Manage student leave requests</h2>
          </div>
          <button className="icon-button" onClick={fetchLeaves} aria-label="Refresh leaves"><FiRefreshCcw /></button>
        </header>

        <div className="panel-card">
          <div className="panel-head">
            <h3><FiClipboard /> Pending and reviewed leave requests</h3>
            <small>{leaves.length} total</small>
          </div>
          {loading ? (
            <p className="empty-state">Loading leave requests...</p>
          ) : leaves.length === 0 ? (
            <p className="empty-state">No leave applications yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Room</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Comeback</th>
                    <th>Attachment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>
                        <strong>{leave.fullName}</strong>
                        <div className="staff-info-row">{leave.username} - Room {leave.userId?.roomNumber || leave.roomNumber || 'N/A'}</div>
                      </td>
                      <td><strong>{leave.userId?.roomNumber || leave.roomNumber || 'N/A'}</strong></td>
                      <td>{leave.startDate} to {leave.endDate}</td>
                      <td>{leave.reason}</td>
                      <td>
                        <span className={`status-pill ${leave.status?.toLowerCase() || 'pending'}`}>
                          {leave.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        {leave.status === 'Approved' ? (
                          leave.comebackMarked ? (
                            <span className="status-pill approved">Returned {leave.comebackDate ? `on ${leave.comebackDate}` : ''}</span>
                          ) : (
                            <span className="status-pill pending">Awaiting comeback</span>
                          )
                        ) : (
                          <span className="staff-info-row">-</span>
                        )}
                      </td>
                      <td>
                        {leave.attachmentUrl ? <button className="table-action" onClick={() => setSelectedLeave(leave)}><FiEye /> View</button> : '-'}
                      </td>
                      <td>
                        <div className="staff-card-actions">
                          <button className="table-action" disabled={busyId === leave._id} onClick={() => updateStatus(leave._id, 'Approved')}><FiCheckCircle /> Approve</button>
                          <button className="table-action" disabled={busyId === leave._id} onClick={() => updateStatus(leave._id, 'Rejected')}><FiXCircle /> Reject</button>
                          {leave.status === 'Approved' && !leave.comebackMarked ? (
                            <button className="table-action" disabled={busyId === leave._id} onClick={() => openComebackPrompt(leave)}><FiCheckCircle /> Comeback</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedLeave && (
        <div className="leave-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedLeave(null)}>
          <div className="leave-modal-card attachment-only">
            <div className="leave-modal-header">
              <div>
                <h3><FiClipboard /> Attachment Preview</h3>
                <p>{selectedLeave.fullName} - {selectedLeave.username}</p>
              </div>
              <button type="button" className="leave-modal-close" onClick={() => setSelectedLeave(null)}><FiX /></button>
            </div>

            <div className="leave-attachment-preview">
              {selectedLeave.attachmentUrl ? (
                getAttachmentPreviewType(selectedLeave.attachmentUrl) === 'image' ? (
                  <img src={selectedLeave.attachmentUrl} alt="Leave attachment" className="leave-attachment-image" />
                ) : getAttachmentPreviewType(selectedLeave.attachmentUrl) === 'pdf' ? (
                  <iframe src={selectedLeave.attachmentUrl} className="leave-attachment-iframe" title="Leave attachment" />
                ) : (
                  <div className="leave-attachment-fallback">
                    <p>This file type cannot be previewed inline.</p>
                    <a href={selectedLeave.attachmentUrl} target="_blank" rel="noreferrer">Open attachment in new tab</a>
                  </div>
                )
              ) : (
                <p>No attachment uploaded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {comebackLeave && (
        <div className="leave-modal-overlay" onClick={(e) => e.target === e.currentTarget && setComebackLeave(null)}>
          <div className="leave-modal-card attachment-only">
            <div className="leave-modal-header">
              <div>
                <h3><FiCheckCircle /> Mark Comeback</h3>
                <p>{comebackLeave.fullName} - Room {comebackLeave.userId?.roomNumber || comebackLeave.roomNumber || 'N/A'}</p>
              </div>
              <button type="button" className="leave-modal-close" onClick={() => setComebackLeave(null)}><FiX /></button>
            </div>

            <div className="leave-form-grid">
              <label className="leave-field leave-field-full">
                <span>Comeback date</span>
                <input type="date" value={comebackDate} onChange={(e) => setComebackDate(e.target.value)} required />
              </label>
              <p className="attendance-muted leave-field-full">
                Are you sure? From this date, attendance marking will start again for this student.
              </p>
              <div className="leave-actions leave-field-full">
                <button type="button" className="leave-submit-btn primary-btn" disabled={busyId === comebackLeave._id || !comebackDate} onClick={markComeback}>
                  <span className="leave-submit-label">{busyId === comebackLeave._id ? 'Saving...' : 'Yes, Mark Comeback'}</span>
                </button>
                <button type="button" className="secondary-btn" onClick={() => setComebackLeave(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveManagement;
