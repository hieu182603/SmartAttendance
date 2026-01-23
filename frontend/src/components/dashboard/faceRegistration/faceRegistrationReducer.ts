import { type CapturedImage } from '@/components/dashboard/pages/FaceRegistrationPage';
import { type FaceDetectionStatus } from '@/hooks/useFaceDetection';

export type FlowState = 'initializing' | 'ready' | 'capturing' | 'processing' | 'completed' | 'error';

export interface FlowStateData {
  currentState: FlowState;
  capturedImages: CapturedImage[];
  progress: number;
  currentStep: string;
  error?: string;
}

export type FlowAction =
  | { type: 'SET_STATE'; payload: FlowState }
  | { type: 'ADD_IMAGE'; payload: CapturedImage }
  | { type: 'REMOVE_IMAGE'; payload: number }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_STEP'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

export const initialFlowState: FlowStateData = {
  currentState: 'initializing',
  capturedImages: [],
  progress: 0,
  currentStep: 'detecting',
};

export const faceRegistrationReducer = (
  state: FlowStateData,
  action: FlowAction
): FlowStateData => {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, currentState: action.payload };

    case 'ADD_IMAGE':
      return {
        ...state,
        capturedImages: [...state.capturedImages, action.payload],
      };

    case 'REMOVE_IMAGE':
      return {
        ...state,
        capturedImages: state.capturedImages.filter((_, index) => index !== action.payload),
      };

    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };

    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, currentState: 'error' };

    case 'CLEAR_ERROR':
      return { ...state, error: undefined };

    case 'RESET':
      return initialFlowState;

    default:
      return state;
  }
};


