import { getAccessToken } from './getAccessToken';
import moment from 'moment';
import store from '../store/store';
import { addOfflineFile, removeOfflineFile, setSyncing } from '../store/BakingProcessSlice';

// const environmentUrl = "https://org487f0635.crm8.dynamics.com";dev
const environmentUrl = "https://orgea61b289.crm8.dynamics.com";

// Data interface for Baking Process save
export interface BakingProcessData {
  cr3ea_qualitytourid: string;
  cr3ea_title: string;
  cr3ea_cycle: string;
  cr3ea_shift: string | null;
  cr3ea_tourstartdate: string;
  cr3ea_observedby: string | null;
  cr3ea_productname: string;
  cr3ea_bakingtime: string | null;
  cr3ea_topbakingtempzone1: string | null;
  cr3ea_topbakingtempzone2: string | null;
  cr3ea_topbakingtempzone3: string | null;
  cr3ea_topbakingtempzone4: string | null;
  cr3ea_topbakingtempzone5: string | null;
  cr3ea_topbakingtempzone6: string | null;
  cr3ea_topbakingtempzone7: string | null;
  cr3ea_topproducttempafterbaking: string | null;
  cr3ea_bottombakingtempzone1: string | null;
  cr3ea_bottombakingtempzone2: string | null;
  cr3ea_bottombakingtempzone3: string | null;
  cr3ea_bottombakingtempzone4: string | null;
  cr3ea_bottombakingtempzone5: string | null;
  cr3ea_bottombakingtempzone6: string | null;
  cr3ea_bottombakingtempzone7: string | null;
  cr3ea_bottomproducttempafterbaking: string | null;
  cr3ea_executivename: string | null;
}

export interface SaveResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Interface for image display data
export interface ImageDisplayData {
  cycleNum: number;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  uploadTime: number;
  isOffline: boolean;
}

// Start-session handler (store product, executive and baking time)
export async function startSessionHandler(
  cycleNum: number,
  product: string,
  executiveName: string,
  bakingTime: string
) {
  const startData = { product, executiveName, bakingTime };
  localStorage.setItem(`cycle-${cycleNum}-start-data`, JSON.stringify(startData));
  return startData;
}

