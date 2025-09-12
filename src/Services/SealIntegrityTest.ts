import { getAccessToken } from './getAccessToken';
import moment from 'moment';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// Data interface for Seal Integrity Test save
export interface SealIntegrityTestData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string;
  cr3ea_tourstartdate: string;
  cr3ea_observedtime: string | null;
  cr3ea_observedby: string | null;
  cr3ea_productname: string;
  cr3ea_machineno: string | null;
  cr3ea_sampleqty: string | null;
  cr3ea_leakageno: string | null;
  cr3ea_leakagetype: string | null;
  cr3ea_executivename: string | null;
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
  thecurrenttime?: string
) {
  const startData = { product, executiveName, thecurrenttime };
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
    const tableName = "cr3ea_prod_vlts";
    // const tableName = "cr3ea_vlts";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=cr3ea_cycle,cr3ea_observedtime,cr3ea_productname,cr3ea_machineno,cr3ea_sampleqty,cr3ea_leakageno,cr3ea_leakagetype,cr3ea_executivename`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);

    const data = await response.json();
    const cycles: any = {};

    data.value.forEach((record: any) => {
      const cycleNum = (record.cr3ea_cycle || '').toString().replace('Cycle-', '');
      // Always take the latest occurrence for a cycle (last one wins)
      cycles[cycleNum] = {
        cycleNum,
        observedtime: record?.cr3ea_observedtime ?? 'N/A',
        product: record?.cr3ea_productname ?? 'N/A',
        executiveName: record?.cr3ea_executivename ?? 'N/A',
        machineNo: record?.cr3ea_machineno ?? 'N/A',
        sampleqty: record?.cr3ea_sampleqty ?? 'N/A',
        leakageno: record?.cr3ea_leakageno ?? 'N/A',
        leakagetype: record?.cr3ea_leakagetype ?? 'N/A',
      };
      // Merge locally stored product/time if present
      try {
        const storedData = localStorage.getItem(`cycle-${cycleNum}-start-data`);
        if (storedData) {
          const { product, thecurrenttime } = JSON.parse(storedData);
          if (product) cycles[cycleNum].product = product;
          if (thecurrenttime && (!record?.cr3ea_observedtime || record?.cr3ea_observedtime === '')) {
            cycles[cycleNum].observedtime = thecurrenttime;
          }
        }
      } catch {}
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
  const product = startData.product || 'N/A';
  const executiveName = startData.executiveName || 'N/A';
  const thecurrenttime = startData.thecurrenttime || 'N/A';

  const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value || '';
  const machinenumber = getVal(`machine-no-${cycleNum}`);
  const sampleqty = getVal(`sample-quantity-${cycleNum}`);
  const leakageno = getVal(`leakage-${cycleNum}`);
  const leakagetype = getVal(`leakage-type-${cycleNum}`);

  const data: SealIntegrityTestData = {
    cr3ea_qualitytourid: QualityTourId,
    cr3ea_title: 'CreamPercentage_' + moment().format('MM-DD-YYYY'),
    cr3ea_cycle: `Cycle-${cycleNum}`,
    cr3ea_shift: sessionStorage.getItem('shiftValue') || 'shift 1',
    cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
    cr3ea_observedtime: thecurrenttime,
    cr3ea_observedby: UserName || null,
    cr3ea_productname: product,
    cr3ea_machineno: machinenumber,
    cr3ea_sampleqty: sampleqty,
    cr3ea_leakageno: leakageno,
    cr3ea_leakagetype: leakagetype,
    cr3ea_executivename: executiveName
  };

  return { savedData: [data] };
}

// API for save section
export async function saveSectionApiCall(data: SealIntegrityTestData[]): Promise<SaveResponse> {
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
    const tableName = "cr3ea_prod_vlts";
    // const tableName = "cr3ea_vlts";
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
    return { success: true, message: `${data.length} records saved successfully`, data: results };
  } catch (error) {
    console.error('Error saving code verification records:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to save records. Please try again.', data: [] };
  }
}

// Interface for the cycle data structure
export interface SealIntegrityTestCycleData {
  cycleNum: string;
  observedtime: string;
  product: string;
  executiveName: string;
  machineNo: string;
  sampleqty: string;
  leakageno: string;
  leakagetype: string;
}