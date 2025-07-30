// Environment URL
const environmentUrl = "https://org487f0635.crm8.dynamics.com";

export async function saveSectionData(accessToken: string, records: any[]) {
  const apiVersion = "9.2";
  const tableName = "cr3ea_prod_pqi_fronts";
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
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: header,
        body: JSON.stringify(record),
      });
      if (!response.ok) {
        throw new Error(`Failed to save record: ${response.status}`);
      }
      const responseData = await response.json();
      results.push(responseData);
    } catch (error) {
      console.error('Error creating record:', error);
      results.push(null);
    }
  }
  return results;
} 