// Fetch completed cycles for Baking Process
export async function fetchCycleData(QualityTourId: string) {
  try {
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) throw new Error('Access token is invalid or missing');

    const headers = {
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Authorization": `Bearer ${accessToken}`
    } as const;

    const apiVersion = '9.2';
    const tableName = 'cr3ea_prod_bakings';
    // const tableName = 'cr3ea_bakings';
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_qualitytourid eq '${QualityTourId}'&$select=cr3ea_cycle,cr3ea_productname,cr3ea_bakingtime,cr3ea_topbakingtempzone1,cr3ea_topbakingtempzone2,cr3ea_topbakingtempzone3,cr3ea_topbakingtempzone4,cr3ea_topbakingtempzone5,cr3ea_topbakingtempzone6,cr3ea_topbakingtempzone7,cr3ea_topproducttempafterbaking,cr3ea_bottombakingtempzone1,cr3ea_bottombakingtempzone2,cr3ea_bottombakingtempzone3,cr3ea_bottombakingtempzone4,cr3ea_bottombakingtempzone5,cr3ea_bottombakingtempzone6,cr3ea_bottombakingtempzone7,cr3ea_bottomproducttempafterbaking,cr3ea_executivename`;

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status} - ${await response.text()}`);

    const data = await response.json();
    const cycles: Record<string, any> = {};

    data.value.forEach((record: any) => {
      const cycleNum = record.cr3ea_cycle.replace('Cycle-', '');
      if (!cycles[cycleNum]) {
        cycles[cycleNum] = {
          cycleNum,
          product: record?.cr3ea_productname || 'N/A',
          executiveName: record?.cr3ea_executivename || 'N/A',
          bakingTime: record?.cr3ea_bakingtime || 'N/A',
          topbakingtempzone1: record?.cr3ea_topbakingtempzone1 || null,
          topbakingtempzone2: record?.cr3ea_topbakingtempzone2 || null,
          topbakingtempzone3: record?.cr3ea_topbakingtempzone3 || null,
          topbakingtempzone4: record?.cr3ea_topbakingtempzone4 || null,
          topbakingtempzone5: record?.cr3ea_topbakingtempzone5 || null,
          topbakingtempzone6: record?.cr3ea_topbakingtempzone6 || null,
          topbakingtempzone7: record?.cr3ea_topbakingtempzone7 || null,
          topproducttempafterbaking: record?.cr3ea_topproducttempafterbaking || null,
          bottombakingtempzone1: record?.cr3ea_bottombakingtempzone1 || null,
          bottombakingtempzone2: record?.cr3ea_bottombakingtempzone2 || null,
          bottombakingtempzone3: record?.cr3ea_bottombakingtempzone3 || null,
          bottombakingtempzone4: record?.cr3ea_bottombakingtempzone4 || null,
          bottombakingtempzone5: record?.cr3ea_bottombakingtempzone5 || null,
          bottombakingtempzone6: record?.cr3ea_bottombakingtempzone6 || null,
          bottombakingtempzone7: record?.cr3ea_bottombakingtempzone7 || null,
          bottomproducttempafterbaking: record?.cr3ea_bottomproducttempafterbaking || null,
        };

        // Merge local start data if present
        const storedData = localStorage.getItem(`cycle-${cycleNum}-start-data`);
        if (storedData) {
          const { product, executiveName, bakingTime } = JSON.parse(storedData);
          cycles[cycleNum].product = product || cycles[cycleNum].product;
          cycles[cycleNum].executiveName = executiveName || cycles[cycleNum].executiveName;
          cycles[cycleNum].bakingTime = bakingTime || cycles[cycleNum].bakingTime;
        }
      }
    });

    return Object.values(cycles);
  } catch (error) {
    console.error('Error fetching cycle data:', error);
    return [];
  }
}

// Collect data for a specific cycle from the DOM (IDs expected to exist in the page)
export async function collectEstimationDataCycleSave(
  cycleNum: number,
  QualityTourId: string,
  UserName: string
) {
  const startDataStr = localStorage.getItem(`cycle-${cycleNum}-start-data`);
  const startData = startDataStr ? JSON.parse(startDataStr) : {};
  const product = startData.product || 'N/A';
  const executiveName = startData.executiveName || 'N/A';
  const bakingTime = startData.bakingTime || 'N/A';

  // Read values from inputs by id
  const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value || '';

  const data: BakingProcessData = {
    cr3ea_qualitytourid: QualityTourId,
    cr3ea_title: 'Baking_' + moment().format('MM-DD-YYYY'),
    cr3ea_cycle: `Cycle-${cycleNum}`,
    cr3ea_shift: sessionStorage.getItem('shiftValue') || 'shift 1',
    cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
    cr3ea_observedby: UserName || null,
    cr3ea_productname: product,
    cr3ea_bakingtime: bakingTime,
    cr3ea_topbakingtempzone1: getVal(`top-1-baking-temp-zone-${cycleNum}`),
    cr3ea_topbakingtempzone2: getVal(`top-2-baking-temp-zone-${cycleNum}`),
    cr3ea_topbakingtempzone3: getVal(`top-3-baking-temp-zone-${cycleNum}`),
    cr3ea_topbakingtempzone4: getVal(`top-4-baking-temp-zone-${cycleNum}`),
    cr3ea_topbakingtempzone5: getVal(`top-5-baking-temp-zone-${cycleNum}`),
    cr3ea_topbakingtempzone6: getVal(`top-6-baking-temp-zone-${cycleNum}`),
    cr3ea_topbakingtempzone7: getVal(`top-7-baking-temp-zone-${cycleNum}`),
    cr3ea_topproducttempafterbaking: getVal(`top-8-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone1: getVal(`bottom-1-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone2: getVal(`bottom-2-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone3: getVal(`bottom-3-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone4: getVal(`bottom-4-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone5: getVal(`bottom-5-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone6: getVal(`bottom-6-baking-temp-zone-${cycleNum}`),
    cr3ea_bottombakingtempzone7: getVal(`bottom-7-baking-temp-zone-${cycleNum}`),
    cr3ea_bottomproducttempafterbaking: getVal(`bottom-8-baking-temp-zone-${cycleNum}`),
    cr3ea_executivename: executiveName
  };

  return { savedData: [data] };
}

// Save API
export async function savesectionApicall(data: BakingProcessData[]): Promise<SaveResponse> {
  try {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => (btn as HTMLButtonElement).disabled = true);

    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;
    if (!accessToken) throw new Error('Access token is invalid or missing');

    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation",
      "Authorization": `Bearer ${accessToken}`
    } as const;

    const apiVersion = '9.2';
    const tableName = 'cr3ea_prod_bakings';
    // const tableName = 'cr3ea_bakings';
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;

    const results: any[] = [];
    for (const record of data) {
      const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(record) });
      if (!response.ok) throw new Error(`Failed to save record: ${response.status} - ${await response.text()}`);
      results.push(await response.json());
    }

    buttons.forEach(btn => (btn as HTMLButtonElement).disabled = false);
    return { success: true, message: `${data.length} records saved successfully`, data: results };
  } catch (error) {
    console.error('Error saving records:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to save records. Please try again.', data: [] };
  }
}

