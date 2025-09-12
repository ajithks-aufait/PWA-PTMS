// Environment URL
// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

export async function fetchSummaryData(accessToken: string, qualityTourId: string) {
  if (!accessToken || !qualityTourId) {
    console.error("Missing access token or quality tour ID");
    return null;
  }

  const apiVersion = "9.2";
  const tableName = "cr3ea_prod_pqi_fronts";
  // const tableName = "cr3ea_pqi_fronts";
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${qualityTourId}'`;

  const header = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response = await fetch(apiUrl, { 
      method: "GET",
      headers: header 
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log("Fetched Summary Records:", responseData);

    if (!responseData.value || responseData.value.length === 0) {
      console.log("No summary data found for tour ID:", qualityTourId);
      return null;
    }

    return responseData.value;
  } catch (error) {
    console.error("Error loading summary data:", error);
    return null;
  }
} 