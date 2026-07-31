import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiFile, FiCheckCircle, FiClock, FiImage, FiExternalLink } from 'react-icons/fi';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
import './uploadwidget.css';

const isImageUrl = (url) => /\.(jpe?g|png|gif|jfif|webp)$/i.test(url);
const isPdfUrl = (url) => /\.pdf$/i.test(url);

export default function UploadsWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const lastCountRef = useRef(0);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hostelToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${apiBaseUrl}/api/uploads`, { headers });
      const data = await res.json();
      if (res.ok) {
        setUploads(data.uploads || []);
        const newCount = typeof data.pendingCount === 'number' ? data.pendingCount : (data.uploads || []).filter((u) => !u.submitted).length;
        setCount(newCount);
        if (lastCountRef.current && newCount < lastCountRef.current) {
          setPulse(true);
          setTimeout(() => setPulse(false), 2200);
        }
        lastCountRef.current = newCount;
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUploads(); }, []);

  const handleFileChange = (e, uploadId) => {
    const file = e.target.files?.[0] || null;
    setSelectedFiles(prev => ({ ...prev, [uploadId]: file }));
  };

  const handleSubmit = async (uploadId) => {
    const token = localStorage.getItem('hostelToken');
    if (!token) {
      setLoginRequired(true);
      setMessage('Please login first to upload your document.');
      setMessageType('warning');
      return;
    }
    const file = selectedFiles[uploadId];
    if (!file) { setMessage('Please choose a file first.'); setMessageType('warning'); return; }
    setMessage('Uploading...');
    setMessageType('info');
    setUploadingId(uploadId);
    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await fetch(`${apiBaseUrl}/api/uploads/${uploadId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.message || 'Upload failed.'); setMessageType('error'); return; }
      setMessage('Uploaded successfully!');
      setMessageType('success');
      setSelectedFiles(prev => ({ ...prev, [uploadId]: null }));
      fetchUploads();
    } catch (err) {
      console.error(err);
      setMessage('Upload failed. Please try again.');
      setMessageType('error');
    } finally {
      setUploadingId(null);
      setTimeout(() => { setMessage(''); setMessageType(''); }, 4000);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="upload-fab-container">
        <button onClick={() => setOpen((s) => !s)} className={`upload-fab ${pulse ? 'pulse' : ''}`}>
          <FiUpload />
          <span>Uploads</span>
          {count > 0 && <span className="upload-fab-badge">{count}</span>}
        </button>
      </div>

      {/* Modal Overlay */}
      {open && (
        <div className="upload-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="upload-modal">
            {/* Sticky Header */}
            <div className="upload-modal-header">
              <div className="upload-modal-title">
                <FiUpload className="upload-modal-title-icon" />
                <div>
                  <h3>Uploads</h3>
                  <p className="upload-modal-subtitle">
                    {count > 0 ? `${count} pending` : 'All up to date'} · {uploads.filter(u => u.submitted).length} submitted
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)}><FiX /></button>
            </div>

            {/* Scrollable Body */}
            <div className="upload-modal-body">
              {loginRequired && (
                <div className="upload-login-alert">
                  <FiClock />
                  <span>
                    Please{' '}
                    <button type="button" className="upload-login-link" onClick={() => { setOpen(false); navigate('/login'); }}>
                      login
                    </button>{' '}
                    first to upload documents.
                  </span>
                </div>
              )}

              {loading ? (
                <div className="upload-loading">
                  <div className="upload-spinner" />
                  <p>Loading uploads…</p>
                </div>
              ) : uploads.length === 0 ? (
                <div className="upload-empty">
                  <FiFile className="upload-empty-icon" />
                  <p>No uploads available</p>
                </div>
              ) : (
                uploads.map(u => (
                  <div key={u._id} className={`upload-card ${u.submitted ? 'submitted' : 'pending'}`}>
                    <div className="upload-card-content">
                      {/* Header Row */}
                      <div className="upload-card-header">
                        <div className="upload-card-info">
                          <h4>{u.title}</h4>
                          {u.description && <p>{u.description}</p>}
                        </div>
                        <span className={u.submitted ? 'status-submitted' : 'status-pending'}>
                          {u.submitted ? <><FiCheckCircle /> Submitted</> : <><FiClock /> Pending</>}
                        </span>
                      </div>

                      {/* Preview */}
                      {u.submitted && u.submission?.fileUrl && (
                        <div className="upload-preview">
                          {isImageUrl(u.submission.fileUrl) ? (
                            <img src={u.submission.fileUrl} alt="your upload" className="upload-image" />
                          ) : isPdfUrl(u.submission.fileUrl) ? (
                            <a className="upload-view-link" href={u.submission.fileUrl} target="_blank" rel="noreferrer">
                              <FiExternalLink /> View PDF
                            </a>
                          ) : (
                            <a className="upload-view-link" href={u.submission.fileUrl} target="_blank" rel="noreferrer">
                              <FiExternalLink /> View file
                            </a>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="upload-actions">
                        <label className="upload-file-label">
                          <FiImage />
                          <span>{selectedFiles[u._id]?.name || 'Choose file'}</span>
                          <input type="file" onChange={(e) => handleFileChange(e, u._id)} hidden />
                        </label>
                        <button
                          className="upload-submit-btn"
                          onClick={() => handleSubmit(u._id)}
                          disabled={uploadingId === u._id}
                        >
                          {uploadingId === u._id ? (
                            <><div className="upload-btn-spinner" /> Uploading…</>
                          ) : (
                            <><FiUpload /> {u.submitted ? 'Replace' : 'Upload'}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {message && (
              <div className={`upload-modal-footer ${messageType}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
