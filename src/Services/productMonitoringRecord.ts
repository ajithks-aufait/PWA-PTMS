import { getAccessToken } from './getAccessToken';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// Interface for Product Monitoring data
interface ProductMonitoringData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string;
  cr3ea_dimensioncentre: string | null;
  cr3ea_dimensionnonoperating: string | null;
  cr3ea_dimensionoperating: string | null;
  cr3ea_dryweightovenendcentre: string | null;
  cr3ea_dryweightovenendnonoperating: string | null;
  cr3ea_dryweightovenendoperating: string | null;
  cr3ea_gaugecentre: string | null;
  cr3ea_gaugenonoperating: string | null;
  cr3ea_gaugeoperating: string | null;
  cr3ea_moisture: string | null;
  cr3ea_productname: string;
}

interface SaveResponse {
  success: boolean;
  message: string;
  data?: any;
}

// API for fetch cycle data
export async function fetchCycleData(QualityTourId: string) {
  try {
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    const headers = {
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Authorization": `Bearer ${accessToken}`
    };

    const apiVersion = "9.2";
    const tableName = "cr3ea_prod_productmonitorings";
    // const tableName = "cr3ea_productmonitorings";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=cr3ea_productname,cr3ea_cycle,cr3ea_moisture,cr3ea_gaugeoperating,cr3ea_gaugenonoperating,cr3ea_gaugecentre,cr3ea_dryweightovenendoperating,cr3ea_dryweightovenendnonoperating,cr3ea_dryweightovenendcentre,cr3ea_dimensionoperating,cr3ea_dimensionnonoperating,cr3ea_dimensioncentre`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);

    const data = await response.json();
    const cycles: any = {};

    data.value.forEach((record: any) => {
      const cycleNum = record.cr3ea_cycle.replace('Cycle-', '');
      if (!cycles[cycleNum]) {
        cycles[cycleNum] = {
          cycleNum,
          product: record.cr3ea_productname,
          cr3ea_moisture: record.cr3ea_moisture,
          cr3ea_gaugeoperating: record.cr3ea_gaugeoperating,
          cr3ea_gaugenonoperating: record.cr3ea_gaugenonoperating,
          cr3ea_gaugecentre: record.cr3ea_gaugecentre,
          cr3ea_dryweightovenendoperating: record.cr3ea_dryweightovenendoperating,
          cr3ea_dryweightovenendnonoperating: record.cr3ea_dryweightovenendnonoperating,
          cr3ea_dryweightovenendcentre: record.cr3ea_dryweightovenendcentre,
          cr3ea_dimensionoperating: record.cr3ea_dimensionoperating,
          cr3ea_dimensionnonoperating: record.cr3ea_dimensionnonoperating,
          cr3ea_dimensioncentre: record.cr3ea_dimensioncentre,
        };
      }
    });

    return Object.values(cycles);
  } catch (error) {
    console.error('Error fetching cycle data:', error);
    return [];
  }
}

// API for collect the estimation data from cycle
export function collectEstimationDataCycleSave(
  cycleNum: number,
  formData: any,
  plantTourId: string,
  selectedCycle: string,
  userName: string
) {
  console.log('=== COLLECTING ESTIMATION DATA ===');
  console.log('Cycle number:', cycleNum);
  console.log('Form data:', formData);
  console.log('Plant tour ID:', plantTourId);
  console.log('Selected cycle:', selectedCycle);
  console.log('User name:', userName);

  const savedData: ProductMonitoringData[] = [];
  
  // Get current date in MM-DD-YYYY format
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

  const data: ProductMonitoringData = {
    "cr3ea_qualitytourid": plantTourId,
    "cr3ea_title": 'QAT_' + currentDate,
    "cr3ea_cycle": `Cycle-${cycleNum}`,
    "cr3ea_shift": selectedCycle || "shift 1",
    "cr3ea_tourstartdate": currentDate,
    "cr3ea_observedby": userName || '',
    "cr3ea_dimensioncentre": formData.dimensionCentre || null,
    "cr3ea_dimensionnonoperating": formData.dimensionNonOperating || null,
    "cr3ea_dimensionoperating": formData.dimensionOperating || null,
    "cr3ea_dryweightovenendcentre": formData.dryWeightOvenEndCentre || null,
    "cr3ea_dryweightovenendnonoperating": formData.dryWeightOvenEndNonOperating || null,
    "cr3ea_dryweightovenendoperating": formData.dryWeightOvenEndOperating || null,
    "cr3ea_gaugecentre": formData.gaugeCentre || null,
    "cr3ea_gaugenonoperating": formData.gaugeNonOperating || null,
    "cr3ea_gaugeoperating": formData.gaugeOperating || null,
    "cr3ea_moisture": formData.moisture || null,
    "cr3ea_productname": formData.product || 'Speciality Sauces',
  };

  savedData.push(data);
  console.log('Collected data for API:', savedData);
  
  return { savedData };
}

// API section for Save function
export async function saveProductMonitoringData(data: ProductMonitoringData[]): Promise<SaveResponse> {
  try {
    console.log('=== SAVING PRODUCT MONITORING DATA ===');
    console.log('Data to save:', data);
    
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation",
      "Authorization": `Bearer ${accessToken}`
    };

    const apiVersion = "9.2";
    const tableName = "cr3ea_prod_productmonitorings";
    // const tableName = "cr3ea_productmonitorings";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

    const results = [];
    for (const record of data) {
      console.log('Saving record:', record);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save record:', response.status, errorText);
        throw new Error(`Failed to save record: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Record saved successfully:', result);
      results.push(result);
    }

    console.log(`${data.length} records saved successfully`);
    return {
      success: true,
      message: `${data.length} records saved successfully`,
      data: results
    };
  } catch (error) {
    console.error('Error saving product monitoring records:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save records. Please try again.',
      data: []
    };
  }
}

// Redux thunk for fetching and storing cycle data
export const fetchAndStoreCycleData = (QualityTourId: string) => async (dispatch: any) => {
  try {
    console.log('Fetching product monitoring cycle data for QualityTourId:', QualityTourId);
    
    const cycles = await fetchCycleData(QualityTourId);
    console.log('Fetched cycles:', cycles);
    
    // Import the action from the slice
    const { setCycles, setLastFetchTimestamp } = await import('../store/productMonitoringSlice');
    
    dispatch(setCycles(cycles as ProductMonitoringCycleData[]));
    dispatch(setLastFetchTimestamp(Date.now()));
    
    console.log('Product monitoring cycle data stored in Redux');
    return cycles;
  } catch (error) {
    console.error('Error in fetchAndStoreCycleData:', error);
    throw error;
  }
};

// Interface for the cycle data structure
export interface ProductMonitoringCycleData {
  cycleNum: string;
  product: string;
  cr3ea_moisture: string | null;
  cr3ea_gaugeoperating: string | null;
  cr3ea_gaugenonoperating: string | null;
  cr3ea_gaugecentre: string | null;
  cr3ea_dryweightovenendoperating: string | null;
  cr3ea_dryweightovenendnonoperating: string | null;
  cr3ea_dryweightovenendcentre: string | null;
  cr3ea_dimensionoperating: string | null;
  cr3ea_dimensionnonoperating: string | null;
  cr3ea_dimensioncentre: string | null;
}