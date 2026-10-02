/**
 * Tiny event bus for opening the AI coach from anywhere.
 *
 * Screens can request the chat sheet without threading callbacks through the
 * navigator; AppShell owns the sheet and subscribes here.
 */
type OpenChat = (seed?: string) => void;

const listeners = new Set<OpenChat>();
const paywallListeners = new Set<() => void>();

export function openChat(seed?: string): void {
  listeners.forEach((l) => l(seed));
}

export function onOpenChat(listener: OpenChat): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ask the shell to present the paywall from any screen. */
export function openPaywall(): void {
  paywallListeners.forEach((l) => l());
}

export function onOpenPaywall(listener: () => void): () => void {
  paywallListeners.add(listener);
  return () => paywallListeners.delete(listener);
}
