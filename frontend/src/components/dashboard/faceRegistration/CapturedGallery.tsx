import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { type CapturedImage } from '@/components/dashboard/pages/FaceRegistrationPage';

interface CapturedGalleryProps {
  images: CapturedImage[];
  onRemove: (index: number) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent, dropIndex: number) => void;
}

// Mirrors CAPTURE_INSTRUCTIONS in FaceRegistrationPage
const SLOT_CONFIG = [
  { icon: "👤", label: "Nhìn thẳng" },
  { icon: "👆", label: "Ngẩng lên" },
  { icon: "👈", label: "Quay trái" },
  { icon: "👉", label: "Quay phải" },
];

export const CapturedGallery: React.FC<CapturedGalleryProps> = ({
  images,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}) => {
  return (
    <div className="grid grid-cols-2 gap-1 px-0 pt-0 pb-1">
      {SLOT_CONFIG.map((cfg, index) => {
        const img = images[index];
        const filled = Boolean(img);
        const qualityPercentage = img ? Math.round(img.qualityScore * 100) : 0;
        const isLowQuality = img ? img.qualityScore < 0.7 : false;

        return (
          <div
            key={index}
            draggable={filled && !isLowQuality}
            onDragStart={(e) => filled && !isLowQuality && onDragStart?.(e, index)}
            onDragOver={(e) => filled && !isLowQuality && onDragOver?.(e, index)}
            onDragEnd={onDragEnd}
            onDrop={(e) => filled && !isLowQuality && onDrop?.(e, index)}
            className={`gallery-slot group ${filled && !isLowQuality ? "cursor-move" : "cursor-default"}`}
            data-filled={filled}
          >
            {!filled && (
              <div className="flex flex-col items-center gap-1 text-[var(--text-sub)]">
                <span className="text-lg opacity-70">{cfg.icon}</span>
                <span className="text-[9px] uppercase tracking-wide font-semibold text-center px-1 leading-tight">
                  {cfg.label}
                </span>
              </div>
            )}

            {filled && img && (
              <>
                <img
                  src={img.dataURL}
                  alt={`Ảnh ${index + 1} — ${cfg.label}`}
                  className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${isLowQuality ? "grayscale" : ""}`}
                />

                {isLowQuality && (
                  <div className="absolute inset-0 bg-[var(--error)]/20 flex items-center justify-center z-10">
                    <AlertCircle className="h-6 w-6 text-[var(--error)]" />
                  </div>
                )}

                {/* Quality badge — top right */}
                <div
                  className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold backdrop-blur-sm z-10 ${isLowQuality
                    ? "bg-[var(--error)]/90 text-white"
                    : "bg-[var(--background)]/85 text-[var(--success)]"
                    }`}
                  style={{ letterSpacing: "0.03em" }}
                >
                  {qualityPercentage}%
                </div>

                {/* Remove button — top left (appears on hover) */}
                <button
                  onClick={() => onRemove(index)}
                  className={`absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full bg-[var(--background)]/90 grid place-items-center transition-opacity duration-200 z-10 ${isLowQuality ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title="Xóa ảnh"
                >
                  <X className="h-[11px] w-[11px] text-[var(--error)]" strokeWidth={2.5} />
                </button>

                {/* Angle badge — bottom */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-[var(--background)]/90 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[var(--text-main)] text-center tracking-wide">
                  {cfg.label}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
