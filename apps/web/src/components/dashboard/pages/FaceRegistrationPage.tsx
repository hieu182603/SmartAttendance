import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, AlertCircle, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { faceService, parseFaceRegistrationError, formatFaceError } from "@/services/faceService";
import faceDetectionService, {
  type FaceQuality,
  type FacePosition,
} from "@/services/faceDetectionService";
import { useFaceValidation } from "@/hooks/useFaceValidation";
import { useAuth } from "@/context/AuthContext";
import { useRolePath } from "@/hooks/useRolePath";
import { CameraPreview, CaptureControls, CapturedGallery, InstructionSidebar } from "../faceRegistration";
import {
  savePendingRegistration,
  getPendingRegistration,
  clearPendingRegistration,
} from "@/utils/offlineFaceStorage";

// Face registration image limits - must match backend config (FACE_RECOGNITION_CONFIG.MIN/MAX_REGISTRATION_IMAGES)
// These values should be kept in sync with backend/src/config/app.config.js
// Updated to 4 images: nhìn thẳng, trên, trái, phải
const MIN_IMAGES = 4;
const MAX_IMAGES = 4;
const MIN_QUALITY_SCORE = 0.7; // Minimum quality score threshold

// Hướng dẫn chụp 4 ảnh theo các góc độ khác nhau
const CAPTURE_INSTRUCTIONS = [
  {
    title: "Ảnh 1: Nhìn thẳng",
    description: "Nhìn thẳng vào camera, giữ đầu thẳng",
    icon: "👤",
  },
  {
    title: "Ảnh 2: Ngẩng mặt lên",
    description: "Ngẩng mặt lên nhẹ, mắt vẫn nhìn về phía camera",
    icon: "👆",
  },
  {
    title: "Ảnh 3: Quay sang trái",
    description: "Quay đầu sang trái, mắt hướng về camera",
    icon: "👈",
  },
  {
    title: "Ảnh 4: Quay sang phải",
    description: "Quay đầu sang phải, mắt hướng về camera",
    icon: "👉",
  },
];

