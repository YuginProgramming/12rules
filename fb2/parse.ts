import { access, constants, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

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
  bodyPlainText: string;
  body: unknown;
};

export type Fb2Chapter = {
  chapterNumber: number;
  title: string;
  content: string;
};

export type Fb2Rule = {
  ruleNumber: number;
  title: string;
  chapters: Fb2Chapter[];
};

const FB2_CANDIDATE_FILES = ["peaterspn_12.fb2", "12rules.fb2"] as const;

const RULE_TITLE = /^RULE\s+(\d+)\s+(.+)$/;

function firstString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "object" && "#text" in (v as object)) {
    const t = (v as { "#text"?: string })["#text"];
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return undefined;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function walkTextNodes(node: unknown, out: string[], skipKeys: Set<string>): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    const t = node.trim();
    if (t) out.push(t);
    return;
  }
  if (typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const el of node) walkTextNodes(el, out, skipKeys);
    return;
  }
  const o = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (skipKeys.has(k)) continue;
    if (k === "#text" && typeof v === "string") {
      const t = v.trim();
      if (t) out.push(t);
    } else {
      walkTextNodes(v, out, skipKeys);
    }
  }
}

function bodyToPlainText(body: unknown): string {
  const parts: string[] = [];
  walkTextNodes(body, parts, new Set(["binary", "image"]));
  return parts.join("\n\n");
}

function sectionTitle(section: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const t of asArray(section.title)) {
    walkTextNodes(t, parts, new Set(["binary", "image"]));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Paragraph text only; skips footnote anchors (`a`) for cleaner import. */
function paragraphText(p: unknown): string {
  const parts: string[] = [];
  walkTextNodes(p, parts, new Set(["binary", "image", "a"]));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function sectionContent(section: Record<string, unknown>): string {
  return asArray(section.p)
    .map(paragraphText)
    .filter(Boolean)
    .join("\n\n");
}

function parseTitleInfo(
  titleInfo: Record<string, unknown> | undefined,
): Pick<Fb2Metadata, "bookTitle" | "authors" | "lang" | "date" | "annotationText"> {
  if (!titleInfo) {
    return { bookTitle: "", authors: [] };
  }
  const authors: Fb2Author[] = asArray(
    titleInfo.author as Record<string, unknown> | Record<string, unknown>[],
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
    firstString(dateRaw) ??
    (dateRaw as { "#text"?: string } | undefined)?.["#text"]?.trim();
  const ann = titleInfo["annotation"] as Record<string, unknown> | undefined;
  const annotationParts: string[] = [];
  if (ann) {
    for (const p of asArray(ann.p)) walkTextNodes(p, annotationParts, new Set(["binary", "image"]));
  }
  return {
    bookTitle,
    authors,
    lang,
    date,
    annotationText: annotationParts.length
      ? annotationParts.join("\n\n")
      : undefined,
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (tagName: string) =>
    ["section", "p", "v", "author", "image", "title", "cite", "poem", "stanza"].includes(
      tagName,
    ),
  textNodeName: "#text",
  trimValues: true,
});

export async function resolveDefaultFb2Path(): Promise<string> {
  for (const name of FB2_CANDIDATE_FILES) {
    const full = join(PROJECT_ROOT, name);
    try {
      await access(full, constants.F_OK);
      return full;
    } catch {
      // try next
    }
  }
  return join(PROJECT_ROOT, FB2_CANDIDATE_FILES[0]);
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
  return {
    metadata: {
      bookTitle: meta.bookTitle,
      authors: meta.authors,
      lang: meta.lang,
      date: meta.date,
      annotationText: meta.annotationText,
    },
    bodyPlainText: bodyToPlainText(body),
    body,
  };
}

export async function loadFb2File(path: string): Promise<Fb2Document> {
  const xml = await readFile(path, "utf8");
  return parseFb2Xml(xml);
}

/**
 * Extract RULE 1–12 and their child chapter sections from the main FB2 body.
 * Uses body[0] when multiple bodies exist (notes/endnotes often live in later bodies).
 */
export function extractRulesFromFb2(doc: Fb2Document): Fb2Rule[] {
  const bodies = asArray(doc.body as Record<string, unknown> | Record<string, unknown>[]);
  const mainBody = bodies[0];
  if (!mainBody) return [];

  const rules: Fb2Rule[] = [];
  for (const section of asArray(
    mainBody.section as Record<string, unknown> | Record<string, unknown>[],
  )) {
    const title = sectionTitle(section);
    const m = RULE_TITLE.exec(title);
    if (!m) continue;

    const ruleNumber = Number(m[1]);
    const ruleTitle = m[2].trim();
    const chapters: Fb2Chapter[] = asArray(
      section.section as Record<string, unknown> | Record<string, unknown>[],
    ).map((child, index) => ({
      chapterNumber: index + 1,
      title: sectionTitle(child),
      content: sectionContent(child),
    }));

    rules.push({ ruleNumber, title: ruleTitle, chapters });
  }

  return rules.sort((a, b) => a.ruleNumber - b.ruleNumber);
}
