import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import { saveCreamPercentageData } from '../Services/saveCreamPercentageData';
import { getCreamPercentageData } from '../Services/getCreamPercentageData';
import { 
  saveCycleData, 
  setOfflineMode, 
  loadOfflineData, 
  resetCreamPercentage,
} from '../store/creamPercentageSlice';
import { showOfflineCycleSavedAlert } from '../utils/offlineAlerts';

const CreamPercentageIndex: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { plantTourId, selectedCycle } = useSelector((state: RootState) => state.planTour);
  const { user } = useSelector((state: RootState) => state.user);
  const { 
    cycleData: reduxCycleData, 
    completedCycles: reduxCompletedCycles, 
    currentCycle: reduxCurrentCycle,
    isOffline: reduxIsOffline,
    pendingSync: reduxPendingSync
  } = useSelector((state: RootState) => state.creamPercentage);
  
  // Form state
  const [formData, setFormData] = useState({
    product: '',
    machineNo: '',
    line: '',
    standardCreamPercentage: '',
    executiveName: ''
  });

  // Weight data state
  const [weightData, setWeightData] = useState({
    sandwichWeights: ['', '', '', ''],
    shellWeights: ['', '', '', '']
  });

  // Session state
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isCycleCompleted, setIsCycleCompleted] = useState(false);
  const [isCycleExpanded, setIsCycleExpanded] = useState(false);
  const [isWeightInputMode, setIsWeightInputMode] = useState(false);
  const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<{ [key: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Use Redux state for cycle management
  const currentCycle = reduxCurrentCycle;
  const completedCycles = reduxCompletedCycles;
  const cycleData = reduxCycleData;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWeightChange = (type: 'sandwich' | 'shell', index: number, value: string) => {
    setWeightData(prev => ({
      ...prev,
      [type === 'sandwich' ? 'sandwichWeights' : 'shellWeights']: 
        type === 'sandwich' 
          ? prev.sandwichWeights.map((weight, i) => i === index ? value : weight)
          : prev.shellWeights.map((weight, i) => i === index ? value : weight)
    }));
  };

  const handleStartSession = () => {
    console.log('Starting cream percentage session with data:', formData);
    setIsSessionStarted(true);
    setIsWeightInputMode(true);
  };

  const handleSaveSession = async () => {
    console.log('=== HANDLE SAVE SESSION STARTED ===');
    console.log('Current cycle:', currentCycle);
    console.log('Saving session with data:', { formData, weightData });
    
    try {
      // Perform calculations and prepare data for saving
      const creamPercentages = weightData.sandwichWeights.map((sandwich, index) => {
        const shell = weightData.shellWeights[index];
        return calculateCreamPercentage(sandwich, shell);
      });
      
      const averageCreamPercentage = calculateAverageCreamPercentage();
      
      console.log('Calculated cream percentages:', creamPercentages);
      console.log('Average cream percentage:', averageCreamPercentage);
      
      // Prepare the data to save to Redux
      const cycleDataToSave = {
        cycleNum: currentCycle,
        formData,
        weightData,
        qualityTourId: plantTourId || '',
        userName: user?.Name || null,
        shiftValue: selectedCycle || 'shift 1',
        timestamp: new Date().toISOString()
      };
      
      console.log(`=== SAVING CYCLE ${currentCycle} TO REDUX ===`);
      console.log('Cycle data to save:', cycleDataToSave);
      console.log('Current Redux state before save:');
      console.log('- reduxCycleData:', reduxCycleData);
      console.log('- reduxCompletedCycles:', reduxCompletedCycles);
      console.log('- reduxPendingSync:', reduxPendingSync);
      console.log('- reduxIsOffline:', reduxIsOffline);
      
      // Save to Redux first (for offline support)
      dispatch(saveCycleData(cycleDataToSave));
      
      console.log(`Cycle ${currentCycle} data saved to Redux`);
      console.log('Redux state after save:');
      console.log('- reduxCycleData:', reduxCycleData);
      console.log('- reduxCompletedCycles:', reduxCompletedCycles);
      console.log('- reduxPendingSync:', reduxPendingSync);
      
      // Try to save to API if not offline
      if (!reduxIsOffline) {
        try {
          console.log(`=== ATTEMPTING TO SAVE CYCLE ${currentCycle} TO API ===`);
          await saveCreamPercentageData({
            cycleNum: currentCycle,
            formData,
            weightData,
            qualityTourId: plantTourId || '',
            userName: user?.Name || null,
            shiftValue: selectedCycle || 'shift 1'
          });
          console.log(`Cycle ${currentCycle} data saved successfully to API`);
        } catch (apiError) {
          console.error('API save failed, but data saved locally:', apiError);
          dispatch(setOfflineMode(true));
          console.log('Switched to offline mode due to API failure');

          // Show offline alert since we switched to offline mode
          showOfflineCycleSavedAlert(currentCycle);
        }
      } else {
        console.log('Currently in offline mode, data saved to Redux pending sync');

        // Show offline alert since we're already in offline mode
        showOfflineCycleSavedAlert(currentCycle);
      }
      
      // If this was the last cycle (assuming 8 cycles total), show completion
      if (currentCycle >= 8) {
        setIsCycleCompleted(true);
        setIsCycleExpanded(false);
      } else {
        // Reset form data for next cycle
        setFormData({
           product: '',
          machineNo: '',
          line: '',
          standardCreamPercentage: '',
          executiveName: ''
        });
        // Reset weight data for next cycle
        setWeightData({
          sandwichWeights: ['', '', '', ''],
          shellWeights: ['', '', '', '']
        });
        // Stay in session mode for next cycle but reset to form mode
        setIsSessionStarted(true);
        setIsWeightInputMode(false);
      }
    } catch (error) {
      console.error('Error saving cycle data:', error);
      alert('Failed to save cycle data. Please try again.');
    }
  };

  const handleCancel = () => {
    console.log('=== HANDLE CANCEL STARTED ===');
    console.log('Current Redux state before cancel:');
    console.log('- reduxCycleData:', reduxCycleData);
    console.log('- reduxCompletedCycles:', reduxCompletedCycles);
    console.log('- reduxPendingSync:', reduxPendingSync);
    console.log('- reduxIsOffline:', reduxIsOffline);
    
    console.log('Cancelling session and clearing all data...');
    
    // Clear all Redux state
    dispatch(resetCreamPercentage());
    console.log('Redux state cleared via resetCreamPercentage()');
    
    // Reset component state
    setIsSessionStarted(false);
    setIsCycleCompleted(false);
    setIsWeightInputMode(false);
    setExpandedCompletedCycles({});
    console.log('Component state reset');
    
    // Reset form data
    setFormData({
      product: '',
      machineNo: '',
      line: '',
      standardCreamPercentage: '',
      executiveName: ''
    });
    
    // Reset weight data
    setWeightData({
      sandwichWeights: ['', '', '', ''],
      shellWeights: ['', '', '', '']
    });
    
    console.log('Form and weight data reset');
    console.log('=== HANDLE CANCEL COMPLETED ===');
  };


  // Check if user is online
  const isOnline = () => {
    return navigator.onLine;
  };

  // Add online/offline event listeners to sync Redux state
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser came online, updating Redux state');
        dispatch(setOfflineMode(false));
    };

    const handleOffline = () => {
      console.log('Browser went offline, updating Redux state');
      dispatch(setOfflineMode(true));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline state based on browser status
    dispatch(setOfflineMode(!navigator.onLine));

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // Fetch existing cycle data when component mounts
  useEffect(() => {
    const fetchExistingData = async () => {
      if (plantTourId) {
        setIsLoading(true);
        try {
          console.log('=== FETCHING CREAM PERCENTAGE DATA ===');
          console.log('Plant Tour ID:', plantTourId);
          console.log('Current Redux data:', reduxCycleData);
          console.log('Current completed cycles:', reduxCompletedCycles);
          console.log('Is offline:', reduxIsOffline);
          console.log('Browser online status:', isOnline());
          console.log('Redux cycle data keys:', Object.keys(reduxCycleData));
          console.log('Redux completed cycles length:', reduxCompletedCycles.length);
          console.log('Redux current cycle:', reduxCurrentCycle);
          
          // Check localStorage directly to see if data is persisted
          try {
            const persistedData = localStorage.getItem('persist:creamPercentage');
            console.log('Persisted data in localStorage:', persistedData);
            if (persistedData) {
              const parsedData = JSON.parse(persistedData);
              console.log('Parsed persisted data:', parsedData);
              if (parsedData.cycleData) {
                const cycleData = JSON.parse(parsedData.cycleData);
                console.log('Persisted cycle data:', cycleData);
                console.log('Persisted cycle data keys:', Object.keys(cycleData));
              }
              if (parsedData.completedCycles) {
                const completedCycles = JSON.parse(parsedData.completedCycles);
                console.log('Persisted completed cycles:', completedCycles);
              }
            }
          } catch (localStorageError) {
            console.error('Error reading localStorage:', localStorageError);
          }

          // Try to fetch from API first (when online) to get the latest data
          if (isOnline()) {
            console.log('User is online, attempting to fetch latest data from API...');
            
            try {
              const data = await getCreamPercentageData({ qualityTourId: plantTourId });
              console.log('Successfully fetched cream percentage data from API:', data);
              
              // Process fetched data to populate Redux state
              if (data.length > 0) {
                const processedCycles: number[] = [];
              const processedCycleData: { [key: number]: any } = {};
                
                data.forEach((cycle: any) => {
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
                  
                  console.log(`Processed cycle ${cycleNum}:`, processedCycleData[cycleNum]);
                });
                
              // Load data into Redux (this will overwrite any existing data with fresh API data)
                dispatch(loadOfflineData({
                  cycleData: processedCycleData,
                  completedCycles: processedCycles,
                  currentCycle: Math.max(...processedCycles) + 1
                }));
                
              console.log('Successfully loaded API data into Redux');
                console.log('Final processed cycles:', processedCycles);
                console.log('Final processed cycle data:', processedCycleData);
                
                // If we have fetched data, start the session to show completed cycles
                if (processedCycles.length > 0) {
                  setIsSessionStarted(true);
                  setIsWeightInputMode(false);
                console.log('Started session with API data');
              }
            } else {
              console.log('No data found in API, checking existing Redux data...');
              console.log('Redux cycle data object:', reduxCycleData);
              console.log('Redux cycle data keys:', Object.keys(reduxCycleData));
              console.log('Redux completed cycles:', reduxCompletedCycles);
              console.log('Redux completed cycles length:', reduxCompletedCycles.length);
              
              // If no API data, check if we have existing Redux data
              if (Object.keys(reduxCycleData).length > 0 && reduxCompletedCycles.length > 0) {
                console.log('Using existing Redux data:', reduxCycleData);
                setIsSessionStarted(true);
                setIsWeightInputMode(false);
                console.log('Started session with existing Redux data');
              } else {
                console.log('No existing Redux data available when API returned no data');
                console.log('Cycle data keys length:', Object.keys(reduxCycleData).length);
                console.log('Completed cycles length:', reduxCompletedCycles.length);
                }
              }
            } catch (apiError) {
              console.error('Error fetching from API:', apiError);
            console.log('API fetch failed, checking existing Redux data...');

            // If API fetch fails, check if we have existing Redux data
            console.log('API fetch failed, checking existing Redux data as fallback...');
            console.log('Redux cycle data object:', reduxCycleData);
            console.log('Redux cycle data keys:', Object.keys(reduxCycleData));
            console.log('Redux completed cycles:', reduxCompletedCycles);
            console.log('Redux completed cycles length:', reduxCompletedCycles.length);
            
            if (Object.keys(reduxCycleData).length > 0 && reduxCompletedCycles.length > 0) {
              console.log('Using existing Redux data as fallback:', reduxCycleData);
              console.log('Completed cycles in Redux:', reduxCompletedCycles);
              setIsSessionStarted(true);
              setIsWeightInputMode(false);
              console.log('Started session with existing Redux data (fallback)');
            } else {
              console.log('No existing Redux data available, starting fresh');
              console.log('Cycle data keys length:', Object.keys(reduxCycleData).length);
              console.log('Completed cycles length:', reduxCompletedCycles.length);
            }
              
              // If API fetch fails, check if we should go offline
              if (!reduxIsOffline) {
                dispatch(setOfflineMode(true));
                console.log('Switched to offline mode due to API fetch failure');
              }
          }
          } else {
            // User is offline, check existing Redux data
            console.log('User is offline, checking existing Redux data...');
            console.log('Redux cycle data object:', reduxCycleData);
            console.log('Redux cycle data keys:', Object.keys(reduxCycleData));
            console.log('Redux completed cycles:', reduxCompletedCycles);
            console.log('Redux completed cycles length:', reduxCompletedCycles.length);
            
            if (Object.keys(reduxCycleData).length > 0 && reduxCompletedCycles.length > 0) {
              console.log('Found existing Redux data for offline use:', reduxCycleData);
              console.log('Completed cycles in Redux:', reduxCompletedCycles);
              setIsSessionStarted(true);
              setIsWeightInputMode(false);
              console.log('Started session with existing Redux data (offline mode)');
            } else {
              console.log('No existing Redux data available for offline use');
              console.log('Cycle data keys length:', Object.keys(reduxCycleData).length);
              console.log('Completed cycles length:', reduxCompletedCycles.length);
            }
          }
        } catch (error) {
          console.error('Error in fetchExistingData:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchExistingData();
  }, [plantTourId, user?.Name, dispatch]);

  // Monitor pending sync - removed automatic offline mode switching
  // User must explicitly sync using the sync button
  useEffect(() => {
    if (reduxPendingSync.length === 0 && reduxIsOffline) {
      console.log('No pending sync items, but staying in offline mode until user explicitly syncs');
    }
  }, [reduxPendingSync.length, reduxIsOffline]);

  // Handle existing Redux data when component loads
  useEffect(() => {
    // If we have existing data in Redux and we're not in a session, start the session
    if (Object.keys(reduxCycleData).length > 0 && reduxCompletedCycles.length > 0 && !isSessionStarted) {
      console.log('Found existing Redux data from API fetch, starting session...');
      console.log('Existing cycle data:', reduxCycleData);
      console.log('Completed cycles:', reduxCompletedCycles);
      console.log('Current cycle:', reduxCurrentCycle);
      setIsSessionStarted(true);
      setIsWeightInputMode(false);
    }
  }, [reduxCycleData, reduxCompletedCycles, isSessionStarted, reduxCurrentCycle]);

  // Debug logging for Redux state changes
  useEffect(() => {
    console.log('=== REDUX STATE CHANGED ===');
    console.log('reduxIsOffline:', reduxIsOffline);
    console.log('reduxCycleData keys:', Object.keys(reduxCycleData));
    console.log('reduxCompletedCycles:', reduxCompletedCycles);
    console.log('reduxPendingSync.length:', reduxPendingSync.length);
    console.log('reduxCurrentCycle:', reduxCurrentCycle);
  }, [reduxIsOffline, reduxCycleData, reduxCompletedCycles, reduxPendingSync, reduxCurrentCycle]);

  // Calculate cream percentage for each row
  const calculateCreamPercentage = (sandwichWeight: string, shellWeight: string) => {
    const sandwich = parseFloat(sandwichWeight) || 0;
    const shell = parseFloat(shellWeight) || 0;
    
    if (sandwich === 0) return '0.00';
    return ((sandwich - shell) / sandwich * 100).toFixed(2);
  };

  // Calculate average cream percentage
  const calculateAverageCreamPercentage = () => {
    const percentages = weightData.sandwichWeights.map((sandwich, index) => {
      const shell = weightData.shellWeights[index];
      return parseFloat(calculateCreamPercentage(sandwich, shell)) || 0;
    });
    
    const sum = percentages.reduce((acc, val) => acc + val, 0);
    return (sum / percentages.length).toFixed(2);
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {Object.keys(reduxCycleData).length > 0 
                ? 'Loading existing data...' 
                : 'Loading cream percentage data...'
              }
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }


  // If session is not started, show the initial form
  if (!isSessionStarted) {
    return (
      <DashboardLayout>
        {/* Header Section */}
        <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 border-b border-gray-200 w-full">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button */}
            <button
              onClick={() => {
                console.log('Back button clicked - navigating to home');
                navigate('/');
              }}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
            >
              <span className="text-lg mr-1">&lt;</span>
              <span className="font-medium text-sm sm:text-base">Back</span>
            </button>
            
            {/* Plant Tour ID */}
            <div className="text-right min-w-0 flex-1">
              <span className="text-gray-700 text-sm sm:text-base">Plant Tour ID: </span>
              <span className="text-blue-600 font-medium text-sm sm:text-base break-all truncate">{plantTourId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Cream Percentage Checklist Header */}
        <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Cream Percentage Checklist</h1>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-gray-200 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-600">{formattedDate}</span>
              </div>
            </div>
            <div className="text-gray-500 cursor-pointer self-end sm:self-auto">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
          </div>
        </div>

                 {/* Main Content - Cycle Section */}
         <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
           <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">Cycle {currentCycle}</h2>
          
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Product Field */}
            <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product</label>
              <select 
                 className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
              >
                <option value="">Select Product</option>
                <option value="speciality_sauces">Speciality Sauces</option>
                <option value="zesty_wasabi">Zesty Wasabi</option>
                <option value="mayonnaise">Mayonnaise</option>
                <option value="sandwich_spread">Sandwich Spread</option>
                <option value="indian_chutneys">Indian Chutneys</option>
              </select>
            </div>

            {/* Machine No Field */}
            <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Machine No</label>
              <input 
                type="text"
                 className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.machineNo}
                onChange={(e) => handleInputChange('machineNo', e.target.value)}
                placeholder="Enter machine number"
              />
            </div>

            {/* Line Field */}
            <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Line</label>
              <input 
                type="text"
                 className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.line}
                onChange={(e) => handleInputChange('line', e.target.value)}
                placeholder="Enter line number"
              />
            </div>

            {/* Standard Cream Percentage Field */}
            <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Standard Cream Percentage</label>
              <input 
                type="text"
                 className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.standardCreamPercentage}
                onChange={(e) => handleInputChange('standardCreamPercentage', e.target.value)}
                placeholder="Enter percentage"
              />
            </div>

            {/* Executive Name Field */}
            <div>
               <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Executive Name</label>
              <input 
                type="text"
                 className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.executiveName}
                onChange={(e) => handleInputChange('executiveName', e.target.value)}
                placeholder="Enter executive name"
              />
            </div>
          </div>

          {/* Start Session Button */}
           <div className="flex justify-end mt-4 sm:mt-6 md:mt-8">
            <button
              onClick={handleStartSession}
               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-sm sm:text-base transition-colors"
            >
              Start Session
            </button>
          </div>
        </div>

        {/* Disabled Next Cycle Preview */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full mt-4 sm:mt-6 opacity-50">
          <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle + 1}</h2>
        </div>


      </DashboardLayout>
    );
  }

  // If cycle is completed, show the completion screen with summary
  if (isCycleCompleted) {
    // Get the last completed cycle data for display
    const lastCompletedCycle = Math.max(...completedCycles);
    const lastCycleData = cycleData[lastCompletedCycle];
    
  return (
    <DashboardLayout>
        {/* Main Bordered Box Container */}
        <div className="border-2 border-gray-300 rounded-lg p-4 sm:p-6 w-full">
          {/* Cycle Header with Dropdown Icon */}
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">All Cycles Completed</h2>
            <svg 
              className={`w-5 h-5 text-gray-500 cursor-pointer transition-transform ${isCycleExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              onClick={() => setIsCycleExpanded(!isCycleExpanded)}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* Expandable Content */}
          {isCycleExpanded && lastCycleData && (
            <>
              {/* Product Information Section - Blue Highlighted */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                    <span className="text-sm font-medium text-gray-800">{lastCycleData.formData.product}</span>
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Machine No</label>
                    <span className="text-sm font-medium text-gray-800">{lastCycleData.formData.machineNo || ''}</span>
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Line</label>
                    <span className="text-sm font-medium text-gray-800">{lastCycleData.formData.line || ''}</span>
                  </div>
                  <div className="text-center">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Standard Cream Percentage</label>
                    <span className="text-sm font-medium text-gray-800">{lastCycleData.formData.standardCreamPercentage || ''}</span>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-red-600 mb-4">Summary</h3>
                
                {/* Summary Table */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-300">
                    <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Wt. of Sandwich</div>
                    <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Wt. of Shell</div>
                    <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Actual Cream %</div>
                    <div className="px-4 py-3 text-sm font-medium text-gray-700">AVG</div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="bg-white">
                    {lastCycleData.weightData.sandwichWeights.map((sandwichWeight: string, index: number) => {
                      const shellWeight = lastCycleData.weightData.shellWeights[index];
                      const creamPercentage = calculateCreamPercentage(sandwichWeight, shellWeight);
                      const isLastRow = index === lastCycleData.weightData.sandwichWeights.length - 1;
                      
                      return (
                        <div key={index} className={`grid grid-cols-4 ${!isLastRow ? 'border-b border-gray-300' : ''}`}>
                          <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">
                            {parseFloat(sandwichWeight) ? parseFloat(sandwichWeight).toFixed(2) : '0.00'}
                          </div>
                          <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">
                            {parseFloat(shellWeight) ? parseFloat(shellWeight).toFixed(2) : '0.00'}
                          </div>
                          <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">
                            {creamPercentage}
                          </div>
                          {index === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-700 flex items-center justify-center" style={{ gridRow: 'span 4' }}>
                              {(() => {
                                const percentages = lastCycleData.weightData.sandwichWeights.map((sandwich: string, idx: number) => {
                                  const shell = lastCycleData.weightData.shellWeights[idx];
                                  return parseFloat(calculateCreamPercentage(sandwich, shell)) || 0;
                                });
                                const sum = percentages.reduce((acc: number, val: number) => acc + val, 0);
                                return (sum / percentages.length).toFixed(2);
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}


        </div>
      </DashboardLayout>
    );
  }

  // Session started - show the redesigned section with bordered box
  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 border-b border-gray-200 w-full">
        <div className="flex items-center justify-between gap-2">
          {/* Back Button */}
          <button
            onClick={() => {
              console.log('Back button clicked - navigating to home');
              navigate('/');
            }}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
          >
            <span className="text-lg mr-1">&lt;</span>
            <span className="font-medium text-sm sm:text-base">Back</span>
          </button>
          
          {/* Plant Tour ID */}
          <div className="text-right min-w-0 flex-1">
            <span className="text-gray-700 text-sm sm:text-base">Plant Tour ID: </span>
            <span className="text-blue-600 font-medium text-sm sm:text-base break-all truncate">{plantTourId || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Cream Percentage Checklist Header */}
      <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Cream Percentage Checklist</h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-gray-200 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
              </div>
              <span className="text-xs sm:text-sm text-gray-600">{formattedDate}</span>
            </div>
          </div>
          <div className="text-gray-500 cursor-pointer self-end sm:self-auto">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        </div>
      </div>
      {/* Completed Cycles Section */}
      {completedCycles.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <div className="space-y-3 sm:space-y-4">
            {completedCycles.map((cycle) => (
              <div key={cycle} className="border-2 border-gray-300 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="text-sm sm:text-md font-bold text-gray-800">Cycle {cycle}</h4>
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer transition-transform ${expandedCompletedCycles[cycle] ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    onClick={() => setExpandedCompletedCycles(prev => ({
                      ...prev,
                      [cycle]: !prev[cycle]
                    }))}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {/* Product Information and Summary for completed cycle - Only show if expanded */}
                {expandedCompletedCycles[cycle] && cycleData[cycle] && (
                  <>
                    {/* Product Information Section - Blue Highlighted */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                          <span className="text-xs sm:text-sm font-medium text-gray-800 break-words">{cycleData[cycle].formData.product}</span>
                        </div>
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Machine No</label>
                          <span className="text-xs sm:text-sm font-medium text-gray-800">{cycleData[cycle].formData.machineNo || ''}</span>
                        </div>
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Line</label>
                          <span className="text-xs sm:text-sm font-medium text-gray-800">{cycleData[cycle].formData.line || ''}</span>
                        </div>
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Standard Cream Percentage</label>
                          <span className="text-xs sm:text-sm font-medium text-gray-800 break-words">{cycleData[cycle].formData.standardCreamPercentage || ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-base sm:text-lg font-bold text-red-600 mb-3 sm:mb-4">Summary</h3>
                      
                      {/* Summary Table */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-300">
                          <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 border-r border-gray-300">Wt. of Sandwich</div>
                          <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 border-r border-gray-300">Wt. of Shell</div>
                          <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 border-r border-gray-300">Actual Cream %</div>
                          <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-700">AVG</div>
                        </div>
                        
                        {/* Table Body */}
                        <div className="bg-white">
                          {cycleData[cycle].weightData.sandwichWeights.map((sandwichWeight: string, index: number) => {
                            const shellWeight = cycleData[cycle].weightData.shellWeights[index];
                            const creamPercentage = calculateCreamPercentage(sandwichWeight, shellWeight);
                            const isLastRow = index === cycleData[cycle].weightData.sandwichWeights.length - 1;
                            
                            return (
                              <div key={index} className={`grid grid-cols-4 ${!isLastRow ? 'border-b border-gray-300' : ''}`}>
                                <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 border-r border-gray-300">
                                  {parseFloat(sandwichWeight) ? parseFloat(sandwichWeight).toFixed(2) : '0.00'}
                                </div>
                                <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 border-r border-gray-300">
                                  {parseFloat(shellWeight) ? parseFloat(shellWeight).toFixed(2) : '0.00'}
                                </div>
                                <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 border-r border-gray-300">
                                  {creamPercentage}
                                </div>
                                {index === 0 && (
                                  <div className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 flex items-center justify-center" style={{ gridRow: 'span 4' }}>
                                    {(() => {
                                      const percentages = cycleData[cycle].weightData.sandwichWeights.map((sandwich: string, idx: number) => {
                                        const shell = cycleData[cycle].weightData.shellWeights[idx];
                                        return parseFloat(calculateCreamPercentage(sandwich, shell)) || 0;
                                      });
                                      const sum = percentages.reduce((acc: number, val: number) => acc + val, 0);
                                      return (sum / percentages.length).toFixed(2);
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Cycle Section */}
      <div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4 md:p-6 w-full">
        {/* Cycle Header with Dropdown Icon */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle}</h2>
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
                 {/* Show form fields if not in weight input mode */}
         {!isWeightInputMode ? (
           <>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
               {/* Product Field */}
               <div>
                 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product</label>
                 <select 
                   className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   value={formData.product}
                   onChange={(e) => handleInputChange('product', e.target.value)}
                 >
                  <option value="">Select Product</option>
                  <option value="speciality_sauces">Speciality Sauces</option>
                  <option value="zesty_wasabi">Zesty Wasabi</option>
                  <option value="mayonnaise">Mayonnaise</option>
                  <option value="sandwich_spread">Sandwich Spread</option>
                  <option value="indian_chutneys">Indian Chutneys</option>
                 </select>
               </div>

               {/* Machine No Field */}
               <div>
                 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Machine No</label>
                 <input 
                   type="text"
                   className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   value={formData.machineNo}
                   onChange={(e) => handleInputChange('machineNo', e.target.value)}
                   placeholder="Enter machine number"
                 />
               </div>

               {/* Line Field */}
               <div>
                 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Line</label>
                 <input 
                   type="text"
                   className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   value={formData.line}
                   onChange={(e) => handleInputChange('line', e.target.value)}
                   placeholder="Enter line number"
                 />
               </div>

               {/* Standard Cream Percentage Field */}
               <div>
                 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Standard Cream Percentage</label>
                 <input 
                   type="text"
                   className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   value={formData.standardCreamPercentage}
                   onChange={(e) => handleInputChange('standardCreamPercentage', e.target.value)}
                   placeholder="Enter percentage"
                 />
               </div>

               {/* Executive Name Field */}
               <div>
                 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Executive Name</label>
                 <input 
                   type="text"
                   className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   value={formData.executiveName}
                   onChange={(e) => handleInputChange('executiveName', e.target.value)}
                   placeholder="Enter executive name"
                 />
               </div>
             </div>

                           {/* Start Session Button */}
              <div className="flex justify-end mt-4 sm:mt-6 md:mt-8">
                <button
                  onClick={handleStartSession}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-sm sm:text-base transition-colors"
                >
                  Start Session
                </button>
              </div>
            </>
          ) : (
          <>
            {/* Product Information Section - Blue Highlighted */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <span className="text-sm font-medium text-gray-800">{formData.product}</span>
          </div>
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-600 mb-1">Machine No</label>
            <span className="text-sm font-medium text-gray-800">{formData.machineNo || ''}</span>
          </div>
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-600 mb-1">Line</label>
            <span className="text-sm font-medium text-gray-800">{formData.line || ''}</span>
          </div>
          <div className="text-center">
            <label className="block text-xs font-medium text-gray-600 mb-1">Standard Cream Percentage</label>
            <span className="text-sm font-medium text-gray-800">{formData.standardCreamPercentage || ''}</span>
          </div>
        </div>
      </div>

            {/* Weight of Sandwich Section */}
            <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Weight of Sandwich</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {weightData.sandwichWeights.map((weight, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wt. of Sandwich-{index + 1}</label>
              <input 
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={weight}
                onChange={(e) => handleWeightChange('sandwich', index, e.target.value)}
                placeholder="Enter value"
              />
            </div>
          ))}
        </div>
      </div>

            {/* Weight of Shell Section */}
            <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Weight of Shell</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {weightData.shellWeights.map((weight, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wt. of Shell-{index + 1}</label>
              <input 
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={weight}
                onChange={(e) => handleWeightChange('shell', index, e.target.value)}
                placeholder="Enter value"
              />
            </div>
          ))}
        </div>
      </div>

                         {/* Action Buttons - Inside the bordered box */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
                 onClick={() => {
                   console.log('=== CANCEL BUTTON CLICKED ===');
                   console.log('Cancel button clicked, calling handleCancel...');
                   handleCancel();
                 }}
                 className="w-full sm:w-auto border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-sm sm:text-base transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveSession}
                 className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-sm sm:text-base transition-colors"
        >
          Save Session
        </button>
      </div>
           </>
         )}
       </div>

        {/* Disabled Next Cycle Preview */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full mt-4 sm:mt-6 opacity-50">
          <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle + 1}</h2>
        </div>


    </DashboardLayout>
  );
};

export default CreamPercentageIndex;
