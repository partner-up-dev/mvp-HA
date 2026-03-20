import { execSync } from "node:child_process";

export interface BuildMetadata {
  backendCommitHash: string;
  repositoryUrl: string | null;
}

const normalizeValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readGitValue = (command: string): string | null => {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return normalizeValue(output);
  } catch {
    return null;
  }
};

const normalizeRepositoryUrl = (value: string | null): string | null => {
  if (!value) return null;

  const withoutGitSuffix = value.replace(/\.git$/, "");
  const sshMatch = withoutGitSuffix.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const host = sshMatch[1];
    const path = sshMatch[2];
    return `https://${host}/${path}`;
  }

  return withoutGitSuffix;
};

const backendCommitHash =
  normalizeValue(process.env.BACKEND_COMMIT_HASH) ??
  readGitValue("git rev-parse HEAD") ??
  "unknown";

const repositoryUrl =
  normalizeRepositoryUrl(
    normalizeValue(process.env.REPOSITORY_URL) ??
      readGitValue("git config --get remote.origin.url"),
  );

export const buildMetadata: BuildMetadata = {
  backendCommitHash,
  repositoryUrl,
};
