import { i18n } from "@/locales/i18n";

export const normalizeUrl = (rawUrl: string, baseHref: string): string => {
  try {
    return new URL(rawUrl, baseHref).toString();
  } catch {
    return rawUrl;
  }
};

export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error(i18n.global.t("errors.clipboardCopyFailed"));
  }
};
