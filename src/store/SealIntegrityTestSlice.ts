import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Interface for SealIntegrityTest cycle data
interface SealIntegrityTestCycleData {
  cycleNum: string;
  observedtime: string;
  product: string;
  executiveName: string;
  machineNo: string;
  sampleqty: string;
  leakageno: string;
  leakagetype: string;
}

// Interface for offline saved data
interface OfflineSavedData {
  cycleNo: number;
  records: SealIntegrityTestCycleData[];
  timestamp: number;
}

// Interface for the state
interface SealIntegrityTestState {
  // Fetched cycles from API
  fetchedCycles: SealIntegrityTestCycleData[];
  
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
const initialState: SealIntegrityTestState = {
  fetchedCycles: [],
  offlineSavedData: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastFetchTimestamp: null,
};

// Create the slice
const SealIntegrityTestSlice = createSlice({
  name: 'SealIntegrityTest',
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
    setFetchedCycles: (state, action: PayloadAction<SealIntegrityTestCycleData[]>) => {
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
} = SealIntegrityTestSlice.actions;

// Export selectors
export const selectSealIntegrityTestState = (state: { sealIntegrityTest: SealIntegrityTestState }) => state.sealIntegrityTest;
export const selectOfflineDataCount = (state: { sealIntegrityTest: SealIntegrityTestState }) => state.sealIntegrityTest.offlineSavedData.length;
export const selectFetchedCycles = (state: { sealIntegrityTest: SealIntegrityTestState }) => state.sealIntegrityTest.fetchedCycles;
export const selectIsLoading = (state: { sealIntegrityTest: SealIntegrityTestState }) => state.sealIntegrityTest.isLoading;
export const selectIsSyncing = (state: { sealIntegrityTest: SealIntegrityTestState }) => state.sealIntegrityTest.isSyncing;
export const selectError = (state: { sealIntegrityTest: SealIntegrityTestState }) => state.sealIntegrityTest.error;

// Export reducer
export default SealIntegrityTestSlice.reducer;
