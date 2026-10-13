// Merges the lcov reports of every test runner and fails when overall line
// coverage is below the threshold. Run after the unit and mobile coverage scripts.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THRESHOLD = 85;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Each report, and the directory its file paths are relative to.
const REPORTS = [
  { file: 'coverage/unit/lcov.info', base: '.' },
  { file: 'app/mobile-app/coverage/lcov.info', base: 'app/mobile-app' },
];

/** Parses lcov text into a map of repo-relative file path -> (line number -> hit count). */
export function parseLcov(text, base, files = new Map()) {
  let lines;
  for (const row of text.split('\n')) {
    if (row.startsWith('SF:')) {
      const absolute = path.resolve(repoRoot, base, row.slice(3).trim());
      const key = path.relative(repoRoot, absolute).split(path.sep).join('/');
      lines = files.get(key) ?? new Map();
      files.set(key, lines);
    } else if (row.startsWith('DA:') && lines) {
      const [lineNumber, hits] = row.slice(3).split(',').map(Number);
      // A line covered by any runner counts as covered.
      lines.set(lineNumber, Math.max(lines.get(lineNumber) ?? 0, hits));
    }
  }
  return files;
}

export function summarize(files) {
  let total = 0;
  let covered = 0;
  for (const lines of files.values()) {
    for (const hits of lines.values()) {
      total += 1;
      covered += hits > 0 ? 1 : 0;
    }
  }
  return { total, covered, percent: total === 0 ? 0 : (covered / total) * 100 };
}

function main() {
  const files = new Map();
  for (const report of REPORTS) {
    const reportPath = path.join(repoRoot, report.file);
    if (!existsSync(reportPath)) {
      console.error(`Missing coverage report: ${report.file}. Run its coverage script first.`);
      process.exit(1);
    }
    parseLcov(readFileSync(reportPath, 'utf8'), report.base, files);
  }

  const { total, covered, percent } = summarize(files);
  const uncovered = [...files.entries()]
    .map(([file, lines]) => ({ file, ...summarize(new Map([[file, lines]])) }))
    .filter((entry) => entry.covered < entry.total)
    .sort((a, b) => a.percent - b.percent);

  for (const entry of uncovered) {
    console.log(`${entry.percent.toFixed(1).padStart(5)}%  ${entry.file}`);
  }
  console.log(
    `\nLine coverage: ${percent.toFixed(2)}% (${covered}/${total} lines in ${files.size} files)`,
  );

  if (percent < THRESHOLD) {
    console.error(`Coverage is below the required ${THRESHOLD}%.`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
