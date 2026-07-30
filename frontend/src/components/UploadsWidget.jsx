import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX } from 'react-icons/fi';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);

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

  const handleFileChange = (e) => setSelectedFile(e.target.files?.[0] || null);

  const handleSubmit = async (uploadId) => {
    const token = localStorage.getItem('hostelToken');
    if (!token) {
      setLoginRequired(true);
      setMessage('Please login first to upload your document.');
      return;
    }
    if (!selectedFile) { setMessage('Please choose a file.'); return; }
    setMessage('Uploading...');
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      const res = await fetch(`${apiBaseUrl}/api/uploads/${uploadId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.message || 'Upload failed.'); return; }
      setMessage('Uploaded successfully.');
      setSelectedFile(null);
      fetchUploads();
    } catch (err) {
      console.error(err);
      setMessage('Upload failed.');
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9999 }}>
        <button onClick={() => setOpen((s) => !s)} className={pulse ? 'pulse' : ''} style={{ position: 'relative', borderRadius: 999, padding: '.8rem 1rem', background: 'linear-gradient(90deg,#72e3ff,#4f7cff)', border: 'none', color: '#07111f', fontWeight: 700, boxShadow: '0 8px 30px rgba(79,124,255,0.12)' }}>
          <FiUpload />  Uploads
          {count > 0 && <span style={{ position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20, padding: '0 .4rem', display: 'grid', placeItems: 'center', borderRadius: 999, background: '#fff', color: '#07111f', fontWeight: 700, boxShadow: '0 6px 18px rgba(79,124,255,0.12)' }}>{count}</span>}
        </button>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div style={{ width: '100%', maxWidth: 720, background: '#0b1220', padding: '1rem', borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
              <h3 style={{ margin: 0 }}>Uploads</h3>
              <button className="icon-btn" onClick={() => setOpen(false)}><FiX /></button>
            </div>
            {loading ? <p>Loading…</p> : (
              <div style={{ display: 'grid', gap: '.6rem' }}>
                {loginRequired && (
                  <div style={{ padding: '.9rem', borderRadius: 12, background: 'rgba(251,146,60,.12)', border: '1px solid rgba(251,146,60,.18)', color: '#ffb347' }}>
                    Please <button type="button" className="secondary-btn" onClick={() => { setOpen(false); navigate('/login'); }} style={{ marginLeft: '.4rem' }}>login</button> first to upload documents.
                  </div>
                )}
                {uploads.map(u => (
                  <div key={u._id} style={{ padding: '.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'grid', gap: '.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{u.title}</div>
                          <div style={{ color: 'var(--muted)' }}>{u.description}</div>
                        </div>
                        <div style={{ color: u.submitted ? '#20c997' : '#fbbf24', fontWeight: 700 }}>
                          {u.submitted ? 'Submitted' : 'Pending'}
                        </div>
                      </div>
                      {u.submitted && u.submission?.fileUrl && (
                        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isImageUrl(u.submission.fileUrl) ? (
                            <img src={u.submission.fileUrl} alt="your upload" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                          ) : isPdfUrl(u.submission.fileUrl) ? (
                            <a className="secondary-btn" href={u.submission.fileUrl} target="_blank" rel="noreferrer">View uploaded PDF</a>
                          ) : (
                            <a className="secondary-btn" href={u.submission.fileUrl} target="_blank" rel="noreferrer">View uploaded file</a>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                        <input type="file" onChange={handleFileChange} />
                        <button className="primary-btn" onClick={() => handleSubmit(u._id)}>{u.submitted ? 'Replace' : 'Upload'}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {message && <p style={{ marginTop: '.6rem' }}>{message}</p>}
          </div>
        </div>
      )}
    </>
  );
}
