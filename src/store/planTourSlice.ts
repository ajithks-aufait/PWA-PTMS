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
}

const initialState: PlanTourState = {
  selected: {},
  offlinePlanTourSaved: false,
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
  },
});

export const { setSelected, setOfflinePlanTourSaved } = planTourSlice.actions;

export default planTourSlice.reducer;
