import { useState } from 'react';
import { FiHelpCircle, FiChevronDown } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const faqs = [
  {
    question: 'Who is eligible for hostel admission?',
    answer: 'Students belonging to Other Backward Classes (OBC) category, who are residents of Maharashtra and are pursuing higher education (Degree, Diploma, Post-Graduation) in recognized institutions in Sangli district, are eligible for hostel admission subject to availability and eligibility criteria set by the Government.'
  },
  {
    question: 'How to apply for hostel admission?',
    answer: 'Students can apply online through this portal by clicking the "Apply for Hostel" button. Fill in personal details, upload required documents, and submit the application. The hostel administration will verify documents and publish the merit list.'
  },
  {
    question: 'Which documents are required for admission?',
    answer: 'Required documents include: Aadhaar Card, OBC Caste Certificate, Income Certificate, Domicile Certificate, College Admission Receipt, Bonafide Certificate, Passport-size Photos, Bank Passbook, and Previous Marksheet. All documents must be valid and issued by competent authorities.'
  },
  {
    question: 'How are rooms allocated to students?',
    answer: 'Rooms are allocated based on the merit list prepared after document verification. Priority is given based on distance from hometown, family income, academic performance, and year of study as per government norms.'
  },
  {
    question: 'What is the Government Food Allowance?',
    answer: 'Currently, students receive ₹150 per day as Government Food Allowance to manage their meals independently. This amount is disbursed directly to students until hostel mess facilities become available.'
  },
  {
    question: 'Can students renew hostel admission every year?',
    answer: 'Yes, students can renew their hostel admission for the next academic year by submitting a renewal application with updated documents and proof of continuation of education. Renewal is subject to good conduct and adherence to hostel rules.'
  },
  {
    question: 'What are the hostel timings?',
    answer: 'The hostel entry gate closes at 9:00 PM. Study hours are from 8:00 PM to 10:00 PM. Visitor hours are from 4:00 PM to 6:00 PM. Students must follow all timing rules strictly.'
  },
  {
    question: 'Is there a complaint or grievance redressal system?',
    answer: 'Yes, students can submit complaints and maintenance requests through the online Complaint Portal available on this website. The hostel administration addresses complaints within a reasonable timeframe.'
  },
];

export default function FAQSection() {
  const [ref, visible] = useInView();
  const [openIndex, setOpenIndex] = useState(-1);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="page-section faq-section" id="faq" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiHelpCircle /> FAQ</div>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Find answers to common questions about hostel admission, facilities, rules, and more.
          </p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item glass-card ${openIndex === index ? 'open' : ''} ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <button
                className="faq-question"
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
              >
                <span>{faq.question}</span>
                <FiChevronDown className={`faq-chevron ${openIndex === index ? 'rotated' : ''}`} />
              </button>
              <div className={`faq-answer ${openIndex === index ? 'expanded' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
