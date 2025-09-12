import { getAccessToken } from './getAccessToken';
import moment from 'moment';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// Interface for OPRP/CCP data matching Dynamics table structure
interface OPRPAndCCPData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string | null;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string | null;
  cr3ea_batchno: string | null;
  cr3ea_category: string | null;
  cr3ea_location: string | null;
  cr3ea_fecentrepass1: string; // OK or Not Okay (remarks)
  cr3ea_fecentrepass2: string;
  cr3ea_nfecentrepass1: string;
  cr3ea_nfecentrepass2: string;
  cr3ea_sscentrepass1: string;
  cr3ea_sscentrepass2: string;
  cr3ea_mdsensitivity: string;
  cr3ea_productname: string;
  cr3ea_executivename: string | null;
}

interface SaveResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Start session handler
export async function startSessionHandler(
  cycleNum: number,
  product: string,
  executiveName: string,
  batchNo: string,
  locationFrequency: string,
  category: string
) {
  try {
    console.log('=== START SESSION HANDLER ===');
    console.log('Parameters:', { cycleNum, product, executiveName, batchNo, locationFrequency, category });

    // Validate required parameters
    if (!cycleNum || cycleNum <= 0) {
      throw new Error('Invalid cycle number');
    }

    if (!product || product.trim() === '') {
      throw new Error('Product is required');
    }

    if (!executiveName || executiveName.trim() === '') {
      throw new Error('Executive name is required');
    }

    if (!batchNo || batchNo.trim() === '') {
      throw new Error('Batch number is required');
    }

    if (!locationFrequency || locationFrequency.trim() === '') {
      throw new Error('Location/frequency is required');
    }

    // Store both generic keys and CRM-specific keys for flexibility
    const startData = {
      product: product.trim(),
      executiveName: executiveName.trim(),
      batchNo: batchNo.trim(),
      locationFrequency: locationFrequency.trim(),
      category: category || 'OPRP Old Plant',
      cr3ea_productname: product.trim(),
      cr3ea_executivename: executiveName.trim(),
      cr3ea_batchno: batchNo.trim(),
      cr3ea_location: locationFrequency.trim(),
      cr3ea_category: category || 'OPRP Old Plant'
    };

    console.log('Start data to store:', startData);

    // Store in localStorage
    const storageKey = `oprp-ccp-cycle-${cycleNum}-start-data`;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(startData));
      console.log('Data stored successfully in localStorage with key:', storageKey);
    } catch (storageError) {
      console.error('Error storing data in localStorage:', storageError);
      throw new Error('Failed to store session data in localStorage');
    }
    
    console.log('=== START SESSION HANDLER COMPLETED ===');
    
    return startData;
  } catch (error) {
    console.error('Error in startSessionHandler:', error);
    throw error;
  }
}

// Fetch existing cycles for OPRP/CCP
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
    const tableName = "cr3ea_prod_oprpandcpps";
    // const tableName = "cr3ea_oprpandcpps";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=cr3ea_cycle,cr3ea_productname,cr3ea_batchno,cr3ea_location,cr3ea_category,cr3ea_fecentrepass1,cr3ea_fecentrepass2,cr3ea_nfecentrepass1,cr3ea_nfecentrepass2,cr3ea_sscentrepass1,cr3ea_sscentrepass2,cr3ea_mdsensitivity,cr3ea_executivename`;

    let response = await fetch(apiUrl, { headers });
    if (response.status === 401) {
      // Retry once with a fresh token
      const retryToken = await getAccessToken();
      const RetryAccessToken = (retryToken?.token || '').toString().trim();
      const retryHeaders = {
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Authorization": `Bearer ${RetryAccessToken}`
      } as const;
      response = await fetch(apiUrl, { headers: retryHeaders });
    }
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
          batchNo: record.cr3ea_batchno,
          location: record.cr3ea_location,
          category: record.cr3ea_category,
          fecentrepass1: record.cr3ea_fecentrepass1 || "OK",
          fecentrepass2: record.cr3ea_fecentrepass2 || "OK",
          nfecentrepass1: record.cr3ea_nfecentrepass1 || "OK",
          nfecentrepass2: record.cr3ea_nfecentrepass2 || "OK",
          sscentrepass1: record.cr3ea_sscentrepass1 || "OK",
          sscentrepass2: record.cr3ea_sscentrepass2 || "OK",
          md: record.cr3ea_mdsensitivity || "OK",
        };
      }
    });

    return Object.values(cycles);
  } catch (error) {
    console.error('Error fetching OPRP/CCP cycle data:', error);
    return [];
  }
}

