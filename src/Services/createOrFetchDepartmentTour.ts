/**
 * Service for creating or fetching Department Plant Tour ID
 * This service handles department tours for non-Quality departments
 */

// Environment URL
// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

export interface DepartmentTourParams {
  accessToken: string;
  departmentId: string;
  employeeName: string;
  roleName: string;
  plantId: string;
  userRoleID: string;
}

export interface DepartmentTourResponse {
  cr3ea_prod_departmenttourid?: string;
  cr3ea_departmenttourid?: string;
  cr3ea_departmenttour_id?: string;
  id?: string;
  cr3ea_title: string;
  cr3ea_status: string;
  cr3ea_departmentid: string;
  cr3ea_plantid: string;
  cr3ea_tourstartdate: string;
  cr3ea_tourby: string;
  cr3ea_observedby: string;
  cr3ea_roleid: string;
}

/**
 * Creates or fetches a Department Plant Tour ID
 * @param params - Department tour parameters
 * @returns Promise<string | null> - Department tour ID or null if failed
 */
export async function createOrFetchDepartmentTour({
  accessToken,
  departmentId,
  employeeName,
  roleName,
  plantId,
  userRoleID,
}: DepartmentTourParams): Promise<string | null> {
  if (!accessToken) {
    console.error('Access token is required for department tour creation');
    return null;
  }

  if (!departmentId || !employeeName || !roleName || !plantId || !userRoleID) {
    console.error('Missing required parameters for department tour creation');
    return null;
  }

  const apiVersion = "9.2";
  const tableName = "cr3ea_prod_departmenttours";
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const tourStartDate = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const title = `${roleName}_${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Prefer: "return=representation",
    Authorization: `Bearer ${accessToken}`,
  };

  const dataToSave = {
    cr3ea_departmentid: departmentId.toString(),
    cr3ea_tourstartdate: tourStartDate,
    cr3ea_tourby: employeeName,
    cr3ea_status: "In Progress",
    cr3ea_plantid: plantId.toString(),
    cr3ea_observedby: employeeName,
    cr3ea_roleid: userRoleID.toString(),
    cr3ea_title: title,
  };

  try {
    console.log('=== Department Tour Creation Debug ===');
    console.log('Parameters received:', {
      departmentId,
      employeeName,
      roleName,
      plantId,
      userRoleID,
      accessToken: accessToken ? 'Present' : 'Missing'
    });
    console.log('API URL:', apiUrl);
    console.log('Data to save:', dataToSave);
    console.log('Headers:', headers);

    console.log('Checking for existing department tour...', { departmentId, status: 'In Progress' });

    // Check if a department tour is already in progress
    const checkUrl = `${apiUrl}?$filter=cr3ea_status eq 'In Progress' and cr3ea_departmentid eq '${departmentId}'&$top=1`;
    console.log('Check URL:', checkUrl);
    
    const existingTourResponse = await fetch(checkUrl, {
      method: "GET",
      headers,
    });

    console.log('Existing tour response status:', existingTourResponse.status, existingTourResponse.statusText);

    if (!existingTourResponse.ok) {
      const errorText = await existingTourResponse.text();
      console.error('Error checking for existing department tour:', errorText);
      throw new Error(`Error checking existing tour: ${existingTourResponse.status} ${existingTourResponse.statusText} - ${errorText}`);
    }

    const existingTourData = await existingTourResponse.json();
    console.log('Existing department tour check result:', existingTourData);

    if (existingTourData.value && existingTourData.value.length > 0) {
      const existingTour = existingTourData.value[0];
      console.log('Found existing department tour:', existingTour);
      // Try different possible field names for the ID
      const tourId = existingTour.cr3ea_prod_departmenttourid || existingTour.cr3ea_departmenttourid || existingTour.cr3ea_departmenttour_id || existingTour.id;
      console.log('Extracted tour ID:', tourId);
      return tourId;
    }

    console.log('No existing department tour found, creating new one...');

    // Create new department tour
    console.log('Creating new department tour with data:', dataToSave);
    console.log('Request URL:', apiUrl);
    console.log('Request headers:', headers);
    console.log('Request body:', JSON.stringify(dataToSave));
    
    const createResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(dataToSave),
    });

    console.log('Create response status:', createResponse.status, createResponse.statusText);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Error creating department tour:', errorText);
      throw new Error(`Error creating department tour: ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
    }

    const newTourData = await createResponse.json();
    console.log('Created new department tour:', newTourData);
    console.log('Response headers:', createResponse.headers);
    console.log('Response status:', createResponse.status);
    console.log('Response URL:', createResponse.url);

    // Try different possible field names for the ID
    const tourId = newTourData.cr3ea_prod_departmenttourid || newTourData.cr3ea_departmenttourid || newTourData.cr3ea_departmenttour_id || newTourData.id;
    console.log('Extracted new tour ID:', tourId);

    if (!tourId) {
      console.error('No department tour ID in response:', newTourData);
      console.error('Available fields in response:', Object.keys(newTourData));
      throw new Error('Department tour created but no ID returned');
    }

    console.log('=== Department Tour Creation Success ===');
    return tourId;

  } catch (error) {
    console.error('=== Department Tour Creation Error ===');
    console.error('Error in createOrFetchDepartmentTour:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}

/**
 * Updates department tour status
 * @param accessToken - Access token
 * @param departmentTourId - Department tour ID
 * @param status - New status
 * @returns Promise<boolean> - Success status
 */
export async function updateDepartmentTourStatus(
  accessToken: string,
  departmentTourId: string,
  status: string
): Promise<boolean> {
  if (!accessToken || !departmentTourId || !status) {
    console.error('Missing required parameters for department tour status update');
    return false;
  }

  const apiVersion = "9.2";
  const tableName = "cr3ea_prod_departmenttours";
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${departmentTourId})`;

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Prefer: "return=representation",
    Authorization: `Bearer ${accessToken}`,
  };

  const updateData = {
    cr3ea_status: status,
    cr3ea_tourcompletiondate: status === 'Completed' ? new Date().toISOString() : null
  };

  try {
    console.log('Updating department tour status:', { departmentTourId, status });

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error updating department tour status:', errorText);
      throw new Error(`Error updating department tour status: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Department tour status updated successfully:', result);
    return true;

  } catch (error) {
    console.error('Error in updateDepartmentTourStatus:', error);
    return false;
  }
}
