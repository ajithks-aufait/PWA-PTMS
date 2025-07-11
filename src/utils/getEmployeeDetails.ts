
export async function fetchEmployeeList(accessToken:string) {
    const url = `https://aufaitcloud.sharepoint.com/sites/Mrs_Bectors_PTMS/_api/web/lists/getbytitle('EmployeeList')/items`;

  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json;odata=verbose",
        },
      }
    );

    if (!response.ok) {
  const errorText = await response.text();
  console.error("Status:", response.status);
  console.error("Response:", errorText);
}

    const data = await response.json();
    console.log("Employee list data:", data.d.results);
  } catch (err) {
    console.error("Error fetching list items:");
  }
}






/**
 * Fetch SharePoint User ID by Email (mapped from Azure AD)
 */

export async function getSharePointUserIdByEmail(email: string, accessToken: string): Promise<number> {
  const webUrl = "https://aufaitcloud.sharepoint.com/sites/Mrs_Bectors_PTMS";
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

