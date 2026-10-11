import { useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';
import { subscribeToasts } from '../utils/toast';
import './Toaster.css';

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const TITLES = {
  success: 'Done',
  error: 'Something went wrong',
  warning: 'Please check',
  info: 'Working on it',
};

const MAX_VISIBLE = 4;

function ToastItem({ item, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);

  const close = () => {
    setLeaving(true);
    setTimeout(() => onClose(item.id), 180);
  };

  const start = () => {
    startedAt.current = Date.now();
    timer.current = setTimeout(close, remaining.current);
  };

  const pause = () => {
    clearTimeout(timer.current);
    remaining.current -= Date.now() - startedAt.current;
  };

  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Icon = ICONS[item.type] || FiInfo;

  return (
    <div
      className={`toast toast-${item.type} ${leaving ? 'leaving' : ''}`}
      role={item.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={start}
    >
      <Icon className="toast-icon" aria-hidden="true" />
      <div className="toast-body">
        <strong>{item.title || TITLES[item.type]}</strong>
        <p>{item.message}</p>
      </div>
      <button type="button" className="toast-close" onClick={close} aria-label="Dismiss">
        <FiX />
      </button>
      <span className="toast-timer" style={{ animationDuration: `${item.duration}ms` }} />
    </div>
  );
}

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(
    () =>
      subscribeToasts((item) =>
        setItems((prev) => {
          // Skip an identical message that is already on screen
          if (prev.some((p) => p.message === item.message && p.type === item.type)) return prev;
          return [...prev, item].slice(-MAX_VISIBLE);
        })
      ),
    []
  );

  const remove = (id) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} onClose={remove} />
      ))}
    </div>
  );
}
