// Lets plain Node run the TypeScript in src/lib and src/data: maps the "@/" alias
// to src/ and adds the ".ts" extension that the Next bundler normally infers.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

export async function resolve(specifier, context, next) {
  let target = specifier;
  if (specifier.startsWith("@/")) target = pathToFileURL(path.join(SRC, specifier.slice(2))).href;
  if (target.startsWith("file:") || target.startsWith(".")) {
    const base = target.startsWith(".") ? new URL(target, context.parentURL) : new URL(target);
    const file = fileURLToPath(base);
    if (!path.extname(file) && existsSync(`${file}.ts`)) return next(pathToFileURL(`${file}.ts`).href, context);
  }
  return next(target, context);
}
