// src/store/store.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import planTourReducer from './planTourSlice';
import stateReducer from './stateSlice.ts';
import creamPercentageReducer from './creamPercentageSlice';
import sieveAndMagnetNewPlantReducer from './sieveAndMagnetNewPlantSlice';
import sieveAndMagnetOldPlantReducer from './sieveAndMagnetOldPlantSlice';
import productMonitoringReducer from './productMonitoringSlice';
import codeVerificationReducer from './CodeVerificationSlice';
import sealIntegrityTestReducer from './SealIntegrityTestSlice';
import ALCReducer from './ALCSlice';
import NetWeightMonitoringReducer from './NetWeightMonitoringRecordSlice';
import bakingProcessReducer from './BakingProcessSlice';
import oprpAndCcpReducer from './OPRPAndCCPSlice';
import plantTourSectionReducer from './plantTourSectionSlice';
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
  whitelist: ["plantTourId", "employeeDetails", "selectedCycle", "selectedTour", "sectionDetails", "summaryData", "cycleData", "lastFetchTimestamp", "offlineCriteriaList", "offlineEmployeeDetails", "offlineExistingObservations", "offlineDataTimestamp", "isOfflineMode"]
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

// Persist config for NetWeightMonitoring
const NetWeightMonitoringPersistConfig = {
  key: "NetWeightMonitoring",
  storage,
  whitelist: ["fetchedCycles", "offlineSavedData", "lastFetchTimestamp"]
};
// Persist config for sieveAndMagnetOldPlant
const sieveAndMagnetOldPlantPersistConfig = {
  key: "sieveAndMagnetOldPlant",
  storage,
  whitelist: ["completedCycles", "pendingSync", "lastFetchTimestamp", "isOffline", "currentCycle"]
};

// Persist config for productMonitoring
const productMonitoringPersistConfig = {
  key: "productMonitoring",
  storage,
  whitelist: ["cycles", "pendingSync", "lastFetchTimestamp", "isOffline", "currentCycle"]
};
// Persist config for codeVerification
const codeVerificationPersistConfig = {
  key: "codeVerification",
  storage,
  whitelist: ["fetchedCycles", "offlineSavedData", "lastFetchTimestamp"]
};

// Persist config for sealIntegrityTest
const sealIntegrityTestPersistConfig = {
  key: "sealIntegrityTest",
  storage,
  whitelist: ["fetchedCycles", "offlineSavedData", "lastFetchTimestamp"]
};

// Persist config for ALC
const ALCPersistConfig = {
  key: "ALC",
  storage,
  whitelist: ["fetchedCycles", "offlineSavedData", "lastFetchTimestamp"]
};

// Persist config for OPRP/CCP
const oprpAndCcpPersistConfig = {
  key: "oprpAndCcp",
  storage,
  whitelist: ["fetchedCycles", "offlineSavedData", "lastFetchTimestamp"]
};

// Persist config for bakingProcess
const bakingProcessPersistConfig = {
  key: "bakingProcess",
  storage,
  whitelist: ["fetchedCycles", "offlineSavedData", "offlineFiles", "lastFetchTimestamp"]
};

// Persist config for plantTourSection
const plantTourSectionPersistConfig = {
  key: "plantTourSection",
  storage,
  whitelist: ["criteriaList", "employeeDetails", "existingObservations", "isOfflineMode", "offlineDataTimestamp", "accessToken", "sharepointToken", "plantTourId", "departmentTourId", "isDataFetched"]
};

const rootReducer = combineReducers({
  user: persistReducer(userPersistConfig, userReducer),
  planTour: persistReducer(planTourPersistConfig, planTourReducer),
  appState: persistReducer(appStatePersistConfig, stateReducer),
  creamPercentage: persistReducer(creamPercentagePersistConfig, creamPercentageReducer),
  sieveAndMagnetNewPlant: persistReducer(sieveAndMagnetNewPlantPersistConfig, sieveAndMagnetNewPlantReducer),
  sieveAndMagnetOldPlant: persistReducer(sieveAndMagnetOldPlantPersistConfig, sieveAndMagnetOldPlantReducer),
  productMonitoring: persistReducer(productMonitoringPersistConfig, productMonitoringReducer),
  codeVerification: persistReducer(codeVerificationPersistConfig, codeVerificationReducer),
  sealIntegrityTest: persistReducer(sealIntegrityTestPersistConfig, sealIntegrityTestReducer),
  ALC: persistReducer(ALCPersistConfig, ALCReducer),
  NetWeightMonitoring: persistReducer(NetWeightMonitoringPersistConfig, NetWeightMonitoringReducer),
  oprpAndCcp: persistReducer(oprpAndCcpPersistConfig, oprpAndCcpReducer),
  bakingProcess: persistReducer(bakingProcessPersistConfig, bakingProcessReducer),
  plantTourSection: persistReducer(plantTourSectionPersistConfig, plantTourSectionReducer),
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
