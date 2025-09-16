import store from '../store/store';
import { addOfflineFile, setSyncing, removeImage } from '../store/BakingProcessSlice';
import { loginRequest } from "../auth/authConfig";


// Interface for save response
export interface SaveResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Interface for image display data
export interface ImageDisplayData {
  id: string;
  cycleNum: number;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: number;
  isOffline: boolean;
  isFromCamera: boolean;
}

// Interface for offline file data
export interface OfflineFileData {
  id: string;
  cycleNum: number;
  fileData: string; // Base64 encoded file data
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  qualityTourId: string;
  previewUrl: string; // Object URL for preview
  isFromCamera: boolean;
}

// Check if device is online
const isOnline = (): boolean => navigator.onLine;

// Helper function to convert File to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Helper function to convert base64 to File
export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}

// Create image preview URL from file
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

// Store file offline in Redux
export async function storeFileOffline(cycleNum: number, file: File, qualityTourId: string, isFromCamera: boolean = false): Promise<void> {
  const uniqueId = `img_${cycleNum}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const previewUrl = URL.createObjectURL(file);
  
  try {
    const fileData = await fileToBase64(file);
    
    const offlineFileData: OfflineFileData = {
      id: uniqueId,
      cycleNum,
      fileData,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: Date.now(),
      qualityTourId,
      previewUrl,
      isFromCamera
    };
    
    store.dispatch(addOfflineFile(offlineFileData));
    console.log(`File stored offline for Cycle ${cycleNum}:`, file.name);
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw error;
  }
}

// Get image display data for a cycle
export function getImageDisplayData(cycleNum: number): ImageDisplayData[] {
  const state = store.getState();
  const offlineFiles = state.bakingProcess.offlineFiles;
  
  const cycleFiles = offlineFiles.filter(file => file.cycleNum === cycleNum);
  
  return cycleFiles.map(offlineFile => ({
    id: offlineFile.id,
    cycleNum: offlineFile.cycleNum,
    imageUrl: offlineFile.previewUrl,
    fileName: offlineFile.fileName,
    fileSize: offlineFile.fileSize,
    uploadTime: offlineFile.timestamp,
    isOffline: true,
    isFromCamera: offlineFile.isFromCamera
  }));
}

// Get all uploaded images for display
export function getAllUploadedImages(): ImageDisplayData[] {
  const state = store.getState();
  const offlineFiles = state.bakingProcess.offlineFiles;
  
  return offlineFiles.map(file => ({
    id: file.id,
    cycleNum: file.cycleNum,
    imageUrl: file.previewUrl,
    fileName: file.fileName,
    fileSize: file.fileSize,
    uploadTime: file.timestamp,
    isOffline: true,
    isFromCamera: file.isFromCamera
  }));
}

// SharePoint file upload for Baking Process images
export async function uploadFileToSharePoint(cycleNum: number, QualityTourId: string, accessToken: string): Promise<SaveResponse> {
  try {
    // Get the file from dynamic input
    const fileInput = document.getElementById(`attachment-${cycleNum}`) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      return { success: false, message: "Please select a file before uploading" };
    }

    // Check if offline - store in Redux instead of uploading
    if (!isOnline()) {
      await storeFileOffline(cycleNum, file, QualityTourId);
      const imageData = getImageDisplayData(cycleNum);
      return { 
        success: true, 
        message: `File "${file.name}" stored offline for Cycle ${cycleNum}. Will upload when online.`,
        data: imageData
      };
    }

    return await uploadFileToSharePointWithAuth(file, QualityTourId, cycleNum, accessToken);

  } catch (error) {
    console.error("Upload error:", error);
    
    // If upload fails and we have a file, store it offline
    const fileInput = document.getElementById(`attachment-${cycleNum}`) as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (file) {
      await storeFileOffline(cycleNum, file, QualityTourId);
      const imageData = getImageDisplayData(cycleNum);
      return { 
        success: true, 
        message: `Upload failed, file "${file.name}" stored offline for Cycle ${cycleNum}. Will retry when online.`,
        data: imageData
      };
    }
    
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to upload file. Please check console for details." 
    };
  }
}

// Upload file directly from Redux store (for enhanced upload system)
export async function uploadFileFromRedux(fileData: OfflineFileData, accessToken: string): Promise<SaveResponse> {
  try {
    const { fileData: base64Data, cycleNum, qualityTourId, fileName, fileType } = fileData;

    if (!base64Data) {
      return { success: false, message: "No file data provided for upload" };
    }

    // Check if offline - return error as file should already be in Redux
    if (!isOnline()) {
      return { 
        success: false, 
        message: "Cannot upload while offline. File will be synced when online." 
      };
    }

    // Convert base64 back to File object
    const file = base64ToFile(base64Data, fileName, fileType);

    return await uploadFileToSharePointWithAuth(file, qualityTourId, cycleNum, accessToken);

  } catch (error) {
    console.error("Upload error:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to upload file. Please check console for details." 
    };
  }
}

// Core SharePoint upload function with authentication
async function uploadFileToSharePointWithAuth(file: File, qualityTourId: string, cycleNum: number, accessToken: string): Promise<SaveResponse> {
  if (!accessToken) {
    throw new Error('Access token is invalid or missing');
  }

  // Get SharePoint context info
  const digestResponse = await fetch(
    "https://bectors.sharepoint.com/sites/PTMS_PRD/_api/contextinfo",
    {
      method: "POST",
      headers: { 
        "Accept": "application/json;odata=verbose",
        "Authorization": `Bearer ${accessToken}`
      }
    }
  );

  if (!digestResponse.ok) {
    throw new Error(`Failed to get context info: ${digestResponse.status}`);
  }

  const digestData = await digestResponse.json();
  const formDigestValue = digestData.d.GetContextWebInformation.FormDigestValue;
  const siteUrl = "https://bectors.sharepoint.com/sites/PTMS_PRD";
  const libraryName = "BakingProcessDocuments";

  // Upload file to SharePoint
  const uploadUrl = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${libraryName}')/Files/add(url='${file.name}',overwrite=true)?$expand=ListItemAllFields`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json;odata=verbose",
      "X-RequestDigest": formDigestValue,
      "Authorization": `Bearer ${accessToken}`
    },
    body: file
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(errorText);
  }

  const uploadResult = await uploadResponse.json();
  const listItemId = uploadResult.d.ListItemAllFields.Id;

  console.log(`File uploaded (Cycle ${cycleNum}):`, uploadResult);

  // Get list item entity type
  const entityResponse = await fetch(
    `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')?$select=ListItemEntityTypeFullName`,
    {
      method: "GET",
      headers: { 
        "Accept": "application/json;odata=verbose",
        "Authorization": `Bearer ${accessToken}`
      }
    }
  );

  if (!entityResponse.ok) {
    throw new Error(`Failed to get entity type: ${entityResponse.status}`);
  }

  const entityData = await entityResponse.json();
  const listItemEntityType = entityData.d.ListItemEntityTypeFullName;
  const itemUrl = `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')/items(${listItemId})`;

  // Update metadata with QualityTourId
  const updateBody = {
    __metadata: { type: listItemEntityType },
    QualityId: qualityTourId
  };

  const updateResponse = await fetch(itemUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json;odata=verbose",
      "Content-Type": "application/json;odata=verbose",
      "X-RequestDigest": formDigestValue,
      "Authorization": `Bearer ${accessToken}`,
      "IF-MATCH": "*",
      "X-HTTP-Method": "MERGE"
    },
    body: JSON.stringify(updateBody)
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error("Metadata update failed: " + errorText);
  }

  return { 
    success: true, 
    message: `File "${file.name}" uploaded successfully for Cycle ${cycleNum}`,
    data: { uploadResult }
  };
}

