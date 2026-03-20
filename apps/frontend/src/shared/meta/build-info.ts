export interface FrontendBuildInfo {
  frontendCommitHash: string;
  repositoryUrl: string | null;
}

const normalizeValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const frontendBuildInfo: FrontendBuildInfo = {
  frontendCommitHash: normalizeValue(import.meta.env.VITE_FRONTEND_COMMIT_HASH) ?? "unknown",
  repositoryUrl: normalizeValue(import.meta.env.VITE_REPOSITORY_URL),
};
