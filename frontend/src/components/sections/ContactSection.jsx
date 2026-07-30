import { FiMapPin, FiPhone, FiMail, FiClock, FiAlertCircle } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

export default function ContactSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section contact-section" id="contact" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiMapPin /> Get in Touch</div>
          <h2 className="section-title">Contact Us</h2>
          <p className="section-subtitle">
            Reach out to the hostel administration for any queries regarding admission, facilities, or general information.
          </p>
        </div>
        <div className="contact-grid">
          <div className={`contact-map-wrap glass-card ${visible ? 'visible' : ''}`}>
            <iframe
              title="Hostel Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30568.01!2d74.55!3d16.85!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc1197e!2sSangli%2C+Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000"
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: 'var(--radius-lg)', minHeight: '350px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="contact-cards">
            <div className={`contact-card glass-card ${visible ? 'visible' : ''}`} style={{ transitionDelay: '100ms' }}>
              <div className="contact-card-icon"><FiMapPin /></div>
              <div>
                <h4>Hostel Address</h4>
                <p>Government OBC Boys Hostel,<br />
                Near Collector Office, Sangli,<br />
                Maharashtra 416416, India</p>
              </div>
            </div>
            <div className={`contact-card glass-card ${visible ? 'visible' : ''}`} style={{ transitionDelay: '200ms' }}>
              <div className="contact-card-icon"><FiPhone /></div>
              <div>
                <h4>Office Phone</h4>
                <p>+91 0233 2323232</p>
                <h4 style={{ marginTop: '0.5rem' }}>Emergency Contact</h4>
                <p>+91 98765 43210</p>
              </div>
            </div>
            <div className={`contact-card glass-card ${visible ? 'visible' : ''}`} style={{ transitionDelay: '300ms' }}>
              <div className="contact-card-icon"><FiMail /></div>
              <div>
                <h4>Email</h4>
                <p>obchostel.sangli@gov.in</p>
              </div>
            </div>
            <div className={`contact-card glass-card ${visible ? 'visible' : ''}`} style={{ transitionDelay: '400ms' }}>
              <div className="contact-card-icon"><FiClock /></div>
              <div>
                <h4>Office Timing</h4>
                <p>Monday – Saturday<br />10:00 AM – 5:30 PM</p>
              </div>
            </div>
            <div className={`contact-card glass-card urgent ${visible ? 'visible' : ''}`} style={{ transitionDelay: '500ms' }}>
              <div className="contact-card-icon"><FiAlertCircle /></div>
              <div>
                <h4>Office Location</h4>
                <p>Ground Floor, Administrative Block,<br />Government OBC Boys Hostel Campus, Sangli</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
