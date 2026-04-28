import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFaceLiveness, type LivenessChallengeType } from "@/hooks/useFaceLiveness";

interface LivenessGuardProps {
  isOpen: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onPass: (sessionId: string) => void;
  onCancel: () => void;
}

const MAX_RETRIES = 3;
const ACTION_WINDOW_MS = 3500;
const BASELINE_CAPTURE_DELAY_MS = 600;
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;

const CHALLENGE_HINT: Record<LivenessChallengeType, string> = {
  turn_left: "Quay đầu sang trái rồi giữ yên ~2 giây",
  turn_right: "Quay đầu sang phải rồi giữ yên ~2 giây",
  turn_up: "Ngước nhẹ lên trên rồi giữ yên ~2 giây",
  turn_down: "Cúi nhẹ xuống rồi giữ yên ~2 giây",
  blink: "Nháy mắt rõ ràng 1-2 lần",
  smile: "Cười rộng trong ~2 giây",
};

const captureFrame = (video: HTMLVideoElement | null): string | null => {
  if (!video || video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = CAPTURE_WIDTH;
  canvas.height = CAPTURE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
};

const dataURLtoFile = (dataURL: string, filename: string): File => {
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

export const LivenessGuard: React.FC<LivenessGuardProps> = ({
  isOpen,
  videoRef,
  onPass,
  onCancel,
}) => {
  const liveness = useFaceLiveness();
  const [phase, setPhase] = useState<
    "idle" | "starting" | "baseline" | "awaiting_action" | "verifying" | "passed" | "failed"
  >("idle");
  const [countdown, setCountdown] = useState(0);
  const attemptRef = useRef(0);
  const cancelledRef = useRef(false);

  const runAttempt = useCallback(async () => {
    cancelledRef.current = false;
    attemptRef.current += 1;

    setPhase("starting");
    liveness.reset();

    const sessionId = await liveness.startLivenessCheck();
    if (cancelledRef.current) return;
    if (!sessionId) {
      setPhase("failed");
      return;
    }

    await new Promise((r) => setTimeout(r, BASELINE_CAPTURE_DELAY_MS));
    if (cancelledRef.current) return;

    setPhase("baseline");
    const baselineFrame = captureFrame(videoRef.current);
    if (!baselineFrame) {
      toast.error("Không lấy được khung hình camera.");
      setPhase("failed");
      return;
    }
    const baselineFile = dataURLtoFile(baselineFrame, "baseline.jpg");
    const baselineOk = await liveness.captureBaseline(baselineFile as unknown as string);
    if (cancelledRef.current) return;
    if (!baselineOk) {
      setPhase("failed");
      return;
    }

    setPhase("awaiting_action");
    const deadline = Date.now() + ACTION_WINDOW_MS;
    while (Date.now() < deadline) {
      if (cancelledRef.current) return;
      setCountdown(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      await new Promise((r) => setTimeout(r, 200));
    }

    setPhase("verifying");
    const responseFrame = captureFrame(videoRef.current);
    if (!responseFrame) {
      toast.error("Không lấy được khung hình camera.");
      setPhase("failed");
      return;
    }
    const responseFile = dataURLtoFile(responseFrame, "response.jpg");
    const result = await liveness.verifyChallenge(responseFile as unknown as string);
    if (cancelledRef.current) return;

    if (result?.passed) {
      setPhase("passed");
      onPass(sessionId);
      return;
    }

    setPhase("failed");
  }, [liveness, onPass, videoRef]);

  useEffect(() => {
    if (!isOpen) return;
    attemptRef.current = 0;
    cancelledRef.current = false;
    runAttempt();
    return () => {
      cancelledRef.current = true;
      liveness.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRetry = () => {
    if (attemptRef.current >= MAX_RETRIES) {
      toast.error("Quá số lần thử. Vui lòng bắt đầu lại.");
      onCancel();
      return;
    }
    runAttempt();
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    liveness.reset();
    onCancel();
  };

  if (!isOpen) return null;

  const challengeType = liveness.challenge?.type;
  const instruction = challengeType ? CHALLENGE_HINT[challengeType] : "Đang khởi tạo xác thực...";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Xác thực người thật
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Huỷ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === "starting" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Đang khởi tạo...</p>
          </div>
        )}

        {phase === "baseline" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Vui lòng nhìn thẳng vào camera...
            </p>
          </div>
        )}

        {phase === "awaiting_action" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {countdown}
            </div>
            <p className="text-base font-medium text-slate-800 dark:text-slate-100 text-center">
              {instruction}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Thực hiện hành động trong thời gian đếm ngược
            </p>
          </div>
        )}

        {phase === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Đang xác thực...</p>
          </div>
        )}

        {phase === "passed" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Xác thực thành công!
            </p>
          </div>
        )}

        {phase === "failed" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {liveness.error || "Xác thực thất bại. Vui lòng thử lại."}
            </p>
            <p className="text-xs text-slate-500">
              Lần thử: {attemptRef.current} / {MAX_RETRIES}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Huỷ
              </Button>
              {attemptRef.current < MAX_RETRIES && (
                <Button size="sm" onClick={handleRetry}>
                  Thử lại
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LivenessGuard;
