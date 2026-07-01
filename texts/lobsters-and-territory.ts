import { access, constants, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SECTION_ID = "_lobsters_and_territory";
const FB2_CANDIDATES = ["peaterspn_12.fb2", "12rules.fb2"] as const;

const isArray = (tagName: string) =>
  ["section", "p", "v", "author", "image", "title", "cite", "poem", "stanza", "body"].includes(
    tagName
  );

const xmlParser = new XMLParser({
  preserveOrder: true,
  removeNSPrefix: true,
  isArray,
  textNodeName: "#text",
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

type OrderedValue = string | number | boolean | null | undefined | OrderedValue[] | Record<string, unknown>;

/** In-order text from the preserveOrder tree; skips attributes (`:@`, `\@_*`) */
function walkOrderedText(node: OrderedValue): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean")
    return String(node);
  if (Array.isArray(node)) {
    return node.map((n) => walkOrderedText(n as OrderedValue)).join("");
  }
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(o, "#text") && typeof o["#text"] === "string") {
      if (Object.keys(o).length === 1) return o["#text"] as string;
    }
    let s = "";
    for (const k of Object.keys(o)) {
      if (k === ":@" || k.startsWith("@_")) continue;
      s += walkOrderedText(o[k] as OrderedValue);
    }
    return s;
  }
  return "";
}

function normParagraph(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

type OrderedSection = Record<string, unknown>;

function isNotesBody(n: { body?: unknown; ":@": unknown }): boolean {
  const a = n[":@"] as Record<string, string> | undefined;
  return a != null && a["@_name"] === "notes";
}

function findSectionInOrdered(sections: unknown, targetId: string): OrderedSection | undefined {
  if (sections == null) return undefined;
  const list = (Array.isArray(sections) ? sections : [sections]) as unknown[];
  for (const s of list) {
    if (typeof s !== "object" || s === null) continue;
    const o = s as OrderedSection;
    const id = (o[":@"] as Record<string, string> | undefined)?.["@_id"];
    if (id === targetId) return o;
  }
  for (const s of list) {
    if (typeof s !== "object" || s === null) continue;
    const o = s as { section?: unknown };
    if (o.section) {
      const f = findSectionInOrdered(o.section, targetId);
      if (f) return f;
    }
  }
  return undefined;
}

/** `body` on FictionBook: array of `{ section, :@? }` blocks; skip `name=notes` */
function findInMainBody(body: unknown, targetId: string): OrderedSection | undefined {
  if (body == null) return undefined;
  const chunks = (Array.isArray(body) ? body : [body]) as unknown[];
  for (const b of chunks) {
    if (typeof b !== "object" || b === null) continue;
    if (isNotesBody(b as { body: unknown; ":@": unknown })) continue;
    const block = b as { section?: unknown };
    if (block.section) {
      const found = findSectionInOrdered(block.section, targetId);
      if (found) return found;
    }
  }
  return undefined;
}

/** `section` from preserveOrder: has `section` (array of blocks) and optional `:@` id */
function orderedSectionToDocument(sec: OrderedSection): string {
  const rawBlocks = sec.section;
  if (!Array.isArray(rawBlocks)) return "";

  const titleLines: string[] = [];
  const bodyParas: string[] = [];

  for (const block of rawBlocks) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as Record<string, unknown>;
    if (b.title) {
      const t = walkOrderedText(b.title as OrderedValue);
      if (t.trim()) titleLines.push(normParagraph(t));
    }
    if (b.p) {
      const t = walkOrderedText(b.p as OrderedValue);
      if (t.trim()) bodyParas.push(normParagraph(t));
    }
  }

  const head = titleLines.length ? titleLines.join("\n") : "";
  const text = [head, bodyParas.join("\n\n")].filter(Boolean).join("\n\n");
  return text;
}

type FictionBookRoot = Array<{ FictionBook: unknown } | Record<string, unknown>>;

function parseFictionBookOrdered(xml: string): unknown {
  const root = xmlParser.parse(xml) as FictionBookRoot;
  const fb = root.find((x) => (x as { FictionBook: unknown }).FictionBook) as
    | { FictionBook: unknown }
    | undefined;
  if (!fb?.FictionBook) {
    throw new Error("Not a FictionBook 2.0 file: root <FictionBook> missing");
  }
  return fb.FictionBook;
}

async function resolveDefaultFb2Path(): Promise<string> {
  const projectRoot = join(__dirname, "..");
  for (const name of FB2_CANDIDATES) {
    const full = join(projectRoot, name);
    try {
      await access(full, constants.F_OK);
      return full;
    } catch {
      // next
    }
  }
  return join(projectRoot, FB2_CANDIDATES[1]);
}

const argPath = process.argv[2];
const fb2FilePath = argPath
  ? isAbsolute(argPath)
    ? argPath
    : join(process.cwd(), argPath)
  : await resolveDefaultFb2Path();

const outPath = join(__dirname, "Lobsters—and Territory.txt");

const xml = await readFile(fb2FilePath, "utf8");
const fictionBook = parseFictionBookOrdered(xml) as Array<{ body: unknown; description?: unknown }>;
const bodyElement = fictionBook.find((n) => (n as { body: unknown }).body) as
  | { body: unknown }
  | undefined;
if (!bodyElement) {
  console.error("No <body> in FB2 file");
  process.exitCode = 1;
} else {
  const section = findInMainBody(bodyElement.body, SECTION_ID);
  if (!section) {
    console.error(`Section with id ${SECTION_ID} not found in`, fb2FilePath);
    process.exitCode = 1;
  } else {
    const text = orderedSectionToDocument(section) + "\n";
    await writeFile(outPath, text, "utf8");
    console.log("Wrote", outPath);
    console.log("Source:", fb2FilePath);
  }
}
