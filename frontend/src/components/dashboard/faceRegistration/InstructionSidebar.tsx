import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InstructionSidebarProps {
  showOnMobile?: boolean;
  currentStep?: string;
  cameraReady?: boolean;
  detectionStatus?: string;
  capturedImagesCount?: number;
  compactRow?: boolean;
}

export const InstructionSidebar: React.FC<InstructionSidebarProps> = ({
  showOnMobile = false,
  currentStep = "detecting",
  cameraReady = false,
  detectionStatus = "loading",
  capturedImagesCount = 0,
  compactRow = false
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [showInstructions, setShowInstructions] = useState(showOnMobile);

  const rootClasses = compactRow
    ? "w-full bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 overflow-visible transition-all duration-700 delay-500"
    : "w-full lg:w-1/3 bg-gray-900/95 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-gray-800 overflow-hidden transition-all duration-700 delay-500";

  return (
    <div className={rootClasses}>
      {/* Mobile Instructions Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-green-500 rounded"></span>
            {t("dashboard:faceRegistration.instructions.title")}
          </h3>
          {showInstructions ? <ChevronUp className="h-5 w-5 text-cyan-400" /> : <ChevronDown className="h-5 w-5 text-cyan-400" />}
        </button>
      </div>

      {/* Instructions Content */}
      <div className={`overflow-y-auto transition-all duration-300 ${showInstructions || 'lg:block hidden'}`}>
        <div className="p-6 space-y-6">
          {compactRow ? (
            <div className="w-full">
              {/* Mobile: Stack vertically */}
              <div className="block md:hidden space-y-2">
                {[1, 2, 3, 4].map((step) => {
                  const steps = [
                    { key: "detecting", threshold: 0 },
                    { key: "aligning", threshold: 30 },
                    { key: "capturing", threshold: 60 },
                    { key: "completed", threshold: 90 }
                  ];
                  const stepConfig = steps[step - 1];
                  const isActive = currentStep === stepConfig.key;
                  const isCompleted = capturedImagesCount >= (step === 4 ? 5 : step);

                  // Dynamic descriptions based on current state for mobile
                  let descriptionKey = `dashboard:faceRegistration.steps.step${step}Description`;
                  if (step === 1) {
                    if (!cameraReady) {
                      descriptionKey = "dashboard:faceRegistration.steps.step1DescriptionCamera";
                    } else if (detectionStatus === "none") {
                      descriptionKey = "dashboard:faceRegistration.steps.step1DescriptionPosition";
                    } else if (detectionStatus === "warning") {
                      descriptionKey = "dashboard:faceRegistration.steps.step1DescriptionAdjust";
                    }
                  }

                  return (
                    <div
                      key={step}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${isCompleted ? "bg-green-900/20 border border-green-500/30" :
                        isActive ? "bg-cyan-900/20 border border-cyan-500/30" :
                          "bg-gray-800/40"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all duration-300 ${isCompleted ? "bg-green-500 text-white" :
                        isActive ? "bg-cyan-500 text-white" :
                          "bg-gray-600 text-gray-400"
                        }`}>
                        {isCompleted ? "✓" : step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-colors duration-300 ${isCompleted ? "text-green-400" :
                          isActive ? "text-cyan-400" :
                            "text-gray-400"
                          }`}>
                          {t(`dashboard:faceRegistration.steps.step${step}`)}
                        </p>
                        <p className={`text-xs mt-1 transition-colors duration-300 ${isCompleted ? "text-green-300/70" :
                          isActive ? "text-white" :
                            "text-gray-400"
                          }`}>
                          {t(descriptionKey)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop/Tablet: equal-width cards (4 columns) */}
              <div className="hidden md:grid md:grid-cols-4 gap-3 py-2 px-1 items-stretch">
                {[1, 2, 3, 4].map((step) => {
                  const steps = [
                    { key: "detecting", threshold: 0 },
                    { key: "aligning", threshold: 30 },
                    { key: "capturing", threshold: 60 },
                    { key: "completed", threshold: 90 }
                  ];
                  const stepConfig = steps[step - 1];
                  const isActive = currentStep === stepConfig.key;
                  const isCompleted = capturedImagesCount >= (step === 4 ? 5 : step);

                  // Smart text truncation based on step
                  const getTruncatedText = (fullText: string, step: number) => {
                    const limits = {
                      1: 35, // Camera access step - shorter
                      2: 45, // Face positioning - medium
                      3: 40, // Capturing - medium
                      4: 30  // Review step - shorter
                    };
                    const limit = limits[step as keyof typeof limits] || 40;
                    return fullText && fullText.length > limit ? fullText.slice(0, limit).trim() + '...' : fullText;
                  };

                  const fullDesc = t(`dashboard:faceRegistration.steps.step${step}Description`);
                  const shortDesc = getTruncatedText(fullDesc, step);

                  return (
                    <div
                      key={step}
                      className={`w-full text-center p-3 rounded-lg transition-all duration-200 border flex flex-col justify-between ${isCompleted ? "bg-green-900/20 border-green-500/30" :
                        isActive ? "bg-cyan-900/20 border-cyan-500/30" :
                          "bg-gray-800/40 border-gray-700/50"
                        }`}
                      title={fullDesc}
                    >
                      <div>
                        <div className={`text-sm font-semibold leading-tight mb-1 ${isCompleted ? "text-green-400" : isActive ? "text-cyan-400" : "text-gray-400"}`}>
                          {t(`dashboard:faceRegistration.steps.step${step}`)}
                        </div>
                        <div className="text-xs text-gray-400 leading-tight">
                          {shortDesc}
                        </div>
                      </div>
                      {isActive && step === 3 && (
                        <div className="text-xs text-cyan-300 mt-3 font-medium">
                          {capturedImagesCount}/5
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <h3 className="text-lg font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                  <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-green-500 rounded"></span>
                  {t("dashboard:faceRegistration.instructions.title")}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((step) => {
                    const steps = [
                      { key: "detecting", threshold: 0 },
                      { key: "aligning", threshold: 30 },
                      { key: "capturing", threshold: 60 },
                      { key: "completed", threshold: 90 }
                    ];

                    const stepConfig = steps[step - 1];
                    const isCompleted = capturedImagesCount >= (step === 4 ? 5 : step); // Assuming MIN_IMAGES = 5
                    const isActive = currentStep === stepConfig.key && !isCompleted;
                    const isUpcoming = !isCompleted && !isActive;

                    // Skip completed steps
                    if (isCompleted && step < 4) return null;

                    // Dynamic descriptions based on current state
                    let descriptionKey = `dashboard:faceRegistration.steps.step${step}Description`;
                    if (step === 1) {
                      if (!cameraReady) {
                        descriptionKey = "dashboard:faceRegistration.steps.step1DescriptionCamera";
                      } else if (detectionStatus === "none") {
                        descriptionKey = "dashboard:faceRegistration.steps.step1DescriptionPosition";
                      } else if (detectionStatus === "warning") {
                        descriptionKey = "dashboard:faceRegistration.steps.step1DescriptionAdjust";
                      }
                    } else if (step === 2 && currentStep === "aligning") {
                      descriptionKey = "dashboard:faceRegistration.steps.step2DescriptionActive";
                    } else if (step === 3 && currentStep === "capturing") {
                      descriptionKey = "dashboard:faceRegistration.steps.step3DescriptionActive";
                    }

                    return (
                      <div key={step} className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${isCompleted ? "bg-green-900/20 border border-green-500/30" :
                        isActive ? "bg-cyan-900/30 border border-cyan-500/50 ring-1 ring-cyan-500/20" :
                          "bg-gray-800/50 hover:bg-gray-800"
                        }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all duration-300 ${isCompleted ? "bg-green-500 text-white" :
                          isActive ? "bg-cyan-500 text-white animate-pulse" :
                            "bg-gray-600 text-gray-400"
                          }`}>
                          {isCompleted ? "✓" : step}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium transition-colors duration-300 ${isCompleted ? "text-green-400" :
                            isActive ? "text-cyan-400" :
                              "text-gray-400"
                            }`}>
                            {t(`dashboard:faceRegistration.steps.step${step}`)}
                          </p>
                          <p className={`text-xs mt-1 transition-colors duration-300 ${isCompleted ? "text-green-300/70" :
                            isActive ? "text-white" :
                              "text-gray-400"
                            }`}>
                            {t(descriptionKey)}
                          </p>
                          {isActive && step === 3 && (
                            <p className="text-xs text-cyan-300 mt-1 font-medium">
                              {capturedImagesCount} / 5 images captured
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>

                {/* Tips removed per request */}
              </div>
            </>)}
        </div>
      </div>
    </div>
  );
};
