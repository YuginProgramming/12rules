import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  loadFb2File,
  resolveDefaultFb2Path,
  type Fb2Document,
} from "./fb2/parse.js";

export type {
  Fb2Author,
  Fb2Document,
  Fb2Metadata,
  Fb2Rule,
  Fb2Chapter,
} from "./fb2/parse.js";
export {
  extractRulesFromFb2,
  loadFb2File,
  parseFb2Xml,
  resolveDefaultFb2Path,
} from "./fb2/parse.js";

async function main(): Promise<void> {
  const argPath = process.argv[2];
  const fb2FilePath = argPath
    ? isAbsolute(argPath)
      ? argPath
      : join(process.cwd(), argPath)
    : await resolveDefaultFb2Path();

  try {
    const doc: Fb2Document = await loadFb2File(fb2FilePath);
    console.log("File:", fb2FilePath);
    console.log("Title:", doc.metadata.bookTitle);
    console.log("Authors:", doc.metadata.authors);
    if (doc.metadata.lang) console.log("Lang:", doc.metadata.lang);
    if (doc.metadata.annotationText) {
      console.log(
        "Annotation (preview):",
        doc.metadata.annotationText.slice(0, 400) + "…",
      );
    }
    console.log("Body (preview, first 800 chars):\n");
    console.log(
      doc.bodyPlainText.slice(0, 800) +
        (doc.bodyPlainText.length > 800 ? "…" : ""),
    );
  } catch (e) {
    console.error(
      (e as Error).message,
      "\n\nPlace `peaterspn_12.fb2` in the project folder or pass an explicit path: npm start -- /path/to/book.fb2",
    );
    process.exitCode = 1;
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  await main();
}
