import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Interface for CodeVerification cycle data
interface CodeVerificationCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  sku: string | null;
  proof: string | null;
  remarks: string | null;
}

// Interface for offline saved data
interface OfflineSavedData {
  cycleNo: number;
  records: CodeVerificationCycleData[];
  timestamp: number;
}

// Interface for the state
interface CodeVerificationState {
  // Fetched cycles from API
  fetchedCycles: CodeVerificationCycleData[];
  
  // Offline saved data
  offlineSavedData: OfflineSavedData[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  
  // Error state
  error: string | null;
  
  // Last fetch timestamp
  lastFetchTimestamp: number | null;
}

// Initial state
const initialState: CodeVerificationState = {
  fetchedCycles: [],
  offlineSavedData: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastFetchTimestamp: null,
};

// Create the slice
const codeVerificationSlice = createSlice({
  name: 'codeVerification',
  initialState,
  reducers: {
    // Add offline saved data
    addOfflineData: (state, action: PayloadAction<OfflineSavedData>) => {
      state.offlineSavedData.push(action.payload);
    },
    
    // Clear all offline data (for cancel operation)
    clearOfflineData: (state) => {
      state.offlineSavedData = [];
    },
    
    // Remove specific offline data item
    removeOfflineDataItem: (state, action: PayloadAction<number>) => {
      state.offlineSavedData = state.offlineSavedData.filter(
        item => item.cycleNo !== action.payload
      );
    },
    
    // Set fetched cycles
    setFetchedCycles: (state, action: PayloadAction<CodeVerificationCycleData[]>) => {
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
  clearOfflineData,
  removeOfflineDataItem,
  setFetchedCycles,
  clearError,
  resetState,
  setLoading,
  setSyncing,
} = codeVerificationSlice.actions;

// Export selectors
export const selectCodeVerificationState = (state: { codeVerification: CodeVerificationState }) => state.codeVerification;
export const selectOfflineDataCount = (state: { codeVerification: CodeVerificationState }) => state.codeVerification.offlineSavedData.length;
export const selectFetchedCycles = (state: { codeVerification: CodeVerificationState }) => state.codeVerification.fetchedCycles;
export const selectIsLoading = (state: { codeVerification: CodeVerificationState }) => state.codeVerification.isLoading;
export const selectIsSyncing = (state: { codeVerification: CodeVerificationState }) => state.codeVerification.isSyncing;
export const selectError = (state: { codeVerification: CodeVerificationState }) => state.codeVerification.error;

// Export reducer
export default codeVerificationSlice.reducer;
