import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiDownload, FiUser } from 'react-icons/fi';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export default function UploadDetails() {
  const { id } = useParams();
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${apiBaseUrl}/api/uploads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setUpload(data.upload);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    fetchDetails();
  }, [id]);

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Upload Details</p>
            <h2>{upload?.title || 'Upload Request'}</h2>
          </div>
        </header>

        <div className="panel-card">
          {loading ? <p>Loading…</p> : (
            <div style={{ display: 'grid', gap: '.9rem' }}>
              <div style={{ fontWeight: 700 }}>{upload?.title}</div>
              <div style={{ color: 'var(--muted)' }}>{upload?.description}</div>
              <div style={{ color: 'var(--muted)' }}>Due: {upload?.dueDate ? new Date(upload.dueDate).toLocaleDateString() : '—'}</div>

              <h3 style={{ marginTop: '.6rem' }}>Submissions ({upload?.submissions?.length || 0})</h3>
              {(!upload?.submissions || upload.submissions.length === 0) ? (
                <p style={{ color: 'var(--muted)' }}>No submissions yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '.6rem' }}>
                  {upload.submissions.map(s => (
                    <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                        <FiUser />
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.username}</div>
                          <div style={{ color: 'var(--muted)' }}>{new Date(s.uploadedAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div>
                        <a href={s.fileUrl} target="_blank" rel="noreferrer" className="secondary-btn"><FiDownload /> View</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}