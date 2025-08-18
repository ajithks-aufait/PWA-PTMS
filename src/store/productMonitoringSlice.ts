import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface ProductMonitoringCycleData {
  cycleNum: string;
  product: string;
  cr3ea_moisture: string | null;
  cr3ea_gaugeoperating: string | null;
  cr3ea_gaugenonoperating: string | null;
  cr3ea_gaugecentre: string | null;
  cr3ea_dryweightovenendoperating: string | null;
  cr3ea_dryweightovenendnonoperating: string | null;
  cr3ea_dryweightovenendcentre: string | null;
  cr3ea_dimensionoperating: string | null;
  cr3ea_dimensionnonoperating: string | null;
  cr3ea_dimensioncentre: string | null;
}

interface PendingSyncData {
  cycleNumber: number;
  cycleData: ProductMonitoringCycleData;
  timestamp: number;
}

interface ProductMonitoringState {
  cycles: ProductMonitoringCycleData[];
  pendingSync: PendingSyncData[];
  lastFetchTimestamp: number | null;
  isOffline: boolean;
  currentCycle: number;
}

const initialState: ProductMonitoringState = {
  cycles: [],
  pendingSync: [],
  lastFetchTimestamp: null,
  isOffline: false,
  currentCycle: 1,
};

export const productMonitoringSlice = createSlice({
  name: 'productMonitoring',
  initialState,
  reducers: {
    setCycles(state, action: PayloadAction<ProductMonitoringCycleData[]>) {
      state.cycles = action.payload;
    },
    addCycle(state, action: PayloadAction<ProductMonitoringCycleData>) {
      state.cycles.push(action.payload);
    },
    setPendingSync(state, action: PayloadAction<PendingSyncData[]>) {
      state.pendingSync = action.payload;
    },
    addPendingSync(state, action: PayloadAction<PendingSyncData>) {
      state.pendingSync.push(action.payload);
    },
    removePendingSync(state, action: PayloadAction<number>) {
      state.pendingSync = state.pendingSync.filter(item => item.cycleNumber !== action.payload);
    },
    clearPendingSync(state) {
      state.pendingSync = [];
    },
    setLastFetchTimestamp(state, action: PayloadAction<number>) {
      state.lastFetchTimestamp = action.payload;
    },
    setIsOffline(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload;
    },
    setCurrentCycle(state, action: PayloadAction<number>) {
      state.currentCycle = action.payload;
    },
    clearAllData(state) {
      state.cycles = [];
      state.pendingSync = [];
      state.lastFetchTimestamp = null;
      state.isOffline = false;
      state.currentCycle = 1;
    },
  },
});

export const {
  setCycles,
  addCycle,
  setPendingSync,
  addPendingSync,
  removePendingSync,
  clearPendingSync,
  setLastFetchTimestamp,
  setIsOffline,
  setCurrentCycle,
  clearAllData,
} = productMonitoringSlice.actions;

export default productMonitoringSlice.reducer;
