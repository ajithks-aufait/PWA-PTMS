import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Interface for OPRP/CCP cycle data (supports both API-fetched and local saved shapes)
interface OPRPAndCCPCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  // Old/local save fields (summary strings)
  sku?: string | null;
  proof?: string | null;
  remarks?: string | null;
  // API fields for detailed statuses
  batchNo?: string | null;
  location?: string | null;
  category?: string | null;
  fecentrepass1?: string | null;
  fecentrepass2?: string | null;
  nfecentrepass1?: string | null;
  nfecentrepass2?: string | null;
  sscentrepass1?: string | null;
  sscentrepass2?: string | null;
  md?: string | null;
}

// Interface for offline saved data
interface OfflineSavedData {
  cycleNo: number;
  records: OPRPAndCCPCycleData[];
  timestamp: number;
}

// Interface for the state
interface OPRPAndCCPState {
  // Fetched cycles from API
  fetchedCycles: OPRPAndCCPCycleData[];
  
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
const initialState: OPRPAndCCPState = {
  fetchedCycles: [],
  offlineSavedData: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastFetchTimestamp: null,
};

// Create the slice
const oprpAndCcpSlice = createSlice({
  name: 'oprpAndCcp',
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
    setFetchedCycles: (state, action: PayloadAction<OPRPAndCCPCycleData[]>) => {
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
} = oprpAndCcpSlice.actions;

// Export selectors
export const selectOPRPAndCCPState = (state: { oprpAndCcp: OPRPAndCCPState }) => state.oprpAndCcp;
export const selectOPRPAndCCPOfflineDataCount = (state: { oprpAndCcp: OPRPAndCCPState }) => state.oprpAndCcp.offlineSavedData.length;
export const selectFetchedCycles = (state: { oprpAndCcp: OPRPAndCCPState }) => state.oprpAndCcp.fetchedCycles;
export const selectIsLoading = (state: { oprpAndCcp: OPRPAndCCPState }) => state.oprpAndCcp.isLoading;
export const selectIsSyncing = (state: { oprpAndCcp: OPRPAndCCPState }) => state.oprpAndCcp.isSyncing;
export const selectError = (state: { oprpAndCcp: OPRPAndCCPState }) => state.oprpAndCcp.error;

// Export reducer
export default oprpAndCcpSlice.reducer;


