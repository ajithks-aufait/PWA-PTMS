// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import planTourReducer from './planTourSlice';
// import offlineReducer from "./offlineSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    planTour: planTourReducer,
    // offline: offlineReducer, // removed because offlineSlice does not exist
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
