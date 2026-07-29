import { FiCalendar, FiImage } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const events = [
  {
    title: 'Independence Day Celebration',
    date: '15 August 2025',
    description: 'Flag hoisting ceremony and patriotic program organized with students and staff.',
    image: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Republic Day Celebration',
    date: '26 January 2026',
    description: 'Republic Day celebrations with cultural performances and flag hoisting.',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Tree Plantation Drive',
    date: '5 June 2025',
    description: 'Environmental awareness program with tree plantation activities in hostel campus.',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Swachh Bharat Campaign',
    date: '2 October 2025',
    description: 'Cleanliness drive organized as part of the Swachh Bharat Abhiyan initiative.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Blood Donation Camp',
    date: '14 June 2025',
    description: 'Voluntary blood donation camp organized in collaboration with local hospital.',
    image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Health Check-up Camp',
    date: '7 April 2026',
    description: 'Free health check-up camp for hostel students with medical professionals.',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Cricket Tournament',
    date: 'December 2025',
    description: 'Inter-hostel cricket tournament promoting sportsmanship and teamwork.',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Volleyball Competition',
    date: 'November 2025',
    description: 'Volleyball competition among hostel residents to encourage physical fitness.',
    image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Kabaddi Competition',
    date: 'January 2026',
    description: 'Traditional kabaddi competition fostering competitive spirit among students.',
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba688509?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Chess Competition',
    date: 'February 2026',
    description: 'Indoor chess competition to encourage strategic thinking among students.',
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Cultural Programs',
    date: 'March 2026',
    description: 'Annual cultural program showcasing student talent in music, dance, and drama.',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Career Guidance Sessions',
    date: 'Quarterly',
    description: 'Career counseling and guidance sessions by industry professionals and educators.',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Motivational Talks',
    date: 'Monthly',
    description: 'Motivational sessions by eminent speakers to inspire student achievement.',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Scholarship Awareness',
    date: 'July 2025',
    description: 'Awareness programs about government scholarships and educational benefits.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80'
  },
  {
    title: 'Freshers Welcome',
    date: 'August 2025',
    description: 'Welcome program for newly admitted students with orientation and activities.',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80'
  },
];

export default function EventsSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section events-section" id="events" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiCalendar /> Events & Activities</div>
          <h2 className="section-title">Hostel Events & Activities</h2>
          <p className="section-subtitle">
            Our hostel organizes regular events, sports competitions, cultural programs, and awareness campaigns to support holistic student development.
          </p>
        </div>
        <div className="events-grid">
          {events.map((event, index) => (
            <article
              key={event.title}
              className={`event-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="event-image-wrap">
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-date-badge">
                  <FiCalendar /> {event.date}
                </div>
              </div>
              <div className="event-info">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <button className="event-gallery-btn">
                  <FiImage /> View Gallery
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
