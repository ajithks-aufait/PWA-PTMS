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
  cycleNum: number;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: number;
  qualityTourId: string;
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
    
    // Clear all offline data (for cancel operation)
    clearOfflineData: (state) => {
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

// Export reducer
export default BakingProcessSlice.reducer;
