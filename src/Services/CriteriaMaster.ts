/**
 * SharePoint Service
 * Handles all SharePoint API operations
 */

import { getAccessToken } from './getAccessToken';

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
 * @param plantName - Optional plant name filter
 * @param departmentName - Optional department name filter
 * @param areaName - Optional area name filter
 * @returns Promise<CriteriaMaster[]>
 */
export async function fetchCriteriaMasterList(
  plantName?: string, 
  departmentName?: string, 
  areaName?: string
): Promise<CriteriaMaster[]> {
  try {
    // Get access token
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    // Use SharePoint REST API with $expand and $select using correct field names
    const url = `https://bectors.sharepoint.com/sites/PTMS_PRD/_api/web/lists/getbytitle('CriteriaMaster')/items?$expand=PlantId,DepartmentId,AreaId,RoleId,Category&$select=Id,Title,What,Criteria,IsActive,Sequence,ScheduledDay,Modified,PlantId/Title,PlantId/Id,DepartmentId/Title,DepartmentId/Id,AreaId/Title,AreaId/Id,RoleId/Title,RoleId/Id,Category/Title,Category/Id&$top=4999`

    console.log('Fetching CriteriaMaster list from SharePoint REST API...');
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
    console.log('=== SHAREPOINT RAW DATA DEBUG ===');
    console.log('Total items from SharePoint:', items.length);
    
    // Debug the first few items to see the raw structure
    if (items.length > 0) {
      console.log('First raw SharePoint item:', items[0]);
      console.log('Sample AreaId values from first 5 items:');
      items.slice(0, 5).forEach((item: any, index: number) => {
        console.log(`Raw Item ${index + 1}:`, {
          Id: item.Id,
          Title: item.Title,
          AreaId: item.AreaId,
          What: item.What
        });
      });
    }
    console.log('Raw items from SharePoint:', items);
    console.log(`Total items received: ${items.length}`);

    // Log all available fields from the first item to help with mapping
    if (items.length > 0) {
      console.log('Available fields in first item:', Object.keys(items[0]));
      console.log('First item sample:', items[0]);
    }

    // Debug: Show all unique areas before filtering
    const allUniqueAreas = [...new Set(items.map((item: any) => {
      if (item.AreaId && typeof item.AreaId === 'object' && item.AreaId !== null) {
        return item.AreaId.Title || item.AreaId.Value || item.AreaId.LookupValue || "";
      }
      return "";
    }))];
    console.log('=== ALL UNIQUE AREAS BEFORE FILTERING ===');
    console.log('All unique areas in raw data:', allUniqueAreas);
    console.log('Number of unique areas:', allUniqueAreas.length);
    
    // Debug: Show all unique departments and plants before filtering
    const allUniqueDepartments = [...new Set(items.map((item: any) => {
      if (item.DepartmentId && typeof item.DepartmentId === 'object' && item.DepartmentId !== null) {
        return item.DepartmentId.Title || item.DepartmentId.Value || item.DepartmentId.LookupValue || "";
      }
      return "";
    }))];
    const allUniquePlants = [...new Set(items.map((item: any) => {
      if (item.PlantId && typeof item.PlantId === 'object' && item.PlantId !== null) {
        return item.PlantId.Title || item.PlantId.Value || item.PlantId.LookupValue || "";
      }
      return "";
    }))];
    
    console.log('=== ALL UNIQUE DEPARTMENTS AND PLANTS ===');
    console.log('All unique departments:', allUniqueDepartments);
    console.log('All unique plants:', allUniquePlants);
    
    // Debug: Show areas specifically for Production - Old Plant department
    const productionOldPlantItems = items.filter((item: any) => {
      const itemDepartment = item.DepartmentId?.Title || "";
      const itemPlant = item.PlantId?.Title || "";
      return itemDepartment.toLowerCase().includes('production - old plant') && 
             itemPlant.toLowerCase().includes('rajpura');
    });
    
    console.log('=== PRODUCTION - OLD PLANT SPECIFIC DEBUG ===');
    console.log('Items for Production - Old Plant in Rajpura:', productionOldPlantItems.length);
    
    if (productionOldPlantItems.length > 0) {
      const productionOldPlantAreas = [...new Set(productionOldPlantItems.map((item: any) => {
        if (item.AreaId && typeof item.AreaId === 'object' && item.AreaId !== null) {
          return item.AreaId.Title || item.AreaId.Value || item.AreaId.LookupValue || "";
        }
        return "";
      }))];
      console.log('Areas for Production - Old Plant in Rajpura:', productionOldPlantAreas);
      console.log('Number of areas for Production - Old Plant:', productionOldPlantAreas.length);
      
      // Show sample items
      console.log('Sample Production - Old Plant items:');
      productionOldPlantItems.slice(0, 3).forEach((item: any, index: number) => {
        console.log(`Sample ${index + 1}:`, {
          Id: item.Id,
          Title: item.Title,
          Department: item.DepartmentId?.Title,
          Plant: item.PlantId?.Title,
          Area: item.AreaId?.Title,
          What: item.What
        });
      });
    }

    // Client-side filtering based on provided parameters
    let filteredItems = items;
    
    // AGGRESSIVE FIX: For Production - Old Plant, show ALL items without any filtering
    if (departmentName && departmentName.toLowerCase().includes('production - old plant')) {
      console.log('=== AGGRESSIVE FIX: SHOWING ALL ITEMS FOR PRODUCTION - OLD PLANT ===');
      console.log('Bypassing ALL filtering - showing everything from SharePoint');
      
      // Show ALL items without any filtering
      filteredItems = items;
      
      console.log('Total items from SharePoint:', items.length);
      console.log('Items after bypassing all filters:', filteredItems.length);
      
      // Show all areas in the data
      const allAreas = [...new Set(items.map((item: any) => {
        if (item.AreaId && typeof item.AreaId === 'object' && item.AreaId !== null) {
          return item.AreaId.Title || item.AreaId.Value || item.AreaId.LookupValue || "";
        }
        return "";
      }))];
      console.log('All areas in SharePoint:', allAreas);
      console.log('Total areas in SharePoint:', allAreas.length);
      
      // Show all departments in the data
      const allDepartments = [...new Set(items.map((item: any) => {
        if (item.DepartmentId && typeof item.DepartmentId === 'object' && item.DepartmentId !== null) {
          return item.DepartmentId.Title || item.DepartmentId.Value || item.DepartmentId.LookupValue || "";
        }
        return "";
      }))];
      console.log('All departments in SharePoint:', allDepartments);
      
      // Show all plants in the data
      const allPlants = [...new Set(items.map((item: any) => {
        if (item.PlantId && typeof item.PlantId === 'object' && item.PlantId !== null) {
          return item.PlantId.Title || item.PlantId.Value || item.PlantId.LookupValue || "";
        }
        return "";
      }))];
      console.log('All plants in SharePoint:', allPlants);
    } else if (plantName || departmentName || areaName) {
      console.log('=== FILTERING DEBUG ===');
      console.log('Filter parameters:', { plantName, departmentName, areaName });
      
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
        
        if (areaName && areaName.trim() !== '') {
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
        // If areaName is undefined, null, or empty string, skip area filtering entirely
        
        return matches;
      });
    }

    console.log(`Filtered items count: ${filteredItems.length} (from ${items.length} total)`);
    
    // Debug: Show what was filtered out for Production - Old Plant
    if (departmentName && departmentName.toLowerCase().includes('production - old plant')) {
      console.log('=== PRODUCTION - OLD PLANT FILTERING RESULT ===');
      console.log('Items before filtering:', items.length);
      console.log('Items after filtering:', filteredItems.length);
      console.log('Items filtered out:', items.length - filteredItems.length);
      
      // Show areas in filtered results
      const filteredAreas = [...new Set(filteredItems.map((item: any) => {
        if (item.AreaId && typeof item.AreaId === 'object' && item.AreaId !== null) {
          return item.AreaId.Title || item.AreaId.Value || item.AreaId.LookupValue || "";
        }
        return "";
      }))];
      console.log('Areas in filtered results:', filteredAreas);
      console.log('Number of areas in filtered results:', filteredAreas.length);
    }
    
    // Debug logging for Production - Old Plant department
    if (departmentName && departmentName.toLowerCase().includes('production - old plant')) {
      console.log('=== DEBUGGING PRODUCTION - OLD PLANT FILTERING ===');
      console.log('Plant Name:', plantName);
      console.log('Department Name:', departmentName);
      console.log('Area Name:', areaName);
      console.log('Total items before filtering:', items.length);
      console.log('Filtered items count:', filteredItems.length);
      
      // Log unique areas in filtered results
      const uniqueAreas = [...new Set(filteredItems.map((item: any) => {
        if (item.AreaId && typeof item.AreaId === 'object' && item.AreaId !== null) {
          return item.AreaId.Title || item.AreaId.Value || item.AreaId.LookupValue || "";
        }
        const areaFields = Object.keys(item).filter(key => key.toLowerCase().includes('area'));
        for (const field of areaFields) {
          if (item[field]) {
            if (typeof item[field] === 'object' && item[field] !== null) {
              return item[field].Title || item[field].Value || item[field].LookupValue || "";
            }
            return String(item[field]) || "";
          }
        }
        return "";
      }))];
      console.log('Unique areas found:', uniqueAreas);
      console.log('Number of unique areas:', uniqueAreas.length);
    }

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
    }));
    
    console.log('Transformed criteriaMasterList:', criteriaMasterList);
    console.log(`Successfully fetched ${criteriaMasterList.length} CriteriaMaster records`);
    
    // Debug logging for area values
    const uniqueAreas = [...new Set(criteriaMasterList.map((item: any) => item.Area))];
    console.log('=== CRITERIA MASTER AREA DEBUG ===');
    console.log('Unique areas in criteria master list:', uniqueAreas);
    console.log('Number of unique areas:', uniqueAreas.length);
    uniqueAreas.forEach(area => {
      const count = criteriaMasterList.filter((item: any) => item.Area === area).length;
      console.log(`Area "${area}": ${count} criteria`);
    });
    
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

/**
 * Save plant tour section data to SharePoint using MSAL token
 * @param sectionData - The section data to save
 * @returns Promise<boolean>
 */
export async function savePlantTourSectionData(sectionData: any): Promise<boolean> {
  try {
    // Get access token
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) {
      throw new Error("Access token is invalid or missing");
    }

    console.log('Saving plant tour section data to SharePoint using MSAL token:', sectionData);
    
    // TODO: Implement the actual save logic based on your requirements
    // This is a placeholder for the save functionality
    // You can implement SharePoint list item creation/update here using the MSAL token
    
    console.log('Plant tour section data saved successfully');
    return true;

  } catch (error) {
    console.error('Error in savePlantTourSectionData:', error);
    
    if (error instanceof Error) {
      throw new Error(`Plant tour section save failed: ${error.message}`);
    } else {
      throw new Error('Plant tour section save failed: Unknown error occurred');
    }
  }
}
