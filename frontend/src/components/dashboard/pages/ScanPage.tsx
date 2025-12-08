import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AxiosError } from "axios";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/services/api";

// ============================================================================
// CONSTANTS
// ============================================================================
const MIN_WORK_HOURS = 4;
const STANDARD_WORK_HOURS = 8;
const EARTH_RADIUS_M = 6371e3;
const PHOTO_MAX_WIDTH = 800;
const PHOTO_MAX_HEIGHT = 600;
const PHOTO_QUALITY = 0.6;
const LOCATION_TIMEOUT = 30000;
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
    location?: string;
    validationMethod?: string;
    distance?: string;
  };
}

interface CheckInError {
  response?: {
    data?: {
      message?: string;
      code?: string;
    };
  };
  message?: string;
  code?: string;
}

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

const getLocationErrorMessage = (errorCode: number, t: any): string => {
  const baseMessage = t("dashboard:scan.errors.locationFailed");
  switch (errorCode) {
    case 1:
      return baseMessage + t("dashboard:scan.errors.locationPermissionDenied");
    case 2:
      return baseMessage + t("dashboard:scan.errors.locationUnavailable");
    case 3:
      return baseMessage + t("dashboard:scan.errors.locationTimeout");
    default:
      return baseMessage + t("dashboard:scan.errors.locationGeneric");
  }
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
// COMPONENT
// ============================================================================
const ScanPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);

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
    "environment"
  );

  // ==========================================================================
  // REFS
  // ==========================================================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const startCamera = useCallback(async (mode?: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

  const startCamera = useCallback(
    async (mode?: "user" | "environment") => {
      // Stop existing camera first
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

    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  }, [isCameraReady]);

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
    setState((prev) => ({ ...prev, locationLoading: true }));
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: LOCATION_TIMEOUT,
            maximumAge: 0,
          });
        }
      );

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      const nearest = findNearestOffice(location.latitude, location.longitude);
      if (nearest) {
        location.distance = nearest.distance;
        location.nearestOffice = nearest.office.name;
      }

      setLocationData(location);
      setPermissions((prev) => ({ ...prev, location: true }));
    } catch (error: any) {
      console.error("Error getting location:", error);
      const errorMessage = getLocationErrorMessage(error.code || 0, t);
      setLocationError(errorMessage);
      setPermissions((prev) => ({ ...prev, location: false }));
      toast.error(errorMessage);
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
      type: "checkin" | "checkout"
    ): FormData => {
      const formData = new FormData();
      formData.append("latitude", location.latitude.toString());
      formData.append("longitude", location.longitude.toString());
      formData.append("accuracy", location.accuracy.toString());
      const blob = dataURLtoBlob(photoData);
      formData.append("photo", blob, `${type}-${Date.now()}.jpg`);
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
          response.data.message || t("dashboard:scan.toasts.checkInSuccess")
        );
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        t("dashboard:scan.errors.checkInError");

      if (err.response?.data?.code === "ALREADY_CHECKED_IN") {
        toast.info(errorMessage);
        setState((prev) => ({ ...prev, hasCheckedIn: true }));
      } else if (err.response?.data?.code === "TOO_EARLY") {
        toast.warning(errorMessage);
      } else if (err.response?.data?.code === "ON_LEAVE") {
        toast.error(errorMessage, {
          duration: 5000,
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto, createFormData, t]);

  const handleCheckOut = useCallback(async () => {
    if (!locationData) return;

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error(t("dashboard:scan.errors.captureFailed"));
      }

      const formData = createFormData(photoData, locationData, "checkout");
      const response = await api.post<CheckInResponse>(
        "/attendance/checkout",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        setState((prev) => ({ ...prev, hasCheckedOut: true }));

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
          response.data.message || t("dashboard:scan.toasts.checkOutSuccess")
        );
      }
    } catch (error) {
      console.error("Check-out error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        t("dashboard:scan.errors.checkOutError");

      if (err.response?.data?.code === "NOT_CHECKED_IN") {
        toast.warning(errorMessage);
      } else if (err.response?.data?.code === "ALREADY_CHECKED_OUT") {
        toast.info(errorMessage);
        setState((prev) => ({ ...prev, hasCheckedOut: true }));
      } else if (err.response?.data?.code === "INSUFFICIENT_WORK_HOURS") {
        toast.warning(errorMessage);
      } else if (err.response?.data?.code === "ON_LEAVE") {
        toast.error(errorMessage, {
          duration: 5000,
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto, createFormData, t]);

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
          const todayStr = `${today.getDate()}/${
            today.getMonth() + 1
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
  }, []);

  useEffect(() => {
    if (offices.length > 0) {
      getLocation();
    }
  }, [offices.length, getLocation]);

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

      if (hoursWorked >= MIN_WORK_HOURS && !canCheckOut) {
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

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            {t("dashboard:scan.checkInToday")}
          </CardTitle>
          <p className="text-sm text-[var(--text-sub)] mt-2">
            {t("dashboard:scan.description")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
              {t("dashboard:scan.permissionStatus")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(permissions).map(([key, granted]) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    granted
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {granted ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {key === "camera"
                    ? t("dashboard:scan.permissions.camera")
                    : t("dashboard:scan.permissions.location")}{" "}
                  -{" "}
                  {granted
                    ? t("dashboard:scan.permissions.granted")
                    : t("dashboard:scan.permissions.denied")}
                </span>
              ))}
            </div>
            {(!permissions.camera || !permissions.location) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{t("dashboard:permissions.requestMessage")}</p>
              </div>
            )}
          </div>

          {/* Camera */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                {t("dashboard:scan.camera.title")}
              </h3>
              {isCameraReady && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--shell)] transition-colors"
                  title={t("dashboard:scan.camera.switch")}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {facingMode === "environment"
                      ? t("dashboard:scan.camera.switchToFront")
                      : t("dashboard:scan.camera.switchToBack")}
                  </span>
                </button>
              )}
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--shell)]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  isCameraReady ? "block" : "hidden"
                }`}
                style={{
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />
              {!isCameraReady && (
                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--shell)] text-[var(--text-sub)]">
                  <Camera className="h-12 w-12" />
                  <p className="text-sm">
                    {t("dashboard:scan.camera.notActivated")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <MapPin className="h-4 w-4" />
              {t("dashboard:scan.locationInfo.title")}
            </h3>
            {!locationData && !locationError ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-sub)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard:scan.locationInfo.loading")}
              </div>
            ) : locationError ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{locationError}</p>
                </div>
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("dashboard:scan.locationInfo.retrying")}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      {t("dashboard:scan.locationInfo.retry")}
                    </>
                  )}
                </button>
              </div>
            ) : locationData ? (
              <div className="relative">
                {locationLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--shell)]/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("dashboard:scan.locationInfo.refreshing")}
                    </div>
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  {locationData.nearestOffice && (
                    <div className="flex justify-between items-start">
                      <span className="text-[var(--text-sub)]">
                        {t("dashboard:scan.locationInfo.nearestOffice")}
                      </span>
                      <span className="font-medium text-[var(--text-main)] text-right">
                        {locationData.nearestOffice}
                      </span>
                    </div>
                  )}
                  {locationData.distance !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-sub)]">
                        {t("dashboard:scan.locationInfo.distance")}
                      </span>
                      <span
                        className={`font-mono font-medium ${
                          locationData.distance <= 100
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {Math.round(locationData.distance)}m
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">
                      {t("dashboard:scan.locationInfo.latitude")}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-sub)]">
                      {locationData.latitude?.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">
                      {t("dashboard:scan.locationInfo.longitude")}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-sub)]">
                      {locationData.longitude?.toFixed(6)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg border border-[var(--border)] bg-[var(--shell)] px-4 py-2 text-sm font-medium text-[var(--text-main)] transition hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MapPin className="h-4 w-4" />
                  {t("dashboard:scan.locationInfo.refresh")}
                </button>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={
                isProcessing ||
                !permissions.camera ||
                !permissions.location ||
                !locationData ||
                hasCheckedIn
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--primary)]/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && !hasCheckedIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("dashboard:scan.buttons.processing")}
                </>
              ) : hasCheckedIn ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("dashboard:scan.buttons.checkedIn")}
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  {t("dashboard:scan.buttons.checkIn")}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCheckOut}
              disabled={
                isProcessing ||
                !permissions.camera ||
                !permissions.location ||
                !locationData ||
                !hasCheckedIn ||
                hasCheckedOut ||
                !canCheckOut
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !canCheckOut && hasCheckedIn && !hasCheckedOut
                  ? t("dashboard:scan.tooltips.waitOneHour")
                  : ""
              }
            >
              {isProcessing && hasCheckedIn && !hasCheckedOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("dashboard:scan.buttons.processing")}
                </>
              ) : hasCheckedOut ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("dashboard:scan.buttons.checkedOut")}
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  {t("dashboard:scan.buttons.checkOut")}
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanPage;
