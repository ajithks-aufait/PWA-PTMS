import { getAccessToken } from './getAccessToken';

interface CycleData {
  cycleNum: string;
  wtSandwich: string[];
  wtShell: string[];
  creamPercentage: string[];
  average: string;
  product: string;
  machineNo: string;
  lineNo: string;
  standardCreamPercentage: string;
}

interface FetchCreamPercentageParams {
  qualityTourId: string;
}

export const getCreamPercentageData = async (params: FetchCreamPercentageParams): Promise<CycleData[]> => {
  try {
    const { qualityTourId } = params;

    // Get access token
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
    const tableName = "cr3ea_prod_creams";
    // const tableName = "cr3ea_creams";
    // const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${qualityTourId}'&$select=cr3ea_cycle,cr3ea_creampercent1,cr3ea_creampercent2,cr3ea_creampercent3,cr3ea_creampercent4,cr3ea_wtofsandwich1,cr3ea_wtofsandwich2,cr3ea_wtofsandwich3,cr3ea_wtofsandwich4,cr3ea_wtofshell1,cr3ea_wtofshell2,cr3ea_wtofshell3,cr3ea_wtofshell4,cr3ea_avg,cr3ea_productname,cr3ea_stdcreampercent,cr3ea_machineno,cr3ea_lineno,cr3ea_cycle`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    const cycles: { [key: string]: CycleData } = {};

    data.value.forEach((record: any) => {
      const cycleNum = record.cr3ea_cycle.replace('Cycle-', '');
      if (!cycles[cycleNum]) {
        cycles[cycleNum] = {
          cycleNum,
          wtSandwich: [record.cr3ea_wtofsandwich1, record.cr3ea_wtofsandwich2, record.cr3ea_wtofsandwich3, record.cr3ea_wtofsandwich4].filter(Boolean),
          wtShell: [record.cr3ea_wtofshell1, record.cr3ea_wtofshell2, record.cr3ea_wtofshell3, record.cr3ea_wtofshell4].filter(Boolean),
          creamPercentage: [record.cr3ea_creampercent1, record.cr3ea_creampercent2, record.cr3ea_creampercent3, record.cr3ea_creampercent4].filter(Boolean),
          average: record.cr3ea_avg || "N/A",
          product: record?.cr3ea_productname || "N/A",
          machineNo: record?.cr3ea_machineno || "N/A",
          lineNo: record?.cr3ea_lineno || "N/A",
          standardCreamPercentage: record?.cr3ea_stdcreampercent || "N/A"
        };

        // Check localStorage for additional data
        const storedData = localStorage.getItem(`cycle-${cycleNum}-start-data`);
        if (storedData) {
          try {
            const { product, machineNo, lineNo, standardCreamPercentage } = JSON.parse(storedData);
            cycles[cycleNum].product = product || "N/A";
            cycles[cycleNum].machineNo = machineNo || "N/A";
            cycles[cycleNum].lineNo = lineNo || "N/A";
            cycles[cycleNum].standardCreamPercentage = standardCreamPercentage || "N/A";
          } catch (error) {
            console.warn('Error parsing stored data for cycle', cycleNum, error);
          }
        }
      }
    });

    return Object.values(cycles);
  } catch (error) {
    console.error('Error fetching cycle data:', error);
    return [];
  }
};
