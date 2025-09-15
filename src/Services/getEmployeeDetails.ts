/**
 * Fetch EmployeeList
 */

export async function fetchEmployeeList(accessToken: string, employeeName: string) {
  const url = `https://bectors.sharepoint.com/sites/PTMS_PRD/_api/web/lists/getbytitle('EmployeeList')/items?$filter=EmployeeName/Title eq '${employeeName}'&$expand=EmployeeName,DepartmentId,RoleId,PlantId&$select=Id,EmployeeName/Title,DepartmentId/Id,DepartmentId/Title,RoleId/Id,RoleId/Title,PlantId/Id,PlantId/Title`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json;odata=verbose",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Status:", response.status);
      console.error("Response:", errorText);
      return [];
    }

    const data = await response.json();
    const items = data.d.results;

    const employeeList = items.map((item: any) => ({
      id: item.Id,
      employeeName: item.EmployeeName?.Title || "N/A",
      departmentId: item.DepartmentId?.Id || null,
      departmentName: item.DepartmentId?.Title || "N/A",
      roleName: item.RoleId?.Title || "N/A",
      roleId:item.RoleId?.Id || null,
      plantId: item.PlantId?.Id || null,
      plantName: item.PlantId?.Title || "N/A",
    }));
    console.log(employeeList,'employeeList',data);
    
    return employeeList;
  } catch (err) {
    console.error("Error fetching list items:", err);
    return [];
  }
}



/**
 * Fetch SharePoint User ID by Email (mapped from Azure AD)
 */

export async function getSharePointUserIdByEmail(email: string, accessToken: string): Promise<number> {
  const webUrl = "https://bectors.sharepoint.com/sites/PTMS_UAT";
  const url = `${webUrl}/_api/web/siteusers?$filter=Email eq '${email}'`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json;odata=verbose"
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get SharePoint User ID: ${error}`);
  }

  const json = await response.json();
  const user = json?.d?.results?.[0];

  if (!user) {
    throw new Error(`User with email ${email} not found in SharePoint site.`);
  }

  return user.Id; // ← This is the SharePoint User ID (e.g., 40)
}

