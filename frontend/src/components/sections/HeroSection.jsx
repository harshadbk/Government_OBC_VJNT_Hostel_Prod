import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiShield,
  FiArrowRight,
  FiLock,
  FiMessageSquare,
  FiAlertCircle
} from 'react-icons/fi';
import useInView from '../../hooks/useInView';
import homeImage from '../../../assets/home.png';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export default function HeroSection() {
  const [ref, visible] = useInView();
  const [communityCount, setCommunityCount] = useState(0);
  const [complaintCount, setComplaintCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveCounts = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/complaints/stats`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCommunityCount(data.communityMessages || 0);
            setComplaintCount(data.resolved || 0);
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

        {/* Clean Standard Buttons (Blue Primary & Secondary) */}
        <div className="hero-actions">
          <Link to="/login" className="button primary">
            <span>Profile</span>
            <FiArrowRight />
          </Link>
          <Link to="/login" className="button secondary">
            <FiLock />
            <span>Login</span>
          </Link>
        </div>

        {/* Quick Access Badges with Real Live Message & Response Counts */}
        <div className="hero-stats">
          <Link to="/community" className="stat-pill counter-pill">
            <FiMessageSquare />
            <span>Community</span>
            {communityCount > 0 && (
              <span className="stat-counter-badge green-badge">{communityCount}</span>
            )}
          </Link>

          <Link to="/complaints" className="stat-pill counter-pill">
            <FiAlertCircle />
            <span>Complaint Box</span>
            {complaintCount > 0 && (
              <span className="stat-counter-badge red-badge">{complaintCount}</span>
            )}
          </Link>
        </div>
      </div>

      <div className={`hero-visual ${visible ? 'visible' : ''}`}>
        <div className="hero-illustration">
          <img
            className="hero-main-image"
            src={homeImage}
            alt="Government Hostel Building"
            loading="eager"
          />
          <div className="floating-badge badge-top">
            <FiMessageSquare /> Active Community
          </div>
          <div className="floating-badge badge-bottom">
            <FiAlertCircle /> Grievance Redressal
          </div>
        </div>
      </div>
    </section>
  );
}
