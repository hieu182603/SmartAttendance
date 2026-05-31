import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  decryptBankAccount,
  encryptBankAccount,
  isEncryptedBankAccount,
  isMaskedBankAccountValue,
  maskBankAccount,
} from "../src/utils/sensitiveField.util.js";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

beforeEach(() => {
  process.env.BANK_ACCOUNT_ENCRYPTION_KEY = TEST_KEY;
});

describe("sensitiveField.util", () => {
  test("encrypts and decrypts bank account numbers", () => {
    const plain = "0123456789";
    const encrypted = encryptBankAccount(plain);

    expect(isEncryptedBankAccount(encrypted)).toBe(true);
    expect(encrypted).not.toContain(plain);
    expect(decryptBankAccount(encrypted)).toBe(plain);
  });

  test("returns legacy plaintext unchanged", () => {
    expect(decryptBankAccount("9876543210")).toBe("9876543210");
  });

  test("masks bank account for display", () => {
    expect(maskBankAccount("0123456789")).toBe("******6789");
    expect(maskBankAccount("1234")).toBe("****");
  });

  test("detects masked values", () => {
    expect(isMaskedBankAccountValue("****6789")).toBe(true);
    expect(isMaskedBankAccountValue("0123456789")).toBe(false);
  });
});
