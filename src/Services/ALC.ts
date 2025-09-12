import { getAccessToken } from './getAccessToken';
import moment from 'moment';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// ALC save payload (per record/area)
export interface ALCData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string | null;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string | null;
  cr3ea_productname: string;
  cr3ea_lineno: string | null;
  cr3ea_previousrunningvariety: string | null;
  cr3ea_runningvariety: string | null;
  cr3ea_area: string;
  cr3ea_criteria: string | null;
  cr3ea_status: string | null;
  cr3ea_defectcategory: string | null;
  cr3ea_defectremarks: string | null;
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
  currentTime?: string,
  lineNo?: string,
  preRuning?: string,
  runing?: string
) {
  const startData = { product, executiveName, thecurrenttime: currentTime, lineNo, preRuning, runing };
  localStorage.setItem(`cycle-${cycleNum}-start-data`, JSON.stringify(startData));
  return startData;
}

// API for fetch cycle data
export async function fetchCycleData(QualityTourId: string) {
  try {
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) throw new Error('Access token is invalid or missing');

    const headers = {
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Authorization": `Bearer ${accessToken}`
    } as const;

    const apiVersion = '9.2';
    // const tableName = 'cr3ea_prod_alcs';
    const tableName = 'cr3ea_prod_alcs';
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=cr3ea_cycle,cr3ea_productname,cr3ea_lineno,cr3ea_previousrunningvariety,cr3ea_runningvariety,cr3ea_area,cr3ea_criteria,cr3ea_status,cr3ea_defectcategory,cr3ea_defectremarks,cr3ea_executivename`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);

    const data = await response.json();
    const groupedData: Record<string, any> = {};

    data.value.forEach((record: any) => {
      const cycle = record.cr3ea_cycle || 'Cycle-undefined';
      const product = record.cr3ea_productname;
      const executiveName = record.cr3ea_executivename;
      const lineno = record.cr3ea_lineno;
      const previous = record.cr3ea_previousrunningvariety;
      const running = record.cr3ea_runningvariety;
      const area = record.cr3ea_area || 'Area-undefined';

      if (!groupedData[cycle]) {
        groupedData[cycle] = { cycle, product, executiveName, lineno, previous, running, data: {} };
      }
      if (!groupedData[cycle].data[area]) {
        groupedData[cycle].data[area] = [];
      }
      groupedData[cycle].data[area].push({
        criteria: record.cr3ea_criteria,
        status: record.cr3ea_status,
        category: record.cr3ea_defectcategory,
        remarks: record.cr3ea_defectremarks
      });
    });

    const resultArray = Object.values(groupedData).map((cycle: any) => ({
      cycleNum: (cycle.cycle || '').toString().replace('Cycle-', ''),
      product: cycle.product,
      executiveName: cycle.executiveName,
      lineno: cycle.lineno,
      previous: cycle.previous,
      running: cycle.running,
      data: Object.entries(cycle.data).map(([area, records]: any) => ({ area, records }))
    }));

    return resultArray;
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
  const lineNo = startData.lineNo || 'N/A';
  const preRuning = startData.preRuning || 'N/A';
  const runing = startData.runing || 'N/A';
  const shiftValue = sessionStorage.getItem('shiftValue') || null;
  const observedBy = UserName || null;
  const tourStartDate = moment().format('MM-DD-YYYY');

  const items = [
    { id: `pr-${cycleNum}-RMStore-1`, key: 'rmstore1' },
    { id: `pr-${cycleNum}-RMStore-2`, key: 'rmstore2' },
    { id: `pr-${cycleNum}-RMStore-3`, key: 'rmstore3' },
    { id: `pr-${cycleNum}-Flour&SugarHandling-1`, key: 'floorsugar1' },
    { id: `pr-${cycleNum}-Flour&SugarHandling-2`, key: 'floorsugar2' },
    { id: `pr-${cycleNum}-Flour&SugarHandling-3`, key: 'floorsugar3' },
    { id: `pr-${cycleNum}-Flour&SugarHandling-4`, key: 'floorsugar4' },
    { id: `pr-${cycleNum}-Flour&SugarHandling-5`, key: 'floorsugar5' },
    { id: `pr-${cycleNum}-ChemicalHandlingArea-1`, key: 'chemicalhandling1' },
    { id: `pr-${cycleNum}-ChemicalHandlingArea-2`, key: 'chemicalhandling2' },
    { id: `pr-${cycleNum}-ChemicalHandlingArea-3`, key: 'chemicalhandling3' },
    { id: `pr-${cycleNum}-ChemicalHandlingArea-4`, key: 'chemicalhandling4' },
    { id: `pr-${cycleNum}-ChemicalHandlingArea-5`, key: 'chemicalhandling5' },
    { id: `pr-${cycleNum}-ChemicalHandlingArea-6`, key: 'chemicalhandling6' },
    { id: `pr-${cycleNum}-Mixing-1`, key: 'mixing1' },
    { id: `pr-${cycleNum}-Mixing-2`, key: 'mixing2' },
    { id: `pr-${cycleNum}-Mixing-3`, key: 'mixing3' },
    { id: `pr-${cycleNum}-Mixing-4`, key: 'mixing4' },
    { id: `pr-${cycleNum}-Mixing-5`, key: 'mixing5' },
    { id: `pr-${cycleNum}-Mixing-6`, key: 'mixing6' },
    { id: `pr-${cycleNum}-Mixing-7`, key: 'mixing7' },
    { id: `pr-${cycleNum}-Mixing-8`, key: 'mixing8' },
    { id: `pr-${cycleNum}-Mixing-9`, key: 'mixing9' },
    { id: `pr-${cycleNum}-Mixing-10`, key: 'mixing10' },
    { id: `pr-${cycleNum}-Mixing-11`, key: 'mixing11' },
    { id: `pr-${cycleNum}-Mixing-12`, key: 'mixing12' },
    { id: `pr-${cycleNum}-Mixing-13`, key: 'mixing13' },
    { id: `pr-${cycleNum}-Mixing-14`, key: 'mixing14' },
    { id: `pr-${cycleNum}-Oven-1`, key: 'oven1' },
    { id: `pr-${cycleNum}-Oven-2`, key: 'oven2' },
    { id: `pr-${cycleNum}-Oven-3`, key: 'oven3' },
    { id: `pr-${cycleNum}-PackingArea-1`, key: 'packagingarea1' },
    { id: `pr-${cycleNum}-PackingArea-2`, key: 'packagingarea2' },
    { id: `pr-${cycleNum}-PackingArea-3`, key: 'packagingarea3' },
    { id: `pr-${cycleNum}-PackingArea-4`, key: 'packagingarea4' },
    { id: `pr-${cycleNum}-PackingArea-5`, key: 'packagingarea5' },
    { id: `pr-${cycleNum}-PackingArea-6`, key: 'packagingarea6' },
    { id: `pr-${cycleNum}-PackingArea-7`, key: 'packagingarea7' },
    { id: `pr-${cycleNum}-PackingArea-8`, key: 'packagingarea8' },
    { id: `pr-${cycleNum}-PackingArea-9`, key: 'packagingarea9' },
    { id: `pr-${cycleNum}-PackingArea-10`, key: 'packagingarea10' },
    { id: `pr-${cycleNum}-PackingArea-11`, key: 'packagingarea11' },
    { id: `pr-${cycleNum}-BiscuitGrinding-1`, key: 'biscut1' },
    { id: `pr-${cycleNum}-BiscuitGrinding-2`, key: 'biscut2' },
    { id: `pr-${cycleNum}-BiscuitGrinding-3`, key: 'biscut3' },
    { id: `pr-${cycleNum}-BiscuitGrinding-4`, key: 'biscut4' },
  ];

  const collectedData: ALCData[] = [];

  for (const item of items) {
    const card = document.getElementById(item.id);
    let remarkValue = "";
    let categoryValue = "";
    let area = "";
    let criteria = "";
    if (card) {
      const selectedBadge = card.querySelector(".badge-fill") as HTMLElement | null;
      const status = selectedBadge?.innerText.trim() || "OK";
      criteria = (card.querySelector(".bs-card-title") as HTMLElement | null)?.innerText || '';
      const match = item.id.match(/-(\D+)-/);
      const thenewarea = match ? match[1] : "";
      area = thenewarea.replace(/([a-z])([A-Z])|&/g, "$1 $2").replace(/&/g, " & ");

      if (status === "Not Okay") {
        const idcurrect = item.id.replace("pr-", "");
        // CSS.escape may not exist in all environments; provide a simple fallback
        const safeId = (window as any).CSS?.escape ? (window as any).CSS.escape(`not-okay-remarks-${idcurrect}`) : `not-okay-remarks-${idcurrect}`.replace(/[^a-zA-Z0-9_-]/g, "");
        const remarksInput = document.querySelector(`#${safeId}`) as HTMLInputElement | null;
        const selectedCategory = card.querySelector(`input[name="not-okay-${idcurrect}"]:checked`) as HTMLInputElement | null;
        remarkValue = remarksInput?.value || "No remarks";
        categoryValue = selectedCategory?.value || "No category";
      } else if (status === "OK" || status === "Okay") {
        remarkValue = "No remarks";
        categoryValue = "2";
      }

      collectedData.push({
        cr3ea_qualitytourid: QualityTourId || 'N/A',
        cr3ea_title: `ALC_${tourStartDate}`,
        cr3ea_cycle: `Cycle-${cycleNum}`,
        cr3ea_shift: shiftValue,
        cr3ea_tourstartdate: tourStartDate,
        cr3ea_observedby: observedBy,
        cr3ea_productname: product,
        cr3ea_lineno: lineNo,
        cr3ea_previousrunningvariety: preRuning,
        cr3ea_runningvariety: runing,
        cr3ea_area: area,
        cr3ea_criteria: criteria,
        cr3ea_status: status,
        cr3ea_defectcategory: categoryValue,
        cr3ea_defectremarks: remarkValue,
        cr3ea_executivename: executiveName
      });
    }
  }

  if (collectedData.length > 0) {
    await saveSectionApiCall(collectedData);
  }
  localStorage.removeItem(`cycle-${cycleNum}-start-data`);
  return { savedData: collectedData };
}

