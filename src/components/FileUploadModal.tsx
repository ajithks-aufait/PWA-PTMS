import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectCycleImages } from '../store/BakingProcessSlice';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (file: File, isFromCamera: boolean) => void;
  onImageDeleted?: (imageId: string) => void;
  cycleNum: number;
  currentImageId?: string; // ID of the image being viewed/edited
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onImageSelected,
  onImageDeleted,
  cycleNum,
  currentImageId
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get the current image being viewed
  const cycleImages = useSelector(selectCycleImages(cycleNum));
  const currentImage = currentImageId ? cycleImages.find(img => img.id === currentImageId) : null;

  // Check if camera is available
  const isCameraAvailable = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCameraCapture = async () => {
    try {
      setIsCapturing(true);
      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Camera access denied or not available');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `baking_cycle_${cycleNum}_${timestamp}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        onImageSelected(file, true);
        stopCamera();
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelected(file, false);
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleDeleteImage = () => {
    if (currentImageId && onImageDeleted) {
      if (window.confirm('Are you sure you want to delete this image?')) {
        onImageDeleted(currentImageId);
        stopCamera();
        onClose();
      }
    } else {
      // If no specific image to delete, just close
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentImage ? `View Image - Cycle ${cycleNum}` : `Upload Image - Cycle ${cycleNum}`}
          </h3>
        </div>

        {/* Content */}
        <div className="p-4">
          {currentImage ? (
            /* View existing image */
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img
                  src={currentImage.previewUrl}
                  alt={`Cycle ${cycleNum} - ${currentImage.fileName}`}
                  className="w-full h-64 object-contain"
                />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <div className="font-medium">File: {currentImage.fileName}</div>
                  <div className="text-xs">
                    Size: {formatFileSize(currentImage.fileSize)} • 
                    {currentImage.isFromCamera ? ' 📷 Camera' : ' 🖼️ Gallery'} • 
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteImage}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Image</span>
                </button>
              </div>
            </div>
          ) : !isCapturing ? (
            <div className="space-y-4">
              {/* Camera Option */}
              {isCameraAvailable ? (
                <button
                  onClick={handleCameraCapture}
                  className="w-full flex items-center justify-center space-x-3 p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Take Photo</div>
                    <div className="text-sm text-gray-500">Capture using device camera</div>
                  </div>
                </button>
              ) : (
                <div className="w-full p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium text-gray-500">Camera Not Available</div>
                      <div className="text-sm text-gray-400">Use gallery option instead</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gallery Option */}
              <button
                onClick={handleGallerySelect}
                className="w-full flex items-center justify-center space-x-3 p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
              >
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Choose from Gallery</div>
                  <div className="text-sm text-gray-500">Select existing photo</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera Error */}
              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-600">{cameraError}</div>
                </div>
              )}

              {/* Camera Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>

              {/* Camera Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={capturePhoto}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Capture Photo</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUploadModal;
