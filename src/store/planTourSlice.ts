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
}

const initialState: PlanTourState = {
  selected: {},
  offlinePlanTourSaved: false,
  plantTourId: null,
  employeeDetails: null,
  selectedCycle: null,
  selectedTour: null,
  sectionDetails: {},
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
  },
});

export const { setSelected, setOfflinePlanTourSaved, setPlantTourId, setEmployeeDetails, setSelectedCycle, setSelectedTour, setSectionDetails, clearSectionDetails } = planTourSlice.actions;

export default planTourSlice.reducer;
