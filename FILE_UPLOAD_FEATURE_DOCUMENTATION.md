# Baking Process Record - File Upload Feature

## Overview

This document describes the comprehensive file upload feature implemented for the Baking Process Record section. The feature includes camera capture, gallery selection, Redux integration, API calls, and offline support.

## Features Implemented

### 1. Upload Options
- **Camera Capture**: Direct photo capture using device camera
- **Gallery Selection**: Choose existing photos from device storage
- **File Validation**: Image format and size validation (max 10MB)
- **Multiple Images**: Support for multiple images per cycle

### 2. Redux Integration
- **Image Storage**: Store image objects in Redux with preview URLs
- **State Management**: Add, remove, and manage images in Redux store
- **Memory Management**: Automatic cleanup of object URLs to prevent memory leaks
- **Unique IDs**: Each image gets a unique identifier for proper tracking

### 3. Save & API Integration
- **Section Save**: Calls existing save section API
- **Image Upload**: Uploads images to SharePoint after section save
- **Error Handling**: Comprehensive error handling and user feedback
- **Success Tracking**: Links uploaded images to saved sections

### 4. Offline Support
- **Offline Storage**: Images stored in Redux when offline
- **Sync Queue**: Offline images queued for upload when online
- **Cancel Option**: Ability to cancel offline operations
- **Sync Manager**: Dedicated component for managing offline data

## Components Created

### 1. FileUploadModal.tsx
**Purpose**: Modal component for camera and gallery selection

**Features**:
- Camera access with back camera preference
- Real-time camera preview
- Photo capture functionality
- Gallery file selection
- Error handling for camera access
- Responsive design

**Usage**:
```tsx
<FileUploadModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onImageSelected={handleImageSelected}
  cycleNum={currentCycle}
/>
```

### 2. EnhancedBakingProcessImageUpload.tsx
**Purpose**: Main image upload component with Redux integration

**Features**:
- Integration with FileUploadModal
- Redux state management
- Image preview grid
- Delete functionality
- Upload progress indication
- File validation

**Usage**:
```tsx
<EnhancedBakingProcessImageUpload
  cycleNum={currentCycle}
  qualityTourId={plantTourId || ''}
  onUploadSuccess={handleUploadSuccess}
  onUploadError={handleUploadError}
/>
```

### 3. OfflineSyncManager.tsx
**Purpose**: Component for managing offline data sync operations

**Features**:
- Display offline data count
- Sync all offline data
- Cancel offline operations
- Progress indication
- Error handling and feedback

**Usage**:
```tsx
<OfflineSyncManager className="mb-4" />
```

## Redux Integration

### Updated BakingProcessSlice.ts

**New Actions**:
- `addImage`: Add image to Redux store
- `removeImage`: Remove specific image by ID
- `clearCycleImages`: Clear all images for a cycle
- Enhanced memory management with object URL cleanup

**New Selectors**:
- `selectCycleImages`: Get images for specific cycle
- `selectAllImages`: Get all stored images

**Updated Interfaces**:
```typescript
interface OfflineFileData {
  id: string; // Unique identifier
  cycleNum: number;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  qualityTourId: string;
  previewUrl: string; // Object URL for preview
  isFromCamera: boolean; // Track camera vs gallery
}
```

## API Integration

### Updated BakingProcesRecord.ts

**New Functions**:
- `uploadSingleFile`: Upload specific file by ID
- `uploadCycleImages`: Upload all images for a cycle
- `syncOfflineFiles`: Sync all offline files
- Enhanced error handling and progress tracking

**Updated Functions**:
- `storeFileOffline`: Now includes unique ID and preview URL
- `getImageDisplayData`: Returns array of images instead of single image
- `getAllUploadedImages`: Updated with new data structure

## Usage Flow

### Online Mode
1. User clicks "Upload Image" button
2. FileUploadModal opens with camera/gallery options
3. User selects or captures image
4. Image is stored in Redux with preview URL
5. On "Save Session", section data is saved first
6. Then all cycle images are uploaded to SharePoint
7. Successful uploads are removed from Redux store

### Offline Mode
1. User captures/selects images (stored in Redux)
2. Section data is saved locally in Redux
3. OfflineSyncManager shows pending data
4. When online, user can sync all data
5. Or cancel to discard offline data

## File Structure

```
src/
├── components/
│   ├── FileUploadModal.tsx              # Camera/gallery modal
│   ├── EnhancedBakingProcessImageUpload.tsx  # Main upload component
│   ├── OfflineSyncManager.tsx           # Sync management
│   └── BakingProcessRecord.tsx          # Updated main component
├── store/
│   └── BakingProcessSlice.ts            # Updated Redux slice
└── Services/
    └── BakingProcesRecord.ts            # Updated API functions
```

## Key Features

### Camera Integration
- Uses `navigator.mediaDevices.getUserMedia()` for camera access
- Prefers back camera (`facingMode: 'environment'`)
- High resolution capture (1920x1080)
- Canvas-based photo capture with quality control

### Memory Management
- Object URLs created for image previews
- Automatic cleanup when images are removed
- Redux state cleanup on component unmount

### Error Handling
- Camera access denied handling
- File validation (type, size)
- Network error handling
- User-friendly error messages

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Responsive image grids
- Adaptive modal sizing

## Configuration

### File Limits
- Maximum file size: 10MB
- Supported formats: JPG, PNG, GIF, WebP
- Multiple images per cycle supported

### SharePoint Integration
- Library: `BakingProcessDocuments`
- Metadata: QualityTourId linking
- Overwrite existing files with same name

## Testing Considerations

### Camera Testing
- Test on actual mobile devices
- Verify back camera preference
- Test camera permission handling
- Verify photo capture quality

### Offline Testing
- Test offline image storage
- Verify sync functionality
- Test cancel operations
- Memory usage monitoring

### Error Scenarios
- Camera access denied
- Network failures
- File size exceeded
- Invalid file formats

## Future Enhancements

### Potential Improvements
1. **Image Compression**: Client-side compression before upload
2. **Batch Upload**: Progress bar for multiple file uploads
3. **Image Editing**: Basic crop/rotate functionality
4. **Cloud Storage**: Alternative storage options
5. **Thumbnail Generation**: Server-side thumbnail creation
6. **Metadata Extraction**: EXIF data handling

### Performance Optimizations
1. **Lazy Loading**: Load images on demand
2. **Virtual Scrolling**: For large image lists
3. **WebP Support**: Modern image format support
4. **Progressive Loading**: Show low-res previews first

## Troubleshooting

### Common Issues

**Camera not working**:
- Check browser permissions
- Verify HTTPS connection
- Test on actual device (not simulator)

**Images not uploading**:
- Check network connection
- Verify SharePoint permissions
- Check file size limits

**Memory issues**:
- Monitor object URL cleanup
- Check Redux state size
- Restart app if needed

### Debug Tools
- Redux DevTools for state inspection
- Network tab for API calls
- Console logs for detailed error info
- Browser storage inspection

## Conclusion

The file upload feature provides a comprehensive solution for image capture and management in the Baking Process Record section. It includes modern camera integration, robust offline support, and seamless Redux integration while maintaining excellent user experience and performance.
