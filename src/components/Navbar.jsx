import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { FiMenu, FiX, FiLogOut, FiUser, FiHome } from 'react-icons/fi';
import '../css/Navbar.css';

function Navbar({ user, profileImage, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Features', to: '/#features' },
    { label: 'Gallery', to: '/#gallery' },
    { label: 'About', to: '/#about' },
    { label: 'Contact', to: '/#contact' }
  ];

  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-shell">
        <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark"><FiHome /></span>
          <span>Hostel Management System</span>
        </Link>

        <button className="mobile-toggle" onClick={() => setMobileOpen((prev) => !prev)} aria-label="Toggle menu">
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>

        <nav className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}

          {user ? (
            <>
              <Link to="/profile" className="profile-pill" onClick={() => setMobileOpen(false)}>
                {profileImage ? <img src={profileImage} alt="User" className="nav-avatar" /> : <FiUser />}
                <span>{user.fullName}</span>
              </Link>
              <button className="logout-btn" onClick={onLogout}>
                <FiLogOut /> Logout
              </button>
            </>
          ) : (
            <div className="nav-actions">
              <Link to="/login" className="nav-link" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/signup" className="nav-cta" onClick={() => setMobileOpen(false)}>Create Account</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
