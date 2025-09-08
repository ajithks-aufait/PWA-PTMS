import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Interface for NetWeightMonitoring cycle data
interface NetWeightMonitoringCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  batchNo: string;
  packageDate: string;
  expiryDate: string;
  mc1: string[];
  mc2: string[];
  mc3: string[];
  mc4: string[];
}

// Interface for offline saved data
interface OfflineSavedData {
  cycleNo: number;
  records: NetWeightMonitoringCycleData[];
  timestamp: number;
}

// Interface for the state
interface NetWeightMonitoringState {
  // Fetched cycles from API
  fetchedCycles: NetWeightMonitoringCycleData[];
  
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
const initialState: NetWeightMonitoringState = {
  fetchedCycles: [],
  offlineSavedData: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  lastFetchTimestamp: null,
};

// Create the slice
const NetWeightMonitoringSlice = createSlice({
  name: 'NetWeightMonitoring',
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
    setFetchedCycles: (state, action: PayloadAction<NetWeightMonitoringCycleData[]>) => {
      // Deduplicate by cycleNum and keep the one with more filled mc values
      const byCycle: Record<string, NetWeightMonitoringCycleData> = {} as any;
      for (const item of action.payload || []) {
        const key = item.cycleNum;
        const current = byCycle[key];
        if (!current) {
          byCycle[key] = item;
        } else {
          const curCount = (current.mc1?.length||0)+(current.mc2?.length||0)+(current.mc3?.length||0)+(current.mc4?.length||0);
          const newCount = (item.mc1?.length||0)+(item.mc2?.length||0)+(item.mc3?.length||0)+(item.mc4?.length||0);
          if (newCount >= curCount) byCycle[key] = item;
        }
      }
      state.fetchedCycles = Object.values(byCycle);
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
} = NetWeightMonitoringSlice.actions;

// Export selectors
export const selectNetWeightMonitoringState = (state: { NetWeightMonitoring: NetWeightMonitoringState }) => state.NetWeightMonitoring;
export const selectOfflineDataCount = (state: { NetWeightMonitoring: NetWeightMonitoringState }) => state.NetWeightMonitoring.offlineSavedData.length;
export const selectFetchedCycles = (state: { NetWeightMonitoring: NetWeightMonitoringState }) => state.NetWeightMonitoring.fetchedCycles;
export const selectIsLoading = (state: { NetWeightMonitoring: NetWeightMonitoringState }) => state.NetWeightMonitoring.isLoading;
export const selectIsSyncing = (state: { NetWeightMonitoring: NetWeightMonitoringState }) => state.NetWeightMonitoring.isSyncing;
export const selectError = (state: { NetWeightMonitoring: NetWeightMonitoringState }) => state.NetWeightMonitoring.error;

// Export reducer
export default NetWeightMonitoringSlice.reducer;
