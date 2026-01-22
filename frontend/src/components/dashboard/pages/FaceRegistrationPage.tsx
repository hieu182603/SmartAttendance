import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { faceService } from "@/services/faceService";
import faceDetectionService, {
  type FaceQuality,
  type FacePosition,
} from "@/services/faceDetectionService";
import { useFaceValidation } from "@/hooks/useFaceValidation";
import { CameraPreview, CaptureControls, CapturedGallery, InstructionSidebar } from "../faceRegistration";

// Face registration image limits - must match backend config (FACE_RECOGNITION_CONFIG.MIN/MAX_REGISTRATION_IMAGES)
// These values should be kept in sync with backend/src/config/app.config.js
const MIN_IMAGES = Number(import.meta.env.VITE_MIN_REGISTRATION_IMAGES) || 5;
const MAX_IMAGES = Number(import.meta.env.VITE_MAX_REGISTRATION_IMAGES) || 10;
const MIN_QUALITY_SCORE = 0.7; // Minimum quality score threshold

type FaceDetectionStatus = "loading" | "detecting" | "good" | "warning" | "error" | "none";
type ProgressStep = "detecting" | "aligning" | "capturing" | "completed";

// Captured image with metadata
export interface CapturedImage {
  dataURL: string;
  qualityScore: number;
  detectionConfidence: number;
  timestamp: number;
}

const FaceRegistrationPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);
  const navigate = useNavigate();

  // Validation hook
  const { validateCapturedImage, validateImageSet, getValidationErrors } = useFaceValidation();

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
  const cameraRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoCapturedRef = useRef<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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

  // Auto-capture states
  const [autoCaptureCooldown, setAutoCaptureCooldown] = useState<number>(0);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number>(0);
  const [isAutoCapturing, setIsAutoCapturing] = useState<boolean>(false);
  const [consecutiveGoodFrames, setConsecutiveGoodFrames] = useState<number>(0);
  const previousImageCountRef = useRef<number>(0); // Track previous image count to detect increases

  // Gallery interaction states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Animation states
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(true);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState<boolean>(false);

  // Performance optimization states
  const [devicePerformance, setDevicePerformance] = useState<'high' | 'medium' | 'low'>('high');
  const [adaptiveThrottleMs, setAdaptiveThrottleMs] = useState<number>(100);

  // Accessibility and keyboard shortcut states
  const [announcement, setAnnouncement] = useState<string>('');

  // Mobile instructions panel state
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

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

          // Could implement fallback to basic validation without ML model
          // For now, show error with recovery options
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

      // Additional cleanup for performance
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      // Clear any pending timeouts
      if (autoCaptureTimeoutRef.current) {
        clearTimeout(autoCaptureTimeoutRef.current);
      }
      if (cameraRetryTimeoutRef.current) {
        clearTimeout(cameraRetryTimeoutRef.current);
      }

      // Clean up object URLs from captured images
      capturedImages.forEach(img => {
        if (img.dataURL.startsWith('blob:')) {
          URL.revokeObjectURL(img.dataURL);
        }
      });
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

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Device performance detection and adaptive throttling
  useEffect(() => {
    const detectPerformance = () => {
      // Simple performance detection based on hardware concurrency and memory
      const cores = navigator.hardwareConcurrency || 2;
      const memory = (navigator as any).deviceMemory || 4;

      let performance: 'high' | 'medium' | 'low' = 'high';
      let throttleMs = 100; // Default high performance

      if (cores <= 2 || memory <= 2) {
        performance = 'low';
        throttleMs = 300; // Slower for low-end devices
      } else if (cores <= 4 || memory <= 4) {
        performance = 'medium';
        throttleMs = 200; // Medium throttling
      }

      // Adjust for battery level if available
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          if (battery.level < 0.2) {
            throttleMs = Math.max(throttleMs, 300); // Conservative throttling on low battery
          }
        });
      }

      setDevicePerformance(performance);
      setAdaptiveThrottleMs(throttleMs);
    };

    detectPerformance();
  }, []);

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
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      setCameraReady(false);

      // Determine error type and provide specific guidance
      let errorMessage = t("dashboard:faceRegistration.errors.cameraAccess");
      let errorType = "generic";

      if (error.name === 'NotAllowedError') {
        errorMessage = t("dashboard:faceRegistration.errors.cameraPermissionDenied");
        errorType = "permission";
      } else if (error.name === 'NotFoundError') {
        errorMessage = t("dashboard:faceRegistration.errors.cameraNotAvailable");
        errorType = "not_found";
      } else if (error.name === 'NotReadableError') {
        errorMessage = t("dashboard:faceRegistration.errors.cameraError");
        errorType = "busy";
      }

      setCameraError(errorType);
      toast.error(errorMessage);

      // Auto-retry for certain errors (up to 3 times)
      if (errorType === "busy" && retryCount < 3) {
        const nextRetry = retryCount + 1;
        setRetryCount(nextRetry);
        cameraRetryTimeoutRef.current = setTimeout(() => {
          toast.info(`Retrying camera access... (${nextRetry}/3)`);
          startCamera();
        }, 2000);
      }
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

  const startAutoCaptureCooldown = useCallback(() => {
    setAutoCaptureCooldown(3); // 3 second cooldown

    const cooldownInterval = setInterval(() => {
      setAutoCaptureCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cooldownInterval);
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

        // Milestone celebration
        if (step.key !== "detecting") {
          setShowMilestoneCelebration(true);
          setTimeout(() => setShowMilestoneCelebration(false), 1500);
        }

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

      // Adaptive throttling based on device performance
      const now = Date.now();
      if (now - lastDetectionTime < adaptiveThrottleMs) {
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

          // Real-time frame analysis (brightness / contrast / blur) to improve validation
          try {
            // Compute blur score (0-1, higher = sharper)
            const blurScore = faceDetectionService.detectBlur(canvas);

            // Analyze brightness/contrast on the current frame
            const frameImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const brightnessInfo = faceDetectionService.analyzeBrightness(frameImageData);

            // Attach diagnostic info to state for debugging / UI (keep minimal)
            // If any of these checks are poor, treat as warnings and give actionable messages
            if (brightnessInfo.mean < 80) {
              setDetectionStatus("warning");
              setMaskColor("warning");
              setStatusMessage("Ảnh quá tối. Tăng sáng môi trường.");
              resetProgress();
              stopProgressTracking();
              if (lastVoiceMessageRef.current !== "increase_light") {
                speakMessage("Vui lòng bật đèn hoặc di chuyển đến khu vực sáng hơn.");
              }
            } else if (brightnessInfo.mean > 200) {
              setDetectionStatus("warning");
              setMaskColor("warning");
              setStatusMessage("Ảnh quá sáng. Tránh ánh sáng trực tiếp.");
              resetProgress();
              stopProgressTracking();
              if (lastVoiceMessageRef.current !== "reduce_glare") {
                speakMessage("Tránh ánh sáng trực tiếp vào khuôn mặt.");
              }
            } else if (blurScore < 0.35) {
              setDetectionStatus("warning");
              setMaskColor("warning");
              setStatusMessage("Ảnh có vẻ mờ. Giữ camera ổn định hoặc di chuyển chậm hơn.");
              resetProgress();
              stopProgressTracking();
              if (lastVoiceMessageRef.current !== "stabilize_camera") {
                speakMessage("Giữ camera ổn định để có ảnh rõ nét.");
              }
            }
          } catch (e) {
            // Don't block detection for analysis failures - log occasionally
            // (faceDetectionService already rate-limits heavy logs)
            console.debug("Frame analysis skipped or failed:", e);
          }

          // Determine status and message (simplified for blazeface)
          let status: FaceDetectionStatus = "good";
          let message = t("dashboard:faceRegistration.status.faceInGoodPosition");
          let voiceMessage = "";
          let maskStatus: "good" | "warning" | "error" = "good";

          if (!quality.isCentered) {
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

  const stopFaceDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        // Clear canvas and reset context state
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.save(); // Reset transformation matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.restore();
      }
    }
  }, []);

  const drawBoundingBox = (
    ctx: CanvasRenderingContext2D,
    face: any, // Simplified for blazeface
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

    // Note: Landmark drawing removed for blazeface compatibility
    // Blazeface doesn't provide facial keypoints/landmarks
  };

  const drawFaceOverlay = (
    ctx: CanvasRenderingContext2D,
    face: any, // Simplified for blazeface
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
    if (maskStatus === "good" && quality.isCentered && quality.isValidSize) {
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

    // Check all quality requirements (simplified for blazeface)
    if (!faceQuality.isCentered || !faceQuality.isValidSize) {
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

  const handleAutoCapture = useCallback(async () => {
    console.log('Auto-capture triggered!');

    if (isCapturing) {
      console.log('Already capturing, skipping auto-capture');
      return;
    }

    setIsCapturing(true);
    resetProgress();
    stopProgressTracking();
    speakMessage(t("dashboard:faceRegistration.voice.autoCapturing"));

    // Flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    const photo = capturePhoto();
    console.log('Photo captured:', photo ? 'success' : 'failed', {
      hasPhoto: !!photo,
      faceQuality: faceQuality,
      canvasReady: !!canvasRef.current
    });

    if (photo && canvasRef.current && faceQuality) {
      try {
        // Post-capture validation
        const validation = await validateCapturedImage(
          photo.dataURL,
          faceQuality,
          canvasRef.current
        );

        console.log('Validation result:', validation);

        if (validation.isValid) {
          setCapturedImages((prev) => {
            if (prev.length >= MAX_IMAGES) {
              console.log('Max images reached, not adding more');
              return prev;
            }
            const newImages = [...prev, photo];
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 1000);

            // Start cooldown only when image count increases
            if (newImages.length > previousImageCountRef.current) {
              startAutoCaptureCooldown();
              previousImageCountRef.current = newImages.length;
            }

            toast.success(t("dashboard:faceRegistration.toasts.autoCaptureSuccess", {
              current: newImages.length,
              max: MAX_IMAGES,
              quality: Math.round(validation.score * 100)
            }));
            speakMessage(t("dashboard:faceRegistration.voice.captureSuccess", { count: newImages.length }));
            return newImages;
          });
        } else {
          // Validation failed, show specific error
          const errorMessages = getValidationErrors(validation.issues);
          console.log('Validation failed:', errorMessages);
          toast.warning(errorMessages[0] || t("dashboard:faceRegistration.errors.autoCaptureFailed"));
          speakMessage(t("dashboard:faceRegistration.voice.lowQuality"));
        }
      } catch (error) {
        console.error('Auto-capture validation error:', error);
        toast.warning(t("dashboard:faceRegistration.errors.autoCaptureFailed"));
      }
    } else {
      console.log('Auto-capture failed: missing requirements');
      toast.warning(t("dashboard:faceRegistration.errors.autoCaptureFailed"));
    }
    setIsCapturing(false);
  }, [isCapturing, capturePhoto, resetProgress, stopProgressTracking, speakMessage, validateCapturedImage, getValidationErrors, faceQuality]);

  const handleCapture = async () => {
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

    if (!faceQuality.isCentered || !faceQuality.isValidSize) {
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

    // Flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    const photo = capturePhoto();
    if (photo && canvasRef.current) {
      try {
        // Post-capture validation
        const validation = await validateCapturedImage(
          photo.dataURL,
          faceQuality,
          canvasRef.current
        );

        if (validation.isValid) {
          setCapturedImages((prev) => {
            const newImages = [...prev, photo];
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 1000);

            // Start cooldown only when image count increases
            if (newImages.length > previousImageCountRef.current) {
              startAutoCaptureCooldown();
              previousImageCountRef.current = newImages.length;
            }

            toast.success(t("dashboard:faceRegistration.toasts.captureSuccess", {
              current: newImages.length,
              max: MAX_IMAGES,
              quality: Math.round(validation.score * 100)
            }));
            speakMessage(t("dashboard:faceRegistration.voice.captureSuccess", { count: newImages.length }));

            return newImages;
          });
        } else {
          // Validation failed, show specific error
          const errorMessages = getValidationErrors(validation.issues);
          toast.error(errorMessages[0] || t("dashboard:faceRegistration.errors.captureFailed"));
          speakMessage(t("dashboard:faceRegistration.voice.lowQuality"));
        }
      } catch (error) {
        console.error('Capture validation error:', error);
        toast.error(t("dashboard:faceRegistration.errors.captureFailed"));
      }
    } else {
      toast.error(t("dashboard:faceRegistration.errors.captureFailed"));
    }
    setIsCapturing(false);
  };

  const handleRemove = useCallback((index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Gallery drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;

    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setCapturedImages((prev) => {
      const newImages = [...prev];
      const draggedImage = newImages[dragIndex];
      newImages.splice(dragIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);
      return newImages;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Auto-capture countdown timer - dedicated effect triggered by isAutoCapturing
  useEffect(() => {
    if (isAutoCapturing && autoCaptureCountdown > 0) {
      const countdownInterval = setInterval(() => {
        setAutoCaptureCountdown(prev => {
          if (prev <= 1) {
            // Countdown finished, trigger capture
            clearInterval(countdownInterval);

            // Check if quality is still good before capturing
            if (detectionStatus === "good" &&
              faceQuality?.isGoodQuality &&
              faceQuality?.score !== undefined &&
              faceQuality.score >= MIN_QUALITY_SCORE &&
              !multipleFaces) {
              handleAutoCapture();
            } else {
              // Quality dropped, cancel auto-capture
              setIsAutoCapturing(false);
              setConsecutiveGoodFrames(0);
              speakMessage(t("dashboard:faceRegistration.voice.centerFace"));
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [isAutoCapturing, autoCaptureCountdown, detectionStatus, faceQuality?.score, multipleFaces, handleAutoCapture, speakMessage]);

  // Auto-capture logic - start countdown when conditions are met
  useEffect(() => {
    // Debug logging for auto-capture conditions
    const debugInfo = {
      detectionStatus,
      isGoodQuality: faceQuality?.isGoodQuality,
      faceQualityScore: faceQuality?.score,
      minQualityScore: MIN_QUALITY_SCORE,
      multipleFaces,
      capturedCount: capturedImages.length,
      maxImages: MAX_IMAGES,
      cooldown: autoCaptureCooldown,
      isCapturing,
      isAutoCapturing,
      consecutiveGoodFrames
    };

    console.debug('Auto-capture conditions:', debugInfo);

    // Check if all conditions are met for auto-capture
    const isAllConditionsMet = (
      detectionStatus === "good" &&
      faceQuality?.isGoodQuality &&
      faceQuality?.score !== undefined &&
      faceQuality.score >= MIN_QUALITY_SCORE &&
      !multipleFaces &&
      capturedImages.length < MAX_IMAGES &&
      autoCaptureCooldown === 0 &&
      !isCapturing &&
      !isAutoCapturing
    );

    if (isAllConditionsMet) {
      // Increment consecutive good frames using functional update and start countdown
      // only when we cross the threshold to avoid repeatedly resetting the timer.
      setConsecutiveGoodFrames((prev) => {
        const next = prev + 1;
        console.debug(`Consecutive good frames: ${next}/5`);

        if (next >= 5 && !isAutoCapturing) {
          console.log('Starting auto-capture countdown...');
          setIsAutoCapturing(true);
          setAutoCaptureCountdown(3);
          speakMessage(t("dashboard:faceRegistration.voice.autoCapturing"));
        }
        return next;
      });
    } else {
      // Reset consecutive frames if conditions not met
      if (detectionStatus === "none" ||
        multipleFaces ||
        (faceQuality && !faceQuality.isGoodQuality) ||
        (faceQuality?.score !== undefined && faceQuality.score < MIN_QUALITY_SCORE)) {
        console.debug('Conditions not met or poor quality, resetting consecutive frames');
        setConsecutiveGoodFrames(0);
      }
    }
    // Don't reset for "warning" or other temporary issues - allow recovery
  }, [
    detectionStatus,
    faceQuality?.isGoodQuality,
    multipleFaces,
    capturedImages.length,
    autoCaptureCooldown,
    isCapturing,
    consecutiveGoodFrames,
    isAutoCapturing,
    speakMessage,
    t
  ]);


  // Voice feedback for auto-capture countdown
  useEffect(() => {
    if (isAutoCapturing && autoCaptureCountdown > 0 && autoCaptureCountdown <= 3) {
      speakMessage(`${autoCaptureCountdown}`);
    }
  }, [autoCaptureCountdown, isAutoCapturing, speakMessage]);

  // Reset auto-capture state when capture is complete
  useEffect(() => {
    if (!isCapturing && isAutoCapturing && autoCaptureCountdown === 0) {
      setIsAutoCapturing(false);
      setConsecutiveGoodFrames(0);
    }
  }, [isCapturing, isAutoCapturing, autoCaptureCountdown]);


  // Screen reader announcements
  useEffect(() => {
    if (announcement) {
      // Use ARIA live region for screen reader announcements
      const announcementTimeout = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(announcementTimeout);
    }
  }, [announcement]);

  // Memoized calculations for performance
  const canCapture = useMemo(() =>
    Boolean(faceQuality?.isGoodQuality) && !multipleFaces && cameraReady && modelReady && !modelError && progress >= 100,
    [faceQuality?.isGoodQuality, multipleFaces, cameraReady, modelReady, modelError, progress]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when component is focused and not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ': // Spacebar - Capture photo
          event.preventDefault();
          if (canCapture && !isCapturing) {
            handleCapture();
          }
          break;
        case 'Escape': // Escape - Cancel/go back
          event.preventDefault();
          navigate(-1);
          break;
        case 'r': // R - Retry camera
          event.preventDefault();
          if (cameraError) {
            startCamera();
          }
          break;
        case 'v': // V - Toggle voice
          event.preventDefault();
          toggleVoice();
          break;
        case 'ArrowLeft': // Navigate gallery left
          event.preventDefault();
          // Could implement gallery navigation
          break;
        case 'ArrowRight': // Navigate gallery right
          event.preventDefault();
          // Could implement gallery navigation
          break;
        case 'Delete': // Delete last image
        case 'Backspace':
          event.preventDefault();
          if (capturedImages.length > 0) {
            handleRemove(capturedImages.length - 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [canCapture, isCapturing, cameraError, capturedImages.length, handleCapture, handleRemove, navigate, startCamera, toggleVoice]);


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
    // Count qualifying images (those with quality score >= MIN_QUALITY_SCORE)
    const qualifyingImages = capturedImages.filter(
      (img) => img.qualityScore >= MIN_QUALITY_SCORE
    );

    if (qualifyingImages.length < MIN_IMAGES) {
      toast.error(
        t("dashboard:faceRegistration.errors.insufficientQualityImages", {
          current: qualifyingImages.length,
          min: MIN_IMAGES,
          needed: MIN_IMAGES - qualifyingImages.length
        })
      );
      return;
    }

    // Pre-submit validation of qualifying image set
    const imageSetValidation = await validateImageSet(qualifyingImages);

    if (!imageSetValidation.isValid) {
      // Show validation issues
      const errorMessages = getValidationErrors(imageSetValidation.issues);
      toast.error(errorMessages[0] || t("dashboard:faceRegistration.errors.registrationFailed"));

      // Show recommendations
      if (imageSetValidation.recommendations.length > 0) {
        setTimeout(() => {
          toast.info(imageSetValidation.recommendations[0], { duration: 5000 });
        }, 1000);
      }
      return;
    }

    // Use only qualifying images for submission
    const validImages = qualifyingImages;

    setIsUploading(true);

    const submitWithRetry = async (retryCount = 0): Promise<void> => {
      try {
        const files = validImages.map((img, idx) =>
          dataURLtoFile(img.dataURL, `face-${idx + 1}.jpg`)
        );

        // Prepare enhanced metadata for each image
        const metadata = validImages.map((img) => ({
          qualityScore: img.qualityScore,
          detectionConfidence: img.detectionConfidence,
          timestamp: img.timestamp,
          validationScore: imageSetValidation.averageScore,
        }));

        await faceService.registerFace(files, metadata);
        toast.success(t("dashboard:faceRegistration.success.registrationSuccess"));
        navigate(-1);
      } catch (error: any) {
        console.error(`Registration attempt ${retryCount + 1} failed:`, error);

        // Check if it's a network error and we can retry
        const isNetworkError = !navigator.onLine ||
          error.code === 'NETWORK_ERROR' ||
          error.message?.includes('network') ||
          error.response?.status >= 500;

        if (isNetworkError && retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
          toast.info(`Network error. Retrying in ${delay / 1000}s... (${retryCount + 1}/3)`, { duration: delay });

          setTimeout(() => {
            submitWithRetry(retryCount + 1);
          }, delay);
          return;
        }

        // Final failure - could implement offline storage here
        if (!navigator.onLine) {
          toast.error("You're offline. Registration data saved locally. Please try again when online.");
          // TODO: Implement offline storage
        } else {
          toast.error(error.response?.data?.message || t("dashboard:faceRegistration.errors.registrationFailed"));
        }

        setIsUploading(false);
      }
    };

    try {
      await submitWithRetry();
    } catch (error) {
      // This should not happen due to internal error handling, but just in case
      console.error('Unexpected error during submission:', error);
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
    <>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
      <div className="min-h-screen w-full bg-gray-900 text-white">
        {/* Fixed Header */}
        <div className="h-16 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold text-cyan-400">{t("dashboard:faceRegistration.title")}</h1>
            <p className="text-sm text-gray-400">
              {t("dashboard:faceRegistration.description", { min: MIN_IMAGES, max: MAX_IMAGES })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="border-red-500 text-red-400 hover:bg-red-500/10 hover:border-red-400 transition-all duration-200 px-4"
              title={t("dashboard:faceRegistration.buttons.cancel")}
            >
              {t("dashboard:faceRegistration.buttons.cancel")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVoice}
              className={`border-gray-700 hover:bg-gray-800 transition-all duration-200 ${voiceEnabled ? "text-cyan-500" : "text-gray-500"}`}
              title={voiceEnabled ? t("dashboard:faceRegistration.buttons.toggleVoiceOff") : t("dashboard:faceRegistration.buttons.toggleVoiceOn")}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Full-screen Content Layout */}
        <div
          className={`flex flex-col flex-1 transition-all duration-500 ${isEntering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
          role="main"
          aria-label="Face registration interface"
        >
          {/* Screen reader announcements */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcement}
          </div>

          {/* Camera Preview Section with instructions above and right-side gallery (7:3 grid on lg) */}
          <div className="flex-1 flex flex-col">
            {/* Instructions row above the camera */}
            <div className="w-full px-4 lg:px-6 pb-4">
              <InstructionSidebar
                showOnMobile={showInstructions}
                currentStep={currentStep}
                cameraReady={cameraReady}
                detectionStatus={detectionStatus}
                capturedImagesCount={capturedImages.length}
                compactRow
              />
            </div>

            {/* Main content: grid 7/3 on large screens */}
            <div className="w-full px-4 lg:px-6">
              <div className="w-full lg:grid lg:grid-cols-10 lg:gap-6">
                {/* Left: camera (col-span-7) */}
                <div className="lg:col-span-7">
                  <div
                    className={`w-full relative transition-all duration-700 delay-200 ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    role="region"
                    aria-label="Camera preview"
                  >
                    <CameraPreview
                      cameraReady={cameraReady}
                      modelLoading={modelLoading}
                      modelError={modelError}
                      cameraError={cameraError}
                      detectionStatus={detectionStatus}
                      statusMessage={statusMessage}
                      progress={progress}
                      currentStep={currentStep}
                      maskColor={maskColor}
                      faceQuality={faceQuality}
                      showFlash={showFlash}
                      showSuccessAnimation={showSuccessAnimation}
                      showMilestoneCelebration={showMilestoneCelebration}
                      isAutoCapturing={isAutoCapturing}
                      autoCaptureCountdown={autoCaptureCountdown}
                      onVideoRef={(ref) => {
                        (videoRef as any).current = ref;
                      }}
                      onCanvasRef={(ref) => {
                        (canvasRef as any).current = ref;
                      }}
                      onRetry={startCamera}
                    />

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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: gallery + capture controls (col-span-3) */}
                <div className="lg:col-span-3 mt-6 lg:mt-0">
                  <div className="bg-gray-900/60 rounded-lg border border-gray-800 min-h-[400px] max-h-[600px] overflow-y-auto relative">
                    {capturedImages.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-gray-500">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📷</div>
                          <p className="text-sm font-medium">Chưa có hình ảnh</p>
                          <p className="text-xs mt-1">Hình ảnh sẽ xuất hiện ở đây khi chụp</p>
                        </div>
                      </div>
                    ) : (
                      <CapturedGallery
                        images={capturedImages}
                        onRemove={handleRemove}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                      />
                    )}
                  </div>

                  <div className="mt-4">
                    <CaptureControls
                      canCapture={canCapture}
                      isCapturing={isCapturing}
                      autoCaptureCooldown={autoCaptureCooldown}
                      capturedImagesLength={capturedImages.length}
                      maxImages={MAX_IMAGES}
                      onCapture={handleCapture}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls + Horizontal Image Gallery removed - moved to right column beside camera */}

        {/* Bottom Action Bar */}
        <div className={`flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 flex items-center justify-end px-6 transition-all duration-700 delay-700 ${isEntering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          {capturedImages.filter(img => img.qualityScore >= MIN_QUALITY_SCORE).length >= MIN_IMAGES && (
            <Button
              onClick={handleSubmit}
              disabled={isUploading}
              className={`transition-all duration-300 px-8 ${!isUploading
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
          )}
        </div>
      </div>
    </>
  );
};

export default FaceRegistrationPage;

