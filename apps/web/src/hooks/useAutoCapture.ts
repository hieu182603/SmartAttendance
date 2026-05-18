import { useState, useCallback, useRef } from 'react';
import { type CapturedImage } from '@/components/dashboard/pages/FaceRegistrationPage';
import { type FaceQuality, type FaceDetectionStatus } from './useFaceDetection';
import { useFaceValidation } from '@/hooks/useFaceValidation';
import { toast } from 'sonner';

const MIN_QUALITY_SCORE = 0.7;

export interface AutoCaptureState {
    autoCaptureCooldown: number;
    autoCaptureCountdown: number;
    isAutoCapturing: boolean;
    consecutiveGoodFrames: number;
}

export interface AutoCaptureActions {
    startAutoCapture: (countdown?: number) => void;
    cancelAutoCapture: () => void;
    resetConsecutiveFrames: () => void;
    incrementConsecutiveFrames: () => void;
    setCooldown: (seconds: number) => void;
    tickCooldown: () => void;
    shouldTriggerAutoCapture: (params: {
        detectionStatus: FaceDetectionStatus;
        faceQuality: FaceQuality | null;
        capturedImagesLength: number;
        isCapturing: boolean;
    }) => boolean;
    performAutoCapture: (params: {
        capturePhoto: () => CapturedImage | null;
        canvasRef: React.RefObject<HTMLCanvasElement>;
        faceQuality: FaceQuality | null;
        onSuccess: (image: CapturedImage) => void;
        onError: () => void;
    }) => Promise<void>;
}

export const useAutoCapture = (): AutoCaptureState & AutoCaptureActions => {
    const [autoCaptureCooldown, setAutoCaptureCooldown] = useState<number>(0);
    const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number>(0);
    const [isAutoCapturing, setIsAutoCapturing] = useState<boolean>(false);
    const [consecutiveGoodFrames, setConsecutiveGoodFrames] = useState<number>(0);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { validateCapturedImage, getValidationErrors } = useFaceValidation();

    const startAutoCapture = useCallback((countdown = 3) => {
        if (countdownIntervalRef.current) return;

        setIsAutoCapturing(true);
        setAutoCaptureCountdown(countdown);

        countdownIntervalRef.current = setInterval(() => {
            setAutoCaptureCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownIntervalRef.current!);
                    countdownIntervalRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const cancelAutoCapture = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setIsAutoCapturing(false);
        setAutoCaptureCountdown(0);
        setConsecutiveGoodFrames(0);
    }, []);

    const resetConsecutiveFrames = useCallback(() => {
        setConsecutiveGoodFrames(0);
    }, []);

    const incrementConsecutiveFrames = useCallback(() => {
        setConsecutiveGoodFrames(prev => prev + 1);
    }, []);

    const setCooldown = useCallback((seconds: number) => {
        if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
        }

        setAutoCaptureCooldown(seconds);

        cooldownIntervalRef.current = setInterval(() => {
            setAutoCaptureCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownIntervalRef.current!);
                    cooldownIntervalRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const tickCooldown = useCallback(() => {
        setAutoCaptureCooldown(prev => Math.max(0, prev - 1));
    }, []);

    const shouldTriggerAutoCapture = useCallback((params: {
        detectionStatus: FaceDetectionStatus;
        faceQuality: FaceQuality | null;
        capturedImagesLength: number;
        isCapturing: boolean;
    }) => {
        const { detectionStatus, faceQuality, capturedImagesLength, isCapturing } = params;

        return (
            detectionStatus === "good" &&
            faceQuality?.score !== undefined && faceQuality.score >= MIN_QUALITY_SCORE &&
            capturedImagesLength < 10 && // MAX_IMAGES
            autoCaptureCooldown === 0 &&
            !isCapturing &&
            !isAutoCapturing &&
            consecutiveGoodFrames >= 5
        );
    }, [autoCaptureCooldown, isAutoCapturing, consecutiveGoodFrames]);

    const performAutoCapture = useCallback(async (params: {
        capturePhoto: () => CapturedImage | null;
        canvasRef: React.RefObject<HTMLCanvasElement>;
        faceQuality: FaceQuality | null;
        onSuccess: (image: CapturedImage) => void;
        onError: () => void;
    }) => {
        const { capturePhoto, canvasRef, faceQuality, onSuccess, onError } = params;

        const photo = capturePhoto();
        if (photo && canvasRef.current && faceQuality) {
            try {
                const validation = await validateCapturedImage(
                    photo.dataURL,
                    faceQuality,
                    canvasRef.current
                );

                if (validation.isValid) {
                    onSuccess(photo);
                    setCooldown(3); // 3 second cooldown
                } else {
                    const errorMessages = getValidationErrors(validation.issues);
                    toast.warning(errorMessages[0] || "Auto-capture failed");
                    onError();
                }
            } catch (error) {
                console.error('Auto-capture validation error:', error);
                toast.warning("Auto-capture failed");
                onError();
            }
        } else {
            toast.warning("Auto-capture failed");
            onError();
        }

        setIsAutoCapturing(false);
        setConsecutiveGoodFrames(0);
    }, [setCooldown]);

    return {
        autoCaptureCooldown,
        autoCaptureCountdown,
        isAutoCapturing,
        consecutiveGoodFrames,
        startAutoCapture,
        cancelAutoCapture,
        resetConsecutiveFrames,
        incrementConsecutiveFrames,
        setCooldown,
        tickCooldown,
        shouldTriggerAutoCapture,
        performAutoCapture,
    };
};
