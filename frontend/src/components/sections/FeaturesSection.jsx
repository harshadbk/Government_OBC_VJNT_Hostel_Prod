import { FiUserPlus, FiUpload, FiCheckSquare, FiDatabase, FiGrid, FiClipboard, FiBell, FiMessageSquare, FiLock } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const features = [
  { title: 'Student Registration', description: 'Students can submit hostel admission forms online with a guided step-by-step process.', icon: <FiUserPlus /> },
  { title: 'Document Upload', description: 'Secure upload of all required admission documents with progress tracking.', icon: <FiUpload /> },
  { title: 'Document Verification', description: 'Admin can verify uploaded documents digitally for faster processing.', icon: <FiCheckSquare /> },
  { title: 'Digital Hostel Records', description: 'Maintain complete student records including personal, academic, and hostel details.', icon: <FiDatabase /> },
  { title: 'Room Allocation', description: 'Manage room assignments efficiently with real-time occupancy tracking.', icon: <FiGrid /> },
  { title: 'Attendance Management', description: 'Track student attendance with daily roll calls and absence notifications.', icon: <FiClipboard /> },
  { title: 'Notice Board', description: 'Latest notices, announcements, and government circulars at one place.', icon: <FiBell /> },
  { title: 'Complaint Portal', description: 'Students can submit complaints and maintenance requests online.', icon: <FiMessageSquare /> },
  { title: 'Secure Authentication', description: 'Role-based access for Students, Staff, and Admin with secure login.', icon: <FiLock /> },
];

export default function FeaturesSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section features-section" id="features" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiGrid /> Digital Management</div>
          <h2 className="section-title">Smart Hostel Management Features</h2>
          <p className="section-subtitle">
            A complete digital solution for managing hostel admissions, student records, room allocation, and daily operations efficiently.
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`feature-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="feature-icon-wrap">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
