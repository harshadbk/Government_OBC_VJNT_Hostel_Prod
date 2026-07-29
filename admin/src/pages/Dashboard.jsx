import Sidebar from '../components/Sidebar';
import { FiBell, FiUsers, FiHome, FiBook, FiGrid } from 'react-icons/fi';

function Dashboard({ onLogout }) {
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
          <div className="stat-card"><h3>Total Students</h3><p>248</p></div>
          <div className="stat-card"><h3>Hostel Blocks</h3><p>6</p></div>
          <div className="stat-card"><h3>Rooms</h3><p>112</p></div>
          <div className="stat-card"><h3>Users</h3><p>24</p></div>
        </div>

        <div className="dashboard-grid">
          <div className="panel-card">
            <div className="panel-head"><h3>Recent Users</h3><a href="#">View all</a></div>
            <ul className="user-list">
              <li><span>Sarah Khan</span><small>Room A-204</small></li>
              <li><span>Daniel Cruz</span><small>Room B-118</small></li>
              <li><span>Emily Chen</span><small>Room C-212</small></li>
            </ul>
          </div>
          <div className="panel-card">
            <div className="panel-head"><h3>Management Panel</h3></div>
            <div className="quick-actions">
              <button><FiUsers /> Manage Residents</button>
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
