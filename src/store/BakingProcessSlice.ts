import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Interface for BakingProcess cycle data
interface BakingProcessCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  sku: string | null;
  proof: string | null;
  remarks: string | null;
}

// Interface for offline file data
interface OfflineFileData {
  id: string; // Unique identifier for the file
  cycleNum: number;
  fileData: string; // Base64 encoded file data
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  qualityTourId: string;
  previewUrl: string; // Object URL for preview
  isFromCamera: boolean; // Track if image was captured from camera
}

// Interface for offline saved data
interface OfflineSavedData {
  cycleNo: number;
  records: BakingProcessCycleData[];
  files: OfflineFileData[];
  timestamp: number;
}

// Interface for the state
interface BakingProcessState {
  // Fetched cycles from API
  fetchedCycles: BakingProcessCycleData[];
  
  // Offline saved data
  offlineSavedData: OfflineSavedData[];
  
  // Offline files pending upload
  offlineFiles: OfflineFileData[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  
  // Error state
  error: string | null;
  
  // Last fetch timestamp
  lastFetchTimestamp: number | null;
}

// Initial state
const initialState: BakingProcessState = {
  fetchedCycles: [],
  offlineSavedData: [],
  offlineFiles: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastFetchTimestamp: null,
};

// Create the slice
const BakingProcessSlice = createSlice({
  name: 'BakingProcess',
  initialState,
  reducers: {
    // Add offline saved data
    addOfflineData: (state, action: PayloadAction<OfflineSavedData>) => {
      state.offlineSavedData.push(action.payload);
    },
    
    // Add offline file
    addOfflineFile: (state, action: PayloadAction<OfflineFileData>) => {
      state.offlineFiles.push(action.payload);
    },
    
    // Add image to Redux store (for both online and offline)
    addImage: (state, action: PayloadAction<OfflineFileData>) => {
      state.offlineFiles.push(action.payload);
    },
    
    // Remove image from Redux store
    removeImage: (state, action: PayloadAction<string>) => {
      const imageId = action.payload;
      const imageIndex = state.offlineFiles.findIndex(img => img.id === imageId);
      if (imageIndex !== -1) {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(state.offlineFiles[imageIndex].previewUrl);
        state.offlineFiles.splice(imageIndex, 1);
      }
    },
    
    // Clear all images for a specific cycle
    clearCycleImages: (state, action: PayloadAction<number>) => {
      const cycleNum = action.payload;
      const imagesToRemove = state.offlineFiles.filter(img => img.cycleNum === cycleNum);
      
      // Revoke object URLs to free memory
      imagesToRemove.forEach(img => URL.revokeObjectURL(img.previewUrl));
      
      state.offlineFiles = state.offlineFiles.filter(img => img.cycleNum !== cycleNum);
    },
    
    // Clear all offline data (for cancel operation)
    clearOfflineData: (state) => {
      // Revoke all object URLs to free memory
      state.offlineFiles.forEach(img => URL.revokeObjectURL(img.previewUrl));
      state.offlineSavedData = [];
      state.offlineFiles = [];
    },
    
    // Remove specific offline data item
    removeOfflineDataItem: (state, action: PayloadAction<number>) => {
      state.offlineSavedData = state.offlineSavedData.filter(
        item => item.cycleNo !== action.payload
      );
      state.offlineFiles = state.offlineFiles.filter(
        item => item.cycleNum !== action.payload
      );
    },
    
    // Remove specific offline file
    removeOfflineFile: (state, action: PayloadAction<number>) => {
      const cycleNum = action.payload;
      const filesToRemove = state.offlineFiles.filter(item => item.cycleNum === cycleNum);
      
      // Revoke object URLs to free memory
      filesToRemove.forEach(file => URL.revokeObjectURL(file.previewUrl));
      
      state.offlineFiles = state.offlineFiles.filter(
        item => item.cycleNum !== action.payload
      );
    },
    
    // Set fetched cycles
    setFetchedCycles: (state, action: PayloadAction<BakingProcessCycleData[]>) => {
      state.fetchedCycles = action.payload;
      state.lastFetchTimestamp = Date.now();
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset state
    resetState: (state) => {
      // Revoke all object URLs to free memory
      state.offlineFiles.forEach(img => URL.revokeObjectURL(img.previewUrl));
      state.fetchedCycles = [];
      state.offlineSavedData = [];
      state.offlineFiles = [];
      state.isLoading = false;
      state.isSyncing = false;
      state.error = null;
      state.lastFetchTimestamp = null;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set syncing state
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
  },
});

// Export actions
export const {
  addOfflineData,
  addOfflineFile,
  addImage,
  removeImage,
  clearCycleImages,
  clearOfflineData,
  removeOfflineDataItem,
  removeOfflineFile,
  setFetchedCycles,
  clearError,
  resetState,
  setLoading,
  setSyncing,
} = BakingProcessSlice.actions;

// Export selectors
export const selectBakingProcessState = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess;
export const selectOfflineDataCount = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.offlineSavedData.length;
export const selectOfflineFilesCount = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.offlineFiles.length;
export const selectOfflineFiles = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.offlineFiles;
export const selectFetchedCycles = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.fetchedCycles;
export const selectIsLoading = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.isLoading;
export const selectIsSyncing = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.isSyncing;
export const selectError = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.error;

// New selectors for image management
export const selectCycleImages = (cycleNum: number) => (state: { bakingProcess: BakingProcessState }) => 
  state.bakingProcess.offlineFiles.filter(img => img.cycleNum === cycleNum);
export const selectAllImages = (state: { bakingProcess: BakingProcessState }) => state.bakingProcess.offlineFiles;

// Export reducer
export default BakingProcessSlice.reducer;
