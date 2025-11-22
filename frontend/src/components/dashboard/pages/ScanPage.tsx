import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { toast } from "sonner";
import api from "../../../services/api";
import type { AxiosError } from "axios";

// Helper: Convert base64 to Blob
const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
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

interface State {
  isCameraReady: boolean;
  isProcessing: boolean;
  locationLoading: boolean;
  checkInStatus: "success" | "error" | "already" | null;
}

interface Permissions {
  camera: boolean;
  location: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CheckInResponse {
  success: boolean;
  message?: string;
}

interface CheckInError {
  response?: {
    data?: {
      message?: string;
      code?: string;
    };
  };
  message?: string;
}

const ScanPage: React.FC = () => {
  // Gom state liên quan
  const [state, setState] = useState<State>({
    isCameraReady: false,
    isProcessing: false,
    locationLoading: false,
    checkInStatus: null,
  });

  const [permissions, setPermissions] = useState<Permissions>({
    camera: false,
    location: false,
  });

  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Lấy vị trí GPS
  const getLocation = useCallback(async () => {
    setState(prev => ({ ...prev, locationLoading: true }));
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setLocationData(location);
      setPermissions(prev => ({ ...prev, location: true }));
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationError("Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập.");
      setPermissions(prev => ({ ...prev, location: false }));
    } finally {
      setState(prev => ({ ...prev, locationLoading: false }));
    }
  }, []);

  // Bật camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setState(prev => ({ ...prev, isCameraReady: true }));
        setPermissions(prev => ({ ...prev, camera: true }));

        // Lấy vị trí nếu chưa có
        if (!locationData) {
          getLocation();
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
      setPermissions(prev => ({ ...prev, camera: false }));
    }
  }, [locationData, getLocation]);

  // Tắt camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState(prev => ({ ...prev, isCameraReady: false }));
  }, []);

  // Chụp ảnh và resize
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !state.isCameraReady) return null;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;

    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;

    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      if (width > height) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      } else {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.6);
  }, [state.isCameraReady]);

  // Xử lý check-in
  const handleCheckIn = useCallback(async () => {
    if (!locationData) return;
    
    setState(prev => ({ ...prev, isProcessing: true, checkInStatus: null }));

    try {
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error("Không thể chụp ảnh");
      }

      const formData = new FormData();
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      formData.append('accuracy', locationData.accuracy.toString());

      // Convert base64 to Blob
      const blob = dataURLtoBlob(photoData);
      formData.append('photo', blob, `checkin-${Date.now()}.jpg`);

      const response = await api.post<CheckInResponse>("/attendance/checkin", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setState(prev => ({ ...prev, checkInStatus: "success" }));
        toast.success("Chấm công thành công!");

        setTimeout(() => {
          setState(prev => ({ ...prev, checkInStatus: null }));
        }, 3000);
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi chấm công";

      // Check error code thay vì regex
      if (err.response?.data?.code === 'ALREADY_CHECKED_IN') {
        toast.info(errorMessage);
        setState(prev => ({ ...prev, checkInStatus: "already" }));
      } else {
        toast.error(errorMessage);
        setState(prev => ({ ...prev, checkInStatus: "error" }));
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto]);

  // Init camera khi mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const { isCameraReady, isProcessing, locationLoading, checkInStatus } = state;

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            Quét QR điểm danh
          </CardTitle>
          <p className="text-sm text-[var(--text-sub)] mt-2">
            Quét mã QR tại văn phòng để chấm công
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trạng thái quyền */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
              Trạng thái quyền truy cập
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
                  {granted ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {key === 'camera' ? 'Camera' : 'Vị trí'} - {granted ? "Đã cấp" : "Bị từ chối"}
                </span>
              ))}
            </div>
            {(!permissions.camera || !permissions.location) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>Vui lòng cấp quyền truy cập Camera và Vị trí trong cài đặt trình duyệt để tiếp tục.</p>
              </div>
            )}
          </div>

          {/* Camera */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
              Camera trực tiếp
            </h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--shell)]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${isCameraReady ? "block" : "hidden"}`}
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--shell)] text-[var(--text-sub)]">
                  <Camera className="h-12 w-12" />
                  <p className="text-sm">Camera chưa được kích hoạt</p>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin vị trí */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <MapPin className="h-4 w-4" />
              Thông tin vị trí
            </h3>
            {locationLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-sub)]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                Đang lấy vị trí...
              </div>
            ) : locationError ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {locationError}
              </div>
            ) : locationData ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">Vĩ độ:</span>
                    <span className="font-mono text-[var(--text-main)]">
                      {locationData.latitude?.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">Kinh độ:</span>
                    <span className="font-mono text-[var(--text-main)]">
                      {locationData.longitude?.toFixed(6)}
                    </span>
                  </div>
                  {locationData.accuracy && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-sub)]">Độ chính xác:</span>
                      <span className="font-mono text-[var(--text-main)]">
                        ±{Math.round(locationData.accuracy)}m
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={getLocation}
                  className="mt-2 text-xs text-[var(--primary)] hover:underline"
                >
                  Làm mới vị trí
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-sub)]">
                <MapPin className="h-4 w-4" />
                Đang lấy vị trí...
              </div>
            )}
          </div>

          {/* Nút check-in */}
          <button
            onClick={handleCheckIn}
            disabled={isProcessing || !permissions.camera || !permissions.location || !locationData}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--primary)]/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : checkInStatus === "success" ? (
              "Đã check-in"
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Chụp ảnh và xác nhận
              </>
            )}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanPage;




