import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { FiUpload, FiList, FiPlus, FiX, FiCheck, FiUser } from 'react-icons/fi';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export default function Uploads() {
  const [uploads, setUploads] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [details, setDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [docPreview, setDocPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
  const [feedback, setFeedback] = useState('');

  const token = localStorage.getItem('adminToken');

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/all`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUploads(data.uploads || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUploads(); }, []);

  const fetchUploadDetail = async (id) => {
    setLoadingDetails((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setDetails((prev) => ({ ...prev, [id]: data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBaseUrl}/api/uploads`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setFeedback(data.message || 'Failed'); return; }
      setFeedback('Upload request created');
      setShowCreate(false);
      setForm({ title: '', description: '', dueDate: '' });
      await fetchUploads();
    } catch (err) { setFeedback('Network error'); }
  };

  const isImageUrl = (url) => /\.(jpe?g|png|gif|jfif|webp)$/i.test(url);
  const isPdfUrl = (url) => /\.pdf$/i.test(url);

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={() => { localStorage.removeItem('adminToken'); window.location.href = '/admin/login'; }} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Management Panel</p>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><FiUpload /> Upload Requests</h2>
          </div>
          <div className="topbar-actions">
            <button className="primary-btn" onClick={() => setShowCreate(true)}><FiPlus /> New Request</button>
          </div>
        </header>

        <div className="panel-card">
          {feedback && <div style={{ marginBottom: '.8rem', padding: '.8rem', borderRadius: 8, background: 'rgba(52,211,153,.08)' }}>{feedback}</div>}
          {loading ? <p>Loading…</p> : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {uploads.map(u => (
                <div key={u._id} className="upload-card fade-in-scale">
                  <div className="upload-card-header">
                    <div>
                      <div className="upload-card-title">{u.title}</div>
                      <div className="upload-card-subtitle">{u.description}</div>
                    </div>
                    <div className="upload-meta">
                      <span className="upload-pill">Due: {u.dueDate ? new Date(u.dueDate).toLocaleDateString() : '—'}</span>
                      <span className="upload-pill">{u.submissions?.length || 0} uploaded</span>
                      <button className="secondary-btn upload-button" onClick={() => {
                        setExpanded((e) => ({ ...e, [u._id]: !e[u._id] }));
                        if (!details[u._id]) fetchUploadDetail(u._id);
                      }}>{expanded[u._id] ? 'Hide details' : 'View details'}</button>
                    </div>
                  </div>

                  {expanded[u._id] && (
                    <div style={{ marginTop: '.8rem', display: 'grid', gap: '.6rem' }}>
                      {loadingDetails[u._id] ? (
                        <div style={{ color: 'var(--muted)' }}>Loading student status…</div>
                      ) : details[u._id] ? (
                        <>
                          <div style={{ display: 'grid', gap: '.6rem' }}>
                            <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                              <div style={{ padding: '.75rem', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><strong>Submitted:</strong> {details[u._id].summary?.submittedCount ?? 0}</div>
                              <div style={{ padding: '.75rem', borderRadius: 12, background: 'rgba(255,255,255,.04)' }}><strong>Remaining:</strong> {details[u._id].summary?.remainingCount ?? 0}</div>
                            </div>

                            {details[u._id].studentStatus?.submitted?.length > 0 ? (
                              <div style={{ display: 'grid', gap: '.5rem' }}>
                                <div style={{ fontWeight: 700 }}>Submitted students</div>
                                {details[u._id].studentStatus.submitted.map((s) => (
                                  <div key={s.userId || s.username} style={{ padding: '.75rem', borderRadius: 10, background: 'rgba(255,255,255,.02)', display: 'grid', gap: '.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontWeight: 700 }}>{s.fullName || s.username}</div>
                                        <div style={{ color: 'var(--muted)' }}>{s.email || s.username}</div>
                                      </div>
                                      <div style={{ color: '#20c997' }}>{new Date(s.uploadedAt).toLocaleString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                      {s.fileUrl && isImageUrl(s.fileUrl) && (
                                        <img src={s.fileUrl} alt="submission" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                                      )}
                                      {s.fileUrl ? (
                                        <button className="view-doc-btn" onClick={() => setDocPreview(s.fileUrl)}>
                                          View Document
                                        </button>
                                      ) : (
                                        <span className="preview-badge">No document</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--muted)' }}>No student uploads yet.</div>
                            )}

                            {details[u._id].studentStatus?.pending?.length > 0 && (
                              <div style={{ display: 'grid', gap: '.4rem' }}>
                                <div style={{ fontWeight: 700 }}>Students remaining</div>
                                {details[u._id].studentStatus.pending.map((student) => (
                                  <div key={student.userId || student.username} style={{ padding: '.6rem', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
                                    <div style={{ fontWeight: 700 }}>{student.fullName || student.username}</div>
                                    <div style={{ color: 'var(--muted)' }}>{student.email || student.username}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'var(--muted)' }}>No detail available yet.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {docPreview && (
          <div className="nb-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDocPreview(null)}>
            <div className="nb-modal upload-modal">
              <div className="upload-modal-header">
                <h3 className="upload-modal-title">Document Preview</h3>
                <button className="icon-btn" onClick={() => setDocPreview(null)}><FiX /></button>
              </div>
              {isPdfUrl(docPreview) ? (
                <iframe src={docPreview} title="Document Preview" style={{ width: '100%', minHeight: '72vh', border: 'none', borderRadius: 18 }} />
              ) : (
                <img src={docPreview} alt="document preview" style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 18 }} />
              )}
              <div className="upload-action-row">
                <a className="secondary-btn" href={docPreview} target="_blank" rel="noreferrer">Open in new tab</a>
                <button className="primary-btn" onClick={() => setDocPreview(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="nb-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
            <div className="nb-modal">
              <div className="nb-modal-header">
                <h3>New Upload Request</h3>
                <button className="icon-btn" onClick={() => setShowCreate(false)}><FiX /></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="profile-field"><input placeholder="Title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="profile-field"><textarea placeholder="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
                <div className="profile-field"><input type="date" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="secondary-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button className="primary-btn" type="submit">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
