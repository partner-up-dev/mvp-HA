import crypto from "crypto";

type WeComSignatureParams = {
  token: string;
  timestamp: string;
  nonce: string;
  encrypted: string;
  signature: string;
};

type WeComDecryptedPayload = {
  xml: string;
  corpId: string;
};

const normalizeBase64 = (value: string) => {
  const trimmed = value.trim();
  // Some gateways may convert '+' to spaces; normalize before stripping whitespace.
  const normalizedSpaces = trimmed.replace(/\s/g, (char) =>
    char === " " ? "+" : "",
  );
  const compact = normalizedSpaces.replace(/\s+/g, "");
  const padNeeded = compact.length % 4 === 0 ? 0 : 4 - (compact.length % 4);
  return padNeeded === 0 ? compact : `${compact}${"=".repeat(padNeeded)}`;
};

const getAesKey = (encodingAesKey: string) => {
  const normalized = normalizeBase64(encodingAesKey);
  const key = Buffer.from(normalized, "base64");
  if (key.length !== 32) {
    throw new Error("Invalid WECOM_ENCODING_AES_KEY");
  }
  return key;
};

export const verifySignature = ({
  token,
  timestamp,
  nonce,
  encrypted,
  signature,
}: WeComSignatureParams) => {
  const parts = [token, timestamp, nonce, encrypted].sort();
  const digest = crypto
    .createHash("sha1")
    .update(parts.join(""), "utf8")
    .digest("hex");
  return digest === signature;
};

export const decryptWeComMessage = (
  encodingAesKey: string,
  corpId: string,
  encrypted: string,
): WeComDecryptedPayload => {
  const aesKey = getAesKey(encodingAesKey);
  const iv = aesKey.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(true);

  const normalizedEncrypted = normalizeBase64(encrypted);
  const encryptedBuffer = Buffer.from(normalizedEncrypted, "base64");
  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  if (decrypted.length < 20) {
    throw new Error("WeCom message too short");
  }

  const messageLength = decrypted.readUInt32BE(16);
  const xmlStart = 20;
  const xmlEnd = xmlStart + messageLength;

  if (xmlEnd > decrypted.length) {
    throw new Error("WeCom message length invalid");
  }

  const xml = decrypted.subarray(xmlStart, xmlEnd).toString("utf8");
  const receivedCorpId = decrypted.subarray(xmlEnd).toString("utf8");

  if (receivedCorpId !== corpId) {
    throw new Error("WeCom corpId mismatch");
  }

  return { xml, corpId: receivedCorpId };
};

export const extractXmlTagValue = (xml: string, tag: string) => {
  const pattern = new RegExp(
    `<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
  );
  const match = xml.match(pattern);
  if (!match) {
    return null;
  }
  return match[1] ?? null;
};
