import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  X,
  User,
  Scan,
  ShieldCheck,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { faceService, type FaceStatus } from "@/services/faceService";
import { useScanFaceDetection, type ScanDetectionStatus } from "@/hooks/useScanFaceDetection";
import { useVoiceFeedback } from "@/hooks/useVoiceFeedback";

// ============================================================================
// CONSTANTS
// ============================================================================
const MIN_WORK_MINUTES = 30; // Thời gian tối thiểu để check-out (30 phút)
const STANDARD_WORK_HOURS = 8;
const EARTH_RADIUS_M = 6371e3;
const PHOTO_MAX_WIDTH = 800;
const PHOTO_MAX_HEIGHT = 600;
const PHOTO_QUALITY = 0.6;
const LOCATION_TIMEOUT = 30000;
const AUTO_CAPTURE_DELAY_MS = 800; // Delay trước khi auto-capture (ms)
const DAY_CHECK_INTERVAL = 60000;
const WORK_HOURS_CHECK_INTERVAL = 60000;
const DEFAULT_OFFICE_RADIUS = 100;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface State {
  isCameraReady: boolean;
  isProcessing: boolean;
  locationLoading: boolean;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: Date | null;
  canCheckOut: boolean;
}

interface Permissions {
  camera: boolean;
  location: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  distance?: number;
  nearestOffice?: string;
}

interface Office {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface CheckInResponse {
  success: boolean;
  message?: string;
  data?: {
    checkInTime?: string;
    checkInDate?: string;
    checkOutTime?: string;
    checkOutDate?: string;
    workHours?: string;
    workCredit?: number;
    location?: string;
    validationMethod?: string;
    distance?: string;
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
    requiresApproval?: boolean;
  };
}

interface CheckInError {
  response?: {
    data?: {
      message?: string;
      code?: string;
      requireOtpFallback?: boolean;
      attemptsLeft?: number;
      data?: {
        hoursWorked?: number;
        minutesWorked?: number;
        minRequiredMinutes?: number;
        remainingMinutes?: number;
        shiftName?: string;
        requiresReason?: boolean;
        similarity?: number;
      };
    };
  };
  message?: string;
  code?: string;
  requireOtpFallback?: boolean;
  attemptsLeft?: number;
  data?: {
    hoursWorked?: number;
    minutesWorked?: number;
    minRequiredMinutes?: number;
    remainingMinutes?: number;
    shiftName?: string;
    requiresReason?: boolean;
    similarity?: number;
  };
}

type EarlyCheckoutReason = "machine_issue" | "personal_emergency" | "manager_request" | null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error("Invalid data URL");
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
};

const parseAttendanceDate = (dateStr: string): string | null => {
  const dateMatch = dateStr.match(
    /(\d{1,2})\s*(?:tháng\s*)?(\d{1,2})(?:,\s*|\s+)(\d{4})/
  );
  if (!dateMatch) return null;
  const [, day, month, year] = dateMatch;
  return `${parseInt(day)}/${parseInt(month)}/${year}`;
};

// ============================================================================
// LIVE CLOCK (used in ScanPage progress bar)
// ============================================================================
const LiveClock: React.FC = () => {
  const [now, setNow] = useState<string>(() => new Date().toTimeString().slice(0, 8));
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date().toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="mono">{now}</span>;
};

