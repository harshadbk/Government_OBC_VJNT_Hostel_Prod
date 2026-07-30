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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('adminToken')));
  const location = useLocation();

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    setIsLoggedIn(false);
  };

  return (
    <div className="admin-shell">
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/dashboard" element={isLoggedIn ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/users" element={isLoggedIn ? <Users /> : <Navigate to="/login" replace />} />
        <Route path="/users/:id" element={isLoggedIn ? <UserProfile onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/add-user" element={isLoggedIn ? <AddUser /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isLoggedIn ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/notices" element={isLoggedIn ? <NoticeBoard onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/uploads" element={isLoggedIn ? <Uploads /> : <Navigate to="/login" replace />} />
        <Route path="/uploads/:id" element={isLoggedIn ? <UploadDetails /> : <Navigate to="/login" replace />} />
        <Route path="/staff" element={isLoggedIn ? <StaffManagement /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
