import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Interface for ALC cycle data (grouped display)
export interface ALCCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  lineno: string;
  previous: string;
  running: string;
  data: Array<{ area: string; records: Array<{ criteria: string; status: string; category: string; remarks: string }> }>;
}

// Interface for offline saved data
interface OfflineSavedData {
  cycleNo: number;
  records: ALCCycleData[];
  timestamp: number;
}

// Interface for the state
interface ALCState {
  // Fetched cycles from API
  fetchedCycles: ALCCycleData[];
  
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
const initialState: ALCState = {
  fetchedCycles: [],
  offlineSavedData: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastFetchTimestamp: null,
};

// Create the slice
const ALCSlice = createSlice({
  name: 'ALC',
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
    setFetchedCycles: (state, action: PayloadAction<ALCCycleData[]>) => {
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
} = ALCSlice.actions;

// Export selectors
export const selectALCState = (state: { ALC: ALCState }) => state.ALC;
export const selectOfflineDataCount = (state: { ALC: ALCState }) => state.ALC.offlineSavedData.length;
export const selectFetchedCycles = (state: { ALC: ALCState }) => state.ALC.fetchedCycles;
export const selectIsLoading = (state: { ALC: ALCState }) => state.ALC.isLoading;
export const selectIsSyncing = (state: { ALC: ALCState }) => state.ALC.isSyncing;
export const selectError = (state: { ALC: ALCState }) => state.ALC.error;

// Export reducer
export default ALCSlice.reducer;
