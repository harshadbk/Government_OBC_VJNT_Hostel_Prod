import { FiUserPlus, FiUpload, FiCheckSquare, FiList, FiGrid, FiAward } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const steps = [
  { step: 1, title: 'Online Registration', description: 'Fill out the online hostel admission form with personal and academic details.', icon: <FiUserPlus /> },
  { step: 2, title: 'Upload Documents', description: 'Upload all required documents including Aadhaar, caste certificate, income certificate, etc.', icon: <FiUpload /> },
  { step: 3, title: 'Document Verification', description: 'Hostel administration verifies all submitted documents for eligibility.', icon: <FiCheckSquare /> },
  { step: 4, title: 'Merit List', description: 'Merit list is published based on eligibility criteria and government norms.', icon: <FiList /> },
  { step: 5, title: 'Room Allocation', description: 'Rooms are allocated to selected students based on merit and availability.', icon: <FiGrid /> },
  { step: 6, title: 'Admission Confirmation', description: 'Admission is confirmed upon completion of all formalities and fee payment.', icon: <FiAward /> },
];

export default function AdmissionSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section admission-section" id="admission" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiUserPlus /> Admission</div>
          <h2 className="section-title">Admission Process</h2>
          <p className="section-subtitle">
            Follow these simple steps to apply for hostel accommodation. The process is transparent and fully digital.
          </p>
        </div>
        <div className="admission-timeline">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className={`timeline-step ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="timeline-connector">
                <div className="timeline-dot">
                  <span>{item.step}</span>
                </div>
                {index < steps.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="timeline-card glass-card">
                <div className="timeline-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
