import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function AdminUsers({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  const formatLastLogin = (value) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
  };

  const loadUsers = async () => {
    const token = getAdminToken();
    if (!token) {
      if (typeof onLogout === 'function') onLogout();
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/admin-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to load admin users.');
      }
      setUsers(data.users || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const requestDeleteOtp = async (userId) => {
    const token = getAdminToken();
    const response = await fetch(`${apiBaseUrl}/api/admin/admin-users/${userId}/request-delete-otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setMessage(data.message || 'OTP sent.');
    if (response.ok) {
      setOtpSent(true);
      setPendingUserId(userId);
      setOtp('');
    }
  };

  const handleDelete = async () => {
    if (!pendingUserId) return;
    const token = getAdminToken();
    const response = await fetch(`${apiBaseUrl}/api/admin/admin-users/${pendingUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp }),
    });
    const data = await response.json();
    setMessage(data.message || 'Action completed.');
    if (response.ok) {
      setOtpSent(false);
      setPendingUserId(null);
      setOtp('');
      await loadUsers();
    }
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Security</p>
            <h2>Admin Users</h2>
          </div>
        </header>
        {message ? <p className="form-error" style={{ marginBottom: '1rem' }}>{message}</p> : null}
        {otpSent ? (
          <div className="panel-card" style={{ marginBottom: '1rem' }}>
            <h3>Delete Verification</h3>
            <p>Enter the OTP sent to the root admin email to continue.</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
            <button className="primary-btn" onClick={handleDelete} style={{ marginTop: '0.5rem' }}>Confirm Delete</button>
          </div>
        ) : null}
        <div className="panel-card">
          {loading ? <p>Loading...</p> : (
            <ul className="user-list">
              {users.map((user) => (
                <li key={user._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <strong>{user.username}</strong>
                    <div style={{ color: 'var(--muted)' }}>{user.email}</div>
                    <div style={{ color: 'var(--muted)' }}>Role: {user.role}</div>
                    <div style={{ color: 'var(--muted)' }}>Last login: {formatLastLogin(user.lastLoginAt)}</div>
                  </div>
                  <button className="table-action" onClick={() => requestDeleteOtp(user._id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminUsers;
