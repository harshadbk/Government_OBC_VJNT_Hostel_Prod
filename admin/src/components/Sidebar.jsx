import { NavLink } from 'react-router-dom';
import { FiGrid, FiUsers, FiUserPlus, FiSettings, FiLogOut, FiSun, FiMoon, FiBell, FiUpload, FiCheckSquare, FiClipboard } from 'react-icons/fi';
import { useEffect, useState, useRef } from 'react';

function Sidebar({ onLogout }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'dark');
  const [uploadsCount, setUploadsCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const lastCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/uploads/all', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const count = (data.uploads || []).length;
        setUploadsCount(count);
        if (lastCountRef.current && count > lastCountRef.current) {
          setPulse(true);
          setTimeout(() => setPulse(false), 2200);
        }
        lastCountRef.current = count;
      } catch (err) {
        // ignore
      }
    };
    fetchCount();
    const iv = setInterval(fetchCount, 10000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

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
        <NavLink to="/attendance"><FiCheckSquare /> Attendance</NavLink>
        <NavLink to="/add-user"><FiUserPlus /> Add User</NavLink>
        <NavLink to="/notices"><FiBell /> Notice Board</NavLink>
        <NavLink to="/staff"><FiUsers /> Staff</NavLink>
        <NavLink to="/uploads" className={({isActive}) => isActive ? 'active' : ''}>
          <FiUpload /> Uploads
          {uploadsCount > 0 && (
            <span className={`sidebar-badge ${pulse ? 'pulse' : ''}`}>{uploadsCount}</span>
          )}
        </NavLink>
        {/* <NavLink to="/profile"><FiSettings /> Profile</NavLink> */}
        <button className="sidebar-logout" onClick={() => {
          if (typeof onLogout === 'function') return onLogout();
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
          window.location.href = '/login';
        }}><FiLogOut /> Logout</button>
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
