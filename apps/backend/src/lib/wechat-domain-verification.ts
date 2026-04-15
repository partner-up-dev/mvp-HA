import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const WECHAT_DOMAIN_VERIFICATION_FILENAME = "XdiIXm3WSq.txt";

const verificationFileCandidates = [
  new URL(
    `../../../frontend/public/${WECHAT_DOMAIN_VERIFICATION_FILENAME}`,
    import.meta.url,
  ),
  new URL(
    `../../frontend/public/${WECHAT_DOMAIN_VERIFICATION_FILENAME}`,
    import.meta.url,
  ),
  new URL(
    `../verification/${WECHAT_DOMAIN_VERIFICATION_FILENAME}`,
    import.meta.url,
  ),
];

let cachedVerificationContent: string | null = null;

export const getWechatDomainVerificationContent = (): string => {
  if (cachedVerificationContent !== null) {
    return cachedVerificationContent;
  }

  for (const candidate of verificationFileCandidates) {
    try {
      cachedVerificationContent = readFileSync(candidate, "utf8");
      return cachedVerificationContent;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  const attemptedPaths = verificationFileCandidates.map((candidate) =>
    fileURLToPath(candidate),
  );
  throw new Error(
    `WeChat domain verification file not found. Tried: ${attemptedPaths.join(", ")}`,
  );
};
