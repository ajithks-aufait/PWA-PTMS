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
      
      console.log(`=== REDUX: SAVING CYCLE ${cycleNum} ===`);
      console.log('Action payload:', action.payload);
      console.log('Current state before save:');
      console.log('- cycleData keys:', Object.keys(state.cycleData));
      console.log('- completedCycles:', state.completedCycles);
      console.log('- currentCycle:', state.currentCycle);
      console.log('- isOffline:', state.isOffline);
      console.log('- pendingSync length:', state.pendingSync.length);
      
      state.cycleData[cycleNum] = {
        ...data,
        cycleNum,
        timestamp: new Date().toISOString()
      };
      
      if (!state.completedCycles.includes(cycleNum)) {
        state.completedCycles.push(cycleNum);
      }
      
      // Update current cycle to the next available cycle number
      const oldCurrentCycle = state.currentCycle;
      state.currentCycle = Math.max(...state.completedCycles) + 1;
      console.log(`Current cycle updated: ${oldCurrentCycle} -> ${state.currentCycle}`);
      console.log(`Completed cycles array: [${state.completedCycles.join(', ')}]`);
      console.log(`Max completed cycle: ${Math.max(...state.completedCycles)}`);
      
      // Add to pending sync if offline
      if (state.isOffline) {
        console.log(`Adding cycle ${cycleNum} to pending sync (offline mode)`);
        state.pendingSync.push(action.payload);
        console.log(`Pending sync now has ${state.pendingSync.length} items:`);
        state.pendingSync.forEach((item, index) => {
          console.log(`  ${index + 1}. Cycle ${item.cycleNum}`);
        });
      } else {
        console.log(`Not adding cycle ${cycleNum} to pending sync (online mode)`);
      }
      
      console.log('State after save:');
      console.log('- cycleData keys:', Object.keys(state.cycleData));
      console.log('- completedCycles:', state.completedCycles);
      console.log('- currentCycle:', state.currentCycle);
      console.log('- pendingSync length:', state.pendingSync.length);
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
      const cycleNumToRemove = action.payload;
      console.log(`=== REDUX: REMOVING CYCLE ${cycleNumToRemove} FROM PENDING SYNC ===`);
      console.log('Pending sync before removal:', state.pendingSync.map(item => item.cycleNum));
      
      state.pendingSync = state.pendingSync.filter(item => item.cycleNum !== cycleNumToRemove);
      
      console.log('Pending sync after removal:', state.pendingSync.map(item => item.cycleNum));
    },
    
    resetCreamPercentage: (state) => {
      state.cycleData = {};
      state.completedCycles = [];
      state.currentCycle = 1;
      state.pendingSync = [];
      state.isOffline = false;
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
