import { access, constants, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FB2_CANDIDATES = ["peaterspn_12.fb2", "12rules.fb2"] as const;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (tagName: string) =>
    ["section", "p", "v", "author", "image", "title", "cite", "poem", "stanza", "body"].includes(
      tagName
    ),
  textNodeName: "#text",
  trimValues: true,
});

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

function sectionTitleText(section: Record<string, unknown>): string | undefined {
  const t = section.title;
  if (t === undefined) return undefined;
  const parts: string[] = [];
  walkTextNodes(t, parts);
  const s = parts.join(" ").replace(/\s+/g, " ").trim();
  return s || undefined;
}

function sectionId(section: Record<string, unknown>): string | undefined {
  const id = section["@_id"];
  return typeof id === "string" ? id : undefined;
}

function walkSection(section: Record<string, unknown>, depth: number, lines: string[]): void {
  if (sectionId(section)?.startsWith("note_")) return;

  const title = sectionTitleText(section);
  if (title) {
    lines.push("  ".repeat(depth) + title);
  }
  const childDepth = title ? depth + 1 : depth;
  for (const child of asArray<Record<string, unknown>>(
    section.section as Record<string, unknown> | Record<string, unknown>[] | undefined
  )) {
    walkSection(child, childDepth, lines);
  }
}

function collectMainBody(body: unknown, lines: string[]): void {
  if (body === null || body === undefined) return;
  for (const b of asArray(body as Record<string, unknown> | Record<string, unknown>[])) {
    if (b["@_name"] === "notes") continue;
    for (const sec of asArray(
      b.section as Record<string, unknown> | Record<string, unknown>[] | undefined
    )) {
      walkSection(sec, 0, lines);
    }
  }
}

function buildContentList(body: unknown): string[] {
  const lines: string[] = [];
  collectMainBody(body, lines);
  return lines;
}

function parseFb2Body(xml: string): unknown {
  const root = xmlParser.parse(xml) as { FictionBook?: Record<string, unknown> };
  const fb = root.FictionBook;
  if (!fb) {
    throw new Error("Not a FictionBook 2.0 file: root <FictionBook> missing");
  }
  return fb.body;
}

async function resolveDefaultFb2Path(): Promise<string> {
  for (const name of FB2_CANDIDATES) {
    const full = join(__dirname, name);
    try {
      await access(full, constants.F_OK);
      return full;
    } catch {
      // next
    }
  }
  return join(__dirname, FB2_CANDIDATES[1]);
}

const argPath = process.argv[2];
const fb2FilePath = argPath
  ? isAbsolute(argPath)
    ? argPath
    : join(process.cwd(), argPath)
  : await resolveDefaultFb2Path();

const outPath = join(__dirname, "content.txt");

const xml = await readFile(fb2FilePath, "utf8");
const body = parseFb2Body(xml);
const list = buildContentList(body);
await writeFile(outPath, list.join("\n") + (list.length ? "\n" : ""), "utf8");

console.log("Wrote", outPath, `(${list.length} entries)`);
console.log("Source:", fb2FilePath);
