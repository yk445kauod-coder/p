/**
 * The public library.
 *
 * A curated catalogue of public-domain texts with a working read link. Every
 * entry points at Project Gutenberg for English and Hindawi for Arabic, both of
 * which host the full text legally and for free, so "read" is a real action
 * rather than a placeholder.
 *
 * `pages` is an estimate used by the plan maths (Gutenberg exposes plain-text
 * length, not pagination), and `downloadUrl` is the direct file when the source
 * offers one. Cover art is left null on purpose — the card renders a generated
 * spine from `color` instead of hotlinking someone else's image.
 */
import type { CatalogBook } from "./types";

const GUTENBERG = (id: number, file = `${id}-0.txt`) =>
  `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
const GUTENBERG_HTML = (id: number) => `https://www.gutenberg.org/ebooks/${id}`;
const GUTENBERG_EPUB = (id: number) => `https://www.gutenberg.org/ebooks/${id}.epub.images`;
const HINDAWI = (id: number) => `https://www.hindawi.org/books/${id}/`;

export const CATALOG: CatalogBook[] = [
  // ── Fiction ───────────────────────────────────────────────────────────────
  {
    id: "g1342",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    lang: "en",
    category: "fiction",
    pages: 432,
    description: "Elizabeth Bennet, Mr Darcy, and the most quoted opening line in English fiction.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1342),
    downloadUrl: GUTENBERG_EPUB(1342),
    color: "rose",
    tags: ["classic", "romance", "austen"],
  },
  {
    id: "g84",
    title: "Frankenstein",
    author: "Mary Shelley",
    lang: "en",
    category: "fiction",
    pages: 280,
    description: "A scientist, his creature, and the question of who owes what to whom.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(84),
    downloadUrl: GUTENBERG_EPUB(84),
    color: "violet",
    tags: ["classic", "gothic", "sci-fi"],
  },
  {
    id: "g2701",
    title: "Moby Dick",
    author: "Herman Melville",
    lang: "en",
    category: "fiction",
    pages: 720,
    description: "One captain, one whale, and an obsession that consumes a whole ship.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(2701),
    downloadUrl: GUTENBERG_EPUB(2701),
    color: "teal",
    tags: ["classic", "adventure", "sea"],
  },
  {
    id: "g1661",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    lang: "en",
    category: "fiction",
    pages: 307,
    description: "Twelve cases. Perfect for reading in short sessions.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1661),
    downloadUrl: GUTENBERG_EPUB(1661),
    color: "amber",
    tags: ["mystery", "short-stories", "classic"],
  },
  {
    id: "g1080",
    title: "A Modest Proposal",
    author: "Jonathan Swift",
    lang: "en",
    category: "fiction",
    pages: 48,
    description: "The driest joke in the English language. Read it in one sitting.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1080),
    downloadUrl: GUTENBERG_EPUB(1080),
    color: "indigo",
    tags: ["satire", "short", "classic"],
  },
  {
    id: "g98",
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
    lang: "en",
    category: "fiction",
    pages: 489,
    description: "London, Paris, and a sacrifice worth the whole revolution.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(98),
    downloadUrl: GUTENBERG_EPUB(98),
    color: "rose",
    tags: ["classic", "history"],
  },
  {
    id: "g11",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    lang: "en",
    category: "fiction",
    pages: 200,
    description: "Down the rabbit hole. A good first book to build a streak on.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(11),
    downloadUrl: GUTENBERG_EPUB(11),
    color: "violet",
    tags: ["children", "fantasy", "classic"],
  },
  {
    id: "g1952",
    title: "The Yellow Wallpaper",
    author: "Charlotte Perkins Gilman",
    lang: "en",
    category: "fiction",
    pages: 36,
    description: "A short, unsettling classic about a room that will not stay still.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1952),
    downloadUrl: GUTENBERG_EPUB(1952),
    color: "amber",
    tags: ["short", "classic"],
  },

  // ── Philosophy ────────────────────────────────────────────────────────────
  {
    id: "g1497",
    title: "The Republic",
    author: "Plato",
    lang: "en",
    category: "politics",
    pages: 416,
    description: "Justice, the ideal city, and the cave. The founding text of political thought.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1497),
    downloadUrl: GUTENBERG_EPUB(1497),
    color: "indigo",
    tags: ["philosophy", "politics", "classic"],
  },
  {
    id: "g2680",
    title: "Meditations",
    author: "Marcus Aurelius",
    lang: "en",
    category: "self",
    pages: 254,
    description: "A Roman emperor's private notes to himself. Read one page a day.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(2680),
    downloadUrl: GUTENBERG_EPUB(2680),
    color: "amber",
    tags: ["stoicism", "philosophy", "self-growth"],
  },
  {
    id: "g5827",
    title: "The Enchiridion",
    author: "Epictetus",
    lang: "en",
    category: "self",
    pages: 60,
    description: "A short manual on what is and is not up to you.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(45109),
    downloadUrl: GUTENBERG_EPUB(45109),
    color: "teal",
    tags: ["stoicism", "short", "philosophy"],
  },
  {
    id: "g1232",
    title: "The Prince",
    author: "Niccolò Machiavelli",
    lang: "en",
    category: "politics",
    pages: 140,
    description: "How power is actually kept, written by someone who watched it closely.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1232),
    downloadUrl: GUTENBERG_EPUB(1232),
    color: "rose",
    tags: ["politics", "history", "classic"],
  },
  {
    id: "g3207",
    title: "Thus Spoke Zarathustra",
    author: "Friedrich Nietzsche",
    lang: "en",
    category: "self",
    pages: 352,
    description: "Philosophy written as scripture, by a man who did not believe in it.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(1998),
    downloadUrl: GUTENBERG_EPUB(1998),
    color: "violet",
    tags: ["philosophy", "classic"],
  },

  // ── Science ───────────────────────────────────────────────────────────────
  {
    id: "g2009",
    title: "On the Origin of Species",
    author: "Charles Darwin",
    lang: "en",
    category: "science",
    pages: 502,
    description: "The book that made biology a science. Slow reading, well worth it.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(2009),
    downloadUrl: GUTENBERG_EPUB(2009),
    color: "teal",
    tags: ["science", "evolution", "classic"],
  },
  {
    id: "g5001",
    title: "Relativity: The Special and General Theory",
    author: "Albert Einstein",
    lang: "en",
    category: "science",
    pages: 168,
    description: "Einstein explaining relativity to people who are not physicists.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(5001),
    downloadUrl: GUTENBERG_EPUB(5001),
    color: "indigo",
    tags: ["science", "physics"],
  },
  {
    id: "g13476",
    title: "The Story of Mankind",
    author: "Hendrik Willem van Loon",
    lang: "en",
    category: "history",
    pages: 500,
    description: "Human history told as one long, well-told story.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(75420),
    downloadUrl: GUTENBERG_EPUB(75420),
    color: "amber",
    tags: ["history", "classic"],
  },
  {
    id: "g19641",
    title: "The Problems of Philosophy",
    author: "Bertrand Russell",
    lang: "en",
    category: "self",
    pages: 128,
    description: "A clear, short introduction to what philosophy actually argues about.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(5827),
    downloadUrl: GUTENBERG_EPUB(5827),
    color: "violet",
    tags: ["philosophy", "short"],
  },

  // ── Self-growth / practical ───────────────────────────────────────────────
  {
    id: "g205",
    title: "Bartleby, the Scrivener",
    author: "Herman Melville",
    lang: "en",
    category: "fiction",
    pages: 64,
    description: "A story about work, refusal, and the cost of both.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(205),
    downloadUrl: GUTENBERG_EPUB(205),
    color: "rose",
    tags: ["short", "classic"],
  },
  {
    id: "g3600",
    title: "Essays, First Series",
    author: "Ralph Waldo Emerson",
    lang: "en",
    category: "self",
    pages: 300,
    description: "Self-reliance, and the argument that you already have what you need.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(16643),
    downloadUrl: GUTENBERG_EPUB(16643),
    color: "amber",
    tags: ["essays", "self-growth"],
  },
  {
    id: "g132",
    title: "The Art of War",
    author: "Sun Tzu",
    lang: "en",
    category: "politics",
    pages: 68,
    description: "Thirteen short chapters on conflict that still get quoted in boardrooms.",
    coverUrl: null,
    readUrl: GUTENBERG_HTML(132),
    downloadUrl: GUTENBERG_EPUB(132),
    color: "teal",
    tags: ["strategy", "short", "classic"],
  },

  // ── Arabic (Hindawi) ──────────────────────────────────────────────────────
  {
    id: "h-mutanabbi",
    title: "ديوان المتنبي",
    author: "أبو الطيب المتنبي",
    lang: "ar",
    category: "fiction",
    pages: 400,
    description: "أشهر شاعر عربي. اقرأ قصيدة كل يوم قبل النوم.",
    coverUrl: null,
    readUrl: HINDAWI(2140),
    downloadUrl: null,
    color: "amber",
    tags: ["شعر", "كلاسيكي"],
  },
  {
    id: "h-taha",
    title: "الأيام",
    author: "طه حسين",
    lang: "ar",
    category: "self",
    pages: 300,
    description: "سيرة عميد الأدب العربي، من القرية للأزهر لفرنسا.",
    coverUrl: null,
    readUrl: HINDAWI(191),
    downloadUrl: null,
    color: "teal",
    tags: ["سيرة", "أدب"],
  },
  {
    id: "h-hayawan",
    title: "حي بن يقظان",
    author: "ابن طفيل",
    lang: "ar",
    category: "self",
    pages: 120,
    description: "رجل وحده على جزيرة، بيبني المعرفة من الصفر بعقله.",
    coverUrl: null,
    readUrl: HINDAWI(1293),
    downloadUrl: null,
    color: "violet",
    tags: ["فلسفة", "رواية"],
  },
  {
    id: "h-muqaddimah",
    title: "مقدمة ابن خلدون",
    author: "ابن خلدون",
    lang: "ar",
    category: "history",
    pages: 900,
    description: "أول محاولة لفهم تاريخ المجتمعات بقوانين، مش بحكايات.",
    coverUrl: null,
    readUrl: HINDAWI(1308),
    downloadUrl: null,
    color: "indigo",
    tags: ["تاريخ", "فلسفة"],
  },
  {
    id: "h-kalila",
    title: "كليلة ودمنة",
    author: "عبد الله بن المقفع",
    lang: "ar",
    category: "fiction",
    pages: 250,
    description: "حكايات على لسان الحيوان، فيها سياسة أكثر مما يظهر.",
    coverUrl: null,
    readUrl: HINDAWI(1284),
    downloadUrl: null,
    color: "rose",
    tags: ["حكايات", "كلاسيكي"],
  },
];

/** Categories present in the catalogue, for the filter strip. */
export const CATALOG_CATEGORIES = Array.from(new Set(CATALOG.map((b) => b.category))).sort();

export function catalogById(id: string): CatalogBook | undefined {
  return CATALOG.find((b) => b.id === id);
}

/** Case-insensitive search over title, author and tags. */
export function searchCatalog(query: string, books: CatalogBook[] = CATALOG): CatalogBook[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;
  return books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

/** The direct text file for a Gutenberg entry, when one exists. */
export function plainTextUrl(book: CatalogBook): string | null {
  const m = /^g(\d+)$/.exec(book.id);
  if (!m) return null;
  return GUTENBERG(Number(m[1]));
}
