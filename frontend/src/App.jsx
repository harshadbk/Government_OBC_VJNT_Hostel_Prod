import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import './css/Global.css';

const defaultUser = {
  fullName: 'Ava Thompson',
  rollNumber: 'CSE-202301',
  email: 'ava.thompson@college.edu',
  phone: '+1 555 0198',
  department: 'Computer Science',
  year: '2nd Year',
  gender: 'Female',
  hostelBlock: 'North Tower',
  roomNumber: 'A-204',
  address: '19 River View Road, Seattle'
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('hostelToken'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('hostelUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('hostelProfileImage') || '');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const handleLogin = useCallback((loggedInUser, tokenValue, imageUrl) => {
    setUser(loggedInUser);
    setToken(tokenValue);
    if (imageUrl) {
      setProfileImage(imageUrl);
      localStorage.setItem('hostelProfileImage', imageUrl);
    }
    localStorage.setItem('hostelUser', JSON.stringify(loggedInUser));
    localStorage.setItem('hostelToken', tokenValue);
  }, []);

  const handleSignup = useCallback((signupUser, imageUrl) => {
    handleLogin(signupUser, token, imageUrl);
  }, [handleLogin, token]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setProfileImage('');
    localStorage.removeItem('hostelUser');
    localStorage.removeItem('hostelProfileImage');
    localStorage.removeItem('hostelToken');
  };

  const handleProfileUpdate = useCallback((updatedUser, imageUrl) => {
    setUser((currentUser) => {
      const nextUser = { ...(currentUser || {}), ...updatedUser };
      localStorage.setItem('hostelUser', JSON.stringify(nextUser));
      return nextUser;
    });

    if (typeof imageUrl === 'string') {
      setProfileImage(imageUrl);
      if (imageUrl) {
        localStorage.setItem('hostelProfileImage', imageUrl);
      } else {
        localStorage.removeItem('hostelProfileImage');
      }
    }
  }, []);

  const currentUser = useMemo(() => user || defaultUser, [user]);

  if (!authReady) {
    return null;
  }

  return (
    <div className="app-shell">
      <Navbar user={user} profileImage={profileImage} onLogout={handleLogout} />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to="/profile" replace /> : <Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/profile" element={user ? <Profile user={currentUser} profileImage={profileImage} onProfileUpdate={handleProfileUpdate} onProfileImageChange={setProfileImage} token={token} /> : <Navigate to="/login" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
