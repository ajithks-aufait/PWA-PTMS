// Environment URL
// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

export async function saveSectionData(accessToken: string, records: any[]) {
  const apiVersion = "9.2";
  const tableName = "cr3ea_prod_pqi_fronts";
  // const tableName = "cr3ea_pqi_fronts";
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

  const header = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Prefer: "return=representation",
    Authorization: `Bearer ${accessToken}`,
  };

  const results = [];
  for (const record of records) {
    try {
      console.log('Attempting to save record:', {
        evaluationType: record.cr3ea_evaluationtype,
        cycle: record.cr3ea_cycle,
        criteria: record.cr3ea_criteria
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: header,
        body: JSON.stringify(record),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Failed to save record: ${response.status} - ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Record saved successfully:', responseData);
      results.push(responseData);
    } catch (error) {
      console.error('Error creating record:', {
        error: error,
        record: {
          evaluationType: record.cr3ea_evaluationtype,
          cycle: record.cr3ea_cycle,
          criteria: record.cr3ea_criteria
        }
      });
      results.push(null);
    }
  }
  return results;
} 