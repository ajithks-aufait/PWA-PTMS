// src/Services/getCycleDetails.ts

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

export async function fetchCycleDetails(accessToken: string, plantTourId: string) {
  if (!accessToken || !plantTourId) {
    console.error("Missing access token or plant tour ID");
    return null;
  }

  const apiVersion = "9.2";
   const tableName = "cr3ea_prod_pqi_fronts";
  // const tableName = "cr3ea_pqi_fronts";
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${plantTourId}'`;

  const header = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response = await fetch(apiUrl, { headers: header });
    if (!response.ok) throw new Error("Error fetching cycle details");
    const responseData = await response.json();
    return responseData.value || [];
  } catch (error) {
    console.error("Error loading cycle details:", error);
    return [];
  }
} 