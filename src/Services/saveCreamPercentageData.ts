import { getAccessToken } from './getAccessToken';

interface CreamPercentagePayload {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string | null;
  cr3ea_creampercent1: string | null;
  cr3ea_creampercent2: string | null;
  cr3ea_creampercent3: string | null;
  cr3ea_creampercent4: string | null;
  cr3ea_wtofsandwich1: string | null;
  cr3ea_wtofsandwich2: string | null;
  cr3ea_wtofsandwich3: string | null;
  cr3ea_wtofsandwich4: string | null;
  cr3ea_wtofshell1: string | null;
  cr3ea_wtofshell2: string | null;
  cr3ea_wtofshell3: string | null;
  cr3ea_wtofshell4: string | null;
  cr3ea_avg: string | null;
  cr3ea_productname: string;
  cr3ea_stdcreampercent: string;
  cr3ea_machineno: string;
  cr3ea_lineno: string;
  cr3ea_executivename:string;
}

interface FormData {
  product: string;
  machineNo: string;
  line: string;
  standardCreamPercentage: string;
  executiveName: string;
}

interface WeightData {
  sandwichWeights: string[];
  shellWeights: string[];
}

interface SaveCreamPercentageParams {
  cycleNum: number;
  formData: FormData;
  weightData: WeightData;
  qualityTourId: string;
  userName: string | null;
  shiftValue?: string;
}

// Calculate cream percentage for a single row
const calculateCreamPercentage = (sandwichWeight: string, shellWeight: string): string | null => {
  const sandwich = parseFloat(sandwichWeight);
  const shell = parseFloat(shellWeight);
  
  if (isNaN(sandwich) || isNaN(shell) || sandwich === 0) {
    return null;
  }
  
  return (((sandwich - shell) / sandwich) * 100).toFixed(2);
};

// Calculate average cream percentage
const calculateAverageCreamPercentage = (creamPercentages: (string | null)[]): string | null => {
  const validPercentages = creamPercentages
    .filter(val => val !== null)
    .map(val => parseFloat(val!));
  
  if (validPercentages.length === 0) {
    return null;
  }
  
  const average = validPercentages.reduce((acc, curr) => acc + curr, 0) / validPercentages.length;
  return average.toFixed(2);
};

// Format date as MM-DD-YYYY
const formatDate = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

export const saveCreamPercentageData = async (params: SaveCreamPercentageParams): Promise<boolean> => {
  try {
    const {
      cycleNum,
      formData,
      weightData,
      qualityTourId,
      userName,
      shiftValue = "shift 1"
    } = params;

    console.log(`=== SAVING CREAM PERCENTAGE DATA FOR CYCLE ${cycleNum} ===`);
    console.log('Input parameters:', params);

    // Calculate cream percentages for each row
    const creamPercent1 = calculateCreamPercentage(weightData.sandwichWeights[0], weightData.shellWeights[0]);
    const creamPercent2 = calculateCreamPercentage(weightData.sandwichWeights[1], weightData.shellWeights[1]);
    const creamPercent3 = calculateCreamPercentage(weightData.sandwichWeights[2], weightData.shellWeights[2]);
    const creamPercent4 = calculateCreamPercentage(weightData.sandwichWeights[3], weightData.shellWeights[3]);

    // Calculate average cream percentage
    const averageCream = calculateAverageCreamPercentage([creamPercent1, creamPercent2, creamPercent3, creamPercent4]);

    // Prepare the payload
    const payload: CreamPercentagePayload = {
      cr3ea_qualitytourid: qualityTourId,
      cr3ea_title: 'CreamPercentage_' + formatDate(new Date()),
      cr3ea_cycle: `Cycle-${cycleNum}`,
      cr3ea_shift: shiftValue,
      cr3ea_tourstartdate: formatDate(new Date()),
      cr3ea_observedby: userName,
      cr3ea_creampercent1: creamPercent1,
      cr3ea_creampercent2: creamPercent2,
      cr3ea_creampercent3: creamPercent3,
      cr3ea_creampercent4: creamPercent4,
      cr3ea_wtofsandwich1: weightData.sandwichWeights[0] || null,
      cr3ea_wtofsandwich2: weightData.sandwichWeights[1] || null,
      cr3ea_wtofsandwich3: weightData.sandwichWeights[2] || null,
      cr3ea_wtofsandwich4: weightData.sandwichWeights[3] || null,
      cr3ea_wtofshell1: weightData.shellWeights[0] || null,
      cr3ea_wtofshell2: weightData.shellWeights[1] || null,
      cr3ea_wtofshell3: weightData.shellWeights[2] || null,
      cr3ea_wtofshell4: weightData.shellWeights[3] || null,
      cr3ea_avg: averageCream,
      cr3ea_productname: formData.product,
      cr3ea_stdcreampercent: formData.standardCreamPercentage,
      cr3ea_machineno: formData.machineNo,
      cr3ea_lineno: formData.line,
      cr3ea_executivename: formData.executiveName,
    };

    console.log('Full payload:', payload);
    console.log('Cycle number in payload:', payload.cr3ea_cycle);

    // Get access token
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    // Prepare headers
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation",
      "Authorization": `Bearer ${accessToken}`
    };

    // API configuration
    const apiVersion = "9.2";
    const tableName = "cr3ea_prod_creams";
    // const tableName = "cr3ea_creams";
   // const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

    // Make API call
    console.log('API URL:', apiUrl);
    console.log('Request method:', 'POST');
    console.log('Request headers:', headers);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to save cream percentage data: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('API Response data:', result);
    console.log('Cream percentage data saved successfully:', result);
    
    return true;
  } catch (error) {
    console.error('Error saving cream percentage data:', error);
    throw error;
  }
};
