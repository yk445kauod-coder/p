import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Web install (PWA) plumbing.
 *
 * Chrome fires `beforeinstallprompt` once the app is installable; we stash the
 * event in the page (see the inline snippet in index.html) and replay it when
 * the user taps "Install app". iOS Safari has no such event, so callers fall
 * back to showing the manual "Add to Home Screen" hint.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __tbInstall?: InstallPromptEvent | null;
  }
}

function isWeb(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined";
}

function isStandalone(): boolean {
  if (!isWeb()) return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

/** iOS Safari never fires `beforeinstallprompt`; the user must use Share → Add. */
function isIosSafari(): boolean {
  if (!isWeb()) return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  return iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function usePwaInstall() {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!isWeb()) return;
    const standalone = isStandalone();
    setInstalled(standalone);
    setManual(!standalone && isIosSafari());

    const refresh = () => setAvailable(!!window.__tbInstall);
    const onInstalled = () => {
      setInstalled(true);
      setAvailable(false);
    };

    refresh();
    window.addEventListener("tb-installable", refresh);
    window.addEventListener("tb-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("tb-installable", refresh);
      window.removeEventListener("tb-installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const evt = isWeb() ? window.__tbInstall : null;
    if (!evt) return false;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") {
      window.__tbInstall = null;
      setAvailable(false);
      setInstalled(true);
      return true;
    }
    return false;
  };

  return { available, installed, manual, promptInstall };
}
