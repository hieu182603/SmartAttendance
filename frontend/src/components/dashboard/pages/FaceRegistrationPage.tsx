import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle2, X, RotateCcw, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { faceService } from "@/services/faceService";
import faceDetectionService, {
  type FaceQuality,
  type FacePosition,
} from "@/services/faceDetectionService";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

// Face registration image limits - must match backend config (FACE_RECOGNITION_CONFIG.MIN/MAX_REGISTRATION_IMAGES)
// These values should be kept in sync with backend/src/config/app.config.js
const MIN_IMAGES = parseInt(import.meta.env.VITE_MIN_REGISTRATION_IMAGES || "5", 10);
const MAX_IMAGES = parseInt(import.meta.env.VITE_MAX_REGISTRATION_IMAGES || "10", 10);
const MIN_QUALITY_SCORE = 0.7; // Minimum quality score threshold
const AUTO_CAPTURE_DELAY = 500; // Delay before auto-capture (ms)

type FaceDetectionStatus = "loading" | "detecting" | "good" | "warning" | "error" | "none";
type ProgressStep = "detecting" | "aligning" | "capturing" | "completed";

// Captured image with metadata
interface CapturedImage {
  dataURL: string;
  qualityScore: number;
  detectionConfidence: number;
  timestamp: number;
}

const FaceRegistrationPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);
  const navigate = useNavigate();

  // Progress milestones
  const PROGRESS_STEPS: { key: ProgressStep; label: string; threshold: number }[] = [
    { key: "detecting", label: t("dashboard:faceRegistration.progress.detecting"), threshold: 0 },
    { key: "aligning", label: t("dashboard:faceRegistration.progress.aligning"), threshold: 30 },
    { key: "capturing", label: t("dashboard:faceRegistration.progress.capturing"), threshold: 60 },
    { key: "completed", label: t("dashboard:faceRegistration.progress.completed"), threshold: 90 },
  ];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const viVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastVoiceMessageRef = useRef<string>("");
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentStepRef = useRef<ProgressStep>("detecting");

  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoCapturedRef = useRef<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null);
  const [facePosition, setFacePosition] = useState<FacePosition | null>(null);
  const [faceDetectionConfidence, setFaceDetectionConfidence] = useState<number>(0);
  const [detectionStatus, setDetectionStatus] = useState<FaceDetectionStatus>("loading");
  const [statusMessage, setStatusMessage] = useState<string>(t("dashboard:faceRegistration.status.loading"));
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<ProgressStep>("detecting");
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [maskColor, setMaskColor] = useState<"good" | "warning" | "error">("error");

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;

      // Get Vietnamese voice
      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return;

        viVoiceRef.current =
          voices.find((v) => v.lang.toLowerCase().startsWith("vi")) ||
          voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
          voices[0];
      };

      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    } else {
      setVoiceEnabled(false);
    }

    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  // Load face detection model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      try {
        setModelLoading(true);
        setModelReady(false);
        setModelError(false);
        setStatusMessage(t("dashboard:faceRegistration.status.loadingModel"));
        speakMessage(t("dashboard:faceRegistration.voice.loadingSystem"));
        await faceDetectionService.loadModel();
        if (isMounted) {
          setModelLoading(false);
          setModelReady(true);
          setModelError(false);
          setStatusMessage(t("dashboard:faceRegistration.status.positionFace"));
          setDetectionStatus("detecting");
          speakMessage(t("dashboard:faceRegistration.voice.positionFace"));
        }
      } catch (error) {
        console.error("Failed to load face detection model:", error);
        if (isMounted) {
          setModelLoading(false);
          setModelReady(false);
          setModelError(true);
          setDetectionStatus("error");
          setStatusMessage(t("dashboard:faceRegistration.errors.modelLoadFailed"));
          toast.error(t("dashboard:faceRegistration.errors.modelLoadFailed"));
          stopFaceDetection();
        }
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      stopFaceDetection();
      faceDetectionService.dispose();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Start camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      stopFaceDetection();
    };
  }, []);

  // Keep currentStepRef in sync with currentStep state
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Start face detection when camera and model are ready
  useEffect(() => {
    if (cameraReady && modelReady && !modelError && videoRef.current) {
      startFaceDetection();
    } else if (modelError) {
      // Stop detection if model failed to load
      stopFaceDetection();
    }
    return () => {
      stopFaceDetection();
    };
  }, [cameraReady, modelReady, modelError]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
      }
    } catch (error) {
      toast.error(t("dashboard:faceRegistration.errors.cameraAccess"));
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  // Voice feedback function
  const speakMessage = useCallback((text: string) => {
    if (!voiceEnabled || !speechSynthesisRef.current || isSpeaking) return;

    try {
      speechSynthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      if (viVoiceRef.current) {
        utterance.voice = viVoiceRef.current;
        utterance.lang = viVoiceRef.current.lang;
      }

      setIsSpeaking(true);
      lastVoiceMessageRef.current = text;

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      speechSynthesisRef.current.speak(utterance);
    } catch (error) {
      console.warn("Speech synthesis error:", error);
      setIsSpeaking(false);
    }
  }, [voiceEnabled, isSpeaking]);

  const toggleVoice = () => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);

    if (!newVoiceEnabled && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    } else if (newVoiceEnabled) {
      speakMessage(t("dashboard:faceRegistration.voice.voiceEnabled"));
    }
  };

  // Progress management
  const resetProgress = useCallback(() => {
    setProgress(0);
    setCurrentStep("detecting");
    currentStepRef.current = "detecting";
    hasAutoCapturedRef.current = false; // Reset auto-capture flag
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current);
      autoCaptureTimeoutRef.current = null;
    }
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const increaseProgress = useCallback(() => {
    setProgress((prev) => {
      const newProgress = Math.min(prev + 1, 100);

      // Stop progress tracking when reaching 100%
      if (newProgress === 100) {
        stopProgressTracking();
        return 100;
      }

      // Update current step based on progress
      const step = PROGRESS_STEPS.find(
        (s, idx) =>
          newProgress >= s.threshold &&
          (idx === PROGRESS_STEPS.length - 1 || newProgress < PROGRESS_STEPS[idx + 1].threshold)
      );

      // Use ref to avoid stale closure issue
      if (step && step.key !== currentStepRef.current) {
        setCurrentStep(step.key);

        // Voice feedback for milestones
        if (step.key === "aligning") {
          speakMessage(t("dashboard:faceRegistration.voice.aligning"));
        } else if (step.key === "capturing") {
          speakMessage(t("dashboard:faceRegistration.voice.capturing"));
        } else if (step.key === "completed" && newProgress === 100) {
          speakMessage(t("dashboard:faceRegistration.voice.completed"));
        }
      }

      return newProgress;
    });
  }, [speakMessage, stopProgressTracking]);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) return;

    progressIntervalRef.current = setInterval(() => {
      increaseProgress();
    }, 100);
  }, [increaseProgress]);

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    // Don't start if model is not ready or has error
    if (!modelReady || modelError) {
      stopFaceDetection();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Error counter for consecutive errors
    let errorCount = 0;
    const MAX_CONSECUTIVE_ERRORS = 10;
    let lastDetectionTime = 0;
    const DETECTION_THROTTLE_MS = 100; // Throttle to every 100ms

    const detectFaces = async () => {
      // Stop detection if model error occurred
      if (modelError) {
        stopFaceDetection();
        return;
      }

      // Verify video is ready (readyState === 4 means HAVE_ENOUGH_DATA)
      // Also check that video has valid dimensions
      if (
        !video ||
        !canvas ||
        !ctx ||
        video.readyState !== 4 ||
        !modelReady ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        animationFrameRef.current = requestAnimationFrame(detectFaces);
        return;
      }

      // Throttle detection to every 100ms
      const now = Date.now();
      if (now - lastDetectionTime < DETECTION_THROTTLE_MS) {
        animationFrameRef.current = requestAnimationFrame(detectFaces);
        return;
      }
      lastDetectionTime = now;

      try {
        // Set canvas size to match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Detect faces
        const faces = await faceDetectionService.detectFace(video);

        // Reset error counter on successful detection
        errorCount = 0;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faces.length === 0) {
          setFaceQuality(null);
          setFacePosition(null);
          setFaceDetectionConfidence(0);
          setMultipleFaces(false);
          setDetectionStatus("none");
          setMaskColor("error");
          setStatusMessage(t("dashboard:faceRegistration.status.noFaceDetected"));
          resetProgress();
          stopProgressTracking();
          if (lastVoiceMessageRef.current !== t("dashboard:faceRegistration.voice.positionFace")) {
            speakMessage(t("dashboard:faceRegistration.voice.positionFace"));
          }
        } else if (faces.length > 1) {
          // Multiple faces detected
          setMultipleFaces(true);
          setFaceDetectionConfidence(0);
          setDetectionStatus("error");
          setMaskColor("error");
          setStatusMessage(t("dashboard:faceRegistration.status.multipleFaces"));
          resetProgress();
          stopProgressTracking();

          // Draw bounding boxes for all faces in red
          faces.forEach((face) => {
            drawBoundingBox(ctx, face, canvas.width, canvas.height, "error");
          });

          if (lastVoiceMessageRef.current !== t("dashboard:faceRegistration.voice.multipleFaces")) {
            speakMessage(t("dashboard:faceRegistration.voice.multipleFaces"));
          }
        } else {
          // Single face detected
          setMultipleFaces(false);
          const face = faces[0];

          // Capture detection confidence from the face detection result
          // face.score represents the confidence that a face was detected (0-1)
          const detectionConfidence = (face as any).score ?? 0.95; // Default to 0.95 if score not available
          setFaceDetectionConfidence(detectionConfidence);

          const quality = faceDetectionService.validateFaceQuality(
            face,
            canvas.width,
            canvas.height
          );
          const position = faceDetectionService.getFacePosition(
            face,
            canvas.width,
            canvas.height
          );

          setFaceQuality(quality);
          setFacePosition(position);

          // Determine status and message
          let status: FaceDetectionStatus = "good";
          let message = t("dashboard:faceRegistration.status.faceInGoodPosition");
          let voiceMessage = "";
          let maskStatus: "good" | "warning" | "error" = "good";

          if (!quality.isFullFace) {
            status = "error";
            maskStatus = "error";
            message = t("dashboard:faceRegistration.status.showFullFace");
            voiceMessage = t("dashboard:faceRegistration.voice.showFullFace");
            resetProgress();
            stopProgressTracking();
          } else if (!quality.isNotCovered) {
            status = "error";
            maskStatus = "error";
            message = t("dashboard:faceRegistration.status.faceCovered");
            voiceMessage = t("dashboard:faceRegistration.voice.faceCovered");
            resetProgress();
            stopProgressTracking();
          } else if (!quality.isCentered) {
            status = "warning";
            maskStatus = "warning";
            message = t("dashboard:faceRegistration.status.lookStraight");
            voiceMessage = t("dashboard:faceRegistration.voice.centerFace");
            resetProgress();
            stopProgressTracking();
          } else if (!quality.isValidSize) {
            status = "warning";
            maskStatus = "warning";
            if (position) {
              const faceSize = Math.max(position.width, position.height);
              const minSize = Math.min(canvas.width, canvas.height) * 0.3;
              if (faceSize < minSize) {
                message = t("dashboard:faceRegistration.status.moveCloser");
                voiceMessage = t("dashboard:faceRegistration.voice.moveCloser");
              } else {
                message = t("dashboard:faceRegistration.status.moveAway");
                voiceMessage = t("dashboard:faceRegistration.voice.moveAway");
              }
            }
            resetProgress();
            stopProgressTracking();
          } else {
            status = "good";
            maskStatus = "good";
            message = t("dashboard:faceRegistration.status.holdPosition");
            // Start progress tracking when face is in good position
            if (progress === 0) {
              startProgressTracking();
              if (lastVoiceMessageRef.current !== t("dashboard:faceRegistration.voice.holdPosition")) {
                speakMessage(t("dashboard:faceRegistration.voice.holdPositionGood"));
              }
            }
          }

          setDetectionStatus(status);
          setStatusMessage(message);
          setMaskColor(maskStatus);

          // Voice feedback for warnings
          if (voiceMessage && voiceMessage !== lastVoiceMessageRef.current && !isSpeaking) {
            speakMessage(voiceMessage);
          }

          // Draw face overlay
          drawFaceOverlay(ctx, face, quality, canvas.width, canvas.height, maskStatus);
        }
      } catch (error) {
        // Only count actual detection errors, not video readiness errors
        const isVideoNotReady = error instanceof Error && error.message.includes("Video chưa sẵn sàng");
        const isModelError = error instanceof Error && error.message.includes("Model");

        if (!isVideoNotReady) {
          // Increment error counter only for actual detection errors
          errorCount++;

          // If too many consecutive errors, stop RAF loop and show message
          if (errorCount > MAX_CONSECUTIVE_ERRORS) {
            console.error("Face detection failed after multiple attempts. Stopping detection loop.");
            stopFaceDetection();
            setDetectionStatus("error");
            setStatusMessage(t("dashboard:faceRegistration.errors.detectionFailed"));
            toast.error(t("dashboard:faceRegistration.errors.detectionFailed"));
            return;
          }

          // Log error but don't spam console (only log every 10th error)
          if (errorCount % 10 === 0) {
            console.error("Face detection error (attempt", errorCount, "):", error);
          }
        } else {
          // Reset error counter if it's just video not ready (not a real error)
          errorCount = Math.max(0, errorCount - 1);
        }

        // Stop detection on error if it's a model-related error
        if (isModelError) {
          stopFaceDetection();
          return;
        }
      }

      // Only continue if model is still ready and error count is acceptable
      if (modelReady && !modelError && errorCount <= MAX_CONSECUTIVE_ERRORS) {
        animationFrameRef.current = requestAnimationFrame(detectFaces);
      }
    };

    animationFrameRef.current = requestAnimationFrame(detectFaces);
  };

  const stopFaceDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const drawBoundingBox = (
    ctx: CanvasRenderingContext2D,
    face: faceLandmarksDetection.Face,
    width: number,
    height: number,
    status: "good" | "warning" | "error"
  ) => {
    const boundingBox = faceDetectionService.normalizeBoundingBox(face);
    if (!boundingBox) return;

    const x = boundingBox.topLeft[0];
    const y = boundingBox.topLeft[1];
    const w = boundingBox.bottomRight[0] - x;
    const h = boundingBox.bottomRight[1] - y;
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // Standard colors - green, yellow, red
    let primaryColor = "#10b981"; // green
    let secondaryColor = "#34d399"; // lighter green
    let scanLineColor = "rgba(52, 211, 153, 0.8)";

    if (status === "warning") {
      primaryColor = "#f59e0b"; // yellow/amber
      secondaryColor = "#fbbf24";
      scanLineColor = "rgba(251, 191, 36, 0.7)";
    } else if (status === "error") {
      primaryColor = "#ef4444"; // red
      secondaryColor = "#f87171";
      scanLineColor = "rgba(248, 113, 113, 0.7)";
    }

    // Draw simple rounded rectangle bounding box
    const cornerRadius = 12; // Fixed corner radius, simpler
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + w - cornerRadius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
    ctx.lineTo(x + w, y + h - cornerRadius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
    ctx.lineTo(x + cornerRadius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = status === "good" ? 3 : 2.5;
    ctx.stroke();
    ctx.restore();

    // Draw scanning line animation
    if (status === "good") {
      const scanSpeed = 2000; // 2 seconds for full scan
      const scanProgress = (Date.now() % scanSpeed) / scanSpeed;
      const scanY = y + h * scanProgress;
      const scanHeight = h * 0.12; // 12% of height

      ctx.save();
      // Simple scan line with gradient
      const scanGradient = ctx.createLinearGradient(centerX, scanY - scanHeight / 2, centerX, scanY + scanHeight / 2);
      scanGradient.addColorStop(0, "rgba(52, 211, 153, 0)");
      scanGradient.addColorStop(0.5, scanLineColor);
      scanGradient.addColorStop(1, "rgba(52, 211, 153, 0)");

      ctx.fillStyle = scanGradient;
      ctx.beginPath();
      ctx.moveTo(x + cornerRadius * 0.5, scanY - scanHeight / 2);
      ctx.lineTo(x + w - cornerRadius * 0.5, scanY - scanHeight / 2);
      ctx.lineTo(x + w - cornerRadius * 0.5, scanY + scanHeight / 2);
      ctx.lineTo(x + cornerRadius * 0.5, scanY + scanHeight / 2);
      ctx.closePath();
      ctx.fill();

      // Scan line
      ctx.strokeStyle = scanLineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + cornerRadius * 0.5, scanY);
      ctx.lineTo(x + w - cornerRadius * 0.5, scanY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw simple corner indicators
    const cornerLength = 20;

    ctx.save();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + cornerRadius + cornerLength, y);
    ctx.moveTo(x, y + cornerRadius);
    ctx.lineTo(x, y + cornerRadius + cornerLength);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + w - cornerRadius, y);
    ctx.lineTo(x + w - cornerRadius - cornerLength, y);
    ctx.moveTo(x + w, y + cornerRadius);
    ctx.lineTo(x + w, y + cornerRadius + cornerLength);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y + h);
    ctx.lineTo(x + cornerRadius + cornerLength, y + h);
    ctx.moveTo(x, y + h - cornerRadius);
    ctx.lineTo(x, y + h - cornerRadius - cornerLength);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + w - cornerRadius, y + h);
    ctx.lineTo(x + w - cornerRadius - cornerLength, y + h);
    ctx.moveTo(x + w, y + h - cornerRadius);
    ctx.lineTo(x + w, y + h - cornerRadius - cornerLength);
    ctx.stroke();

    ctx.restore();

    // Draw landmark points around face
    if (status === "good" && face.keypoints && face.keypoints.length > 0) {
      ctx.save();
      ctx.fillStyle = secondaryColor;
      const landmarkSize = 2;

      // Draw key landmarks (eyes, nose, mouth corners)
      const keyIndices = [33, 133, 362, 263, 1, 2, 98, 327, 13, 14, 78, 308]; // eyes, nose, mouth

      keyIndices.forEach((idx) => {
        const landmark = face.keypoints[idx];
        if (landmark) {
          // Handle both v1 and v2 API formats
          const landmarkX = (landmark as any).x ?? (landmark as any)[0];
          const landmarkY = (landmark as any).y ?? (landmark as any)[1];

          if (landmarkX !== undefined && landmarkY !== undefined) {
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(landmarkX, landmarkY, landmarkSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      ctx.restore();
    }
  };

  const drawFaceOverlay = (
    ctx: CanvasRenderingContext2D,
    face: faceLandmarksDetection.Face,
    quality: FaceQuality,
    width: number,
    height: number,
    maskStatus: "good" | "warning" | "error" = "error"
  ) => {
    const boundingBox = faceDetectionService.normalizeBoundingBox(face);
    if (!boundingBox) return;

    // Standard colors - green, yellow, red
    let primaryColor = "#10b981"; // green
    let secondaryColor = "#34d399"; // lighter green
    let maskColor = "rgba(16, 185, 129, 0.1)"; // green with opacity
    let glowColor = "rgba(16, 185, 129, 0.3)";
    let status: "good" | "warning" | "error" = maskStatus;

    if (maskStatus === "error") {
      primaryColor = "#ef4444"; // red
      secondaryColor = "#f87171";
      maskColor = "rgba(239, 68, 68, 0.12)";
      glowColor = "rgba(239, 68, 68, 0.3)";
    } else if (maskStatus === "warning") {
      primaryColor = "#f59e0b"; // yellow/amber
      secondaryColor = "#fbbf24";
      maskColor = "rgba(245, 158, 11, 0.12)";
      glowColor = "rgba(245, 158, 11, 0.3)";
    }

    // Draw bounding box
    drawBoundingBox(ctx, face, width, height, status);

    // Calculate face center and dimensions
    const centerX = (boundingBox.topLeft[0] + boundingBox.bottomRight[0]) / 2;
    const centerY = (boundingBox.topLeft[1] + boundingBox.bottomRight[1]) / 2;
    const faceWidth = boundingBox.bottomRight[0] - boundingBox.topLeft[0];
    const faceHeight = boundingBox.bottomRight[1] - boundingBox.topLeft[1];
    const x = boundingBox.topLeft[0];
    const y = boundingBox.topLeft[1];
    const w = faceWidth;
    const h = faceHeight;
    const cornerRadius = 12;

    // Draw rectangular overlay (everything except bounding box area)
    ctx.save();
    ctx.fillStyle = maskColor;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";

    // Cut out the bounding box area
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + w - cornerRadius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
    ctx.lineTo(x + w, y + h - cornerRadius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
    ctx.lineTo(x + cornerRadius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw enhanced center guide (crosshair) when good
    if (maskStatus === "good" && quality.isCentered && quality.isValidSize && quality.isFullFace) {
      ctx.save();

      // Outer glow for crosshair
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 8;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - Math.min(w, h) * 0.15, centerY);
      ctx.lineTo(centerX + Math.min(w, h) * 0.15, centerY);
      ctx.stroke();
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - Math.min(w, h) * 0.15);
      ctx.lineTo(centerX, centerY + Math.min(w, h) * 0.15);
      ctx.stroke();

      ctx.restore();

      // Main crosshair
      ctx.save();
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 5;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - Math.min(w, h) * 0.12, centerY);
      ctx.lineTo(centerX + Math.min(w, h) * 0.12, centerY);
      ctx.stroke();
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - Math.min(w, h) * 0.12);
      ctx.lineTo(centerX, centerY + Math.min(w, h) * 0.12);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Draw quality indicator dots around bounding box corners for good status
    if (maskStatus === "good") {
      ctx.save();
      ctx.fillStyle = secondaryColor;
      const dotRadius = 2.5;
      const padding = 8;

      // Draw dots at corners of bounding box
      const corners = [
        { x: x + cornerRadius, y: y }, // Top-left
        { x: x + w - cornerRadius, y: y }, // Top-right
        { x: x + w, y: y + cornerRadius }, // Top-right vertical
        { x: x + w, y: y + h - cornerRadius }, // Bottom-right vertical
        { x: x + w - cornerRadius, y: y + h }, // Bottom-right
        { x: x + cornerRadius, y: y + h }, // Bottom-left
        { x: x, y: y + h - cornerRadius }, // Bottom-left vertical
        { x: x, y: y + cornerRadius }, // Top-left vertical
      ];

      corners.forEach((corner) => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }
  };

  const capturePhoto = useCallback((): CapturedImage | null => {
    if (!videoRef.current || !cameraReady) return null;

    // Strict pre-validation: check all conditions before allowing capture
    if (!faceQuality || multipleFaces) {
      return null;
    }

    // Check all quality requirements
    if (!faceQuality.isFullFace || !faceQuality.isNotCovered || !faceQuality.isCentered || !faceQuality.isValidSize) {
      return null;
    }

    // Check quality score threshold
    if (faceQuality.score < MIN_QUALITY_SCORE) {
      return null;
    }

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    const dataURL = canvas.toDataURL("image/jpeg", 0.8);
    // Use the actual detection confidence from the face detection result, not the quality score
    const detectionConfidence = faceDetectionConfidence;

    return {
      dataURL,
      qualityScore: faceQuality.score,
      detectionConfidence,
      timestamp: Date.now(),
    };
  }, [cameraReady, faceQuality, faceDetectionConfidence, multipleFaces]);

  const handleAutoCapture = useCallback(() => {
    if (isCapturing) {
      return;
    }

    // Use current state values via refs or direct access
    // We'll check conditions in the effect that triggers auto-capture
    setIsCapturing(true);
    resetProgress();
    stopProgressTracking();
    speakMessage(t("dashboard:faceRegistration.voice.autoCapturing"));

    const photo = capturePhoto();
    if (photo) {
      setCapturedImages((prev) => {
        if (prev.length >= MAX_IMAGES) {
          return prev;
        }
        const newImages = [...prev, photo];
        toast.success(t("dashboard:faceRegistration.toasts.autoCaptureSuccess", {
          current: newImages.length,
          max: MAX_IMAGES,
          quality: Math.round(photo.qualityScore * 100)
        }));
        speakMessage(t("dashboard:faceRegistration.voice.captureSuccess", { count: newImages.length }));
        return newImages;
      });
    } else {
      toast.warning(t("dashboard:faceRegistration.errors.autoCaptureFailed"));
    }
    setIsCapturing(false);
  }, [isCapturing, capturePhoto, resetProgress, stopProgressTracking, speakMessage]);

  const handleCapture = () => {
    if (capturedImages.length >= MAX_IMAGES) {
      toast.warning(t("dashboard:faceRegistration.errors.maxImagesReached", { max: MAX_IMAGES }));
      return;
    }

    // Strict pre-validation
    if (!faceQuality || multipleFaces) {
      toast.error(t("dashboard:faceRegistration.errors.waitForGoodPosition"));
      speakMessage(t("dashboard:faceRegistration.voice.waitForGoodPosition"));
      return;
    }

    if (!faceQuality.isFullFace || !faceQuality.isNotCovered || !faceQuality.isCentered || !faceQuality.isValidSize) {
      toast.error(t("dashboard:faceRegistration.errors.faceNotReady"));
      speakMessage(t("dashboard:faceRegistration.voice.faceNotReady"));
      return;
    }

    if (faceQuality.score < MIN_QUALITY_SCORE) {
      toast.error(t("dashboard:faceRegistration.errors.lowQuality", { quality: Math.round(faceQuality.score * 100) }));
      speakMessage(t("dashboard:faceRegistration.voice.lowQuality"));
      return;
    }

    setIsCapturing(true);
    resetProgress();
    stopProgressTracking();
    speakMessage(t("dashboard:faceRegistration.voice.capturing"));

    const photo = capturePhoto();
    if (photo) {
      setCapturedImages((prev) => [...prev, photo]);
      toast.success(t("dashboard:faceRegistration.toasts.captureSuccess", {
        current: capturedImages.length + 1,
        max: MAX_IMAGES,
        quality: Math.round(photo.qualityScore * 100)
      }));
      speakMessage(t("dashboard:faceRegistration.voice.captureSuccess", { count: capturedImages.length + 1 }));
    } else {
      toast.error(t("dashboard:faceRegistration.errors.captureFailed"));
    }
    setIsCapturing(false);
  };

  const handleRemove = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-capture when progress reaches 100% and conditions are met
  useEffect(() => {
    if (
      progress === 100 &&
      !hasAutoCapturedRef.current &&
      !isCapturing &&
      faceQuality?.isGoodQuality &&
      !multipleFaces &&
      capturedImages.length < MAX_IMAGES &&
      faceQuality.isFullFace &&
      faceQuality.isNotCovered &&
      faceQuality.isCentered &&
      faceQuality.isValidSize &&
      faceQuality.score >= MIN_QUALITY_SCORE
    ) {
      // Clear any existing timeout
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }

      // Set auto-capture with delay
      autoCaptureTimeoutRef.current = setTimeout(() => {
        handleAutoCapture();
        hasAutoCapturedRef.current = true;
      }, AUTO_CAPTURE_DELAY);
    }

    // Reset auto-capture flag when progress resets
    if (progress === 0) {
      hasAutoCapturedRef.current = false;
    }

    return () => {
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
  }, [progress, isCapturing, faceQuality, multipleFaces, capturedImages.length, handleAutoCapture]);

  // Auto-remove low quality images when new images are added
  useEffect(() => {
    const lowQualityImages = capturedImages.filter(
      (img) => img.qualityScore < MIN_QUALITY_SCORE
    );

    if (lowQualityImages.length > 0) {
      setCapturedImages((prev) => {
        const filtered = prev.filter((img) => img.qualityScore >= MIN_QUALITY_SCORE);

        // Only show toast if images were actually removed
        if (filtered.length < prev.length) {
          const removedCount = prev.length - filtered.length;
          toast.warning(
            t("dashboard:faceRegistration.toasts.lowQualityRemoved", { count: removedCount }),
            { duration: 5000 }
          );
          speakMessage(t("dashboard:faceRegistration.voice.lowQualityRemoved", { count: removedCount }));
        }

        return filtered;
      });
    }
  }, [capturedImages.length]); // Only trigger when count changes

  const dataURLtoFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSubmit = async () => {
    if (capturedImages.length < MIN_IMAGES) {
      toast.error(t("dashboard:faceRegistration.errors.minImagesRequired", { min: MIN_IMAGES }));
      return;
    }

    // Filter out low quality images before submit
    const validImages = capturedImages.filter(
      (img) => img.qualityScore >= MIN_QUALITY_SCORE
    );

    if (validImages.length < MIN_IMAGES) {
      toast.error(
        t("dashboard:faceRegistration.errors.insufficientQualityImages", {
          current: validImages.length,
          min: MIN_IMAGES,
          needed: MIN_IMAGES - validImages.length
        })
      );
      return;
    }

    setIsUploading(true);
    try {
      const files = validImages.map((img, idx) =>
        dataURLtoFile(img.dataURL, `face-${idx + 1}.jpg`)
      );

      // Prepare metadata for each image
      const metadata = validImages.map((img) => ({
        qualityScore: img.qualityScore,
        detectionConfidence: img.detectionConfidence,
        timestamp: img.timestamp,
      }));

      await faceService.registerFace(files, metadata);
      toast.success(t("dashboard:faceRegistration.success.registrationSuccess"));
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dashboard:faceRegistration.errors.registrationFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  // Get status color class
  const getStatusColor = (status: FaceDetectionStatus): string => {
    switch (status) {
      case "good":
        return "text-green-500";
      case "warning":
        return "text-amber-500";
      case "error":
        return "text-red-500";
      case "loading":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const canCapture = faceQuality?.isGoodQuality && !multipleFaces && cameraReady && modelReady && !modelError && progress >= 100;

  // Cleanup auto-capture timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
    };
  }, []);

  // Get current progress step label
  const getCurrentStepLabel = () => {
    return PROGRESS_STEPS.find((s) => s.key === currentStep)?.label || t("dashboard:faceRegistration.progress.detecting");
  };

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("dashboard:faceRegistration.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t("dashboard:faceRegistration.description", { min: MIN_IMAGES, max: MAX_IMAGES })}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleVoice}
            className={voiceEnabled ? "text-cyan-500" : "text-gray-500"}
            title={voiceEnabled ? t("dashboard:faceRegistration.buttons.toggleVoiceOff") : t("dashboard:faceRegistration.buttons.toggleVoiceOn")}
          >
            {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Camera Preview with Overlay - Left Column (2/3 width on desktop) */}
            <div className="lg:col-span-2">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Canvas overlay for face detection visualization */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: "cover" }}
                />

                {/* Status indicator overlay - shown when face is detected */}
                {faceQuality && (
                  <div
                    className={`absolute top-4 right-4 px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-500 ${maskColor === "good"
                      ? "bg-green-500/20 border border-green-500/50 text-green-400"
                      : maskColor === "warning"
                        ? "bg-amber-500/20 border border-amber-500/50 text-amber-400"
                        : "bg-red-500/20 border border-red-500/50 text-red-400"
                      }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {maskColor === "good" && <CheckCircle2 className="h-4 w-4" />}
                      {(maskColor === "warning" || maskColor === "error") && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span>{getCurrentStepLabel()}</span>
                    </div>
                  </div>
                )}

                {(!cameraReady || modelLoading) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 text-white">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-cyan-500" />
                      <p className="text-sm">
                        {modelLoading ? t("dashboard:faceRegistration.status.loadingModel") : t("dashboard:faceRegistration.status.startingCamera")}
                      </p>
                    </div>
                  </div>
                )}
                {modelError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 text-white">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-500">
                        {t("dashboard:faceRegistration.errors.modelLoadFailed")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Face Detection Status */}
              <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  {detectionStatus === "good" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {detectionStatus === "warning" && <AlertCircle className="h-5 w-5 text-amber-500" />}
                  {detectionStatus === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {(detectionStatus === "loading" || detectionStatus === "none") && (
                    <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                  )}
                  <p className={`text-sm font-medium transition-colors duration-300 ${getStatusColor(detectionStatus)}`}>
                    {statusMessage}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{getCurrentStepLabel()}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ease-out rounded-full ${maskColor === "good"
                        ? "bg-gradient-to-r from-cyan-500 to-green-500"
                        : maskColor === "warning"
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : "bg-gradient-to-r from-red-400 to-red-500"
                        }`}
                      style={{ width: `${progress}%` }}
                    >
                      <div className="h-full w-full bg-white/30 animate-pulse"></div>
                    </div>
                  </div>

                  {/* Progress Milestones */}
                  <div className="flex justify-between mt-2 relative">
                    {PROGRESS_STEPS.map((step, idx) => (
                      <div
                        key={step.key}
                        className={`flex flex-col items-center transition-all duration-300 ${progress >= step.threshold
                          ? "text-cyan-500 scale-110"
                          : "text-gray-500"
                          }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${progress >= step.threshold
                            ? "bg-cyan-500 shadow-lg shadow-cyan-500/50"
                            : "bg-gray-600"
                            }`}
                        />
                        <span className="text-[10px] mt-1 text-center max-w-[60px]">
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {faceQuality && (
                  <div className="text-xs text-gray-400 space-y-1 mt-4 pt-4 border-t border-gray-800">
                    <div className="grid grid-cols-2 gap-2">
                      <span>
                        {t("dashboard:faceRegistration.quality.eyes")}: {faceQuality.hasBothEyes ? "✓" : "✗"} | {t("dashboard:faceRegistration.quality.nose")}:{" "}
                        {faceQuality.hasNose ? "✓" : "✗"} | {t("dashboard:faceRegistration.quality.mouth")}: {faceQuality.hasMouth ? "✓" : "✗"}
                      </span>
                      <span>
                        {t("dashboard:faceRegistration.quality.position")}: {faceQuality.isCentered ? "✓" : "✗"} | {t("dashboard:faceRegistration.quality.size")}:{" "}
                        {faceQuality.isValidSize ? "✓" : "✗"} | {t("dashboard:faceRegistration.quality.quality")}:{" "}
                        {Math.round(faceQuality.score * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar with Instructions - Right Column (1/3 width on desktop) */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 backdrop-blur-sm h-full">
                <h3 className="text-lg font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-green-500 rounded"></span>
                  {t("dashboard:faceRegistration.instructions.title")}
                </h3>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t("dashboard:faceRegistration.steps.step1")}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t("dashboard:faceRegistration.steps.step1Description")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t("dashboard:faceRegistration.steps.step2")}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t("dashboard:faceRegistration.steps.step2Description")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t("dashboard:faceRegistration.steps.step3")}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t("dashboard:faceRegistration.steps.step3Description")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t("dashboard:faceRegistration.steps.step4")}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {t("dashboard:faceRegistration.steps.step4Description")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tips Section */}
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h4 className="text-sm font-semibold mb-3 text-amber-400">{t("dashboard:faceRegistration.tips.title")}</h4>
                    <ul className="space-y-2 text-xs text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{t("dashboard:faceRegistration.tips.lighting.description")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{t("dashboard:faceRegistration.tips.angle.description")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{t("dashboard:faceRegistration.tips.distance.description")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{t("dashboard:faceRegistration.tips.expression.description")}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Capture Button */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleCapture}
              disabled={!canCapture || capturedImages.length >= MAX_IMAGES || isCapturing}
              size="lg"
              className={`transition-all duration-300 ${canCapture
                ? "bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60 hover:scale-105"
                : "bg-gray-600 cursor-not-allowed opacity-50"
                }`}
            >
              {isCapturing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("dashboard:faceRegistration.buttons.processing")}
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  {t("dashboard:faceRegistration.buttons.capture", { current: capturedImages.length, max: MAX_IMAGES })}
                </>
              )}
            </Button>
          </div>

          {/* Captured Images Grid */}
          {capturedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3 text-white">
                {t("dashboard:faceRegistration.capturedImages.title", { current: capturedImages.length, max: MAX_IMAGES })}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {capturedImages.map((img, index) => {
                  const qualityPercentage = Math.round(img.qualityScore * 100);
                  const qualityColor =
                    qualityPercentage >= 80
                      ? "text-green-400"
                      : qualityPercentage >= 70
                        ? "text-amber-400"
                        : "text-red-400";

                  return (
                    <div
                      key={index}
                      className={`relative group overflow-hidden rounded-lg border-2 transition-all duration-300 hover:scale-105 ${img.qualityScore >= MIN_QUALITY_SCORE
                        ? "border-gray-700 hover:border-cyan-500"
                        : "border-red-500 hover:border-red-600"
                        }`}
                    >
                      <img
                        src={img.dataURL}
                        alt={`Face ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      <button
                        onClick={() => handleRemove(index)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                        title={t("dashboard:faceRegistration.buttons.removeImage")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Quality Score Badge */}
                      <div
                        className={`absolute top-1 left-1 px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm ${img.qualityScore >= MIN_QUALITY_SCORE
                          ? "bg-green-500/80 text-white"
                          : "bg-red-500/80 text-white"
                          }`}
                      >
                        {qualityPercentage}%
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2">
                        <div className="flex items-center justify-between">
                          <span>{t("dashboard:faceRegistration.capturedImages.imageNumber", { number: index + 1 })}</span>
                          <span className={qualityColor}>
                            {qualityPercentage >= 80
                              ? t("dashboard:faceRegistration.quality.good")
                              : qualityPercentage >= 70
                                ? t("dashboard:faceRegistration.quality.fair")
                                : t("dashboard:faceRegistration.quality.low")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 justify-end mt-6 pt-6 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="border-gray-700 hover:bg-gray-800 hover:border-gray-600 transition-all duration-200"
            >
              {t("dashboard:faceRegistration.buttons.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={capturedImages.length < MIN_IMAGES || isUploading}
              className={`transition-all duration-300 ${capturedImages.length >= MIN_IMAGES && !isUploading
                ? "bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/60 hover:scale-105"
                : "bg-gray-600 cursor-not-allowed opacity-50"
                }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("dashboard:faceRegistration.buttons.processing")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("dashboard:faceRegistration.buttons.register", { current: capturedImages.length, min: MIN_IMAGES })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceRegistrationPage;
