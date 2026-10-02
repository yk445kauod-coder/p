import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useSettings } from "../store/settings";

function webReducedMotion(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function webFinePointer(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * True when the user (or their OS) asked for reduced motion.
 *
 * The in-app setting wins; on web we also honour `prefers-reduced-motion` so the
 * app matches the rest of the system before the user has touched settings.
 */
export function useReducedMotion(): boolean {
  const { reduceMotion } = useSettings();
  const [systemPrefers, setSystemPrefers] = useState(webReducedMotion);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onChange = (e: MediaQueryListEvent) => setSystemPrefers(e.matches);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (!cancelled) setSystemPrefers(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => setSystemPrefers(v));
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduceMotion || systemPrefers;
}

/** True when the device has a precise pointer (mouse/trackpad) for hover effects. */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(webFinePointer);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: fine)");
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return fine;
}
