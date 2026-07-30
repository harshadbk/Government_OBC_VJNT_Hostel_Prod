import { useEffect, useState } from 'react';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const isImageUrl = (url) => /\.(jpe?g|png|gif|jfif|webp)$/i.test(url);
const isPdfUrl = (url) => /\.pdf$/i.test(url);

export default function UploadsPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchUploads = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('hostelToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${apiBaseUrl}/api/uploads`, { headers });
        const data = await res.json();
        if (!mounted) return;
        if (res.ok) {
          setUploads(data.uploads || []);
          setPendingCount(typeof data.pendingCount === 'number' ? data.pendingCount : (data.uploads || []).filter((u) => !u.submitted).length);
        }
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    fetchUploads();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h2>Uploads</h2>
      {loading ? <p>Loading…</p> : (
        <>
          <div style={{ marginBottom: '1rem', padding: '.9rem', borderRadius: 12, background: 'rgba(255,255,255,.03)', display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>Pending uploads:</strong> {pendingCount}</div>
            <div style={{ color: '#20c997', fontWeight: 700 }}>{uploads.filter((u) => u.submitted).length} completed</div>
          </div>
          <div style={{ display: 'grid', gap: '.9rem' }}>
            {uploads.map(u => (
              <div key={u._id} style={{ padding: '.9rem', borderRadius: 12, background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.title}</div>
                    <div style={{ color: 'var(--muted)' }}>{u.description}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Due: {u.dueDate ? new Date(u.dueDate).toLocaleDateString() : '—'}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: u.submitted ? '#20c997' : '#f59e0b' }}>{u.submitted ? 'Submitted' : 'Pending'}</div>
                </div>
                {u.submitted && u.submission?.fileUrl && (
                  <div style={{ marginTop: '.75rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {isImageUrl(u.submission.fileUrl) ? (
                      <img src={u.submission.fileUrl} alt="submitted" style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 12 }} />
                    ) : isPdfUrl(u.submission.fileUrl) ? (
                      <a className="secondary-btn" href={u.submission.fileUrl} target="_blank" rel="noreferrer">View uploaded PDF</a>
                    ) : (
                      <a className="secondary-btn" href={u.submission.fileUrl} target="_blank" rel="noreferrer">View uploaded file</a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
