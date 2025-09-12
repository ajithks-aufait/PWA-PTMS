/**
 * Plant Tour Offline Service
 * Handles fetching and caching of Plant Tour data for offline mode
 */

import * as CriteriaMasterService from './CriteriaMasterService';
import * as PlantTourService from './PlantTourService';
import { fetchEmployeeList } from './getEmployeeDetails';
import { loginRequest } from "../auth/authConfig";
import { useMsal } from "@azure/msal-react";

export interface PlantTourOfflineData {
  criteriaList: any[];
  employeeDetails: any | null;
  existingObservations: any[];
  timestamp: number;
}

/**
 * Fetch all Plant Tour data needed for offline mode
 * @param plantTourId - Plant tour ID
 * @param user - User object containing name
 * @param employeeDetails - Employee details (optional, will fetch if not provided)
 * @returns Promise<PlantTourOfflineData>
 */
export async function fetchPlantTourOfflineData(
  plantTourId: string,
  user: any,
  employeeDetails?: any
): Promise<PlantTourOfflineData> {
  try {
    console.log('=== FETCHING PLANT TOUR OFFLINE DATA ===');
    console.log('Plant Tour ID:', plantTourId);
    console.log('User:', user);
    console.log('Employee details provided:', !!employeeDetails);
    const { accounts, instance } = useMsal();
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });

    // Use provided employee details or fetch from API
    let currentEmployeeDetails = employeeDetails;
    if (!currentEmployeeDetails) {
      console.log('Fetching employee details from API...');
      if (!user?.Name) {
        throw new Error('User name is required to fetch employee details');
      }
      const employeeList = await fetchEmployeeList(response.accessToken, user.Name);
      currentEmployeeDetails = employeeList && employeeList.length > 0 ? employeeList[0] : null;
      console.log('Employee details fetched from API:', currentEmployeeDetails);
    } else {
      console.log('Using provided employee details:', currentEmployeeDetails);
    }

    if (!currentEmployeeDetails) {
      throw new Error(`Employee details not found for user: ${user?.Name || 'Unknown'}`);
    }

    // Extract plant, department, and area names for criteria filtering
    const plantName = currentEmployeeDetails?.plantName || currentEmployeeDetails?.PlantName || '';
    const departmentName = currentEmployeeDetails?.departmentName || currentEmployeeDetails?.DepartmentName || '';
    const areaName = currentEmployeeDetails?.areaName || currentEmployeeDetails?.AreaName || '';

    console.log('Filtering criteria by:', { plantName, departmentName, areaName });

    // Fetch criteria master list
    console.log('Fetching criteria master list...');
    const criteriaList = await CriteriaMasterService.fetchCriteriaMasterList(
      response.accessToken,
      plantName,
      departmentName,
      areaName
    );
    console.log('Criteria list fetched:', criteriaList.length, 'items');

    // Fetch existing observations
    console.log('Fetching existing observations...');
    const existingObservations = await PlantTourService.fetchExistingObservations(plantTourId);
    console.log('Existing observations fetched:', existingObservations.length, 'items');

    const offlineData: PlantTourOfflineData = {
      criteriaList,
      employeeDetails: currentEmployeeDetails,
      existingObservations,
      timestamp: Date.now()
    };

    console.log('=== PLANT TOUR OFFLINE DATA FETCHED SUCCESSFULLY ===');
    console.log('Total criteria:', criteriaList.length);
    console.log('Employee details:', currentEmployeeDetails ? 'Found' : 'Not found');
    console.log('Existing observations:', existingObservations.length);
    console.log('Timestamp:', new Date(offlineData.timestamp).toISOString());

    return offlineData;

  } catch (error) {
    console.error('=== ERROR FETCHING PLANT TOUR OFFLINE DATA ===');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Check if offline data is still valid (not older than 24 hours)
 * @param timestamp - Timestamp of the offline data
 * @returns boolean
 */
export function isOfflineDataValid(timestamp: number | null): boolean {
  if (!timestamp) return false;
  
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  return (now - timestamp) < twentyFourHours;
}

/**
 * Get offline data age in hours
 * @param timestamp - Timestamp of the offline data
 * @returns number - Age in hours
 */
export function getOfflineDataAge(timestamp: number | null): number {
  if (!timestamp) return 0;
  
  const now = Date.now();
  const ageInMs = now - timestamp;
  const ageInHours = ageInMs / (1000 * 60 * 60);
  
  return Math.round(ageInHours * 100) / 100; // Round to 2 decimal places
}
