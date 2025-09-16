import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  LineChart,
  Shield,
  ClipboardList,
  Trash2,
} from "lucide-react";
import PlantTourModal from "../components/PlantTourModal";
import { loginRequest } from "../auth/authConfig";
import { useMsal } from "@azure/msal-react";
import { fetchEmployeeList } from "../Services/getEmployeeDetails";
import { useDispatch, useSelector } from "react-redux";
import store from "../store/store";
import DashboardLayout from "../components/DashboardLayout";
import { setPlantTourId, setEmployeeDetails, clearAllDataExceptEssential, setSummaryData, setCycleData, setLastFetchTimestamp, setCategorySummary, setCycleCount } from "../store/planTourSlice";
import { setOfflineStarted, setOfflineCompleted, setProgress, resetOfflineState } from "../store/stateSlice.ts";
import { clearUser } from "../store/userSlice";
import { resetCreamPercentage } from "../store/creamPercentageSlice";
import { clearAllData as clearSieveAndMagnetNewPlantData } from "../store/sieveAndMagnetNewPlantSlice";
import { clearAllData as clearSieveAndMagnetOldPlantData } from "../store/sieveAndMagnetOldPlantSlice";
import { clearAllData as clearProductMonitoringData } from "../store/productMonitoringSlice";
import { setFetchedCycles, clearOfflineData } from "../store/CodeVerificationSlice";
import { setFetchedCycles as setSITFetchedCycles, clearOfflineData as clearSealIntegrityOfflineData } from "../store/SealIntegrityTestSlice";
import { clearOfflineData as clearALCOfflineData, setFetchedCycles as setALCFetchedCycles } from "../store/ALCSlice";
import { setFetchedCycles as setNWMFetchedCycles, clearOfflineData as clearNWMOfflineData } from "../store/NetWeightMonitoringRecordSlice";
import { clearOfflineData as clearBakingOfflineData } from "../store/BakingProcessSlice";
import { clearOfflineData as clearOPRPAndCcpOfflineData } from "../store/OPRPAndCCPSlice";
import { hasOfflineDataToSync, clearAllOfflineData } from "../Services/PlantTourSyncService";
import { getAllOfflineData } from "../Services/PlantTourOfflineStorage";
import { syncOfflineFiles, getMsalToken } from "../Services/BakingProcessFileUpload";
import { setOfflineCriteriaList, setOfflineEmployeeDetails, setOfflineExistingObservations, setOfflineDataTimestamp, setOfflineMode } from "../store/planTourSlice";
import { setPlantTourId as setPlantTourSectionPlantTourId } from "../store/plantTourSectionSlice";
import { createOrFetchDepartmentTour } from "../Services/createOrFetchDepartmentTour";
import * as CriteriaMasterService from "../Services/CriteriaMasterService";
import * as PlantTourService from "../Services/PlantTourService";
import { savesectionApicall as saveBakingSection, collectEstimationDataCycleSave as collectBakingForSync } from "../Services/BakingProcesRecord";
import { saveSectionApiCall as saveSealSection } from "../Services/SealIntegrityTest.ts";
import type { CodeVerificationCycleData } from "../Services/CodeVerificationRecord";
import { createOrFetchPlantTour } from "../Services/createOrFetchPlantTour";
import { getAccessToken } from "../Services/getAccessToken";
import { saveSectionData } from "../Services/saveSectionData";
import { saveCreamPercentageData } from "../Services/saveCreamPercentageData";
import { fetchSummaryData } from "../Services/getSummaryData";
import { fetchCycleDetails } from "../Services/getCycleDetails";
import { useNavigate } from "react-router-dom";

// Process data by category and count defects (copied from ProductQualityIndex)
function processData(data: any[]) {
  const summary: Record<string, { okays: number; aDefects: number; bDefects: number; cDefects: number }> = {};
  const uniqueCycles = new Set();

  data.forEach(item => {
    const category = item.cr3ea_category || 'Unknown';
    const cycle = item.cr3ea_cycle;

    if (cycle) {
      uniqueCycles.add(cycle);
    }

    if (!summary[category]) {
      summary[category] = { okays: 0, aDefects: 0, bDefects: 0, cDefects: 0 };
    }

    if (item.cr3ea_criteria === 'Okay') {
      summary[category].okays++;
    } else {
      if (item.cr3ea_defectcategory === 'Category A') summary[category].aDefects++;
      if (item.cr3ea_defectcategory === 'Category B') summary[category].bDefects++;
      if (item.cr3ea_defectcategory === 'Category C') summary[category].cDefects++;
    }
  });

  // Return both summary and cycle count
  return {
    summary,
    totalCycles: uniqueCycles.size
  };
}

// Remove duplicate submissions based on cycle number and timestamp
function removeDuplicateSubmissions(submissions: any[]) {
  const uniqueSubmissions: any[] = [];
  const seenSubmissions = new Set<string>();

  // Create a new array and sort by timestamp (newest first) to keep the latest submission for each cycle-category combination
  const sortedSubmissions = [...submissions].sort((a, b) => b.timestamp - a.timestamp);

  for (const submission of sortedSubmissions) {
    // Create a unique key based on cycle number and category
    const category = submission.records?.[0]?.cr3ea_category || 'Unknown';
    const submissionKey = `${category}-${submission.cycleNo}`;

    if (!seenSubmissions.has(submissionKey)) {
      seenSubmissions.add(submissionKey);
      uniqueSubmissions.push(submission);
    }
  }

  return uniqueSubmissions;
}


