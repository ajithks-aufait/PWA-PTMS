import { getAccessToken } from './getAccessToken';
import moment from 'moment';

const environmentUrl = "https://org487f0635.crm8.dynamics.com";

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
  // Store both generic keys and CRM-specific keys for flexibility
  const startData = {
    product,
    executiveName,
    batchNo,
    locationFrequency,
    category,
    cr3ea_productname: product,
    cr3ea_executivename: executiveName,
    cr3ea_batchno: batchNo,
    cr3ea_location: locationFrequency,
    cr3ea_category: category
  };
  localStorage.setItem(`oprp-ccp-cycle-${cycleNum}-start-data`, JSON.stringify(startData));
  return startData;
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
    cr3ea_executivename: executiveName
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
}


