import React, { useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
  faceQuality: any; // FaceQuality type
  showFlash: boolean;
  showSuccessAnimation: boolean;
  showMilestoneCelebration: boolean;
  isAutoCapturing: boolean;
  autoCaptureCountdown: number;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
  onRetry: () => void;
}

const PROGRESS_STEPS = [
  { key: "detecting", label: "Detecting" },
  { key: "aligning", label: "Aligning" },
  { key: "capturing", label: "Capturing" },
  { key: "completed", label: "Completed" },
] as const;

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  cameraReady,
  modelLoading,
  modelError,
  cameraError,
  detectionStatus,
  statusMessage,
  progress,
  currentStep,
  maskColor,
  faceQuality,
  showFlash,
  showSuccessAnimation,
  showMilestoneCelebration,
  isAutoCapturing,
  autoCaptureCountdown,
  onVideoRef,
  onCanvasRef,
  onRetry,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onVideoRef(videoRef.current);
    onCanvasRef(canvasRef.current);
  }, [onVideoRef, onCanvasRef]);

  // Derive mutually exclusive overlay state based on priority
  const overlayState = React.useMemo(() => {
    if (modelError) return 'error';
    if (cameraError && !cameraReady) return 'error';
    if (!cameraReady || modelLoading) return 'loading';
    if (isAutoCapturing) return 'countdown';
    if (showSuccessAnimation) return 'success';
    if (showMilestoneCelebration) return 'milestone';
    if (showFlash) return 'flash';
    return 'none';
  }, [modelError, cameraError, cameraReady, modelLoading, isAutoCapturing, showSuccessAnimation, showMilestoneCelebration, showFlash]);

  const getStatusColor = (status: FaceDetectionStatus): string => {
    switch (status) {
      case "good": return "text-green-500";
      case "warning": return "text-amber-500";
      case "error": return "text-red-500";
      case "loading": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const getCurrentStepLabel = () => {
    return PROGRESS_STEPS.find((s) => s.key === currentStep)?.label || "Detecting";
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "cover" }}
      />

      {/* Mutually exclusive overlay rendering */}
      {overlayState === 'flash' && (
        <div className="absolute inset-0 bg-white opacity-80 animate-pulse pointer-events-none z-50"></div>
      )}

      {/* Success and milestone effects removed per request */}

      {overlayState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  stroke="currentColor" strokeWidth="8" fill="transparent"
                  className="text-gray-600"
                />
                <circle
                  cx="50" cy="50" r="45"
                  stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - autoCaptureCountdown / 3)}`}
                  className="text-cyan-500 transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white animate-pulse">
                  {autoCaptureCountdown}
                </span>
              </div>
            </div>
            <p className="text-lg text-cyan-400 font-medium">Auto capturing...</p>
          </div>
        </div>
      )}

      {overlayState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 text-white z-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-cyan-500" />
            <p className="text-sm">
              {modelLoading ? "Loading face detection model..." : "Starting camera..."}
            </p>
          </div>
        </div>
      )}

      {overlayState === 'error' && modelError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 text-white z-50">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Model Loading Failed</h3>
            <p className="text-sm text-gray-400 mb-4">Face detection model failed to load</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {overlayState === 'error' && cameraError && !cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 text-white z-50">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
            <p className="text-sm text-gray-400 mb-4">
              {cameraError === "permission" && "Please allow camera access"}
              {cameraError === "not_found" && "No camera detected"}
              {cameraError === "busy" && "Camera is being used by another application"}
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Status indicator */}
      {faceQuality && (
        <div className={`absolute top-6 right-6 px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-500 ${
          maskColor === "good" ? "bg-green-500/20 border border-green-500/50 text-green-400" :
          maskColor === "warning" ? "bg-amber-500/20 border border-amber-500/50 text-amber-400" :
          "bg-red-500/20 border border-red-500/50 text-red-400"
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {maskColor === "good" && <CheckCircle2 className="h-4 w-4" />}
            {(maskColor === "warning" || maskColor === "error") && <AlertCircle className="h-4 w-4" />}
            <span>{getCurrentStepLabel()}</span>
          </div>
        </div>
      )}

      {/* Quality meter */}
      {faceQuality && (
        <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-xs text-cyan-400 font-medium">Quality</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  faceQuality.score >= 0.8 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                  faceQuality.score >= 0.7 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                style={{ width: `${faceQuality.score * 100}%` }}
              ></div>
            </div>
            <span className={`text-xs font-bold ${
              faceQuality.score >= 0.8 ? 'text-green-400' :
              faceQuality.score >= 0.7 ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {Math.round(faceQuality.score * 100)}%
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
