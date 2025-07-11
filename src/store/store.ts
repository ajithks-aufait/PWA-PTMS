// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import planTourReducer from './planTourSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
     planTour: planTourReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
