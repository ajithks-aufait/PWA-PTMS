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
    const environmentUrl = "https://org487f0635.crm8.dynamics.com";
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

    const savedRecords = [];

    for (const record of data) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        throw new Error(`Failed to save record: ${response.status} - ${await response.text()}`);
      }

      const result = await response.json();
      savedRecords.push(result);
      console.log('Record saved:', result);
    }

    return {
      success: true,
      message: `${data.length} records saved successfully`,
      data: savedRecords
    };

  } catch (error) {
    console.error('Error saving Sieve and Magnet Old Plant data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save records. Please try again.'
    };
  }
};

// Helper function to collect estimation data for saving
export const collectEstimationDataCycleSave = (cycleNum: number, checklistItems: any[], plantTourId: string, shift: string, userName: string) => {
  const savedData: SieveAndMagnetData[] = [];
  const defects: { title: string; remarks: string }[] = [];
  const okays: string[] = [];

  const titles = [
    "Sugar Sifter 1", "Sugar Sifter 2", "Sugar Grinder Mesh - Line 1", "Sugar Grinder Mesh - Line 2",
    "Sugar Grinder Mesh - Line 3", "Sugar Grinder Mesh - Line 4", "Maida Sifter Sieve - Line 1",
    "Maida Sifter Sieve - Line 2", "Maida Sifter Sieve - Line 3", "Maida Sifter Sieve - Line 4",
    "Sugar Mesh at Rotary Line-1", "Biscuits Dust 1", "Biscuits Dust 2", "Chemical Sifter 1",
    "Chemical Sifter 3", "Chemical Sifter 5", "Atta Shifter", "Maida Seive for Sampling",
    "Invert Syrup - Bucket Filter (Every Batch Change)", "Palm Oil/ Olein (Checked when Oil filled in Silo tank)",
    "DH Room Humidity Cookies/Cracker", "Packing Humidity & Temp Line-1", "Packing Humidity & Temp Line-2",
    "Packing Humidity & Temp Line-3", "Packing Humidity & Temp Line-4", "Packing Humidity & Temp Line-5",
    "Cold Room 1 Temperature", "Cold Room 2 Temperature", "Cold Room 3 Temperature",
    "Deep Freezer for Yeast", "Maida Hopper Magnet Line-1", "Maida Hopper Magnet Line-2",
    "Maida Hopper Magnet Line-3", "Maida Hopper Magnet Line-4", "Sugar Grinder Magnet",
    "Biscuit Dust Magnet 1", "Biscuit Dust Magnet 2"
  ];

  checklistItems.forEach((item, index) => {
    if (item.status) {
      const title = titles[index] || `Item ${index + 1}`;
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

  return { savedData, defects, okays };
};
