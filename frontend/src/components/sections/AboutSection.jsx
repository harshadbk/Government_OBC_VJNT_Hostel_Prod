import { FiTarget, FiEye, FiAward, FiBookOpen, FiInfo } from 'react-icons/fi';
import useInView from '../../hooks/useInView';
import homeImage from '../../../assets/home.png';

export default function AboutSection() {
  const [ref, visible] = useInView();

  const tabs = [
    {
      icon: <FiInfo />,
      title: 'About the Hostel',
      content: 'Government OBC Boys Hostel, Sangli provides residential facilities to eligible students belonging to Other Backward Classes (OBC) who are pursuing higher education. The hostel is operated under the Social Justice Department (Samaj Kalyan Vibhag), Government of Maharashtra, and aims to provide a safe, disciplined, and academically supportive environment.'
    },
    {
      icon: <FiBookOpen />,
      title: 'History',
      content: 'The hostel was established to support OBC students in Sangli district who come from rural and semi-urban areas to pursue higher education. It was inaugurated as part of the Government of Maharashtra\'s initiative to provide residential facilities to students from backward communities, ensuring equal access to education.'
    },
    {
      icon: <FiTarget />,
      title: 'Mission',
      content: 'To provide affordable, safe, and quality residential accommodation to OBC students pursuing higher education, fostering an environment that supports academic excellence, personal growth, and social development.'
    },
    {
      icon: <FiEye />,
      title: 'Vision',
      content: 'To become a model government hostel that nurtures future leaders by providing a supportive residential environment with modern amenities, promoting discipline, academic achievement, and holistic development among students.'
    },
    {
      icon: <FiAward />,
      title: 'Objectives',
      content: 'Provide safe and disciplined accommodation to eligible OBC students. Support academic growth through study-friendly infrastructure. Encourage participation in extracurricular and sports activities. Ensure transparent and digital management of hostel operations. Maintain government standards of cleanliness, safety, and compliance.'
    },
  ];

  return (
    <section className="page-section about-section" id="about" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiInfo /> About Us</div>
          <h2 className="section-title">About Government OBC Boys Hostel</h2>
          <p className="section-subtitle">
            A government-approved residential facility dedicated to supporting the educational journey of OBC students in Sangli.
          </p>
        </div>
        <div className="about-grid">
          <div className={`about-image-card glass-card ${visible ? 'visible' : ''}`}>
            <img
              src={homeImage}
              alt="Hostel common area with students"
              loading="lazy"
            />
            <div className="about-image-overlay">
              <div className="about-badge">
                <FiAward />
                <span>Government Recognized Institution</span>
              </div>
            </div>
          </div>
          <div className="about-content-cards">
            {tabs.map((tab, index) => (
              <article
                key={tab.title}
                className={`about-card glass-card ${visible ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="about-card-header">
                  <div className="about-card-icon">{tab.icon}</div>
                  <h3>{tab.title}</h3>
                </div>
                <p>{tab.content}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
