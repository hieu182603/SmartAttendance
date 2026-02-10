import { useState, useRef, useCallback } from 'react';
import { faceService } from '@/services/faceService';
import { toast } from 'sonner';

export type LivenessChallengeType = 
  | 'turn_left' 
  | 'turn_right' 
  | 'turn_up' 
  | 'turn_down' 
  | 'blink' 
  | 'smile';

export interface LivenessChallenge {
  type: LivenessChallengeType;
  instruction: string;
  challenge_id: number;
  timeout_seconds: number;
}

export interface LivenessPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface LivenessResult {
  success: boolean;
  passed: boolean;
  challenge: string;
  confidence: number;
  expected_pose?: LivenessPose;
  actual_pose?: LivenessPose;
  error_message?: string;
}

export interface LivenessState {
  isActive: boolean;
  isLoading: boolean;
  challenge: LivenessChallenge | null;
  baselinePose: LivenessPose | null;
  currentPose: LivenessPose | null;
  step: 'idle' | 'started' | 'baseline_captured' | 'verified' | 'failed';
  result: LivenessResult | null;
  error: string | null;
  retryCount: number;
}

export interface LivenessActions {
  startLivenessCheck: () => Promise<boolean>;
  captureBaseline: (imageDataUrl: string) => Promise<boolean>;
  verifyChallenge: (imageDataUrl: string) => Promise<LivenessResult | null>;
  reset: () => void;
  getInstruction: (challengeType: LivenessChallengeType) => string;
}

const CHALLENGE_INSTRUCTIONS: Record<LivenessChallengeType, string> = {
  turn_left: 'Quay đầu sang trái',
  turn_right: 'Quay đầu sang phải',
  turn_up: 'Ngước lên trên',
  turn_down: 'Cúi xuống',
  blink: 'Nháy mắt',
  smile: 'Cười',
};

const MAX_RETRIES = 3;

export const useFaceLiveness = (): LivenessState & LivenessActions => {
  const [state, setState] = useState<LivenessState>({
    isActive: false,
    isLoading: false,
    challenge: null,
    baselinePose: null,
    currentPose: null,
    step: 'idle',
    result: null,
    error: null,
    retryCount: 0,
  });

  const sessionIdRef = useRef<string | null>(null);

  const getInstruction = useCallback((challengeType: LivenessChallengeType): string => {
    return CHALLENGE_INSTRUCTIONS[challengeType] || 'Thực hiện hành động được yêu cầu';
  }, []);

  const startLivenessCheck = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await faceService.createLivenessSession();
      
      if (response.success) {
        sessionIdRef.current = response.session_id;
        
        setState(prev => ({
          ...prev,
          isActive: true,
          isLoading: false,
          challenge: response.challenge as LivenessChallenge,
          step: 'started',
          error: null,
        }));

        return true;
      } else {
        throw new Error('Failed to create liveness session');
      }
    } catch (error: any) {
      console.error('Failed to start liveness check:', error);
      const errorMessage = error.response?.data?.message || 'Không thể bắt đầu xác thực liveness';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      return false;
    }
  }, []);

  const captureBaseline = useCallback(async (imageDataUrl: string): Promise<boolean> => {
    if (!sessionIdRef.current) {
      setState(prev => ({ ...prev, error: 'Session không tồn tại' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await faceService.captureLivenessBaseline(
        sessionIdRef.current,
        imageDataUrl
      );

      if (response.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          baselinePose: response.baseline_pose,
          step: 'baseline_captured',
          error: null,
        }));

        return true;
      } else {
        throw new Error(response.error || 'Failed to capture baseline');
      }
    } catch (error: any) {
      console.error('Failed to capture baseline:', error);
      const errorMessage = error.response?.data?.message || 'Không thể chụp ảnh baseline';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      return false;
    }
  }, []);

  const verifyChallenge = useCallback(async (imageDataUrl: string): Promise<LivenessResult | null> => {
    if (!sessionIdRef.current) {
      const error: LivenessResult = {
        success: false,
        passed: false,
        challenge: 'unknown',
        confidence: 0,
        error_message: 'Session không tồn tại',
      };
      setState(prev => ({ ...prev, result: error, step: 'failed', error: error.error_message || undefined }));
      return error;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await faceService.verifyLivenessResponse(
        sessionIdRef.current,
        imageDataUrl
      );

      const result: LivenessResult = {
        success: response.success,
        passed: response.passed,
        challenge: response.challenge,
        confidence: response.confidence,
        expected_pose: response.expected_pose,
        actual_pose: response.actual_pose,
        error_message: response.error_message,
      };

      if (response.success) {
        if (response.passed) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            currentPose: response.actual_pose,
            result,
            step: 'verified',
            error: null,
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            currentPose: response.actual_pose,
            result,
            step: 'failed',
            error: response.error_message || 'Xác thực liveness thất bại',
            retryCount: prev.retryCount + 1,
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          result,
          step: 'failed',
          error: response.error_message || 'Lỗi xác thực',
          retryCount: prev.retryCount + 1,
        }));
      }

      return result;
    } catch (error: any) {
      console.error('Failed to verify challenge:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi xác thực liveness';
      const result: LivenessResult = {
        success: false,
        passed: false,
        challenge: state.challenge?.type || 'unknown',
        confidence: 0,
        error_message: errorMessage,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        result,
        step: 'failed',
        error: errorMessage,
        retryCount: prev.retryCount + 1,
      }));

      toast.error(errorMessage);
      return result;
    }
  }, [state.challenge?.type]);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    setState({
      isActive: false,
      isLoading: false,
      challenge: null,
      baselinePose: null,
      currentPose: null,
      step: 'idle',
      result: null,
      error: null,
      retryCount: 0,
    });
  }, []);

  return {
    ...state,
    startLivenessCheck,
    captureBaseline,
    verifyChallenge,
    reset,
    getInstruction,
  };
};

export default useFaceLiveness;

