import { FiInstagram, FiFacebook, FiTwitter, FiYoutube } from 'react-icons/fi';
import '../css/Navbar.css';

function Footer() {
  return (
    <footer className="footer glass-card">
      <div>
        <h3>Northbridge University</h3>
        <p>Elevating student living with clarity and care.</p>
      </div>
      <div>
        <h4>Quick Links</h4>
        <ul>
          <li><a href="/#features">Features</a></li>
          <li><a href="/#about">About</a></li>
          <li><a href="/#contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Follow Us</h4>
        <div className="social-links">
          <a href="#" aria-label="Instagram"><FiInstagram /></a>
          <a href="#" aria-label="Facebook"><FiFacebook /></a>
          <a href="#" aria-label="Twitter"><FiTwitter /></a>
          <a href="#" aria-label="YouTube"><FiYoutube /></a>
        </div>
      </div>
      <div className="footer-copy">
        <p>© 2026 Hostel Management System. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