// ============================================================================
// COMPONENT
// ============================================================================
const ScanPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTrial = user?.role === 'TRIAL';

  if (isTrial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center bg-background animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4 tracking-tight">Tính năng AI hạn chế</h2>
        <p className="text-muted-foreground max-w-lg text-lg leading-relaxed mb-8">
          Tính năng <strong>Chấm công bằng khuôn mặt</strong> hiện không hỗ trợ cho tài khoản dùng thử.
          Vui lòng nâng cấp tài khoản để bắt đầu sử dụng hệ thống chấm công thông minh SmartAttendance.
        </p>
        <Button
          onClick={() => navigate(-1)}
          size="lg"
          className="px-8 shadow-md hover:shadow-lg transition-all"
        >
          Quay lại
        </Button>
      </div>
    );
  }

  // ==========================================================================
  // STATE
  // ==========================================================================
  const [state, setState] = useState<State>({
    isCameraReady: false,
    isProcessing: false,
    locationLoading: false,
    hasCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    canCheckOut: false,
  });

  const [permissions, setPermissions] = useState<Permissions>({
    camera: false,
    location: false,
  });

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "user"
  );

  // ⚠️ MỚI: Early checkout state
  const [showEarlyCheckoutModal, setShowEarlyCheckoutModal] = useState(false);
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState<EarlyCheckoutReason>(null);

  // Face fallback OTP state
  const [showOtpFallbackModal, setShowOtpFallbackModal] = useState(false);
  const [otpFallbackValue, setOtpFallbackValue] = useState("");
  const [otpFallbackLoading, setOtpFallbackLoading] = useState(false);

  // Face registration status
  const [faceStatus, setFaceStatus] = useState<FaceStatus | null>(null);
  const [showFaceRegistrationPrompt, setShowFaceRegistrationPrompt] = useState(false);
  const [earlyCheckoutError, setEarlyCheckoutError] = useState<CheckInError | null>(null);
  const lastCheckoutPhotoRef = useRef<string | null>(null);

  // Face detection for scan
  const faceDetection = useScanFaceDetection();
  const voiceFeedback = useVoiceFeedback();
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [autoCaptureTriggered, setAutoCaptureTriggered] = useState(false);

  // UX flow: user must press Check In / Check Out before auto-capture activates
  const [activeAction, setActiveAction] = useState<'idle' | 'checkin' | 'checkout'>('idle');
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVoiceStatusRef = useRef<ScanDetectionStatus | null>(null);

  // ==========================================================================
  // REFS
  // ==========================================================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const permissionListenerRef = useRef<boolean>(false);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  const {
    isCameraReady,
    isProcessing,
    locationLoading,
    hasCheckedIn,
    hasCheckedOut,
    canCheckOut,
    checkInTime,
  } = state;

  // ==========================================================================
  // CAMERA FUNCTIONS
  // ==========================================================================

  const startCamera = useCallback(
    async (mode?: "user" | "environment") => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const targetMode = mode || facingMode;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setState((prev) => ({ ...prev, isCameraReady: true }));
          setPermissions((prev) => ({ ...prev, camera: true }));
          setFacingMode(targetMode);
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        toast.error(t("dashboard:scan.errors.cameraAccess"));
        setPermissions((prev) => ({ ...prev, camera: false }));
      }
    },
    [facingMode, t]
  );

  const toggleCamera = useCallback(async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    await startCamera(newMode);
  }, [facingMode, startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({ ...prev, isCameraReady: false }));
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isCameraReady) return null;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > PHOTO_MAX_WIDTH || height > PHOTO_MAX_HEIGHT) {
      if (width > height) {
        height = (height * PHOTO_MAX_WIDTH) / width;
        width = PHOTO_MAX_WIDTH;
      } else {
        width = (width * PHOTO_MAX_HEIGHT) / height;
        height = PHOTO_MAX_HEIGHT;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Mirror khi dùng camera trước
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  }, [isCameraReady, facingMode]);

  // ==========================================================================
  // LOCATION FUNCTIONS
  // ==========================================================================
  const findNearestOffice = useCallback(
    (lat: number, lon: number) => {
      if (offices.length === 0) return null;

      let nearest = offices[0];
      let minDistance = calculateDistance(
        lat,
        lon,
        nearest.latitude,
        nearest.longitude
      );

      for (const office of offices) {
        const distance = calculateDistance(
          lat,
          lon,
          office.latitude,
          office.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = office;
        }
      }

      return { office: nearest, distance: Math.round(minDistance) };
    },
    [offices]
  );

  const getLocation = useCallback(async () => {
    // Kiểm tra xem geolocation API có sẵn không
    if (!navigator.geolocation) {
      const errorMessage = t("dashboard:scan.errors.locationNotSupported", {
        defaultValue: "Trình duyệt của bạn không hỗ trợ định vị. Vui lòng sử dụng trình duyệt khác.",
      });
      setLocationError(errorMessage);
      setPermissions((prev) => ({ ...prev, location: false }));
      toast.error(errorMessage);
      return;
    }

    // Kiểm tra permission status nếu Permissions API có sẵn
    if (navigator.permissions && navigator.permissions.query && !permissionListenerRef.current) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });

        if (permissionStatus.state === "denied") {
          const errorMessage = t("dashboard:scan.errors.locationPermissionDenied", {
            defaultValue: "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
          });
          setLocationError(errorMessage);
          setPermissions((prev) => ({ ...prev, location: false }));
          toast.error(errorMessage);
          return;
        }

        // Chỉ setup listener một lần
        if (!permissionListenerRef.current) {
          permissionListenerRef.current = true;
          // Lắng nghe thay đổi permission
          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted") {
              // Tự động retry khi permission được cấp
              // Sử dụng setTimeout để tránh gọi ngay lập tức
              setTimeout(() => {
                getLocation();
              }, 500);
            } else if (permissionStatus.state === "denied") {
              setPermissions((prev) => ({ ...prev, location: false }));
              const errorMessage = t("dashboard:scan.errors.locationPermissionDenied", {
                defaultValue: "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
              });
              setLocationError(errorMessage);
            }
          };
        }
      } catch (permError) {
        // Permissions API có thể không hỗ trợ hoặc bị lỗi, tiếp tục thử getCurrentPosition
        console.warn("Permissions API not available, falling back to getCurrentPosition:", permError);
      }
    }

    setState((prev) => ({ ...prev, locationLoading: true }));
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: LOCATION_TIMEOUT,
              // Cho phép sử dụng cache trong 5 phút để tránh phải lấy vị trí mới mỗi lần
              maximumAge: 5 * 60 * 1000, // 5 phút
            }
          );
        }
      );

      // Validate coordinates
      if (
        typeof position.coords.latitude !== "number" ||
        typeof position.coords.longitude !== "number" ||
        isNaN(position.coords.latitude) ||
        isNaN(position.coords.longitude)
      ) {
        throw new Error("Invalid location coordinates");
      }

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || 0,
      };

      const nearest = findNearestOffice(location.latitude, location.longitude);
      if (nearest) {
        location.distance = nearest.distance;
        location.nearestOffice = nearest.office.name;
      }

      setLocationData(location);
      setPermissions((prev) => ({ ...prev, location: true }));
      // Clear any previous errors on success
      setLocationError(null);
    } catch (error: any) {
      // Xử lý các loại lỗi khác nhau
      const errorCode = error.code || 0;

      // Log tất cả lỗi để debug (trừ permission denied đã được xử lý ở trên)
      if (errorCode !== 1) {
        console.error("Error getting location:", error);
      }

      let errorMessage: string;

      switch (errorCode) {
        case 1: // PERMISSION_DENIED
          errorMessage = t("dashboard:scan.errors.locationPermissionDenied", {
            defaultValue: "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.",
          });
          setPermissions((prev) => ({ ...prev, location: false }));
          // Không hiển thị toast cho permission denied để tránh spam
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage = t("dashboard:scan.errors.locationUnavailable", {
            defaultValue: "Không thể lấy vị trí. Vui lòng kiểm tra GPS và thử lại.",
          });
          setPermissions((prev) => ({ ...prev, location: false }));
          toast.error(errorMessage);
          break;
        case 3: // TIMEOUT
          errorMessage = t("dashboard:scan.errors.locationTimeout", {
            defaultValue: "Hết thời gian chờ lấy vị trí. Vui lòng thử lại.",
          });
          setPermissions((prev) => ({ ...prev, location: false }));
          toast.error(errorMessage);
          break;
        default:
          errorMessage = t("dashboard:scan.errors.locationGeneric", {
            defaultValue: "Lỗi khi lấy vị trí. Vui lòng thử lại.",
          });
          setPermissions((prev) => ({ ...prev, location: false }));
          toast.error(errorMessage);
      }

      setLocationError(errorMessage);
    } finally {
      setState((prev) => ({ ...prev, locationLoading: false }));
    }
  }, [findNearestOffice, t]);

  // ==========================================================================
  // ATTENDANCE FUNCTIONS
  // ==========================================================================
  const createFormData = useCallback(
    (
      photoData: string,
      location: LocationData,
      type: "checkin" | "checkout",
      earlyCheckoutReason?: EarlyCheckoutReason
    ): FormData => {
      const formData = new FormData();
      formData.append("latitude", location.latitude.toString());
      formData.append("longitude", location.longitude.toString());
      formData.append("accuracy", location.accuracy.toString());
      const blob = dataURLtoBlob(photoData);
      formData.append("photo", blob, `${type}-${Date.now()}.jpg`);

      // ⚠️ MỚI: Thêm earlyCheckoutReason nếu có
      if (type === "checkout" && earlyCheckoutReason) {
        formData.append("earlyCheckoutReason", earlyCheckoutReason);
      }

      return formData;
    },
    []
  );

  const handleCheckIn = useCallback(async () => {
    if (!locationData) return;

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error(t("dashboard:scan.errors.captureFailed"));
      }

      const formData = createFormData(photoData, locationData, "checkin");
      const response = await api.post<CheckInResponse>(
        "/attendance/checkin",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        const now = new Date();
        setState((prev) => ({
          ...prev,
          hasCheckedIn: true,
          checkInTime: now,
          canCheckOut: false,
        }));

        // Reset action state after successful check-in
        setActiveAction('idle');
        setAutoCaptureTriggered(false);
        faceDetection.resetConsecutiveFrames();

        if (response.data.data) {
          const { distance, location } = response.data.data;
          setLocationData((prev) =>
            prev
              ? {
                ...prev,
                distance: distance ? parseInt(distance) : prev.distance,
                nearestOffice: location || prev.nearestOffice,
              }
              : null
          );
        }

        toast.success(
          (response.data.message || t("dashboard:scan.toasts.checkInSuccess")) + " 🎉 Chúc bạn một ngày làm việc thật năng suất!"
        );

        // Voice: chúc ngày làm việc năng suất
        voiceFeedback.speakMessage("Chấm công thành công! Chúc bạn một ngày làm việc thật năng suất!");
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        t("dashboard:scan.errors.checkInError");

      // Handle face verification errors
      if (err.response?.data?.code === "SPOOF_DETECTED") {
        toast.error("Phát hiện giả mạo khuôn mặt", {
          description: "Hệ thống phát hiện ảnh in, màn hình hoặc video. Vui lòng dùng khuôn mặt thật.",
          duration: 5000,
        });
        voiceFeedback.speakMessage("Phát hiện giả mạo khuôn mặt. Vui lòng dùng khuôn mặt thật.");
        return;
      }

      if (err.response?.data?.code === "FACE_VERIFICATION_FAILED") {
        if (err.response.data?.requireOtpFallback) {
          setOtpFallbackValue("");
          setShowOtpFallbackModal(true);
          voiceFeedback.speakMessage("Xác thực khuôn mặt thất bại nhiều lần. Vui lòng nhập mã OTP đã gửi qua email.");
          return;
        }
        const attemptsLeft = err.response.data?.attemptsLeft;
        toast.error(errorMessage, {
          description: attemptsLeft !== undefined
            ? `Còn ${attemptsLeft} lần thử trước khi chuyển sang OTP`
            : "Vui lòng thử lại hoặc đăng ký lại khuôn mặt",
        });
        voiceFeedback.speakMessage("Xác thực khuôn mặt thất bại. Vui lòng thử lại.");
        return;
      }

      if (err.response?.data?.code === "FACE_VERIFICATION_ERROR") {
        toast.error("Lỗi xác thực khuôn mặt", {
          description: "Hệ thống không thể xác thực khuôn mặt. Vui lòng thử lại.",
        });
        voiceFeedback.speakMessage("Lỗi xác thực khuôn mặt. Vui lòng thử lại.");
        return;
      }

      if (err.response?.data?.code === "ALREADY_CHECKED_IN") {
        toast.info(errorMessage);
        setState((prev) => ({ ...prev, hasCheckedIn: true }));
        setActiveAction('idle');
        voiceFeedback.speakMessage("Bạn đã chấm công vào hôm nay rồi.");
      } else if (err.response?.data?.code === "TOO_EARLY") {
        toast.warning(errorMessage);
        voiceFeedback.speakMessage("Chưa đến giờ chấm công. Vui lòng quay lại sau.");
      } else if (err.response?.data?.code === "ON_LEAVE") {
        toast.error(errorMessage, {
          duration: 5000,
        });
        voiceFeedback.speakMessage("Bạn đang trong thời gian nghỉ phép, không thể chấm công.");
      } else {
        toast.error(errorMessage);
        voiceFeedback.speakMessage("Chấm công thất bại. Vui lòng thử lại.");
      }
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto, createFormData, t, voiceFeedback]);

  const handleCheckOut = useCallback(async (reason?: EarlyCheckoutReason) => {
    if (!locationData) return;

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      // Thử capture photo mới, nếu fail thì dùng photo đã lưu từ lần trước
      const photoData = capturePhoto() || lastCheckoutPhotoRef.current;
      if (!photoData) {
        throw new Error(t("dashboard:scan.errors.captureFailed"));
      }
      // Lưu photo để dùng lại khi retry với lý do
      lastCheckoutPhotoRef.current = photoData;

      const formData = createFormData(photoData, locationData, "checkout", reason ?? undefined);
      const response = await api.post<CheckInResponse>(
        "/attendance/checkout",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        setState((prev) => ({ ...prev, hasCheckedOut: true }));
        setShowEarlyCheckoutModal(false);
        setEarlyCheckoutReason(null);
        setEarlyCheckoutError(null);
        lastCheckoutPhotoRef.current = null;

        // Reset action state after successful check-out
        setActiveAction('idle');
        setAutoCaptureTriggered(false);
        faceDetection.resetConsecutiveFrames();

        if (response.data.data) {
          const { distance, location, approvalStatus, requiresApproval } = response.data.data;
          setLocationData((prev) =>
            prev
              ? {
                ...prev,
                distance: distance ? parseInt(distance) : prev.distance,
                nearestOffice: location || prev.nearestOffice,
              }
              : null
          );

          // Hiển thị thông báo đặc biệt nếu cần duyệt
          if (requiresApproval || approvalStatus === "PENDING") {
            toast.info(
              "Yêu cầu check-out sớm của bạn đang chờ duyệt. Bạn sẽ nhận được thông báo khi có kết quả.",
              { duration: 6000 }
            );
          }
        }

        toast.success(
          response.data.message || t("dashboard:scan.toasts.checkOutSuccess")
        );

        // Voice: chào tạm biệt
        voiceFeedback.speakMessage("Check-out thành công! Tạm biệt, hẹn gặp lại bạn ngày mai!");
      }
    } catch (error) {
      console.error("Check-out error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        t("dashboard:scan.errors.checkOutError");

      if (err.response?.data?.code === "SPOOF_DETECTED") {
        toast.error("Phát hiện giả mạo khuôn mặt", {
          description: "Hệ thống phát hiện ảnh in, màn hình hoặc video. Vui lòng dùng khuôn mặt thật.",
          duration: 5000,
        });
        voiceFeedback.speakMessage("Phát hiện giả mạo khuôn mặt. Vui lòng dùng khuôn mặt thật.");
      } else if (err.response?.data?.code === "FACE_VERIFICATION_FAILED") {
        if (err.response.data?.requireOtpFallback) {
          setOtpFallbackValue("");
          setShowOtpFallbackModal(true);
          voiceFeedback.speakMessage("Xác thực khuôn mặt thất bại nhiều lần. Vui lòng nhập mã OTP đã gửi qua email.");
        } else {
          const attemptsLeft = err.response.data?.attemptsLeft;
          toast.error(errorMessage, {
            description: attemptsLeft !== undefined
              ? `Còn ${attemptsLeft} lần thử trước khi chuyển sang OTP`
              : "Khuôn mặt không khớp. Vui lòng thử lại.",
            duration: 5000,
          });
          voiceFeedback.speakMessage("Khuôn mặt không khớp khi check-out. Vui lòng thử lại.");
        }
      } else if (err.response?.data?.code === "FACE_VERIFICATION_ERROR") {
        toast.error("Lỗi xác thực khuôn mặt", {
          description: "Hệ thống không thể xác thực khuôn mặt. Vui lòng thử lại.",
        });
        voiceFeedback.speakMessage("Lỗi xác thực khuôn mặt. Vui lòng thử lại.");
      } else if (err.response?.data?.code === "NOT_CHECKED_IN") {
        toast.warning(errorMessage);
        voiceFeedback.speakMessage("Bạn chưa chấm công vào. Vui lòng chấm công vào trước.");
      } else if (err.response?.data?.code === "ALREADY_CHECKED_OUT") {
        toast.info(errorMessage);
        setState((prev) => ({ ...prev, hasCheckedOut: true }));
        setActiveAction('idle');
        voiceFeedback.speakMessage("Bạn đã check-out hôm nay rồi.");
      } else if (err.response?.data?.code === "INSUFFICIENT_WORK_HOURS") {
        // ⚠️ MỚI: Kiểm tra nếu cần lý do
        const errorData = err.response?.data?.data;
        if (errorData?.requiresReason) {
          // Hiển thị modal để chọn lý do
          setEarlyCheckoutError(err);
          setShowEarlyCheckoutModal(true);
          voiceFeedback.speakMessage("Bạn chưa làm đủ thời gian. Vui lòng chọn lý do check-out sớm.");
        } else {
          toast.warning(errorMessage);
          voiceFeedback.speakMessage("Bạn chưa làm đủ thời gian tối thiểu để check-out.");
        }
      } else if (err.response?.data?.code === "ON_LEAVE") {
        toast.error(errorMessage, {
          duration: 5000,
        });
        voiceFeedback.speakMessage("Bạn đang trong thời gian nghỉ phép, không thể check-out.");
      } else {
        toast.error(errorMessage);
        voiceFeedback.speakMessage("Check-out thất bại. Vui lòng thử lại.");
      }
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto, createFormData, t, voiceFeedback]);

  const handleOtpFallbackSubmit = useCallback(async () => {
    if (otpFallbackValue.length !== 6) return;
    setOtpFallbackLoading(true);
    try {
      const result = await api.post<{ success: boolean; action?: string; message?: string }>(
        "/face/verify-fallback-otp",
        { otp: otpFallbackValue }
      );
      if (result.data.success) {
        const action = result.data.action ?? "check_in";
        setShowOtpFallbackModal(false);
        setOtpFallbackValue("");
        if (action === "check_in") {
          setState((prev) => ({ ...prev, hasCheckedIn: true, checkInTime: new Date(), canCheckOut: false }));
          toast.success("Chấm công vào thành công (OTP) 🎉");
          voiceFeedback.speakMessage("Chấm công thành công bằng OTP!");
        } else {
          setState((prev) => ({ ...prev, hasCheckedOut: true }));
          toast.success("Chấm công ra thành công (OTP) ✅");
          voiceFeedback.speakMessage("Chấm công ra thành công bằng OTP!");
        }
        setActiveAction("idle");
        faceDetection.resetConsecutiveFrames();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "OTP không hợp lệ";
      toast.error(msg);
    } finally {
      setOtpFallbackLoading(false);
    }
  }, [otpFallbackValue, voiceFeedback, faceDetection, setActiveAction]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  useEffect(() => {
    const loadOffices = async () => {
      try {
        const response = await api.get<{ branches: any[] }>("/branches/list");
        if (response.data.branches) {
          const branches = response.data.branches.map((branch: any) => ({
            _id: branch._id || branch.id,
            name: branch.name,
            latitude: branch.latitude,
            longitude: branch.longitude,
            radius: DEFAULT_OFFICE_RADIUS,
          }));
          setOffices(branches);
        }
      } catch (error) {
        console.error("Error loading branches:", error);
        toast.error(
          t("dashboard:scan.errors.loadBranches", {
            defaultValue:
              "Không thể tải danh sách văn phòng. Vui lòng thử lại.",
          })
        );
      }
    };

    const checkTodayAttendance = async () => {
      try {
        const response = await api.get<
          Array<{
            date: string;
            checkIn: string | null;
            checkOut: string | null;
          }>
        >("/attendance/recent?limit=1");
        if (response.data && response.data.length > 0) {
          const latestAttendance = response.data[0];
          const today = new Date();
          const todayStr = `${today.getDate()}/${today.getMonth() + 1
            }/${today.getFullYear()}`;
          const attendanceStr = parseAttendanceDate(latestAttendance.date);

          if (attendanceStr === todayStr) {
            let checkInTime = null;
            if (latestAttendance.checkIn) {
              const [hours, minutes] = latestAttendance.checkIn
                .split(":")
                .map(Number);
              checkInTime = new Date(today);
              checkInTime.setHours(hours, minutes, 0, 0);
            }

            setState((prev) => ({
              ...prev,
              hasCheckedIn: !!latestAttendance.checkIn,
              hasCheckedOut: !!latestAttendance.checkOut,
              checkInTime: checkInTime,
              canCheckOut: false,
            }));
          }
        }
      } catch (error) {
        console.error("Error checking today attendance:", error);
        toast.error(
          t("dashboard:scan.errors.checkStatus", {
            defaultValue:
              "Không thể kiểm tra trạng thái điểm danh. Vui lòng làm mới trang.",
          })
        );
      }
    };

    loadOffices();
    checkTodayAttendance();

    // Check face registration status
    const checkFaceStatus = async () => {
      try {
        const status = await faceService.getFaceStatus();
        setFaceStatus(status);
        setShowFaceRegistrationPrompt(!status.isRegistered);
      } catch (error) {
        console.error("Failed to check face status:", error);
        // Silent fail - don't block user
      }
    };
    checkFaceStatus();
  }, []);

  useEffect(() => {
    if (faceStatus?.isRegistered) {
      setShowFaceRegistrationPrompt(false);
    }
  }, [faceStatus?.isRegistered]);

  useEffect(() => {
    if (offices.length > 0) {
      getLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offices.length]); // Chỉ gọi lại khi offices được load, không phụ thuộc vào getLocation để tránh vòng lặp

  useEffect(() => {
    let lastCheckDate = new Date().toDateString();

    const checkNewDay = setInterval(() => {
      const currentDate = new Date().toDateString();
      if (currentDate !== lastCheckDate) {
        setState((prev) => ({
          ...prev,
          hasCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          canCheckOut: false,
          hasShownCheckoutNotification: false, // Reset flag
        }));
        lastCheckDate = currentDate;
      }
    }, DAY_CHECK_INTERVAL);

    return () => clearInterval(checkNewDay);
  }, []);

  // Monitor work hours and show toast notifications
  useEffect(() => {
    if (!checkInTime || hasCheckedOut) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const hoursWorked =
        (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // ⚠️ MỚI: Cho phép check-out sau 30 phút (không phải 4 giờ)
      const minutesWorked = hoursWorked * 60;
      if (minutesWorked >= MIN_WORK_MINUTES && !canCheckOut) {
        setState((prev) => ({ ...prev, canCheckOut: true }));
        toast.success(t("dashboard:scan.toasts.canCheckOut"), {
          duration: 5000,
        });
      }

      if (hoursWorked >= STANDARD_WORK_HOURS) {
        const hours = Math.floor(hoursWorked);
        const minutes = Math.floor((hoursWorked - hours) * 60);
        toast.warning(
          t("dashboard:scan.toasts.workHoursReminder", { hours, minutes }),
          {
            duration: 10000,
          }
        );
      }
    }, WORK_HOURS_CHECK_INTERVAL);

    return () => clearInterval(checkInterval);
  }, [checkInTime, hasCheckedOut, canCheckOut, t]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Load face detection model on mount
  useEffect(() => {
    if (faceStatus?.isRegistered) {
      faceDetection.loadModel().catch((err) => {
        console.warn("[ScanPage] Face detection model load failed:", err);
      });
    }
    return () => {
      faceDetection.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceStatus?.isRegistered]);

  // Start face detection when camera is ready and model is loaded
  useEffect(() => {
    if (isCameraReady && faceDetection.modelReady && videoRef.current && faceStatus?.isRegistered) {
      faceDetection.startDetection(videoRef.current);
    }
    return () => {
      faceDetection.stopDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraReady, faceDetection.modelReady, faceStatus?.isRegistered]);

  // Voice feedback based on detection status changes (only when user has chosen an action)
  useEffect(() => {
    if (!faceStatus?.isRegistered || activeAction === 'idle') return;
    const status = faceDetection.detectionStatus;
    if (status === lastVoiceStatusRef.current) return;
    lastVoiceStatusRef.current = status;

    const voiceMessages: Partial<Record<ScanDetectionStatus, string>> = {
      no_face: "Không tìm thấy khuôn mặt",
      multiple_faces: "Phát hiện nhiều khuôn mặt",
      too_far: "Hãy di chuyển lại gần hơn",
      too_close: "Hãy di chuyển ra xa hơn",
      not_centered: "Hãy đưa khuôn mặt vào giữa",
      good: "Khuôn mặt OK",
    };

    const msg = voiceMessages[status];
    if (msg) {
      voiceFeedback.speakMessage(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceDetection.detectionStatus, faceStatus?.isRegistered]);

  // Auto-capture: only activates AFTER user presses Check In or Check Out
  useEffect(() => {
    if (
      activeAction === 'idle' ||
      !autoCaptureEnabled ||
      autoCaptureTriggered ||
      isProcessing ||
      !faceDetection.canAutoCapture ||
      !locationData ||
      !permissions.camera ||
      !permissions.location ||
      !faceStatus?.isRegistered
    ) {
      return;
    }

    // Set a small delay before auto-capture to avoid accidental triggers
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current);
    }

    autoCaptureTimeoutRef.current = setTimeout(() => {
      // Re-check conditions
      if (faceDetection.canAutoCapture && !isProcessing) {
        setAutoCaptureTriggered(true);
        if (activeAction === 'checkin') {
          voiceFeedback.speakMessage("Đang chấm công vào");
          handleCheckIn();
        } else if (activeAction === 'checkout') {
          voiceFeedback.speakMessage("Đang chấm công ra");
          handleCheckOut();
        }
      }
    }, AUTO_CAPTURE_DELAY_MS);

    return () => {
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeAction,
    faceDetection.canAutoCapture,
    autoCaptureEnabled,
    autoCaptureTriggered,
    isProcessing,
    locationData,
    permissions.camera,
    permissions.location,
    faceStatus?.isRegistered,
  ]);

  // Reset auto-capture trigger after processing completes
  useEffect(() => {
    if (!isProcessing && autoCaptureTriggered) {
      // Reset after a delay to prevent immediate re-trigger
      const timer = setTimeout(() => {
        setAutoCaptureTriggered(false);
        faceDetection.resetConsecutiveFrames();
      }, 3000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, autoCaptureTriggered]);

  // Draw face detection overlay on canvas
  useEffect(() => {
    if (!canvasOverlayRef.current || !videoRef.current || !isCameraReady || !faceStatus?.isRegistered) return;

    const canvas = canvasOverlayRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video display size
    const rect = video.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bbox = faceDetection.faceBoundingBox;
    const status = faceDetection.detectionStatus;

    if (bbox && video.videoWidth > 0 && video.videoHeight > 0) {
      // Scale bounding box from video coordinates to canvas display coordinates
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      let drawX = bbox.x * scaleX;
      const drawY = bbox.y * scaleY;
      const drawW = bbox.width * scaleX;
      const drawH = bbox.height * scaleY;

      // Mirror X when using front camera
      if (facingMode === "user") {
        drawX = canvas.width - drawX - drawW;
      }

      // Color based on status
      let color = "#ef4444"; // red
      if (status === "good") {
        color = "#22c55e"; // green
      } else if (status === "not_centered" || status === "too_far" || status === "too_close") {
        color = "#f59e0b"; // amber
      }

      // Draw rounded bounding box
      const padding = 10;
      const x = drawX - padding;
      const y = drawY - padding;
      const w = drawW + padding * 2;
      const h = drawH + padding * 2;
      const radius = 12;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.stroke();

      // Draw corner accents
      const cornerLen = 20;
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLen);
      ctx.lineTo(x, y + h - radius);
      ctx.quadraticCurveTo(x, y + h, x + radius, y + h);
      ctx.lineTo(x + cornerLen, y + h);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y + h);
      ctx.lineTo(x + w - radius, y + h);
      ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
      ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();
    }
  }, [
    faceDetection.faceBoundingBox,
    faceDetection.detectionStatus,
    isCameraReady,
    facingMode,
    faceStatus?.isRegistered,
  ]);

  // Cleanup auto-capture timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // HELPER: Get detection status color & icon
  // ==========================================================================
  const getDetectionStatusConfig = useCallback((status: ScanDetectionStatus) => {
    switch (status) {
      case "good":
        return { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", icon: ShieldCheck, label: "Khuôn mặt OK" };
      case "no_face":
        return { color: "text-gray-500 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800/50", icon: Eye, label: "Đang tìm khuôn mặt..." };
      case "multiple_faces":
        return { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", icon: ShieldAlert, label: "Nhiều khuôn mặt" };
      case "too_far":
        return { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", icon: Scan, label: "Di chuyển lại gần" };
      case "too_close":
        return { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", icon: Scan, label: "Di chuyển ra xa" };
      case "not_centered":
        return { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", icon: Scan, label: "Căn giữa khuôn mặt" };
      case "loading":
        return { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Loader2, label: "Đang tải..." };
      case "error":
        return { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", icon: AlertCircle, label: "Lỗi nhận diện" };
      default:
        return { color: "text-gray-500", bgColor: "bg-gray-100", icon: Eye, label: "..." };
    }
  }, []);

  // ==========================================================================
  // COMPUTED: Face detection status config for rendering
  // ==========================================================================
  const detectionStatusConfig = faceStatus?.isRegistered && faceDetection.modelReady
    ? getDetectionStatusConfig(faceDetection.detectionStatus)
    : null;
  const DetectionStatusIcon = detectionStatusConfig?.icon ?? Eye;

  // ==========================================================================
  // HUD-STATE helper for ScanPage prototype style
  // ==========================================================================
  const hudState: "detecting" | "warning" | "good" | "error" = (() => {
    const s = faceDetection.detectionStatus;
    if (s === "good") return "good";
    if (s === "multiple_faces" || s === "error") return "error";
    if (s === "too_far" || s === "too_close" || s === "not_centered") return "warning";
    return "detecting";
  })();

  // Primary action button mode
  const primaryMode: "checkin" | "checkout" | "armed" | "done" = (() => {
    if (hasCheckedIn && hasCheckedOut) return "done";
    if (activeAction !== "idle") return "armed";
    if (!hasCheckedIn) return "checkin";
    return "checkout";
  })();

  // Working hours live calculation
  const totalWorkText = (() => {
    if (!checkInTime) return "0h 00m";
    const end = hasCheckedOut ? new Date(checkInTime.getTime()) : new Date();
    // Note: we don't have explicit checkOutTime state for display, use now()
    const diff = Math.max(0, end.getTime() - checkInTime.getTime());
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  })();

  const formatTime = (d: Date | null) => {
    if (!d) return "—:—";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const distanceValue = locationData?.distance;
  const distanceClass =
    distanceValue !== undefined && distanceValue <= 100
      ? "bg-[var(--success)]/15 border-[var(--success)]/30 text-[var(--success)]"
      : "bg-[var(--warning)]/15 border-[var(--warning)]/30 text-[var(--warning)]";

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="h-full min-h-0 w-full bg-[var(--background)] text-[var(--text-main)] flex flex-col overflow-hidden">
      {/* Face Registration Prompt (banner) */}
      {showFaceRegistrationPrompt && !faceStatus?.isRegistered && (
        <div className="mx-4 lg:mx-5 mt-3 rounded-xl border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-3 flex items-center gap-3">
          <User className="h-5 w-5 text-[var(--warning)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[var(--text-main)]">
              Đăng ký khuôn mặt để bảo mật tốt hơn
            </div>
            <p className="text-xs text-[var(--text-sub)] mt-0.5">
              Đăng ký khuôn mặt để tăng tính bảo mật khi chấm công.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const userRole = localStorage.getItem("sa_user_role") || "employee";
              navigate(`/${userRole === "EMPLOYEE" ? "employee" : userRole.toLowerCase()}/face-registration`);
            }}
            className="px-3 py-1.5 rounded-md bg-[var(--warning)] text-black font-semibold text-xs hover:brightness-110 transition-all"
          >
            Đăng ký ngay
          </button>
          <button
            type="button"
            onClick={() => setShowFaceRegistrationPrompt(false)}
            className="px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-main)] font-semibold text-xs hover:bg-[var(--shell)] transition-colors"
          >
            Bỏ qua
          </button>
        </div>
      )}

      {/* ==================== MAIN ==================== */}
      <main className="flex-1 min-h-0 px-4 pb-4 pt-2 lg:px-5 lg:pb-5 lg:pt-3 grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-5 overflow-hidden">
        {/* ===== CAMERA COLUMN ===== */}
        <section className="lg:col-span-7 flex flex-col gap-3 min-h-0">
          <div
            className="hud-frame flex-1 min-h-[46vh] md:min-h-[50vh] lg:min-h-0 relative"
            data-hud={hudState}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover ${isCameraReady ? "block" : "hidden"}`}
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />

            {/* Face detection overlay canvas */}
            {isCameraReady && faceStatus?.isRegistered && (
              <canvas
                ref={canvasOverlayRef}
                className="absolute inset-0 h-full w-full pointer-events-none z-[3]"
              />
            )}

            {/* HUD corners */}
            <div className="hud-corners" aria-hidden>
              <span />
            </div>

            {/* Scanner sweep */}
            <div className="scanner-line" aria-hidden />

            {/* Status pill */}
            {isCameraReady && detectionStatusConfig && (
              <div className="status-pill">
                <span className="status-pill__dot" />
                <DetectionStatusIcon
                  className={`h-3.5 w-3.5 ${faceDetection.detectionStatus === "loading" ? "animate-spin" : ""}`}
                />
                <span>{detectionStatusConfig.label}</span>
              </div>
            )}

            {/* Auto-capture progress indicator */}
            {isCameraReady &&
              faceStatus?.isRegistered &&
              activeAction !== "idle" &&
              autoCaptureEnabled &&
              faceDetection.detectionStatus === "good" &&
              !autoCaptureTriggered &&
              !isProcessing && (
                <div className="absolute bottom-[50px] left-1/2 -translate-x-1/2 z-20">
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[var(--success)]/20 border border-[var(--success)]/50 backdrop-blur-md text-xs font-semibold text-[var(--success)]">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-[7px] h-[7px] rounded-full transition-all ${i < faceDetection.consecutiveGoodFrames
                            ? "bg-[var(--success)] shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                            : "bg-[var(--success)]/30"
                            }`}
                        />
                      ))}
                    </div>
                    <span>
                      {faceDetection.canAutoCapture
                        ? "Đang chấm công..."
                        : `Giữ yên ${faceDetection.consecutiveGoodFrames}/5`}
                    </span>
                  </div>
                </div>
              )}

            {/* HUD meta */}
            <div className="hud-meta">
              <div className="hud-meta__item">
                <span className="hud-meta__label">ID</span>
                <span className="hud-meta__value">
                  {(user?.id || user?._id || "—").toString().slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="hud-meta__item">
                <span className="hud-meta__label">Match</span>
                <span className="hud-meta__value">
                  {faceDetection.detectionStatus === "good" ? "OK" : "—"}
                </span>
              </div>
            </div>

            {/* Processing overlay */}
            {isProcessing && (
              <div className="hud-processing">
                <div className="flex flex-col items-center gap-3">
                  <div className="hud-processing__ring" />
                  <div className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
                    Đang xác thực
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-sub)]">
                    So khớp khuôn mặt &amp; vị trí
                  </div>
                </div>
              </div>
            )}

            {/* Not ready placeholder */}
            {!isCameraReady && (
              <div className="absolute inset-0 grid place-items-center bg-[var(--shell)]">
                <div className="text-center flex flex-col items-center gap-3">
                  <Camera className="h-14 w-14 text-[var(--text-sub)]" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--text-sub)]">
                    {t("dashboard:scan.camera.notActivated")}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-sub)]/70">
                    Cho phép camera để chấm công
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar / live clock */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)] whitespace-nowrap">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-cyan)"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v6l3 2" />
              </svg>
              <LiveClock />
            </div>
            <div className="flex-1 h-1.5 bg-[var(--shell)] rounded-full overflow-hidden relative progress-shimmer">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--success)]"
                style={{
                  width: hasCheckedOut ? "100%" : hasCheckedIn ? "60%" : "25%",
                  boxShadow: "0 0 12px rgba(34, 211, 238, 0.45)",
                }}
              />
            </div>
            <div className="mono text-xs font-bold text-[var(--accent-cyan)] min-w-[56px] text-right uppercase tracking-wider">
              {hasCheckedOut ? "DONE" : "ONLINE"}
            </div>
          </div>

          {/* Face detection model loading */}
          {faceStatus?.isRegistered && faceDetection.modelLoading && (
            <div className="flex items-center gap-2 text-xs text-[var(--accent-cyan)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Đang tải mô hình nhận diện khuôn mặt...
            </div>
          )}
        </section>

        {/* ===== SIDEBAR COLUMN ===== */}
        <aside className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Location card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--accent-cyan)]" strokeWidth={2} />
                <span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-[var(--text-sub)]">
                  {t("dashboard:scan.locationInfo.title")}
                </span>
              </div>
              <button
                type="button"
                onClick={getLocation}
                disabled={locationLoading}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--shell)] text-[var(--text-sub)] text-[10px] font-semibold hover:bg-[var(--accent-cyan)]/10 hover:text-[var(--accent-cyan)] transition-colors disabled:opacity-50"
                title="Làm mới vị trí"
              >
                {locationLoading ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-2.5 w-2.5" />
                )}
                <span>Làm mới</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${permissions.camera
                  ? "bg-[var(--success)]/20 border-[var(--success)]/50 text-[var(--success)]"
                  : "bg-[var(--warning)]/10 border-[var(--warning)]/40 text-[#fcd34d]"
                  }`}
                title={permissions.camera ? "Camera đã cấp quyền" : "Camera chưa cấp quyền"}
              >
                <Camera className="h-3 w-3" />
                <span>Camera</span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${permissions.location
                  ? "bg-[var(--success)]/20 border-[var(--success)]/50 text-[var(--success)]"
                  : "bg-[var(--warning)]/10 border-[var(--warning)]/40 text-[#fcd34d]"
                  }`}
                title={permissions.location ? "Vị trí đã cấp quyền" : "Vị trí chưa cấp quyền"}
              >
                <MapPin className="h-3 w-3" />
                <span>Vị trí</span>
              </div>
              {isCameraReady && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--shell)] text-[var(--text-main)] hover:bg-[var(--surface)] transition-colors text-[11px] font-semibold whitespace-nowrap"
                  title={t("dashboard:scan.camera.switch")}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Đổi camera</span>
                </button>
              )}
            </div>

            {!locationData ? (
              locationError ? (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-[var(--error)]/10 text-xs text-[var(--error)]">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                  <p>{locationError}</p>
                </div>
              ) : (
              <div className="flex items-center gap-2 py-2 text-xs text-[var(--text-sub)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("dashboard:scan.locationInfo.loading")}
              </div>
              )
            ) : (
              <div className="flex flex-col gap-2.5">
                {/* Office + radar */}
                <div className="flex items-center gap-2.5 p-2.5 bg-[var(--shell)] border border-[var(--border)] rounded-lg">
                  <div className="w-10 h-10 relative flex-shrink-0">
                    <svg viewBox="0 0 44 44" className="w-full h-full">
                      <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border)" strokeWidth="1" />
                      <circle cx="22" cy="22" r="14" fill="none" stroke="var(--border)" strokeWidth="1" />
                      <circle cx="22" cy="22" r="8" fill="none" stroke="var(--border)" strokeWidth="1" />
                      <circle cx="22" cy="22" r="2" fill="var(--success)" />
                      <g className="radar-sweep">
                        <defs>
                          <linearGradient id="sweep" x1="22" y1="22" x2="42" y2="22" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M22 22 L42 22 A20 20 0 0 0 32 5 Z" fill="url(#sweep)" />
                      </g>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-sub)] font-semibold">
                      Văn phòng
                    </div>
                    <div className="text-[13px] text-[var(--text-main)] font-semibold truncate mt-0.5">
                      {locationData.nearestOffice || "—"}
                    </div>
                  </div>
                  {distanceValue !== undefined && (
                    <span className={`mono font-bold text-[11px] px-2 py-1 rounded-full border ${distanceClass}`}>
                      {Math.round(distanceValue)} m
                    </span>
                  )}
                </div>

                {/* Coords link */}
                {locationData.latitude != null && locationData.longitude != null && (
                  <a
                    href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-[var(--shell)] border border-[var(--border)] text-xs hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 transition-colors"
                  >
                    <span className="text-[var(--text-sub)] tracking-tight">Tọa độ</span>
                    <span className="flex-1 mono font-semibold text-[var(--text-main)] text-right text-[11px]">
                      {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-cyan)"
                      strokeWidth="2"
                      className="flex-shrink-0"
                    >
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <path d="M15 3h6v6" />
                      <path d="M10 14L21 3" />
                    </svg>
                  </a>
                )}

                {locationError && (
                  <div className="flex items-start gap-2 p-2.5 rounded-md bg-[var(--error)]/10 text-xs text-[var(--error)]">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                    <p>{locationError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Today status card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2"
                  className="w-3.5 h-3.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-[var(--text-sub)]">
                  Hôm nay
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold mono tracking-wide border ${hasCheckedOut
                  ? "bg-[var(--success)]/12 border-[var(--success)]/30 text-[var(--success)]"
                  : hasCheckedIn
                    ? "bg-[var(--accent-cyan)]/12 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]"
                    : "bg-[var(--shell)] border-[var(--border)] text-[var(--text-sub)]"
                  }`}
              >
                {hasCheckedOut ? "Hoàn tất" : hasCheckedIn ? "Đang làm" : "Chưa check-in"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-[var(--shell)] border border-[var(--border)] rounded-md">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-sub)] font-semibold mb-1">
                  Vào
                </div>
                <div
                  className={`mono text-base font-bold ${checkInTime ? "text-[var(--success)]" : "text-[var(--text-sub)]"}`}
                >
                  {formatTime(checkInTime)}
                </div>
                <div className="text-[10px] text-[var(--text-sub)] mt-0.5">
                  {checkInTime ? "Đúng giờ" : "Chưa có"}
                </div>
              </div>
              <div className="p-2.5 bg-[var(--shell)] border border-[var(--border)] rounded-md">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-sub)] font-semibold mb-1">
                  Ra
                </div>
                <div
                  className={`mono text-base font-bold ${hasCheckedOut ? "text-[var(--success)]" : "text-[var(--text-sub)]"}`}
                >
                  {hasCheckedOut ? "Đã ra" : "—:—"}
                </div>
                <div className="text-[10px] text-[var(--text-sub)] mt-0.5">
                  {hasCheckedOut ? "Kết thúc ca" : "Chưa có"}
                </div>
              </div>
              <div className="col-span-2 p-2.5 bg-[var(--shell)] border border-[var(--border)] rounded-md">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-sub)] font-semibold mb-1">
                  Tổng giờ làm
                </div>
                <div className="mono text-base font-bold text-[var(--text-main)]">
                  {totalWorkText}
                </div>
                <div className="text-[10px] text-[var(--text-sub)] mt-0.5">
                  Cần ≥ {MIN_WORK_MINUTES} phút để check-out
                </div>
              </div>
            </div>
          </div>

          {/* Face detection hint (active action, face not good) */}
          {faceStatus?.isRegistered &&
            faceDetection.modelReady &&
            activeAction !== "idle" &&
            !autoCaptureEnabled &&
            faceDetection.detectionStatus !== "good" && (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-2.5 text-xs text-[var(--warning)] flex-shrink-0">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                <p>{faceDetection.statusMessage}</p>
              </div>
            )}

          {/* Primary action + auto-capture toggle */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2.5 flex-shrink-0">
            {/* Auto-capture toggle (compact) */}
            {faceStatus?.isRegistered && activeAction === "idle" && (
              <button
                type="button"
                onClick={() => {
                  setAutoCaptureEnabled((prev) => !prev);
                  setAutoCaptureTriggered(false);
                  faceDetection.resetConsecutiveFrames();
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${autoCaptureEnabled
                  ? "bg-[var(--success)]/12 border-[var(--success)]/30 text-[var(--success)]"
                  : "bg-[var(--shell)] border-[var(--border)] text-[var(--text-sub)]"
                  }`}
                title={autoCaptureEnabled ? "Tắt tự động chấm công" : "Bật tự động chấm công"}
              >
                <Scan className="h-3 w-3" />
                <span>{autoCaptureEnabled ? "Chế độ: Tự động" : "Chế độ: Thủ công"}</span>
              </button>
            )}

            {/* Primary action button */}
            {primaryMode === "done" ? (
              <div className="w-full py-3 px-4 rounded-xl bg-[var(--success)]/15 border border-[var(--success)]/30 text-[var(--success)] flex items-center justify-center gap-2.5 font-bold text-sm tracking-wider uppercase cursor-default">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                <div className="flex flex-col items-start">
                  <span className="leading-none">Đã hoàn tất</span>
                  <span className="text-[10px] font-semibold opacity-70 normal-case tracking-normal mt-1">
                    Vào {formatTime(checkInTime)} · Ca đã kết thúc
                  </span>
                </div>
              </div>
            ) : primaryMode === "armed" ? (
              <button
                type="button"
                onClick={() => {
                  setActiveAction("idle");
                  setAutoCaptureTriggered(false);
                  faceDetection.resetConsecutiveFrames();
                  if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
                }}
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-[var(--shell)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 disabled:opacity-50 pulse-armed"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
                <div className="flex flex-col items-start">
                  <span className="leading-none">
                    {isProcessing
                      ? "Đang xác thực..."
                      : activeAction === "checkin"
                        ? "Đang quét cho Check-in..."
                        : "Đang quét cho Check-out..."}
                  </span>
                  <span className="text-[10px] font-semibold opacity-70 normal-case tracking-normal mt-1">
                    Giữ yên — nhấn lại để hủy
                  </span>
                </div>
              </button>
            ) : primaryMode === "checkin" ? (
              <button
                type="button"
                onClick={() => {
                  setActiveAction("checkin");
                  setAutoCaptureTriggered(false);
                  faceDetection.resetConsecutiveFrames();
                }}
                disabled={
                  isProcessing ||
                  !permissions.camera ||
                  !permissions.location ||
                  !locationData
                }
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--success)] text-[#042f2e] font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_0_32px_-4px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_-4px_rgba(34,197,94,0.55)] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
                <div className="flex flex-col items-start">
                  <span className="leading-none">Bắt đầu check-in</span>
                  <span className="text-[10px] font-semibold opacity-70 normal-case tracking-normal mt-1">
                    Nhấn để quét khuôn mặt vào ca
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveAction("checkout");
                  setAutoCaptureTriggered(false);
                  faceDetection.resetConsecutiveFrames();
                }}
                disabled={
                  isProcessing ||
                  !permissions.camera ||
                  !permissions.location ||
                  !locationData ||
                  hasCheckedOut
                }
                title={
                  !canCheckOut && hasCheckedIn && !hasCheckedOut && checkInTime
                    ? `Cần làm việc ít nhất ${MIN_WORK_MINUTES} phút`
                    : ""
                }
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-br from-orange-500 to-[var(--error)] text-white font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_-4px_rgba(239,68,68,0.55)] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <div className="flex flex-col items-start">
                  <span className="leading-none">Check-out</span>
                  <span className="text-[10px] font-semibold opacity-70 normal-case tracking-normal mt-1">
                    Nhấn để kết thúc ca làm
                  </span>
                </div>
              </button>
            )}
          </div>
        </aside>
      </main>

      {/* Face Fallback OTP Modal */}
      {showOtpFallbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-main)]">
                Xác thực OTP
              </CardTitle>
              <button
                type="button"
                onClick={() => { setShowOtpFallbackModal(false); setOtpFallbackValue(""); }}
                className="rounded-lg p-1 text-[var(--text-sub)] hover:bg-[var(--shell)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-[var(--text-sub)]">
                Nhận dạng khuôn mặt thất bại nhiều lần. Mã OTP 6 số đã được gửi đến email của bạn.
              </p>
              <div className="flex justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpFallbackValue}
                  onChange={(e) => setOtpFallbackValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-40 rounded-lg border border-[var(--border)] bg-[var(--shell)] px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowOtpFallbackModal(false); setOtpFallbackValue(""); }}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--shell)] px-4 py-2 text-sm font-medium text-[var(--text-main)] hover:bg-[var(--surface)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleOtpFallbackSubmit}
                  disabled={otpFallbackValue.length !== 6 || otpFallbackLoading}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpFallbackLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Đang xác thực...</>
                  ) : "Xác nhận"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ⚠️ MỚI: Early Checkout Modal */}
      {showEarlyCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold text-[var(--text-main)]">
                Check-out sớm
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowEarlyCheckoutModal(false);
                  setEarlyCheckoutReason(null);
                  setEarlyCheckoutError(null);
                }}
                className="rounded-lg p-1 text-[var(--text-sub)] hover:bg-[var(--shell)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {earlyCheckoutError?.response?.data?.data && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">
                        {earlyCheckoutError.response.data.message}
                      </p>
                      {earlyCheckoutError.response.data.data.minutesWorked !== undefined && (
                        <p className="text-xs">
                          Bạn đã làm việc: {Math.round(earlyCheckoutError.response.data.data.minutesWorked)} phút
                        </p>
                      )}
                      {earlyCheckoutError.response.data.data.remainingMinutes !== undefined && (
                        <p className="text-xs">
                          Còn thiếu: {earlyCheckoutError.response.data.data.remainingMinutes} phút
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                  Vui lòng chọn lý do check-out sớm:
                </label>
                <div className="space-y-2">
                  {[
                    { value: "machine_issue", label: "Sự cố máy" },
                    { value: "personal_emergency", label: "Việc cá nhân khẩn cấp" },
                    { value: "manager_request", label: "Theo yêu cầu quản lý" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--shell)] p-3 cursor-pointer hover:bg-[var(--surface)] transition-colors"
                    >
                      <input
                        type="radio"
                        name="earlyCheckoutReason"
                        value={option.value}
                        checked={earlyCheckoutReason === option.value}
                        onChange={(e) =>
                          setEarlyCheckoutReason(
                            e.target.value as EarlyCheckoutReason
                          )
                        }
                        className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <span className="text-sm text-[var(--text-main)]">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEarlyCheckoutModal(false);
                    setEarlyCheckoutReason(null);
                    setEarlyCheckoutError(null);
                  }}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--shell)] px-4 py-2 text-sm font-medium text-[var(--text-main)] hover:bg-[var(--surface)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (earlyCheckoutReason) {
                      handleCheckOut(earlyCheckoutReason);
                    } else {
                      toast.warning("Vui lòng chọn lý do check-out sớm");
                    }
                  }}
                  disabled={!earlyCheckoutReason || isProcessing}
                  className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận"
                  )}
                </button>
              </div>

              <p className="text-xs text-[var(--text-sub)] text-center pt-2">
                Yêu cầu của bạn sẽ được gửi để HR/Leader duyệt
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
