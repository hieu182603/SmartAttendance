import React, { useRef, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { type FaceDetectionStatus } from '@/hooks/useFaceDetection';
import { type ProgressStep } from '../pages/FaceRegistrationPage';

interface CameraPreviewProps {
  cameraReady: boolean;
  modelLoading: boolean;
  modelError: boolean;
  cameraError: string | null;
  detectionStatus: FaceDetectionStatus;
  statusMessage: string;
  progress: number;
  currentStep: ProgressStep;
  maskColor: "good" | "warning" | "error";
  faceQuality: any;
  showFlash: boolean;
  showSuccessAnimation: boolean;
  showMilestoneCelebration: boolean;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onRetry: () => void;
}

// Map detection status to HUD data-attribute
const hudFromStatus = (s: FaceDetectionStatus, maskColor: "good" | "warning" | "error") => {
  if (s === "good") return "good";
  if (s === "warning") return "warning";
  if (s === "error") return "error";
  if (s === "loading" || s === "none") return "detecting";
  return maskColor;
};

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  cameraReady,
  modelLoading,
  modelError,
  cameraError,
  detectionStatus,
  statusMessage,
  faceQuality,
  showFlash,
  onVideoRef,
  onCanvasRef,
  onRetry,
  maskColor,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onVideoRef(videoRef.current);
    onCanvasRef(canvasRef.current);
  }, [onVideoRef, onCanvasRef]);

  const overlayState = React.useMemo(() => {
    if (modelError) return 'error';
    if (cameraError && !cameraReady) return 'error';
    if (!cameraReady || modelLoading) return 'loading';
    if (showFlash) return 'flash';
    return 'none';
  }, [modelError, cameraError, cameraReady, modelLoading, showFlash]);

  const hudState = hudFromStatus(detectionStatus, maskColor);

  const qualityLabel = faceQuality
    ? (faceQuality.score ?? 0).toFixed(2)
    : "—";

  return (
    <div
      className="hud-frame w-full flex-1 min-h-[38vh] md:min-h-[44vh] lg:min-h-[48vh] xl:min-h-[52vh] relative"
      data-hud={hudState}
      role="region"
      aria-label="Camera preview"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "cover" }}
      />

      {/* HUD corner brackets */}
      <div className="hud-corners" aria-hidden>
        <span />
      </div>

      {/* Scanner sweep */}
      <div className="scanner-line" aria-hidden />

      {/* Status pill — top center */}
      <div className="status-pill">
        <span className="status-pill__dot" />
        <span>{statusMessage}</span>
      </div>

      {/* Flash on capture */}
      {overlayState === 'flash' && (
        <div className="absolute inset-0 bg-white pointer-events-none z-40 capture-flash" />
      )}

      {/* Loading overlay */}
      {overlayState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/95 text-[var(--text-main)] z-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-[var(--accent-cyan)]" />
            <p className="text-sm tracking-wide uppercase">
              {modelLoading ? "Đang tải mô hình nhận diện..." : "Đang khởi động camera..."}
            </p>
          </div>
        </div>
      )}

      {/* Error overlays */}
      {overlayState === 'error' && modelError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/95 text-[var(--text-main)] z-50">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="h-12 w-12 text-[var(--error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tải mô hình thất bại</h3>
            <p className="text-sm text-[var(--text-sub)] mb-4">
              Không thể tải mô hình nhận diện khuôn mặt
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--accent-cyan)] hover:opacity-90 rounded-md text-[#042f2e] font-semibold"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      )}

      {overlayState === 'error' && cameraError && !cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/95 text-[var(--text-main)] z-50">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="h-12 w-12 text-[var(--error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cần cấp quyền camera</h3>
            <p className="text-sm text-[var(--text-sub)] mb-4">
              {cameraError === "permission" && "Vui lòng cho phép truy cập camera"}
              {cameraError === "not_found" && "Không tìm thấy camera"}
              {cameraError === "busy" && "Camera đang được ứng dụng khác sử dụng"}
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-[var(--accent-cyan)] hover:opacity-90 rounded-md text-[#042f2e] font-semibold"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* HUD bottom meta */}
      <div className="hud-meta">
        <div className="hud-meta__item">
          <span className="hud-meta__label">FPS</span>
          <span className="hud-meta__value">30</span>
        </div>
        <div className="hud-meta__item">
          <span className="hud-meta__label">Quality</span>
          <span className="hud-meta__value">{qualityLabel}</span>
        </div>
      </div>
    </div>
  );
};
