// Hooks
export { useCameraStream } from '@/hooks/useCameraStream';
export { useFaceDetection } from '@/hooks/useFaceDetection';
export { useAutoCapture } from '@/hooks/useAutoCapture';
export { useVoiceFeedback } from '@/hooks/useVoiceFeedback';

// Components
export { CameraPreview } from './CameraPreview';
export { CaptureControls } from './CaptureControls';
export { CapturedGallery } from './CapturedGallery';
export { InstructionSidebar } from './InstructionSidebar';

// Reducer
export {
  faceRegistrationReducer,
  initialFlowState,
  type FlowState,
  type FlowStateData,
  type FlowAction,
} from './faceRegistrationReducer';