// Upload specific file from Redux store
export async function uploadSingleFile(fileId: string, accessToken: string): Promise<SaveResponse> {
  try {
    const state = store.getState();
    const offlineFiles = state.bakingProcess.offlineFiles;
    const fileToUpload = offlineFiles.find(file => file.id === fileId);
    
    if (!fileToUpload) {
      return { success: false, message: "File not found in store" };
    }

    const result = await uploadFileFromRedux(fileToUpload, accessToken);
    
    if (result.success) {
      // Remove from Redux store after successful upload
      store.dispatch(removeImage(fileId));
    }
    
    return result;
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload file"
    };
  }
}

// Upload all images for a specific cycle
export async function uploadCycleImages(cycleNum: number, accessToken: string): Promise<SaveResponse> {
  try {
    const state = store.getState();
    const offlineFiles = state.bakingProcess.offlineFiles;
    const cycleFiles = offlineFiles.filter(file => file.cycleNum === cycleNum);
    
    if (cycleFiles.length === 0) {
      return { success: true, message: "No images to upload for this cycle" };
    }

    store.dispatch(setSyncing(true));
    
    const results: any[] = [];
    const errors: string[] = [];
    const uploadedFileIds: string[] = [];
    
    for (const fileData of cycleFiles) {
      try {
        const result = await uploadFileFromRedux(fileData, accessToken);
        
        if (result.success) {
          uploadedFileIds.push(fileData.id);
          results.push(result);
        } else {
          errors.push(`File ${fileData.fileName}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`File ${fileData.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Remove successfully uploaded files from Redux
    uploadedFileIds.forEach(fileId => {
      store.dispatch(removeImage(fileId));
    });
    
    store.dispatch(setSyncing(false));
    
    if (errors.length > 0) {
      return {
        success: false,
        message: `Some files failed to upload: ${errors.join(', ')}`,
        data: results
      };
    }
    
    return {
      success: true,
      message: `Successfully uploaded ${results.length} images for Cycle ${cycleNum}`,
      data: results
    };
    
  } catch (error) {
    store.dispatch(setSyncing(false));
    console.error("Upload error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload cycle images"
    };
  }
}

// Upload offline files when coming back online
export async function syncOfflineFiles(accessToken: string): Promise<SaveResponse> {
  try {
    const state = store.getState();
    const offlineFiles = state.bakingProcess.offlineFiles;
    
    if (offlineFiles.length === 0) {
      return { success: true, message: "No offline files to sync" };
    }

    store.dispatch(setSyncing(true));
    
    const results: any[] = [];
    const errors: string[] = [];
    const uploadedFileIds: string[] = [];
    
    for (const offlineFile of offlineFiles) {
      try {
        const result = await uploadFileFromRedux(offlineFile, accessToken);
        
        if (result.success) {
          uploadedFileIds.push(offlineFile.id);
          results.push(result);
        } else {
          errors.push(`Cycle ${offlineFile.cycleNum}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`Cycle ${offlineFile.cycleNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Remove successfully uploaded files from Redux
    uploadedFileIds.forEach(fileId => {
      store.dispatch(removeImage(fileId));
    });
    
    store.dispatch(setSyncing(false));
    
    if (errors.length > 0) {
      return {
        success: false,
        message: `Some files failed to sync: ${errors.join(', ')}`,
        data: results
      };
    }
    
    return {
      success: true,
      message: `Successfully synced ${results.length} offline files`,
      data: results
    };
    
  } catch (error) {
    store.dispatch(setSyncing(false));
    console.error("Sync error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync offline files"
    };
  }
}

// Validate file before processing
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }

  return { isValid: true };
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate unique ID for files
export function generateUniqueId(cycleNum: number): string {
  return `img_${cycleNum}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get MSAL token (to be called from components)
export async function getMsalToken(instance: any, accounts: any[]): Promise<string | null> {
  try {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.accessToken;
  } catch (error) {
    console.error('Error getting MSAL token:', error);
    return null;
  }
}
