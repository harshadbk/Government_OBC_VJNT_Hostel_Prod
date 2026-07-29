import { FiUsers } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const council = [
  {
    name: 'Akash Deshmukh',
    course: 'B.E. Computer Science',
    year: 'Final Year',
    designation: 'Hostel Representative',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Rohit Pawar',
    course: 'B.Com',
    year: 'Third Year',
    designation: 'Sports Coordinator',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Sagar Mane',
    course: 'B.Sc. Physics',
    year: 'Second Year',
    designation: 'Library Coordinator',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Vishal Jadhav',
    course: 'B.A. Political Science',
    year: 'Third Year',
    designation: 'Discipline Coordinator',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Pratik Shinde',
    course: 'BCA',
    year: 'Second Year',
    designation: 'Cultural Coordinator',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Omkar Salunkhe',
    course: 'B.E. Mechanical',
    year: 'Final Year',
    designation: 'Academic Coordinator',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80'
  },
];

export default function StudentCouncilSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section council-section" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiUsers /> Student Leaders</div>
          <h2 className="section-title">Student Council</h2>
          <p className="section-subtitle">
            Elected student representatives who work with hostel administration to ensure smooth functioning and address student needs.
          </p>
        </div>
        <div className="council-grid">
          {council.map((member, index) => (
            <div
              key={member.name}
              className={`council-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div className="council-image-wrap">
                <img src={member.image} alt={member.name} loading="lazy" />
              </div>
              <div className="council-info">
                <h3>{member.name}</h3>
                <span className="council-designation">{member.designation}</span>
                <p className="council-course">{member.course} · {member.year}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
