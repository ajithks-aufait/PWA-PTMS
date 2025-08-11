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
  removePendingSyncItem
} from '../store/creamPercentageSlice';

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
    product: 'Speciality Sauces',
    machineNo: '',
    line: '',
    standardCreamPercentage: ''
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
  const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<{[key: number]: boolean}>({});
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
      
      // Save to Redux first (for offline support)
      dispatch(saveCycleData({
        cycleNum: currentCycle,
        formData,
        weightData,
        qualityTourId: plantTourId || '',
        userName: user?.Name || null,
        shiftValue: selectedCycle || 'shift 1',
        timestamp: new Date().toISOString()
      }));
      
      console.log(`Cycle ${currentCycle} data saved to Redux`);
      
      // Try to save to API if not offline
      if (!reduxIsOffline) {
        try {
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
        }
      } else {
        console.log('Currently in offline mode, data saved to Redux pending sync');
      }
      
      // If this was the last cycle (assuming 8 cycles total), show completion
      if (currentCycle >= 8) {
        setIsCycleCompleted(true);
        setIsCycleExpanded(false);
      } else {
        // Reset form data for next cycle
        setFormData({
          product: 'Speciality Sauces',
          machineNo: '',
          line: '',
          standardCreamPercentage: ''
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
      product: 'Speciality Sauces',
      machineNo: '',
      line: '',
      standardCreamPercentage: ''
    });
    
    // Reset weight data
    setWeightData({
      sandwichWeights: ['', '', '', ''],
      shellWeights: ['', '', '', '']
    });
    
    console.log('Form and weight data reset');
    console.log('=== HANDLE CANCEL COMPLETED ===');
  };

  // Sync offline data when connection is restored
  const syncOfflineData = async () => {
    console.log('=== SYNC OFFLINE DATA STARTED ===');
    console.log('reduxIsOffline:', reduxIsOffline);
    console.log('plantTourId:', plantTourId);
    console.log('reduxPendingSync length:', reduxPendingSync.length);
    console.log('reduxPendingSync data:', reduxPendingSync);
    
    if (!reduxIsOffline || !plantTourId) {
      console.log('Early return - not offline or no plantTourId');
      return;
    }
    
    try {
      if (reduxPendingSync.length === 0) {
        console.log('No pending sync items, setting offline mode to false');
        dispatch(setOfflineMode(false));
        return;
      }
      
      console.log('Starting sync process for offline data:', reduxPendingSync);
      
      // Create a copy of pending sync data to avoid mutation during iteration
      const pendingDataToSync = [...reduxPendingSync];
      let successCount = 0;
      let failureCount = 0;
      
      console.log(`Will attempt to sync ${pendingDataToSync.length} items`);
      
      // Sync each pending item
      for (const data of pendingDataToSync) {
        try {
          console.log(`=== SYNCING CYCLE ${data.cycleNum} ===`);
          console.log('Cycle data to sync:', data);
          console.log('formData:', data.formData);
          console.log('weightData:', data.weightData);
          console.log('qualityTourId:', data.qualityTourId);
          console.log('userName:', data.userName);
          console.log('shiftValue:', data.shiftValue);
          
          const apiResult = await saveCreamPercentageData({
            cycleNum: data.cycleNum,
            formData: data.formData,
            weightData: data.weightData,
            qualityTourId: data.qualityTourId,
            userName: data.userName,
            shiftValue: data.shiftValue
          });
          
          console.log(`API call result for cycle ${data.cycleNum}:`, apiResult);
          console.log(`Synced cycle ${data.cycleNum} successfully`);
          successCount++;
          
          // Remove this item from pending sync after successful sync
          dispatch(removePendingSyncItem(data.cycleNum));
          console.log(`Removed cycle ${data.cycleNum} from pending sync`);
          
        } catch (error) {
          console.error(`=== FAILED TO SYNC CYCLE ${data.cycleNum} ===`);
          console.error('Error details:', error);
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          failureCount++;
          // Keep the item in pending sync if sync failed
        }
      }
      
      console.log(`=== SYNC PROCESS COMPLETED ===`);
      console.log(`Success: ${successCount}, Failures: ${failureCount}`);
      console.log(`Total items processed: ${pendingDataToSync.length}`);
      
      // If all items were synced successfully, clear the Redux state and reset
      if (successCount === pendingDataToSync.length && failureCount === 0) {
        console.log('All offline data synced successfully. Clearing Redux state...');
        
        // Clear all Redux state
        dispatch(resetCreamPercentage());
        
        // Reset component state
        setIsSessionStarted(false);
        setIsCycleCompleted(false);
        setIsWeightInputMode(false);
        setExpandedCompletedCycles({});
        
        // Reset form data
        setFormData({
          product: 'Speciality Sauces',
          machineNo: '',
          line: '',
          standardCreamPercentage: ''
        });
        
        // Reset weight data
        setWeightData({
          sandwichWeights: ['', '', '', ''],
          shellWeights: ['', '', '', '']
        });
        
        console.log('Redux state cleared and component reset successfully');
        
        // Show success message
        alert(`Successfully synced ${successCount} cycle(s) and cleared offline data.`);
        
      } else if (failureCount > 0) {
        // Some items failed to sync
        console.log(`${failureCount} items failed to sync. Keeping them in pending sync.`);
        alert(`Sync completed with ${successCount} success(es) and ${failureCount} failure(s). Failed items will remain in offline queue.`);
      }
      
    } catch (error) {
      console.error('=== ERROR DURING OFFLINE DATA SYNC ===');
      console.error('Error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      alert('Failed to sync offline data. Please check console for details.');
    }
  };

  // Fetch existing cycle data when component mounts
  useEffect(() => {
    const fetchExistingData = async () => {
      if (plantTourId) {
        setIsLoading(true);
        try {
          // Check if we already have data in Redux for this plant tour
          const existingDataInRedux = Object.keys(reduxCycleData).length > 0;
          
          if (existingDataInRedux) {
            console.log('Found existing data in Redux:', reduxCycleData);
            console.log('Completed cycles in Redux:', reduxCompletedCycles);
            
            // If we have existing data, start the session to show completed cycles
            if (reduxCompletedCycles.length > 0) {
              setIsSessionStarted(true);
              setIsWeightInputMode(false);
              console.log('Started session with existing Redux data');
            }
          } else {
            // Only try to fetch from API if we don't have existing data
            console.log('No existing data in Redux, attempting to fetch from API...');
            
            try {
              const data = await getCreamPercentageData({ qualityTourId: plantTourId });
              console.log('Fetched cream percentage data:', data);
              
              // Process fetched data to populate Redux state
              if (data.length > 0) {
                const processedCycles: number[] = [];
                const processedCycleData: {[key: number]: any} = {};
                
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
                    }
                  };
                  
                  console.log(`Processed cycle ${cycleNum}:`, processedCycleData[cycleNum]);
                });
                
                // Load data into Redux
                dispatch(loadOfflineData({
                  cycleData: processedCycleData,
                  completedCycles: processedCycles,
                  currentCycle: Math.max(...processedCycles) + 1
                }));
                
                console.log('Final processed cycles:', processedCycles);
                console.log('Final processed cycle data:', processedCycleData);
                
                // If we have fetched data, start the session to show completed cycles
                if (processedCycles.length > 0) {
                  setIsSessionStarted(true);
                  setIsWeightInputMode(false);
                }
              }
            } catch (apiError) {
              console.error('Error fetching from API:', apiError);
              console.log('API fetch failed, will work with existing Redux data or start fresh');
              
              // If API fetch fails, check if we should go offline
              if (!reduxIsOffline) {
                dispatch(setOfflineMode(true));
                console.log('Switched to offline mode due to API fetch failure');
              }
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
  }, [plantTourId, reduxCycleData, reduxCompletedCycles, reduxIsOffline, dispatch]);

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
      console.log('Found existing Redux data, starting session...');
      setIsSessionStarted(true);
      setIsWeightInputMode(false);
    }
  }, [reduxCycleData, reduxCompletedCycles, isSessionStarted]);

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

  // Offline indicator
  const OfflineIndicator = () => (
    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Offline Mode</span>
          <span className="ml-2 text-sm">
            {reduxPendingSync.length > 0 
              ? `${reduxPendingSync.length} cycle(s) pending sync` 
              : 'Data will be synced when connection is restored'
            }
          </span>
        </div>
        <button
          onClick={() => {
            console.log('=== SYNC BUTTON CLICKED ===');
            console.log('Button clicked, calling syncOfflineData...');
            syncOfflineData();
          }}
          disabled={reduxPendingSync.length === 0}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            reduxPendingSync.length > 0
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {reduxPendingSync.length > 0 ? `Sync Now (${reduxPendingSync.length})` : 'No Data to Sync'}
        </button>
      </div>
    </div>
  );

  // If session is not started, show the initial form
  if (!isSessionStarted) {
    return (
      <DashboardLayout>
        {reduxIsOffline && <OfflineIndicator />}
        {/* Header Section */}
        <div className="bg-white px-4 sm:px-6 py-4 mb-6 border-b border-gray-200 w-full">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span className="text-lg mr-1">&lt;</span>
              <span className="font-medium">Back</span>
            </button>
            
            {/* Plant Tour ID */}
            <div className="text-right">
              <span className="text-gray-700">Plant Tour ID: </span>
              <span className="text-blue-600 font-medium">{plantTourId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Cream Percentage Checklist Header */}
        <div className="bg-gray-100 px-4 sm:px-6 py-4 mb-6 rounded-lg w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">Cream Percentage Checklist</h1>
              <div className="bg-gray-200 rounded-full px-3 py-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
              </div>
              <span className="text-sm text-gray-600">{formattedDate}</span>
            </div>
            <div className="text-gray-500 cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Content - Cycle Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 w-full">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Cycle {currentCycle}</h2>
         
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Product Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
              <select 
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
              >
                <option value="Speciality Sauces">Speciality Sauces</option>
                <option value="Zesty Wasabi">Zesty Wasabi</option>
                <option value="Product 3">Product 3</option>
              </select>
            </div>

            {/* Machine No Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Machine No</label>
              <input 
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.machineNo}
                onChange={(e) => handleInputChange('machineNo', e.target.value)}
                placeholder="Enter machine number"
              />
            </div>

            {/* Line Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Line</label>
              <input 
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.line}
                onChange={(e) => handleInputChange('line', e.target.value)}
                placeholder="Enter line number"
              />
            </div>

            {/* Standard Cream Percentage Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Standard Cream Percentage</label>
              <input 
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.standardCreamPercentage}
                onChange={(e) => handleInputChange('standardCreamPercentage', e.target.value)}
                placeholder="Enter percentage"
              />
            </div>
          </div>

          {/* Start Session Button */}
          <div className="flex justify-end mt-6 sm:mt-8">
            <button
              onClick={handleStartSession}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Start Session
            </button>
          </div>
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
      {reduxIsOffline && <OfflineIndicator />}
      {/* Header Section */}
      <div className="bg-white px-4 sm:px-6 py-4 mb-6 border-b border-gray-200 w-full">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span className="text-lg mr-1">&lt;</span>
            <span className="font-medium">Back</span>
          </button>
          
          {/* Plant Tour ID */}
          <div className="text-right">
            <span className="text-gray-700">Plant Tour ID: </span>
            <span className="text-blue-600 font-medium">{plantTourId || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Cream Percentage Checklist Header */}
      <div className="bg-gray-100 px-4 sm:px-6 py-4 mb-6 rounded-lg w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Cream Percentage Checklist</h1>
            <div className="bg-gray-200 rounded-full px-3 py-1 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
            </div>
            <span className="text-sm text-gray-600">{formattedDate}</span>
          </div>
          <div className="text-gray-500 cursor-pointer">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        </div>
      </div>
      {/* Completed Cycles Section */}
      {completedCycles.length > 0 && (
        <div className="mb-6">
          <div className="space-y-4">
            {completedCycles.map((cycle) => (
              <div key={cycle} className="border-2 border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-bold text-gray-800">Cycle {cycle}</h4>
                  <svg 
                    className={`w-5 h-5 text-gray-500 cursor-pointer transition-transform ${expandedCompletedCycles[cycle] ? 'rotate-180' : ''}`} 
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                          <span className="text-sm font-medium text-gray-800">{cycleData[cycle].formData.product}</span>
                        </div>
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Machine No</label>
                          <span className="text-sm font-medium text-gray-800">{cycleData[cycle].formData.machineNo || ''}</span>
                        </div>
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Line</label>
                          <span className="text-sm font-medium text-gray-800">{cycleData[cycle].formData.line || ''}</span>
                        </div>
                        <div className="text-center">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Standard Cream Percentage</label>
                          <span className="text-sm font-medium text-gray-800">{cycleData[cycle].formData.standardCreamPercentage || ''}</span>
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
                          {cycleData[cycle].weightData.sandwichWeights.map((sandwichWeight: string, index: number) => {
                            const shellWeight = cycleData[cycle].weightData.shellWeights[index];
                            const creamPercentage = calculateCreamPercentage(sandwichWeight, shellWeight);
                            const isLastRow = index === cycleData[cycle].weightData.sandwichWeights.length - 1;
                            
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
      <div className="border-2 border-gray-300 rounded-lg p-4 sm:p-6 w-full">
        {/* Cycle Header with Dropdown Icon */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Cycle {currentCycle}</h2>
          <svg className="w-5 h-5 text-gray-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {/* Show form fields if not in weight input mode */}
        {!isWeightInputMode ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Product Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.product}
                  onChange={(e) => handleInputChange('product', e.target.value)}
                >
                  <option value="Speciality Sauces">Speciality Sauces</option>
                  <option value="Zesty Wasabi">Zesty Wasabi</option>
                  <option value="Product 3">Product 3</option>
                </select>
              </div>

              {/* Machine No Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Machine No</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.machineNo}
                  onChange={(e) => handleInputChange('machineNo', e.target.value)}
                  placeholder="Enter machine number"
                />
              </div>

              {/* Line Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.line}
                  onChange={(e) => handleInputChange('line', e.target.value)}
                  placeholder="Enter line number"
                />
              </div>

              {/* Standard Cream Percentage Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Standard Cream Percentage</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.standardCreamPercentage}
                  onChange={(e) => handleInputChange('standardCreamPercentage', e.target.value)}
                  placeholder="Enter percentage"
                />
              </div>
            </div>

            {/* Start Session Button */}
            <div className="flex justify-end mt-6 sm:mt-8">
              <button
                onClick={handleStartSession}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
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
                className="w-full sm:w-auto border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 px-6 py-2 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSession}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Save Session
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreamPercentageIndex;