// Check if device is online
const isOnline = (): boolean => navigator.onLine;

// Store file offline in Redux
export function storeFileOffline(cycleNum: number, file: File, qualityTourId: string): void {
  const offlineFileData = {
    cycleNum,
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    timestamp: Date.now(),
    qualityTourId
  };
  
  store.dispatch(addOfflineFile(offlineFileData));
  console.log(`File stored offline for Cycle ${cycleNum}:`, file.name);
}

// Create image preview URL from file
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

// Get image display data for a cycle
export function getImageDisplayData(cycleNum: number): ImageDisplayData | null {
  const state = store.getState();
  const offlineFiles = state.bakingProcess.offlineFiles;
  
  const offlineFile = offlineFiles.find(file => file.cycleNum === cycleNum);
  
  if (offlineFile) {
    return {
      cycleNum: offlineFile.cycleNum,
      imageUrl: createImagePreview(offlineFile.file),
      fileName: offlineFile.fileName,
      fileSize: offlineFile.fileSize,
      uploadTime: offlineFile.timestamp,
      isOffline: true
    };
  }
  
  return null;
}

// Get all uploaded images for display
export function getAllUploadedImages(): ImageDisplayData[] {
  const state = store.getState();
  const offlineFiles = state.bakingProcess.offlineFiles;
  
  return offlineFiles.map(file => ({
    cycleNum: file.cycleNum,
    imageUrl: createImagePreview(file.file),
    fileName: file.fileName,
    fileSize: file.fileSize,
    uploadTime: file.timestamp,
    isOffline: true
  }));
}

