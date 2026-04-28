import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Volume2, VolumeX } from 'lucide-react';

interface InstructionSidebarProps {
  showOnMobile?: boolean;
  currentStep?: string;
  cameraReady?: boolean;
  detectionStatus?: string;
  capturedImagesCount?: number;
  compactRow?: boolean;
  hasRegisteredFace?: boolean;
  livenessVerified?: boolean;
  onStartLiveness?: () => void;
  maxImages?: number;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  voiceToggleTitle?: string;
}

const STEPS = [
  { key: "detecting", labelKey: "step1", threshold: 0 },
  { key: "aligning", labelKey: "step2", threshold: 30 },
  { key: "capturing", labelKey: "step3", threshold: 60 },
  { key: "completed", labelKey: "step4", threshold: 90 },
] as const;

export const InstructionSidebar: React.FC<InstructionSidebarProps> = ({
  currentStep = "detecting",
  capturedImagesCount = 0,
  maxImages = 4,
  voiceEnabled = true,
  onToggleVoice,
  voiceToggleTitle = "Toggle voice guidance",
}) => {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-cyan)"
            strokeWidth="2"
            className="w-3.5 h-3.5"
          >
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span className="font-semibold text-[11px] uppercase tracking-[0.1em] text-[var(--text-sub)]">
            Tiến trình
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/12 px-2.5 py-0.5 text-[11px] font-semibold font-mono tabular-nums text-[var(--accent-cyan)] tracking-wide">
            {Math.min(capturedImagesCount, maxImages)} / {maxImages}
          </span>
          {onToggleVoice && (
            <button
              type="button"
              onClick={onToggleVoice}
              className={`w-8 h-8 rounded-full grid place-items-center border transition-colors ${voiceEnabled
                ? "bg-[var(--accent-cyan)]/12 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]"
                : "bg-[var(--shell)] border-[var(--border)]/80 text-[var(--text-sub)] hover:bg-[var(--surface)] hover:border-[var(--accent-cyan)]/30"
                }`}
              title={voiceToggleTitle}
            >
              {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Step timeline — 4 columns with connector line */}
      <div className="relative grid grid-cols-4 gap-2">
        {/* Connector line behind circles */}
        <div
          className="absolute top-[14px] left-[12%] right-[12%] h-[1.5px] bg-[var(--border)] z-0"
          aria-hidden
        />

        {STEPS.map((step, idx) => {
          const isCompleted = capturedImagesCount > idx;
          const isActive = !isCompleted && currentStep === step.key;
          const state: "completed" | "active" | "pending" = isCompleted
            ? "completed"
            : isActive
              ? "active"
              : "pending";

          const labelText = t(`dashboard:faceRegistration.steps.${step.labelKey}`);

          return (
            <div
              key={step.key}
              className="flex flex-col items-center gap-1.5 text-center relative"
              data-state={state}
            >
              <div className="step-circle" data-state={state}>
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  idx + 1
                )}
              </div>
              <div
                className={`text-[9px] uppercase tracking-[0.04em] font-semibold leading-tight ${isCompleted
                  ? "text-[var(--success)]"
                  : isActive
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--text-sub)]"
                  }`}
              >
                {labelText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
