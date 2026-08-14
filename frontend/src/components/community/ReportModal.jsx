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
      background: 'rgba(11, 20, 26, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--wa-sidebar-bg, #ffffff)',
        border: '1px solid var(--wa-border, #e9edef)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        padding: '1.5rem',
        boxShadow: 'var(--wa-shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--wa-text-primary)' }}>
            <FiAlertTriangle style={{ color: '#d97706' }} /> Report Message
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--wa-text-muted)' }}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--wa-text-primary)' }}>
              Reason for reporting
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--wa-border)',
                background: 'var(--wa-input-bg)',
                color: 'var(--wa-text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
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

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--wa-text-primary)' }}>
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--wa-border)',
                background: 'var(--wa-input-bg)',
                color: 'var(--wa-text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
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
                border: '1px solid var(--wa-border)',
                background: 'transparent',
                color: 'var(--wa-text-primary)',
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
                background: 'var(--wa-primary)',
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
