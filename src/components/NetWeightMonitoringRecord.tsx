import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import { showOfflineSaveAlertForCategory } from '../utils/offlineAlerts';
import { setFetchedCycles, selectFetchedCycles, addOfflineData } from '../store/NetWeightMonitoringRecordSlice.ts';
import type { NetWeightMonitoringCycleData } from '../Services/NetWeightMonitoringRecord.ts';



const NetWeightMonitoringRecord: React.FC = () => {
    console.log('NetWeightMonitoringRecord component is rendering...');
    
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
    const fetchedCycles = useSelector(selectFetchedCycles) as unknown as NetWeightMonitoringCycleData[];

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

    // Form state kept for future extensions (not used in inspection layout)
    // New: inspection values map for M/C 1-4, Inspection 1-5
    const [inspectionValues, setInspectionValues] = useState<Record<string, string>>({});

    // Start session form state
    const [startFormData, setStartFormData] = useState({
        executiveName: '',
        batchNo: '',
        packaged: '',
        expiry: ''
    });

    // Session state
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<Set<string>>(new Set());
    
    // Loading state for fetching data
    const [isLoadingCycles, setIsLoadingCycles] = useState(false);
    
    // Local cycle management
    const [currentCycle, setCurrentCycle] = useState(1);

    const getKey = (machine: number, inspection: number) => `mc${machine}_ins${inspection}`;

    const handleStartSession = async () => {
        console.log('Starting code verification session with product:', selectedProduct, 'executive:', startFormData.executiveName);
        
        try {
            // Use the service to handle start session
            const { startSessionHandler } = await import('../Services/NetWeightMonitoringRecord.ts');
            await startSessionHandler(
                currentCycle,
                selectedProduct,
                startFormData.executiveName,
                startFormData.batchNo,
                startFormData.packaged,
                startFormData.expiry
            );
            
            setIsSessionStarted(true);
            setIsExpanded(true);
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Error starting session. Please try again.');
        }
    };

    const handleSave = async () => {
        console.log('=== HANDLE SAVE STARTED ===');
        console.log('Saving Net Weight Monitoring data for cycle:', currentCycle);
        console.log('Current offline status:', isOfflineStarted);
        
        // Check if we have any data to save
        const hasAnyInspection = Object.values(inspectionValues).some(v => (v ?? '').toString().trim() !== '');
        const hasDataToSave = hasAnyInspection; // design-specific: save only inspection sheet
        if (!hasDataToSave) {
            alert('No data to save. Please enter at least one value.');
            return;
        }

        try {

            // Check if we're offline
            if (isOfflineStarted) {
                console.log('Processing in offline mode...');
                
                // Build the proper data structure for offline sync
                const buildArr = (m: number) => [1,2,3,4,5]
                  .map(i => (inspectionValues[`mc${m}_ins${i}`] ?? '').toString().trim());
                
                console.log('=== BUILDING OFFLINE DATA ===');
                console.log('inspectionValues:', inspectionValues);
                console.log('inspectionValues keys:', Object.keys(inspectionValues));
                console.log('MC1 keys being checked:', [1,2,3,4,5].map(i => `mc1_ins${i}`));
                console.log('MC2 keys being checked:', [1,2,3,4,5].map(i => `mc2_ins${i}`));
                console.log('MC3 keys being checked:', [1,2,3,4,5].map(i => `mc3_ins${i}`));
                console.log('MC4 keys being checked:', [1,2,3,4,5].map(i => `mc4_ins${i}`));
                console.log('MC1 raw values:', [1,2,3,4,5].map(i => inspectionValues[`mc1_ins${i}`]));
                console.log('MC2 raw values:', [1,2,3,4,5].map(i => inspectionValues[`mc2_ins${i}`]));
                console.log('MC3 raw values:', [1,2,3,4,5].map(i => inspectionValues[`mc3_ins${i}`]));
                console.log('MC4 raw values:', [1,2,3,4,5].map(i => inspectionValues[`mc4_ins${i}`]));
                console.log('MC1 buildArr result:', buildArr(1));
                console.log('MC2 buildArr result:', buildArr(2));
                console.log('MC3 buildArr result:', buildArr(3));
                console.log('MC4 buildArr result:', buildArr(4));
                
                // Store data for offline sync in slice
                const offlineData = {
                    cycleNo: currentCycle,
                    records: [{
                        cycleNum: currentCycle.toString(),
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        batchNo: startFormData.batchNo || 'N/A',
                        packageDate: startFormData.packaged || 'N/A',
                        expiryDate: startFormData.expiry || 'N/A',
                        mc1: buildArr(1),
                        mc2: buildArr(2),
                        mc3: buildArr(3),
                        mc4: buildArr(4)
                    }],
                    timestamp: Date.now()
                };
                console.log('Storing offline data in Redux:', offlineData);
                dispatch(addOfflineData(offlineData as any));
                console.log('Offline data dispatched to Redux store');
                
                // Debug: Check Redux state after dispatch
                setTimeout(() => {
                    const currentState = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect()?.getState();
                    console.log('Redux state after offline data dispatch:', currentState);
                }, 100);
                 
                 // Add the completed cycle to Redux so it shows in completed section
                const completedCycleData: NetWeightMonitoringCycleData = {
                    cycleNum: currentCycle.toString(),
                    product: selectedProduct,
                    executiveName: startFormData.executiveName || 'N/A',
                    batchNo: startFormData.batchNo || 'N/A',
                    packageDate: startFormData.packaged || 'N/A',
                    expiryDate: startFormData.expiry || 'N/A',
                    mc1: buildArr(1),
                    mc2: buildArr(2),
                    mc3: buildArr(3),
                    mc4: buildArr(4)
                };
                dispatch(setFetchedCycles([...(fetchedCycles as any), completedCycleData] as any));

                showOfflineSaveAlertForCategory(currentCycle, 'Net Weight Monitoring Record');
            } else {
                console.log('Processing in online mode...');
                
                // Use the service to save data. For now, put sheet in remarks
                const { collectEstimationDataCycleSave, saveSectionApiCall } = await import('../Services/NetWeightMonitoringRecord.ts');
                const { savedData } = await collectEstimationDataCycleSave(
                    currentCycle,
                    plantTourId || '',
                    user?.Name || ''
                );
                
                                 const result = await saveSectionApiCall(savedData);
                 if (result.success) {
                     console.log('Data saved successfully to API');
                    // Refresh from backend to display actual saved values instead of placeholder
                    await fetchCycleDataFromAPI();
                     alert(`Cycle ${currentCycle} completed successfully! Moving to Cycle ${currentCycle + 1}`);
                 } else {
                     throw new Error(result.message);
                 }
            }
            
            // Reset form data for next cycle
            setInspectionValues({});
            
            // Reset session started state to show start form for next cycle
            setIsSessionStarted(false);
            
            // Reset start form data for next cycle
            setStartFormData({
                executiveName: '',
                batchNo: '',
                packaged: '',
                expiry: ''
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

    // Component initialization / refresh on plantTour change
    useEffect(() => {
        console.log('=== NET WEIGHT MONITORING COMPONENT MOUNTED/UPDATED ===');
        console.log('Plant Tour ID:', plantTourId);
        console.log('Current cycles in Redux:', fetchedCycles.length);
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        if (plantTourId && online) {
            // Refresh from backend only when online. Offline uses persisted Redux data.
            fetchCycleDataFromAPI();
        } else {
            console.log('Skipping fetch (offline). Using persisted Redux cycles.');
        }
    }, [plantTourId]);

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
            console.log('No completed cycles found for Net Weight Monitoring. Starting from cycle 1');
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
            
            const { fetchCycleData } = await import('../Services/NetWeightMonitoringRecord.ts');
            console.log('fetchCycleData function imported successfully');
            
            const fetchedData = await fetchCycleData(plantTourId);
            console.log('API Response - Fetched cycles from API:', fetchedData);
            console.log('API Response - Data type:', typeof fetchedData);
            console.log('API Response - Is array:', Array.isArray(fetchedData));
            
            // Ensure the data is properly typed
            const typedData = Array.isArray(fetchedData) ? fetchedData as NetWeightMonitoringCycleData[] : [];
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
            setFetchedCycles([] as any);
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

            {/* Net Weight Monitoring Record Header */}
            <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Net Weight Monitoring Record</h1>
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
                                {expandedCompletedCycles.has(cycleData.cycleNum) && (() => {
                                    const header = (
                                        <div className="rounded-lg p-3 sm:p-4 border border-blue-200 bg-blue-50 mb-3">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div>
                                                    <div className="text-xs text-gray-600">Product</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).product || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Executive Name</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).executiveName || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Batch No</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).batchNo || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Packaged</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).packageDate || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Expiry</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).expiryDate || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );

                                    const mc1 = ((cycleData as any).mc1 || []) as any[];
                                    const mc2 = ((cycleData as any).mc2 || []) as any[];
                                    const mc3 = ((cycleData as any).mc3 || []) as any[];
                                    const mc4 = ((cycleData as any).mc4 || []) as any[];
                                    const clean = (v: any) => {
                                        const s = String(v ?? '').trim();
                                        return s === '' || s.toLowerCase() === 'nan' ? '' : s;
                                    };
                                    const toNum = (v: any) => {
                                        const n = parseFloat(String(v));
                                        return isNaN(n) ? null : n;
                                    };
                                    const avg = (arr: any[]) => {
                                        const nums = (arr || []).map(toNum).filter(n => n !== null) as number[];
                                        return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '';
                                    };
                                    return (
                                        <div className="border border-gray-300 rounded-md p-3 sm:p-4 bg-white">
                                            {header}
                                            <h3 className="text-sm sm:text-base font-bold text-red-600 mb-2">Summary</h3>
                                    <div className="overflow-x-auto">
                                                <table className="w-full border border-gray-300 text-sm">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                            <th className="border px-4 py-2 text-center">M/C-1</th>
                                                            <th className="border px-4 py-2 text-center">Avg.</th>
                                                            <th className="border px-4 py-2 text-center">M/C-2</th>
                                                            <th className="border px-4 py-2 text-center">Avg.</th>
                                                            <th className="border px-4 py-2 text-center">M/C-3</th>
                                                            <th className="border px-4 py-2 text-center">Avg.</th>
                                                            <th className="border px-4 py-2 text-center">M/C-4</th>
                                                            <th className="border px-4 py-2 text-center">Avg.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                            <td className="border px-0 py-0">
                                                                <div className="grid grid-cols-5 border border-gray-300">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <div key={i} className="text-center py-2 border-l first:border-l-0 border-gray-300">
                                                                            {clean(mc1[i])}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="border px-3 py-2 text-center align-middle">{avg(mc1)}</td>
                                                            <td className="border px-0 py-0">
                                                                <div className="grid grid-cols-5 border border-gray-300">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <div key={i} className="text-center py-2 border-l first:border-l-0 border-gray-300">
                                                                            {clean(mc2[i])}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="border px-3 py-2 text-center align-middle">{avg(mc2)}</td>
                                                            <td className="border px-0 py-0">
                                                                <div className="grid grid-cols-5 border border-gray-300">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <div key={i} className="text-center py-2 border-l first:border-l-0 border-gray-300">
                                                                            {clean(mc3[i])}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="border px-3 py-2 text-center align-middle">{avg(mc3)}</td>
                                                            <td className="border px-0 py-0">
                                                                <div className="grid grid-cols-5 border border-gray-300">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <div key={i} className="text-center py-2 border-l first:border-l-0 border-gray-300">
                                                                            {clean(mc4[i])}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="border px-3 py-2 text-center align-middle">{avg(mc4)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                    );
                                })()}

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

                            {/* Batch No */}
                            <div className="sm:col-span-1">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Batch No</label>
                                <input
                                    type="text"
                                    value={startFormData.batchNo}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter batch number"
                                />
                            </div>

                            {/* Packaged (Date) */}
                            <div className="sm:col-span-1">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Packaged</label>
                                <input
                                    type="date"
                                    value={startFormData.packaged}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, packaged: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Expiry (Date) */}
                            <div className="sm:col-span-1">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Expiry</label>
                                <input
                                    type="date"
                                    value={startFormData.expiry}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, expiry: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        {/* Summary Header Strip */}
                        <div className="rounded-lg p-3 sm:p-4 border border-blue-200 bg-blue-50">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <div className="text-xs text-gray-600">Product</div>
                                    <div className="text-sm font-semibold text-gray-900 break-all">{selectedProduct || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Executive Name</div>
                                    <div className="text-sm font-semibold text-gray-900 break-all">{startFormData.executiveName || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Batch No</div>
                                    <div className="text-sm font-semibold text-gray-900 break-all">{startFormData.batchNo || 'N/A'}</div>
                        </div>
                            <div>
                                    <div className="text-xs text-gray-600">Packaged</div>
                                    <div className="text-sm font-semibold text-gray-900 break-all">{startFormData.packaged || 'N/A'}</div>
                            </div>
                            <div>
                                    <div className="text-xs text-gray-600">expiry</div>
                                    <div className="text-sm font-semibold text-gray-900 break-all">{startFormData.expiry || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Machines Sections */}
                        {[1, 2, 3, 4].map(machine => (
                            <div key={machine} className="border rounded-lg p-4">
                                <div className="text-sm font-semibold mb-2">M/C-{machine}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {[1, 2, 3, 4, 5].map(insp => {
                                        const key = getKey(machine, insp);
                                        return (
                                            <div key={key} className="space-y-2">
                                                <div className="text-xs text-gray-600">M/C-{machine}-Inspection-{insp}</div>
                                                <input
                                                    type="text"
                                                    value={inspectionValues[key] || ''}
                                                    onChange={(e) => setInspectionValues(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    id={`mc${machine}-inspection-${insp}-${currentCycle}`}
                                                    placeholder="Enter value"
                            />
                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

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

export default NetWeightMonitoringRecord;
