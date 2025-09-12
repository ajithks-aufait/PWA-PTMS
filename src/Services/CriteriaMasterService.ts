/**
 * CriteriaMaster Service
 * Handles all CriteriaMaster list operations from SharePoint
 */

// Interface for CriteriaMaster based on SharePoint list structure
export interface CriteriaMaster {
  // Basic fields
  id: string;
  Title: string;
  What: string;
  Criteria: string;
  IsActive: boolean;
  Sequence: number;
  ScheduledDay: string;
  ImageURL: string;
  Created: string;
  Modified: string;
  
  // Lookup columns
  Plant: string;
  Department: string;
  Area: string;
  Role: string;
  Category: string;
  
  // Person or Group fields
  CreatedBy: string;
  ModifiedBy: string;
}

/**
 * Fetch CriteriaMaster list from SharePoint using MSAL token
 * @param accessToken - MSAL access token
 * @param plantName - Optional plant name filter
 * @param departmentName - Optional department name filter
 * @param areaName - Optional area name filter
 * @returns Promise<CriteriaMaster[]>
 */
export async function fetchCriteriaMasterList(
  accessToken: string,
  plantName?: string, 
  departmentName?: string, 
  areaName?: string
): Promise<CriteriaMaster[]> {
  try {
    // Use SharePoint REST API with $expand and $select using correct field names
    const url = `https://bectors.sharepoint.com/sites/PTMS_UAT/_api/web/lists/getbytitle('CriteriaMaster')/items?$expand=PlantId,DepartmentId,AreaId,RoleId,Category&$select=Id,Title,What,Criteria,IsActive,Sequence,ScheduledDay,Modified,PlantId/Title,PlantId/Id,DepartmentId/Title,DepartmentId/Id,AreaId/Title,AreaId/Id,RoleId/Title,RoleId/Id,Category/Title,Category/Id&$top=4999`;

    console.log('Fetching CriteriaMaster list from SharePoint REST API...');
    console.log('Using access token:', accessToken ? 'Token available' : 'No token');
    console.log('API URL:', url);
    
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
      console.error("Full URL attempted:", url);
      return [];
    }

    const data = await response.json();
    console.log('Raw SharePoint response:', data);
    
    const items = data.d.results;
    console.log('Raw items from SharePoint:', items);
    console.log(`Total items received: ${items.length}`);

    // Log all available fields from the first item to help with mapping
    if (items.length > 0) {
      console.log('Available fields in first item:', Object.keys(items[0]));
      console.log('First item sample:', items[0]);
    }

    // Client-side filtering based on provided parameters
    let filteredItems = items;
    if (plantName || departmentName || areaName) {
      filteredItems = items.filter((item: any) => {
        let matches = true;
        
        if (plantName) {
          const itemPlant = (() => {
            if (item.PlantId && typeof item.PlantId === 'object' && item.PlantId !== null) {
              return item.PlantId.Title || item.PlantId.Value || item.PlantId.LookupValue || "";
            }
            const plantFields = Object.keys(item).filter(key => 
              key.toLowerCase().includes('plant')
            );
            for (const field of plantFields) {
              if (item[field]) {
                if (typeof item[field] === 'object' && item[field] !== null) {
                  return item[field].Title || item[field].Value || item[field].LookupValue || "";
                }
                return String(item[field]) || "";
              }
            }
            return "";
          })();
          matches = matches && String(itemPlant).toLowerCase().includes(plantName.toLowerCase());
        }
        
        if (departmentName) {
          const itemDepartment = (() => {
            if (item.DepartmentId && typeof item.DepartmentId === 'object' && item.DepartmentId !== null) {
              return item.DepartmentId.Title || item.DepartmentId.Value || item.DepartmentId.LookupValue || "";
            }
            const deptFields = Object.keys(item).filter(key => 
              key.toLowerCase().includes('department') || key.toLowerCase().includes('dept')
            );
            for (const field of deptFields) {
              if (item[field]) {
                if (typeof item[field] === 'object' && item[field] !== null) {
                  return item[field].Title || item[field].Value || item[field].LookupValue || "";
                }
                return String(item[field]) || "";
              }
            }
            return "";
          })();
          matches = matches && String(itemDepartment).toLowerCase().includes(departmentName.toLowerCase());
        }
        
        if (areaName) {
          const itemArea = (() => {
            if (item.AreaId && typeof item.AreaId === 'object' && item.AreaId !== null) {
              return item.AreaId.Title || item.AreaId.Value || item.AreaId.LookupValue || "";
            }
            const areaFields = Object.keys(item).filter(key => 
              key.toLowerCase().includes('area')
            );
            for (const field of areaFields) {
              if (item[field]) {
                if (typeof item[field] === 'object' && item[field] !== null) {
                  return item[field].Title || item[field].Value || item[field].LookupValue || "";
                }
                return String(item[field]) || "";
              }
            }
            return "";
          })();
          matches = matches && String(itemArea).toLowerCase().includes(areaName.toLowerCase());
        }
        
        return matches;
      });
    }

    console.log(`Filtered items count: ${filteredItems.length} (from ${items.length} total)`);

    const criteriaMasterList = filteredItems.map((item: any) => ({
      // Basic fields from SharePoint REST API
      id: item.Id || "N/A",
      Title: item.Title || "N/A",
      What: item.What || "",
      Criteria: item.Criteria || "",
      IsActive: item.IsActive !== undefined ? item.IsActive : true,
      Sequence: item.Sequence || 0,
      ScheduledDay: item.ScheduledDay || "",
      ImageURL: item.ImageURL || "",
      Created: item.Created || "",
      Modified: item.Modified || "",
      
      // Lookup columns - extract the lookup value using correct field names
      Plant: item.PlantId?.Title || "N/A",
      Department: item.DepartmentId?.Title || "N/A",
      Area: item.AreaId?.Title || "N/A",
      Role: item.RoleId?.Title || "N/A",
      Category: item.Category?.Title || "",
      
      // Person or Group fields
      CreatedBy: (() => {
        if (typeof item.Created_x0020_By === 'object' && item.Created_x0020_By !== null) {
          return item.Created_x0020_By.Title || item.Created_x0020_By.Value || "";
        }
        return item.Created_x0020_By || "";
      })(),
      ModifiedBy: (() => {
        if (typeof item.Modified_x0020_By === 'object' && item.Modified_x0020_By !== null) {
          return item.Modified_x0020_By.Title || item.Modified_x0020_By.Value || "";
        }
        return item.Modified_x0020_By || "";
      })(),
    }));
    
    console.log('Transformed criteriaMasterList:', criteriaMasterList);
    console.log(`Successfully fetched ${criteriaMasterList.length} CriteriaMaster records`);
    
    return criteriaMasterList;
  } catch (err) {
    console.error("Error fetching CriteriaMaster list:", err);
    console.error("Error details:", {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : 'No stack trace'
    });
    return [];
  }
}






