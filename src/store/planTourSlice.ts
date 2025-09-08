import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CycleItem {
  value: "Okay" | "Not Okay" | null;
  itemStatus: string;
}

interface SelectedMap {
  [cycleNo: number]: Record<string, CycleItem>;
}

interface SectionDetails {
  product?: string;
  batchNo?: string;
  lineNo?: string;
  expiry?: string;
  packaged?: string;
  executiveName?: string;
  shift?: string;
  evaluationType?: string;
  criteria?: string;
  cycleNum?: number;
}

interface PlanTourState {
  selected: SelectedMap;
  offlinePlanTourSaved: boolean;
  plantTourId: string | null;
  employeeDetails: any | null;
  selectedCycle: string | null;
  selectedTour: string | null;
  sectionDetails: { [cycleNo: number]: SectionDetails };
  postApiData: any[]; // Data for POST API when syncing
  getApiDataModel: any[]; // Data in GET API response format for display
  summaryData: any[]; // Summary data from API
  cycleData: any[]; // Cycle data from API
  lastFetchTimestamp: number | null; // Timestamp of last fetch
  summaryAction: any; // Summary action state
  cycleAction: any; // Cycle action state
  categorySummary: any; // Category summary state
  cycleCount: number; // Cycle count state
}

const initialState: PlanTourState = {
  selected: {},
  offlinePlanTourSaved: false,
  plantTourId: null,
  employeeDetails: null,
  selectedCycle: null,
  selectedTour: null,
  sectionDetails: {},
  postApiData: [],
  getApiDataModel: [],
  summaryData: [],
  cycleData: [],
  lastFetchTimestamp: null,
  summaryAction: null,
  cycleAction: null,
  categorySummary: {},
  cycleCount: 0,
};

export const planTourSlice = createSlice({
  name: 'planTour',
  initialState,
  reducers: {
    setSelected(state, action: PayloadAction<SelectedMap>) {
      state.selected = action.payload;
    },
    setOfflinePlanTourSaved(state, action: PayloadAction<boolean>) {
      state.offlinePlanTourSaved = action.payload;
    },
    setPlantTourId(state, action: PayloadAction<string | null>) {
      state.plantTourId = action.payload;
    },
    setEmployeeDetails(state, action: PayloadAction<any | null>) {
      state.employeeDetails = action.payload;
    },
    setSelectedCycle(state, action: PayloadAction<string | null>) {
      state.selectedCycle = action.payload;
    },
    setSelectedTour(state, action: PayloadAction<string | null>) {
      state.selectedTour = action.payload;
    },
    setSectionDetails(state, action: PayloadAction<{ cycleNo: number; details: SectionDetails }>) {
      state.sectionDetails[action.payload.cycleNo] = action.payload.details;
    },
    clearSectionDetails(state, action: PayloadAction<number | undefined>) {
      if (action.payload !== undefined) {
        delete state.sectionDetails[action.payload];
      } else {
        state.sectionDetails = {};
      }
    },
    // POST API data management
    addPostApiData(state, action: PayloadAction<any>) {
      state.postApiData.push(action.payload);
    },
    clearPostApiData(state) {
      state.postApiData = [];
    },
    // GET API data model management
    setGetApiDataModel(state, action: PayloadAction<any[]>) {
      state.getApiDataModel = action.payload;
    },
    addGetApiDataModel(state, action: PayloadAction<any>) {
      state.getApiDataModel.push(action.payload);
    },
    clearGetApiDataModel(state) {
      state.getApiDataModel = [];
    },
    // Summary and Cycle data management
    setSummaryData(state, action: PayloadAction<any[]>) {
      state.summaryData = action.payload;
    },
    setCycleData(state, action: PayloadAction<any[]>) {
      state.cycleData = action.payload;
    },
    setLastFetchTimestamp(state, action: PayloadAction<number>) {
      state.lastFetchTimestamp = action.payload;
    },
    clearApiData(state) {
      state.summaryData = [];
      state.cycleData = [];
      state.lastFetchTimestamp = null;
    },
    // Summary and Cycle action states
    setSummaryAction(state, action: PayloadAction<any>) {
      state.summaryAction = action.payload;
    },
    setCycleAction(state, action: PayloadAction<any>) {
      state.cycleAction = action.payload;
    },
    clearActionStates(state) {
      state.summaryAction = null;
      state.cycleAction = null;
    },
    // Category summary and cycle count states
    setCategorySummary(state, action: PayloadAction<any>) {
      state.categorySummary = action.payload;
    },
    setCycleCount(state, action: PayloadAction<number>) {
      state.cycleCount = action.payload;
    },
    // Clear all data except token, plantTourId, employeeDetails, and user details
    clearAllDataExceptEssential(state) {
      state.selected = {};
      state.offlinePlanTourSaved = false;
      state.selectedCycle = null;
      state.selectedTour = null;
      state.sectionDetails = {};
      state.postApiData = [];
      state.getApiDataModel = [];
      state.summaryData = [];
      state.cycleData = [];
      state.lastFetchTimestamp = null;
      state.summaryAction = null;
      state.cycleAction = null;
      state.categorySummary = {};
      state.cycleCount = 0;
      // Keep: plantTourId, employeeDetails (these remain unchanged)
    },
  },
});

export const { 
  setSelected, 
  setOfflinePlanTourSaved, 
  setPlantTourId, 
  setEmployeeDetails, 
  setSelectedCycle, 
  setSelectedTour, 
  setSectionDetails, 
  clearSectionDetails,
  addPostApiData,
  clearPostApiData,
  setGetApiDataModel,
  addGetApiDataModel,
  clearGetApiDataModel,
  setSummaryData,
  setCycleData,
  setLastFetchTimestamp,
  setSummaryAction,
  setCycleAction,
  setCategorySummary,
  setCycleCount,
  clearActionStates,
  clearApiData,
  clearAllDataExceptEssential
} = planTourSlice.actions;

export default planTourSlice.reducer;
