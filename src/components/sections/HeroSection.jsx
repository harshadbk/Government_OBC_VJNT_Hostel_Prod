import { Link } from 'react-router-dom';
import { FiShield, FiWifi, FiHome, FiBookOpen, FiArrowRight, FiCheckCircle, FiLock } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

export default function HeroSection() {
  const [ref, visible] = useInView();

  const stats = [
    { icon: <FiCheckCircle />, label: 'Government Approved' },
    { icon: <FiShield />, label: 'Safe Accommodation' },
    { icon: <FiHome />, label: 'Affordable Hostel' },
    { icon: <FiBookOpen />, label: 'Study Friendly' },
    { icon: <FiWifi />, label: 'Wi-Fi Enabled' },
    { icon: <FiLock />, label: '24×7 Security' },
  ];

  return (
    <section className="hero-section" ref={ref}>
      <div className="hero-bg-pattern" aria-hidden="true" />
      <div className={`hero-copy ${visible ? 'visible' : ''}`}>
        <div className="hero-eyebrow">
          <FiShield /> Official Government Portal
        </div>
        <h1 className="hero-title">
          Government OBC Boys Hostel, <span className="highlight-text">Sangli</span>
        </h1>
        <p className="hero-subtitle">
          Providing a safe, disciplined, and supportive residential environment for students 
          pursuing higher education under the Government of Maharashtra.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="button primary">
            <span>Apply for Hostel</span>
            <FiArrowRight />
          </Link>
          <Link to="/login" className="button secondary">
            <FiLock />
            <span>Student Login</span>
          </Link>
        </div>
        <div className="hero-stats">
          {stats.map((stat) => (
            <span key={stat.label} className="stat-pill">
              {stat.icon} {stat.label}
            </span>
          ))}
        </div>
      </div>
      <div className={`hero-visual ${visible ? 'visible' : ''}`}>
        <div className="hero-illustration">
          <img
            className="hero-main-image"
            src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80"
            alt="Government Hostel Building"
            loading="eager"
          />
          <div className="floating-badge badge-top">
            <FiShield /> Government Approved
          </div>
          <div className="floating-badge badge-bottom">
            <FiHome /> Student Residence
          </div>
          <div className="hero-card-info">
            <h3>Samaj Kalyan OBC Hostel</h3>
            <p>Safe, disciplined student accommodation under Govt. of Maharashtra.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
