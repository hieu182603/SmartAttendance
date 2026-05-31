import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let devKeyWarningLogged = false;

function resolveEncryptionKey() {
  const raw = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;
  if (raw) {
    const trimmed = raw.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }
    const fromBase64 = Buffer.from(trimmed, "base64");
    if (fromBase64.length === 32) {
      return fromBase64;
    }
    throw new Error("BANK_ACCOUNT_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BANK_ACCOUNT_ENCRYPTION_KEY is required in production");
  }

  if (!devKeyWarningLogged) {
    console.warn(
      "[sensitiveField] BANK_ACCOUNT_ENCRYPTION_KEY not set — using insecure dev-only key"
    );
    devKeyWarningLogged = true;
  }

  return crypto.scryptSync("smartattendance-dev-bank-key", "bank-account-salt", 32);
}

export function isEncryptedBankAccount(value) {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

export function isMaskedBankAccountValue(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  return /^\*+\d{1,4}$/.test(value.replace(/\s/g, ""));
}

export function encryptBankAccount(plainText) {
  if (plainText == null || plainText === "") {
    return "";
  }

  const normalized = String(plainText).trim();
  if (!normalized) {
    return "";
  }

  if (isEncryptedBankAccount(normalized)) {
    return normalized;
  }

  if (isMaskedBankAccountValue(normalized)) {
    throw new Error("Invalid bank account value");
  }

  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptBankAccount(storedValue) {
  if (storedValue == null || storedValue === "") {
    return "";
  }

  const value = String(storedValue);
  if (!isEncryptedBankAccount(value)) {
    return value;
  }

  const payload = value.slice(ENCRYPTION_PREFIX.length);
  const [ivPart, authTagPart, cipherPart] = payload.split(":");
  if (!ivPart || !authTagPart || !cipherPart) {
    throw new Error("Invalid encrypted bank account format");
  }

  const key = resolveEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function maskBankAccount(plainText, visibleLast = 4) {
  if (!plainText) {
    return "";
  }

  const normalized = String(plainText).replace(/\s/g, "");
  if (!normalized) {
    return "";
  }

  if (normalized.length <= visibleLast) {
    return "*".repeat(normalized.length);
  }

  const hiddenLength = Math.max(4, normalized.length - visibleLast);
  return `${"*".repeat(hiddenLength)}${normalized.slice(-visibleLast)}`;
}
