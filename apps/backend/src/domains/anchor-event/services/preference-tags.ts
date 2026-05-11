import type { AnchorEventPreferenceTag } from "../../../entities";

const CATEGORY_SEPARATOR = ":";

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const normalizeAnchorEventPreferenceTagLabel = (value: string): string =>
  collapseWhitespace(value).slice(0, 80);

export const normalizeAnchorEventPreferenceTagDescription = (
  value: string | null | undefined,
): string => collapseWhitespace(value ?? "").slice(0, 280);

export const buildAnchorEventPreferenceTagKey = (label: string): string =>
  normalizeAnchorEventPreferenceTagLabel(label).toLocaleLowerCase("zh-CN");

export const deriveAnchorEventPreferenceTagCategory = (
  label: string,
): string | null => {
  const normalized = normalizeAnchorEventPreferenceTagLabel(label);
  if (!normalized.includes(CATEGORY_SEPARATOR)) {
    return null;
  }

  const [category] = normalized.split(CATEGORY_SEPARATOR, 1);
  const resolved = collapseWhitespace(category ?? "");
  return resolved.length > 0 ? resolved : null;
};

export const toAnchorEventPreferenceTagView = (
  tag: AnchorEventPreferenceTag,
): {
  id: number;
  label: string;
  description: string;
  status: AnchorEventPreferenceTag["status"];
} => ({
  id: tag.id,
  label: tag.label,
  description: tag.description,
  status: tag.status,
});
