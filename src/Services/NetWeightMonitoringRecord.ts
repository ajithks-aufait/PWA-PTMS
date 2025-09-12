import { getAccessToken } from './getAccessToken';
import moment from 'moment';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// Payload interface for Net Weight Monitoring
export interface NetWeightMonitoringData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string | null;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string | null;
  cr3ea_productname: string;
  cr3ea_executivename: string | null;
  cr3ea_batchno: string | null;
  cr3ea_expirydate: string | null;
  cr3ea_packeddate: string | null;
  cr3ea_mc1inspection1?: string | null;
  cr3ea_mc1inspection2?: string | null;
  cr3ea_mc1inspection3?: string | null;
  cr3ea_mc1inspection4?: string | null;
  cr3ea_mc1inspection5?: string | null;
  cr3ea_mc1avg?: string | null;
  cr3ea_mc2inspection1?: string | null;
  cr3ea_mc2inspection2?: string | null;
  cr3ea_mc2inspection3?: string | null;
  cr3ea_mc2inspection4?: string | null;
  cr3ea_mc2inspection5?: string | null;
  cr3ea_mc2avg?: string | null;
  cr3ea_mc3inspection1?: string | null;
  cr3ea_mc3inspection2?: string | null;
  cr3ea_mc3inspection3?: string | null;
  cr3ea_mc3inspection4?: string | null;
  cr3ea_mc3inspection5?: string | null;
  cr3ea_mc3avg?: string | null;
  cr3ea_mc4inspection1?: string | null;
  cr3ea_mc4inspection2?: string | null;
  cr3ea_mc4inspection3?: string | null;
  cr3ea_mc4inspection4?: string | null;
  cr3ea_mc4inspection5?: string | null;
  cr3ea_mc4avg?: string | null;
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
  executiveName: string,
  batchNo?: string,
  packaged?: string,
  expiry?: string
) {
  const startData = {
    product,
    executiveName,
    batchNo: batchNo || '',
    package: packaged || '',
    packaged: packaged || '',
    expiry: expiry || ''
  };

  localStorage.setItem(`cycle-${cycleNum}-start-data`, JSON.stringify(startData));
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
    const tableName = "cr3ea_prod_netweights";
    // const tableName = "cr3ea_netweights";
    const select = [
      'cr3ea_cycle',
      'cr3ea_mc1inspection1','cr3ea_mc1inspection2','cr3ea_mc1inspection3','cr3ea_mc1inspection4','cr3ea_mc1inspection5','cr3ea_mc1avg',
      'cr3ea_mc2inspection1','cr3ea_mc2inspection2','cr3ea_mc2inspection3','cr3ea_mc2inspection4','cr3ea_mc2inspection5','cr3ea_mc2avg',
      'cr3ea_mc3inspection1','cr3ea_mc3inspection2','cr3ea_mc3inspection3','cr3ea_mc3inspection4','cr3ea_mc3inspection5','cr3ea_mc3avg',
      'cr3ea_mc4inspection1','cr3ea_mc4inspection2','cr3ea_mc4inspection3','cr3ea_mc4inspection4','cr3ea_mc4inspection5','cr3ea_mc4avg',
      'cr3ea_productname','cr3ea_batchno','cr3ea_packeddate','cr3ea_expirydate','cr3ea_executivename'
    ].join(',');
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=${select}`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);

    const data = await response.json();
    const cycles: any = {};

    data.value.forEach((record: any) => {
      const cycleNum = (record.cr3ea_cycle || '').replace('Cycle-', '');
      if (!cycleNum) return;
      const normalize = (arr: any[]) => arr
        .map(v => (v === null || v === undefined ? '' : String(v)))
        .map(s => s.trim())
        .filter(s => s !== '' && s.toLowerCase() !== 'nan');
      const candidate = {
        mc1: normalize([record.cr3ea_mc1inspection1, record.cr3ea_mc1inspection2, record.cr3ea_mc1inspection3, record.cr3ea_mc1inspection4, record.cr3ea_mc1inspection5]),
        mc2: normalize([record.cr3ea_mc2inspection1, record.cr3ea_mc2inspection2, record.cr3ea_mc2inspection3, record.cr3ea_mc2inspection4, record.cr3ea_mc2inspection5]),
        mc3: normalize([record.cr3ea_mc3inspection1, record.cr3ea_mc3inspection2, record.cr3ea_mc3inspection3, record.cr3ea_mc3inspection4, record.cr3ea_mc3inspection5]),
        mc4: normalize([record.cr3ea_mc4inspection1, record.cr3ea_mc4inspection2, record.cr3ea_mc4inspection3, record.cr3ea_mc4inspection4, record.cr3ea_mc4inspection5]),
        product: record?.cr3ea_productname || 'N/A',
        executiveName: record?.cr3ea_executivename || 'N/A',
        batchNo: record?.cr3ea_batchno || 'N/A',
        packageDate: record?.cr3ea_packeddate || 'N/A',
        expiryDate: record?.cr3ea_expirydate || 'N/A'
      };

      if (!cycles[cycleNum]) {
        cycles[cycleNum] = { cycleNum, ...candidate };
        const storedData = localStorage.getItem(`cycle-${cycleNum}-start-data`);
        if (storedData) {
          const { product } = JSON.parse(storedData);
          cycles[cycleNum].product = product || 'N/A';
        }
      } else {
        const existing = cycles[cycleNum];
        const existingCount = existing.mc1.length + existing.mc2.length + existing.mc3.length + existing.mc4.length;
        const candidateCount = candidate.mc1.length + candidate.mc2.length + candidate.mc3.length + candidate.mc4.length;
        if (candidateCount > existingCount) {
          cycles[cycleNum] = { cycleNum, ...candidate };
        }
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
  QualityTourId: string,
  UserName: string
) {
  const startDataStr = localStorage.getItem(`cycle-${cycleNum}-start-data`);
  const startData = startDataStr ? JSON.parse(startDataStr) : {};
  const product = startData.product || "N/A";
  const executiveName = startData.executiveName || "N/A";
  const batchNo = startData.batchNo || "N/A";
  const packageDate = startData.package || startData.packaged || "N/A";
  const expiry = startData.expiry || "N/A";

  function read(id: string): string | null {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const val = el?.value ?? '';
    return val === '' ? null : val;
  }
  const mc1 = [1,2,3,4,5].map(i => read(`mc1-inspection-${i}-${cycleNum}`));
  const mc2 = [1,2,3,4,5].map(i => read(`mc2-inspection-${i}-${cycleNum}`));
  const mc3 = [1,2,3,4,5].map(i => read(`mc3-inspection-${i}-${cycleNum}`));
  const mc4 = [1,2,3,4,5].map(i => read(`mc4-inspection-${i}-${cycleNum}`));

  const parseNums = (arr: (string | null)[]) => arr.map(v => (v == null ? NaN : parseFloat(v)) ).filter(n => !Number.isNaN(n)) as number[];
  const avg = (nums: number[]) => nums.length ? (nums.reduce((a,b)=>a+b,0) / nums.length).toFixed(2) : null;

  const data: NetWeightMonitoringData = {
    cr3ea_qualitytourid: QualityTourId,
    cr3ea_title: 'NetWeights_' + moment().format('MM-DD-YYYY'),
    cr3ea_cycle: `Cycle-${cycleNum}`,
    cr3ea_shift: sessionStorage.getItem("shiftValue") || "shift 1",
    cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
    cr3ea_observedby: UserName || null,
    cr3ea_productname: product,
    cr3ea_executivename: executiveName,
    cr3ea_batchno: batchNo,
    cr3ea_expirydate: expiry,
    cr3ea_packeddate: packageDate,
    cr3ea_mc1inspection1: mc1[0] ?? null,
    cr3ea_mc1inspection2: mc1[1] ?? null,
    cr3ea_mc1inspection3: mc1[2] ?? null,
    cr3ea_mc1inspection4: mc1[3] ?? null,
    cr3ea_mc1inspection5: mc1[4] ?? null,
    cr3ea_mc1avg: avg(parseNums(mc1)),
    cr3ea_mc2inspection1: mc2[0] ?? null,
    cr3ea_mc2inspection2: mc2[1] ?? null,
    cr3ea_mc2inspection3: mc2[2] ?? null,
    cr3ea_mc2inspection4: mc2[3] ?? null,
    cr3ea_mc2inspection5: mc2[4] ?? null,
    cr3ea_mc2avg: avg(parseNums(mc2)),
    cr3ea_mc3inspection1: mc3[0] ?? null,
    cr3ea_mc3inspection2: mc3[1] ?? null,
    cr3ea_mc3inspection3: mc3[2] ?? null,
    cr3ea_mc3inspection4: mc3[3] ?? null,
    cr3ea_mc3inspection5: mc3[4] ?? null,
    cr3ea_mc3avg: avg(parseNums(mc3)),
    cr3ea_mc4inspection1: mc4[0] ?? null,
    cr3ea_mc4inspection2: mc4[1] ?? null,
    cr3ea_mc4inspection3: mc4[2] ?? null,
    cr3ea_mc4inspection4: mc4[3] ?? null,
    cr3ea_mc4inspection5: mc4[4] ?? null,
    cr3ea_mc4avg: avg(parseNums(mc4))
  };

  return { savedData: [data] };
}

// API for save section
export async function saveSectionApiCall(data: NetWeightMonitoringData[]): Promise<SaveResponse> {
  try {
    console.log('=== SAVING NET WEIGHT MONITORING DATA ===');
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
    const tableName = "cr3ea_prod_netweights";
    // const tableName = "cr3ea_netweights";
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
    console.error('Error saving net weight monitoring records:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save records. Please try again.',
      data: []
    };
  }
}

// Interface for the cycle data structure
export interface NetWeightMonitoringCycleData {
  cycleNum: string;
  product: string;
  executiveName: string;
  batchNo: string;
  packageDate: string;
  expiryDate: string;
  mc1: string[];
  mc2: string[];
  mc3: string[];
  mc4: string[];
}

// Interface for offline saved data structure
export interface OfflineSavedData {
  cycleNo: number;
  records: NetWeightMonitoringCycleData[];
  timestamp: number;
}

// Function to sync offline data to backend
export async function syncOfflineDataToBackend(
  offlineData: OfflineSavedData[],
  QualityTourId: string,
  UserName: string,
  selectedShift: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('=== SYNCING NET WEIGHT MONITORING OFFLINE DATA TO BACKEND ===');
    console.log('Offline data to sync:', offlineData);
    console.log('Offline data length:', offlineData.length);
    console.log('Quality Tour ID:', QualityTourId);
    console.log('User Name:', UserName);
    console.log('Selected Shift:', selectedShift);

    if (!offlineData || offlineData.length === 0) {
      console.log('No offline data to sync');
      return { success: true, message: 'No offline data to sync' };
    }

    let totalSynced = 0;
    let totalErrors = 0;

    for (const data of offlineData) {
      try {
        console.log(`Processing offline data for cycle ${data.cycleNo}:`, data);
        
        for (const record of data.records) {
          const apiData = await convertOfflineRecordToApiFormat(
            record,
            data.cycleNo,
            QualityTourId,
            UserName,
            selectedShift
          );
          
          console.log('Converted API data:', apiData);
          
          const response = await saveSectionApiCall([apiData]);
          
          if (response.success) {
            console.log(`Successfully synced record for cycle ${data.cycleNo}`);
            totalSynced++;
          } else {
            throw new Error(`Failed to sync record: ${response.message}`);
          }
        }
      } catch (error) {
        console.error(`Failed to sync cycle ${data.cycleNo}:`, error);
        totalErrors++;
      }
    }

    const message = `Synced ${totalSynced} records successfully${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`;
    console.log('Sync completed:', message);
    
    return {
      success: totalErrors === 0,
      message
    };
  } catch (error) {
    console.error('Error syncing offline data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to sync offline data'
    };
  }
}

// Function to convert offline record to API format
export async function convertOfflineRecordToApiFormat(
  record: NetWeightMonitoringCycleData,
  cycleNo: number,
  QualityTourId: string,
  UserName: string,
  selectedShift: string
): Promise<NetWeightMonitoringData> {
  console.log('=== CONVERTING OFFLINE RECORD TO API FORMAT ===');
  console.log('Input record:', record);
  console.log('Input record type:', typeof record);
  console.log('Input record keys:', Object.keys(record));
  console.log('Cycle number:', cycleNo);
  console.log('Quality Tour ID:', QualityTourId);
  console.log('User Name:', UserName);
  console.log('Selected Shift:', selectedShift);

  // Parse inspection values from arrays
  const mc1Values = record.mc1 || [];
  const mc2Values = record.mc2 || [];
  const mc3Values = record.mc3 || [];
  const mc4Values = record.mc4 || [];

  console.log('MC1 values:', mc1Values);
  console.log('MC1 values type:', typeof mc1Values);
  console.log('MC1 values length:', mc1Values.length);
  console.log('MC2 values:', mc2Values);
  console.log('MC2 values type:', typeof mc2Values);
  console.log('MC2 values length:', mc2Values.length);
  console.log('MC3 values:', mc3Values);
  console.log('MC3 values type:', typeof mc3Values);
  console.log('MC3 values length:', mc3Values.length);
  console.log('MC4 values:', mc4Values);
  console.log('MC4 values type:', typeof mc4Values);
  console.log('MC4 values length:', mc4Values.length);

  // Helper function to calculate average
  const calculateAverage = (values: string[]): string | null => {
    const numbers = values
      .map(v => parseFloat(v))
      .filter(n => !isNaN(n));
    
    if (numbers.length === 0) return null;
    
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    return (sum / numbers.length).toFixed(2);
  };

  const apiData: NetWeightMonitoringData = {
    cr3ea_qualitytourid: QualityTourId,
    cr3ea_title: 'NetWeights_' + moment().format('MM-DD-YYYY'),
    cr3ea_cycle: `Cycle-${cycleNo}`,
    cr3ea_shift: selectedShift || "shift 1",
    cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
    cr3ea_observedby: UserName || null,
    cr3ea_productname: record.product || "N/A",
    cr3ea_executivename: UserName || record.executiveName || null,
    cr3ea_batchno: record.batchNo || null,
    cr3ea_expirydate: record.expiryDate || null,
    cr3ea_packeddate: record.packageDate || null,
    
    // MC1 inspection values
    cr3ea_mc1inspection1: (mc1Values[0] && mc1Values[0].trim() !== '') ? mc1Values[0] : null,
    cr3ea_mc1inspection2: (mc1Values[1] && mc1Values[1].trim() !== '') ? mc1Values[1] : null,
    cr3ea_mc1inspection3: (mc1Values[2] && mc1Values[2].trim() !== '') ? mc1Values[2] : null,
    cr3ea_mc1inspection4: (mc1Values[3] && mc1Values[3].trim() !== '') ? mc1Values[3] : null,
    cr3ea_mc1inspection5: (mc1Values[4] && mc1Values[4].trim() !== '') ? mc1Values[4] : null,
    cr3ea_mc1avg: calculateAverage(mc1Values),
    
    // MC2 inspection values
    cr3ea_mc2inspection1: (mc2Values[0] && mc2Values[0].trim() !== '') ? mc2Values[0] : null,
    cr3ea_mc2inspection2: (mc2Values[1] && mc2Values[1].trim() !== '') ? mc2Values[1] : null,
    cr3ea_mc2inspection3: (mc2Values[2] && mc2Values[2].trim() !== '') ? mc2Values[2] : null,
    cr3ea_mc2inspection4: (mc2Values[3] && mc2Values[3].trim() !== '') ? mc2Values[3] : null,
    cr3ea_mc2inspection5: (mc2Values[4] && mc2Values[4].trim() !== '') ? mc2Values[4] : null,
    cr3ea_mc2avg: calculateAverage(mc2Values),
    
    // MC3 inspection values
    cr3ea_mc3inspection1: (mc3Values[0] && mc3Values[0].trim() !== '') ? mc3Values[0] : null,
    cr3ea_mc3inspection2: (mc3Values[1] && mc3Values[1].trim() !== '') ? mc3Values[1] : null,
    cr3ea_mc3inspection3: (mc3Values[2] && mc3Values[2].trim() !== '') ? mc3Values[2] : null,
    cr3ea_mc3inspection4: (mc3Values[3] && mc3Values[3].trim() !== '') ? mc3Values[3] : null,
    cr3ea_mc3inspection5: (mc3Values[4] && mc3Values[4].trim() !== '') ? mc3Values[4] : null,
    cr3ea_mc3avg: calculateAverage(mc3Values),
    
    // MC4 inspection values
    cr3ea_mc4inspection1: (mc4Values[0] && mc4Values[0].trim() !== '') ? mc4Values[0] : null,
    cr3ea_mc4inspection2: (mc4Values[1] && mc4Values[1].trim() !== '') ? mc4Values[1] : null,
    cr3ea_mc4inspection3: (mc4Values[2] && mc4Values[2].trim() !== '') ? mc4Values[2] : null,
    cr3ea_mc4inspection4: (mc4Values[3] && mc4Values[3].trim() !== '') ? mc4Values[3] : null,
    cr3ea_mc4inspection5: (mc4Values[4] && mc4Values[4].trim() !== '') ? mc4Values[4] : null,
    cr3ea_mc4avg: calculateAverage(mc4Values)
  };

  console.log('=== FINAL API DATA ===');
  console.log('Converted API data:', apiData);
  console.log('API data keys:', Object.keys(apiData));
  console.log('MC1 inspection values:', {
    cr3ea_mc1inspection1: apiData.cr3ea_mc1inspection1,
    cr3ea_mc1inspection2: apiData.cr3ea_mc1inspection2,
    cr3ea_mc1inspection3: apiData.cr3ea_mc1inspection3,
    cr3ea_mc1inspection4: apiData.cr3ea_mc1inspection4,
    cr3ea_mc1inspection5: apiData.cr3ea_mc1inspection5,
    cr3ea_mc1avg: apiData.cr3ea_mc1avg
  });
  console.log('MC2 inspection values:', {
    cr3ea_mc2inspection1: apiData.cr3ea_mc2inspection1,
    cr3ea_mc2inspection2: apiData.cr3ea_mc2inspection2,
    cr3ea_mc2inspection3: apiData.cr3ea_mc2inspection3,
    cr3ea_mc2inspection4: apiData.cr3ea_mc2inspection4,
    cr3ea_mc2inspection5: apiData.cr3ea_mc2inspection5,
    cr3ea_mc2avg: apiData.cr3ea_mc2avg
  });
  console.log('=== END CONVERSION ===');

  return apiData;
}