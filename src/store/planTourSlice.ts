import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CycleItem {
  value: "Okay" | "Not Okay" | null;
  itemStatus: string;
}

interface SelectedMap {
  [cycleNo: number]: Record<string, CycleItem>;
}

interface PlanTourState {
  selected: SelectedMap;
  offlinePlanTourSaved: boolean;
  plantTourId: string | null;
  employeeDetails: any | null;
  selectedCycle: string | null;
}

const initialState: PlanTourState = {
  selected: {},
  offlinePlanTourSaved: false,
  plantTourId: null,
  employeeDetails: null,
  selectedCycle: null,
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
  },
});

export const { setSelected, setOfflinePlanTourSaved, setPlantTourId, setEmployeeDetails, setSelectedCycle } = planTourSlice.actions;

export default planTourSlice.reducer;
