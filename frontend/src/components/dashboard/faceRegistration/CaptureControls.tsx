import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export const CaptureControls: React.FC<CaptureControlsProps> = ({
  canCapture,
  isCapturing,
  capturedImagesLength,
  maxImages,
  onCapture,
  currentInstruction,
  currentStep = 0,
  totalSteps = 5,
}) => {
  const isComplete = capturedImagesLength >= maxImages;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Current instruction */}
      {currentInstruction && !isComplete && (
        <div className="w-full text-center px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">{currentInstruction.icon}</span>
            <span className="text-sm font-medium text-cyan-400">{currentInstruction.title}</span>
          </div>
          <p className="text-xs text-gray-400">{currentInstruction.description}</p>
        </div>
      )}

      {/* Step progress dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i < capturedImagesLength
                ? 'bg-green-500 scale-110'
                : i === capturedImagesLength
                  ? 'bg-cyan-500 animate-pulse scale-125'
                  : 'bg-gray-600'
              }`}
          />
        ))}
      </div>

      {/* Capture button */}
      {!isComplete ? (
        <Button
          onClick={onCapture}
          disabled={!canCapture || isCapturing}
          size="lg"
          className={`w-full transition-all duration-300 ${canCapture
              ? "bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60 hover:scale-105"
              : "bg-gray-600 cursor-not-allowed opacity-50"
            }`}
          aria-label={canCapture ? "Chụp ảnh khuôn mặt" : "Đang chờ vị trí tốt"}
        >
          {isCapturing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 mr-2" />
              Chụp ảnh ({capturedImagesLength}/{maxImages})
            </>
          )}
        </Button>
      ) : (
        <div className="w-full text-center px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm font-medium text-green-400">✅ Đã chụp đủ {maxImages} ảnh</p>
          <p className="text-xs text-gray-400 mt-1">Nhấn "Đăng ký" để hoàn tất</p>
        </div>
      )}
    </div>
  );
};
