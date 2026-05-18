import { useState, useRef, useCallback, useEffect } from 'react';
import faceDetectionService, { type FaceQuality } from '@/services/faceDetectionService';

// ============================================================================
// TYPES
// ============================================================================

export type ScanDetectionStatus =
  | 'loading'       // Model đang load
  | 'no_face'       // Không tìm thấy khuôn mặt
  | 'multiple_faces' // Nhiều khuôn mặt
  | 'too_far'       // Khuôn mặt quá nhỏ (xa)
  | 'too_close'     // Khuôn mặt quá lớn (gần)
  | 'not_centered'  // Khuôn mặt không ở giữa
  | 'good'          // Khuôn mặt OK, sẵn sàng chụp
  | 'error';        // Lỗi model

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScanFaceDetectionState {
  modelLoading: boolean;
  modelReady: boolean;
  modelError: boolean;
  detectionStatus: ScanDetectionStatus;
  statusMessage: string;
  faceQuality: FaceQuality | null;
  faceBoundingBox: FaceBoundingBox | null;
  consecutiveGoodFrames: number;
  canAutoCapture: boolean;
}

export interface ScanFaceDetectionActions {
  loadModel: () => Promise<void>;
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
  resetConsecutiveFrames: () => void;
  dispose: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Số frame liên tiếp face quality tốt để trigger auto-capture */
const AUTO_CAPTURE_FRAMES = 5;

/** Thời gian giữa các lần detection (ms) - tối ưu performance */
const DETECTION_INTERVAL_MS = 150;

/** Status messages tiếng Việt */
const STATUS_MESSAGES: Record<ScanDetectionStatus, string> = {
  loading: 'Đang tải mô hình nhận diện...',
  no_face: 'Không tìm thấy khuôn mặt. Hãy đưa mặt vào khung hình.',
  multiple_faces: 'Phát hiện nhiều khuôn mặt. Chỉ cho phép một người.',
  too_far: 'Khuôn mặt quá nhỏ. Hãy di chuyển lại gần hơn.',
  too_close: 'Khuôn mặt quá lớn. Hãy di chuyển ra xa hơn.',
  not_centered: 'Hãy đưa khuôn mặt vào giữa khung hình.',
  good: 'Khuôn mặt OK! Sẵn sàng chấm công.',
  error: 'Lỗi nhận diện khuôn mặt. Vui lòng tải lại trang.',
};

// ============================================================================
// HOOK
// ============================================================================

export const useScanFaceDetection = (): ScanFaceDetectionState & ScanFaceDetectionActions => {
  // State
  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<ScanDetectionStatus>('loading');
  const [statusMessage, setStatusMessage] = useState(STATUS_MESSAGES.loading);
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null);
  const [faceBoundingBox, setFaceBoundingBox] = useState<FaceBoundingBox | null>(null);
  const [consecutiveGoodFrames, setConsecutiveGoodFrames] = useState(0);
  const [canAutoCapture, setCanAutoCapture] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const consecutiveGoodRef = useRef<number>(0); // Ref for real-time tracking in loop
  const isDetectingRef = useRef<boolean>(false);

  // ---- Load Model ----
  const loadModel = useCallback(async () => {
    try {
      setModelLoading(true);
      setModelReady(false);
      setModelError(false);
      setDetectionStatus('loading');
      setStatusMessage(STATUS_MESSAGES.loading);

      await faceDetectionService.loadModel();

      setModelLoading(false);
      setModelReady(true);
      setDetectionStatus('no_face');
      setStatusMessage(STATUS_MESSAGES.no_face);
    } catch (error) {
      console.error('[ScanFaceDetection] Failed to load model:', error);
      setModelLoading(false);
      setModelError(true);
      setDetectionStatus('error');
      setStatusMessage(STATUS_MESSAGES.error);
    }
  }, []);

  // ---- Update status helper ----
  const updateStatus = useCallback((status: ScanDetectionStatus) => {
    setDetectionStatus(status);
    setStatusMessage(STATUS_MESSAGES[status]);
  }, []);

