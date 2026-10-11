import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Open every page at the top. Runs on each link click (including the link for the
// page you're already on); back/forward navigation is left alone.
export default function ScrollToTop() {
  const { key } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    // 'instant' overrides the global `scroll-behavior: smooth`, so the page
    // opens at the top instead of visibly scrolling up.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [key, navigationType]);

  return null;
}
