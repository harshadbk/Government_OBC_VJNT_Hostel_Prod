import { NavLink } from 'react-router-dom';
import { FiGrid, FiUsers, FiUserPlus, FiSettings, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useEffect, useState } from 'react';

function Sidebar({ onLogout }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  return (
    <aside className="sidebar admin-sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">A</div>
        <div>
          <h3>Admin Suite</h3>
          <p>Hostel Control</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard"><FiGrid /> Dashboard</NavLink>
        <NavLink to="/users"><FiUsers /> Users</NavLink>
        <NavLink to="/add-user"><FiUserPlus /> Add User</NavLink>
        {/* <NavLink to="/profile"><FiSettings /> Profile</NavLink> */}
        <button className="sidebar-logout" onClick={onLogout}><FiLogOut /> Logout</button>
      </nav>
      <div style={{ marginTop: '1rem' }}>
        <button className="icon-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme">
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
