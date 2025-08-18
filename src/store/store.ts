// src/store/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import planTourReducer from './planTourSlice';
import stateReducer from './stateSlice.ts';
import creamPercentageReducer from './creamPercentageSlice';
import sieveAndMagnetNewPlantReducer from './sieveAndMagnetNewPlantSlice';
import sieveAndMagnetOldPlantReducer from './sieveAndMagnetOldPlantSlice';
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
  whitelist: ["plantTourId", "employeeDetails", "selectedCycle", "selectedTour", "sectionDetails", "summaryData", "cycleData", "lastFetchTimestamp"]
};

// Persist config for appState
const appStatePersistConfig = {
  key: "appState",
  storage,
  whitelist: ["isOfflineStarted", "isOfflineCompleted", "progress", "offlineSubmissions", "offlineSubmissionsByCategory"]
};

// Persist config for creamPercentage
const creamPercentagePersistConfig = {
  key: "creamPercentage",
  storage,
  whitelist: ["cycleData", "completedCycles", "currentCycle", "isOffline", "pendingSync"]
};

// Persist config for sieveAndMagnetNewPlant
const sieveAndMagnetNewPlantPersistConfig = {
  key: "sieveAndMagnetNewPlant",
  storage,
  whitelist: ["completedCycles", "pendingSync", "lastFetchTimestamp", "isOffline", "currentCycle"]
};

// Persist config for sieveAndMagnetOldPlant
const sieveAndMagnetOldPlantPersistConfig = {
  key: "sieveAndMagnetOldPlant",
  storage,
  whitelist: ["completedCycles", "pendingSync", "lastFetchTimestamp", "isOffline", "currentCycle"]
};

const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  planTour: persistReducer(planTourPersistConfig, planTourReducer),
  appState: persistReducer(appStatePersistConfig, stateReducer),
  creamPercentage: persistReducer(creamPercentagePersistConfig, creamPercentageReducer),
  sieveAndMagnetNewPlant: persistReducer(sieveAndMagnetNewPlantPersistConfig, sieveAndMagnetNewPlantReducer),
  sieveAndMagnetOldPlant: persistReducer(sieveAndMagnetOldPlantPersistConfig, sieveAndMagnetOldPlantReducer),
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.err', 'payload.error', 'error'],
        // Ignore these paths in the state
        ignoredPaths: ['appState.offlineSubmissions'],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
