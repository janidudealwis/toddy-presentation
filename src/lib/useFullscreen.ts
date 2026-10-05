import { useCallback, useEffect, useState } from 'react';

/** Fullscreen state plus a toggle, for the F key and the control tray. */
export function useFullscreen() {
  const [active, setActive] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(() => {
    // A rejected request is normal — the browser refuses it when the call did not come
    // from a gesture it trusts. Nothing to recover, so nothing to report.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  return { active, toggle };
}
