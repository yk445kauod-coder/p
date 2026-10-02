/**
 * Tiny event bus for opening the AI coach from anywhere.
 *
 * Screens can request the chat sheet without threading callbacks through the
 * navigator; AppShell owns the sheet and subscribes here.
 */
type OpenChat = (seed?: string) => void;

const listeners = new Set<OpenChat>();

export function openChat(seed?: string): void {
  listeners.forEach((l) => l(seed));
}

export function onOpenChat(listener: OpenChat): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
