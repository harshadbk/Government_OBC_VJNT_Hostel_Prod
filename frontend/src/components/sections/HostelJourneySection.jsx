import { FiFlag, FiUsers, FiMonitor, FiTrendingUp, FiStar } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const milestones = [
  {
    year: '2024',
    title: 'Hostel Inauguration',
    description: 'Government OBC Boys Hostel, Sangli was officially inaugurated under the Social Justice Department, Government of Maharashtra.',
    icon: <FiFlag />,
    status: 'completed'
  },
  {
    year: '2025',
    title: 'First Batch Admission',
    description: 'The first batch of OBC students was admitted to the hostel, marking the beginning of a new chapter in student welfare.',
    icon: <FiUsers />,
    status: 'completed'
  },
  {
    year: '2026',
    title: 'Digital Hostel Management System',
    description: 'Launch of the comprehensive digital hostel management portal for online admissions, records, and communications.',
    icon: <FiMonitor />,
    status: 'current'
  },
  {
    year: '2026-27',
    title: 'Infrastructure Expansion',
    description: 'Planned expansion of hostel facilities including additional rooms, improved study areas, and sports infrastructure.',
    icon: <FiTrendingUp />,
    status: 'upcoming'
  },
  {
    year: '2026-27',
    title: 'Upcoming Student Facilities',
    description: 'Proposed addition of gymnasium, advanced computer lab, and mess facility for comprehensive student support.',
    icon: <FiStar />,
    status: 'upcoming'
  },
];

export default function HostelJourneySection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section journey-section" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiFlag /> Our Journey</div>
          <h2 className="section-title">Hostel Journey & Milestones</h2>
          <p className="section-subtitle">
            From inauguration to digital transformation — tracing the growth story of Government OBC Boys Hostel, Sangli.
          </p>
        </div>
        <div className="journey-timeline">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.title}
              className={`journey-item ${milestone.status} ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="journey-marker">
                <div className={`journey-dot ${milestone.status}`}>
                  {milestone.icon}
                </div>
                {index < milestones.length - 1 && <div className="journey-line" />}
              </div>
              <div className="journey-card glass-card">
                <span className="journey-year">{milestone.year}</span>
                <h3>{milestone.title}</h3>
                <p>{milestone.description}</p>
                <span className={`journey-status-badge ${milestone.status}`}>
                  {milestone.status === 'completed' ? 'Completed' : milestone.status === 'current' ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
