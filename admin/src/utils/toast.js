// Tiny app-wide popup notifications. Call toast.success('Saved') from anywhere;
// <Toaster /> (mounted once in App) renders them.
import { useEffect } from 'react';

const listeners = new Set();
let nextId = 1;

const ERROR_WORDS = /(fail|error|unable|could not|couldn't|cannot|can't|invalid|denied|missing|required|not allowed|not found|exceed|expired|wrong|unreachable|please (select|enter|provide|fix|choose|login|log in))/i;

export function inferType(message) {
  const text = String(message || '');
  if (/(\.\.\.|…)$/.test(text.trim())) return 'info';
  return ERROR_WORDS.test(text) ? 'error' : 'success';
}

export function toast(message, type, options = {}) {
  if (!message) return null;
  const kind = type || inferType(message);
  const item = {
    id: nextId++,
    message: String(message),
    type: kind,
    title: options.title,
    duration: options.duration ?? (kind === 'error' ? 6000 : kind === 'info' ? 2500 : 4000),
  };
  listeners.forEach((fn) => fn(item));
  return item.id;
}

toast.success = (message, options) => toast(message, 'success', options);
toast.error = (message, options) => toast(message, 'error', options);
toast.info = (message, options) => toast(message, 'info', options);
toast.warning = (message, options) => toast(message, 'warning', options);

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Shows a popup whenever a page's existing message state gets a new value.
const TYPE_ALIASES = { danger: 'error', err: 'error', ok: 'success', warn: 'warning' };

export function useToastMessage(message, type) {
  useEffect(() => {
    if (!message) return;
    const kind = TYPE_ALIASES[type] || type || undefined;
    toast(typeof message === 'string' ? message : String(message), kind);
  }, [message, type]);
}

export default toast;
