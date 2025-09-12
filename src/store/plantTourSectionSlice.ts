import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Types for Plant Tour Section data
export interface CriteriaMaster {
  id: string;
  Title: string;
  What: string;
  Criteria: string;
  IsActive: boolean;
  Sequence: number;
  ScheduledDay: string;
  ImageURL: string;
  Created: string;
  // Add other criteria properties as needed
}

export interface EmployeeDetails {
  id: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  roleName: string;
  roleId: string;
  plantId: string;
  plantName: string;
  areaName: string;
}

export interface ObservationData {
  id: string;
  criteriaId: string;
  status: 'Approved' | 'Rejected' | 'Not Applicable';
  comment?: string;
  correctiveAction?: string;
  observedBy: string;
  observedPerson: string;
  timestamp: string;
  // Add other observation properties as needed
}

export interface PlantTourSectionState {
  // API Data
  criteriaList: CriteriaMaster[];
  employeeDetails: EmployeeDetails | null;
  existingObservations: ObservationData[];
  
  // Offline Data
  isOfflineMode: boolean;
  offlineDataTimestamp: number | null;
  
  // API Tokens (for syncing later)
  accessToken: string | null;
  sharepointToken: string | null;
  
  // Tour IDs
  plantTourId: string | null;
  departmentTourId: string | null;
  
  // Loading states
  isLoading: boolean;
  isDataFetched: boolean;
  
  // Error handling
  error: string | null;
}

const initialState: PlantTourSectionState = {
  criteriaList: [],
  employeeDetails: null,
  existingObservations: [],
  isOfflineMode: false,
  offlineDataTimestamp: null,
  accessToken: null,
  sharepointToken: null,
  plantTourId: null,
  departmentTourId: null,
  isLoading: false,
  isDataFetched: false,
  error: null,
};

const plantTourSectionSlice = createSlice({
  name: 'plantTourSection',
  initialState,
  reducers: {
    // Data setters
    setCriteriaList: (state, action: PayloadAction<CriteriaMaster[]>) => {
      state.criteriaList = action.payload;
    },
    
    setEmployeeDetails: (state, action: PayloadAction<EmployeeDetails>) => {
      state.employeeDetails = action.payload;
    },
    
    setExistingObservations: (state, action: PayloadAction<ObservationData[]>) => {
      state.existingObservations = action.payload;
    },
    
    // Offline mode management
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.isOfflineMode = action.payload;
    },
    
    setOfflineDataTimestamp: (state, action: PayloadAction<number>) => {
      state.offlineDataTimestamp = action.payload;
    },
    
    // Token management
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    
    setSharepointToken: (state, action: PayloadAction<string>) => {
      state.sharepointToken = action.payload;
    },
    
    // Tour ID management
    setPlantTourId: (state, action: PayloadAction<string>) => {
      state.plantTourId = action.payload;
    },
    
    setDepartmentTourId: (state, action: PayloadAction<string>) => {
      state.departmentTourId = action.payload;
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setDataFetched: (state, action: PayloadAction<boolean>) => {
      state.isDataFetched = action.payload;
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Bulk data setter for offline mode
    setOfflineData: (state, action: PayloadAction<{
      criteriaList: CriteriaMaster[];
      employeeDetails: EmployeeDetails;
      existingObservations: ObservationData[];
      plantTourId: string;
      departmentTourId: string;
      accessToken: string;
      sharepointToken: string;
      timestamp: number;
    }>) => {
      const { criteriaList, employeeDetails, existingObservations, plantTourId, departmentTourId, accessToken, sharepointToken, timestamp } = action.payload;
      
      state.criteriaList = criteriaList;
      state.employeeDetails = employeeDetails;
      state.existingObservations = existingObservations;
      state.plantTourId = plantTourId;
      state.departmentTourId = departmentTourId;
      state.accessToken = accessToken;
      state.sharepointToken = sharepointToken;
      state.offlineDataTimestamp = timestamp;
      state.isDataFetched = true;
    },
    
    // Clear all data
    clearAllData: (state) => {
      state.criteriaList = [];
      state.employeeDetails = null;
      state.existingObservations = [];
      state.isOfflineMode = false;
      state.offlineDataTimestamp = null;
      state.accessToken = null;
      state.sharepointToken = null;
      state.plantTourId = null;
      state.departmentTourId = null;
      state.isLoading = false;
      state.isDataFetched = false;
      state.error = null;
    },
    
    // Clear only offline data (keep tokens and IDs)
    clearOfflineData: (state) => {
      state.criteriaList = [];
      state.employeeDetails = null;
      state.existingObservations = [];
      state.isOfflineMode = false;
      state.offlineDataTimestamp = null;
      state.isDataFetched = false;
      state.error = null;
    },
  },
});

export const {
  setCriteriaList,
  setEmployeeDetails,
  setExistingObservations,
  setOfflineMode,
  setOfflineDataTimestamp,
  setAccessToken,
  setSharepointToken,
  setPlantTourId,
  setDepartmentTourId,
  setLoading,
  setDataFetched,
  setError,
  setOfflineData,
  clearAllData,
  clearOfflineData,
} = plantTourSectionSlice.actions;

export default plantTourSectionSlice.reducer;