  // ---- Detection Loop ----
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !modelReady || modelError || isDetectingRef.current) {
      detectionLoopRef.current = requestAnimationFrame(runDetection);
      return;
    }

    // Throttle detection to DETECTION_INTERVAL_MS
    const now = performance.now();
    if (now - lastDetectionTimeRef.current < DETECTION_INTERVAL_MS) {
      detectionLoopRef.current = requestAnimationFrame(runDetection);
      return;
    }
    lastDetectionTimeRef.current = now;

    // Check video readiness
    if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
      detectionLoopRef.current = requestAnimationFrame(runDetection);
      return;
    }

    isDetectingRef.current = true;

    try {
      const faces = await faceDetectionService.detectFace(video);
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (faces.length === 0) {
        // No face detected
        updateStatus('no_face');
        setFaceQuality(null);
        setFaceBoundingBox(null);
        consecutiveGoodRef.current = 0;
        setConsecutiveGoodFrames(0);
        setCanAutoCapture(false);

      } else if (faces.length > 1) {
        // Multiple faces
        updateStatus('multiple_faces');
        setFaceQuality(null);
        setFaceBoundingBox(null);
        consecutiveGoodRef.current = 0;
        setConsecutiveGoodFrames(0);
        setCanAutoCapture(false);

      } else {
        // Single face detected
        const face = faces[0];
        const quality = faceDetectionService.validateFaceQuality(face, videoWidth, videoHeight);
        setFaceQuality(quality);

        // Extract bounding box
        const bbox = faceDetectionService.normalizeBoundingBox(face);
        if (bbox) {
          setFaceBoundingBox({
            x: bbox.topLeft[0],
            y: bbox.topLeft[1],
            width: bbox.bottomRight[0] - bbox.topLeft[0],
            height: bbox.bottomRight[1] - bbox.topLeft[1],
          });
        }

        // Determine detailed status
        if (!quality.isValidSize) {
          // Check if face is too small or too large
          if (bbox) {
            const faceSize = Math.max(
              bbox.bottomRight[0] - bbox.topLeft[0],
              bbox.bottomRight[1] - bbox.topLeft[1]
            );
            const minSize = Math.min(videoWidth, videoHeight) * 0.3;
            if (faceSize < minSize) {
              updateStatus('too_far');
            } else {
              updateStatus('too_close');
            }
          } else {
            updateStatus('too_far');
          }
          consecutiveGoodRef.current = 0;
          setConsecutiveGoodFrames(0);
          setCanAutoCapture(false);

        } else if (!quality.isCentered) {
          updateStatus('not_centered');
          consecutiveGoodRef.current = 0;
          setConsecutiveGoodFrames(0);
          setCanAutoCapture(false);

        } else {
          // Face is good!
          updateStatus('good');
          consecutiveGoodRef.current += 1;
          const currentGood = consecutiveGoodRef.current;
          setConsecutiveGoodFrames(currentGood);

          if (currentGood >= AUTO_CAPTURE_FRAMES) {
            setCanAutoCapture(true);
          }
        }
      }
    } catch (error) {
      // Don't spam errors - just continue detection loop
    } finally {
      isDetectingRef.current = false;
    }

    // Continue loop
    if (modelReady && !modelError) {
      detectionLoopRef.current = requestAnimationFrame(runDetection);
    }
  }, [modelReady, modelError, updateStatus]);

  // ---- Start Detection ----
  const startDetection = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;

    // Cancel existing loop
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
    }

    // Reset state
    consecutiveGoodRef.current = 0;
    setConsecutiveGoodFrames(0);
    setCanAutoCapture(false);

    // Start loop
    detectionLoopRef.current = requestAnimationFrame(runDetection);
  }, [runDetection]);

  // ---- Stop Detection ----
  const stopDetection = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    videoRef.current = null;
    isDetectingRef.current = false;
  }, []);

  // ---- Reset Consecutive Frames ----
  const resetConsecutiveFrames = useCallback(() => {
    consecutiveGoodRef.current = 0;
    setConsecutiveGoodFrames(0);
    setCanAutoCapture(false);
  }, []);

  // ---- Dispose ----
  const dispose = useCallback(() => {
    stopDetection();
    // Don't dispose the singleton service - it may be used elsewhere
  }, [stopDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    // State
    modelLoading,
    modelReady,
    modelError,
    detectionStatus,
    statusMessage,
    faceQuality,
    faceBoundingBox,
    consecutiveGoodFrames,
    canAutoCapture,
    // Actions
    loadModel,
    startDetection,
    stopDetection,
    resetConsecutiveFrames,
    dispose,
  };
};

export default useScanFaceDetection;
