import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CaptureControlsProps {
  canCapture: boolean;
  isCapturing: boolean;
  autoCaptureCooldown: number;
  capturedImagesLength: number;
  maxImages: number;
  onCapture: () => void;
}

export const CaptureControls: React.FC<CaptureControlsProps> = ({
  canCapture,
  isCapturing,
  autoCaptureCooldown,
  capturedImagesLength,
  maxImages,
  onCapture,
}) => {
  return (
    <div className="flex justify-center mb-4">
      <Button
        onClick={onCapture}
        disabled={!canCapture || capturedImagesLength >= maxImages || isCapturing || autoCaptureCooldown > 0}
        size="lg"
        className={`transition-all duration-300 ${
          canCapture && autoCaptureCooldown === 0
            ? "bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60 hover:scale-105"
            : "bg-gray-600 cursor-not-allowed opacity-50"
        }`}
        aria-label={canCapture ? "Capture face photo" : "Cannot capture - waiting for good face position"}
      >
        {isCapturing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : autoCaptureCooldown > 0 ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cooldown: {autoCaptureCooldown}s
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Capture ({capturedImagesLength}/{maxImages})
          </>
        )}
      </Button>
    </div>
  );
};


