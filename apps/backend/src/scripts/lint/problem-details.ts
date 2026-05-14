import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type Violation = {
  path: string;
  line: number;
  message: string;
};

const backendRoot = process.cwd();
const sourceRoot = path.join(backendRoot, "src");
const allowedFiles = new Set([
  path.normalize(path.join(sourceRoot, "index.ts")),
  path.normalize(path.join(sourceRoot, "scripts/lint/problem-details.ts")),
]);

const isTypeScriptSource = (filePath: string): boolean =>
  filePath.endsWith(".ts") && !filePath.endsWith(".test.ts");

const collectSourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "dist" || entry.name === "node_modules") {
          return [];
        }
        return collectSourceFiles(entryPath);
      }
      return isTypeScriptSource(entryPath) ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
};

const findLineNumber = (content: string, index: number): number =>
  content.slice(0, index).split("\n").length;

const inspectFile = async (filePath: string): Promise<Violation[]> => {
  const normalizedPath = path.normalize(filePath);
  if (allowedFiles.has(normalizedPath)) {
    return [];
  }

  const content = await readFile(filePath, "utf8");
  const violations: Violation[] = [];
  const relativePath = path.relative(backendRoot, filePath).replace(/\\/g, "/");
  const importIndex = content.indexOf("hono/http-exception");

  if (importIndex !== -1) {
    violations.push({
      path: relativePath,
      line: findLineNumber(content, importIndex),
      message:
        "Use Problem Details helpers from src/lib/problem-details.ts instead of importing hono/http-exception.",
    });
  }

  const constructorPattern = /\bnew\s+HTTPException\b/g;
  let match = constructorPattern.exec(content);
  while (match !== null) {
    violations.push({
      path: relativePath,
      line: findLineNumber(content, match.index),
      message:
        "Use throwHttpProblem/createHttpProblem or a typed domain helper instead of new HTTPException.",
    });
    match = constructorPattern.exec(content);
  }

  return violations;
};

const files = await collectSourceFiles(sourceRoot);
const violations = (await Promise.all(files.map(inspectFile))).flat();

if (violations.length > 0) {
  console.error("Problem Details lint failed:");
  for (const violation of violations) {
    console.error(
      `${violation.path}:${violation.line} - ${violation.message}`,
    );
  }
  process.exitCode = 1;
}
