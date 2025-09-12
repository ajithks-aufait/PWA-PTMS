/**
 * Plant Tour Offline Storage Service
 * Handles saving and retrieving offline data for Plant Tour observations
 */

export interface OfflineObservationData {
  id: string;
  sectionName: string;
  questionId: string;
  response: string;
  comment: string;
  nearMiss: boolean;
  timestamp: number;
  plantTourId: string;
  employeeDetails: any;
  user: any;
  // API payload data
  observationData?: any;
  isNotApplicable?: boolean;
}

export interface OfflineTourData {
  plantTourId: string;
  observations: OfflineObservationData[];
  tourStats: any;
  lastUpdated: number;
  isCompleted: boolean;
}

const STORAGE_KEY = 'plantTourOfflineData';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Save observation data to offline storage
 */
export function saveOfflineObservation(observationData: OfflineObservationData): void {
  try {
    const existingData = getOfflineTourData(observationData.plantTourId);
    
    // Update or add the observation
    const existingIndex = existingData.observations.findIndex(
      obs => obs.sectionName === observationData.sectionName && 
             obs.questionId === observationData.questionId
    );
    
    if (existingIndex >= 0) {
      existingData.observations[existingIndex] = observationData;
    } else {
      existingData.observations.push(observationData);
    }
    
    existingData.lastUpdated = Date.now();
    
    // Save to localStorage
    const allData = getAllOfflineData();
    allData[observationData.plantTourId] = existingData;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    
    console.log('Offline observation saved:', observationData);
  } catch (error) {
    console.error('Error saving offline observation:', error);
    // If localStorage is full, try to clean up old data
    if (error instanceof DOMException && error.code === 22) {
      cleanupOldData();
      // Retry saving
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getAllOfflineData()));
        console.log('Offline observation saved after cleanup');
      } catch (retryError) {
        console.error('Failed to save after cleanup:', retryError);
      }
    }
  }
}

/**
 * Get offline tour data for a specific plant tour
 */
export function getOfflineTourData(plantTourId: string): OfflineTourData {
  try {
    const allData = getAllOfflineData();
    return allData[plantTourId] || {
      plantTourId,
      observations: [],
      tourStats: null,
      lastUpdated: Date.now(),
      isCompleted: false
    };
  } catch (error) {
    console.error('Error getting offline tour data:', error);
    return {
      plantTourId,
      observations: [],
      tourStats: null,
      lastUpdated: Date.now(),
      isCompleted: false
    };
  }
}

/**
 * Get all offline data
 */
export function getAllOfflineData(): Record<string, OfflineTourData> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting all offline data:', error);
    return {};
  }
}

/**
 * Delete an offline observation
 */
export function deleteOfflineObservation(plantTourId: string, sectionName: string, questionId: string): void {
  try {
    const tourData = getOfflineTourData(plantTourId);
    tourData.observations = tourData.observations.filter(
      obs => !(obs.sectionName === sectionName && obs.questionId === questionId)
    );
    tourData.lastUpdated = Date.now();
    
    const allData = getAllOfflineData();
    allData[plantTourId] = tourData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    
    console.log('Offline observation deleted:', { plantTourId, sectionName, questionId });
  } catch (error) {
    console.error('Error deleting offline observation:', error);
  }
}

/**
 * Update tour statistics in offline storage
 */
export function updateOfflineTourStats(plantTourId: string, tourStats: any): void {
  try {
    const tourData = getOfflineTourData(plantTourId);
    tourData.tourStats = tourStats;
    tourData.lastUpdated = Date.now();
    
    const allData = getAllOfflineData();
    allData[plantTourId] = tourData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    
    console.log('Offline tour stats updated:', tourStats);
  } catch (error) {
    console.error('Error updating offline tour stats:', error);
  }
}

/**
 * Mark tour as completed in offline storage
 */
export function markOfflineTourCompleted(plantTourId: string): void {
  try {
    const tourData = getOfflineTourData(plantTourId);
    tourData.isCompleted = true;
    tourData.lastUpdated = Date.now();
    
    const allData = getAllOfflineData();
    allData[plantTourId] = tourData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    
    console.log('Offline tour marked as completed:', plantTourId);
  } catch (error) {
    console.error('Error marking offline tour as completed:', error);
  }
}

/**
 * Get all offline tours that need syncing
 */
export function getOfflineToursForSync(): OfflineTourData[] {
  try {
    const allData = getAllOfflineData();
    return Object.values(allData).filter(tour => tour.observations.length > 0);
  } catch (error) {
    console.error('Error getting offline tours for sync:', error);
    return [];
  }
}

/**
 * Clear offline data for a specific tour
 */
export function clearOfflineTourData(plantTourId: string): void {
  try {
    const allData = getAllOfflineData();
    delete allData[plantTourId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    
    console.log('Offline tour data cleared:', plantTourId);
  } catch (error) {
    console.error('Error clearing offline tour data:', error);
  }
}

/**
 * Clean up old offline data to free up storage space
 */
function cleanupOldData(): void {
  try {
    const allData = getAllOfflineData();
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Remove tours older than 30 days
    Object.keys(allData).forEach(plantTourId => {
      if (allData[plantTourId].lastUpdated < thirtyDaysAgo) {
        delete allData[plantTourId];
      }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    console.log('Old offline data cleaned up');
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const used = data ? new Blob([data]).size : 0;
    const available = MAX_STORAGE_SIZE - used;
    const percentage = (used / MAX_STORAGE_SIZE) * 100;
    
    return { used, available, percentage };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { used: 0, available: MAX_STORAGE_SIZE, percentage: 0 };
  }
}
