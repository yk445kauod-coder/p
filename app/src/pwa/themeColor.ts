import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Keep the browser chrome (status bar, address bar tint) in step with the app
 * theme so an installed PWA does not show a dark bar over a light screen.
 */
export function useWebThemeColor(color: string) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }, [color]);
}
