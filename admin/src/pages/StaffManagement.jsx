import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', position: '', email: '', phone: '', image: null });
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('adminToken');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/staff`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load staff.');
      setStaff(data.staff || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', position: '', email: '', phone: '', image: null });
    setShowForm(false);
    setFeedback('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback('');
    if (!form.name.trim()) {
      setFeedback('Name is required.');
      return;
    }
    try {
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('position', form.position.trim());
      body.append('email', form.email.trim());
      body.append('phone', form.phone.trim());
      if (form.image) body.append('image', form.image);

      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `${apiBaseUrl}/api/staff/${editing._id}` : `${apiBaseUrl}/api/staff`;
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed.');

      setFeedback(editing ? 'Staff member updated.' : 'Staff member added.');
      await fetchStaff();
      resetForm();
    } catch (err) {
      setFeedback(err.message);
    }
  };

  const handleEdit = (member) => {
    setEditing(member);
    setForm({ name: member.name || '', position: member.position || '', email: member.email || '', phone: member.phone || '', image: null });
    setShowForm(true);
    setFeedback('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/staff/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed.');
      setStaff((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={() => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUsername'); navigate('/login'); }} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Admin Staff Management</p>
            <h2>Staff Members</h2>
          </div>
          <div className="topbar-actions">
            <button className="primary-btn" onClick={() => { resetForm(); setShowForm(true); }}>
              Add Staff
            </button>
          </div>
        </header>

        <div className="panel-card">
          {feedback && <div className="status-message">{feedback}</div>}
          {loading ? (
            <p>Loading staff members…</p>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : (
            <div className="staff-grid admin-staff-grid">
              {staff.map((member) => (
                <div key={member._id} className="staff-card admin-staff-card">
                  <div className="staff-card-image-wrap">
                    <img src={member.imageUrl || ''} alt={member.name} />
                  </div>
                  <div className="staff-card-content">
                    <h3>{member.name}</h3>
                    <span className="staff-designation">{member.position || '—'}</span>
                    <div className="staff-info-row"><strong>Email:</strong> {member.email || '—'}</div>
                    <div className="staff-info-row"><strong>Phone:</strong> {member.phone || '—'}</div>
                  </div>
                  <div className="staff-card-actions">
                    <button className="secondary-btn" onClick={() => handleEdit(member)}>Edit</button>
                    <button className="secondary-btn danger-btn" onClick={() => handleDelete(member._id)}>Delete</button>
                  </div>
                </div>
              ))}
              {staff.length === 0 && <p>No staff members yet. Add one using the button above.</p>}
            </div>
          )}
        </div>

        {showForm && (
          <div className="nb-modal-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
            <div className="nb-modal upload-modal">
              <div className="upload-modal-header">
                <h3>{editing ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
                <button className="icon-btn" onClick={resetForm} aria-label="Close">×</button>
              </div>
              <form onSubmit={handleSubmit} className="upload-input-row">
                <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <label className="file-input-label">
                  {form.image ? form.image.name : 'Upload staff image'}
                  <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
                </label>
                <div className="upload-action-row">
                  <button type="button" className="secondary-btn" onClick={resetForm}>Cancel</button>
                  <button className="primary-btn" type="submit">{editing ? 'Save' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
