/**
 * Wiki links and the knowledge graph.
 *
 * The Obsidian-like layer rests on one idea: `[[Title]]` inside a note creates an
 * edge. Everything else — backlinks, the graph view, the quick switcher — is
 * derived from parsing that syntax, so the whole feature is testable as pure
 * functions over the note list.
 *
 * A link may carry a display alias (`[[Title|shown text]]`) and a heading anchor
 * (`[[Title#Section]]`); both are supported because notes written elsewhere
 * assume them.
 */

import type { Note } from "@/data/types";

export interface WikiLink {
  /** The raw target as written, without the alias or anchor. */
  target: string;
  /** Optional display text after a `|`. */
  alias: string | null;
  /** Optional `#heading` anchor. */
  anchor: string | null;
  /** Index of the opening `[[` in the source, so the body can be rewritten. */
  index: number;
  /** Full matched text, including brackets. */
  raw: string;
}

/** Matches `[[target]]`, `[[target|alias]]` and `[[target#anchor|alias]]`. */
const WIKI_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** Every wiki link in a body, in source order. */
export function parseWikiLinks(body: string): WikiLink[] {
  const out: WikiLink[] = [];
  for (const m of body.matchAll(WIKI_RE)) {
    out.push({
      target: m[1].trim(),
      anchor: m[2]?.trim() ?? null,
      alias: m[3]?.trim() ?? null,
      index: m.index ?? 0,
      raw: m[0],
    });
  }
  return out;
}

/** The display text for a link: its alias, or the target. */
export function linkLabel(link: WikiLink): string {
  return link.alias ?? link.target;
}

export interface NoteEdge {
  from: string;
  to: string;
  /** The note title that was linked to, as written. */
  target: string;
  resolved: boolean;
}

/** Resolves a link target to a note id, case-insensitively. */
export function resolveTarget(target: string, notes: Note[]): Note | null {
  const needle = target.trim().toLowerCase();
  return notes.find((n) => n.title.trim().toLowerCase() === needle) ?? null;
}

/** Every edge in the vault. Unresolved targets are kept so the graph can show them. */
export function buildEdges(notes: Note[]): NoteEdge[] {
  const edges: NoteEdge[] = [];
  for (const note of notes) {
    for (const link of parseWikiLinks(note.body)) {
      const target = resolveTarget(link.target, notes);
      edges.push({
        from: note.id,
        to: target?.id ?? `unresolved:${link.target}`,
        target: link.target,
        resolved: Boolean(target),
      });
    }
    for (const linkedId of note.linkedNoteIds ?? []) {
      const target = notes.find((candidate) => candidate.id === linkedId);
      if (!target || target.id === note.id) continue;
      edges.push({ from: note.id, to: target.id, target: target.title, resolved: true });
    }
  }
  return edges;
}

export interface Backlink {
  note: Note;
  /** The sentence the link appeared in, for context in the sidebar. */
  context: string;
}

/** Notes that link *to* the given note, with a snippet of surrounding text. */
export function backlinks(noteId: string, notes: Note[]): Backlink[] {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return [];

  const out: Backlink[] = [];
  for (const other of notes) {
    if (other.id === noteId) continue;
    const link = parseWikiLinks(other.body).find(
      (l) => resolveTarget(l.target, notes)?.id === noteId,
    );
    if (!link) continue;
    out.push({ note: other, context: contextAround(other.body, link.index) });
  }
  return out;
}

/** The text around a link position, trimmed to sentence-ish boundaries. */
function contextAround(body: string, index: number, radius = 90): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(body.length, index + radius);
  let snippet = body.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < body.length) snippet = `${snippet}…`;
  return snippet;
}

/** Outgoing links from a note. */
export function outgoing(noteId: string, notes: Note[]): NoteEdge[] {
  return buildEdges(notes).filter((e) => e.from === noteId);
}

export interface GraphNode {
  id: string;
  label: string;
  /** Number of connections, used to size the node. */
  degree: number;
  /** True for a link target that has no note yet. */
  ghost: boolean;
}

export interface Graph {
  nodes: GraphNode[];
  links: { source: string; target: string }[];
}

/**
 * Builds the graph in the shape a force layout wants.
 *
 * Kept layout-free on purpose: the renderer owns physics, this owns truth, so
 * the same graph can drive the visual view, a text outline, or a test.
 */
export function buildGraph(notes: Note[]): Graph {
  const edges = buildEdges(notes);
  const degree = new Map<string, number>();

  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }

  const nodes: GraphNode[] = notes.map((n) => ({
    id: n.id,
    label: n.title || "Untitled",
    degree: degree.get(n.id) ?? 0,
    ghost: false,
  }));

  // Surface unresolved targets so a reader can see what they meant to write.
  const ghosts = new Map<string, number>();
  for (const e of edges) {
    if (e.resolved) continue;
    ghosts.set(e.to, (ghosts.get(e.to) ?? 0) + 1);
  }
  for (const [id, count] of ghosts) {
    nodes.push({ id, label: id.replace("unresolved:", ""), degree: count, ghost: true });
  }

  return {
    nodes,
    links: edges.map((e) => ({ source: e.from, target: e.to })),
  };
}

/** Titles available for autocomplete in `[[…]]`. */
export function linkSuggestions(query: string, notes: Note[], limit = 8): Note[] {
  const q = query.trim().toLowerCase();
  const pool = q ? notes.filter((n) => n.title.toLowerCase().includes(q)) : notes;
  return pool.slice(0, limit);
}

/** Inserts a wiki link at the caret, returning the new body and caret offset. */
export function insertWikiLink(body: string, caret: number, title: string): { body: string; caret: number } {
  const token = `[[${title}]]`;
  return {
    body: body.slice(0, caret) + token + body.slice(caret),
    caret: caret + token.length,
  };
}
