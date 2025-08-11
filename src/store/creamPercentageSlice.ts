import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CreamPercentageData {
  cycleNum: number;
  formData: {
    product: string;
    machineNo: string;
    line: string;
    standardCreamPercentage: string;
  };
  weightData: {
    sandwichWeights: string[];
    shellWeights: string[];
  };
  qualityTourId: string;
  userName: string | null;
  shiftValue: string;
  timestamp: string;
}

interface CreamPercentageState {
  cycleData: { [key: number]: CreamPercentageData };
  completedCycles: number[];
  currentCycle: number;
  isOffline: boolean;
  pendingSync: CreamPercentageData[];
}

const initialState: CreamPercentageState = {
  cycleData: {},
  completedCycles: [],
  currentCycle: 1,
  isOffline: false,
  pendingSync: []
};

const creamPercentageSlice = createSlice({
  name: 'creamPercentage',
  initialState,
  reducers: {
    saveCycleData: (state, action: PayloadAction<CreamPercentageData>) => {
      const { cycleNum, ...data } = action.payload;
      state.cycleData[cycleNum] = {
        ...data,
        cycleNum,
        timestamp: new Date().toISOString()
      };
      
      if (!state.completedCycles.includes(cycleNum)) {
        state.completedCycles.push(cycleNum);
      }
      
      state.currentCycle = Math.max(...state.completedCycles) + 1;
      
      // Add to pending sync if offline
      if (state.isOffline) {
        state.pendingSync.push(action.payload);
      }
    },
    
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },
    
    loadOfflineData: (state, action: PayloadAction<{
      cycleData: { [key: number]: CreamPercentageData };
      completedCycles: number[];
      currentCycle: number;
    }>) => {
      state.cycleData = action.payload.cycleData;
      state.completedCycles = action.payload.completedCycles;
      state.currentCycle = action.payload.currentCycle;
    },
    
    clearPendingSync: (state) => {
      state.pendingSync = [];
    },
    
    removePendingSyncItem: (state, action: PayloadAction<number>) => {
      state.pendingSync = state.pendingSync.filter(item => item.cycleNum !== action.payload);
    },
    
    resetCreamPercentage: (state) => {
      state.cycleData = {};
      state.completedCycles = [];
      state.currentCycle = 1;
      state.pendingSync = [];
    }
  }
});

export const {
  saveCycleData,
  setOfflineMode,
  loadOfflineData,
  clearPendingSync,
  removePendingSyncItem,
  resetCreamPercentage
} = creamPercentageSlice.actions;

export default creamPercentageSlice.reducer;
