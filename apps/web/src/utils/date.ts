/**
 * Format a Date to a local "YYYY-MM-DD" key.
 *
 * Dùng các thành phần ngày theo MÚI GIỜ ĐỊA PHƯƠNG thay vì `toISOString()`
 * (vốn quy về UTC và làm lệch 1 ngày ở UTC+7 với các Date tạo từ local-midnight).
 */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
