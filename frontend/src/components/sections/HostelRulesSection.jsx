import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const rules = [
  { text: 'Maintain discipline and decorum at all times within the hostel premises.', important: true },
  { text: 'Follow hostel timings strictly. Entry gate closes at 9:00 PM.', important: true },
  { text: 'Keep rooms and common areas clean and hygienic.', important: false },
  { text: 'Ragging in any form is strictly prohibited and punishable by law.', important: true },
  { text: 'Respect hostel property. Damage to hostel property will be penalized.', important: false },
  { text: 'Visitors are allowed only during permitted hours (4:00 PM – 6:00 PM) with prior permission.', important: false },
  { text: 'Maintain silence during study hours (8:00 PM – 10:00 PM).', important: false },
  { text: 'Follow all Government hostel regulations and circulars issued from time to time.', important: true },
  { text: 'Consumption of alcohol, tobacco, or any intoxicating substance is strictly prohibited.', important: true },
  { text: 'Students must carry their hostel ID card at all times.', important: false },
  { text: 'Mobile phones are not allowed in the study hall and library.', important: false },
  { text: 'Report any suspicious activity to the hostel administration immediately.', important: false },
];

export default function HostelRulesSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section rules-section" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiAlertCircle /> Hostel Discipline</div>
          <h2 className="section-title">Hostel Rules & Regulations</h2>
          <p className="section-subtitle">
            All hostel residents must strictly follow these rules to maintain a safe, disciplined, and study-friendly environment.
          </p>
        </div>
        <div className="rules-grid">
          {rules.map((rule, index) => (
            <div
              key={index}
              className={`rule-card glass-card ${rule.important ? 'important' : ''} ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="rule-icon">
                {rule.important ? <FiAlertCircle /> : <FiCheckCircle />}
              </div>
              <p>{rule.text}</p>
              {rule.important && <span className="rule-badge">Important</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