// SharePoint file upload for Baking Process images
export async function uploadFileToSharePoint(cycleNum: number, QualityTourId: string): Promise<SaveResponse> {
  try {
    // Get the file from dynamic input
    const fileInput = document.getElementById(`attachment-${cycleNum}`) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      return { success: false, message: "Please select a file before uploading" };
    }

    // Check if offline - store in Redux instead of uploading
    if (!isOnline()) {
      storeFileOffline(cycleNum, file, QualityTourId);
      const imageData = getImageDisplayData(cycleNum);
      return { 
        success: true, 
        message: `File "${file.name}" stored offline for Cycle ${cycleNum}. Will upload when online.`,
        data: imageData
      };
    }

    // Get SharePoint context info
    const digestResponse = await fetch(
      "https://bectors.sharepoint.com/sites/PTMS_PRD/_api/contextinfo",
      {
        method: "POST",
        headers: { "Accept": "application/json;odata=verbose" }
      }
    );

    if (!digestResponse.ok) {
      throw new Error(`Failed to get context info: ${digestResponse.status}`);
    }

    const digestData = await digestResponse.json();
    const formDigestValue = digestData.d.GetContextWebInformation.FormDigestValue;
    const siteUrl = "https://bectors.sharepoint.com/sites/PTMS_PRD";
    const libraryName = "BakingProcessDocuments";

    // Upload file to SharePoint
    const uploadUrl = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${libraryName}')/Files/add(url='${file.name}',overwrite=true)?$expand=ListItemAllFields`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json;odata=verbose",
        "X-RequestDigest": formDigestValue
      },
      body: file
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const listItemId = uploadResult.d.ListItemAllFields.Id;

    console.log(`File uploaded (Cycle ${cycleNum}):`, uploadResult);

    // Get list item entity type
    const entityResponse = await fetch(
      `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')?$select=ListItemEntityTypeFullName`,
      {
        method: "GET",
        headers: { "Accept": "application/json;odata=verbose" }
      }
    );

    if (!entityResponse.ok) {
      throw new Error(`Failed to get entity type: ${entityResponse.status}`);
    }

    const entityData = await entityResponse.json();
    const listItemEntityType = entityData.d.ListItemEntityTypeFullName;
    const itemUrl = `${siteUrl}/_api/web/lists/getbytitle('${libraryName}')/items(${listItemId})`;

    // Update metadata with QualityTourId
    const updateBody = {
      __metadata: { type: listItemEntityType },
      QualityId: QualityTourId
    };

    const updateResponse = await fetch(itemUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        "X-RequestDigest": formDigestValue,
        "IF-MATCH": "*",
        "X-HTTP-Method": "MERGE"
      },
      body: JSON.stringify(updateBody)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error("Metadata update failed: " + errorText);
    }

    // Create image display data for successful upload
    const imageData: ImageDisplayData = {
      cycleNum,
      imageUrl: createImagePreview(file),
      fileName: file.name,
      fileSize: file.size,
      uploadTime: Date.now(),
      isOffline: false
    };

    return { 
      success: true, 
      message: `File "${file.name}" uploaded successfully for Cycle ${cycleNum}`,
      data: { uploadResult, imageData }
    };

  } catch (error) {
    console.error("Upload error:", error);
    
    // If upload fails and we have a file, store it offline
    const fileInput = document.getElementById(`attachment-${cycleNum}`) as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (file) {
      storeFileOffline(cycleNum, file, QualityTourId);
      const imageData = getImageDisplayData(cycleNum);
      return { 
        success: true, 
        message: `Upload failed, file "${file.name}" stored offline for Cycle ${cycleNum}. Will retry when online.`,
        data: imageData
      };
    }
    
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to upload file. Please check console for details." 
    };
  }
}

// Upload offline files when coming back online
export async function syncOfflineFiles(): Promise<SaveResponse> {
  try {
    const state = store.getState();
    const offlineFiles = state.bakingProcess.offlineFiles;
    
    if (offlineFiles.length === 0) {
      return { success: true, message: "No offline files to sync" };
    }

    store.dispatch(setSyncing(true));
    
    const results: any[] = [];
    const errors: string[] = [];
    
    for (const offlineFile of offlineFiles) {
      try {
        const result = await uploadFileToSharePoint(offlineFile.cycleNum, offlineFile.qualityTourId);
        
        if (result.success) {
          // Remove from offline storage after successful upload
          store.dispatch(removeOfflineFile(offlineFile.cycleNum));
          results.push(result);
        } else {
          errors.push(`Cycle ${offlineFile.cycleNum}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`Cycle ${offlineFile.cycleNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    store.dispatch(setSyncing(false));
    
    if (errors.length > 0) {
      return {
        success: false,
        message: `Some files failed to sync: ${errors.join(', ')}`,
        data: results
      };
    }
    
    return {
      success: true,
      message: `Successfully synced ${results.length} offline files`,
      data: results
    };
    
  } catch (error) {
    store.dispatch(setSyncing(false));
    console.error("Sync error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync offline files"
    };
  }
}