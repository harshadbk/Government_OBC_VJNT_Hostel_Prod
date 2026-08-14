import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Facilities from './pages/Facilities';
import Gallery from './pages/Gallery';
import Admission from './pages/Admission';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Profile from './pages/Profile';
import UploadsPage from './pages/Uploads';
import CommunityPage from './pages/Community';
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
  const [token, setToken] = useState(() => localStorage.getItem('hostelToken'));
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
          <Route path="/about" element={<About />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/admission" element={<Admission />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={user ? <Navigate to="/profile" replace /> : <Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/profile" element={user ? <Profile user={currentUser} profileImage={profileImage} onProfileUpdate={handleProfileUpdate} onProfileImageChange={setProfileImage} token={token} /> : <Navigate to="/login" replace />} />
          <Route path="/community" element={<CommunityPage user={user} token={token} />} />
          <Route path="/uploads" element={<UploadsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
