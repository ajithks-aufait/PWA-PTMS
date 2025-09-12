/**
 * Finish Tour Service
 * Handles tour completion functionality
 */

import { getAccessToken } from './getAccessToken';

export interface FinishTourData {
  cr3ea_finalcomment: string;
  cr3ea_totalcriterias: number;
  cr3ea_totalobservations: number;
  cr3ea_totalnacriterias: number;
  cr3ea_totalcompliances: number;
  cr3ea_tourscore: string;
  cr3ea_tourcompletiondate: string;
  cr3ea_status: string;
}

export interface ValidationData {
  TotalCriteria: number;
  ApprovedCriteria: number;
  RejectedCriteria: number;
  NACriteria: number;
  IsValidated: boolean;
  ValidationMsg?: string;
}

/**
 * Finish a plant tour by updating the department tour record
 * @param plantTourId - The plant tour ID
 * @param validationData - Tour validation data
 * @param finalComment - Final comment from user
 * @returns Promise with tour score
 */
export async function finishPlantTour(
  plantTourId: string,
  validationData: ValidationData,
  finalComment: string = ''
): Promise<string> {
  try {
    console.log('Finishing plant tour:', plantTourId);
    console.log('Validation data:', validationData);
    console.log('Final comment:', finalComment);

    // Validate tour data
    if (!validationData.IsValidated) {
      throw new Error(validationData.ValidationMsg || 'Tour validation failed');
    }

    // Calculate tour score
    let totalScore = '0';
    if (validationData.TotalCriteria > 0) {
      const tourScore = (validationData.ApprovedCriteria / validationData.TotalCriteria) * 100;
      totalScore = tourScore.toFixed(2);
    }

    // Get access token
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;

    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    // Prepare API data
    const dataToSave: FinishTourData = {
      cr3ea_finalcomment: finalComment,
      cr3ea_totalcriterias: parseInt(String(validationData.TotalCriteria)) + parseInt(String(validationData.NACriteria)),
      cr3ea_totalobservations: parseInt(String(validationData.RejectedCriteria)),
      cr3ea_totalnacriterias: parseInt(String(validationData.NACriteria)),
      cr3ea_totalcompliances: parseInt(String(validationData.ApprovedCriteria)),
      cr3ea_tourscore: totalScore,
      cr3ea_tourcompletiondate: new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      cr3ea_status: 'Completed'
    };

    console.log('Data to save:', dataToSave);

    // Make API call
    const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
    const tableName = "cr3ea_prod_departmenttours";
    const apiVersion = "9.2";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${plantTourId})`;

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": "return=representation",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(dataToSave)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    console.log('Tour finished successfully with score:', totalScore);
    return totalScore;

  } catch (error) {
    console.error('Error finishing plant tour:', error);
    throw error;
  }
}

/**
 * Store finish tour data offline for later sync
 * @param plantTourId - The plant tour ID
 * @param validationData - Tour validation data
 * @param finalComment - Final comment from user
 * @returns Tour score
 */
export function storeFinishTourOffline(
  plantTourId: string,
  validationData: ValidationData,
  finalComment: string = ''
): string {
  try {
    console.log('Storing finish tour data offline:', plantTourId);

    // Calculate tour score
    let totalScore = '0';
    if (validationData.TotalCriteria > 0) {
      const tourScore = (validationData.ApprovedCriteria / validationData.TotalCriteria) * 100;
      totalScore = tourScore.toFixed(2);
    }

    // Prepare finish data
    const finishData = {
      plantTourId: plantTourId,
      validationData: validationData,
      finalComment: finalComment,
      tourScore: totalScore,
      finishTimestamp: new Date().toISOString(),
      dataToSave: {
        cr3ea_finalcomment: finalComment,
        cr3ea_totalcriterias: parseInt(String(validationData.TotalCriteria)) + parseInt(String(validationData.NACriteria)),
        cr3ea_totalobservations: parseInt(String(validationData.RejectedCriteria)),
        cr3ea_totalnacriterias: parseInt(String(validationData.NACriteria)),
        cr3ea_totalcompliances: parseInt(String(validationData.ApprovedCriteria)),
        cr3ea_tourscore: totalScore,
        cr3ea_tourcompletiondate: new Date().toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        cr3ea_status: 'Completed'
      }
    };

    // Get existing offline data
    const existingOfflineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
    
    // Update with finish data
    existingOfflineData.finishData = finishData;
    
    // Save back to localStorage
    localStorage.setItem('plantTourOfflineData', JSON.stringify(existingOfflineData));
    
    console.log('Finish tour data stored offline:', finishData);
    return totalScore;

  } catch (error) {
    console.error('Error storing finish tour data offline:', error);
    throw error;
  }
}

/**
 * Sync finish tour data when coming back online
 * @returns Promise<boolean> - Success status
 */
export async function syncFinishTourData(): Promise<boolean> {
  try {
    console.log('Syncing finish tour data...');
    
    const offlineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
    if (!offlineData.finishData) {
      console.log('No finish data to sync');
      return true;
    }

    const finishData = offlineData.finishData;
    console.log('Found finish data to sync:', finishData);

    // Sync the finish data
    await finishPlantTour(
      finishData.plantTourId,
      finishData.validationData,
      finishData.finalComment
    );

    // Remove finish data from localStorage after successful sync
    delete offlineData.finishData;
    localStorage.setItem('plantTourOfflineData', JSON.stringify(offlineData));

    console.log('Finish tour data synced successfully');
    return true;

  } catch (error) {
    console.error('Error syncing finish tour data:', error);
    return false;
  }
}
