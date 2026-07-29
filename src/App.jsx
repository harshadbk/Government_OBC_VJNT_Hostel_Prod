import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import './css/Global.css';

const defaultUser = {
  fullName: 'Rahul Patil',
  rollNumber: 'OBC-202501',
  email: 'rahul.patil@college.edu',
  phone: '+91 98765 43210',
  department: 'Computer Science',
  year: '2nd Year',
  gender: 'Male',
  hostelBlock: 'Main Block',
  roomNumber: 'A-104',
  address: 'Miraj, Sangli, Maharashtra'
};

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('hostelUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('hostelProfileImage') || '');
  const [authReady, setAuthReady] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('hostelDarkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('hostelDarkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  const handleLogin = (loggedInUser, imageUrl) => {
    const nextUser = { ...defaultUser, ...loggedInUser };
    setUser(nextUser);
    if (imageUrl) {
      setProfileImage(imageUrl);
      localStorage.setItem('hostelProfileImage', imageUrl);
    }
    localStorage.setItem('hostelUser', JSON.stringify(nextUser));
  };

  const handleSignup = (signupUser, imageUrl) => {
    handleLogin(signupUser, imageUrl);
  };

  const handleLogout = () => {
    setUser(null);
    setProfileImage('');
    localStorage.removeItem('hostelUser');
    localStorage.removeItem('hostelProfileImage');
  };

  const handleProfileUpdate = (updatedUser, imageUrl) => {
    const nextUser = { ...user, ...updatedUser };
    setUser(nextUser);
    if (imageUrl) {
      setProfileImage(imageUrl);
      localStorage.setItem('hostelProfileImage', imageUrl);
    }
    localStorage.setItem('hostelUser', JSON.stringify(nextUser));
  };

  const currentUser = useMemo(() => user || defaultUser, [user]);

  if (!authReady) {
    return null;
  }

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        profileImage={profileImage}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to="/profile" replace /> : <Login onLogin={handleLogin} />} />
          <Route path="/signup" element={user ? <Navigate to="/profile" replace /> : <Signup onSignup={handleSignup} />} />
          <Route path="/profile" element={user ? <Profile user={currentUser} profileImage={profileImage} onProfileUpdate={handleProfileUpdate} onProfileImageChange={setProfileImage} /> : <Navigate to="/login" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
