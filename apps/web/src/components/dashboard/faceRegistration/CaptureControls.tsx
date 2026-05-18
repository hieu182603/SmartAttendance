import React from 'react';
import { Camera, Loader2, Shield, CheckCircle2 } from 'lucide-react';

interface CaptureControlsProps {
  canCapture: boolean;
  isCapturing: boolean;
  capturedImagesLength: number;
  maxImages: number;
  onCapture: () => void;
  currentInstruction?: {
    title: string;
    description: string;
    icon: string;
  };
  currentStep?: number;
  totalSteps?: number;
  livenessRequired?: boolean;
  onStartLiveness?: () => void;
}

export const CaptureControls: React.FC<CaptureControlsProps> = ({
  canCapture,
  isCapturing,
  capturedImagesLength,
  maxImages,
  onCapture,
  currentInstruction,
  livenessRequired = false,
  onStartLiveness,
}) => {
  const isComplete = capturedImagesLength >= maxImages;

  return (
    <div className="flex flex-col gap-2">
      {/* Current instruction pill */}
      {currentInstruction && !isComplete && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--shell)] border border-[var(--border)] rounded-md">
          <span className="text-base leading-none">{currentInstruction.icon}</span>
          <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">
            {currentInstruction.title}
          </span>
        </div>
      )}

      {/* Capture / Liveness button */}
      {!isComplete ? (
        livenessRequired ? (
          <button
            type="button"
            onClick={onStartLiveness}
            className="w-full py-2.5 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all duration-200 bg-[var(--warning)] text-black hover:brightness-110 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.5)] hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.7)]"
            aria-label="Xác thực khuôn mặt trước khi chụp ảnh"
          >
            <Shield className="h-4 w-4" />
            Xác thực khuôn mặt
          </button>
        ) : (
          <button
            type="button"
            onClick={onCapture}
            disabled={!canCapture || isCapturing}
            className={`w-full py-2.5 rounded-xl font-bold text-[13px] tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all duration-200 relative overflow-hidden ${canCapture && !isCapturing
              ? "bg-gradient-to-br from-[var(--accent-cyan)] to-[#06b6d4] text-white shadow-[0_0_32px_-4px_rgba(34,211,238,0.45)] hover:translate-y-[-1px]"
              : "bg-[var(--shell)] border-2 border-[var(--border)] text-[var(--text-sub)] cursor-not-allowed"
              }`}
            aria-label={canCapture ? "Chụp ảnh khuôn mặt" : "Đang chờ vị trí tốt"}
            title={!canCapture ? "Vui lòng căn chỉnh khuôn mặt trước khi chụp" : "Chụp ảnh khuôn mặt"}
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                <span>
                  Chụp ảnh <span className="mono font-bold">({capturedImagesLength}/{maxImages})</span>
                </span>
                <span className="px-1.5 py-0.5 ml-1 bg-white/15 rounded text-[10px] font-semibold mono">
                  SPACE
                </span>
              </>
            )}
          </button>
        )
      ) : (
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-md">
          <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
          <p className="text-xs font-semibold text-[var(--success)]">
            Đã đủ {maxImages} ảnh — Nhấn để đăng ký
          </p>
        </div>
      )}
    </div>
  );
};
