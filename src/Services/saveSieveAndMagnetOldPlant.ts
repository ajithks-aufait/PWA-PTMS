import { getAccessToken } from './getAccessToken';

interface SieveAndMagnetData {
  cr3ea_criteria: string;
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string;
  cr3ea_defectremarks: string | null;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string;
  cr3ea_description: string;
}

interface SaveResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const saveSieveAndMagnetOldPlant = async (data: SieveAndMagnetData[]): Promise<SaveResponse> => {
  console.log('saveSieveAndMagnetOldPlant called with data:', data);
  
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
    const tableName = "cr3ea_prod_sievesandmagnetsoldplants";
    // const tableName = "cr3ea_sievesandmagnetsoldplants";
  // const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
    const environmentUrl = "https://orgea61b289.crm8.dynamics.com";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

    const savedRecords = [];

    for (const record of data) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`Failed to save record: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      savedRecords.push(result);
      console.log('Record saved successfully:', result);
    }

    return {
      success: true,
      message: `${data.length} records saved successfully`,
      data: savedRecords
    };

  } catch (error) {
    console.error('Error saving Sieve and Magnet New Plant data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save records. Please try again.'
    };
  }
};

// Helper function to collect estimation data for saving - matches the exact structure from the user's code
export const collectEstimationDataCycleSave = (cycleNum: number, checklistItems: any[], plantTourId: string, shift: string, userName: string) => {
  console.log('collectEstimationDataCycleSave called with:', {
    cycleNum,
    checklistItemsCount: checklistItems.length,
    plantTourId,
    shift,
    userName,
    checklistItems: checklistItems.map(item => ({ id: item.id, label: item.label, status: item.status, remarks: item.remarks }))
  });
  
  const savedData: SieveAndMagnetData[] = [];
  const defects: { title: string; remarks: string }[] = [];
  const okays: string[] = [];

  const titles = [
    "Sugar Sifter", "Maida Sifter Sieve Double Decker L-5&7", "Maida Sifter Sieve Double Decker L-6",
    "Biscuits Dust 1 (L-5&7)", "Biscuits Dust 2 (L-6)", "Chemical Sifter 1", "Chemical Sifter 2",
    "Chemical Sifter 3 (Cocoa powder)", "Chemical Sifter 4 (SMP)", "Invert Syrup - Bucket Filter",
    "Black jack - Bucket Filter", "Sugar Grinding Room", "Packing Temp L-5", "Packing Temp L-6",
    "Packing Temp L-7", "L-5 Cooling tunnel temp. Zone-1", "L-5 Cooling tunnel temp. Zone-2",
    "L-5 Cooling tunnel temp. Zone-3", "Cold Storage-1", "Cold Storage-2", "Flavour Room"
  ];

  checklistItems.forEach((item, index) => {
    if (item.status) {
      // Use the actual label from the checklist item instead of hardcoded titles
      const title = item.label || titles[index] || `Item ${index + 1}`;
      const cr3ea_criteria = item.status === 'okay' ? 'Okay' : 'Not Okay';

      let data: SieveAndMagnetData = {
        cr3ea_criteria: cr3ea_criteria,
        cr3ea_qualitytourid: plantTourId,
        cr3ea_title: `QA_${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}`,
        cr3ea_cycle: `Cycle-${cycleNum}`,
        cr3ea_shift: shift,
        cr3ea_defectremarks: null,
        cr3ea_tourstartdate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
        cr3ea_observedby: userName,
        cr3ea_description: title
      };

      if (cr3ea_criteria === "Not Okay") {
        data.cr3ea_defectremarks = item.remarks || null;
        defects.push({ 
          title: title, 
          remarks: data.cr3ea_defectremarks || "No remarks" 
        });
      } else if (cr3ea_criteria === "Okay") {
        okays.push(title);
      }

      savedData.push(data);
    }
  });

  console.log('collectEstimationDataCycleSave returning:', {
    savedDataCount: savedData.length,
    defectsCount: defects.length,
    okaysCount: okays.length,
    savedData: savedData
  });

  return { savedData, defects, okays };
};

// API section for Fetch Existing Cycle Data
export const fetchCycleData = async (plantTourId: string) => {
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
    const tableName = "cr3ea_prod_sievesandmagnetsoldplants";
    // const tableName = "cr3ea_sievesandmagnetsoldplants";
    const environmentUrl = "https://orgea61b289.crm8.dynamics.com";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${plantTourId}'&$select=cr3ea_cycle,cr3ea_criteria,cr3ea_defectremarks,cr3ea_description`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    const cycles: any = {};

    data.value.forEach((record: any) => {
      const cycleNum = record.cr3ea_cycle.replace('Cycle-', '');
      if (!cycles[cycleNum]) {
        cycles[cycleNum] = { cycleNum: parseInt(cycleNum), defects: [], okays: [] };
      }
      if (record.cr3ea_criteria === "Not Okay") {
        cycles[cycleNum].defects.push({ 
          title: record.cr3ea_description, 
          remarks: record.cr3ea_defectremarks || "No remarks" 
        });
      } else if (record.cr3ea_criteria === "Okay") {
        cycles[cycleNum].okays.push(record.cr3ea_description);
      }
    });

    return Object.values(cycles);
  } catch (error) {
    console.error('Error fetching cycle data:', error);
    return [];
  }
};