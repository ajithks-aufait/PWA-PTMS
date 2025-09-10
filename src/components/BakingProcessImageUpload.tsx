import React, { useState, useRef } from 'react';
import { uploadFileToSharePoint, getImageDisplayData } from '../Services/BakingProcesRecord';
import ImagePreview from './ImagePreview';

// Interface for image display data
interface ImageDisplayData {
  cycleNum: number;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: number;
  isOffline: boolean;
}

interface BakingProcessImageUploadProps {
  cycleNum: number;
  qualityTourId: string;
  onUploadSuccess?: (imageData: ImageDisplayData) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

const BakingProcessImageUpload: React.FC<BakingProcessImageUploadProps> = ({
  cycleNum,
  qualityTourId,
  onUploadSuccess,
  onUploadError,
  className = ""
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<ImageDisplayData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if there's already an uploaded image for this cycle
  React.useEffect(() => {
    const existingImage = getImageDisplayData(cycleNum);
    if (existingImage) {
      setUploadedImage(existingImage);
    }
  }, [cycleNum]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onUploadError?.('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError?.('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadFileToSharePoint(cycleNum, qualityTourId);
      
      if (result.success) {
        const imageData = result.data;
        setUploadedImage(imageData);
        onUploadSuccess?.(imageData);
      } else {
        onUploadError?.(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    // You can add logic here to remove from Redux store if needed
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Upload Image</span>
            </>
          )}
        </button>
        
        <span className="text-sm text-gray-500">
          Cycle {cycleNum} • Max 10MB
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`attachment-${cycleNum}`}
      />

      {/* Image Preview */}
      {uploadedImage && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Image:</h4>
          <ImagePreview
            imageData={uploadedImage}
            onRemove={handleRemoveImage}
            className="max-w-xs"
          />
        </div>
      )}

      {/* Upload Instructions */}
      {!uploadedImage && (
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p>• Click "Upload Image" to select a photo for this cycle</p>
          <p>• Supported formats: JPG, PNG, GIF, WebP</p>
          <p>• Maximum file size: 10MB</p>
          <p>• Images are stored offline when no internet connection is available</p>
        </div>
      )}
    </div>
  );
};

export default BakingProcessImageUpload;
