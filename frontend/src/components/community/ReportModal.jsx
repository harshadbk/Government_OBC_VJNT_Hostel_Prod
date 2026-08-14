import { useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

export default function ReportModal({ message, onClose, onSubmit }) {
  const [reason, setReason] = useState('Spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ reason, description });
    setSubmitting(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--card-border, #e2e8f0)',
        borderRadius: 'var(--radius-lg, 20px)',
        width: '100%',
        maxWidth: '460px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.2))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
            <FiAlertTriangle style={{ color: 'var(--secondary, #d97706)' }} /> Report Message
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--muted)' }}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text)' }}>
              Reason for reporting
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
            >
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="Abusive content">Abusive content</option>
              <option value="Inappropriate content">Inappropriate content</option>
              <option value="Misleading information">Misleading information</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text)' }}>
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context if necessary..."
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'var(--card-bg, #ffffff)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '999px',
                border: 'none',
                background: 'var(--primary, #1a365d)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
