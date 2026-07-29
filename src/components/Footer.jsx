import { FiFacebook, FiTwitter, FiYoutube, FiMail } from 'react-icons/fi';
import '../css/Navbar.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <h3>Government OBC Boys Hostel, Sangli</h3>
        <p>
          Providing safe, disciplined, and supportive residential facilities for OBC students 
          pursuing higher education under the Government of Maharashtra.
        </p>
        <div className="social-links">
          <a href="#" aria-label="Facebook"><FiFacebook /></a>
          <a href="#" aria-label="Twitter"><FiTwitter /></a>
          <a href="#" aria-label="YouTube"><FiYoutube /></a>
          <a href="#" aria-label="Email"><FiMail /></a>
        </div>
      </div>
      <div>
        <h4>Quick Links</h4>
        <ul>
          <li><a href="/#">Home</a></li>
          <li><a href="/#about">About</a></li>
          <li><a href="/#facilities">Facilities</a></li>
          <li><a href="/#gallery">Gallery</a></li>
          <li><a href="/#admission">Admission</a></li>
          <li><a href="/#contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Information</h4>
        <ul>
          <li><a href="/#notices">Notices</a></li>
          <li><a href="/#events">Events</a></li>
          <li><a href="/#faq">FAQ</a></li>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms &amp; Conditions</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="tel:+910233232323">+91 0233 2323232</a></li>
          <li><a href="mailto:obchostel.sangli@gov.in">obchostel.sangli@gov.in</a></li>
          <li><span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Mon-Sat: 10AM – 5:30PM</span></li>
        </ul>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Government OBC Boys Hostel, Sangli. All rights reserved.</p>
        <p className="footer-developers">
          Developed by <span>Madanraj Sagar</span> &amp; <span>Friend Name</span>
        </p>
      </div>
    </footer>
  );
}

export default Footer;
