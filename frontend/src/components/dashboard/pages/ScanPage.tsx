import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/services/api";
import type { AxiosError } from "axios";

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

const ScanPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
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
  const [showOvertimeWarning, setShowOvertimeWarning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3; // Bán kính trái đất (mét)
    
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }, []);

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

  const getLocation = useCallback(async () => {
    setState(prev => ({ ...prev, locationLoading: true }));
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000, 
          maximumAge: 0,
        });
      });

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
      setPermissions(prev => ({ ...prev, location: true }));
    } catch (error: any) {
      console.error("Error getting location:", error);
      
      let errorMessage = "Không thể lấy vị trí. ";
      
      if (error.code === 1) { 
        errorMessage += "Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt.";
      } else if (error.code === 2) { 
        errorMessage += "Tín hiệu GPS không khả dụng. Hãy thử di chuyển ra ngoài trời.";
      } else if (error.code === 3) { 
        errorMessage += "Không thể lấy vị trí trong thời gian cho phép. Hãy kiểm tra GPS và thử lại.";
      } else {
        errorMessage += "Vui lòng kiểm tra quyền truy cập và GPS.";
      }
      
      setLocationError(errorMessage);
      setPermissions(prev => ({ ...prev, location: false }));
      toast.error(errorMessage);
    } finally {
      setState(prev => ({ ...prev, locationLoading: false }));
    }
  }, [findNearestOffice]);

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
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.6);
  }, [state.isCameraReady]);

  const handleCheckIn = useCallback(async () => {
    if (!locationData) return;
    
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error(t('dashboard:scan.errors.captureFailed'));
      }

      const formData = new FormData();
      formData.append('latitude', locationData.latitude.toString());
      formData.append('longitude', locationData.longitude.toString());
      formData.append('accuracy', locationData.accuracy.toString());

      const blob = dataURLtoBlob(photoData);
      formData.append('photo', blob, `checkin-${Date.now()}.jpg`);

      const response = await api.post<CheckInResponse>("/attendance/checkin", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const now = new Date();
        setState(prev => ({ 
          ...prev, 
          hasCheckedIn: true,
          checkInTime: now,
          canCheckOut: false
        }));
        setShowOvertimeWarning(false);
        
        if (response.data.data) {
          const { distance, location } = response.data.data;
          setLocationData(prev => prev ? { 
            ...prev, 
            distance: distance ? parseInt(distance) : prev.distance,
            nearestOffice: location || prev.nearestOffice
          } : null);
        }
        
        toast.success(response.data.message || "Check-in thành công!");
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi chấm công";

      if (err.response?.data?.code === 'ALREADY_CHECKED_IN') {
        toast.info(errorMessage);
        setState(prev => ({ ...prev, hasCheckedIn: true }));
      } else if (err.response?.data?.code === 'TOO_EARLY') {
        toast.warning(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto]);

  const handleCheckOut = useCallback(async () => {
    if (!locationData) return;
    
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const photoData = capturePhoto();
      if (!photoData) {
        throw new Error(t('dashboard:scan.errors.captureFailed'));
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
        setState(prev => ({ ...prev, hasCheckedOut: true }));
        setShowOvertimeWarning(false);
        
        if (response.data.data) {
          const { distance, location } = response.data.data;
          setLocationData(prev => prev ? { 
            ...prev, 
            distance: distance ? parseInt(distance) : prev.distance,
            nearestOffice: location || prev.nearestOffice
          } : null);
        }
        
        toast.success(response.data.message || "Check-out thành công!");
      }
    } catch (error) {
      console.error("Check-out error:", error);
      const err = error as AxiosError<CheckInError>;
      const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra khi check-out";

      if (err.response?.data?.code === 'NOT_CHECKED_IN') {
        toast.warning(errorMessage);
      } else if (err.response?.data?.code === 'ALREADY_CHECKED_OUT') {
        toast.info(errorMessage);
        setState(prev => ({ ...prev, hasCheckedOut: true }));
      } else if (err.response?.data?.code === 'INSUFFICIENT_WORK_HOURS') {
        toast.warning(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [locationData, capturePhoto]);

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
            radius: 100,
          }));
          setOffices(branches);
        }
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    };

    const checkTodayAttendance = async () => {
      try {
        const response = await api.get<Array<{ date: string; checkIn: string | null; checkOut: string | null }>>("/attendance/recent?limit=1");
        if (response.data && response.data.length > 0) {
          const latestAttendance = response.data[0];
          
          const today = new Date();
          const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
          
          const dateMatch = latestAttendance.date.match(/(\d{1,2})\s*(?:tháng\s*)?(\d{1,2})(?:,\s*|\s+)(\d{4})/);
          
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            const attendanceStr = `${parseInt(day)}/${parseInt(month)}/${year}`;
            
            if (attendanceStr === todayStr) {
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
                canCheckOut: false 
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
        setState(prev => ({
          ...prev,
          hasCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          canCheckOut: false,
        }));
        lastCheckDate = currentDate;
      }
    }, 60000); 

    return () => clearInterval(checkNewDay);
  }, []);

  useEffect(() => {
    if (!state.checkInTime || state.hasCheckedOut) return;

    const MIN_WORK_HOURS = 1; 
    const STANDARD_WORK_HOURS = 8; 
    const now = new Date();
    const hoursWorked = (now.getTime() - state.checkInTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursWorked >= MIN_WORK_HOURS) {
      setState(prev => ({ ...prev, canCheckOut: true }));
    }

    if (hoursWorked >= STANDARD_WORK_HOURS) {
      setShowOvertimeWarning(true);
    }

    const checkInterval = setInterval(() => {
      const now = new Date();
      const hoursWorked = (now.getTime() - state.checkInTime!.getTime()) / (1000 * 60 * 60);
      
      if (hoursWorked >= MIN_WORK_HOURS && !state.canCheckOut) {
        setState(prev => ({ ...prev, canCheckOut: true }));
      }

      // Hiển thị cảnh báo khi quá 8 giờ
      if (hoursWorked >= STANDARD_WORK_HOURS && !showOvertimeWarning) {
        setShowOvertimeWarning(true);
        toast.warning("⏰ Bạn đã làm việc được 8 tiếng! Đừng quên check-out nhé.", {
          duration: 10000,
        });
      }
    }, 60000); // Check mỗi phút

    return () => clearInterval(checkInterval);
  }, [state.checkInTime, state.hasCheckedOut, state.canCheckOut, showOvertimeWarning]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []); 

  const { isCameraReady, isProcessing, locationLoading, hasCheckedIn, hasCheckedOut, canCheckOut, checkInTime } = state;

  // Tính thời gian đã làm việc
  const getWorkedHours = () => {
    if (!checkInTime || hasCheckedOut) return null;
    const now = new Date();
    const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    const hours = Math.floor(hoursWorked);
    const minutes = Math.floor((hoursWorked - hours) * 60);
    return { hours, minutes, total: hoursWorked };
  };

  const workedTime = getWorkedHours();

  return (
    <div className="space-y-6">
      {/* Cảnh báo quá giờ */}
      {showOvertimeWarning && hasCheckedIn && !hasCheckedOut && (
        <div className="rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                ⏰ Nhắc nhở: Đã quá giờ làm việc!
              </h3>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-400">
                Bạn đã làm việc {workedTime?.hours}h {workedTime?.minutes}m. Đừng quên check-out để ghi nhận thời gian làm việc chính xác nhé!
              </p>
            </div>
            <button
              onClick={() => setShowOvertimeWarning(false)}
              className="flex-shrink-0 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-main)]">
            {t('dashboard:scan.checkInToday')}
          </CardTitle>
          <p className="text-sm text-[var(--text-sub)] mt-2">
            {t('dashboard:scan.description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trạng thái quyền */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
              {t('dashboard:scan.permissionStatus')}
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
                  {key === 'camera' ? 'Camera' : 'Vị trí'} - {granted ? "Đã cấp" : "Chưa cấp"}
                </span>
              ))}
            </div>
            {(!permissions.camera || !permissions.location) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{t('permissions.requestMessage')}</p>
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
                style={{ transform: 'scaleX(-1)' }}
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--shell)] text-[var(--text-sub)]">
                  <Camera className="h-12 w-12" />
                  <p className="text-sm">Camera chưa được kích hoạt</p>
                </div>
              )}
            </div>
          </div>

          {/* Thời gian làm việc */}
          {hasCheckedIn && !hasCheckedOut && workedTime && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Thời gian làm việc
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-sub)]">Đã làm việc:</span>
                  <span className={`font-mono font-semibold ${workedTime.total >= 8 ? 'text-orange-600 dark:text-orange-400' : 'text-[var(--text-main)]'}`}>
                    {workedTime.hours}h {workedTime.minutes}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-sub)]">Check-in lúc:</span>
                  <span className="font-mono text-[var(--text-main)]">
                    {checkInTime?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {workedTime.total >= 8 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)]">
                    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Đã quá 8 giờ làm việc
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thông tin vị trí */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <MapPin className="h-4 w-4" />
              Thông tin vị trí
            </h3>
            {!locationData && !locationError ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-sub)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lấy vị trí...
              </div>
            ) : locationError ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>{locationError}</p>
                </div>
                <button
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang thử lại...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Thử lại
                    </>
                  )}
                </button>
              </div>
            ) : locationData ? (
              <div className="relative">
                {/* Loading overlay khi đang refresh */}
                {locationLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--shell)]/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang làm mới...
                    </div>
                  </div>
                )}
                
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
                  disabled={locationLoading}
                  className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg border border-[var(--border)] bg-[var(--shell)] px-4 py-2 text-sm font-medium text-[var(--text-main)] transition hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MapPin className="h-4 w-4" />
                  Làm mới vị trí
                </button>
              </div>
            ) : null}
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

            <button
              onClick={handleCheckOut}
              disabled={isProcessing || !permissions.camera || !permissions.location || !locationData || !hasCheckedIn || hasCheckedOut || !canCheckOut}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canCheckOut && hasCheckedIn && !hasCheckedOut ? "Vui lòng chờ ít nhất 1 giờ sau khi check-in" : ""}
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