// Build API payload from grouped offline data stored in Redux
export function buildPayloadFromGroupedData(
  grouped: {
    cycleNum: string;
    product: string;
    executiveName: string;
    lineno: string;
    previous: string;
    running: string;
    data: Array<{ area: string; records: Array<{ criteria: string; status: string; category?: string; remarks?: string }> }>;
  },
  qualityTourId: string,
  userName: string
): ALCData[] {
  const shiftValue = sessionStorage.getItem('shiftValue') || null;
  const tourStartDate = moment().format('MM-DD-YYYY');
  const result: ALCData[] = [];

  for (const block of grouped.data || []) {
    for (const rec of block.records || []) {
      result.push({
        cr3ea_qualitytourid: qualityTourId || 'N/A',
        cr3ea_title: `ALC_${tourStartDate}`,
        cr3ea_cycle: `Cycle-${grouped.cycleNum}`,
        cr3ea_shift: shiftValue,
        cr3ea_tourstartdate: tourStartDate,
        cr3ea_observedby: userName || null,
        cr3ea_productname: grouped.product || 'N/A',
        cr3ea_lineno: grouped.lineno || 'N/A',
        cr3ea_previousrunningvariety: grouped.previous || 'N/A',
        cr3ea_runningvariety: grouped.running || 'N/A',
        cr3ea_area: block.area || 'N/A',
        cr3ea_criteria: rec.criteria || '',
        cr3ea_status: rec.status || 'OK',
        cr3ea_defectcategory: rec.category ?? null,
        cr3ea_defectremarks: rec.remarks ?? null,
        cr3ea_executivename: grouped.executiveName || 'N/A',
      });
    }
  }

  return result;
}

// API for save section
export async function saveSectionApiCall(data: ALCData[]): Promise<SaveResponse> {
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
    // const tableName = "cr3ea_prod_alcs";
    const tableName = "cr3ea_prod_alcs";
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

// Alias aligned with external callers
export const savesectionApicall = saveSectionApiCall;

// Interface for the cycle data structure
export interface ALCCycleData {
  cycleNum: string;
  observedtime: string;
  product: string;
  executiveName: string;
  machineNo: string;
  sampleqty: string;
  leakageno: string;
  leakagetype: string;
}