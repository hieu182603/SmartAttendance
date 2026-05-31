import {
  decryptBankAccount,
  encryptBankAccount,
  isMaskedBankAccountValue,
  maskBankAccount,
} from "./sensitiveField.util.js";

export const BANK_ACCOUNT_MODES = {
  REVEAL: "reveal",
  MASKED: "masked",
};

export function prepareBankAccountForStorage(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value == null || value === "") {
    return "";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "";
  }

  if (isMaskedBankAccountValue(normalized)) {
    return undefined;
  }

  return encryptBankAccount(normalized);
}

export function applyBankAccountToUser(userLike, mode = BANK_ACCOUNT_MODES.REVEAL) {
  const obj = userLike?.toObject
    ? userLike.toObject({ virtuals: true })
    : { ...(userLike || {}) };

  const plain = decryptBankAccount(obj.bankAccount);
  obj.bankAccount =
    mode === BANK_ACCOUNT_MODES.MASKED
      ? plain
        ? maskBankAccount(plain)
        : ""
      : plain;

  return obj;
}

export function canRevealBankAccountForRequester(requester) {
  if (!requester?.role) {
    return false;
  }

  return ["SUPER_ADMIN", "ADMIN", "HR_MANAGER"].includes(requester.role);
}
