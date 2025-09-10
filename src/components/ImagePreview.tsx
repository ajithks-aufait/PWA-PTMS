import React, { useState } from 'react';

// Interface for image display data
interface ImageDisplayData {
  cycleNum: number;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: number;
  isOffline: boolean;
}

interface ImagePreviewProps {
  imageData: ImageDisplayData;
  onRemove?: (cycleNum: number) => void;
  showDetails?: boolean;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  imageData, 
  onRemove, 
  showDetails = true,
  className = ""
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      <div className={`relative group ${className}`}>
        {/* Image Preview */}
        <div 
          className="relative cursor-pointer overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          <img
            src={imageData.imageUrl}
            alt={`Cycle ${imageData.cycleNum} - ${imageData.fileName}`}
            className="w-full h-32 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOUI4MkY2Ii8+Cjwvc3ZnPgo=';
            }}
          />
          
          {/* Overlay with cycle number */}
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
            Cycle {imageData.cycleNum}
          </div>
          
          {/* Offline indicator */}
          {imageData.isOffline && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs">
              Offline
            </div>
          )}
          
          {/* Remove button */}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(imageData.cycleNum);
              }}
              className="absolute bottom-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Image Details */}
        {showDetails && (
          <div className="mt-2 text-sm text-gray-600">
            <div className="font-medium truncate" title={imageData.fileName}>
              {imageData.fileName}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(imageData.fileSize)} • {formatDate(imageData.uploadTime)}
            </div>
          </div>
        )}
      </div>

      {/* Modal for full-size view */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={imageData.imageUrl}
              alt={`Cycle ${imageData.cycleNum} - ${imageData.fileName}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Image info */}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <div className="font-medium">Cycle {imageData.cycleNum}</div>
              <div className="text-sm">{imageData.fileName}</div>
              <div className="text-xs opacity-75">
                {formatFileSize(imageData.fileSize)} • {formatDate(imageData.uploadTime)}
                {imageData.isOffline && " • Offline"}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImagePreview;
