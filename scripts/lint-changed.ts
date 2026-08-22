#!/usr/bin/env bun
/**
 * Lint only the files that changed instead of walking the whole repo.
 * Changed set = committed vs base ref + staged + unstaged + untracked.
 *
 * Usage:
 *   bun run lint:changed                # vs origin/master
 *   bun run lint:changed main           # vs a different base ref
 *   LINT_BASE=HEAD~3 bun run lint:changed
 *   bun run lint:changed origin/master --fix   # extra flags forwarded to oxlint
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const LINTABLE = /\.(cjs|mjs|jsx?|tsx?)$/;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}

const args = process.argv.slice(2);
const baseArg = args.find((a) => !a.startsWith("-"));
const passthrough = args.filter((a) => a !== baseArg);
const base = baseArg ?? process.env.LINT_BASE ?? "origin/master";

let diffBase = base;
try {
  diffBase = git(["merge-base", base, "HEAD"]).trim() || base;
} catch {
  // Keep `base` as-is; the diff below will surface an actionable error.
}

const sources = new Set<string>();
const collect = (out: string): void => {
  for (const line of out.split("\n")) {
    const file = line.trim();
    if (file && LINTABLE.test(file)) sources.add(file);
  }
};

try {
  collect(git(["diff", "--name-only", "--diff-filter=ACMR", `${diffBase}...HEAD`]));
} catch (error) {
  console.error(`lint:changed: could not diff against "${base}". Is it fetched?`);
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
collect(git(["diff", "--name-only", "--diff-filter=ACMR"]));
collect(git(["diff", "--name-only", "--cached", "--diff-filter=ACMR"]));
collect(git(["ls-files", "--others", "--exclude-standard"]));

const files = [...sources].filter((f) => existsSync(f)).sort();

if (files.length === 0) {
  console.log(`lint:changed: no changed lintable files vs ${base}.`);
  process.exit(0);
}

console.log(`lint:changed: linting ${files.length} changed file(s) vs ${base}...`);
const result = spawnSync("bunx", ["oxlint", "--no-error-on-unmatched-pattern", ...passthrough, ...files], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
