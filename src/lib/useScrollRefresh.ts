import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Keep every ScrollTrigger aligned with the real layout. Step positions are
 * measured on mount, but web fonts swapping in (and figures mounting) change
 * text heights afterwards; without a refresh the active step drifts away from
 * the text on screen.
 */
export function useScrollRefresh() {
  useEffect(() => {
    let t = 0;
    const refresh = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('load', refresh);
      ro.disconnect();
    };
  }, []);
}
