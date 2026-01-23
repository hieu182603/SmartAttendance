import { useState, useRef, useCallback, useEffect } from 'react';
import faceDetectionService, { type FaceQuality, type FacePosition } from '@/services/faceDetectionService';

export type FaceDetectionStatus = "loading" | "detecting" | "good" | "warning" | "error" | "none";
export type { FaceQuality, FacePosition };

export interface FaceDetectionState {
  modelLoading: boolean;
  modelReady: boolean;
  modelError: boolean;
  faceQuality: FaceQuality | null;
  facePosition: FacePosition | null;
  detectionConfidence: number;
  detectionStatus: FaceDetectionStatus;
  statusMessage: string;
  multipleFaces: boolean;
  maskColor: "good" | "warning" | "error";
}

export interface FaceDetectionActions {
  loadModel: () => Promise<void>;
  startDetection: (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  stopDetection: () => void;
  dispose: () => void;
}

export const useFaceDetection = (): FaceDetectionState & FaceDetectionActions => {
  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null);
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [detectionStatus, setDetectionStatus] = useState<FaceDetectionStatus>("loading");
  const [statusMessage, setStatusMessage] = useState<string>("Loading...");
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [maskColor, setMaskColor] = useState<"good" | "warning" | "error">("error");

  const animationFrameRef = useRef<number | null>(null);
  const currentVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadModel = useCallback(async () => {
    try {
      setModelLoading(true);
      setModelReady(false);
      setModelError(false);
      await faceDetectionService.loadModel();
      setModelLoading(false);
      setModelReady(true);
      setModelError(false);
      setDetectionStatus("detecting");
    } catch (error) {
      console.error("Failed to load face detection model:", error);
      setModelLoading(false);
      setModelReady(false);
      setModelError(true);
      setDetectionStatus("error");
      throw error;
    }
  }, []);

  const detectFaces = useCallback(async () => {
    if (!currentVideoRef.current || !currentCanvasRef.current || !modelReady || modelError) {
      return;
    }

    const video = currentVideoRef.current;
    const canvas = currentCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check video readiness
    if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    try {
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Detect faces
      const faces = await faceDetectionService.detectFace(video);

      if (faces.length === 0) {
        setFaceQuality(null);
        setFacePosition(null);
        setDetectionConfidence(0);
        setMultipleFaces(false);
        setDetectionStatus("none");
        setMaskColor("error");
      } else if (faces.length > 1) {
        setMultipleFaces(true);
        setDetectionConfidence(0);
        setDetectionStatus("error");
        setMaskColor("error");
      } else {
        // Single face detected
        setMultipleFaces(false);
        const face = faces[0];
        const confidence = (face as any).score ?? 0.95;
        setDetectionConfidence(confidence);

        const quality = faceDetectionService.validateFaceQuality(
          face, canvas.width, canvas.height
        );
        const position = faceDetectionService.getFacePosition(
          face, canvas.width, canvas.height
        );

        setFaceQuality(quality);
        setFacePosition(position);

        // Determine status
        let status: FaceDetectionStatus = "good";
        let maskStatus: "good" | "warning" | "error" = "good";

        if (!quality.isCentered) {
          status = "warning";
          maskStatus = "warning";
        } else if (!quality.isValidSize) {
          status = "warning";
          maskStatus = "warning";
        }

        setDetectionStatus(status);
        setMaskColor(maskStatus);
      }
    } catch (error) {
      console.error("Face detection error:", error);
      setDetectionStatus("error");
    }

    if (modelReady && !modelError) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
    }
  }, [modelReady, modelError]);

  const startDetection = useCallback((videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
    if (!modelReady || modelError) return;

    currentVideoRef.current = videoElement;
    currentCanvasRef.current = canvasElement;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaces);
  }, [modelReady, modelError, detectFaces]);

  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (currentCanvasRef.current) {
      const ctx = currentCanvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, currentCanvasRef.current.width, currentCanvasRef.current.height);
      }
    }
  }, []);

  const dispose = useCallback(() => {
    stopDetection();
    faceDetectionService.dispose();
  }, [stopDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    modelLoading,
    modelReady,
    modelError,
    faceQuality,
    facePosition,
    detectionConfidence,
    detectionStatus,
    statusMessage,
    multipleFaces,
    maskColor,
    loadModel,
    startDetection,
    stopDetection,
    dispose,
  };
};
