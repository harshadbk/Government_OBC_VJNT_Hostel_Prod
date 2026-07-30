import { FiBell, FiCalendar, FiAlertCircle, FiInfo } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const notices = [
  {
    title: 'Hostel Admissions Open 2025-26',
    date: '15 July 2025',
    type: 'admission',
    description: 'Online applications are now open for hostel admission for the academic year 2025-26. Eligible OBC students can apply through the portal.',
    urgent: true
  },
  {
    title: 'Merit List Published',
    date: '1 August 2025',
    type: 'admission',
    description: 'First merit list for hostel admission has been published. Selected students must complete formalities within 7 days.',
    urgent: true
  },
  {
    title: 'Independence Day Celebration',
    date: '15 August 2025',
    type: 'event',
    description: 'Flag hoisting ceremony at 8:00 AM. All hostel residents are required to attend in formal dress.',
    urgent: false
  },
  {
    title: 'Government Scholarship Updates',
    date: '10 August 2025',
    type: 'scholarship',
    description: 'New government scholarship schemes announced for OBC students. Check eligibility and apply before the deadline.',
    urgent: true
  },
  {
    title: 'Holiday Notice — Ganesh Chaturthi',
    date: '27 August 2025',
    type: 'holiday',
    description: 'Hostel will remain open during Ganesh Chaturthi. Students going home must fill the leave form.',
    urgent: false
  },
  {
    title: 'Hostel Maintenance Work',
    date: '5 September 2025',
    type: 'general',
    description: 'Water supply will be interrupted on 5th September from 10 AM to 2 PM due to maintenance work.',
    urgent: false
  },
  {
    title: 'Career Guidance Session',
    date: '20 September 2025',
    type: 'event',
    description: 'Career guidance session by Prof. Desai on competitive exam preparation. All students are encouraged to attend.',
    urgent: false
  },
];

const typeIcons = {
  admission: <FiAlertCircle />,
  event: <FiCalendar />,
  scholarship: <FiInfo />,
  holiday: <FiCalendar />,
  general: <FiBell />,
};

export default function NoticeBoardSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section notice-section" id="notices" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiBell /> Announcements</div>
          <h2 className="section-title">Notice Board</h2>
          <p className="section-subtitle">
            Stay updated with the latest notices, announcements, and government circulars from the hostel administration.
          </p>
        </div>
        <div className="notices-list">
          {notices.map((notice, index) => (
            <div
              key={notice.title}
              className={`notice-card glass-card ${notice.urgent ? 'urgent' : ''} ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="notice-icon-wrap">
                {typeIcons[notice.type]}
              </div>
              <div className="notice-content">
                <div className="notice-header">
                  <h3>{notice.title}</h3>
                  {notice.urgent && <span className="notice-urgent-badge">New</span>}
                </div>
                <p>{notice.description}</p>
                <span className="notice-date"><FiCalendar /> {notice.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