// Collect estimation data for save
export async function collectEstimationDataCycleSave(
  cycleNum: number,
  formData: any,
  QualityTourId: string,
  UserName: string,
  selectedShift?: string | null
) {
  const savedData: OPRPAndCCPData[] = [];

  const startDataStr = localStorage.getItem(`oprp-ccp-cycle-${cycleNum}-start-data`);
  const startData = startDataStr ? JSON.parse(startDataStr) : {};
  const product = startData.cr3ea_productname || startData.product || "N/A";
  const executiveName = startData.cr3ea_executivename || startData.executiveName || null;
  const batchNo = startData.cr3ea_batchno || startData.batchNo || null;
  const location = startData.cr3ea_location || startData.locationFrequency || null;
  const category = startData.cr3ea_category || startData.category || null;

  console.log('=== EXECUTIVE NAME DEBUG ===');
  console.log('UserName parameter:', UserName);
  console.log('executiveName from localStorage:', executiveName);
  console.log('startData from localStorage:', startData);
  console.log('Final executive name will be:', UserName || executiveName || null);

  // Defaults
  let fecentrepass1 = "OK", fecentrepass2 = "OK", nfecentrepass1 = "OK", nfecentrepass2 = "OK",
      sscentrepass1 = "OK", sscentrepass2 = "OK", md = "OK";

  // If component provided explicit checklistItems, use them to derive statuses
  if (Array.isArray(formData?.checklistItems)) {
    const items: any[] = formData.checklistItems;
    const pick = (group: string, label: string) => items.find(i => i.group === group && i.label === label);
    const valFrom = (it: any) => it?.status === 'not-okay' ? `Not Okay (${it.remarks || 'No remarks'})` : 'OK';
    const fe1 = pick('FE', 'Centre 1st Pass');
    const fe2 = pick('FE', 'Centre 2nd Pass');
    const nfe1 = pick('NFE', 'Centre 1st Pass');
    const nfe2 = pick('NFE', 'Centre 2nd Pass');
    const ss1 = pick('SS', 'Centre 1st Pass');
    const ss2 = pick('SS', 'Centre 2nd Pass');
    const mdItem = items.find(i => i.id === 'md-sensitivity' || i.group?.toString().startsWith('M.'));
    fecentrepass1 = valFrom(fe1);
    fecentrepass2 = valFrom(fe2);
    nfecentrepass1 = valFrom(nfe1);
    nfecentrepass2 = valFrom(nfe2);
    sscentrepass1 = valFrom(ss1);
    sscentrepass2 = valFrom(ss2);
    md = valFrom(mdItem);
  } else {
    // Fallback: parse from aggregated strings if provided
    const parseList = (s?: string | null) => {
      if (!s) return [] as string[];
      const cleaned = s.replace(/^Okays:\s*/i, '').replace(/^Defects:\s*/i, '');
      return cleaned.split(';').map(x => x.trim()).filter(Boolean);
    };
    const okays = new Set(parseList(formData?.machineProof));
    const defectsArr = parseList(formData?.majorDefectsRemarks);
    const defectsMap = new Map<string, string>();
    defectsArr.forEach((d: string) => {
      const [k, v] = d.split(':').map((x: string) => x?.trim());
      if (k) defectsMap.set(k, v || 'No remarks');
    });
    const statusFor = (group: string, label: string) => {
      const key = `${group} - ${label}`;
      if (okays.has(key)) return 'OK';
      if (defectsMap.has(key)) return `Not Okay (${defectsMap.get(key)})`;
      return 'OK';
    };
    fecentrepass1 = statusFor('FE', 'Centre 1st Pass');
    fecentrepass2 = statusFor('FE', 'Centre 2nd Pass');
    nfecentrepass1 = statusFor('NFE', 'Centre 1st Pass');
    nfecentrepass2 = statusFor('NFE', 'Centre 2nd Pass');
    sscentrepass1 = statusFor('SS', 'Centre 1st Pass');
    sscentrepass2 = statusFor('SS', 'Centre 2nd Pass');
    md = statusFor('M.D. Sensitivity & Rejection in Time', 'M.D. Sensitivity & Rejection in Time');
  }

  const data: OPRPAndCCPData = {
    cr3ea_qualitytourid: QualityTourId,
    cr3ea_title: 'OPRP_' + moment().format('MM-DD-YYYY'),
    cr3ea_cycle: `Cycle-${cycleNum}`,
    cr3ea_shift: selectedShift || sessionStorage.getItem("shiftValue") || 'shift 1',
    cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
    cr3ea_observedby: UserName || null,
    cr3ea_batchno: batchNo,
    cr3ea_category: category,
    cr3ea_location: location,
    cr3ea_fecentrepass1: fecentrepass1,
    cr3ea_fecentrepass2: fecentrepass2,
    cr3ea_nfecentrepass1: nfecentrepass1,
    cr3ea_nfecentrepass2: nfecentrepass2,
    cr3ea_sscentrepass1: sscentrepass1,
    cr3ea_sscentrepass2: sscentrepass2,
    cr3ea_mdsensitivity: md,
    cr3ea_productname: product,
    cr3ea_executivename: UserName || executiveName || null
  };

  savedData.push(data);
  return { savedData };
}

