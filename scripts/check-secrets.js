#!/usr/bin/env node
/**
 * Fails if likely secrets are tracked by git or appear in staged/committed paths.
 * Run: npm run security:check
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function trackedFiles() {
  try {
    return execSync("git ls-files", { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    console.error("Not a git repository — skip.");
    process.exit(0);
  }
}

const forbiddenName =
  /(^|\/)\.env(?!\.example$)|\.pem$|credentials\.json$|service-account|service_role/i;

const secretPatterns = [
  /postgresql:\/\/[^:\s]+:[^@\s]+@/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\./,
  /service_role/i,
  /SUPABASE_SERVICE_ROLE/i,
];

let failed = false;
const files = trackedFiles();

for (const file of files) {
  if (forbiddenName.test(file)) {
    console.error(`Tracked secret-like path: ${file}`);
    failed = true;
  }
}

const scanRoots = ["app", "components", "lib", "scripts", "middleware.ts", "drizzle.config.ts"];
for (const rel of scanRoots) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  walk(abs);
}

function walk(dir) {
  const st = fs.statSync(dir);
  if (st.isFile()) {
    scanFile(dir);
    return;
  }
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    walk(path.join(dir, name));
  }
}

function scanFile(file) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|sql)$/.test(file)) return;
  if (file.includes(`${path.sep}node_modules${path.sep}`)) return;
  const text = fs.readFileSync(file, "utf8");
  // Allow .env.example / SECURITY.md / this script to mention patterns.
  if (file.endsWith(".env.example") || file.endsWith("SECURITY.md")) return;
  if (file.endsWith("check-secrets.js")) return;
  for (const re of secretPatterns) {
    if (re.test(text)) {
      // Allow placeholder DATABASE_URL docs in README
      if (file.endsWith("README.md") && /YOUR_PASSWORD|PASSWORD@aws/.test(text)) {
        continue;
      }
      console.error(`Possible secret in ${path.relative(root, file)} (${re})`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("\nsecurity:check failed — remove secrets before pushing.");
  process.exit(1);
}
console.log("security:check passed — no tracked env files or obvious hardcoded secrets.");
