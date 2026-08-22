#!/usr/bin/env bun
/**
 * Soft warning when a tracked source file exceeds 300 non-blank, non-comment lines.
 * The hard 500-line limit is enforced by oxlint's `max-lines` rule.
 *
 * Override per-file with: `// oxlint-disable max-lines`
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const DEFAULT_WARN = 300;
const WARN = Number(process.env.FILE_LINES_WARN ?? DEFAULT_WARN);

const EXCLUDE = [
  /\/node_modules\//,
  /\/\.next\//,
  /\/dist\//,
  /\/build\//,
  /\/\.turbo\//,
  /\/\.wrangler\//,
  /\/components\/ui\//,
  /\.d\.ts$/,
  /payload-types\.ts$/,
  /worker-configuration\.d\.ts$/,
];
const INCLUDE = /\.(tsx?|jsx?)$/;

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f: string) => INCLUDE.test(f) && !EXCLUDE.some((re) => re.test(f)));

let warnings = 0;
for (const file of files) {
  let text: string;
  try {
    if (!statSync(file).isFile()) continue;
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("oxlint-disable max-lines")) continue;

  let count = 0;
  let inBlock = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlock = true;
      continue;
    }
    if (line.startsWith("//")) continue;
    count++;
  }

  if (count > WARN) {
    console.warn(`warn   ${file}: ${count} lines (soft limit ${WARN})`);
    warnings++;
  }
}

if (warnings > 0) console.warn(`\nfile-size: ${warnings} warning(s)`);
