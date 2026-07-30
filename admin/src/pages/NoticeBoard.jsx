import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiBell, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertTriangle, FiInfo, FiAlertCircle, FiCalendar, FiSearch } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const SEVERITY_CONFIG = {
  low:    { label: 'Low',    color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: <FiInfo /> },
  medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: <FiAlertTriangle /> },
  high:   { label: 'High',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: <FiAlertCircle /> },
};

const emptyForm = { title: '', content: '', severity: 'low' };

export default function NoticeBoard({ onLogout }) {
  const navigate = useNavigate();
  const getToken = () => localStorage.getItem('adminToken');

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editNotice, setEditNotice] = useState(null); // null = create mode
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [highlightedNoticeId, setHighlightedNoticeId] = useState(null);

  // search
  const [search, setSearch] = useState('');

  // ── Fetch notices ─────────────────────────────────────────────────────────────
  const fetchNotices = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        handleAuthFailure();
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/notices/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotices(data.notices || []);
        setTotal(data.total || 0);
      } else if (res.status === 401 || res.status === 403) {
        handleAuthFailure();
      } else {
        console.error(data.message);
      }
    } catch (err) {
      console.error('Failed to fetch notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotices(); }, []);

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditNotice(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (notice) => {
    setEditNotice(notice);
    setForm({ title: notice.title, content: notice.content, severity: notice.severity });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditNotice(null);
    setFormError('');
    setSaveSuccess('');
  };

  const handleAuthFailure = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    navigate('/login');
  };

  const showFeedback = (message) => {
    setFeedback(message);
    window.clearTimeout(showFeedback.timeout);
    showFeedback.timeout = window.setTimeout(() => setFeedback(''), 3500);
  };

  // ── Submit form ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setFormError('Title and content are required.');
      return;
    }
    const token = getToken();
    if (!token) {
      handleAuthFailure();
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const url    = editNotice ? `${apiBaseUrl}/api/notices/${editNotice._id}` : `${apiBaseUrl}/api/notices`;
      const method = editNotice ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleAuthFailure();
          return;
        }
        setFormError(data.message || 'Failed to save notice.');
        return;
      }

      const savedNotice = data.notice || null;
      setHighlightedNoticeId(savedNotice?._id || null);
      setSaveSuccess(editNotice ? 'Notice updated successfully.' : 'Notice posted successfully.');
      await fetchNotices();
      if (savedNotice?._id) {
        window.setTimeout(() => {
          document.getElementById(`notice-${savedNotice._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const token = getToken();
      const res = await fetch(`${apiBaseUrl}/api/notices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showFeedback('Notice deleted successfully.');
      } else if (res.status === 401 || res.status === 403) {
        handleAuthFailure();
        return;
      }
      await fetchNotices();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteId(null);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = notices.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const isNew = (createdAt) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 3 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">

        {/* ── Topbar ── */}
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Management Panel</p>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <FiBell /> Notice Board
            </h2>
          </div>
          <div className="topbar-actions">
            <span style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
              {total} notice{total !== 1 ? 's' : ''} total
            </span>
            <button id="nb-add-btn" className="primary-btn" onClick={openCreate}>
              <FiPlus /> Add Notice
            </button>
          </div>
        </header>

        {/* ── Stats row ── */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {['high', 'medium', 'low'].map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const count = notices.filter((n) => n.severity === sev).length;
            return (
              <div key={sev} className="stat-card" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                <h3 style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  {cfg.icon} {cfg.label} Priority
                </h3>
                <p style={{ color: cfg.color }}>{count}</p>
              </div>
            );
          })}
        </div>

        {/* ── Search bar ── */}
        <div className="nb-search-row">
          <FiSearch style={{ color: 'var(--muted)' }} />
          <input
            id="nb-search"
            className="table-search"
            placeholder="Search notices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ── Notices list ── */}
        <div className="panel-card">
          <div className="panel-head">
            <h3>All Notices</h3>
          </div>

          {feedback ? (
            <div style={{ marginBottom: '.8rem', padding: '.8rem 1rem', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.14)', color: '#10b981', fontWeight: 600 }}>
              {feedback}
            </div>
          ) : null}

          {loading ? (
            <p style={{ color: 'var(--muted)', padding: '1rem' }}>Loading notices…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--muted)', padding: '1rem' }}>
              {search ? 'No notices match your search.' : 'No notices yet. Click "Add Notice" to create one.'}
            </p>
          ) : (
            <div className="nb-notice-list">
              {filtered.map((notice) => {
                const cfg = SEVERITY_CONFIG[notice.severity] || SEVERITY_CONFIG.low;
                const fresh = isNew(notice.createdAt);
                return (
                  <div
                    key={notice._id}
                    id={`notice-${notice._id}`}
                    className={`nb-notice-row${highlightedNoticeId === notice._id ? ' highlighted' : ''}`}
                    style={{
                      borderLeft: `3px solid ${cfg.color}`,
                    }}
                  >
                    <div className="nb-notice-icon" style={{ color: cfg.color }}>{cfg.icon}</div>
                    <div className="nb-notice-body">
                      <div className="nb-notice-title-row">
                        <span className="nb-notice-title">{notice.title}</span>
                        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {fresh && <span className="nb-new-badge">NEW</span>}
                          <span className="nb-severity-pill" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                      <p className="nb-notice-content">{notice.content}</p>
                      <span className="nb-notice-date">
                        <FiCalendar style={{ marginRight: '.3rem' }} />
                        {new Date(notice.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="nb-notice-actions">
                      <button
                        id={`edit-${notice._id}`}
                        className="table-action"
                        title="Edit"
                        onClick={() => openEdit(notice)}
                      >
                        <FiEdit2 />
                      </button>
                      {deleteId === notice._id ? (
                        <div style={{ display: 'flex', gap: '.3rem' }}>
                          <button
                            className="table-action"
                            style={{ background: 'rgba(248,113,113,0.25)', color: '#f87171' }}
                            onClick={() => handleDelete(notice._id)}
                          >
                            <FiCheck />
                          </button>
                          <button
                            className="table-action"
                            onClick={() => setDeleteId(null)}
                          >
                            <FiX />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`delete-${notice._id}`}
                          className="table-action"
                          title="Delete"
                          style={{ color: '#f87171' }}
                          onClick={() => setDeleteId(notice._id)}
                        >
                          <FiTrash2 />
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

      {/* ── Modal ── */}
      {showModal && (
        <div className="nb-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="nb-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="nb-modal-header">
              <h3 id="modal-title">{editNotice ? 'Edit Notice' : 'New Notice'}</h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Close"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              {/* Title */}
              <div className="profile-field">
                <input
                  id="notice-title"
                  type="text"
                  placeholder="Notice Headline *"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                  required
                />
              </div>

              {/* Content */}
              <div className="profile-field">
                <textarea
                  id="notice-content"
                  placeholder="Notice content / description *"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={5}
                  required
                  style={{
                    padding: '.9rem .85rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,.06)',
                    background: 'transparent',
                    color: 'var(--text)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Severity */}
              <div>
                <label style={{ color: 'var(--muted)', fontSize: '.85rem', display: 'block', marginBottom: '.4rem' }}>
                  Severity
                </label>
                <div style={{ display: 'flex', gap: '.6rem' }}>
                  {['low', 'medium', 'high'].map((sev) => {
                    const cfg = SEVERITY_CONFIG[sev];
                    const active = form.severity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        id={`severity-${sev}`}
                        onClick={() => setForm((f) => ({ ...f, severity: sev }))}
                        style={{
                          flex: 1,
                          padding: '.65rem',
                          border: `1.5px solid ${active ? cfg.color : 'rgba(255,255,255,.1)'}`,
                          borderRadius: '10px',
                          background: active ? cfg.bg : 'transparent',
                          color: active ? cfg.color : 'var(--muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '.35rem',
                          fontWeight: active ? '700' : '400',
                          transition: 'all .15s ease',
                        }}
                      >
                        {cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <p style={{ color: '#f87171', margin: 0, fontSize: '.9rem' }}>{formError}</p>
              )}
              {saveSuccess && (
                <p style={{ color: '#10b981', margin: 0, fontSize: '.95rem' }}>{saveSuccess}</p>
              )}

              <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-btn" onClick={closeModal}>Cancel</button>
                <button id="nb-submit-btn" type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving…' : editNotice ? 'Update Notice' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
