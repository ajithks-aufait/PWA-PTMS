import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import { showOfflineSaveAlertForCategory } from '../utils/offlineAlerts';
import { setFetchedCycles, selectFetchedCycles, addOfflineData } from '../store/SealIntegrityTestSlice';
import type { SealIntegrityTestCycleData } from '../Services/SealIntegrityTest.ts';



const SealIntegrityTest: React.FC = () => {
    console.log('SealIntegrityTest component is rendering...');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { plantTourId, selectedCycle } = useSelector((state: RootState) => state.planTour);
    const { user } = useSelector((state: RootState) => state.user);
    const {
        cycles,
        pendingSync,
        currentCycle: reduxCurrentCycle
    } = useSelector((state: RootState) => state.productMonitoring);

    // Get offline status from app state
    const isOfflineStarted = useSelector((state: RootState) => state.appState.isOfflineStarted);

    // Get Code Verification data from Redux
    const fetchedCycles = useSelector(selectFetchedCycles);

    console.log('Redux state loaded successfully:', {
        plantTourId,
        selectedCycle,
        user: user?.Name,
        cycles: cycles.length,
        pendingSync: pendingSync.length,
        isOfflineStarted,
        reduxCurrentCycle,
        codeVerificationCycles: fetchedCycles.length,
        fetchedCyclesData: fetchedCycles
    });

    // Form state for Seal Integrity Test
    const [formData, setFormData] = useState({
        machineNo: '',
        sampleQty: '',
        leakageNo: '',
        leakageType: ''
    });

    // Start session form state
    const [startFormData, setStartFormData] = useState({
        executiveName: ''
    });

    // Session state
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<Set<string>>(new Set());
    const [startTime, setStartTime] = useState('');

    // Loading state for fetching data
    const [isLoadingCycles, setIsLoadingCycles] = useState(false);

    // Local cycle management
    const [currentCycle, setCurrentCycle] = useState(1);



    const handleStartSession = async () => {
        console.log('Starting code verification session with product:', selectedProduct, 'executive:', startFormData.executiveName);

        try {
            const { startSessionHandler } = await import('../Services/SealIntegrityTest.ts');
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            await startSessionHandler(currentCycle, selectedProduct, startFormData.executiveName, currentTime);
            setStartTime(currentTime);

            setIsSessionStarted(true);
            setIsExpanded(true);
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Error starting session. Please try again.');
        }
    };

    const handleSave = async () => {
        console.log('=== HANDLE SAVE STARTED ===');
        console.log('Saving code verification data for cycle:', currentCycle, formData);
        console.log('Current offline status:', isOfflineStarted);

        // Check if we have any data to save
        const hasDataToSave =
            formData.machineNo.trim() !== '' ||
            formData.sampleQty.trim() !== '' ||
            formData.leakageNo.trim() !== '' ||
            formData.leakageType.trim() !== '';
        if (!hasDataToSave) {
            alert('No data to save. Please enter at least one value.');
            return;
        }

        try {

            // Check if we're offline
            if (isOfflineStarted) {
                console.log('Processing in offline mode...');

                // Persist seal integrity values for later sync
                try {
                    const sitValues = {
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        observedtime: startTime || '',
                        machineNo: formData.machineNo,
                        sampleqty: formData.sampleQty,
                        leakageno: formData.leakageNo,
                        leakagetype: formData.leakageType
                    };
                    localStorage.setItem(`sit-cycle-${currentCycle}-values`, JSON.stringify(sitValues));
                    console.log('Saved SealIntegrityTest values to localStorage for sync:', sitValues);
                } catch (e) {
                    console.warn('Failed to persist SealIntegrityTest values for offline sync', e);
                }

                // Store data for offline sync in Seal Integrity Test slice
                const offlineData = {
                    cycleNo: currentCycle,
                    records: [{
                        cycleNum: currentCycle.toString(),
                        observedtime: startTime || '',
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        machineNo: formData.machineNo,
                        sampleqty: formData.sampleQty,
                        leakageno: formData.leakageNo,
                        leakagetype: formData.leakageType
                    }],
                    timestamp: Date.now()
                };
                console.log('Storing offline data in Redux:', offlineData);
                dispatch(addOfflineData(offlineData));
                console.log('Offline data dispatched to Redux store');

                // Debug: Check Redux state after dispatch
                setTimeout(() => {
                    const currentState = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect()?.getState();
                    console.log('Redux state after offline data dispatch:', currentState);
                }, 100);

                // Add the completed cycle to Redux so it shows in completed section (show entered values)
                const completedCycleData = {
                    cycleNum: currentCycle.toString(),
                    observedtime: startTime || '',
                    product: selectedProduct,
                    executiveName: startFormData.executiveName || 'N/A',
                    machineNo: formData.machineNo,
                    sampleqty: formData.sampleQty,
                    leakageno: formData.leakageNo,
                    leakagetype: formData.leakageType
                } as any;
                dispatch(setFetchedCycles([...(fetchedCycles as any), completedCycleData] as any));
                
                showOfflineSaveAlertForCategory(currentCycle, 'Seal Integrity Test');
            } else {
                console.log('Processing in online mode...');

                // Use the service to save data
                const { collectEstimationDataCycleSave, saveSectionApiCall } = await import('../Services/SealIntegrityTest.ts');
                const { savedData } = await collectEstimationDataCycleSave(currentCycle, plantTourId || '', user?.Name || '');

                const result = await saveSectionApiCall(savedData);
                if (result.success) {
                    console.log('Data saved successfully to API');
                    // Immediately refresh from backend to show persisted values
                    await fetchCycleDataFromAPI();

                    alert(`Cycle ${currentCycle} completed successfully! Moving to Cycle ${currentCycle + 1}`);
                } else {
                    throw new Error(result.message);
                }
            }

            // Reset form data for next cycle
            setFormData({
                machineNo: '',
                sampleQty: '',
                leakageNo: '',
                leakageType: ''
            });

            // Reset session started state to show start form for next cycle
            setIsSessionStarted(false);

            // Reset start form data for next cycle
            setStartFormData({
                executiveName: ''
            });

            // Increment cycle number for next cycle
            setCurrentCycle(prevCycle => {
                const nextCycle = prevCycle + 1;
                console.log(`Cycle ${prevCycle} completed. Moving to Cycle ${nextCycle}`);
                return nextCycle;
            });

        } catch (error) {
            console.error('Error saving data:', error);
            alert('Error saving data. Please try again.');
        }
    };

    const formattedDate = new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const toggleCompletedCycleExpansion = (cycleNum: string) => {
        setExpandedCompletedCycles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cycleNum)) {
                newSet.delete(cycleNum);
            } else {
                newSet.add(cycleNum);
            }
            return newSet;
        });
    };

    // Component initialization
    useEffect(() => {
        console.log('=== CODE VERIFICATION RECORD COMPONENT MOUNTED ===');
        console.log('Plant Tour ID:', plantTourId);
        console.log('Current cycles in Redux:', cycles.length);
        console.log('Is Offline:', isOfflineStarted);
        console.log('Fetched cycles from Redux:', fetchedCycles.length);

        // Only fetch cycle data if we don't already have data in Redux
        if (plantTourId && fetchedCycles.length === 0) {
            console.log('Plant Tour ID found but no cycles in Redux, calling fetchCycleDataFromAPI...');
            fetchCycleDataFromAPI();
        } else if (plantTourId && fetchedCycles.length > 0) {
            console.log('Plant Tour ID found and cycles already exist in Redux, skipping fetch');
        } else {
            console.log('No Plant Tour ID found, cannot fetch cycle data');
        }
    }, [plantTourId, fetchedCycles.length]); // Added fetchedCycles.length dependency

    // Update current cycle based on fetched cycles from Redux
    useEffect(() => {
        if (fetchedCycles.length > 0) {
            // Find the highest cycle number from fetched cycles
            const maxCycleNumber = Math.max(...fetchedCycles.map(cycle => parseInt(cycle.cycleNum)));
            const nextCycleNumber = maxCycleNumber + 1;

            console.log(`Found ${fetchedCycles.length} completed cycles. Highest cycle: ${maxCycleNumber}. Starting next cycle: ${nextCycleNumber}`);

            // Set the current cycle to the next available cycle number
            setCurrentCycle(nextCycleNumber);
        } else {
            // If no cycles found for this section, start from cycle 1
            console.log('No completed cycles found for Seal Integrity Test. Starting from cycle 1');
            setCurrentCycle(1);
        }
    }, [fetchedCycles, reduxCurrentCycle]);

    // Update local cycle when Redux cycle changes (only if no fetched cycles from Redux)
    useEffect(() => {
        if (fetchedCycles.length === 0) {
            setCurrentCycle(1);
        }
    }, [reduxCurrentCycle, fetchedCycles.length]);

    // Function to fetch cycle data from API
    const fetchCycleDataFromAPI = async () => {
        try {
            setIsLoadingCycles(true);
            console.log('=== FETCHING CYCLE DATA FROM API ===');
            console.log('Plant Tour ID:', plantTourId);
            console.log('Is Offline:', isOfflineStarted);

            if (!plantTourId) {
                console.log('No Plant Tour ID available, skipping fetch');
                return;
            }

            const { fetchCycleData } = await import('../Services/SealIntegrityTest.ts');
            console.log('fetchCycleData function imported successfully');

            const fetchedData = await fetchCycleData(plantTourId);
            console.log('API Response - Fetched cycles from API:', fetchedData);
            console.log('API Response - Data type:', typeof fetchedData);
            console.log('API Response - Is array:', Array.isArray(fetchedData));

            // Ensure the data is properly typed
            const typedData = Array.isArray(fetchedData) ? fetchedData as SealIntegrityTestCycleData[] : [];
            dispatch(setFetchedCycles(typedData));

            if (fetchedData && fetchedData.length > 0) {
                console.log('Successfully fetched', fetchedData.length, 'cycles');
                console.log('Cycle details:', fetchedData);
            } else {
                console.log('No cycles found for this plant tour');
            }
        } catch (error) {
            console.error('Error fetching cycle data:', error);
            console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace'
            });
            // Don't show alert for fetch errors, just log them
            setFetchedCycles([]);
        } finally {
            setIsLoadingCycles(false);
        }
    };

    return (
        <DashboardLayout>
            {/* Header Section */}
            <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 border-b border-gray-200 w-full">
                <div className="flex items-center justify-between gap-2">
                    {/* Back Button */}
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/home');
                            }
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

            {/* Seal Integrity Test Header */}
            <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Seal Integrity Test</h1>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="bg-gray-200 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600">{formattedDate}</span>
                            {isOfflineStarted && (
                                <div className="bg-orange-100 border border-orange-300 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-orange-700">Offline Mode</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchCycleDataFromAPI}
                            disabled={isLoadingCycles}
                            className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                            <svg className={`w-4 h-4 ${isLoadingCycles ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-sm">Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Completed Cycles Display */}
            {fetchedCycles.length > 0 && (
                <div className="space-y-4 mb-6">
                    {fetchedCycles.map((cycleData) => {
                        return (
                            <div key={cycleData.cycleNum} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {cycleData.cycleNum}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <svg
                                            className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer transition-transform ${expandedCompletedCycles.has(cycleData.cycleNum) ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            onClick={() => toggleCompletedCycleExpansion(cycleData.cycleNum)}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Summary Section - Only show when expanded */}
                                {expandedCompletedCycles.has(cycleData.cycleNum) && (
                                    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                                        <h3 className="text-sm sm:text-base font-bold text-red-600 mb-3">Summary</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border border-gray-300">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Observed Time</th>
                                                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Machine No</th>
                                                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Sample Qty</th>
                                                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Leakage No</th>
                                                        <th className="border border-gray-300 px-4 py-2 text-center font-medium">Leakage Type</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">{cycleData.observedtime || 'N/A'}</td>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">{cycleData.machineNo || 'N/A'}</td>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">{cycleData.sampleqty || 'N/A'}</td>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">{cycleData.leakageno || 'N/A'}</td>
                                                        <td className="border border-gray-300 px-4 py-2 text-center">{cycleData.leakagetype || 'N/A'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            )}



            {/* Main Content - Current Cycle Section */}
            <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                {/* Cycle Header with Dropdown Icon */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle}</h2>
                    </div>
                    <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {/* Start Session Form */}
                {!isSessionStarted && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                            {/* Product Field */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product</label>
                                <select
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                >
                                    <option value="">Select Product</option>
                                    <option value="speciality_sauces">Speciality Sauces</option>
                                    <option value="zesty_wasabi">Zesty Wasabi</option>
                                    <option value="mayonnaise">Mayonnaise</option>
                                    <option value="sandwich_spread">Sandwich Spread</option>
                                    <option value="indian_chutneys">Indian Chutneys</option>
                                </select>
                            </div>

                            {/* Executive Name Field */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Executive Name</label>
                                <input
                                    type="text"
                                    value={startFormData.executiveName}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, executiveName: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                )}

                {/* Form Content - Save Section */}
                {isSessionStarted && (
                    <div className="space-y-4">
                        {/* Header Strip */}
                        <div className="bg-blue-100 rounded-lg p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs text-gray-600">Product</div>
                                    <div className="font-bold text-gray-800 break-all">{selectedProduct || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Executive Name</div>
                                    <div className="font-bold text-gray-800 break-all">{startFormData.executiveName || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Time</div>
                                    <div className="font-bold text-gray-800 break-all">{startTime || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Input Fields Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Machine No.</label>
                                <input id={`machine-no-${currentCycle}`}
                                    type="text"
                                    value={formData.machineNo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, machineNo: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter value"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sample Quantity</label>
                                <input id={`sample-quantity-${currentCycle}`}
                                    type="text"
                                    value={formData.sampleQty}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sampleQty: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter value"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">No. of leakage</label>
                                <input id={`leakage-${currentCycle}`}
                                    type="text"
                                    value={formData.leakageNo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, leakageNo: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter value"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Type of leakage</label>
                                <input id={`leakage-type-${currentCycle}`}
                                    type="text"
                                    value={formData.leakageType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, leakageType: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter value"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setIsSessionStarted(false)}
                                className="px-6 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Save Session
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
            </div>
        </DashboardLayout>
    );
};

export default SealIntegrityTest;