type FaceDetectionStatus = "loading" | "detecting" | "good" | "warning" | "error" | "none";
export type ProgressStep = "detecting" | "aligning" | "capturing" | "completed";

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
  const basePath = useRolePath();

  const { user } = useAuth();
  const isTrial = user?.role === 'TRIAL';

  // Validation hook
  const { validateCapturedImage, validateImageSet, getValidationErrors } = useFaceValidation();

  if (isTrial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center bg-background animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-bold mb-4 tracking-tight">Tính năng hạn chế</h2>
        <p className="text-muted-foreground max-w-lg text-lg leading-relaxed mb-8">
          Rất tiếc, các tính năng AI bao gồm <strong>Đăng ký khuôn mặt</strong> không khả dụng cho tài khoản dùng thử.
          Vui lòng nâng cấp lên tài khoản <strong>Nhân viên</strong> hoặc cao hơn để trải nghiệm công nghệ nhận diện khuôn mặt của chúng tôi.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => navigate(basePath)}
            size="lg"
            variant="default"
            className="px-8 shadow-md hover:shadow-lg transition-all"
          >
            Quay lại trang chủ
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.open('https://smartattendance.com/pricing', '_blank')}
            className="px-8 hover:bg-yellow-50 transition-all border-yellow-200"
          >
            Tìm hiểu các gói dịch vụ
          </Button>
        </div>
      </div>
    );
  }

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
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null);
  const [, setFacePosition] = useState<FacePosition | null>(null);
  const [faceDetectionConfidence, setFaceDetectionConfidence] = useState<number>(0);
  const [detectionStatus, setDetectionStatus] = useState<FaceDetectionStatus>("loading");
  const [statusMessage, setStatusMessage] = useState<string>(t("dashboard:faceRegistration.status.loading"));
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<ProgressStep>("detecting");
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [maskColor, setMaskColor] = useState<"good" | "warning" | "error">("error");

  // Liveness detection state (simplified trigger before capture)
  const [livenessVerified, setLivenessVerified] = useState(false);

  // User face registration status
  const [hasRegisteredFace, setHasRegisteredFace] = useState(false);
  const [, setIsCheckingFaceStatus] = useState(true);

  // Consent state
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Manual capture only - no auto-capture states needed

  // Gallery interaction states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [, setDragOverIndex] = useState<number | null>(null);

  // Animation states
  const [showFlash, setShowFlash] = useState<boolean>(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(true);
  const [showMilestoneCelebration] = useState<boolean>(false);

  // Performance optimization states
  const [, setDevicePerformance] = useState<'high' | 'medium' | 'low'>('high');
  const [adaptiveThrottleMs, setAdaptiveThrottleMs] = useState<number>(100);

  // Accessibility and keyboard shortcut states
  const [announcement, setAnnouncement] = useState<string>('');

  // Mobile instructions panel state
  const [showInstructions] = useState<boolean>(false);

  // Check user's face registration status on mount
  useEffect(() => {
    const checkFaceStatus = async () => {
      try {
        const status = await faceService.getFaceStatus();
        setHasRegisteredFace(status.isRegistered);

        // If already registered, consent was given previously — skip modal
        if (status.isRegistered) {
          setLivenessVerified(true);
          setConsentGiven(true);
        } else {
          // Not yet registered: show consent modal before capture UI
          setShowConsentModal(true);
        }
      } catch (error) {
        console.error('Failed to check face status:', error);
        // If error, assume not registered to be safe
        setHasRegisteredFace(false);
        setShowConsentModal(true);
      } finally {
        setIsCheckingFaceStatus(false);
      }
    };

    checkFaceStatus();
  }, []);

  // When the device comes back online, retry any pending offline registration
  useEffect(() => {
    if (!user?.id) return;
    const userId = (user as any).id ?? (user as any)._id;
    if (!userId) return;

    const handleOnline = async () => {
      try {
        const pending = await getPendingRegistration(userId);
        if (!pending) return;

        toast.info(t("dashboard:faceRegistration.offlineStorage.pendingFound"));

        const files = pending.images.map((blob, idx) =>
          new File([blob], `face-${idx + 1}.jpg`, { type: blob.type || "image/jpeg" })
        );
        await faceService.registerFace(files, pending.metadata);
        await clearPendingRegistration(userId);
        toast.success(t("dashboard:faceRegistration.offlineStorage.submitSuccess"));
        setTimeout(() => navigate(`${basePath}/scan`), 1500);
      } catch {
        toast.error(t("dashboard:faceRegistration.offlineStorage.submitFailed"));
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user, basePath, navigate, t]);

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

  // =========================================================================
  // Simplified \"liveness\" trigger: one click to allow guided 4-photo capture
  // =========================================================================

  const handleEnableCapture = () => {
    if (!livenessVerified) {
      setLivenessVerified(true);
      toast.success("Bạn có thể bắt đầu chụp 4 ảnh khuôn mặt theo hướng dẫn.");
      speakMessage("Bạn có thể bắt đầu chụp 4 ảnh khuôn mặt theo hướng dẫn.");
    }
  };

  // =========================================================================
  // Progress Management
  // =========================================================================
  const resetProgress = useCallback(() => {
    setProgress(0);
    setCurrentStep("detecting");
    currentStepRef.current = "detecting";
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Auto-capture cooldown removed - manual capture only


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

          // ------------------------------------------------------------------
          // Update progress bar directly from current image quality so that
          // the \"Quality\" badge and \"Hoàn thành\" progress use cùng %.
          // ------------------------------------------------------------------
          const qualityScore = quality?.score ?? 0;
          const newProgress = Math.round(Math.min(qualityScore, 1) * 100);
          setProgress(newProgress);

          // Map progress to logical step
          let stepKey: ProgressStep = "detecting";
          if (newProgress >= 90) {
            stepKey = "completed";
          } else if (newProgress >= 60) {
            stepKey = "capturing";
          } else if (newProgress >= 30) {
            stepKey = "aligning";
          }
          setCurrentStep(stepKey);
          currentStepRef.current = stepKey;

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
              if (lastVoiceMessageRef.current !== "increase_light") {
                speakMessage("Vui lòng bật đèn hoặc di chuyển đến khu vực sáng hơn.");
              }
            } else if (brightnessInfo.mean > 200) {
              setDetectionStatus("warning");
              setMaskColor("warning");
              setStatusMessage("Ảnh quá sáng. Tránh ánh sáng trực tiếp.");
              if (lastVoiceMessageRef.current !== "reduce_glare") {
                speakMessage("Tránh ánh sáng trực tiếp vào khuôn mặt.");
              }
            } else if (blurScore < 0.15) {
              setDetectionStatus("warning");
              setMaskColor("warning");
              setStatusMessage("Ảnh có vẻ mờ. Giữ camera ổn định hoặc di chuyển chậm hơn.");
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

          // If overall quality dưới 50%, coi như lỗi rõ ràng
          if (qualityScore < 0.5) {
            status = "error";
            maskStatus = "error";
            const percent = Math.round(qualityScore * 100);
            message = `Chất lượng ảnh quá thấp (${percent}%). Vui lòng tiến lại gần, tăng sáng hoặc giữ camera ổn định hơn.`;
            voiceMessage = "Chất lượng ảnh quá thấp, vui lòng điều chỉnh rồi thử lại.";
          } else if (!quality.isCentered) {
            status = "warning";
            maskStatus = "warning";
            message = t("dashboard:faceRegistration.status.lookStraight");
            voiceMessage = t("dashboard:faceRegistration.voice.centerFace");
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
          } else {
            status = "good";
            maskStatus = "good";
            message = t("dashboard:faceRegistration.status.holdPosition");
            if (lastVoiceMessageRef.current !== t("dashboard:faceRegistration.voice.holdPosition")) {
              speakMessage(t("dashboard:faceRegistration.voice.holdPositionGood"));
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
    _width: number,
    _height: number,
    status: "good" | "warning" | "error"
  ) => {
    const boundingBox = faceDetectionService.normalizeBoundingBox(face);
    if (!boundingBox) return;

    const x = boundingBox.topLeft[0];
    const y = boundingBox.topLeft[1];
    const w = boundingBox.bottomRight[0] - x;
    const h = boundingBox.bottomRight[1] - y;
    const centerX = x + w / 2;

    // Standard colors - green, yellow, red
    let primaryColor = "#10b981"; // green
    let scanLineColor = "rgba(52, 211, 153, 0.8)";

    if (status === "warning") {
      primaryColor = "#f59e0b"; // yellow/amber
      scanLineColor = "rgba(251, 191, 36, 0.7)";
    } else if (status === "error") {
      primaryColor = "#ef4444"; // red
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
    let status: "good" | "warning" | "error" = maskStatus;

    if (maskStatus === "error") {
      primaryColor = "#ef4444"; // red
      secondaryColor = "#f87171";
      maskColor = "rgba(239, 68, 68, 0.12)";
    } else if (maskStatus === "warning") {
      primaryColor = "#f59e0b"; // yellow/amber
      secondaryColor = "#fbbf24";
      maskColor = "rgba(245, 158, 11, 0.12)";
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

  // Auto-capture removed - manual capture only via handleCapture

  const handleCapture = async () => {
    // Liveness check moved to handleSubmit - allow capture freely

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

            // Update currentImageIndex to next step
            setCurrentImageIndex(newImages.length);

            toast.success(t("dashboard:faceRegistration.toasts.captureSuccess", {
              current: newImages.length,
              max: MAX_IMAGES,
              quality: Math.round(validation.score * 100)
            }));

            // Show next instruction
            if (newImages.length < MAX_IMAGES) {
              const nextInstruction = CAPTURE_INSTRUCTIONS[newImages.length];
              if (nextInstruction) {
                speakMessage(nextInstruction.title);
              }
            } else {
              speakMessage(t("dashboard:faceRegistration.voice.captureSuccess", { count: newImages.length }));
            }

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
    setCapturedImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      // Sync currentImageIndex with the new image count
      setCurrentImageIndex(newImages.length);
      return newImages;
    });
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

  // Auto-capture useEffects removed - manual capture only



  // Screen reader announcements
  useEffect(() => {
    if (announcement) {
      // Use ARIA live region for screen reader announcements
      const announcementTimeout = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(announcementTimeout);
    }
  }, [announcement]);

  // Memoized calculations for performance
  const livenessRequiredForCapture = !hasRegisteredFace && !livenessVerified;

  const canCapture = useMemo(
    () =>
      !livenessRequiredForCapture &&
      Boolean(faceQuality?.isGoodQuality) &&
      !multipleFaces &&
      cameraReady &&
      modelReady &&
      !modelError,
    [livenessRequiredForCapture, faceQuality?.isGoodQuality, multipleFaces, cameraReady, modelReady, modelError]
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

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async () => {
    if (!hasRegisteredFace && !livenessVerified) {
      toast.warning(t("dashboard:faceRegistration.toasts.livenessRequired"));
      return;
    }

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
        setIsUploading(false);
        // Redirect to attendance page after successful registration
        setTimeout(() => navigate(`${basePath}/scan`), 1500);
      } catch (error: any) {
        console.error(`Registration attempt ${retryCount + 1} failed:`, error);

        // Check if it's a network error and we can retry
        const isNetworkError = !navigator.onLine ||
          error.code === 'NETWORK_ERROR' ||
          error.message?.includes('network') ||
          error.response?.status >= 500;

        if (isNetworkError && retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          toast.info(
            t("dashboard:faceRegistration.toasts.networkRetrying", {
              delay: Math.round(delay / 1000),
              attempt: retryCount + 1,
              max: 3,
            }),
            { duration: delay }
          );

          setTimeout(() => {
            submitWithRetry(retryCount + 1);
          }, delay);
          return;
        }

        // Final failure — save to IndexedDB when offline so the user can retry later
        if (!navigator.onLine && user?.id) {
          const blobs = validImages.map((img) =>
            dataURLtoBlob(img.dataURL)
          );
          await savePendingRegistration({
            userId: user.id,
            images: blobs,
            metadata: validImages.map((img) => ({
              qualityScore: img.qualityScore,
              detectionConfidence: img.detectionConfidence,
              timestamp: img.timestamp,
              validationScore: imageSetValidation.averageScore,
            })),
            savedAt: Date.now(),
          }).catch(() => {/* non-critical */});
          toast.error(t("dashboard:faceRegistration.toasts.offlineSaved"));
        } else {
          const parsedError = parseFaceRegistrationError(error);
          toast.error(formatFaceError(parsedError));
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





  // Get current progress step label
  const getCurrentStepLabel = () => {
    return PROGRESS_STEPS.find((s) => s.key === currentStep)?.label || t("dashboard:faceRegistration.progress.detecting");
  };

  const qualifyingImagesCount = capturedImages.filter(
    (img) => img.qualityScore >= MIN_QUALITY_SCORE
  ).length;
  const canRegister = qualifyingImagesCount >= MIN_IMAGES;

  const handleWithdrawConsent = async () => {
    if (!window.confirm("Rút lại đồng ý sẽ xóa toàn bộ dữ liệu khuôn mặt của bạn. Tiếp tục?")) return;
    setIsWithdrawing(true);
    try {
      await faceService.withdrawConsent();
      toast.success("Đã rút lại đồng ý và xóa dữ liệu sinh trắc học thành công.");
      setHasRegisteredFace(false);
      setConsentGiven(false);
      setConsentChecked(false);
    } catch {
      toast.error("Không thể rút lại đồng ý. Vui lòng thử lại sau.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="h-full min-h-0 w-full bg-[var(--background)] text-[var(--text-main)] flex flex-col overflow-hidden">
      {/* Consent modal */}
      <Dialog open={showConsentModal} onOpenChange={(open) => { if (!open && !consentGiven) setShowConsentModal(false); }}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold pr-6">
              Đồng ý thu thập dữ liệu sinh trắc học
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 text-sm text-[var(--text-sub)] space-y-3 pr-1">
            <p>
              Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, chúng tôi cần sự đồng ý của bạn trước khi thu thập dữ liệu sinh trắc học (hình ảnh khuôn mặt, dữ liệu nhận dạng).
            </p>

            <div>
              <p className="font-semibold text-[var(--text-main)] mb-1">Dữ liệu thu thập:</p>
              <ul className="space-y-0.5 pl-1">
                <li>• Hình ảnh khuôn mặt từ nhiều góc độ</li>
                <li>• Dữ liệu vector nhận dạng khuôn mặt (embeddings)</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-[var(--text-main)] mb-1">Mục đích sử dụng:</p>
              <ul className="space-y-0.5 pl-1">
                <li>• Xác thực danh tính khi chấm công</li>
                <li>• Phòng chống gian lận chấm công</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-[var(--text-main)] mb-1">Lưu trữ &amp; bảo mật:</p>
              <ul className="space-y-0.5 pl-1">
                <li>• Hình ảnh được lưu trữ trên Cloudinary (có mã hóa)</li>
                <li>• Dữ liệu nhận dạng được lưu trong MongoDB</li>
                <li>• Không chia sẻ với bên thứ ba ngoài mục đích trên</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-[var(--text-main)] mb-1">Quyền của bạn:</p>
              <ul className="space-y-0.5 pl-1">
                <li>• Có thể rút lại đồng ý và xóa dữ liệu bất kỳ lúc nào</li>
                <li>• Thời hạn lưu giữ: trong suốt thời gian làm việc tại công ty</li>
              </ul>
            </div>

            <p>
              Xem{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">
                Chính sách bảo mật
              </a>{" "}
              và{" "}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">
                Điều khoản sử dụng
              </a>{" "}
              để biết thêm chi tiết.
            </p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-2">
            <Checkbox
              checked={consentChecked}
              onCheckedChange={(checked) => setConsentChecked(checked)}
              className="mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-[var(--text-main)] leading-snug">
              Tôi đã đọc và đồng ý với chính sách thu thập dữ liệu sinh trắc học
            </span>
          </label>

          <DialogFooter className="pt-1">
            <Button
              variant="outline"
              onClick={() => { setShowConsentModal(false); navigate(-1); }}
              className="border-[var(--border)] text-[var(--text-sub)] hover:text-[var(--text-main)]"
            >
              Từ chối
            </Button>
            <Button
              disabled={!consentChecked}
              onClick={() => { setConsentGiven(true); setShowConsentModal(false); }}
              className="bg-[var(--primary)] text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Đồng ý và tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* ==================== MAIN ==================== */}
      <main
        className={`flex-1 min-h-0 px-3 pb-3 pt-0 md:px-4 md:pb-4 lg:px-5 lg:pb-5 lg:pt-0 grid grid-cols-1 lg:grid-cols-10 gap-3 md:gap-4 lg:gap-5 transition-all duration-500 overflow-hidden ${isEntering ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
        role="main"
        aria-label="Face registration interface"
      >
        {/* ===== CAMERA COLUMN ===== */}
        <section className="lg:col-span-7 flex flex-col gap-3 min-h-0 h-full">
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
            onVideoRef={(ref) => {
              (videoRef as any).current = ref;
            }}
            onCanvasRef={(ref) => {
              (canvasRef as any).current = ref;
            }}
            onRetry={startCamera}
          />

          {/* Progress bar under camera */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)] whitespace-nowrap">
              {detectionStatus === "good" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
              ) : detectionStatus === "warning" ? (
                <AlertCircle className="h-3.5 w-3.5 text-[var(--warning)]" />
              ) : detectionStatus === "error" ? (
                <AlertCircle className="h-3.5 w-3.5 text-[var(--error)]" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 text-[var(--accent-cyan)] animate-spin" />
              )}
              <span>{getCurrentStepLabel()}</span>
            </div>
            <div className="flex-1 h-1.5 bg-[var(--shell)] rounded-full overflow-hidden relative progress-shimmer">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${maskColor === "good"
                  ? "bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--success)]"
                  : maskColor === "warning"
                    ? "bg-gradient-to-r from-[var(--warning)] to-amber-300"
                    : "bg-gradient-to-r from-[var(--error)] to-red-400"
                  }`}
                style={{ width: `${progress}%`, boxShadow: "0 0 12px rgba(34, 211, 238, 0.45)" }}
              />
            </div>
            <div className="mono text-xs font-bold text-[var(--accent-cyan)] min-w-[40px] text-right">
              {progress}%
            </div>
          </div>
        </section>

        {/* ===== SIDEBAR COLUMN ===== */}
        <aside className="lg:col-span-3 flex flex-col gap-2.5 md:gap-3 min-h-0 overflow-y-auto lg:overflow-hidden pr-0.5">
          {/* Step timeline */}
          <InstructionSidebar
            showOnMobile={showInstructions}
            currentStep={currentStep}
            cameraReady={cameraReady}
            detectionStatus={detectionStatus}
            capturedImagesCount={capturedImages.length}
            compactRow
            hasRegisteredFace={hasRegisteredFace}
            livenessVerified={livenessVerified}
            onStartLiveness={handleEnableCapture}
            maxImages={MAX_IMAGES}
            voiceEnabled={voiceEnabled}
            onToggleVoice={toggleVoice}
            voiceToggleTitle={voiceEnabled ? t("dashboard:faceRegistration.buttons.toggleVoiceOff") : t("dashboard:faceRegistration.buttons.toggleVoiceOn")}
          />

          {/* Gallery 2x2 */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2 md:p-2.5 flex flex-col min-h-0">
            <div className="flex items-center gap-1.5 mb-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-cyan)"
                strokeWidth="2"
                className="w-3.5 h-3.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-[var(--text-sub)]">
                Ảnh đã chụp
              </span>
            </div>
            <CapturedGallery
              images={capturedImages}
              onRemove={handleRemove}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          </div>

          {/* Consent withdrawal — shown only when face already registered */}
          {hasRegisteredFace && (
            <div className="bg-[var(--surface)] border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-sub)]">
                  Quản lý đồng ý
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-sub)] leading-5">
                Theo NĐ 13/2023/NĐ-CP, bạn có quyền rút lại đồng ý và xóa dữ liệu sinh trắc học bất kỳ lúc nào.
              </p>
              <button
                type="button"
                onClick={handleWithdrawConsent}
                disabled={isWithdrawing}
                className="w-full py-2 rounded-lg text-[12px] font-semibold border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isWithdrawing ? "Đang xử lý..." : "Rút lại đồng ý & xóa dữ liệu"}
              </button>
            </div>
          )}

          {/* Capture + Register panel */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2 flex-shrink-0">
            {canRegister ? (
              <>
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--shell)] border border-[var(--border)] rounded-md">
                  <span className="text-base leading-none">✅</span>
                  <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">
                    Đã đủ 4 ảnh — Nhấn để đăng ký
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className={`w-full py-2.5 rounded-xl font-bold text-[13px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 ${isUploading
                    ? "bg-[var(--shell)] border-2 border-[var(--border)] text-[var(--text-sub)] cursor-not-allowed"
                    : "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--success)] text-[#042f2e] shadow-[0_0_32px_-4px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_-4px_rgba(34,197,94,0.55)] hover:-translate-y-px"
                    }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("dashboard:faceRegistration.buttons.processing")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                      <span>Hoàn tất đăng ký</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <CaptureControls
                canCapture={canCapture}
                isCapturing={isCapturing}
                capturedImagesLength={capturedImages.length}
                maxImages={MAX_IMAGES}
                onCapture={handleCapture}
                currentInstruction={CAPTURE_INSTRUCTIONS[currentImageIndex]}
                currentStep={currentImageIndex}
                totalSteps={MAX_IMAGES}
                livenessRequired={livenessRequiredForCapture}
                onStartLiveness={handleEnableCapture}
              />
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default FaceRegistrationPage;

