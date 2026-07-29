import { FiUsers, FiPhone, FiMail } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const staff = [
  {
    name: 'Shri. Rajendra Patil',
    designation: 'Rector',
    phone: '+91 98765 43210',
    email: 'rector.obchostel@gov.in',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Shri. Manoj Jadhav',
    designation: 'Assistant Rector',
    phone: '+91 98765 43211',
    email: 'asstrector.obchostel@gov.in',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Shri. Suresh Kamble',
    designation: 'Hostel Superintendent',
    phone: '+91 98765 43212',
    email: 'superintendent.obchostel@gov.in',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Shri. Anil Shinde',
    designation: 'Clerk',
    phone: '+91 98765 43213',
    email: 'clerk.obchostel@gov.in',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Shri. Balaji More',
    designation: 'Security Guard',
    phone: '+91 98765 43214',
    email: 'security.obchostel@gov.in',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Shri. Vishnu Gaikwad',
    designation: 'Caretaker',
    phone: '+91 98765 43215',
    email: 'caretaker.obchostel@gov.in',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
  },
];

export default function StaffSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section staff-section" id="staff" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiUsers /> Our Team</div>
          <h2 className="section-title">Hostel Staff</h2>
          <p className="section-subtitle">
            Dedicated and responsible hostel staff ensuring smooth operations and student welfare.
          </p>
        </div>
        <div className="staff-grid">
          {staff.map((member, index) => (
            <div
              key={member.name}
              className={`staff-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div className="staff-image-wrap">
                <img src={member.image} alt={member.name} loading="lazy" />
              </div>
              <div className="staff-info">
                <h3>{member.name}</h3>
                <span className="staff-designation">{member.designation}</span>
                <div className="staff-contacts">
                  <a href={`tel:${member.phone}`} className="staff-contact-link">
                    <FiPhone /> {member.phone}
                  </a>
                  <a href={`mailto:${member.email}`} className="staff-contact-link">
                    <FiMail /> {member.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
