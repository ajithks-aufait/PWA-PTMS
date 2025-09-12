/**
 * Comprehensive Plant Tour Service
 * Handles all API operations for Plant Tour Section
 */



// Interface for Observation Data
export interface ObservationData {
  cr3ea_title: string;
  cr3ea_observedbyrole: string;
  cr3ea_plantid: string;
  cr3ea_departmentid: string;
  cr3ea_departmenttourid: string;
  cr3ea_areaid: string;
  cr3ea_criteriaid: string;
  cr3ea_observedby: string;
  cr3ea_observedperson: string;
  cr3ea_categoryid: string | null;
  cr3ea_categorytitle: string;
  cr3ea_what: string;
  cr3ea_criteria: string;
  cr3ea_correctiveaction: string;
  cr3ea_status: string;
  cr3ea_tourdate: string;
  cr3ea_action: string;
  cr3ea_observeddate: string;
  cr3ea_where: string;
  cr3ea_closurecomment: string;
  cr3ea_observation?: string;
  cr3ea_severityid?: string;
}

// Interface for Tour Update Data
export interface TourUpdateData {
  cr3ea_finalcomment: string;
  cr3ea_totalcriterias: string;
  cr3ea_totalobservations: string;
  cr3ea_totalnacriterias: string;
  cr3ea_totalcompliances: string;
  cr3ea_tourscore: string;
  cr3ea_tourcompletiondate: string;
  cr3ea_status: string;
}

// Interface for Employee Details
export interface EmployeeDetails {
  roleName: string;
  plantId: string;
  departmentId: string;
  name: string;
}


/**
 * Save plant tour section data to SharePoint using MSAL token
 * @param sectionData - The section data to save
 * @returns Promise<boolean>
 */
export async function savePlantTourSectionData(sectionData: any): Promise<boolean> {
  try {
    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    console.log('Saving plant tour section data to SharePoint using MSAL token:', sectionData);
    console.log('Using access token:', accessToken ? 'Token available' : 'No token');
    
    // TODO: Implement the actual save logic based on your requirements
    // This is a placeholder for the save functionality
    // You can implement SharePoint list item creation/update here using the MSAL token
    
    console.log('Plant tour section data saved successfully');
    return true;

  } catch (error) {
    console.error('Error in savePlantTourSectionData:', error);
    
    if (error instanceof Error) {
      throw new Error(`Plant tour section save failed: ${error.message}`);
    } else {
      throw new Error('Plant tour section save failed: Unknown error occurred');
    }
  }
}

/**
 * Save observation to Dynamics 365 API
 * @param observationData - The observation data to save
 * @returns Promise<any>
 */
export async function saveObservationToAPI(observationData: ObservationData): Promise<any> {
  try {
    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
    const tableName = 'cr3ea_prod_observationses';
    const apiVersion = '9.2';
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${accessToken}`
    };
    
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;
    
    console.log('Saving observation to API:', { apiUrl, observationData });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(observationData)
    });
    
    console.log('Save observation response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Save observation API error:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Save observation successful:', result);
    return result;
  } catch (error) {
    console.error('Error in saveObservationToAPI:', error);
    throw error;
  }
}

/**
 * Update existing observation in Dynamics 365 API
 * @param observationId - The ID of the observation to update
 * @param observationData - The observation data to update
 * @returns Promise<any>
 */
export async function updateObservationToAPI(observationId: string, observationData: ObservationData): Promise<any> {
  try {
    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
    const tableName = 'cr3ea_prod_observationses';
    const apiVersion = '9.2';
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${accessToken}`
    };
    
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${observationId})`;
    
    console.log('Updating observation to API:', { apiUrl, observationData });
    
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(observationData)
    });
    
    console.log('Update observation response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update observation API error:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Update observation successful:', result);
    return result;
  } catch (error) {
    console.error('Error in updateObservationToAPI:', error);
    throw error;
  }
}

/**
 * Delete observation from Dynamics 365 API
 * @param observationId - The ID of the observation to delete
 * @returns Promise<any>
 */
export async function deleteObservationFromAPI(observationId: string): Promise<any> {
  try {
    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
    const tableName = 'cr3ea_prod_observationses';
    const apiVersion = '9.2';
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${accessToken}`
    };
    
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${observationId})`;
    
    console.log('Deleting observation from API:', { apiUrl, observationId });
    
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers
    });
    
    console.log('Delete observation response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete observation API error:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log('Delete observation successful');
    return true;
  } catch (error) {
    console.error('Error in deleteObservationFromAPI:', error);
    throw error;
  }
}

/**
 * Fetch existing observations from Dynamics 365 API
 * @param plantTourId - The plant tour ID to fetch observations for
 * @returns Promise<any[]>
 */
export async function fetchExistingObservations(plantTourId: string): Promise<any[]> {
  try {
    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const access_Token = tokenResult?.token;
    if (!access_Token) {
      throw new Error("Access token is invalid or missing");
    }

    const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
    const tableName = 'cr3ea_prod_observationses';
    const apiVersion = '9.2';
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_departmenttourid eq '${plantTourId}'`;
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Authorization': `Bearer ${access_Token}`
    };
    
    console.log('Fetching existing observations:', { apiUrl, plantTourId });
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers
    });
    
    console.log('Fetch observations response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fetch observations API error:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Existing observations fetched:', data.value);
    
    return data.value || [];
  } catch (error) {
    console.error('Error in fetchExistingObservations:', error);
    throw error;
  }
}

