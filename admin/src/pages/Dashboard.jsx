import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiBell, FiUsers, FiHome, FiBook, FiGrid } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Dashboard({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch users for dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Get recently added 4 users
  const recentUsers = users.slice(0, 4);

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Operations Overview</p>
            <h2>Admin Dashboard</h2>
          </div>
          <div className="topbar-actions">
            <button className="icon-button"><FiBell /></button>
            <div className="profile-pill">
              <div className="brand-icon">A</div>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card"><h3>Total Students</h3><p>80</p></div>
          <div className="stat-card"><h3>Hostel Blocks</h3><p>3</p></div>
          <div className="stat-card"><h3>Rooms</h3><p>20</p></div>
          <div className="stat-card"><h3>Total Users</h3><p>{loading ? '...' : users.length}</p></div>
        </div>

        <div className="dashboard-grid">
          <div className="panel-card">
            <div className="panel-head">
              <h3>Recently Added Users</h3>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/users'); }}>View all</a>
            </div>
            {loading ? (
              <p style={{ padding: '1rem', color: 'var(--muted)' }}>Loading users...</p>
            ) : recentUsers.length > 0 ? (
              <ul className="user-list">
                {recentUsers.map(user => (
                  <li key={user._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600' }}>{user.fullName || user.username}</span>
                      <small style={{ color: 'var(--muted)' }}>@{user.username}</small>
                    </div>
                    <small style={{ color: 'var(--primary)', fontWeight: '500' }}>
                      Room {user.roomNumber || 'N/A'}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ padding: '1rem', color: 'var(--muted)' }}>No users found.</p>
            )}
          </div>
          <div className="panel-card">
            <div className="panel-head"><h3>Management Panel</h3></div>
            <div className="quick-actions">
              <button onClick={() => navigate('/users')}><FiUsers /> Manage Residents</button>
              <button><FiBook /> Announcements</button>
              <button><FiGrid /> Room Overview</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
