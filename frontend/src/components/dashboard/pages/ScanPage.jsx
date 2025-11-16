import React, { useState } from "react";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";

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

  // Hàm đơn giản để kiểm tra quyền (chỉ UI)
  const checkPermissions = () => {
    setPermissions({
      camera: false,
      location: false,
    });
  };

  // Hàm đơn giản để bật camera (chỉ UI)
  const startCamera = () => {
    setIsCameraReady(true);
  };

  // Hàm đơn giản để tắt camera (chỉ UI)
  const stopCamera = () => {
    setIsCameraReady(false);
  };

  // Hàm đơn giản để xử lý check-in (chỉ UI)
  const handleCheckIn = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setCheckInStatus("success");
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Card chính - Chấm công bằng Camera */}
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[var(--text-main)]">
            Chấm công bằng Camera
          </CardTitle>
          <p className="text-sm text-[var(--text-sub)]">
            Chụp ảnh và lấy vị trí để chấm công
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
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="mb-2">
                    Vui lòng cấp quyền truy cập Camera và Vị trí trong cài đặt
                    trình duyệt để tiếp tục.
                  </p>
                  <button
                    onClick={checkPermissions}
                    className="text-xs underline hover:no-underline"
                  >
                    Kiểm tra lại quyền truy cập
                  </button>
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
              {/* Hiển thị placeholder khi camera chưa sẵn sàng */}
              {!isCameraReady ? (
                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--shell)] text-[var(--text-sub)]">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-12 w-12 animate-spin" />
                      <p className="text-sm">Đang xử lý...</p>
                    </>
                  ) : (
                    <>
                      <Camera className="h-12 w-12" />
                      <p className="text-sm">Camera chưa được kích hoạt</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--shell)] text-[var(--text-sub)]">
                  <Camera className="h-12 w-12" />
                  <p className="text-sm">Camera đã được kích hoạt</p>
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