// Save section API
export async function saveSectionApiCall(data: OPRPAndCCPData[]): Promise<SaveResponse> {
  try {
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
    const tableName = "cr3ea_prod_oprpandcpps";
    // const tableName = "cr3ea_oprpandcpps";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

    const results = [];
    for (const record of data) {
      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(record)
      });

      if (response.status === 401) {
        // Retry with a fresh token once
        const retryToken = await getAccessToken();
        const RetryAccessToken = (retryToken?.token || '').toString().trim();
        const retryHeaders = {
          "Accept": "application/json",
          "Content-Type": "application/json; charset=utf-8",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          "Prefer": "return=representation",
          "Authorization": `Bearer ${RetryAccessToken}`
        };
        response = await fetch(apiUrl, { method: 'POST', headers: retryHeaders, body: JSON.stringify(record) });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save record: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      results.push(result);
    }

    return {
      success: true,
      message: `${data.length} records saved successfully`,
      data: results
    };
  } catch (error) {
    console.error('Error saving OPRP/CCP records:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save records. Please try again.',
      data: []
    };
  }
}

// Interface for the cycle data structure mirrored for UI
export interface OPRPAndCCPCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  batchNo?: string | null;
  location?: string | null;
  category?: string | null;
  fecentrepass1?: string;
  fecentrepass2?: string;
  nfecentrepass1?: string;
  nfecentrepass2?: string;
  sscentrepass1?: string;
  sscentrepass2?: string;
  md?: string;
  // Offline data fields (for compatibility with Redux offline data structure)
  sku?: string | null;
  proof?: string | null;
  remarks?: string | null;
}

// Interface for offline saved data (matches Redux structure)
interface OfflineSavedData {
  cycleNo: number;
  records: OPRPAndCCPCycleData[];
  timestamp: number;
}

