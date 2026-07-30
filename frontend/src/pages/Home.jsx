import { Link } from 'react-router-dom';
import { FiShield, FiUsers, FiHome, FiBookOpen, FiArrowRight, FiZap, FiCamera, FiMapPin, FiStar } from 'react-icons/fi';
import '../css/Home.css';
import Button from '../components/Button';

const features = [
  { title: 'Student Registration', description: 'Create polished student profiles in minutes with guided steps.', icon: <FiUsers /> },
  { title: 'Profile Management', description: 'Update academic and personal details with modern controls.', icon: <FiBookOpen /> },
  { title: 'Hostel Records', description: 'Track blocks, rooms and resident information effortlessly.', icon: <FiHome /> },
  { title: 'Secure Authentication', description: 'Keep access safe with premium-grade UI and role-ready flows.', icon: <FiShield /> }
];

const galleryItems = [
  {
    title: 'Lakeview Dormitory',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    blurb: 'Bright and airy shared spaces for student living.'
  },
  {
    title: 'Study Lounge',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
    blurb: 'Comfortably designed for focused learning and collaboration.'
  },
  {
    title: 'Skyline Residence',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    blurb: 'A premium environment for relaxation and connection.'
  },
  {
    title: 'Campus View Room',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
    blurb: 'Encouraging comfort, clarity and everyday ease.'
  }
];

const highlights = [
  'Live room assignments and occupancy trends in one view.',
  'Elegant profile controls with animated validation and focus states.',
  'Modern visuals designed to feel like a premium student portal.'
];

function Home() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-eyebrow"><FiZap /> Smart living for modern campuses</div>
          <h1 className="hero-title">Smart Hostel Management System</h1>
          <p className="hero-subtitle">Manage student records, hostel details and profiles efficiently with a refined dashboard built for universities and colleges.</p>
          <div className="hero-actions">
            <Link to="/login">
              <Button label="Login" variant="primary" icon={<FiArrowRight />} />
            </Link>
            <Link to="/signup">
              <Button label="Create Account" variant="secondary" />
            </Link>
          </div>
          <div className="hero-stats">
            <span className="stat-pill">24/7 concierge</span>
            <span className="stat-pill">98.4% satisfaction</span>
            <span className="stat-pill">Premium student experience</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-illustration">
            <img
              className="hero-main-image"
              src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
              alt="Hostel room interior"
            />
            <div className="floating-badge badge-top">
              <FiCamera /> Premium Rooms
            </div>
            <div className="floating-badge badge-bottom">
              <FiMapPin /> Campus Ready
            </div>
            <div className="hero-card-info">
              <h3>Northbridge Residence</h3>
              <p>Secure access, comfort and a seamless everyday routine.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section" id="features">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Everything for a smoother hostel experience</h2>
        <p className="section-subtitle" style={{ textAlign: 'center' }}>Designed to feel premium, clear and efficient for administrators and students alike.</p>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article key={feature.title} className="feature-card glass-card" style={{ animationDelay: `${index * 90}ms` }}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section gallery-section" id="gallery">
        <div className="section-header">
          <h2 className="section-title">A beautiful residence experience</h2>
          <p className="section-subtitle">The design reflects comfort, clarity and the calm of a thriving campus community.</p>
        </div>
        <div className="gallery-grid">
          {galleryItems.map((item) => (
            <article key={item.title} className="gallery-card glass-card">
              <img src={item.image} alt={item.title} />
              <div className="gallery-info">
                <h3>{item.title}</h3>
                <p>{item.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section spotlight-section">
        <div className="spotlight-card glass-card">
          <div className="spotlight-content">
            <div className="hero-eyebrow"><FiStar /> Why students love it</div>
            <h3>Streamlined for calm, confident living</h3>
            <div className="highlight-list">
              {highlights.map((item) => (
                <div key={item} className="highlight-item">
                  <FiStar />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="spotlight-image-wrap">
            <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=80" alt="Modern student lounge" />
          </div>
        </div>
      </section>

      <section className="page-section about-section" id="about">
        <div className="info-card glass-card">
          <h3>Built for modern campuses</h3>
          <p>Bring student living into a polished, simple workflow with crystal-clear information and delightful interactions.</p>
          <ul className="info-list">
            <li>Responsive from mobile to desktop</li>
            <li>Fluid animations and premium visuals</li>
            <li>Elegant forms with smart validation</li>
          </ul>
        </div>
        <div className="info-card glass-card" id="contact">
          <h3>Contact & support</h3>
          <p>Reach the hostel administration team for onboarding, access and account support.</p>
          <ul className="info-list">
            <li>support@northbridge.edu</li>
            <li>+1 (555) 0148</li>
            <li>Campus Admin Office · 9AM - 6PM</li>
          </ul>
        </div>
      </section>
    </>
  );
}

export default Home;
