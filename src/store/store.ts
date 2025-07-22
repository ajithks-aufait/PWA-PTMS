// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./stateSlice.ts";
import planTourReducer from './planTourSlice';
import offlineReducer from "./offlineSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    planTour: planTourReducer,
    offline: offlineReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
