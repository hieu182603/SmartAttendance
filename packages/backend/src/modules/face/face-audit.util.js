import { LogService } from "../logs/log.service.js";

/** Actions hiển thị trên trang Nhật ký xác thực khuôn mặt */
export const FACE_RECOGNITION_ACTIONS = [
  "face_scan_success",
  "face_scan_failed",
  "face_spoof_detected",
  "face_fallback_otp_success",
  "face_scan_check_in",
  "face_scan_check_out",
];

export function isFaceRecognitionLogQuery({ entityType, action }) {
  if (entityType === "face_recognition") return true;
  if (!action || typeof action !== "string") return false;
  return (
    action.startsWith("face_scan_") ||
    action === "face_spoof_detected" ||
    action === "face_fallback_otp_success"
  );
}

/**
 * Ghi audit log cho nhật diện khuôn mặt (check-in/out qua attendance hoặc /face/scan).
 */
export async function logFaceRecognitionEvent({
  userId,
  action,
  status = "success",
  details = {},
  ipAddress = null,
  userAgent = null,
  errorMessage = null,
  entityId = null,
}) {
  return LogService.createLog({
    userId: userId || null,
    action,
    entityType: "face_recognition",
    entityId: entityId || null,
    details,
    ipAddress,
    userAgent,
    status,
    errorMessage: errorMessage || null,
  });
}
