import React, { useState, useEffect, useRef } from "react";
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

const ScanPage = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [permissions, setPermissions] = useState({
    camera: false,
    location: false,
  });
  const [scannedQRCode, setScannedQRCode] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Kiểm tra quyền truy cập thật
  const checkPermissions = async () => {
    try {
      // Kiểm tra quyền camera
      const cameraPermission = await navigator.permissions.query({
        name: "camera",
      });
      const cameraGranted = cameraPermission.state === "granted";

      // Kiểm tra quyền location
      const locationPermission = await navigator.permissions.query({
        name: "geolocation",
      });
      const locationGranted = locationPermission.state === "granted";

      setPermissions({
        camera: cameraGranted,
        location: locationGranted,
      });

      // Nếu chưa có quyền, thử yêu cầu
      if (!cameraGranted || !locationGranted) {
        // Yêu cầu quyền location
        if (!locationGranted) {
          await getLocation();
        }
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      // Fallback: thử truy cập trực tiếp
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setPermissions((prev) => ({ ...prev, camera: true }));
      } catch (e) {
        setPermissions((prev) => ({ ...prev, camera: false }));
      }
    }
  };

  // Lấy thông tin WiFi (BSSID/SSID) - nếu có thể
  const getWiFiInfo = async () => {
    const result = { ssid: null, bssid: null };

    try {
      // Thử lấy qua Chrome Experimental API (chỉ Android Chrome)
      if ("connection" in navigator) {
        const connection =
          navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection;
        if (connection && connection.type === "wifi") {
          // Trên Android Chrome, có thể có API để lấy WiFi info
          if (
            "wifi" in navigator &&
            typeof navigator.wifi?.getWifiInfo === "function"
          ) {
            try {
              const wifiInfo = await navigator.wifi.getWifiInfo();
              result.ssid = wifiInfo.ssid || null;
              result.bssid = wifiInfo.bssid || null;
            } catch (e) {
              console.log("Chrome WiFi API không khả dụng:", e);
            }
          }
        }
      }

      // Thử sử dụng Network Information API
      // Lưu ý: BSSID thường không có sẵn qua Web API vì lý do bảo mật
      // Cần extension hoặc native app để lấy BSSID đầy đủ
    } catch (error) {
      console.log("Không thể lấy thông tin WiFi:", error);
    }

    return result;
  };

  // Lấy vị trí thật kết hợp GPS và WiFi
  const getLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      // Lấy GPS
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      // Thử lấy thông tin WiFi
      const wifiInfo = await getWiFiInfo();

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        ssid: wifiInfo.ssid,
        bssid: wifiInfo.bssid,
      };

      setLocationData(location);
      setPermissions((prev) => ({ ...prev, location: true }));
      setLocationLoading(false);
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationError(
        "Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập."
      );
      setPermissions((prev) => ({ ...prev, location: false }));
      setLocationLoading(false);
    }
  };

  // Bật camera thật
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Camera sau (mobile)
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraReady(true);
        setPermissions((prev) => ({ ...prev, camera: true }));

        // Tự động lấy vị trí khi bật camera
        if (!locationData) {
          getLocation();
        }

        // Bắt đầu quét QR code
        startQRScanning();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error(
        "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập."
      );
      setPermissions((prev) => ({ ...prev, camera: false }));
    }
  };

  // Tắt camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraReady(false);
    setScannedQRCode(null);
  };

  // Quét QR code (sử dụng thư viện html5-qrcode hoặc tự implement)
  const startQRScanning = () => {
    // Đơn giản hóa: chỉ cần chụp ảnh và gửi lên server
    // Hoặc có thể dùng thư viện html5-qrcode để quét real-time
    // Ở đây tạm thời bỏ qua QR scanning, chỉ cần location validation
  };

  // Xử lý check-in
  const handleCheckIn = async () => {
    if (!locationData) {
      toast.error("Vui lòng đợi lấy vị trí hoàn tất");
      return;
    }

    setIsProcessing(true);
    setCheckInStatus(null);

    try {
      // Chụp ảnh từ video stream và resize để giảm kích thước
      let photoData = null;
      if (videoRef.current && isCameraReady) {
        const canvas = document.createElement("canvas");
        const video = videoRef.current;

        // Giới hạn kích thước tối đa (ví dụ: 800px chiều rộng)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;

        let width = video.videoWidth;
        let height = video.videoHeight;

        // Tính toán kích thước mới giữ nguyên tỷ lệ
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
        ctx.drawImage(video, 0, 0, width, height);

        // Nén ảnh với chất lượng thấp hơn (0.6 thay vì 0.8)
        photoData = canvas.toDataURL("image/jpeg", 0.6);

        // Kiểm tra kích thước (cảnh báo nếu > 2MB)
        const sizeInMB = photoData.length / (1024 * 1024);
        if (sizeInMB > 2) {
          console.warn(
            `Ảnh khá lớn: ${sizeInMB.toFixed(2)}MB. Có thể gửi chậm.`
          );
        }
      }

      // Sử dụng api service đã có interceptor tự động thêm token
      const response = await api.post("/attendance/checkin", {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        ssid: locationData.ssid, // SSID của WiFi
        bssid: locationData.bssid, // BSSID (MAC address) của WiFi
        qrCode: scannedQRCode, // Nếu có QR code
        photo: photoData, // Ảnh chụp (base64)
      });

      if (response.data.success) {
        setCheckInStatus("success");
        toast.success("Chấm công thành công!");

        // Reset sau 3 giây
        setTimeout(() => {
          setCheckInStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Check-in error:", error);
      const errorMessage =
        error.response?.data?.message || "Có lỗi xảy ra khi chấm công";
      toast.error(errorMessage);
      setCheckInStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Kiểm tra quyền khi component mount
  useEffect(() => {
    checkPermissions();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Card chính - Quét QR điểm danh */}
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
          {/* Trạng thái quyền truy cập */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
              Trạng thái quyền truy cập
            </h3>
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  permissions.camera
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {permissions.camera ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                Camera - {permissions.camera ? "Đã cấp" : "Bị từ chối"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  permissions.location
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {permissions.location ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                Vị trí - {permissions.location ? "Đã cấp" : "Bị từ chối"}
              </span>
            </div>
            {(!permissions.camera || !permissions.location) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <p>
                    Vui lòng cấp quyền truy cập Camera và Vị trí trong cài đặt
                    trình duyệt để tiếp tục.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Camera */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-main)]">
              Camera trực tiếp
            </h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--shell)]">
              {/* Video stream từ camera */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  isCameraReady ? "block" : "hidden"
                }`}
              />

              {/* Hiển thị placeholder khi camera chưa sẵn sàng */}
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
                    <span className="text-[var(--text-sub)]">
                      Độ chính xác:
                    </span>
                    <span className="font-mono text-[var(--text-main)]">
                      ±{Math.round(locationData.accuracy)}m
                    </span>
                  </div>
                )}
                {locationData.ssid && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">WiFi SSID:</span>
                    <span className="font-mono text-[var(--text-main)]">
                      {locationData.ssid}
                    </span>
                  </div>
                )}
                {locationData.bssid && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-sub)]">WiFi BSSID:</span>
                    <span className="font-mono text-[var(--text-main)]">
                      {locationData.bssid}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-sub)]">
                <MapPin className="h-4 w-4" />
                Đang lấy vị trí...
              </div>
            )}

            {/* Nút lấy lại vị trí */}
            {locationData && (
              <button
                onClick={getLocation}
                className="mt-2 text-xs text-[var(--primary)] hover:underline"
              >
                Làm mới vị trí
              </button>
            )}
          </div>

          {/* Nút điều khiển */}
          <div className="flex gap-3">
            {!isCameraReady ? (
              <button
                onClick={startCamera}
                disabled={!permissions.camera || !permissions.location}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--primary)]/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="h-4 w-4" />
                Bật Camera
              </button>
            ) : (
              <>
                <button
                  onClick={stopCamera}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-[var(--text-main)] transition hover:bg-[var(--shell)]"
                >
                  Tắt Camera
                </button>
                <button
                  onClick={handleCheckIn}
                  disabled={checkInStatus === "success" || isProcessing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--primary)]/30 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanPage;
