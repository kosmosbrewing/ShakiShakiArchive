import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredMarkdownFiles = [
  "README.md",
  "AGENTS.md",
  "Codex.md",
  "MEMORY.md",
  "CLAUDE.md",
  "BACKEND_GUIDE.md",
  "DEPLOY.md",
  "FRONTEND_GUIDE.md",
  "SEO_GUIDE.md",
  "performance-comparison.md",
  "docs/ARCHITECTURE.md",
  "docs/DEVOPS.md",
  "docs/QUALITY_IMPROVEMENTS_2026-07-08.md",
  "docs/RELEASE_2026-07-08.md",
  "docs/SECURITY.md",
  "docs/SEO_GEO_IMPROVEMENT_PLAN.md",
  "docs/TECHNICAL_CHALLENGES.md",
];

const ignoredDirectories = new Set([".git", "node_modules", "dist", ".terraform"]);

function collectMarkdownFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectMarkdownFiles(absolutePath));
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(ROOT, absolutePath));
    }
  }
  return files;
}

const markdownFiles = collectMarkdownFiles(ROOT).sort();

const requiredFiles = [
  ...requiredMarkdownFiles,
  ".env.example",
  ".github/workflows/deploy.yml",
  "cloudfront-function.js",
  "public/robots.txt",
  "public/llms.txt",
  "scripts/prerender/index.js",
  "terraform/environments/prod/service-discovery.tf",
  "terraform/environments/prod/terraform.tfvars.example",
];
const errors = [];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    errors.push("missing required file: " + relativePath);
  }
}

function checkRelativeLinks(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return;

  const markdown = fs.readFileSync(absolutePath, "utf8");
  const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (
      !target ||
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      continue;
    }

    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }

    target = target.split("#", 1)[0];
    if (!target) continue;

    let decodedTarget = target;
    try {
      decodedTarget = decodeURIComponent(target);
    } catch {
      errors.push(relativePath + ": invalid encoded link: " + target);
      continue;
    }

    const resolved = path.resolve(path.dirname(absolutePath), decodedTarget);
    if (!fs.existsSync(resolved)) {
      errors.push(relativePath + ": broken relative link: " + target);
    }
  }
}

for (const relativePath of markdownFiles) {
  checkRelativeLinks(relativePath);
}

const historicalLocalDocs = {
  "CLOUDFRONT_SETUP.md": "Status: historical and unsafe for direct execution",
  "terraform/TERRA_SETUP_GUIDE.md": "Status: historical and unsafe for direct execution",
  "performance-final-report.md": "Status: historical measurement snapshot",
  "performance-ultimate-report.md": "Status: historical measurement snapshot",
};
for (const [relativePath, marker] of Object.entries(historicalLocalDocs)) {
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath)) {
    const content = fs.readFileSync(absolutePath, "utf8");
    if (!content.includes(marker)) {
      errors.push(relativePath + ": missing historical safety marker");
    }
  }
}

const sourceContracts = [
  ["cloudfront-function.js", "uri.startsWith('/fonts/')"],
  ["cloudfront-function.js", "normalizedUri === '/product/all'"],
  ["scripts/prerender/index.js", "assertComplete(runStats)"],
  [".github/workflows/deploy.yml", '"/faq"'],
  [".github/workflows/deploy.yml", '"/faq.html"'],
  [".github/workflows/deploy.yml", '"/terms"'],
  [".github/workflows/deploy.yml", '"/terms.html"'],
  [".github/workflows/deploy.yml", '"/privacy"'],
  [".github/workflows/deploy.yml", '"/privacy.html"'],
];
for (const [relativePath, expectedText] of sourceContracts) {
  const content = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  if (!content.includes(expectedText)) {
    errors.push(relativePath + ": missing harness contract " + expectedText);
  }
}

function collectCodeFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCodeFiles(absolutePath));
    } else if (/\.(?:ts|vue|js|html|ya?ml)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const viteKeys = new Set();
const codeFiles = [
  ...collectCodeFiles(path.join(ROOT, "src")),
  ...collectCodeFiles(path.join(ROOT, "scripts")),
  path.join(ROOT, "index.html"),
  path.join(ROOT, ".github/workflows/deploy.yml"),
].filter((filePath) => fs.existsSync(filePath));

for (const filePath of codeFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const match of content.matchAll(/\bVITE_[A-Z0-9_]+\b/g)) {
    viteKeys.add(match[0]);
  }
}

const envExamplePath = path.join(ROOT, ".env.example");
if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, "utf8");
  const documentedKeys = new Set(
    [...envExample.matchAll(/^(VITE_[A-Z0-9_]+)=/gm)].map((match) => match[1]),
  );

  for (const key of [...viteKeys].sort()) {
    if (!documentedKeys.has(key)) {
      errors.push(".env.example is missing code-referenced key: " + key);
    }
  }
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
);
const readme = fs.existsSync(path.join(ROOT, "README.md"))
  ? fs.readFileSync(path.join(ROOT, "README.md"), "utf8")
  : "";

for (const scriptName of Object.keys(packageJson.scripts || {})) {
  const invocation = "npm run " + scriptName;
  if (!readme.includes(invocation)) {
    errors.push("README.md does not document package script: " + invocation);
  }
}

if (errors.length > 0) {
  console.error("Documentation verification failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}

console.log(
  "Documentation verification passed (" +
    markdownFiles.length +
    " Markdown files, " +
    viteKeys.size +
    " VITE keys).",
);
