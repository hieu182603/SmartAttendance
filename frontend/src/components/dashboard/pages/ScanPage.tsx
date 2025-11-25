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
  checkOutStatus: "success" | "error" | "not_checked_in" | "insufficient_hours" | null;
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
  distance?: number; // Khoảng cách đến văn phòng gần nhất (mét)
  nearestOffice?: string; // Tên văn phòng gần nhất
}

interface Office {
  _id: string;
  name: string;
  address: string;
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
    distance?: string; // Format: "123m"
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

const ScanPage: React.FC = () => {
  // Gom state liên quan
  const [state, setState] = useState<State>({
    isCameraReady: false,
    isProcessing: false,
    locationLoading: false,
    checkInStatus: null,
    checkOutStatus: null,
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Hàm tính khoảng cách giữa 2 tọa độ (Haversine formula)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3; // Bán kính Trái Đất (mét)
    
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Khoảng cách (mét)
  }, []);

  // Tìm văn phòng gần nhất
  const findNearestOffice = useCallback((lat: number, lon: number) => {
    if (offices.length === 0) return null;
    
    let nearest = offices[0];
    let minDistance = calculateDistance(lat, lon, nearest.latitude, nearest.longitude);
    
    for (const office of offices) {
      const distance = calculateDistance(lat, lon, office.latitude, office.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = office;
      }
    }
    
    return { office: nearest, distance: Math.round(minDistance) };
  }, [offices, calculateDistance]);

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

      // Tính khoảng cách đến văn phòng gần nhất
      const nearest = findNearestOffice(location.latitude, location.longitude);
      if (nearest) {
        location.distance = nearest.distance;
        location.nearestOffice = nearest.office.name;
      }

      setLocationData(location);
      setPermissions(prev => ({ ...prev, location: true }));
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationError("Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập.");
      setPermissions(prev => ({ ...prev, location: false }));
    } finally {
      setState(prev => ({ ...prev, locationLoading: false }));
    }
  }, [findNearestOffice]);

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
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
      setPermissions(prev => ({ ...prev, camera: false }));
    }
  }, []);

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
        const now = new Date();
        setState(prev => ({ 
          ...prev, 
          checkInStatus: "success", 
          hasCheckedIn: true,
          checkInTime: now,
          canCheckOut: false
        }));
        
        // Cập nhật khoảng cách từ response
        if (response.data.data?.distance) {
          const distanceValue = parseInt(response.data.data.distance);
          setLocationData(prev => prev ? { ...prev, distance: distanceValue } : null);
        }
        
        toast.success("Check-in thành công!");

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
        setState(prev => ({ ...prev, checkInStatus: "already", hasCheckedIn: true }));
      } else if (err.response?.data?.code === 'TOO_EARLY') {
        toast.warning(errorMessage);
        setState(prev => ({ ...prev, checkInStatus: "error" }));
      } else {
        toast.error(errorMessage);
        setState(prev => ({ ...prev, checkInStatus: "error" }));
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto]);

  // Xử lý check-out
  const handleCheckOut = useCallback(async () => {
    if (!locationData) return;
    
    setState(prev => ({ ...prev, isProcessing: true, checkOutStatus: null }));

    try {
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error("Không thể chụp ảnh");
      }

      const formData = new FormData();
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      formData.append('accuracy', locationData.accuracy.toString());

      const blob = dataURLtoBlob(photoData);
      formData.append('photo', blob, `checkout-${Date.now()}.jpg`);

      const response = await api.post<CheckInResponse>("/attendance/checkout", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setState(prev => ({ ...prev, checkOutStatus: "success", hasCheckedOut: true }));
        
        const workHours = response.data.data?.workHours || '0h';
        toast.success(`Check-out thành công! Tổng giờ làm: ${workHours}`);

        setTimeout(() => {
          setState(prev => ({ ...prev, checkOutStatus: null }));
        }, 3000);
      }
    } catch (error) {
      console.error("Check-out error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi check-out";

      if (err.response?.data?.code === 'NOT_CHECKED_IN') {
        toast.warning(errorMessage);
        setState(prev => ({ ...prev, checkOutStatus: "not_checked_in" }));
      } else if (err.response?.data?.code === 'ALREADY_CHECKED_OUT') {
        toast.info(errorMessage);
        setState(prev => ({ ...prev, checkOutStatus: "success", hasCheckedOut: true }));
      } else if (err.response?.data?.code === 'INSUFFICIENT_WORK_HOURS') {
        toast.warning(errorMessage);
        setState(prev => ({ ...prev, checkOutStatus: "insufficient_hours" }));
      } else {
        toast.error(errorMessage);
        setState(prev => ({ ...prev, checkOutStatus: "error" }));
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto]);

  // Load danh sách offices và check trạng thái attendance khi mount
  useEffect(() => {
    const loadOffices = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Office[] }>("/locations");
        if (response.data.success) {
          setOffices(response.data.data);
        }
      } catch (error) {
        console.error("Error loading offices:", error);
      }
    };

    const checkTodayAttendance = async () => {
      try {
        const response = await api.get<Array<{ date: string; checkIn: string | null; checkOut: string | null }>>("/attendance/recent?limit=1");
        if (response.data && response.data.length > 0) {
          const latestAttendance = response.data[0];
          
          // Lấy ngày hôm nay (chỉ ngày, không có giờ)
          const today = new Date();
          const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
          
          // Parse ngày từ response (format: "Thứ Hai, 25 tháng 11, 2025" hoặc "25/11/2025")
          const dateMatch = latestAttendance.date.match(/(\d{1,2})\s*(?:tháng\s*)?(\d{1,2})(?:,\s*|\s+)(\d{4})/);
          
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            const attendanceStr = `${parseInt(day)}/${parseInt(month)}/${year}`;
            
            // So sánh ngày
            if (attendanceStr === todayStr) {
              // Parse thời gian check-in từ response (format: "08:30")
              let checkInTime = null;
              if (latestAttendance.checkIn) {
                const [hours, minutes] = latestAttendance.checkIn.split(':').map(Number);
                checkInTime = new Date(today);
                checkInTime.setHours(hours, minutes, 0, 0);
              }
              
              setState(prev => ({
                ...prev,
                hasCheckedIn: !!latestAttendance.checkIn,
                hasCheckedOut: !!latestAttendance.checkOut,
                checkInTime: checkInTime,
                canCheckOut: false // Sẽ được tính lại bởi useEffect
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error checking today attendance:", error);
      }
    };
    
    loadOffices();
    checkTodayAttendance();
  }, []);

  // Tự động lấy vị trí khi offices đã load
  useEffect(() => {
    if (offices.length > 0) {
      getLocation();
    }
  }, [offices.length]); // Chỉ chạy khi offices được load lần đầu

  // Reset state khi sang ngày mới (kiểm tra mỗi phút)
  useEffect(() => {
    let lastCheckDate = new Date().toDateString();

    const checkNewDay = setInterval(() => {
      const currentDate = new Date().toDateString();
      if (currentDate !== lastCheckDate) {
        // Sang ngày mới - reset state
        setState(prev => ({
          ...prev,
          hasCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          canCheckOut: false,
          checkInStatus: null,
          checkOutStatus: null
        }));
        lastCheckDate = currentDate;
      }
    }, 60000); // Kiểm tra mỗi phút

    return () => clearInterval(checkNewDay);
  }, []);

  // Kiểm tra thời gian làm việc để enable nút check-out
  useEffect(() => {
    if (!state.checkInTime || state.hasCheckedOut) return;

    const MIN_WORK_HOURS = 8; // Ca Full time: 8 giờ làm việc
    const checkInterval = setInterval(() => {
      const now = new Date();
      const hoursWorked = (now.getTime() - state.checkInTime!.getTime()) / (1000 * 60 * 60);
      
      if (hoursWorked >= MIN_WORK_HOURS) {
        setState(prev => ({ ...prev, canCheckOut: true }));
        clearInterval(checkInterval);
      }
    }, 60000); // Kiểm tra mỗi phút

    // Kiểm tra ngay lập tức
    const now = new Date();
    const hoursWorked = (now.getTime() - state.checkInTime.getTime()) / (1000 * 60 * 60);
    if (hoursWorked >= 8) { // 8 giờ làm việc
      setState(prev => ({ ...prev, canCheckOut: true }));
    }

    return () => clearInterval(checkInterval);
  }, [state.checkInTime, state.hasCheckedOut]);

  // Init camera khi mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const { isCameraReady, isProcessing, locationLoading, hasCheckedIn, hasCheckedOut, canCheckOut } = state;

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
                  {locationData.nearestOffice && (
                    <div className="flex justify-between items-start">
                      <span className="text-[var(--text-sub)]">Văn phòng gần nhất:</span>
                      <span className="font-medium text-[var(--text-main)] text-right">
                        {locationData.nearestOffice}
                      </span>
                    </div>
                  )}
                  {locationData.distance !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-sub)]">Khoảng cách:</span>
                      <span className={`font-mono font-medium ${
                        locationData.distance <= 100 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {Math.round(locationData.distance)}m
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">Vĩ độ:</span>
                    <span className="font-mono text-xs text-[var(--text-sub)]">
                      {locationData.latitude?.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">Kinh độ:</span>
                    <span className="font-mono text-xs text-[var(--text-sub)]">
                      {locationData.longitude?.toFixed(6)}
                    </span>
                  </div>
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

          {/* Nút check-in và check-out */}
          <div className="grid grid-cols-2 gap-3">
            {/* Nút Check-in */}
            <button
              onClick={handleCheckIn}
              disabled={isProcessing || !permissions.camera || !permissions.location || !locationData || hasCheckedIn}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--primary)]/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && !hasCheckedIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : hasCheckedIn ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Đã check-in
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Check-in
                </>
              )}
            </button>

            {/* Nút Check-out */}
            <button
              onClick={handleCheckOut}
              disabled={isProcessing || !permissions.camera || !permissions.location || !locationData || !hasCheckedIn || hasCheckedOut || !canCheckOut}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canCheckOut && hasCheckedIn && !hasCheckedOut ? "Cần làm việc ít nhất 8 giờ (ca Full time)" : ""}
            >
              {isProcessing && hasCheckedIn && !hasCheckedOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : hasCheckedOut ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Đã check-out
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Check-out
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




