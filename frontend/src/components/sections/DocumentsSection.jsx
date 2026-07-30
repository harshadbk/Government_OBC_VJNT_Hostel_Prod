import { FiFileText, FiCheckCircle } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const documents = [
  { title: 'Aadhaar Card', description: 'Valid Aadhaar card of the student for identity verification' },
  { title: 'Caste Certificate', description: 'OBC caste certificate issued by competent authority' },
  { title: 'Income Certificate', description: 'Family income certificate for eligibility verification' },
  { title: 'Domicile Certificate', description: 'Maharashtra domicile certificate of the student' },
  { title: 'College Admission Receipt', description: 'Proof of admission to a recognized educational institution' },
  { title: 'Bonafide Certificate', description: 'Bonafide certificate from the college or university' },
  { title: 'Passport Size Photos', description: 'Recent passport-sized photographs (4 copies)' },
  { title: 'Caste Valididty', description: 'OBC caste validity certificate issued by competent authority' },
  { title: 'Previous Marksheets', description: 'Marksheet of last qualifying examination' },
];

export default function DocumentsSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section documents-section" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiFileText /> Required Documents</div>
          <h2 className="section-title">Documents Required for Admission</h2>
          <p className="section-subtitle">
            Please ensure all the following documents are ready before applying for hostel admission. Original documents must be presented during verification.
          </p>
        </div>
        <div className="documents-grid">
          {documents.map((doc, index) => (
            <div
              key={doc.title}
              className={`document-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="document-check"><FiCheckCircle /></div>
              <div className="document-info">
                <h4>{doc.title}</h4>
                <p>{doc.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