export default function HomePage() {
  console.log('HomePage component rendering...');
  const { accounts, instance } = useMsal();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfflineLoading, setIsOfflineLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineError, setShowOfflineError] = useState(false);
  const dispatch = useDispatch();

  // Get offline state from Redux
  const isOfflineStarted = useSelector((state: any) => state.appState.isOfflineStarted);
  const isOfflineCompleted = useSelector((state: any) => state.appState.isOfflineCompleted);
  const progress = useSelector((state: any) => state.appState.progress);
  const offlineSubmissions = useSelector((state: any) => state.appState.offlineSubmissions);
  const offlineSubmissionsByCategory = useSelector((state: any) => state.appState.offlineSubmissionsByCategory);
  // Flattened count for PQI (CBB/Secondary/Primary/Product) stored by category
  const pqiOfflineCount = Object.values(offlineSubmissionsByCategory || {}).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  // Get cream percentage offline data from Redux
  const creamPercentagePendingSync = useSelector((state: any) => state.creamPercentage.pendingSync);
  
  // Get Sieve and Magnet New Plant offline data from Redux
  const sieveAndMagnetNewPlantPendingSync = useSelector((state: any) => state.sieveAndMagnetNewPlant.pendingSync);
  
  // Get Sieve and Magnet Old Plant offline data from Redux
  const sieveAndMagnetOldPlantPendingSync = useSelector((state: any) => state.sieveAndMagnetOldPlant.pendingSync);
  
  // Get Product Monitoring offline data from Redux
  const productMonitoringPendingSync = useSelector((state: any) => state.productMonitoring.pendingSync);
  
  // Get Code Verification offline data from Redux
  const codeVerificationOfflineData = useSelector((state: any) => state.codeVerification.offlineSavedData);
  // Get Baking Process offline data from Redux
  const bakingOfflineData = useSelector((state: any) => state.bakingProcess?.offlineSavedData || []);
  // Get Seal Integrity Test offline data from Redux
  const sealIntegrityOfflineData = useSelector((state: any) => state.sealIntegrityTest?.offlineSavedData || []);
  // Get ALC offline data from Redux
  const alcOfflineData = useSelector((state: any) => state.ALC?.offlineSavedData || []);
  // Get Net Weight Monitoring offline data from Redux
  const netWeightOfflineData = useSelector((state: any) => state.NetWeightMonitoring?.offlineSavedData || []);
  // Get OPRP and CCP offline data from Redux
  const oprpAndCcpOfflineData = useSelector((state: any) => state.oprpAndCcp?.offlineSavedData || []);

  const user = useSelector((state: any) => state.user.user);
  const userState = useSelector((state: any) => state.user);
  const planTourState = useSelector((state: any) => state.planTour);
  const employeeDetails = useSelector((state: any) => state.planTour.employeeDetails);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [isPlantTourLoading, setIsPlantTourLoading] = useState(false);
  const navigate = useNavigate();

  // Helper function to get department name with fallback
  const getDepartmentName = () => {
    // First try to get from local employees state (when online)
    if (employees && employees.length > 0 && employees[0]?.departmentName) {
      console.log('Using department from local employees state:', employees[0].departmentName);
      return employees[0].departmentName;
    }
    // Fallback to Redux employee details (persisted data)
    if (employeeDetails?.departmentName) {
      console.log('Using department from Redux employee details:', employeeDetails.departmentName);
      return employeeDetails.departmentName;
    }
    // Default fallback
    console.log('Using default department fallback: Quality - Rajpura');
    return "Quality - Rajpura";
  };

  // Calculate total offline count with better reliability
  const totalOfflineCount = useMemo(() => {
    // Get Plant Tour Section offline data count
    let plantTourSectionOfflineCount = 0;
    try {
      const allPlantTourData = getAllOfflineData();
      plantTourSectionOfflineCount = Object.values(allPlantTourData).reduce((total: number, tourData: any) => {
        return total + (tourData.observations?.length || 0);
      }, 0);
    } catch (error) {
      console.error('Error getting Plant Tour Section offline count:', error);
    }

    // Get pause and finish data count
    let pauseDataCount = 0;
    let finishDataCount = 0;
    try {
      const offlineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
      if (offlineData.pauseData) {
        pauseDataCount = 1; // Count pause data as 1 item
      }
      if (offlineData.finishData) {
        finishDataCount = 1; // Count finish data as 1 item
      }
    } catch (error) {
      console.error('Error getting pause/finish data count:', error);
    }

    const count = pqiOfflineCount + 
      creamPercentagePendingSync.length + 
      sieveAndMagnetNewPlantPendingSync.length + 
      sieveAndMagnetOldPlantPendingSync.length + 
      productMonitoringPendingSync.length + 
      codeVerificationOfflineData.length + 
      bakingOfflineData.length + 
      sealIntegrityOfflineData.length + 
      alcOfflineData.length + 
      netWeightOfflineData.length + 
      oprpAndCcpOfflineData.length +
      plantTourSectionOfflineCount +
      pauseDataCount +
      finishDataCount;
    
    console.log('HomePage: Calculating total offline count:', count);
    console.log('HomePage: Breakdown:', {
      pqiOfflineCount,
      creamPercentagePendingSync: creamPercentagePendingSync.length,
      sieveAndMagnetNewPlantPendingSync: sieveAndMagnetNewPlantPendingSync.length,
      sieveAndMagnetOldPlantPendingSync: sieveAndMagnetOldPlantPendingSync.length,
      productMonitoringPendingSync: productMonitoringPendingSync.length,
      codeVerificationOfflineData: codeVerificationOfflineData.length,
      bakingOfflineData: bakingOfflineData.length,
      sealIntegrityOfflineData: sealIntegrityOfflineData.length,
      alcOfflineData: alcOfflineData.length,
      netWeightOfflineData: netWeightOfflineData.length,
      oprpAndCcpOfflineData: oprpAndCcpOfflineData.length,
      plantTourSectionOfflineCount,
      pauseDataCount,
      finishDataCount
    });
    
    return count;
  }, [pqiOfflineCount, creamPercentagePendingSync.length, sieveAndMagnetNewPlantPendingSync.length, sieveAndMagnetOldPlantPendingSync.length, productMonitoringPendingSync.length, codeVerificationOfflineData.length, bakingOfflineData.length, sealIntegrityOfflineData.length, alcOfflineData.length, netWeightOfflineData.length, oprpAndCcpOfflineData.length]);

  const metrics = [
    { label: "5S", icon: <Clock className="text-orange-500" />, count: 0 },
    { label: "Performance", icon: <LineChart className="text-orange-500" />, count: 0 },
    { label: "Safety", icon: <Shield className="text-orange-500" />, count: 0 },
    { label: "Quality", icon: <ClipboardList className="text-orange-500" />, count: 0 },
    { label: "Wastage", icon: <Trash2 className="text-orange-500" />, count: 0 },
  ];


  const handleOfflineTour = async () => {
    // Clear only pending/offline SieveandMagnet data, not completed cycles
    console.log('Clearing pending SieveandMagnet data before starting offline tour...');
    dispatch(clearSieveAndMagnetNewPlantData());
    dispatch(clearSieveAndMagnetOldPlantData());
    
    // Check if internet is available
    if (!isOnline) {
      setShowOfflineError(true);
      // Hide error message after 5 seconds
      setTimeout(() => setShowOfflineError(false), 5000);
      return;
    }

    setIsOfflineLoading(true);
    dispatch(setProgress(0));
    dispatch(setOfflineCompleted(false));

    try {
      console.log('Starting offline mode setup...');

      // Step 1: Get access token first
      const tokenResult = await getAccessToken();
      if (!tokenResult || !tokenResult.token) {
        throw new Error('No access token available');
      }
      console.log('Token generated successfully',tokenResult);

      dispatch(setProgress(20));

      // Step 2: Fetch employee list and store in Redux
      console.log('Fetching employee list...');
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      const employeeList = await fetchEmployeeList(response.accessToken, user?.Name || '');
      if (employeeList && employeeList.length > 0) {
        dispatch(setEmployeeDetails(employeeList[0]));
        console.log('Employee details stored in Redux:', employeeList[0]);
      } else {
        throw new Error('No employee details found');
      }

      dispatch(setProgress(40));

      // Step 3: Create or fetch Plant Tour ID using employee data
      console.log('Creating/fetching Plant Tour ID...');
      const employeeDetails = employeeList[0];
      const plantTourId = await createOrFetchPlantTour({
        accessToken: tokenResult.token,
        departmentId: employeeDetails.departmentId || '135',
        employeeName: employeeDetails.employeeName || user?.Name || '',
        roleName: employeeDetails.roleName || 'QA',
        plantId: employeeDetails.plantId || '1',
        userRoleID: employeeDetails.roleId || '1',
      });

      if (plantTourId) {
        dispatch(setPlantTourId(plantTourId));
        console.log('Plant Tour ID created and stored in Redux:', plantTourId);
      } else {
        throw new Error('Failed to generate Plant Tour ID');
      }

      dispatch(setProgress(60));

      // Step 3.5: Fetch existing SieveandMagnetnewplant completed cycles
      console.log('Fetching existing SieveandMagnetnewplant completed cycles...');
      try {
        const { fetchCycleData } = await import('../Services/saveSieveAndMagnetNewPlant');
        const existingSieveAndMagnetCycles = await fetchCycleData(plantTourId);
        console.log('Fetched existing SieveandMagnetnewplant cycles:', existingSieveAndMagnetCycles);
        
        if (existingSieveAndMagnetCycles && existingSieveAndMagnetCycles.length > 0) {
          // Convert fetched data to ReduxCompletedCycleData format
          const completedCyclesData = existingSieveAndMagnetCycles.map((cycle: any) => ({
            cycleNumber: cycle.cycleNum,
            defects: cycle.defects || [],
            okays: cycle.okays || [],
            formData: { product: '', machineNo: '', line: '', standardPercentage: '' }, // Default form data
            remarks: ''
          }));
          
          // Import and dispatch the action to set completed cycles
          const { setCompletedCycles, setCurrentCycle, setLastFetchTimestamp } = await import('../store/sieveAndMagnetNewPlantSlice');
          
          dispatch(setCompletedCycles(completedCyclesData));
          dispatch(setLastFetchTimestamp(Date.now()));
          
          // Set current cycle to the next cycle number
          const maxCycle = Math.max(...existingSieveAndMagnetCycles.map((cycle: any) => cycle.cycleNum));
          dispatch(setCurrentCycle(maxCycle + 1));
          
          console.log('Successfully loaded existing SieveandMagnetnewplant cycles. Max cycle:', maxCycle, 'Next cycle:', maxCycle + 1);
        } else {
          console.log('No existing SieveandMagnetnewplant cycles found on server.');
        }
      } catch (sieveError) {
        console.error('Error loading existing SieveandMagnetnewplant cycle data:', sieveError);
        // Continue with offline mode even if SieveandMagnetnewplant fetch fails
      }

      // Step 3.6: Fetch existing Product Monitoring completed cycles
      console.log('Fetching existing Product Monitoring completed cycles...');
      try {
        const { fetchAndStoreCycleData } = await import('../Services/productMonitoringRecord');
        await dispatch(fetchAndStoreCycleData(plantTourId) as any);
        console.log('Successfully loaded existing Product Monitoring cycles.');
      } catch (productMonitoringError) {
        console.error('Error loading existing Product Monitoring cycle data:', productMonitoringError);
        // Continue with offline mode even if Product Monitoring fetch fails
      }

      // Step 3.7: Fetch existing Code Verification completed cycles
      console.log('Fetching existing Code Verification completed cycles...');
      try {
        const { fetchCycleData } = await import('../Services/CodeVerificationRecord');
        const existingCodeVerificationCycles = await fetchCycleData(plantTourId);
        console.log('Fetched existing Code Verification cycles:', existingCodeVerificationCycles);
        
        if (existingCodeVerificationCycles && existingCodeVerificationCycles.length > 0) {
          // Store the fetched cycles in Redux
          console.log('Storing Code Verification cycles in Redux:', existingCodeVerificationCycles);
          dispatch(setFetchedCycles(existingCodeVerificationCycles as CodeVerificationCycleData[]));
          console.log('Successfully loaded existing Code Verification cycles:', existingCodeVerificationCycles.length);
        } else {
          console.log('No existing Code Verification cycles found on server.');
          dispatch(setFetchedCycles([]));
        }
      } catch (codeVerificationError) {
        console.error('Error loading existing Code Verification cycle data:', codeVerificationError);
        // Continue with offline mode even if Code Verification fetch fails
        dispatch(setFetchedCycles([]));
      }

      // Step 3.8: Fetch existing Seal Integrity Test completed cycles
      console.log('Fetching existing Seal Integrity Test completed cycles...');
      try {
        const { fetchCycleData } = await import('../Services/SealIntegrityTest.ts');
        const existingSealIntegrityCycles = await fetchCycleData(plantTourId);
        console.log('Fetched existing Seal Integrity Test cycles:', existingSealIntegrityCycles);
        if (existingSealIntegrityCycles && existingSealIntegrityCycles.length > 0) {
          dispatch(setSITFetchedCycles(existingSealIntegrityCycles as any));
          console.log('Successfully loaded existing Seal Integrity Test cycles:', existingSealIntegrityCycles.length);
        } else {
          console.log('No existing Seal Integrity Test cycles found on server.');
          dispatch(setSITFetchedCycles([] as any));
        }
      } catch (sitError) {
        console.error('Error loading existing Seal Integrity Test cycle data:', sitError);
        dispatch(setSITFetchedCycles([] as any));
      }

      // Step 3.9: Fetch existing ALC completed cycles
      console.log('Fetching existing ALC completed cycles...');
      try {
        const { fetchCycleData } = await import('../Services/ALC');
        const existingALCCycles = await fetchCycleData(plantTourId);
        console.log('Fetched existing ALC cycles:', existingALCCycles);
        dispatch(setALCFetchedCycles((existingALCCycles as any) || []));
      } catch (alcError) {
        console.error('Error loading existing ALC cycle data:', alcError);
        dispatch(setALCFetchedCycles([] as any));
      }

      // Step 3.10: Fetch existing Cream Percentage completed cycles
      console.log('=== FETCHING CREAM PERCENTAGE DATA FROM HOMEPAGE ===');
      console.log('Plant Tour ID for cream percentage:', plantTourId);
      console.log('User name:', user?.Name);
      try {
        const { getCreamPercentageData } = await import('../Services/getCreamPercentageData');
        console.log('About to call getCreamPercentageData with qualityTourId:', plantTourId);
        
        // Test the API call
        console.log('Testing API call...');
        const existingCreamPercentageCycles = await getCreamPercentageData({ qualityTourId: plantTourId });
        console.log('API call completed successfully');
        console.log('Successfully fetched existing Cream Percentage cycles:', existingCreamPercentageCycles);
        console.log('Number of cycles fetched:', existingCreamPercentageCycles?.length || 0);
        console.log('Type of response:', typeof existingCreamPercentageCycles);
        console.log('Is array:', Array.isArray(existingCreamPercentageCycles));
        
        if (existingCreamPercentageCycles && existingCreamPercentageCycles.length > 0) {
          // Process fetched data to populate Redux state
          const processedCycles: number[] = [];
          const processedCycleData: { [key: number]: any } = {};
          
          existingCreamPercentageCycles.forEach((cycle: any) => {
            const cycleNum = parseInt(cycle.cycleNum);
            processedCycles.push(cycleNum);
            
            // Convert API data format to local format
            processedCycleData[cycleNum] = {
              formData: {
                product: cycle.product,
                machineNo: cycle.machineNo,
                line: cycle.lineNo,
                standardCreamPercentage: cycle.standardCreamPercentage
              },
              weightData: {
                sandwichWeights: cycle.wtSandwich || ['', '', '', ''],
                shellWeights: cycle.wtShell || ['', '', '', '']
              },
              qualityTourId: plantTourId,
              userName: user?.Name || null,
              shiftValue: 'shift 1',
              timestamp: new Date().toISOString()
            };
            
            console.log(`Processed Cream Percentage cycle ${cycleNum}:`, processedCycleData[cycleNum]);
          });
          
          // Load data into Redux using the cream percentage slice
          console.log('About to load data into Redux...');
          console.log('Processed cycles to store:', processedCycles);
          console.log('Processed cycle data to store:', processedCycleData);
          
          const { loadOfflineData } = await import('../store/creamPercentageSlice');
          const nextCycle = Math.max(...processedCycles) + 1;
          console.log('Next cycle number:', nextCycle);
          
          // Create the payload
          const payload = {
            cycleData: processedCycleData,
            completedCycles: processedCycles,
            currentCycle: nextCycle
          };
          
          console.log('Payload to dispatch:', payload);
          console.log('About to dispatch loadOfflineData...');
          
          dispatch(loadOfflineData(payload));
          
          console.log('loadOfflineData dispatched successfully');
          
          // Wait a bit for Redux state to update
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check Redux state after dispatch
          const currentState = store.getState();
          const creamPercentageState = currentState.creamPercentage;
          console.log('Redux state after dispatch:', creamPercentageState);
          console.log('Cycle data in Redux:', Object.keys(creamPercentageState.cycleData || {}));
          console.log('Completed cycles in Redux:', creamPercentageState.completedCycles);
          console.log('Current cycle in Redux:', creamPercentageState.currentCycle);
          
          console.log('Successfully loaded existing Cream Percentage cycles:', processedCycles.length);
          console.log('Final processed cycles:', processedCycles);
          console.log('Final processed cycle data:', processedCycleData);
        } else {
          console.log('No existing Cream Percentage cycles found on server.');
        }
      } catch (creamPercentageError) {
        console.error('=== ERROR LOADING CREAM PERCENTAGE DATA ===');
        console.error('Error details:', creamPercentageError);
        console.error('Error message:', creamPercentageError instanceof Error ? creamPercentageError.message : 'Unknown error');
        console.error('Error stack:', creamPercentageError instanceof Error ? creamPercentageError.stack : 'No stack trace');
        // Continue with offline mode even if Cream Percentage fetch fails
      }

      // Step 3.11: Fetch existing Net Weight Monitoring completed cycles
      console.log('Fetching existing Net Weight Monitoring completed cycles...');
      try {
        const { fetchCycleData } = await import('../Services/NetWeightMonitoringRecord.ts');
        const existingNWMCycles = await fetchCycleData(plantTourId);
        console.log('Fetched existing Net Weight Monitoring cycles:', existingNWMCycles);
        dispatch(setNWMFetchedCycles((existingNWMCycles as any) || []));
      } catch (nwmError) {
        console.error('Error loading existing Net Weight Monitoring cycle data:', nwmError);
        dispatch(setNWMFetchedCycles([] as any));
      }

      // Step 4: Fetch summary and cycle data APIs
      console.log('Fetching summary and cycle data...');
      try {
        const [summaryData, cycleData] = await Promise.all([
          fetchSummaryData(tokenResult.token, plantTourId),
          fetchCycleDetails(tokenResult.token, plantTourId)
        ]);

        // Handle the API responses properly
        const summaryArray = summaryData && Array.isArray(summaryData) ? summaryData : [];
        const cycleArray = cycleData && Array.isArray(cycleData) ? cycleData : [];

        console.log("Fetched Summary Data:", summaryArray);
        console.log("Fetched Cycle Records:", cycleArray);

        // Store summary and cycle data in Redux
        dispatch(setSummaryData(summaryArray));
        dispatch(setCycleData(cycleArray));
        dispatch(setLastFetchTimestamp(Date.now()));

        // Process and store category summary and cycle count
        if (summaryArray.length > 0) {
          const processed = processData(summaryArray);
          dispatch(setCategorySummary(processed.summary));
          dispatch(setCycleCount(processed.totalCycles));
          console.log("Category summary and cycle count stored in Redux");
        } else {
          dispatch(setCategorySummary({}));
          dispatch(setCycleCount(0));
        }

        console.log("Summary and cycle data stored in Redux");

      } catch (apiError) {
        console.error("Error fetching summary/cycle data:", apiError);
        // Continue with offline mode even if API calls fail
      }

      dispatch(setProgress(80));

      // Step 5: Mark as offline mode
      dispatch(setOfflineCompleted(true));
      dispatch(setOfflineStarted(true));

      dispatch(setProgress(100));
      console.log('Offline mode activated successfully with API data');

    } catch (err) {
      console.error("Error starting offline mode:", err);
      alert('Failed to start offline mode. Please check your connection and try again.');
    } finally {
      setIsOfflineLoading(false);
    }
  };

  // Department-based handlers for non-Quality Rajpura departments
  const handleOtherDepartmentPlantTour = () => {
    console.log('Navigating to plant-tour-section for other department');
    navigate("/plant-tour-section");
  };

  const handleOtherDepartmentOfflinePlantTour = () => {
    console.log('Navigating to plant-tour-section for offline plant tour');
    navigate("/plant-tour-section");
  };

  const handleOtherDepartmentStartOfflinePlantTour = async () => {
    console.log('=== STARTING OFFLINE PLANT TOUR FOR OTHER DEPARTMENT ===');
    console.log('Department:', getDepartmentName());
    
    try {
      setIsPlantTourLoading(true);
      setIsOfflineLoading(true);
      dispatch(setProgress(0));
      
      // Check if user has required Name property
      if (!user?.Name) {
        throw new Error('User name not found. Please ensure you are logged in properly.');
      }
      console.log('User name:', user.Name);

      // Check if we're online or offline
      const isOnline = navigator.onLine;
      console.log('Internet status:', isOnline ? 'Online' : 'Offline');

      if (isOnline) {
        console.log('=== ONLINE MODE: FETCHING DATA FROM APIS ===');
        
        // Step 1: Get access tokens
        console.log('Getting access tokens...');
        dispatch(setProgress(10));
        const tokenResult = await getAccessToken();
        const accessToken = tokenResult?.token;
        
        if (!accessToken) {
          throw new Error('Failed to get access token');
        }

        // Get SharePoint token for employee list
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        const sharepointToken = response.accessToken;

        // Step 2: Fetch employee details
        console.log('Fetching employee details...');
        dispatch(setProgress(20));
        const employeeList = await fetchEmployeeList(sharepointToken, user.Name);
        if (!employeeList || employeeList.length === 0) {
          throw new Error(`Employee details not found for user: ${user.Name}`);
        }
        const currentEmployeeDetails = employeeList[0];
        console.log('Employee details fetched:', currentEmployeeDetails);

        // Step 3: Create or fetch plant tour ID
        console.log('Creating/fetching plant tour ID...');
        dispatch(setProgress(30));
        const plantTourId = await createOrFetchPlantTour({
          accessToken,
          departmentId: currentEmployeeDetails.departmentId || '135',
          employeeName: currentEmployeeDetails.employeeName || user?.Name || '',
          roleName: currentEmployeeDetails.roleName || 'QA',
          plantId: currentEmployeeDetails.plantId || '1',
          userRoleID: currentEmployeeDetails.roleId || '1',
        });

        if (!plantTourId) {
          throw new Error('Failed to create or fetch plant tour ID');
        }
        console.log('Plant tour ID created/fetched:', plantTourId);

        // Step 4: Create or fetch department tour ID
        console.log('Creating/fetching department tour ID...');
        dispatch(setProgress(40));
        const departmentTourId = await createOrFetchDepartmentTour({
          accessToken,
          departmentId: currentEmployeeDetails.departmentId || '135',
          employeeName: currentEmployeeDetails.employeeName || user?.Name || '',
          roleName: currentEmployeeDetails.roleName || 'QA',
          plantId: currentEmployeeDetails.plantId || '1',
          userRoleID: currentEmployeeDetails.roleId || '1',
        });

        if (!departmentTourId) {
          throw new Error('Failed to create or fetch department tour ID');
        }
        console.log('Department tour ID created/fetched:', departmentTourId);

        // Step 5: Fetch criteria master list
        console.log('Fetching criteria master list...');
        dispatch(setProgress(50));
        const plantName = currentEmployeeDetails?.plantName || currentEmployeeDetails?.PlantName || '';
        const departmentName = currentEmployeeDetails?.departmentName || currentEmployeeDetails?.DepartmentName || '';
        
        // Debug logging for Production - Old Plant department
        console.log('=== HOMEPAGE OFFLINE SETUP DEBUGGING ===');
        console.log('Plant Name:', plantName);
        console.log('Department Name:', departmentName);
        console.log('Employee Details:', currentEmployeeDetails);
        
        // For Plant Tour Section, we want to show ALL areas for the department, not just the employee's specific area
        // So we pass undefined for areaName to get all areas
        const criteriaList = await CriteriaMasterService.fetchCriteriaMasterList(
          sharepointToken,
          plantName,
          departmentName,
          undefined // Don't filter by area - show all areas for the department
        );
        console.log('Criteria master list fetched:', criteriaList.length, 'items');

        // Step 6: Fetch existing observations
        console.log('Fetching existing observations...');
        dispatch(setProgress(60));
        const existingObservations = await PlantTourService.fetchExistingObservations(plantTourId);
        console.log('Existing observations fetched:', existingObservations.length, 'items');

        // Step 7: Store all data in Redux
        console.log('Storing all data in Redux...');
        dispatch(setProgress(80));
        dispatch(setPlantTourId(plantTourId)); // Store plant tour ID in planTour slice
        console.log('✅ Plant Tour ID stored in planTour slice:', plantTourId);
        
        // CRITICAL: Also store in localStorage as backup
        localStorage.setItem('plantTourId', plantTourId);
        localStorage.setItem('offlinePlantTourActive', 'true');
        console.log('✅ Plant Tour ID stored in localStorage as backup:', plantTourId);
        
        dispatch(setOfflineCriteriaList(criteriaList));
        dispatch(setOfflineEmployeeDetails(currentEmployeeDetails));
        dispatch(setOfflineExistingObservations(existingObservations));
        dispatch(setOfflineDataTimestamp(Date.now()));
        
        // Also store in plantTourSection slice for consistency
        dispatch(setPlantTourSectionPlantTourId(plantTourId)); // Store in plantTourSection slice
        console.log('✅ Plant Tour ID stored in plantTourSection slice:', plantTourId);

        // Step 8: Mark as offline mode
        dispatch(setProgress(90));
        dispatch(setOfflineCompleted(true));
        dispatch(setOfflineStarted(true));
        dispatch(setOfflineMode(true));

        console.log('=== ONLINE DATA FETCH COMPLETED ===');
        console.log('Plant Tour ID:', plantTourId);
        console.log('Department Tour ID:', departmentTourId);
        console.log('Criteria Count:', criteriaList.length);
        console.log('Employee Details:', currentEmployeeDetails ? 'Available' : 'Not found');
        console.log('Existing Observations Count:', existingObservations.length);
        
        // Verify Redux state after storing
        const currentState = store.getState();
        console.log('🔍 Redux State Verification:');
        console.log('  - planTour.plantTourId:', currentState.planTour.plantTourId);
        console.log('  - plantTourSection.plantTourId:', currentState.plantTourSection.plantTourId);
        console.log('  - planTour.offlineCriteriaList.length:', currentState.planTour.offlineCriteriaList.length);
        console.log('  - planTour.offlineEmployeeDetails:', currentState.planTour.offlineEmployeeDetails ? 'Available' : 'Not found');
        
        // CRITICAL: Check if plantTourId is actually stored
        if (!currentState.planTour.plantTourId) {
          console.error('❌ CRITICAL ERROR: plantTourId is NOT stored in Redux state!');
          console.error('This will cause the "Plant tour ID not found" error!');
        } else {
          console.log('✅ SUCCESS: plantTourId is stored in Redux state:', currentState.planTour.plantTourId);
        }

      } else {
        console.log('=== OFFLINE MODE: USING CACHED REDUX DATA ===');
        dispatch(setProgress(20));
        
        // Check if we have cached data
        const planTourState = useSelector((state: any) => state.planTour);
        
        if (!planTourState.offlineCriteriaList.length) {
          throw new Error('No offline data available. Please connect to internet to fetch data first.');
        }

        console.log('Using cached data from Redux');
        console.log('Cached criteria count:', planTourState.offlineCriteriaList.length);
        console.log('Cached employee details:', planTourState.offlineEmployeeDetails ? 'Available' : 'Not found');
        console.log('Cached observations count:', planTourState.offlineExistingObservations.length);

        // Mark as offline mode
        dispatch(setProgress(80));
        dispatch(setOfflineCompleted(true));
        dispatch(setOfflineStarted(true));
        dispatch(setOfflineMode(true));
      }

      // Final completion
      dispatch(setProgress(100));
      
      // Don't navigate - just complete the setup
      console.log('=== OFFLINE PLANT TOUR SETUP COMPLETED ===');
      console.log('Button will now change to "Offline Plant Tour"');

    } catch (error) {
      console.error('=== ERROR STARTING OFFLINE PLANT TOUR ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      alert(`Failed to start offline plant tour: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPlantTourLoading(false);
      setIsOfflineLoading(false);
    }
  };

  const handleOtherDepartmentSyncCancelOffline = async () => {
    console.log('=== CHECKING FOR OFFLINE DATA TO SYNC ===');
    
    try {
      // Check if there's any offline data to sync
      const hasOfflineData = hasOfflineDataToSync();
      
      // Check for Plant Tour Section offline data
      const { getOfflineToursForSync } = await import('../Services/PlantTourOfflineStorage');
      const plantTourOfflineData = getOfflineToursForSync();
      const hasPlantTourOfflineData = plantTourOfflineData.length > 0;
      
      console.log('General offline data available:', hasOfflineData);
      console.log('Plant Tour Section offline data available:', hasPlantTourOfflineData);
      console.log('Plant Tour Section offline data count:', plantTourOfflineData.length);
      
      if (!hasOfflineData && !hasPlantTourOfflineData) {
        console.log('No offline data found to sync. Canceling offline mode...');
        
        // Clear offline data from localStorage
        clearAllOfflineData();
        
        // Clear offline mode and all related Redux state
        dispatch(setOfflineMode(false));
        dispatch(clearOfflineData()); // Clears offlineCriteriaList, offlineEmployeeDetails, etc.
        dispatch(setOfflineStarted(false));
        dispatch(setOfflineCompleted(false));
        dispatch(resetOfflineState()); // Resets progress and other offline state
        
        // Clear Plant Tour Section specific Redux state
        dispatch(setOfflineCriteriaList([]));
        dispatch(setOfflineEmployeeDetails(null));
        dispatch(setOfflineExistingObservations([]));
        dispatch(setOfflineDataTimestamp(0));
        
        console.log('All offline data cleared from localStorage and Redux state');
        alert('No offline data found. Offline mode cancelled.');
        return;
      }

      // If there is offline data, sync it
      console.log('Offline data found. Starting sync process...');
      
      // Check if internet is available
      if (!isOnline) {
        console.log('No internet connection available for syncing');
        alert('⚠️ Internet connection required to sync offline data. Please check your connection and try again.');
        return;
      }

      // Get access token for syncing
      const tokenResult = await getAccessToken();
      const accessToken = tokenResult?.token;

      if (!accessToken) {
        console.error('No access token available for syncing');
        alert('❌ Authentication error. Please log in again.');
        return;
      }

      let totalSynced = 0;
      let totalErrors = 0;

      // Sync Plant Tour Section offline data
      if (hasPlantTourOfflineData) {
        console.log('=== SYNCING PLANT TOUR SECTION OFFLINE DATA ===');
        console.log('Plant Tour Section offline data:', plantTourOfflineData);
        
        try {
          for (const tourData of plantTourOfflineData) {
            console.log(`Syncing Plant Tour Section data for tour: ${tourData.plantTourId}`);
            console.log(`Observations count: ${tourData.observations.length}`);
            
            for (const observation of tourData.observations) {
              try {
                console.log(`Syncing observation: ${observation.id}`, {
                  sectionName: observation.sectionName,
                  questionId: observation.questionId,
                  response: observation.response,
                  isNotApplicable: observation.isNotApplicable
                });

                if (observation.isNotApplicable) {
                  // Sync Not Applicable observation
                  console.log('Syncing Not Applicable observation with data:', {
                    criteria: observation.observationData?.criteria,
                    employeeDetails: observation.employeeDetails,
                    user: observation.user,
                    plantTourId: observation.plantTourId,
                    sectionName: observation.sectionName
                  });
                  
                  const { saveNotApplicableObservation } = await import('../Services/NotApplicableObservationService');
                  await saveNotApplicableObservation(
                    observation.observationData?.criteria || {},
                    observation.employeeDetails,
                    observation.user,
                    observation.plantTourId,
                    observation.sectionName
                  );
                } else {
                  // Sync regular observation
                  console.log('Syncing regular observation with data:', observation.observationData);
                  await PlantTourService.saveObservationToAPI(observation.observationData);
                }
                
                console.log(`Successfully synced observation: ${observation.id}`);
                totalSynced++;
              } catch (observationError) {
                console.error(`Failed to sync observation ${observation.id}:`, observationError);
                totalErrors++;
              }
            }
          }
          
          console.log('Plant Tour Section offline data sync completed');
        } catch (error) {
          console.error('Error syncing Plant Tour Section offline data:', error);
          totalErrors++;
        }
      }

      // Sync pause data if available
      try {
        const offlineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
        if (offlineData.pauseData) {
          console.log('=== SYNCING PAUSE DATA ===');
          console.log('Pause data found:', offlineData.pauseData);
          
          try {
            // Sync pause data using PlantTourService
            await PlantTourService.updateTourStatus(
              offlineData.pauseData.plantTourId, 
              offlineData.pauseData.tourUpdateData
            );
            
            console.log('Successfully synced pause data');
            totalSynced++;
            
            // Remove pause data from localStorage after successful sync
            delete offlineData.pauseData;
            localStorage.setItem('plantTourOfflineData', JSON.stringify(offlineData));
            
          } catch (pauseError) {
            console.error('Failed to sync pause data:', pauseError);
            totalErrors++;
          }
        }
      } catch (error) {
        console.error('Error checking for pause data:', error);
      }

      // Sync finish data if available
      try {
        const offlineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
        if (offlineData.finishData) {
          console.log('=== SYNCING FINISH DATA ===');
          console.log('Finish data found:', offlineData.finishData);
          
          try {
            // Import and use FinishTourService
            const { finishPlantTour } = await import('../Services/FinishTourService');
            
            // Sync finish data
            await finishPlantTour(
              offlineData.finishData.plantTourId,
              offlineData.finishData.validationData,
              offlineData.finishData.finalComment
            );
            
            console.log('Successfully synced finish data');
            totalSynced++;
            
            // Remove finish data from localStorage after successful sync
            delete offlineData.finishData;
            localStorage.setItem('plantTourOfflineData', JSON.stringify(offlineData));
            
          } catch (finishError) {
            console.error('Failed to sync finish data:', finishError);
            totalErrors++;
          }
        }
      } catch (error) {
        console.error('Error checking for finish data:', error);
      }

      // Show sync results
      if (totalSynced > 0 && totalErrors === 0) {
        alert(`✅ Successfully synced ${totalSynced} Plant Tour Section observation(s)!`);
        
        // Clear Plant Tour Section offline data after successful sync
        if (hasPlantTourOfflineData) {
          const { clearOfflineTourData } = await import('../Services/PlantTourOfflineStorage');
          for (const tourData of plantTourOfflineData) {
            clearOfflineTourData(tourData.plantTourId);
          }
        }
        
        // Clear all offline data from localStorage
        clearAllOfflineData();
        
        // Clear plant tour specific localStorage items
        localStorage.removeItem('plantTourId');
        localStorage.removeItem('offlinePlantTourActive');
        console.log('Plant tour localStorage items cleared');
        
        // Clear offline mode and all related Redux state
        dispatch(setOfflineMode(false));
        dispatch(clearOfflineData()); // Clears offlineCriteriaList, offlineEmployeeDetails, etc.
        dispatch(setOfflineStarted(false));
        dispatch(setOfflineCompleted(false));
        dispatch(resetOfflineState()); // Resets progress and other offline state
        
        // Clear Plant Tour Section specific Redux state
        dispatch(setOfflineCriteriaList([]));
        dispatch(setOfflineEmployeeDetails(null));
        dispatch(setOfflineExistingObservations([]));
        dispatch(setOfflineDataTimestamp(0));
        
        console.log('All offline data cleared from localStorage and Redux state');
        console.log('Plant Tour Section offline data cleared and offline mode cancelled');
      } else if (totalSynced > 0 && totalErrors > 0) {
        alert(`⚠️ Synced ${totalSynced} observation(s) successfully, but ${totalErrors} observation(s) failed. Please check console for details.`);
      } else if (totalSynced === 0 && totalErrors > 0) {
        alert('❌ Failed to sync Plant Tour Section offline data. Please check console for details.');
      } else {
        alert('No Plant Tour Section offline data to sync.');
      }

    } catch (error) {
      console.error('Error during sync/cancel check:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelOffline = async () => {
    console.log('Attempting to sync/cancel offline mode...');

    // Check if internet is available
    if (!isOnline) {
      console.log('No internet connection available for syncing');
      alert('⚠️ Internet connection required to sync offline data. Please check your connection and try again.');
      return;
    }

    // Get access token for syncing
    const tokenResult = await getAccessToken();
    const accessToken = tokenResult?.token;

    if (!accessToken) {
      console.error('No access token available for syncing');
      alert('❌ Authentication error. Please log in again.');
      return;
    }

    let totalSynced = 0;
    let totalErrors = 0;

    // Sync general offline submissions
    const allOfflineSubmissions = Object.values(offlineSubmissionsByCategory).flat();
    console.log('HomePage: All offline submissions by category:', offlineSubmissionsByCategory);
    console.log('HomePage: Flattened offline submissions:', allOfflineSubmissions);

    if (allOfflineSubmissions.length > 0) {
      console.log('Syncing general offline submissions...');
      try {
        // Remove duplicates before syncing
        const uniqueSubmissions = removeDuplicateSubmissions(allOfflineSubmissions);
        console.log(`Original submissions: ${allOfflineSubmissions.length}, Unique submissions: ${uniqueSubmissions.length}`);
        console.log('HomePage: Unique submissions to sync:', uniqueSubmissions);

        for (const submission of uniqueSubmissions) {
          console.log(`Processing submission for cycle ${submission.cycleNo}:`, {
            recordsCount: submission.records.length,
            records: submission.records.map((r: any) => ({
              evaluationType: r.cr3ea_evaluationtype,
              cycle: r.cr3ea_cycle,
              criteria: r.cr3ea_criteria
            }))
          });

          // Validate records before syncing
          if (!submission.records || submission.records.length === 0) {
            console.warn(`Skipping empty submission for cycle ${submission.cycleNo}`);
            continue;
          }

          const result = await saveSectionData(accessToken, submission.records);
          console.log(`Synced submission for cycle ${submission.cycleNo}, result:`, result);
          totalSynced++;
        }
        console.log('All general offline submissions synced successfully');
      } catch (error) {
        console.error('Error syncing general offline submissions:', error);
        totalErrors++;
      }
    } else {
      console.log('No general offline submissions to sync');
    }

    // Sync cream percentage offline data
    if (creamPercentagePendingSync.length > 0) {
      console.log('Syncing cream percentage offline data...');
      console.log('Cream percentage pending sync data:', creamPercentagePendingSync);

      try {
        for (const data of creamPercentagePendingSync) {
          console.log(`Syncing cream percentage cycle ${data.cycleNum}:`, data);

          try {
            await saveCreamPercentageData({
              cycleNum: data.cycleNum,
              formData: data.formData,
              weightData: data.weightData,
              qualityTourId: data.qualityTourId,
              userName: data.userName,
              shiftValue: data.shiftValue
            });

            console.log(`Successfully synced cream percentage cycle ${data.cycleNum}`);
            totalSynced++;
          } catch (cycleError) {
            console.error(`Failed to sync cream percentage cycle ${data.cycleNum}:`, cycleError);
            totalErrors++;
          }
        }

        console.log('Cream percentage offline data sync completed');
      } catch (error) {
        console.error('Error syncing cream percentage offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No cream percentage offline data to sync');
    }

    // Sync Sieve and Magnet New Plant offline data
    if (sieveAndMagnetNewPlantPendingSync.length > 0) {
      console.log('Syncing Sieve and Magnet New Plant offline data...');
      console.log('Sieve and Magnet New Plant pending sync data:', sieveAndMagnetNewPlantPendingSync);

      try {
        for (const data of sieveAndMagnetNewPlantPendingSync) {
          console.log(`Syncing Sieve and Magnet New Plant cycle ${data.cycleNumber}:`, data);

          try {
            // Import the required functions
            const { saveSieveAndMagnetNewPlant, collectEstimationDataCycleSave } = await import('../Services/saveSieveAndMagnetNewPlant');
            
            // Get the required data from Redux state
            const plantTourId = planTourState.plantTourId;
            const selectedCycle = planTourState.selectedCycle || 'Shift 1';
            const userName = user?.Name || 'Current User';
            
            console.log('Using data for sync:', {
              cycleNumber: data.cycleNumber,
              plantTourId,
              selectedCycle,
              userName,
              checklistItemsCount: data.checklistItems.length
            });
            
            const { savedData } = collectEstimationDataCycleSave(
              data.cycleNumber,
              data.checklistItems,
              plantTourId || 'N/A',
              selectedCycle,
              userName
            );

            console.log('Generated savedData for API:', savedData);

            const response = await saveSieveAndMagnetNewPlant(savedData);
            
            if (response.success) {
              console.log(`Successfully synced Sieve and Magnet New Plant cycle ${data.cycleNumber}`);
              totalSynced++;
            } else {
              throw new Error(`Failed to sync cycle ${data.cycleNumber}: ${response.message}`);
            }
          } catch (cycleError) {
            console.error(`Failed to sync Sieve and Magnet New Plant cycle ${data.cycleNumber}:`, cycleError);
            totalErrors++;
          }
        }

        console.log('Sieve and Magnet New Plant offline data sync completed');
      } catch (error) {
        console.error('Error syncing Sieve and Magnet New Plant offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Sieve and Magnet New Plant offline data to sync');
    }

    // Sync Sieve and Magnet Old Plant offline data
    if (sieveAndMagnetOldPlantPendingSync.length > 0) {
      console.log('Syncing Sieve and Magnet Old Plant offline data...');
      console.log('Sieve and Magnet Old Plant pending sync data:', sieveAndMagnetOldPlantPendingSync);

      try {
        for (const data of sieveAndMagnetOldPlantPendingSync) {
          console.log(`Syncing Sieve and Magnet Old Plant cycle ${data.cycleNumber}:`, data);

          try {
            // Import the required functions
            const { saveSieveAndMagnetOldPlant, collectEstimationDataCycleSave } = await import('../Services/saveSieveAndMagnetOldPlant');
            
            // Get the required data from Redux state
            const plantTourId = planTourState.plantTourId;
            const selectedCycle = planTourState.selectedCycle || 'Shift 1';
            const userName = user?.Name || 'Current User';
            
            console.log('Using data for sync:', {
              cycleNumber: data.cycleNumber,
              plantTourId,
              selectedCycle,
              userName,
              checklistItemsCount: data.checklistItems.length
            });
            

            
            const { savedData } = collectEstimationDataCycleSave(
              data.cycleNumber,
              data.checklistItems,
              plantTourId || 'N/A',
              selectedCycle,
              userName
            );



            const response = await saveSieveAndMagnetOldPlant(savedData);
            
            if (response.success) {
              console.log(`Successfully synced Sieve and Magnet Old Plant cycle ${data.cycleNumber}`);
              totalSynced++;
            } else {
              throw new Error(`Failed to sync cycle ${data.cycleNumber}: ${response.message}`);
            }
          } catch (cycleError) {
            console.error(`Failed to sync Sieve and Magnet Old Plant cycle ${data.cycleNumber}:`, cycleError);
            totalErrors++;
          }
        }

        console.log('Sieve and Magnet Old Plant offline data sync completed');
      } catch (error) {
        console.error('Error syncing Sieve and Magnet Old Plant offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Sieve and Magnet Old Plant offline data to sync');
    }

    // Sync Product Monitoring offline data
    if (productMonitoringPendingSync.length > 0) {
      console.log('Syncing Product Monitoring offline data...');
      console.log('Product Monitoring pending sync data:', productMonitoringPendingSync);

      try {
        for (const data of productMonitoringPendingSync) {
          console.log(`Syncing Product Monitoring cycle ${data.cycleNumber}:`, data);

          try {
            // Import the required functions
            const { saveProductMonitoringData, collectEstimationDataCycleSave } = await import('../Services/productMonitoringRecord');
            
            // Get the required data from Redux state
            const plantTourId = planTourState.plantTourId;
            const selectedCycle = planTourState.selectedCycle || 'Shift 1';
            const userName = user?.Name || 'Current User';
            
            console.log('Using data for Product Monitoring sync:', {
              cycleNumber: data.cycleNumber,
              plantTourId,
              selectedCycle,
              userName,
              cycleData: data.cycleData
            });
            
            const { savedData } = collectEstimationDataCycleSave(
              data.cycleNumber,
              {
                product: data.cycleData.product,
                moisture: data.cycleData.cr3ea_moisture,
                gaugeOperating: data.cycleData.cr3ea_gaugeoperating,
                gaugeNonOperating: data.cycleData.cr3ea_gaugenonoperating,
                gaugeCentre: data.cycleData.cr3ea_gaugecentre,
                dryWeightOvenEndOperating: data.cycleData.cr3ea_dryweightovenendoperating,
                dryWeightOvenEndNonOperating: data.cycleData.cr3ea_dryweightovenendnonoperating,
                dryWeightOvenEndCentre: data.cycleData.cr3ea_dryweightovenendcentre,
                dimensionOperating: data.cycleData.cr3ea_dimensionoperating,
                dimensionNonOperating: data.cycleData.cr3ea_dimensionnonoperating,
                dimensionCentre: data.cycleData.cr3ea_dimensioncentre,
              },
              plantTourId || 'N/A',
              selectedCycle,
              userName
            );

            const response = await saveProductMonitoringData(savedData);
            
            if (response.success) {
              console.log(`Successfully synced Product Monitoring cycle ${data.cycleNumber}`);
              totalSynced++;
            } else {
              throw new Error(`Failed to sync cycle ${data.cycleNumber}: ${response.message}`);
            }
          } catch (cycleError) {
            console.error(`Failed to sync Product Monitoring cycle ${data.cycleNumber}:`, cycleError);
            totalErrors++;
          }
        }

        console.log('Product Monitoring offline data sync completed');
      } catch (error) {
        console.error('Error syncing Product Monitoring offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Product Monitoring offline data to sync');
    }

    // Sync Seal Integrity Test offline data
    if (sealIntegrityOfflineData.length > 0) {
      console.log('Syncing Seal Integrity Test offline data...');
      console.log('Seal Integrity Test pending sync data:', sealIntegrityOfflineData);
      try {
        for (const data of sealIntegrityOfflineData) {
          try {
            const cycleNo = data.cycleNo;
            const plantTourId = planTourState.plantTourId;
            const userName = user?.Name || 'Current User';

            // Build payload from DOM if available, else from localStorage snapshot saved during offline save
            const storedStr = localStorage.getItem(`sit-cycle-${cycleNo}-values`);
            const stored = storedStr ? JSON.parse(storedStr) : null;

            const payload = [{
              cr3ea_qualitytourid: plantTourId || 'N/A',
              cr3ea_title: `SealIntegrityTest_${new Date().toLocaleDateString('en-US')}`,
              cr3ea_cycle: `Cycle-${cycleNo}`,
              cr3ea_shift: sessionStorage.getItem('shiftValue') || 'shift 1',
              cr3ea_tourstartdate: new Date().toLocaleDateString('en-US'),
              cr3ea_observedtime: stored?.observedtime || '',
              cr3ea_observedby: userName,
              cr3ea_productname: stored?.product || 'N/A',
              cr3ea_machineno: stored?.machineNo || '',
              cr3ea_sampleqty: stored?.sampleqty || '',
              cr3ea_leakageno: stored?.leakageno || '',
              cr3ea_leakagetype: stored?.leakagetype || '',
              cr3ea_executivename: stored?.executiveName || 'N/A'
            }];

            const response = await saveSealSection(payload as any);
            if (response.success) {
              console.log(`Successfully synced Seal Integrity Test cycle ${cycleNo}`);
              totalSynced++;
              try { localStorage.removeItem(`sit-cycle-${cycleNo}-values`); } catch {}
            } else {
              throw new Error(`Failed to sync Seal Integrity Test cycle ${cycleNo}: ${response.message}`);
            }
          } catch (sitError) {
            console.error('Error syncing Seal Integrity Test item:', sitError);
            totalErrors++;
          }
        }
        console.log('Seal Integrity Test offline data sync completed');
      } catch (error) {
        console.error('Error syncing Seal Integrity Test offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Seal Integrity Test offline data to sync');
    }

    // Sync ALC offline data
    if (alcOfflineData.length > 0) {
      console.log('Syncing ALC offline data...');
      try {
        for (const data of alcOfflineData) {
          try {
            const cycleNo = data.cycleNo;
            const cached = localStorage.getItem(`alc-payload-cycle-${cycleNo}`);
            if (cached) {
              const payload = JSON.parse(cached);
              const { saveSectionApiCall } = await import('../Services/ALC');
              const response = await saveSectionApiCall(payload);
              if (response.success) {
                console.log(`Successfully synced ALC cycle ${cycleNo}`);
                totalSynced++;
                try { localStorage.removeItem(`alc-payload-cycle-${cycleNo}`); } catch {}
              } else {
                throw new Error(`Failed to sync ALC cycle ${cycleNo}: ${response.message}`);
              }
            } else {
              console.warn(`No cached ALC payload found for cycle ${cycleNo}`);
            }
          } catch (alcErr) {
            console.error('Error syncing ALC item:', alcErr);
            totalErrors++;
          }
        }
      } catch (error) {
        console.error('Error syncing ALC offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No ALC offline data to sync');
    }

    // Sync Code Verification offline data
    if (codeVerificationOfflineData.length > 0) {
      console.log('Syncing Code Verification offline data...');
      console.log('Code Verification pending sync data:', codeVerificationOfflineData);
      console.log('Code Verification offline data count:', codeVerificationOfflineData.length);

      try {
        for (const data of codeVerificationOfflineData) {
          console.log(`Syncing Code Verification cycle ${data.cycleNo}:`, data);

          try {
            // Import the required functions
            const { saveSectionApiCall, collectEstimationDataCycleSave } = await import('../Services/CodeVerificationRecord');
            
            // Get the required data from Redux state
            const plantTourId = planTourState.plantTourId;
            const userName = user?.Name || 'Current User';
            
            console.log('Using data for Code Verification sync:', {
              cycleNo: data.cycleNo,
              plantTourId,
              userName,
              recordsCount: data.records.length
            });
            
            // Convert the offline data to the format expected by the API
            const apiRecords = data.records.map((record: any) => ({
              sku: record.sku,
              machineProof: record.proof,
              majorDefectsRemarks: record.remarks
            }));

            const { savedData } = await collectEstimationDataCycleSave(
              data.cycleNo,
              apiRecords[0], // Use the first record as the main form data
              plantTourId || 'N/A',
              userName
            );

            const response = await saveSectionApiCall(savedData);
            
            if (response.success) {
              console.log(`Successfully synced Code Verification cycle ${data.cycleNo}`);
              totalSynced++;
            } else {
              throw new Error(`Failed to sync cycle ${data.cycleNo}: ${response.message}`);
            }
          } catch (cycleError) {
            console.error(`Failed to sync Code Verification cycle ${data.cycleNo}:`, cycleError);
            totalErrors++;
          }
        }

        console.log('Code Verification offline data sync completed');
      } catch (error) {
        console.error('Error syncing Code Verification offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Code Verification offline data to sync');
    }

    // Sync Baking Process offline data
    if (bakingOfflineData.length > 0) {
      console.log('Syncing Baking Process offline data...');
      console.log('Baking Process pending sync data:', bakingOfflineData);
      try {
        for (const data of bakingOfflineData) {
          try {
            const cycleNo = data.cycleNo;
            const plantTourId = planTourState.plantTourId;
            const userName = user?.Name || 'Current User';

            // Try to collect from DOM (likely empty on Home) and then merge with stored values from localStorage
            const storedStr = localStorage.getItem(`baking-cycle-${cycleNo}-values`);
            const stored = storedStr ? JSON.parse(storedStr) : null;

            const prefer = (a?: any, b?: any) => {
              if (a !== undefined && a !== null && a !== '') return a;
              if (b !== undefined && b !== null && b !== '') return b;
              return '';
            };

            let mergedPayload: any[] | null = null;
            try {
              const { savedData } = await collectBakingForSync(cycleNo, plantTourId || 'N/A', userName);
              const collected = Array.isArray(savedData) && savedData.length > 0 ? savedData[0] : null;
              if (collected || stored) {
                const merged = {
                  cr3ea_qualitytourid: plantTourId || 'N/A',
                  cr3ea_title: collected?.cr3ea_title || 'Baking_ManualSync',
                  cr3ea_cycle: `Cycle-${cycleNo}`,
                  cr3ea_shift: collected?.cr3ea_shift || sessionStorage.getItem('shiftValue') || 'shift 1',
                  cr3ea_tourstartdate: collected?.cr3ea_tourstartdate || new Date().toLocaleDateString('en-US'),
                  cr3ea_observedby: collected?.cr3ea_observedby || userName,
                  cr3ea_productname: prefer(collected?.cr3ea_productname, stored?.product) || 'N/A',
                  cr3ea_bakingtime: prefer(collected?.cr3ea_bakingtime, stored?.bakingTime) || 'N/A',
                  cr3ea_topbakingtempzone1: prefer(collected?.cr3ea_topbakingtempzone1, stored?.topZones?.zone1),
                  cr3ea_topbakingtempzone2: prefer(collected?.cr3ea_topbakingtempzone2, stored?.topZones?.zone2),
                  cr3ea_topbakingtempzone3: prefer(collected?.cr3ea_topbakingtempzone3, stored?.topZones?.zone3),
                  cr3ea_topbakingtempzone4: prefer(collected?.cr3ea_topbakingtempzone4, stored?.topZones?.zone4),
                  cr3ea_topbakingtempzone5: prefer(collected?.cr3ea_topbakingtempzone5, stored?.topZones?.zone5),
                  cr3ea_topbakingtempzone6: prefer(collected?.cr3ea_topbakingtempzone6, stored?.topZones?.zone6),
                  cr3ea_topbakingtempzone7: prefer(collected?.cr3ea_topbakingtempzone7, stored?.topZones?.zone7),
                  cr3ea_topproducttempafterbaking: prefer(collected?.cr3ea_topproducttempafterbaking, stored?.topZones?.productTempAfter),
                  cr3ea_bottombakingtempzone1: prefer(collected?.cr3ea_bottombakingtempzone1, stored?.bottomZones?.zone1),
                  cr3ea_bottombakingtempzone2: prefer(collected?.cr3ea_bottombakingtempzone2, stored?.bottomZones?.zone2),
                  cr3ea_bottombakingtempzone3: prefer(collected?.cr3ea_bottombakingtempzone3, stored?.bottomZones?.zone3),
                  cr3ea_bottombakingtempzone4: prefer(collected?.cr3ea_bottombakingtempzone4, stored?.bottomZones?.zone4),
                  cr3ea_bottombakingtempzone5: prefer(collected?.cr3ea_bottombakingtempzone5, stored?.bottomZones?.zone5),
                  cr3ea_bottombakingtempzone6: prefer(collected?.cr3ea_bottombakingtempzone6, stored?.bottomZones?.zone6),
                  cr3ea_bottombakingtempzone7: prefer(collected?.cr3ea_bottombakingtempzone7, stored?.bottomZones?.zone7),
                  cr3ea_bottomproducttempafterbaking: prefer(collected?.cr3ea_bottomproducttempafterbaking, stored?.bottomZones?.productTempAfter),
                  cr3ea_executivename: prefer(collected?.cr3ea_executivename, stored?.executiveName) || 'N/A'
                };
                mergedPayload = [merged];
              }
            } catch (collectErr) {
              console.warn('collectBakingForSync errored on HomePage. Falling back to stored only.', collectErr);
              if (stored) {
                mergedPayload = [{
                  cr3ea_qualitytourid: plantTourId || 'N/A',
                  cr3ea_title: 'Baking_ManualSync',
                  cr3ea_cycle: `Cycle-${cycleNo}`,
                  cr3ea_shift: sessionStorage.getItem('shiftValue') || 'shift 1',
                  cr3ea_tourstartdate: new Date().toLocaleDateString('en-US'),
                  cr3ea_observedby: userName,
                  cr3ea_productname: stored.product || 'N/A',
                  cr3ea_bakingtime: stored.bakingTime || 'N/A',
                  cr3ea_topbakingtempzone1: stored.topZones?.zone1 || '',
                  cr3ea_topbakingtempzone2: stored.topZones?.zone2 || '',
                  cr3ea_topbakingtempzone3: stored.topZones?.zone3 || '',
                  cr3ea_topbakingtempzone4: stored.topZones?.zone4 || '',
                  cr3ea_topbakingtempzone5: stored.topZones?.zone5 || '',
                  cr3ea_topbakingtempzone6: stored.topZones?.zone6 || '',
                  cr3ea_topbakingtempzone7: stored.topZones?.zone7 || '',
                  cr3ea_topproducttempafterbaking: stored.topZones?.productTempAfter || '',
                  cr3ea_bottombakingtempzone1: stored.bottomZones?.zone1 || '',
                  cr3ea_bottombakingtempzone2: stored.bottomZones?.zone2 || '',
                  cr3ea_bottombakingtempzone3: stored.bottomZones?.zone3 || '',
                  cr3ea_bottombakingtempzone4: stored.bottomZones?.zone4 || '',
                  cr3ea_bottombakingtempzone5: stored.bottomZones?.zone5 || '',
                  cr3ea_bottombakingtempzone6: stored.bottomZones?.zone6 || '',
                  cr3ea_bottombakingtempzone7: stored.bottomZones?.zone7 || '',
                  cr3ea_bottomproducttempafterbaking: stored.bottomZones?.productTempAfter || '',
                  cr3ea_executivename: stored.executiveName || 'N/A'
                }];
              }
            }

            if (mergedPayload && mergedPayload.length > 0) {
              const response = await saveBakingSection(mergedPayload as any);
              if (response.success) {
                console.log(`Successfully synced Baking Process cycle ${cycleNo}`);
                totalSynced++;
                // Clear the localStorage marker for this cycle
                try { localStorage.removeItem(`baking-cycle-${cycleNo}-values`); } catch {}
              } else {
                throw new Error(`Failed to sync Baking Process cycle ${cycleNo}: ${response.message}`);
              }
            } else {
              console.warn(`No savedData payload built for Baking Process cycle ${cycleNo}. Skipping.`);
            }
          } catch (bpError) {
            console.error('Error syncing Baking Process item:', bpError);
            totalErrors++;
          }
        }
        console.log('Baking Process offline data sync completed');
      } catch (error) {
        console.error('Error syncing Baking Process offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Baking Process offline data to sync');
    }

    // Sync Baking Process offline images
    try {
      const state = store.getState();
      const bakingOfflineFiles = state.bakingProcess.offlineFiles;
      if (bakingOfflineFiles.length > 0) {
        console.log('=== SYNCING BAKING PROCESS OFFLINE IMAGES ===');
        console.log('Baking Process offline images found:', bakingOfflineFiles.length);
        
        const accessToken = await getMsalToken(instance, accounts);
        if (accessToken) {
          const imageSyncResult = await syncOfflineFiles(accessToken);
          if (imageSyncResult.success) {
            console.log('Successfully synced baking process images');
            totalSynced += bakingOfflineFiles.length;
          } else {
            console.error('Failed to sync baking process images:', imageSyncResult);
            totalErrors += bakingOfflineFiles.length;
          }
        } else {
          console.error('No access token available for baking process image sync');
          totalErrors += bakingOfflineFiles.length;
        }
      }
    } catch (error) {
      console.error('Error syncing baking process offline images:', error);
      totalErrors++;
    }

    // Sync Net Weight Monitoring offline data
    console.log('=== CHECKING NET WEIGHT MONITORING OFFLINE DATA ===');
    console.log('Net Weight Monitoring offline data length:', netWeightOfflineData.length);
    console.log('Net Weight Monitoring offline data:', netWeightOfflineData);
    
    if (netWeightOfflineData.length > 0) {
      console.log('Syncing Net Weight Monitoring offline data...');
      console.log('Net Weight Monitoring pending sync data:', netWeightOfflineData);
      try {
        for (const data of netWeightOfflineData) {
          try {
            const cycleNo = data.cycleNo;
            const plantTourId = planTourState.plantTourId;
            const userName = user?.Name || 'Current User';
            const selectedShift = planTourState.selectedCycle;

            console.log(`Syncing Net Weight Monitoring cycle ${cycleNo}:`, data);
            console.log('Using data for Net Weight Monitoring sync:', {
              cycleNo: data.cycleNo,
              plantTourId,
              userName,
              selectedShift,
              recordsCount: data.records.length
            });
            console.log('Net Weight Monitoring records data:', data.records);
            console.log('First record details:', data.records[0]);
            if (data.records[0]) {
              console.log('First record mc1:', data.records[0].mc1);
              console.log('First record mc2:', data.records[0].mc2);
              console.log('First record mc3:', data.records[0].mc3);
              console.log('First record mc4:', data.records[0].mc4);
            }

            // Import the sync function from NetWeightMonitoringRecord service
            console.log('Importing syncOfflineDataToBackend function...');
            const { syncOfflineDataToBackend } = await import('../Services/NetWeightMonitoringRecord');
            console.log('syncOfflineDataToBackend function imported successfully');
            
            // Sync the offline data
            console.log('Calling syncOfflineDataToBackend with data:', [data]);
            const response = await syncOfflineDataToBackend(
              [data], // Pass as array since the function expects OfflineSavedData[]
              plantTourId || 'N/A',
              userName,
              selectedShift
            );
            console.log('syncOfflineDataToBackend response:', response);

            if (response.success) {
              console.log(`Successfully synced Net Weight Monitoring cycle ${cycleNo}`);
              totalSynced++;
            } else {
              throw new Error(`Failed to sync Net Weight Monitoring cycle ${cycleNo}: ${response.message}`);
            }
          } catch (nwmError) {
            console.error(`Failed to sync Net Weight Monitoring cycle ${data.cycleNo}:`, nwmError);
            totalErrors++;
          }
        }

        console.log('Net Weight Monitoring offline data sync completed');
      } catch (error) {
        console.error('Error syncing Net Weight Monitoring offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No Net Weight Monitoring offline data to sync');
    }

    // Sync OPRP and CCP offline data
    console.log('=== CHECKING OPRP AND CCP OFFLINE DATA ===');
    console.log('OPRP and CCP offline data length:', oprpAndCcpOfflineData.length);
    console.log('OPRP and CCP offline data:', oprpAndCcpOfflineData);
    
    if (oprpAndCcpOfflineData.length > 0) {
      console.log('Syncing OPRP and CCP offline data...');
      console.log('OPRP and CCP pending sync data:', oprpAndCcpOfflineData);
      try {
        for (const data of oprpAndCcpOfflineData) {
          try {
            const cycleNo = data.cycleNo;
            const plantTourId = planTourState.plantTourId;
            const userName = user?.Name || 'Current User';
            const selectedShift = planTourState.selectedCycle;

            console.log(`Syncing OPRP and CCP cycle ${cycleNo}:`, data);
            console.log('Using data for OPRP and CCP sync:', {
              cycleNo: data.cycleNo,
              plantTourId,
              userName,
              selectedShift,
              recordsCount: data.records.length
            });

            // Import the sync function from OPRPAndCCPRecord service
            console.log('Importing syncOfflineDataToBackend function...');
            const { syncOfflineDataToBackend } = await import('../Services/OPRPAndCCPRecord');
            console.log('syncOfflineDataToBackend function imported successfully');
            
            // Sync the offline data
            console.log('Calling syncOfflineDataToBackend with data:', [data]);
            const response = await syncOfflineDataToBackend(
              [data], // Pass as array since the function expects OfflineSavedData[]
              plantTourId || 'N/A',
              userName,
              selectedShift
            );
            console.log('syncOfflineDataToBackend response:', response);

            if (response.success) {
              console.log(`Successfully synced OPRP and CCP cycle ${cycleNo}`);
              totalSynced++;
            } else {
              throw new Error(`Failed to sync OPRP and CCP cycle ${cycleNo}: ${response.message}`);
            }
          } catch (oprpError) {
            console.error(`Failed to sync OPRP and CCP cycle ${data.cycleNo}:`, oprpError);
            totalErrors++;
          }
        }

        console.log('OPRP and CCP offline data sync completed');
      } catch (error) {
        console.error('Error syncing OPRP and CCP offline data:', error);
        totalErrors++;
      }
    } else {
      console.log('No OPRP and CCP offline data to sync');
    }

    // Show sync results and clear data only if ALL sync operations were successful
    if (totalSynced > 0 && totalErrors === 0) {
      alert(`✅ Successfully synced ${totalSynced} offline data item(s)!`);
      
      // Clear all Redux data only after successful sync
      console.log('All sync operations successful. Clearing Redux data...');
      
      // Clear all Redux data except token, plantTourId, employeeDetails, and user details
      dispatch(clearAllDataExceptEssential());
      dispatch(resetOfflineState());

      // Clear cream percentage Redux state
      dispatch(resetCreamPercentage());
      
      // Clear Sieve and Magnet New Plant Redux state
      dispatch(clearSieveAndMagnetNewPlantData());
      
      // Clear Sieve and Magnet Old Plant Redux state
      dispatch(clearSieveAndMagnetOldPlantData());
      
      // Clear Product Monitoring Redux state
      dispatch(clearProductMonitoringData());
      
      // Clear Code Verification Redux state
      dispatch(clearOfflineData());
      // Clear Baking Process Redux state
      dispatch(clearBakingOfflineData());
      // Clear Seal Integrity Test Redux state
      dispatch(clearSealIntegrityOfflineData());
      // Clear ALC Redux state
      dispatch(clearALCOfflineData());
      // Clear Net Weight Monitoring Redux state
      dispatch(clearNWMOfflineData());
      // Clear OPRP and CCP Redux state
      dispatch(clearOPRPAndCcpOfflineData());

      setShowOfflineError(false);

      // Clear any offline data from localStorage
      try {
        localStorage.removeItem('offlineData');
        localStorage.removeItem('offlineSubmissions');
        console.log('Offline data cleared from localStorage');
      } catch (error) {
        console.error('Error clearing offline data:', error);
      }

      console.log('All data cleared except essential information (token, plantTourId, employeeDetails, user details)');
      console.log('Offline mode canceled, normal plant tour is now available');
      
    } else if (totalSynced > 0 && totalErrors > 0) {
      alert(`⚠️ Synced ${totalSynced} item(s) successfully, but ${totalErrors} item(s) failed. Please check console for details.`);
      console.log('Some sync operations failed. Keeping Redux data intact.');
    } else if (totalSynced === 0 && totalErrors > 0) {
      alert('❌ Failed to sync offline data. Please check console for details.');
      console.log('All sync operations failed. Keeping Redux data intact.');
      return;
    } else {
      console.log('No offline data to sync');
      // Even if no data to sync, we can clear the Redux state to reset everything
      console.log('No offline data found. Clearing Redux data to reset state...');
      
      // Clear all Redux data except token, plantTourId, employeeDetails, and user details
      dispatch(clearAllDataExceptEssential());
      dispatch(resetOfflineState());

      // Clear cream percentage Redux state
      dispatch(resetCreamPercentage());
      
      // Clear Sieve and Magnet New Plant Redux state
      dispatch(clearSieveAndMagnetNewPlantData());
      
      // Clear Sieve and Magnet Old Plant Redux state
      dispatch(clearSieveAndMagnetOldPlantData());
      
      // Clear Product Monitoring Redux state
      dispatch(clearProductMonitoringData());
      
      // Clear Code Verification Redux state
      dispatch(clearOfflineData());
      // Clear Baking Process Redux state
      dispatch(clearBakingOfflineData());
      // Clear Seal Integrity Test Redux state
      dispatch(clearSealIntegrityOfflineData());
      // Clear ALC Redux state
      dispatch(clearALCOfflineData());
      // Clear OPRP and CCP Redux state
      dispatch(clearOPRPAndCcpOfflineData());

      setShowOfflineError(false);

      // Clear any offline data from localStorage
      try {
        localStorage.removeItem('offlineData');
        localStorage.removeItem('offlineSubmissions');
        console.log('Offline data cleared from localStorage');
      } catch (error) {
        console.error('Error clearing offline data:', error);
      }

      console.log('All data cleared except essential information (token, plantTourId, employeeDetails, user details)');
      console.log('Offline mode canceled, normal plant tour is now available');
    }
  };

  useEffect(() => {
    if (accounts.length > 0) {
      instance
        .acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        })
        .then((response) => {
          fetchEmployeeList(response.accessToken, user?.Name).then((res) => {
            setEmployees(res);
            if (res && res.length > 0) {
              dispatch(setEmployeeDetails(res[0]));
            }
          });
        })
        .catch((error) => {
          console.error("Token acquisition failed", error);
        });
    }
  }, [accounts, instance, user?.Name]);

  const handleLogout = () => {
    console.log("Logging out...");

    // Clear all Redux state
    dispatch(clearAllDataExceptEssential());
    dispatch(resetOfflineState());
    dispatch(clearUser());
    dispatch(resetCreamPercentage());
    dispatch(clearSieveAndMagnetNewPlantData());
    dispatch(clearSieveAndMagnetOldPlantData());
    dispatch(clearProductMonitoringData());
    dispatch(clearOfflineData());

    // Clear localStorage (but preserve Redux persistence for offline data)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('offlineData');
    // Don't clear redux-persist:root as it contains offline data
    // localStorage.removeItem('redux-persist:root');

    // Clear sessionStorage
    sessionStorage.clear();

    // Perform MSAL logout with redirect to login page
    instance.logoutPopup({
      postLogoutRedirectUri: window.location.origin
    });

    // Navigate to login page
    navigate("/", { replace: true });
  };


  function pad(num: number): string {
    return num.toString().padStart(2, "0");
  }

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Internet Connected:', new Date().toISOString());
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('❌ Internet Disconnected:', new Date().toISOString());
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    startTimer();
  }, []);

  // Debug: Check persisted offline data on component mount
  useEffect(() => {
    console.log('HomePage: Component mounted - checking persisted offline data');
    console.log('HomePage: sieveAndMagnetOldPlantPendingSync length:', sieveAndMagnetOldPlantPendingSync?.length);
    console.log('HomePage: codeVerificationOfflineData length:', codeVerificationOfflineData?.length);
    console.log('HomePage: codeVerificationOfflineData details:', codeVerificationOfflineData);
    console.log('HomePage: All offline data counts:', {
      offlineSubmissions: offlineSubmissions.length,
      creamPercentagePendingSync: creamPercentagePendingSync.length,
      sieveAndMagnetNewPlantPendingSync: sieveAndMagnetNewPlantPendingSync.length,
      sieveAndMagnetOldPlantPendingSync: sieveAndMagnetOldPlantPendingSync.length,
      productMonitoringPendingSync: productMonitoringPendingSync.length,
      codeVerificationOfflineData: codeVerificationOfflineData.length
    });

    // Check localStorage for Redux persistence
    try {
      const reduxPersistData = localStorage.getItem('redux-persist:root');
      if (reduxPersistData) {
        const parsedData = JSON.parse(reduxPersistData);
        console.log('HomePage: Redux persistence data found',parsedData);
      } else {
        console.log('HomePage: No Redux persistence data found');
      }
    } catch (error) {
      console.error('HomePage: Error reading Redux persistence data:', error);
    }
  }, [codeVerificationOfflineData]);

  function startTimer(): void {
    const timerElement = document.getElementById("timer");

    if (!timerElement) {
      console.error("Timer element not found!");
      return;
    }

    setInterval(() => {
      const now = new Date();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());

      timerElement.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
  }

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  console.log(isOfflineCompleted);

  // Add handler for starting plant tour
  const handleStartPlantTour = async (selectedTour: string, selectedShift: string) => {
    console.log('handleStartPlantTour called with:', { selectedTour, selectedShift });
    const employee = planTourState.employeeDetails;

    console.log('Current Redux state:', {
      employee: employee,
      selectedTour: selectedTour,
      selectedShift: selectedShift,
      user: user
    });

    if (!employee || !user || !selectedTour || !selectedShift) {
      console.log('Missing required data:', { employee: !!employee, user: !!user, selectedTour: !!selectedTour, selectedShift: !!selectedShift });
      return;
    }

    setIsPlantTourLoading(true);
    try {
      // Check if we're in offline mode
      if (isOfflineStarted) {
        console.log('Starting offline plant tour...');
        // For offline mode, use existing plantTourId from Redux
        const existingPlantTourId = planTourState.plantTourId;
        if (existingPlantTourId) {
          console.log('Using existing plant tour ID for offline mode:', existingPlantTourId);
          setIsModalOpen(false);
          // Navigate based on selected tour type
          console.log('Selected tour:', selectedTour);
          if (selectedTour === "Cream Percentage Index") {
            console.log('Navigating to Cream Percentage Index');
            navigate("/creampercentage");
          } else if (selectedTour === "Sieves and magnets old plant") {
            console.log('Navigating to Sieve and Magnet Old Plant');
            navigate("/sieveandmagnetoldplant");
          } else if (selectedTour === "Sieves and magnets new plant") {
            console.log('Navigating to Sieve and Magnet New Plant');
            navigate("/sieveandmagnetnewplant");
          } else if (selectedTour === "Product Monitoring Record") {
            console.log('Navigating to Product Monitoring Record');
            navigate("/productmonitoringrecord");
          } else if (selectedTour === "Net Weight Monitoring Record") {
            console.log('Navigating to Net Weight Monitoring Record');
            navigate("/netweightmonitoringrecord");
          } else if (selectedTour === "Code Verification Record") {
            console.log('Navigating to Code Verification Record');
            navigate("/codeverificationrecord");
          } else if (selectedTour === "OPRP and CCP Record") {
            console.log('Navigating to OPRP and CCP Record');
            navigate("/oprpandccprecord");
          } else if (selectedTour === "Baking Process Record") {
            console.log('Navigating to Baking Process Record');
            navigate("/bakingprocessrecord");
          } else if (selectedTour === "Seal Integrity Test") {
            console.log('Navigating to Seal Integrity Test');
            navigate("/sealintegritytest");
          } else if (selectedTour === "ALC") {
            console.log('Navigating to ALC');
            navigate("/alc");
          } else {
            console.log('Navigating to Product Quality Index');
            navigate("/qualityplantour");
          }
        } else {
          throw new Error('No plant tour ID available for offline mode');
        }
      } else {
        console.log('Starting online plant tour...');
        // For online mode, create or fetch new plant tour ID
        const tokenResult = await getAccessToken();
        const accessToken = tokenResult?.token;
       
        if (!accessToken) throw new Error('No access token available');
        const plantTourId = await createOrFetchPlantTour({
          accessToken,
          departmentId: employee.departmentId,
          employeeName: employee.employeeName,
          roleName: employee.roleName,
          plantId: employee.plantId,
          userRoleID: employee.roleId,
        });
        if (plantTourId) {
          dispatch(setPlantTourId(plantTourId));
          setIsModalOpen(false);
          // Navigate based on selected tour type
          console.log('Selected tour:', selectedTour);
          if (selectedTour === "Cream Percentage Index") {
            console.log('Navigating to Cream Percentage Index');
            navigate("/creampercentage");
          } else if (selectedTour === "Sieves and magnets old plant") {
            console.log('Navigating to Sieve and Magnet Old Plant');
            navigate("/sieveandmagnetoldplant");  
          } else if (selectedTour === "Sieves and magnets new plant") {
            console.log('Navigating to Sieve and Magnet New Plant');
            navigate("/sieveandmagnetnewplant");
          } else if (selectedTour === "Product Monitoring Record") {
            console.log('Navigating to Product Monitoring Record');
            navigate("/productmonitoringrecord");
          } else if (selectedTour === "Net Weight Monitoring Record") {
            console.log('Navigating to Net Weight Monitoring Record');
            navigate("/netweightmonitoringrecord");
          } else if (selectedTour === "Code Verification Record") {
            console.log('Navigating to Code Verification Record');
            navigate("/codeverificationrecord");
          } else if (selectedTour === "OPRP and CCP Record") {
            console.log('Navigating to OPRP and CCP Record');
            navigate("/oprpandccprecord");
          } else if (selectedTour === "Baking Process Record") {
            console.log('Navigating to Baking Process Record');
            navigate("/bakingprocessrecord");
          } else if (selectedTour === "Seal Integrity Test") {
            console.log('Navigating to Seal Integrity Test');
            navigate("/sealintegritytest");
          } else if (selectedTour === "ALC") {
            console.log('Navigating to ALC');
            navigate("/alc");
          } else {
            console.log('Navigating to Product Quality Index');
            navigate("/qualityplantour");
          }
        }
      }
    } catch (err) {
      console.error("Failed to start plant tour", err);
      alert('Failed to start plant tour. Please try again.');
    } finally {
      setIsPlantTourLoading(false);
    }
  };
  console.log(user.DVAccessToken, 'user.DVAccessToken');


  return (
    <DashboardLayout rightContent={<p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{getDepartmentName()}</p>} onLogout={handleLogout}>
      <div>
        {/* Content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-medium">Hello, {user?.Name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              <span id="timer"></span> {formattedDate}
            </p>
          </div>
          

          {/* Buttons Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            {!isOfflineStarted && (
              <>
                <button
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  onClick={() => {
                    if (getDepartmentName() === "Quality - Rajpura") {
                      setIsModalOpen(true);
                    } else {
                      handleOtherDepartmentPlantTour();
                    }
                  }}
                  disabled={isPlantTourLoading}
                >
                  Plant Tour
                </button>

                <button
                  className={`w-full sm:w-auto px-4 py-2 rounded-md ${isOnline
                      ? 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  onClick={() => {
                    if (getDepartmentName() === "Quality - Rajpura") {
                      handleOfflineTour();
                    } else {
                      handleOtherDepartmentStartOfflinePlantTour();
                    }
                  }}
                  disabled={!isOnline}
                  title={!isOnline ? 'Internet connection required to start offline mode' : 'Start offline mode'}
                >
                  + Start Offline Mode 
                </button>
                {showOfflineError && (
                  <div className="w-full sm:w-auto text-xs text-red-600 mt-1">
                    ⚠️ Internet connection required to start offline mode
                  </div>
                )}
              </>
            )}
            {isOfflineStarted && (
              <>
                <button
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  onClick={() => {
                    const department = getDepartmentName();
                    console.log('Offline Plant Tour button clicked, department:', department);
                    if (department === "Quality - Rajpura") {
                      console.log('Opening modal for Quality - Rajpura department');
                      setIsModalOpen(true);
                    } else {
                      console.log('Navigating to plant-tour-section for other department:', department);
                      handleOtherDepartmentOfflinePlantTour();
                    }
                  }}
                  disabled={isPlantTourLoading}
                >
                  + Offline Plant Tour
                </button>

                <button
                  className={`w-full sm:w-auto px-4 py-2 rounded-md ${isOnline
                      ? 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  onClick={() => {
                    if (getDepartmentName() === "Quality - Rajpura") {
                      handleCancelOffline();
                    } else {
                      handleOtherDepartmentSyncCancelOffline();
                    }
                  }}
                  disabled={!isOnline}
                  title={!isOnline ? 'Internet connection required to sync offline data' : 'Sync and cancel offline mode'}
                >
                  + Sync & Cancel Offline {totalOfflineCount > 0 && `(${totalOfflineCount})`}
                  {!isOnline && <span className="ml-1 text-xs">(Internet Required)</span>}
                </button>
                {totalOfflineCount > 0 && !isOnline && (
                  <div className="w-full sm:w-auto text-xs text-orange-600 mt-1">
                    ⚠️ {totalOfflineCount} offline submission(s) waiting for internet connection
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Metric Cards */}
        <div className="mb-6 overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-0">
            {metrics.map((item, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-800 min-w-[180px] p-4 rounded-lg shadow flex flex-col items-center text-center"
              >
                <div className="bg-orange-100 dark:bg-orange-200 p-2 rounded-full mb-2">
                  {item.icon}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300">{item.label}</p>
                <p className="text-xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <a href="#" className="text-orange-600 text-sm font-medium hover:underline" onClick={e => { e.preventDefault(); setIsViewAllOpen(true); }}>
            View All →
          </a>
          {planTourState.plantTourId && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs font-mono">
              <strong>Plan Tour ID:</strong> {planTourState.plantTourId}
            </div>
          )}
        </div>
        {/* Modal and Progress Bar logic ... */}
        {/* Modal */}
        <PlantTourModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onDone={handleStartPlantTour} isLoading={isPlantTourLoading} />
        {/* Progress Bar */}
        {isOfflineLoading && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-1/3 sm:right-1/3 z-50 bg-white dark:bg-gray-800 border shadow-lg rounded-md px-4 py-2">
            <p className="text-sm mb-1">Syncing data...</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        {/* View All Modal */}
        {isViewAllOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => setIsViewAllOpen(false)}>
                ✕
              </button>
              <h2 className="text-lg font-semibold mb-4">All Redux Data</h2>
              <div className="overflow-auto max-h-[60vh] text-xs">
                <strong>User State:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 mb-2">{JSON.stringify(userState, null, 2)}</pre>
                <strong>Plan Tour State:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2">{JSON.stringify(planTourState, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