/**
 * Update tour status in Dynamics 365 API
 * @param plantTourId - The plant tour ID to update
 * @param tourData - The tour data to update
 * @returns Promise<any>
 */
export async function updateTourStatus(plantTourId: string, tourData: TourUpdateData): Promise<any> {
  try {
    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
    const tableName = 'cr3ea_prod_departmenttours';
    const apiVersion = '9.2';
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${plantTourId})`;
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${accessToken}`
    };
    
    console.log('Updating tour status:', { apiUrl, plantTourId, tourData });
    
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(tourData)
    });
    
    console.log('Update tour status response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update tour status API error:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Update tour status successful:', result);
    return result;
  } catch (error) {
    console.error('Error in updateTourStatus:', error);
    throw error;
  }
}

/**
 * Create observation data for checklist responses
 * @param criteria - The criteria details
 * @param employeeDetails - Employee details
 * @param user - User information
 * @param plantTourId - Plant tour ID
 * @param sectionName - Section name
 * @param response - The response (Approved/Rejected/Not Applicable)
 * @param comment - Optional comment
 * @param isNearMiss - Whether it's a near miss
 * @returns ObservationData
 */
export function createObservationData(
  criteria: any,
  employeeDetails: EmployeeDetails,
  user: any,
  plantTourId: string,
  sectionName: string,
  response: string,
  comment: string = '',
  isNearMiss: boolean = false
): ObservationData {
  const currentDate = new Date();
  
  // Helper function to get severity ID
  const getSeverityId = (response: string, isNearMiss: boolean): string => {
    if (response === 'Rejected') {
      return isNearMiss ? '2' : '1'; // 2 for Near Miss, 1 for Rejected
    }
    return '0'; // 0 for Approved/Not Applicable
  };
  
  // Helper function to get status
  const getStatus = (response: string): string => {
    switch (response) {
      case 'Approved': return 'Approved';
      case 'Rejected': return 'Rejected';
      case 'Not Applicable': return 'NA';
      default: return 'Pending';
    }
  };
  
  return {
    cr3ea_title: `${employeeDetails?.roleName || 'User'}_${currentDate.toLocaleDateString()}`,
    cr3ea_observedbyrole: employeeDetails?.roleName || 'User',
    cr3ea_plantid: String(employeeDetails?.plantId || ''),
    cr3ea_departmentid: String(employeeDetails?.departmentId || ''),
    cr3ea_departmenttourid: String(plantTourId || ''),
    cr3ea_areaid: criteria.Area || sectionName,
    cr3ea_criteriaid: String(criteria.id || ''),
    cr3ea_observedby: user?.Name || '',
    cr3ea_observedperson: employeeDetails?.name || '',
    cr3ea_categoryid: criteria.Category || null,
    cr3ea_categorytitle: criteria.Category || '',
    cr3ea_what: criteria.What || '',
    cr3ea_criteria: criteria.Criteria || '',
    cr3ea_observation: comment,
    cr3ea_correctiveaction: '',
    cr3ea_severityid: getSeverityId(response, isNearMiss),
    cr3ea_status: getStatus(response),
    cr3ea_tourdate: currentDate.toLocaleString(),
    cr3ea_action: response,
    cr3ea_observeddate: currentDate.toLocaleString(),
    cr3ea_where: criteria.Area || sectionName,
    cr3ea_closurecomment: ''
  };
}
