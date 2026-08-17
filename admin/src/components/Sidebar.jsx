import { NavLink } from 'react-router-dom';
import { FiGrid, FiUsers, FiUserPlus, FiSettings, FiLogOut, FiSun, FiMoon, FiBell, FiUpload, FiCheckSquare, FiClipboard, FiMessageSquare, FiAlertCircle } from 'react-icons/fi';
import { useEffect, useState, useRef } from 'react';

function Sidebar({ onLogout }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'dark');
  const [uploadsCount, setUploadsCount] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [complaintPulse, setComplaintPulse] = useState(false);
  const lastCountRef = useRef(0);
  const lastComplaintCountRef = useRef(0);
  const role = localStorage.getItem('adminRole') || 'admin';
  const isAttendanceTaker = role === 'attendance_taker';

  useEffect(() => {
    let mounted = true;
    const fetchCounts = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      
      // Fetch uploads count
      try {
        const res = await fetch(`${apiBase}/api/uploads/all`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            const count = (data.uploads || []).length;
            setUploadsCount(count);
            if (lastCountRef.current && count > lastCountRef.current) {
              setPulse(true);
              setTimeout(() => setPulse(false), 2200);
            }
            lastCountRef.current = count;
          }
        }
      } catch (err) {}

      // Fetch pending complaints count
      try {
        const cRes = await fetch(`${apiBase}/api/complaints/stats`, { headers: { Authorization: `Bearer ${token}` } });
        if (cRes.ok) {
          const cData = await cRes.json();
          if (mounted) {
            const pCount = cData.pending || 0;
            setComplaintsCount(pCount);
            if (lastComplaintCountRef.current && pCount > lastComplaintCountRef.current) {
              setComplaintPulse(true);
              setTimeout(() => setComplaintPulse(false), 2200);
            }
            lastComplaintCountRef.current = pCount;
          }
        }
      } catch (err) {}
    };

    fetchCounts();
    const iv = setInterval(fetchCounts, 10000);
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
        {!isAttendanceTaker && <NavLink to="/dashboard"><FiGrid /> Dashboard</NavLink>}
        {!isAttendanceTaker && <NavLink to="/complaints" className={({isActive}) => isActive ? 'active' : ''}>
          <FiAlertCircle /> Complaint Box
          {complaintsCount > 0 && (
            <span className={`sidebar-badge ${complaintPulse ? 'pulse' : ''}`} style={{ backgroundColor: '#ef4444' }}>
              {complaintsCount}
            </span>
          )}
        </NavLink>}
        {!isAttendanceTaker && <NavLink to="/users"><FiUsers /> Users</NavLink>}
        <NavLink to="/attendance"><FiCheckSquare /> Attendance</NavLink>
        <NavLink to="/attendance-visuals"><FiCheckSquare /> Attendance Visuals</NavLink>
        {!isAttendanceTaker && <NavLink to="/add-user"><FiUserPlus /> Add User</NavLink>}
        {!isAttendanceTaker && <NavLink to="/notices"><FiBell /> Notice Board</NavLink>}
        {!isAttendanceTaker && <NavLink to="/staff"><FiUsers /> Staff</NavLink>}
        {!isAttendanceTaker && <NavLink to="/community"><FiMessageSquare /> Community</NavLink>}
        {!isAttendanceTaker && <NavLink to="/uploads" className={({isActive}) => isActive ? 'active' : ''}>
          <FiUpload /> Uploads
          {uploadsCount > 0 && (
            <span className={`sidebar-badge ${pulse ? 'pulse' : ''}`}>{uploadsCount}</span>
          )}
        </NavLink>}
        {!isAttendanceTaker && <NavLink to="/admin-users"><FiUsers /> Admin Users</NavLink>}
        <button className="sidebar-logout" onClick={() => {
          if (typeof onLogout === 'function') return onLogout();
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
          localStorage.removeItem('adminRole');
          window.location.href = '#/login';
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
