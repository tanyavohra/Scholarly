const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runOrThrow(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const joined = [cmd, ...args].join(" ");
    const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
    const tail = combined.length > 6000 ? combined.slice(-6000) : combined;
    throw new Error(`Command failed (${result.status}): ${joined}\n--- output tail ---\n${tail}`);
  }
}

function tryRun(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  return !result.error && result.status === 0;
}

function ensureExists(dirPath, label) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`${label} not found at ${dirPath}`);
  }
}

function copyDirSync(src, dst) {
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}

function main() {
  const refinedRoot = path.join(process.cwd(), "frontend_refined");
  ensureExists(refinedRoot, "Frontend folder");

  const prefixArgs = ["--prefix", "frontend_refined"];
  const npm = npmCmd();

  const refinedNodeModules = path.join(refinedRoot, "node_modules");
  const hasNodeModules = fs.existsSync(refinedNodeModules);
  const hasLockfile = fs.existsSync(path.join(refinedRoot, "package-lock.json"));

  if (!hasNodeModules) {
    const installed =
      (hasLockfile && tryRun(npm, [...prefixArgs, "ci"])) ||
      tryRun(npm, [...prefixArgs, "install", "--no-audit", "--no-fund"]);
    if (!installed) throw new Error("Failed to install frontend dependencies");
  }

  runOrThrow(npm, [...prefixArgs, "run", "build"]);

  const distDir = path.join(refinedRoot, "dist");
  const outDir = path.join(process.cwd(), "build");
  ensureExists(distDir, "Frontend build output (dist)");
  copyDirSync(distDir, outDir);
}

main();
