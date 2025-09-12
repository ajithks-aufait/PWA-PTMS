/**
 * Service for handling Not Applicable observations in Plant Tour Section
 * This service implements the SaveNAObservationTableDraft functionality
 */

export interface NotApplicableObservationData {
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
}

export interface CriteriaDetails {
  id: string;
  Area: string;
  Category: string;
  What: string;
  Criteria: string;
  Title?: string;
  Plant?: string;
  Department?: string;
  Role?: string;
}

export interface EmployeeDetails {
  roleName: string;
  plantId: string;
  departmentId: string;
  name: string;
}

/**
 * Creates observation data for Not Applicable criteria
 */
export const createNotApplicableObservationData = (
  criteria: CriteriaDetails,
  employeeDetails: EmployeeDetails,
  user: any,
  plantTourId: string,
  sectionName: string
): NotApplicableObservationData => {
  const currentDate = new Date();
  
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  const observationData = {
    cr3ea_title: `${employeeDetails?.roleName || 'User'}_${formatDateShort(currentDate)}`,
    cr3ea_observedbyrole: employeeDetails?.roleName || 'User',
    cr3ea_plantid: String(employeeDetails?.plantId || ''),
    cr3ea_departmentid: String(employeeDetails?.departmentId || ''),
    cr3ea_departmenttourid: plantTourId,
    cr3ea_areaid: criteria.Area || sectionName,
    cr3ea_criteriaid: String(criteria.id || ''),
    cr3ea_observedby: user?.Name,
    cr3ea_observedperson: employeeDetails?.name || '',
    cr3ea_categoryid: criteria.Category || null,
    cr3ea_categorytitle: criteria.Category || '',
    cr3ea_what: criteria.What || '',
    cr3ea_criteria: criteria.Criteria || '',
    cr3ea_correctiveaction: '',
    cr3ea_status: 'NA',
    cr3ea_tourdate: currentDate.toLocaleString(),
    cr3ea_action: 'Not Applicable',
    cr3ea_observeddate: currentDate.toLocaleString(),
    cr3ea_where: criteria.Area || sectionName,
    cr3ea_closurecomment: ''
  };
  
  return observationData;
};

/**
 * Updates an existing observation in the API
 */
export const updateExistingObservation = async (
  accessToken: string,
  uniqueId: string,
  observationData: NotApplicableObservationData
): Promise<any> => {
  const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
  const tableName = 'cr3ea_prod_observationses';
  const apiVersion = '9.2';
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${uniqueId})`;
  
  console.log('Updating existing observation:', { apiUrl, uniqueId, observationData });
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Prefer': 'return=representation',
    'Authorization': `Bearer ${accessToken}`
  };
  
  const response = await fetch(apiUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(observationData)
  });
  
  console.log('Update response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Update API error response:', errorText);
    throw new Error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('Update successful:', result);
  return result;
};

/**
 * Creates a new observation in the API
 */
export const createNewObservation = async (
  accessToken: string,
  observationData: NotApplicableObservationData
): Promise<any> => {
  const environmentUrl = 'https://orgea61b289.crm8.dynamics.com';
  const tableName = 'cr3ea_prod_observationses';
  const apiVersion = '9.2';
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;
  
  console.log('Creating new observation:', { apiUrl, observationData });
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    'Prefer': 'return=representation',
    'Authorization': `Bearer ${accessToken}`
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(observationData)
  });
  
  console.log('Create response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Create API error response:', errorText);
    throw new Error(`Create failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('Create successful:', result);
  return result;
};

/**
 * Main function to save Not Applicable observation (SaveNAObservationTableDraft)
 * This function handles both creating new observations and updating existing ones
 */
export const saveNotApplicableObservation = async (
  criteria: CriteriaDetails,
  employeeDetails: EmployeeDetails,
  user: any,
  plantTourId: string,
  sectionName: string
): Promise<void> => {
  try {
    console.log('saveNotApplicableObservation called with:', {
      criteria,
      employeeDetails,
      user,
      plantTourId,
      sectionName
    });

    // Get access token
    const { getAccessToken } = await import('./getAccessToken');
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }
    if (!criteria || !criteria.id) {
      throw new Error('Criteria with ID is required');
    }
    if (!employeeDetails) {
      throw new Error('Employee details are required');
    }
    if (!plantTourId) {
      throw new Error('Plant tour ID is required');
    }

    // Create observation data
    const observationData = createNotApplicableObservationData(
      criteria,
      employeeDetails,
      user,
      plantTourId,
      sectionName
    );
    
    console.log('Created observation data:', observationData);
    
    // Check if observation already exists in sessionStorage
    const itemId = `uniqueID_${criteria.id}_${plantTourId}`;
    const existingUniqueId = sessionStorage.getItem(itemId);
    
    console.log('Session storage check:', { itemId, existingUniqueId });
    
    if (existingUniqueId && existingUniqueId !== '' && existingUniqueId !== 'undefined') {
      // Update existing observation
      console.log('Updating existing observation with ID:', existingUniqueId);
      await updateExistingObservation(accessToken, existingUniqueId, observationData);
      console.log('Updated existing Not Applicable observation successfully');
    } else {
      // Create new observation
      console.log('Creating new observation');
      const newObservation = await createNewObservation(accessToken, observationData);
      console.log('New observation response:', newObservation);
      
      // Try to extract the observation ID from the response
      let observationId = null;
      
      // Check for different possible field names in the response
      if (newObservation) {
        observationId = newObservation.cr3ea_observationsid || 
                       newObservation.cr3ea_observationsesid || 
                       newObservation.id || 
                       newObservation.observationsid ||
                       newObservation.observationsesid;
      }
      
      if (observationId) {
        sessionStorage.setItem(itemId, observationId);
        console.log('Created new Not Applicable observation and stored ID:', observationId);
      } else {
        console.warn('Could not extract observation ID from API response:', newObservation);
        // Don't throw error - the observation was still created successfully
        console.log('Not Applicable observation created successfully, but ID not stored in session');
      }
    }
  } catch (error) {
    console.error('Error in saveNotApplicableObservation:', error);
    throw error; // Re-throw to be handled by the calling function
  }
};
