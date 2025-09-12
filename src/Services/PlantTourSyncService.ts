/**
 * Plant Tour Sync Service
 * Handles syncing offline data to the server when online
 */

import * as PlantTourService from './PlantTourService';
import { saveNotApplicableObservation } from './NotApplicableObservationService';
import { getOfflineToursForSync, clearOfflineTourData, type OfflineTourData, type OfflineObservationData } from './PlantTourOfflineStorage';

export interface SyncResult {
  success: boolean;
  syncedObservations: number;
  failedObservations: number;
  errors: string[];
  tourId: string;
}

export interface SyncProgress {
  current: number;
  total: number;
  currentTour: string;
  currentOperation: string;
}

/**
 * Sync all offline data to the server
 */
export async function syncAllOfflineData(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const offlineTours = getOfflineToursForSync();
  
  console.log('=== STARTING OFFLINE DATA SYNC ===');
  console.log('Found offline tours:', offlineTours.length);
  
  for (let i = 0; i < offlineTours.length; i++) {
    const tour = offlineTours[i];
    console.log(`Syncing tour ${i + 1}/${offlineTours.length}:`, tour.plantTourId);
    
    onProgress?.({
      current: i + 1,
      total: offlineTours.length,
      currentTour: tour.plantTourId,
      currentOperation: 'Syncing tour data...'
    });
    
    const result = await syncOfflineTour(tour, onProgress);
    results.push(result);
    
    // If sync was successful, clear the offline data
    if (result.success && result.failedObservations === 0) {
      clearOfflineTourData(tour.plantTourId);
      console.log('Cleared offline data for tour:', tour.plantTourId);
    }
  }
  
  console.log('=== OFFLINE DATA SYNC COMPLETED ===');
  console.log('Results:', results);
  
  return results;
}

/**
 * Sync a single offline tour
 */
async function syncOfflineTour(
  tour: OfflineTourData,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedObservations: 0,
    failedObservations: 0,
    errors: [],
    tourId: tour.plantTourId
  };
  
  console.log(`Syncing tour: ${tour.plantTourId}`);
  console.log(`Observations to sync: ${tour.observations.length}`);
  
  for (let i = 0; i < tour.observations.length; i++) {
    const observation = tour.observations[i];
    
    onProgress?.({
      current: i + 1,
      total: tour.observations.length,
      currentTour: tour.plantTourId,
      currentOperation: `Syncing observation ${i + 1}/${tour.observations.length}...`
    });
    
    try {
      if (observation.isNotApplicable) {
        // Handle Not Applicable observations
        await syncNotApplicableObservation(observation);
      } else {
        // Handle regular observations
        await syncRegularObservation(observation);
      }
      
      result.syncedObservations++;
      console.log(`Successfully synced observation ${i + 1}/${tour.observations.length}`);
      
    } catch (error) {
      result.failedObservations++;
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Observation ${i + 1}: ${errorMessage}`);
      console.error(`Failed to sync observation ${i + 1}:`, error);
    }
  }
  
  console.log(`Tour sync completed: ${result.syncedObservations} synced, ${result.failedObservations} failed`);
  return result;
}

/**
 * Sync a regular observation
 */
async function syncRegularObservation(observation: OfflineObservationData): Promise<void> {
  if (!observation.observationData) {
    throw new Error('No observation data available for sync');
  }
  
  console.log('Syncing regular observation:', observation.observationData);
  
  // Use the existing PlantTourService to save the observation
  const result = await PlantTourService.saveObservationToAPI(observation.observationData);
  
  if (!result) {
    throw new Error('Failed to save observation to API');
  }
  
  console.log('Regular observation synced successfully:', result);
}

/**
 * Sync a Not Applicable observation
 */
async function syncNotApplicableObservation(observation: OfflineObservationData): Promise<void> {
  if (!observation.observationData) {
    throw new Error('No observation data available for Not Applicable sync');
  }
  
  console.log('Syncing Not Applicable observation:', observation.observationData);
  
  // Extract criteria details from observationData
  const criteriaDetails = {
    id: observation.observationData.cr3ea_criteriaid || observation.questionId,
    Area: observation.observationData.cr3ea_areaid || observation.sectionName,
    Category: observation.observationData.cr3ea_categoryid || '',
    What: observation.observationData.cr3ea_what || '',
    Criteria: observation.observationData.cr3ea_criteria || '',
    // Add other required fields from observationData
    ...observation.observationData
  };
  
  // Use the existing NotApplicableObservationService with correct parameters
  await saveNotApplicableObservation(
    criteriaDetails,
    observation.employeeDetails,
    observation.user,
    observation.plantTourId,
    observation.sectionName
  );
  
  console.log('Not Applicable observation synced successfully');
}

/**
 * Check if there's any offline data to sync
 */
export function hasOfflineDataToSync(): boolean {
  const offlineTours = getOfflineToursForSync();
  
  // Check for pause and finish data in localStorage
  try {
    const offlineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
    if (offlineData.pauseData) {
      console.log('Found pause data to sync');
      return true;
    }
    if (offlineData.finishData) {
      console.log('Found finish data to sync');
      return true;
    }
  } catch (error) {
    console.error('Error checking for pause/finish data:', error);
  }
  
  return offlineTours.length > 0;
}

/**
 * Get summary of offline data
 */
export function getOfflineDataSummary(): {
  totalTours: number;
  totalObservations: number;
  oldestData: number | null;
} {
  const offlineTours = getOfflineToursForSync();
  const totalObservations = offlineTours.reduce((sum, tour) => sum + tour.observations.length, 0);
  const oldestData = offlineTours.length > 0 
    ? Math.min(...offlineTours.map(tour => tour.lastUpdated))
    : null;
  
  return {
    totalTours: offlineTours.length,
    totalObservations,
    oldestData
  };
}

/**
 * Clear all offline data (used when canceling offline mode)
 */
export function clearAllOfflineData(): void {
  try {
    localStorage.removeItem('plantTourOfflineData');
    console.log('All offline data cleared from localStorage');
  } catch (error) {
    console.error('Error clearing all offline data:', error);
  }
}
