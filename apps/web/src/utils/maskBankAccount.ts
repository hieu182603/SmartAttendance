export function maskBankAccount(value?: string | null, visibleLast = 4): string {
  if (!value) {
    return '';
  }

  const normalized = String(value).replace(/\s/g, '');
  if (!normalized) {
    return '';
  }

  if (normalized.length <= visibleLast) {
    return '*'.repeat(normalized.length);
  }

  const hiddenLength = Math.max(4, normalized.length - visibleLast);
  return `${'*'.repeat(hiddenLength)}${normalized.slice(-visibleLast)}`;
}

export function isMaskedBankAccountValue(value?: string | null): boolean {
  if (!value?.trim()) {
    return false;
  }

  return /^\*+\d{1,4}$/.test(value.replace(/\s/g, ''));
}
