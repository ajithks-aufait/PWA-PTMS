import { getAccessToken } from './getAccessToken';
import moment from 'moment';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// Interface for Code Verification data
interface CodeVerificationData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string;
  cr3ea_machineproof: string | null;
  cr3ea_remarks: string | null;
  cr3ea_sku: string | null;
  cr3ea_productname: string;
//   cr3ea_executivename: string;
}

interface SaveResponse {
  success: boolean;
  message: string;
  data?: any;
}

// API for start section handler
export async function startSessionHandler(
  cycleNum: number,
  product: string,
  executiveName: string
) {
  console.log("Start Session handler called for cycle:", cycleNum);
  
  const startData = {
    product,
    executiveName
  };

  localStorage.setItem(`cycle-${cycleNum}-start-data`, JSON.stringify(startData));
  console.log("Start data saved to localStorage:", startData);
  
  return startData;
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
    const tableName = "cr3ea_prod_codeverifications";
    // const tableName = "cr3ea_codeverifications";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=cr3ea_productname,cr3ea_sku,cr3ea_remarks,cr3ea_machineproof,cr3ea_cycle`;

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
          executiveName: record.cr3ea_executivename,
          sku: record.cr3ea_sku,
          proof: record.cr3ea_machineproof,
          remarks: record.cr3ea_remarks,
        };
      }
    });

    return Object.values(cycles);
  } catch (error) {
    console.error('Error fetching cycle data:', error);
    return [];
  }
}

// API for setting up the cycle data
export async function collectEstimationDataCycleSave(
  cycleNum: number,
  formData: any,
  QualityTourId: string,
  UserName: string
) {
  console.log('=== COLLECTING CODE VERIFICATION DATA ===');
  console.log('Cycle number:', cycleNum);
  console.log('Form data:', formData);
  console.log('Quality Tour ID:', QualityTourId);
  console.log('User name:', UserName);

  const savedData: CodeVerificationData[] = [];
  
  // Get start data from localStorage
  const startDataStr = localStorage.getItem(`cycle-${cycleNum}-start-data`);
  const startData = startDataStr ? JSON.parse(startDataStr) : {};
  const product = startData.product || "N/A";
//   const executiveName = startData.executiveName || "N/A";

  const data: CodeVerificationData = {
    "cr3ea_qualitytourid": QualityTourId,
    "cr3ea_title": 'CodeVerification_' + moment().format('MM-DD-YYYY'),
    "cr3ea_cycle": `Cycle-${cycleNum}`,
    "cr3ea_shift": sessionStorage.getItem("shiftValue") || "shift 1",
    "cr3ea_tourstartdate": moment().format('MM-DD-YYYY'),
    "cr3ea_observedby": UserName || '',
    "cr3ea_machineproof": formData.machineProof || null,
    "cr3ea_remarks": formData.majorDefectsRemarks || null,
    "cr3ea_sku": formData.sku || null,
    "cr3ea_productname": product
    // "cr3ea_executivename": executiveName
  };

  savedData.push(data);
  console.log('Collected data for API:', savedData);
  
  return { savedData };
}

// API for save section
export async function saveSectionApiCall(data: CodeVerificationData[]): Promise<SaveResponse> {
  try {
    console.log('=== SAVING CODE VERIFICATION DATA ===');
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
    const tableName = "cr3ea_prod_codeverifications";
    // const tableName = "cr3ea_codeverifications";
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
    console.error('Error saving code verification records:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save records. Please try again.',
      data: []
    };
  }
}

// Interface for the cycle data structure
export interface CodeVerificationCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  sku: string | null;
  proof: string | null;
  remarks: string | null;
}