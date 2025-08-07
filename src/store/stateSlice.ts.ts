import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit';

interface StateSlice {
  pageName: string;
  isSidebarOpen: boolean;
  isOfflineStarted: boolean;
  isOfflineCompleted: boolean;
  isModalOpen: boolean;
  progress: number;
  offlineSubmissions: any[];
  offlineSubmissionsByCategory: { [category: string]: any[] };
}

const initialState: StateSlice = {
  pageName: "Dashboard",
  isSidebarOpen: false,
  isOfflineStarted: false,
  isOfflineCompleted: false,
  isModalOpen: false,
  progress: 0,
  offlineSubmissions: [],
  offlineSubmissionsByCategory: {},
};

const stateSlice = createSlice({
  name: "appState",
  initialState,
  reducers: {
    setPageName(state, action: PayloadAction<string>) {
      state.pageName = action.payload;
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebar(state, action: PayloadAction<boolean>) {
      state.isSidebarOpen = action.payload;
    },
    setOfflineStarted(state, action: PayloadAction<boolean>) {
      state.isOfflineStarted = action.payload;
    },
    setOfflineCompleted(state, action: PayloadAction<boolean>) {
      state.isOfflineCompleted = action.payload;
    },
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.isModalOpen = action.payload;
    },
    setProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    resetOfflineState(state) {
      console.log('StateSlice: Resetting offline state - clearing all offline data');
      state.isOfflineStarted = false;
      state.isOfflineCompleted = false;
      state.progress = 0;
      state.offlineSubmissions = [];
      state.offlineSubmissionsByCategory = {};
    },
    addOfflineSubmission(state, action: PayloadAction<any>) {
      console.log('StateSlice: Adding offline submission:', action.payload);
      state.offlineSubmissions.push(action.payload);
      console.log('StateSlice: Current offline submissions:', state.offlineSubmissions);
    },
    addOfflineSubmissionByCategory(state, action: PayloadAction<{ category: string; submission: any }>) {
      const { category, submission } = action.payload;
      console.log('StateSlice: Adding offline submission by category:', { category, submission });
      
      if (!state.offlineSubmissionsByCategory[category]) {
        state.offlineSubmissionsByCategory[category] = [];
      }
      
      state.offlineSubmissionsByCategory[category].push(submission);
      console.log('StateSlice: Current offline submissions by category:', state.offlineSubmissionsByCategory);
    },
    clearOfflineSubmissions(state) {
      state.offlineSubmissions = [];
      state.offlineSubmissionsByCategory = {};
    },
  },
});

export const {
  setPageName,
  toggleSidebar,
  setSidebar,
  setOfflineStarted,
  setOfflineCompleted,
  setModalOpen,
  setProgress,
  resetOfflineState,
  addOfflineSubmission,
  addOfflineSubmissionByCategory,
  clearOfflineSubmissions,
} = stateSlice.actions;

export default stateSlice.reducer;
