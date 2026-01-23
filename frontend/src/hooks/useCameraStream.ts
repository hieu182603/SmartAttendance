import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export interface CameraState {
  cameraReady: boolean;
  cameraError: string | null;
  retryCount: number;
  stream: MediaStream | null;
}

export interface CameraActions {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  retryCamera: () => void;
}

export const useCameraStream = (): CameraState & CameraActions => {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (stream) {
        streamRef.current = stream;
        setCameraReady(true);
        setRetryCount(0);

        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      setCameraReady(false);

      // Determine error type
      let errorType = "generic";
      if (error.name === 'NotAllowedError') {
        errorType = "permission";
      } else if (error.name === 'NotFoundError') {
        errorType = "not_found";
      } else if (error.name === 'NotReadableError') {
        errorType = "busy";
      }

      setCameraError(errorType);
      toast.error(`Camera access error: ${error.message}`);

      // Auto-retry for busy errors
      if (errorType === "busy" && retryCount < 3) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        retryTimeoutRef.current = setTimeout(() => {
          toast.info(`Retrying camera access... (${nextRetry}/3)`);
          startCamera();
        }, 2000);
      }
    }
  }, [retryCount]);

  const retryCamera = useCallback(() => {
    setRetryCount(0);
    startCamera();
  }, [startCamera]);

  return {
    cameraReady,
    cameraError,
    retryCount,
    stream: streamRef.current,
    startCamera,
    stopCamera,
    retryCamera,
  };
};


