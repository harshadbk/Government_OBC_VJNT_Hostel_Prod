import { FiHome, FiBookOpen, FiBook, FiMonitor, FiDroplet, FiWifi, FiSun, FiPackage, FiTruck, FiLock, FiVideo, FiCheck, FiHeart, FiZap, FiTv, FiFeather, FiTarget, FiActivity } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const facilities = [
  { title: 'Accommodation', description: 'Clean and well-maintained rooms for students', icon: <FiHome /> },
  { title: 'Study Room', description: 'Dedicated quiet study area for focused learning', icon: <FiBookOpen /> },
  { title: 'Library', description: 'Well-stocked library with reference books', icon: <FiBook /> },
  { title: 'Computer Room', description: 'Computer facility with internet access', icon: <FiMonitor /> },
  { title: 'RO Drinking Water', description: 'Purified drinking water available 24×7', icon: <FiDroplet /> },
  { title: 'Wi-Fi', description: 'High-speed internet for academic use', icon: <FiWifi /> },
  { title: 'Solar Water Heater', description: 'Hot water facility powered by solar energy', icon: <FiSun /> },
  { title: 'Laundry Area', description: 'Designated area for laundry and drying', icon: <FiPackage /> },
  { title: 'Parking', description: 'Secure parking space for student vehicles', icon: <FiTruck /> },
  { title: '24×7 Security', description: 'Round-the-clock security for student safety', icon: <FiLock /> },
  { title: 'CCTV Surveillance', description: 'CCTV monitoring for campus security', icon: <FiVideo /> },
  { title: 'Clean Washrooms', description: 'Regularly cleaned and maintained washrooms', icon: <FiCheck /> },
  { title: 'Medical Assistance', description: 'First aid and medical support availability', icon: <FiHeart /> },
  { title: 'Power Backup', description: 'Uninterrupted power supply with backup', icon: <FiZap /> },
  { title: 'Common Room', description: 'Recreational space for students to unwind', icon: <FiTv /> },
  { title: 'Garden', description: 'Green garden area for relaxation', icon: <FiFeather /> },
  { title: 'Indoor Games', description: 'Carrom, chess, and table tennis facilities', icon: <FiTarget /> },
  { title: 'Outdoor Sports', description: 'Cricket, volleyball, and kabaddi grounds', icon: <FiActivity /> },
];

export default function FacilitiesSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section facilities-section" id="facilities" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiHome /> Our Facilities</div>
          <h2 className="section-title">Hostel Facilities & Amenities</h2>
          <p className="section-subtitle">
            Comprehensive facilities to support students' academic and personal needs in a safe and comfortable environment.
          </p>
        </div>
        <div className="facilities-grid">
          {facilities.map((facility, index) => (
            <div
              key={facility.title}
              className={`facility-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="facility-icon">{facility.icon}</div>
              <h4>{facility.title}</h4>
              <p>{facility.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
