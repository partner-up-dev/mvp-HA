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

const getAesKey = (encodingAesKey: string) => {
  const key = Buffer.from(`${encodingAesKey}=`, "base64");
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

  const encryptedBuffer = Buffer.from(encrypted, "base64");
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
  return match[1]?.trim() ?? null;
};
