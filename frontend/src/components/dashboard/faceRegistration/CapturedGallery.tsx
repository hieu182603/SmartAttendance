import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { type CapturedImage } from '../pages/FaceRegistrationPage';

interface CapturedGalleryProps {
  images: CapturedImage[];
  onRemove: (index: number) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent, dropIndex: number) => void;
}

export const CapturedGallery: React.FC<CapturedGalleryProps> = ({
  images,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}) => {
  if (images.length === 0) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2">
      <h3 className="text-sm font-semibold text-white whitespace-nowrap mr-2">
        Captured Images ({images.length})
      </h3>
      {images.map((img, index) => {
        const qualityPercentage = Math.round(img.qualityScore * 100);
        const isLowQuality = img.qualityScore < 0.7;
        const qualityColor =
          qualityPercentage >= 80 ? "text-green-400" :
          qualityPercentage >= 70 ? "text-amber-400" : "text-red-400";

        return (
          <div
            key={index}
            draggable={!isLowQuality}
            onDragStart={(e) => !isLowQuality && onDragStart?.(e, index)}
            onDragOver={(e) => !isLowQuality && onDragOver?.(e, index)}
            onDragEnd={onDragEnd}
            onDrop={(e) => !isLowQuality && onDrop?.(e, index)}
            className={`relative group flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
              isLowQuality
                ? "border-red-500 hover:border-red-600 cursor-default grayscale"
                : "border-gray-700 hover:border-cyan-500 cursor-move"
            }`}
          >
            <img
              src={img.dataURL}
              alt={`Face ${index + 1}${isLowQuality ? ' - Low Quality' : ''}`}
              className="w-24 h-24 object-cover pointer-events-none"
            />

            {/* Low Quality Warning Overlay */}
            {isLowQuality && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
            )}

            <button
              onClick={() => onRemove(index)}
              className={`absolute top-1 right-1 text-white rounded-full p-1 transition-all duration-200 shadow-lg z-10 ${
                isLowQuality ? 'bg-red-500 hover:bg-red-600 opacity-100' : 'bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100'
              }`}
              title="Remove image"
            >
              <X className="h-2 w-2" />
            </button>

            {/* Quality Score Badge */}
            <div className={`absolute top-1 left-1 px-1 py-0.5 rounded text-xs font-semibold backdrop-blur-sm z-10 ${
              isLowQuality ? "bg-red-500/90 text-white" : "bg-green-500/80 text-white"
            }`}>
              {qualityPercentage}%
            </div>

            {/* Low Quality Notice */}
            {isLowQuality && (
              <div className="absolute bottom-6 left-0 right-0 bg-red-600/90 text-white text-xs p-1 transition-opacity z-10">
                <div className="text-center text-white font-semibold">
                  Low Quality - Remove
                </div>
              </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 text-white text-xs p-1 ${
              isLowQuality ? 'bg-red-600/90' : 'bg-black/80'
            }`}>
              <div className="text-center">
                <span className={qualityColor}>
                  {qualityPercentage >= 80 ? "Good" :
                   qualityPercentage >= 70 ? "Fair" : "Low"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


