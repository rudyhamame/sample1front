const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const targetRoots = [path.join(repoRoot, "src", "NogaPlan")];
const allowedExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".html",
  ".json",
  ".md",
]);
const mojibakePattern = /\u00D8|\u00D9|\u00C3|\u00E2|\uFFFD/;
const suspiciousQuestionPattern = /\?{3,}/;
const issues = [];

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    if (mojibakePattern.test(content)) {
      issues.push({
        file: fullPath,
        issue: "Possible mojibake sequence found",
      });
    }
    if (suspiciousQuestionPattern.test(content)) {
      issues.push({
        file: fullPath,
        issue: "Suspicious literal question-mark run found",
      });
    }
  }
}

for (const targetRoot of targetRoots) {
  if (fs.existsSync(targetRoot)) {
    walk(targetRoot);
  }
}

if (issues.length > 0) {
  console.error("Text integrity check failed:\n");
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.issue}`);
  }
  process.exit(1);
}

console.log("Text integrity check passed for NogaPlan source.");
