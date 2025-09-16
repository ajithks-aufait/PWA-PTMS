import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addImage, removeImage, selectCycleImages } from '../store/BakingProcessSlice';
import { generateUniqueId } from '../Services/BakingProcessFileUpload';
import FileUploadModal from './FileUploadModal';
import ImagePreview from './ImagePreview';

interface EnhancedBakingProcessImageUploadProps {
  cycleNum: number;
  qualityTourId: string;
  onUploadSuccess?: (imageData: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

// Interface for image display data
interface ImageDisplayData {
  id: string;
  cycleNum: number;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: number;
  isOffline: boolean;
  isFromCamera: boolean;
}

const EnhancedBakingProcessImageUpload: React.FC<EnhancedBakingProcessImageUploadProps> = ({
  cycleNum,
  qualityTourId,
  onUploadSuccess,
  onUploadError,
  className = ""
}) => {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingImageId, setViewingImageId] = useState<string | null>(null);
  
  // Get images for this cycle from Redux
  const cycleImages = useSelector(selectCycleImages(cycleNum));


  const handleImageSelected = async (file: File, isFromCamera: boolean) => {
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
      const uniqueId = generateUniqueId(cycleNum);
      const previewUrl = URL.createObjectURL(file);

      // Convert file to base64 for Redux storage
      const base64Data = await new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(file);
      });
      
      // Create image data for Redux
      const imageData = {
        id: uniqueId,
        cycleNum,
        fileData: base64Data,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: Date.now(),
        qualityTourId,
        previewUrl,
        isFromCamera
      };

      // Store in Redux
      dispatch(addImage(imageData));

      // Create display data for callback
      const displayData: ImageDisplayData = {
        id: uniqueId,
        cycleNum,
        imageUrl: previewUrl,
        fileName: file.name,
        fileSize: file.size,
        uploadTime: Date.now(),
        isOffline: !navigator.onLine,
        isFromCamera
      };

      onUploadSuccess?.(displayData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      dispatch(removeImage(imageId));
      setViewingImageId(null);
    }
  };

  const handleUploadClick = () => {
    setViewingImageId(null);
    setIsModalOpen(true);
  };

  const handleImageClick = (imageId: string) => {
    setViewingImageId(imageId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setViewingImageId(null);
  };

  const handleImageDeleted = (imageId: string) => {
    dispatch(removeImage(imageId));
    setViewingImageId(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Button */}
      <div className="flex items-center justify-between">
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
              <span>Processing...</span>
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
        
        <div className="text-sm text-gray-500">
          {cycleImages.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {cycleImages.length} image{cycleImages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Images Grid */}
      {cycleImages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Uploaded Images ({cycleImages.length}):
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cycleImages.map((imageData) => {
              const displayData: ImageDisplayData = {
                id: imageData.id,
                cycleNum: imageData.cycleNum,
                imageUrl: imageData.previewUrl,
                fileName: imageData.fileName,
                fileSize: imageData.fileSize,
                uploadTime: imageData.timestamp,
                isOffline: !navigator.onLine,
                isFromCamera: imageData.isFromCamera
              };

              return (
                <div key={imageData.id} className="relative">
                  <div 
                    className="cursor-pointer"
                    onClick={() => handleImageClick(imageData.id)}
                  >
                    <ImagePreview
                      imageData={displayData}
                      onRemove={handleRemoveImage}
                      className="max-w-full"
                    />
                  </div>
                  {/* Camera indicator */}
                  {imageData.isFromCamera && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white px-1 py-0.5 rounded text-xs">
                      📷 Camera
                    </div>
                  )}
                  {/* Click to view indicator */}
                  <div className="absolute top-1 right-1 bg-blue-500 text-white px-1 py-0.5 rounded text-xs opacity-0 hover:opacity-100 transition-opacity">
                    👁️ View
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Instructions */}
      {cycleImages.length === 0 && (
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p>• Click "Upload Image" to add photos for this cycle</p>
          <p>• Choose from camera capture or gallery selection</p>
          <p>• Supported formats: JPG, PNG, GIF, WebP</p>
          <p>• Maximum file size: 10MB per image</p>
          <p>• Images are stored locally when offline</p>
        </div>
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onImageSelected={handleImageSelected}
        onImageDeleted={handleImageDeleted}
        cycleNum={cycleNum}
        currentImageId={viewingImageId || undefined}
      />
    </div>
  );
};

export default EnhancedBakingProcessImageUpload;
