import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import AddUser from './pages/AddUser';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import NoticeBoard from './pages/NoticeBoard';
import Uploads from './pages/Uploads';
import './css/Global.css';
import UploadDetails from './pages/UploadDetails';
import StaffManagement from './pages/StaffManagement';
import Attendance from './pages/Attendance';
import AttendanceVisuals from './pages/AttendanceVisuals';
import LeaveManagement from './pages/LeaveManagement';
import AdminUsers from './pages/AdminUsers';
import HostelNexus from './pages/HostelNexus';

const getValidToken = () => {
  const token = localStorage.getItem('adminToken');
  if (!token || token === 'null' || token === 'undefined') {
    localStorage.removeItem('adminToken');
    return null;
  }
  return token;
};

const getStoredRole = () => localStorage.getItem('adminRole') || 'admin';

function ProtectedRoute({ children, allowedRoles, onLogout, fallbackPath }) {
  const token = getValidToken();
  const role = getStoredRole();

  if (!token) {
    if (typeof onLogout === 'function') onLogout();
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    window.alert('You do not have access to this section.');
    return <Navigate to={fallbackPath || (role === 'attendance_taker' ? '/attendance' : '/login')} replace />;
  }

  return children;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getValidToken()));

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRole');
    setIsLoggedIn(false);
  };

  return (
    <div className="admin-shell">
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to={getStoredRole() === 'attendance_taker' ? '/attendance' : '/dashboard'} replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to={getStoredRole() === 'attendance_taker' ? '/attendance' : '/dashboard'} replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><Dashboard onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><Users onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><UserProfile onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/add-user" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><AddUser onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><Profile onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/notices" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><NoticeBoard onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/uploads" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><Uploads onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/uploads/:id" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><UploadDetails onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><StaffManagement onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'attendance_taker']} onLogout={handleLogout} fallbackPath="/login"><Attendance onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/attendance-visuals" element={<ProtectedRoute allowedRoles={['admin', 'attendance_taker']} onLogout={handleLogout} fallbackPath="/login"><AttendanceVisuals onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><LeaveManagement onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/admin-users" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><AdminUsers onLogout={handleLogout} /></ProtectedRoute>} />
        <Route path="/hostel-nexus" element={<ProtectedRoute allowedRoles={['admin']} onLogout={handleLogout} fallbackPath="/login"><HostelNexus onLogout={handleLogout} /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
