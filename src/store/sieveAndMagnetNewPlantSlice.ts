import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CompletedCycleData {
  cycleNumber: number;
  defects: { title: string; remarks: string }[];
  okays: string[];
  formData: {
    product: string;
    machineNo: string;
    line: string;
    standardPercentage: string;
  };
  remarks: string;
}

interface PendingSyncData {
  cycleNumber: number;
  checklistItems: any[];
  formData: any;
  remarks: string;
  timestamp: number;
}

interface SieveAndMagnetNewPlantState {
  completedCycles: CompletedCycleData[];
  pendingSync: PendingSyncData[];
  lastFetchTimestamp: number | null;
  isOffline: boolean;
  currentCycle: number;
}

const initialState: SieveAndMagnetNewPlantState = {
  completedCycles: [],
  pendingSync: [],
  lastFetchTimestamp: null,
  isOffline: false,
  currentCycle: 1,
};

export const sieveAndMagnetNewPlantSlice = createSlice({
  name: 'sieveAndMagnetNewPlant',
  initialState,
  reducers: {
    setCompletedCycles(state, action: PayloadAction<CompletedCycleData[]>) {
      state.completedCycles = action.payload;
    },
    addCompletedCycle(state, action: PayloadAction<CompletedCycleData>) {
      state.completedCycles.push(action.payload);
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
      state.completedCycles = [];
      state.pendingSync = [];
      state.lastFetchTimestamp = null;
      state.isOffline = false;
      state.currentCycle = 1;
    },
  },
});

export const {
  setCompletedCycles,
  addCompletedCycle,
  setPendingSync,
  addPendingSync,
  removePendingSync,
  clearPendingSync,
  setLastFetchTimestamp,
  setIsOffline,
  setCurrentCycle,
  clearAllData,
} = sieveAndMagnetNewPlantSlice.actions;

export default sieveAndMagnetNewPlantSlice.reducer;
