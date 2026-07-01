import { access, constants, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type Fb2Author = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  nickname?: string;
};

export type Fb2Metadata = {
  bookTitle: string;
  authors: Fb2Author[];
  lang?: string;
  date?: string;
  annotationText?: string;
};

export type Fb2Document = {
  metadata: Fb2Metadata;
  /** Visible body text, paragraphs joined with newlines (FB2 is XML, structure is normalized). */
  bodyPlainText: string;
  /** Raw <body> element after XML parse (namespaces stripped) for custom iteration. */
  body: unknown;
};

const FB2_CANDIDATE_FILES = [
  "peaterspn_12.fb2",
  "12rules.fb2",
] as const;

function firstString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "object" && "#text" in (v as object)) {
    const t = (v as { "#text"?: string })["#text"];
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return undefined;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function walkTextNodes(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    const t = node.trim();
    if (t) out.push(t);
    return;
  }
  if (typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const el of node) walkTextNodes(el, out);
    return;
  }
  const o = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (k === "binary" || k === "image") continue;
    if (k === "#text" && typeof v === "string") {
      const t = v.trim();
      if (t) out.push(t);
    } else {
      walkTextNodes(v, out);
    }
  }
}

function bodyToPlainText(body: unknown): string {
  const parts: string[] = [];
  walkTextNodes(body, parts);
  return parts.join("\n\n");
}

function parseTitleInfo(
  titleInfo: Record<string, unknown> | undefined
): Pick<Fb2Metadata, "bookTitle" | "authors" | "lang" | "date" | "annotationText"> {
  if (!titleInfo) {
    return { bookTitle: "", authors: [] };
  }
  const authors: Fb2Author[] = asArray<Record<string, unknown>>(
    titleInfo.author as Record<string, unknown> | Record<string, unknown>[]
  ).map((a) => ({
    firstName: firstString(a["first-name"]),
    middleName: firstString(a["middle-name"]),
    lastName: firstString(a["last-name"]),
    nickname: firstString(a["nickname"]),
  }));
  const bookTitle = firstString(titleInfo["book-title"]) ?? "";
  const lang = firstString(titleInfo["lang"]);
  const dateRaw = titleInfo["date"];
  const date =
    firstString(dateRaw) ?? (dateRaw as { "#text"?: string } | undefined)?.["#text"]?.trim();
  const ann = titleInfo["annotation"] as Record<string, unknown> | undefined;
  const annotationParts: string[] = [];
  if (ann) {
    const ps = asArray(ann.p);
    for (const p of ps) {
      walkTextNodes(p, annotationParts);
    }
  }
  return {
    bookTitle,
    authors,
    lang,
    date: date,
    annotationText: annotationParts.length ? annotationParts.join("\n\n") : undefined,
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (tagName: string) =>
    ["section", "p", "v", "author", "image", "title", "cite", "poem", "stanza"].includes(
      tagName
    ),
  textNodeName: "#text",
  trimValues: true,
});

/**
 * Resolves a `.fb2` file next to this script. Tries `peaterspn_12.fb2` first, then
 * `12rules.fb2`.
 */
export async function resolveDefaultFb2Path(): Promise<string> {
  for (const name of FB2_CANDIDATE_FILES) {
    const full = join(__dirname, name);
    try {
      await access(full, constants.F_OK);
      return full;
    } catch {
      // try next
    }
  }
  return join(__dirname, FB2_CANDIDATE_FILES[0]);
}

export function parseFb2Xml(xml: string): Fb2Document {
  const root = xmlParser.parse(xml) as { FictionBook?: Record<string, unknown> };
  const fb = root.FictionBook;
  if (!fb) {
    throw new Error("Not a FictionBook 2.0 file: root <FictionBook> missing");
  }
  const desc = fb.description as Record<string, unknown> | undefined;
  const titleInfo = desc?.["title-info"] as Record<string, unknown> | undefined;
  const meta = parseTitleInfo(titleInfo);
  const body = fb.body;
  const bodyPlainText = bodyToPlainText(body);
  return {
    metadata: {
      bookTitle: meta.bookTitle,
      authors: meta.authors,
      lang: meta.lang,
      date: meta.date,
      annotationText: meta.annotationText,
    },
    bodyPlainText,
    body,
  };
}

export async function loadFb2File(path: string): Promise<Fb2Document> {
  const xml = await readFile(path, "utf8");
  return parseFb2Xml(xml);
}

const argPath = process.argv[2];
const fb2FilePath = argPath
  ? isAbsolute(argPath)
    ? argPath
    : join(process.cwd(), argPath)
  : await resolveDefaultFb2Path();

try {
  const doc = await loadFb2File(fb2FilePath);
  console.log("File:", fb2FilePath);
  console.log("Title:", doc.metadata.bookTitle);
  console.log("Authors:", doc.metadata.authors);
  if (doc.metadata.lang) console.log("Lang:", doc.metadata.lang);
  if (doc.metadata.annotationText) {
    console.log("Annotation (preview):", doc.metadata.annotationText.slice(0, 400) + "…");
  }
  console.log("Body (preview, first 800 chars):\n");
  console.log(doc.bodyPlainText.slice(0, 800) + (doc.bodyPlainText.length > 800 ? "…" : ""));
} catch (e) {
  console.error(
    (e as Error).message,
    "\n\nPlace `peaterspn_12.fb2` in the project folder or pass an explicit path: npm start -- /path/to/book.fb2"
  );
  process.exitCode = 1;
}