// Sync offline data to backend
export async function syncOfflineDataToBackend(
  offlineData: OfflineSavedData[],
  QualityTourId: string,
  UserName: string,
  selectedShift?: string | null
): Promise<SaveResponse> {
  try {
    console.log('=== SYNCING OFFLINE DATA TO BACKEND ===');
    console.log('Offline data to sync:', offlineData);
    console.log('Offline data length:', offlineData.length);
    console.log('Quality Tour ID:', QualityTourId);
    console.log('User Name:', UserName);
    console.log('Selected Shift:', selectedShift);

    if (!offlineData || offlineData.length === 0) {
      console.log('No offline data to sync - returning early');
      return {
        success: true,
        message: 'No offline data to sync',
        data: []
      };
    }

    const allSavedData: OPRPAndCCPData[] = [];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each offline data item
    for (const offlineItem of offlineData) {
      console.log(`Processing offline item for cycle ${offlineItem.cycleNo}`);
      
      // Process each record in the offline item
      for (const record of offlineItem.records) {
        try {
          // Convert offline record to API format
          const apiData = await convertOfflineRecordToApiFormat(
            record,
            offlineItem.cycleNo,
            QualityTourId,
            UserName,
            selectedShift
          );
          
          allSavedData.push(apiData);
          successCount++;
        } catch (error) {
          console.error(`Error converting record for cycle ${offlineItem.cycleNo}:`, error);
          errorCount++;
          errors.push(`Cycle ${offlineItem.cycleNo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Save all converted data to backend
    if (allSavedData.length > 0) {
      console.log(`Saving ${allSavedData.length} records to backend...`);
      const saveResult = await saveSectionApiCall(allSavedData);
      
      if (saveResult.success) {
        console.log('All offline data synced successfully');
        return {
          success: true,
          message: `Successfully synced ${successCount} records. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`,
          data: saveResult.data
        };
      } else {
        throw new Error(saveResult.message);
      }
    } else {
      return {
        success: false,
        message: 'No valid data to sync',
        data: []
      };
    }

  } catch (error) {
    console.error('Error syncing offline data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to sync offline data',
      data: []
    };
  }
}

// Convert offline record to API format
async function convertOfflineRecordToApiFormat(
  record: OPRPAndCCPCycleData,
  cycleNo: number,
  QualityTourId: string,
  UserName: string,
  selectedShift?: string | null
): Promise<OPRPAndCCPData> {
  console.log('=== CONVERTING OFFLINE RECORD TO API FORMAT ===');
  console.log('Input record:', record);
  console.log('Cycle number:', cycleNo);
  console.log('Quality Tour ID:', QualityTourId);
  console.log('User Name:', UserName);
  console.log('Selected Shift:', selectedShift);

  // Parse statuses from the stored proof/remarks strings
  const parseList = (s?: string | null) => {
    if (!s) return [] as string[];
    const cleaned = s.replace(/^Okays:\s*/i, '').replace(/^Defects:\s*/i, '');
    return cleaned.split(';').map(x => x.trim()).filter(Boolean);
  };

  console.log('Record proof field:', record.proof);
  console.log('Record remarks field:', record.remarks);
  
  const okays = new Set(parseList(record.proof));
  const defectsArr = parseList(record.remarks);
  const defectsMap = new Map<string, string>();
  
  console.log('Parsed okays:', Array.from(okays));
  console.log('Parsed defects array:', defectsArr);
  
  defectsArr.forEach((d: string) => {
    const [k, v] = d.split(':').map((x: string) => x?.trim());
    if (k) defectsMap.set(k, v || 'No remarks');
  });
  
  console.log('Defects map:', Object.fromEntries(defectsMap));

  const statusFor = (group: string, label: string) => {
    const key = `${group} - ${label}`;
    if (okays.has(key)) return 'OK';
    if (defectsMap.has(key)) return `Not Okay (${defectsMap.get(key)})`;
    return 'OK';
  };

  // Get start data from localStorage if available
  const startDataStr = localStorage.getItem(`oprp-ccp-cycle-${cycleNo}-start-data`);
  const startData = startDataStr ? JSON.parse(startDataStr) : {};

  const apiData: OPRPAndCCPData = {
    cr3ea_qualitytourid: QualityTourId,
    cr3ea_title: 'OPRP_' + moment().format('MM-DD-YYYY'),
    cr3ea_cycle: `Cycle-${cycleNo}`,
    cr3ea_shift: selectedShift || sessionStorage.getItem("shiftValue") || 'shift 1',
    cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
    cr3ea_observedby: UserName || null,
    cr3ea_batchno: startData.cr3ea_batchno || startData.batchNo || record.batchNo || null,
    cr3ea_category: startData.cr3ea_category || startData.category || record.category || null,
    cr3ea_location: startData.cr3ea_location || startData.locationFrequency || record.location || null,
    cr3ea_fecentrepass1: statusFor('FE', 'Centre 1st Pass'),
    cr3ea_fecentrepass2: statusFor('FE', 'Centre 2nd Pass'),
    cr3ea_nfecentrepass1: statusFor('NFE', 'Centre 1st Pass'),
    cr3ea_nfecentrepass2: statusFor('NFE', 'Centre 2nd Pass'),
    cr3ea_sscentrepass1: statusFor('SS', 'Centre 1st Pass'),
    cr3ea_sscentrepass2: statusFor('SS', 'Centre 2nd Pass'),
    cr3ea_mdsensitivity: statusFor('M.D. Sensitivity & Rejection in Time', 'M.D. Sensitivity & Rejection in Time'),
    cr3ea_productname: startData.cr3ea_productname || startData.product || record.product,
    cr3ea_executivename: UserName || startData.cr3ea_executivename || startData.executiveName || record.executiveName || null
  };

  console.log('=== FINAL API DATA ===');
  console.log('Converted API data:', apiData);
  console.log('API data keys:', Object.keys(apiData));
  console.log('=== END CONVERSION ===');
  return apiData;
}


