import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { useGeolocation } from "../../../hooks/useGeolocation";
import attendanceService from "../../../services/attendanceService";
import { toast } from "sonner";

const ScanPage = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    location,
    wifiInfo,
    loading: locationLoading,
    error: locationError,
    permissions,
    getLocationAndWiFi,
    checkPermissions,
  } = useGeolocation();

  // Kiểm tra quyền và bật camera khi component mount
  useEffect(() => {
    const init = async () => {
      try {
        const perms = await checkPermissions();
        console.log("Permissions:", perms);
        // Tự động bật camera nếu có quyền
        if (perms.camera && perms.location) {
          // Đợi đảm bảo video element đã được render (tăng thời gian chờ)
          let retries = 0;
          const tryStartCamera = () => {
            if (videoRef.current) {
              console.log("Video element đã sẵn sàng, bật camera");
              startCamera();
            } else if (retries < 10) {
              retries++;
              console.log(`Đợi video element... (lần thử ${retries})`);
              setTimeout(tryStartCamera, 200);
            } else {
              console.error("Video element không được tạo sau 2 giây");
              toast.error(
                "Không thể tìm thấy video element. Vui lòng refresh trang."
              );
            }
          };
          tryStartCamera();
        } else {
          console.warn("Chưa có đủ quyền:", perms);
        }
      } catch (error) {
        console.error("Lỗi khi init:", error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đảm bảo video element được cập nhật khi stream thay đổi
  useEffect(() => {
    if (videoRef.current && streamRef.current && isCameraReady) {
      console.log("Cập nhật video srcObject");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn("Lỗi khi play video trong useEffect:", err);
      });
    }
  }, [isCameraReady]);

  // Bật camera
  const startCamera = async () => {
    try {
      console.log("Đang bật camera...");

      // Thử camera sau trước, nếu không được thì dùng camera trước
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Camera sau (mobile)
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        console.log("Camera sau đã bật");
      } catch (envError) {
        console.warn("Không thể dùng camera sau, thử camera trước:", envError);
        // Fallback: thử camera trước
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user", // Camera trước
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        console.log("Camera trước đã bật");
      }

      streamRef.current = stream;
      console.log("Stream đã được gán:", stream);

      // Đợi video element sẵn sàng
      if (!videoRef.current) {
        console.error("Video ref chưa sẵn sàng, đợi thêm...");
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (videoRef.current) {
        console.log("Đang gán stream vào video element");
        videoRef.current.srcObject = stream;

        // Đảm bảo video được play
        const video = videoRef.current;

        const playVideo = async () => {
          try {
            await video.play();
            console.log("Video đã play thành công");
            setIsCameraReady(true);
            toast.success("Camera đã sẵn sàng");
          } catch (playError) {
            console.error("Lỗi khi play video:", playError);
            // Vẫn đánh dấu là ready nếu stream đã có
            if (streamRef.current) {
              setIsCameraReady(true);
            }
          }
        };

        // Nếu video đã có metadata thì play ngay
        if (video.readyState >= 2) {
          await playVideo();
        } else {
          // Đợi metadata load
          video.onloadedmetadata = playVideo;
          // Timeout sau 2 giây
          setTimeout(async () => {
            if (video.readyState < 2) {
              console.warn("Video metadata timeout, thử play anyway");
              await playVideo();
            }
          }, 2000);
        }
      } else {
        console.error("Video element không tồn tại!");
        toast.error("Không tìm thấy video element");
      }

      // Lấy vị trí ngay khi camera sẵn sàng
      try {
        const locData = await getLocationAndWiFi();
        setLocationData(locData);
      } catch (locError) {
        console.warn("Chưa lấy được vị trí:", locError);
      }
    } catch (error) {
      console.error("Lỗi camera:", error);
      toast.error(
        "Không thể truy cập camera: " +
          (error.message || "Vui lòng kiểm tra quyền truy cập")
      );
    }
  };

  // Dừng camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  // Chụp ảnh từ video
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Vẽ ảnh từ video (không mirror)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.8);
  };

  // Xử lý check-in với ảnh
  const handleCheckIn = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      // Chụp ảnh
      const photoData = capturePhoto();

      // Lấy vị trí nếu chưa có
      let locData = locationData;
      if (!locData || !locData.latitude || !locData.longitude) {
        try {
          locData = await getLocationAndWiFi();
          setLocationData(locData);
        } catch (err) {
          toast.error("Không thể lấy vị trí: " + err.message);
          setIsProcessing(false);
          return;
        }
      }

      if (!locData || !locData.latitude || !locData.longitude) {
        toast.error("Vui lòng đợi hệ thống lấy vị trí");
        setIsProcessing(false);
        return;
      }

      // Chỉ gửi các field có giá trị
      const checkInData = {
        latitude: locData.latitude,
        longitude: locData.longitude,
      };

      if (locData.accuracy != null) {
        checkInData.accuracy = locData.accuracy;
      }
      if (locData.bssid) {
        checkInData.bssid = locData.bssid;
      }
      if (locData.ssid) {
        checkInData.ssid = locData.ssid;
      }

      const result = await attendanceService.checkIn(checkInData);

      setCheckInStatus("success");
      toast.success(result.message || "Check-in thành công!");

      // Dừng camera sau khi check-in thành công
      setTimeout(() => {
        stopCamera();
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      setCheckInStatus("error");
      toast.error(error.message || "Check-in thất bại");
      setIsProcessing(false);
    }
  };

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
              {/* Luôn render video element để ref có thể được gán */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  isCameraReady && streamRef.current ? "block" : "hidden"
                }`}
                style={{ transform: "scaleX(-1)" }} // Mirror effect
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Hiển thị placeholder khi camera chưa sẵn sàng */}
              {!isCameraReady || !streamRef.current ? (
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
              ) : null}
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
                Chưa lấy vị trí
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
