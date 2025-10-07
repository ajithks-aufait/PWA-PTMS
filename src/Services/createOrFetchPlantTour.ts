

// Environment URL
// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

export async function createOrFetchPlantTour({
  accessToken,
  departmentId,
  employeeName,
  roleName,
  plantId,
  userRoleID,
}: {
  accessToken: string;
  departmentId: string;
  employeeName: string;
  roleName: string;
  plantId: string;
  userRoleID: string;
}): Promise<string | null> {
  if (!accessToken) return null;

  const apiVersion = "9.2";
  const tableName = "cr3ea_prod_qualitytours";
  // const tableName = "cr3ea_prod_qualitytours";
  const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const TourStartDateDTour = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const TitleDTour = `${roleName}_${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;

  const header = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    Prefer: "return=representation",
    Authorization: `Bearer ${accessToken}`,
  };

  const dataToSave = {
    cr3ea_departmentid: departmentId?.toString(),
    cr3ea_tourstartdate: TourStartDateDTour,
    cr3ea_tourby: employeeName,
    cr3ea_status: "In Progress",
    cr3ea_plantid: plantId?.toString(),
    cr3ea_observedby: employeeName,
    cr3ea_roleid: userRoleID?.toString(),
    cr3ea_title: TitleDTour,
  };

  // Check if a tour is already in progress
  const checkUrl = `${apiUrl}?$filter=cr3ea_status eq 'In Progress' and cr3ea_departmentid eq '${departmentId}'&$top=1`;
  const isPlantTourExist = await fetch(checkUrl, {
    method: "GET",
    headers: header,
  });
  const plant_tour_res = await isPlantTourExist.json();

  if (plant_tour_res.value && plant_tour_res.value.length > 0) {
    return plant_tour_res.value[0].cr3ea_prod_qualitytourid;
  }

  // Create new tour
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: header,
    body: JSON.stringify(dataToSave),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  return data.cr3ea_prod_qualitytourid;
}
