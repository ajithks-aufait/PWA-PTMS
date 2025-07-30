// src/store/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import planTourReducer from './planTourSlice';
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

// Persist config for user
const userPersistConfig = {
  key: "user",
  storage,
  whitelist: ["user"]
};

// Persist config for planTour
const planTourPersistConfig = {
  key: "planTour",
  storage,
  whitelist: ["plantTourId", "employeeDetails", "selectedCycle", "selectedTour", "sectionDetails"]
};

const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  planTour: persistReducer(planTourPersistConfig, planTourReducer),
});

const store = configureStore({
  reducer: rootReducer,
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
