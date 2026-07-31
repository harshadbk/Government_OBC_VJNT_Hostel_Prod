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
  const [previewMode, setPreviewMode] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const getFileExtension = (url = '') => {
    if (!url) return '';
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  };

  const isImageUrl = (url) => /\.(jpe?g|png|gif|jfif|webp)$/i.test(url);
  const isPdfUrl = (url) => /\.pdf$/i.test(url);
  const isOfficeDocUrl = (url) => /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(url);
  const isTextUrl = (url) => /\.(txt|csv|json|md|log)$/i.test(url);

  const getPreviewMode = (url = '') => {
    if (!url) return 'none';
    if (isImageUrl(url)) return 'image';
    if (isPdfUrl(url)) return 'pdf';
    if (isOfficeDocUrl(url)) return 'office';
    if (isTextUrl(url)) return 'text';
    return 'download';
  };

  const openPreview = async (url) => {
    if (!url) return;
    const mode = getPreviewMode(url);
    setPreviewMode(mode);
    setPreviewText('');
    setDocPreview(url);

    if (mode === 'text') {
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
    setDocPreview(null);
    setPreviewMode('');
    setPreviewText('');
    setPreviewLoading(false);
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={() => { localStorage.removeItem('adminToken'); window.location.href = '#/login'; }} />
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

        <div className="panel-card" style={{ maxHeight: '72vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {feedback && <div style={{ marginBottom: '.8rem', padding: '.8rem', borderRadius: 8, background: 'rgba(52,211,153,.08)' }}>{feedback}</div>}
          {loading ? <p>Loading…</p> : (
            <div style={{ display: 'grid', gap: '1rem', overflowY: 'auto', paddingRight: '0.25rem', flex: 1 }}>
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
                                        <button className="view-doc-btn" onClick={() => openPreview(s.fileUrl)}>
                                          {getPreviewMode(s.fileUrl) === 'download' ? 'Open File' : 'Preview'}
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
          <div className="nb-modal-overlay" onClick={(e) => e.target === e.currentTarget && closePreview()}>
            <div className="nb-modal upload-modal">
              <div className="upload-modal-header">
                <h3 className="upload-modal-title">Document Preview</h3>
                <button className="icon-btn" onClick={closePreview}><FiX /></button>
              </div>

              {previewMode === 'image' ? (
                <img src={docPreview} alt="document preview" style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 18 }} />
              ) : previewMode === 'pdf' || previewMode === 'office' ? (
                <iframe
                  src={previewMode === 'office' ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docPreview)}` : `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(docPreview)}`}
                  title="Document Preview"
                  style={{ width: '100%', minHeight: '72vh', border: 'none', borderRadius: 18 }}
                />
              ) : previewMode === 'text' ? (
                <div style={{ width: '100%', minHeight: '72vh', maxHeight: '72vh', overflow: 'auto', background: 'rgba(255,255,255,.03)', borderRadius: 18, padding: '1rem' }}>
                  {previewLoading ? <p style={{ color: 'var(--muted)' }}>Loading preview…</p> : <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{previewText || 'No text content available.'}</pre>}
                </div>
              ) : (
                <div style={{ padding: '1rem 0', color: 'var(--muted)' }}>This file type cannot be previewed directly. You can still open it in a new tab.</div>
              )}

              <div className="upload-action-row">
                <a className="secondary-btn" href={docPreview} target="_blank" rel="noreferrer">Open in new tab</a>
                <button className="primary-btn" onClick={closePreview}>Close</button>
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
