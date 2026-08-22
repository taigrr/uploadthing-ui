#!/usr/bin/env bun
/**
 * Per-package deslop scan. Warnings-only by default: findings are printed for
 * review but the process exits 0 so deslop never blocks lint/CI. Set
 * DESLOP_FAIL_ON=high (or medium/low) to gate on that tier.
 *
 * Run from a package root so deslop can resolve that package's tsconfig and
 * path aliases — scanning from a non-package root silently no-ops.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

type Confidence = "high" | "medium" | "low";
interface Finding {
  confidence?: Confidence;
  path?: string;
  line?: number;
  kind?: string;
  name?: string;
  reason?: string;
  instances?: { path: string; startLine?: number }[];
}
type Result = Record<string, unknown> & { totalFiles?: number };

const root = process.cwd();
const failOn = process.env.DESLOP_FAIL_ON as Confidence | undefined;

const args = [
  "deslop-cli",
  ".",
  "--json",
  "--ignore",
  "**/*.test.*",
  "--ignore",
  "**/*.spec.*",
  "--ignore",
  "**/dist/**",
  "--ignore",
  "**/build/**",
  "--ignore",
  "**/.next/**",
  "--ignore",
  "**/.turbo/**",
];
if (existsSync(`${root}/tsconfig.json`)) args.push("--tsconfig", `${root}/tsconfig.json`);

const run = spawnSync("bunx", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (run.status !== 0 && !run.stdout) {
  console.warn(`deslop: skipped ${root} (${(run.stderr || "").trim().split("\n").pop()})`);
  process.exit(0);
}

let result: Result;
try {
  result = JSON.parse(run.stdout) as Result;
} catch {
  console.warn(`deslop: skipped ${root} (unparseable output)`);
  process.exit(0);
}

const rel = (p?: string): string => (p ?? "").replace(`${root}/`, "");
const tiers: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
const lines: string[] = [];

for (const [category, value] of Object.entries(result)) {
  if (!Array.isArray(value)) continue;
  for (const f of value as Finding[]) {
    const tier = f.confidence;
    if (tier !== "high" && tier !== "medium" && tier !== "low") continue;
    tiers[tier]++;
    const where = rel(f.path ?? f.instances?.[0]?.path);
    const loc = f.line ? `:${f.line}` : "";
    const detail = f.kind ?? f.name ?? f.reason ?? "";
    lines.push(`  [${tier}] ${category} ${where}${loc} ${detail}`.trimEnd());
  }
}

const total = tiers.high + tiers.medium + tiers.low;
if (total === 0) process.exit(0);

console.warn(
  `deslop: ${tiers.high} high, ${tiers.medium} medium, ${tiers.low} low finding(s) in ${result.totalFiles ?? "?"} files`,
);
for (const line of lines) console.warn(line);

if (failOn && tiers[failOn] > 0) {
  console.error(`deslop: failing on ${tiers[failOn]} ${failOn}-confidence finding(s)`);
  process.exit(1);
}
process.exit(0);
