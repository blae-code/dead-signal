import { useEffect, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isPageVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

export function useAnimationEnabled() {
  const [enabled, setEnabled] = useState(() => isPageVisible() && !prefersReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(isPageVisible() && !media.matches);
    update();

    document.addEventListener("visibilitychange", update);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
    } else {
      media.addListener(update);
    }

    return () => {
      document.removeEventListener("visibilitychange", update);
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", update);
      } else {
        media.removeListener(update);
      }
    };
  }, []);

  return enabled;
}
