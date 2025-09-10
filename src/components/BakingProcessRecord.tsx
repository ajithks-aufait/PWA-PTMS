import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import { showOfflineSaveAlertForCategory } from '../utils/offlineAlerts';
import { setFetchedCycles, selectFetchedCycles, addOfflineData } from '../store/BakingProcessSlice';
import { startSessionHandler as bakingStart, fetchCycleData as bakingFetchCycles, collectEstimationDataCycleSave as bakingCollect, savesectionApicall as bakingSave } from '../Services/BakingProcesRecord';
import BakingProcessImageUpload from './BakingProcessImageUpload';



const BakingProcessRecord: React.FC = () => {
    console.log('BakingProcessRecord component is rendering...');

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

    // Get Baking Process completed cycles from Redux
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

    // Form state for Code Verification
    const [formData, setFormData] = useState({
        sku: '',
        machineProof: '',
        majorDefectsRemarks: ''
    });

    // Start session form state
    const [startFormData, setStartFormData] = useState({
        executiveName: '',
        bakingTime: ''
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

    // Save-section states
    type BakingZones = {
        zone1: string; zone2: string; zone3: string; zone4: string; zone5: string; zone6: string; zone7: string; productTempAfter: string;
    };
    const [topZones, setTopZones] = useState<BakingZones>({ zone1: '', zone2: '', zone3: '', zone4: '', zone5: '', zone6: '', zone7: '', productTempAfter: '' });
    const [bottomZones, setBottomZones] = useState<BakingZones>({ zone1: '', zone2: '', zone3: '', zone4: '', zone5: '', zone6: '', zone7: '', productTempAfter: '' });
    const updateTop = (key: keyof BakingZones, value: string) => setTopZones(prev => ({ ...prev, [key]: value }));
    const updateBottom = (key: keyof BakingZones, value: string) => setBottomZones(prev => ({ ...prev, [key]: value }));

    const handleStartSession = async () => {
        console.log('Starting baking process session with product:', selectedProduct, 'executive:', startFormData.executiveName);

        try {
            // Use the service to handle start session
            await bakingStart(
                currentCycle,
                selectedProduct,
                startFormData.executiveName,
                startFormData.bakingTime
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
        console.log('Saving baking process data for cycle:', currentCycle, formData);
        console.log('Current offline status:', isOfflineStarted);

        // Check if we have any data to save (zones or temps)
        const zoneValues = [
            topZones.zone1, topZones.zone2, topZones.zone3, topZones.zone4, topZones.zone5, topZones.zone6, topZones.zone7, topZones.productTempAfter,
            bottomZones.zone1, bottomZones.zone2, bottomZones.zone3, bottomZones.zone4, bottomZones.zone5, bottomZones.zone6, bottomZones.zone7, bottomZones.productTempAfter
        ];
        const hasDataToSave = zoneValues.some(v => (v || '').toString().trim() !== '');
        if (!hasDataToSave) {
            alert('No data to save. Please enter at least one value.');
            return;
        }

        try {

            // Check if we're offline
            if (isOfflineStarted) {
                console.log('Processing in offline mode...');

                // Persist baking values for later sync
                try {
                    const bakingValues = {
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        bakingTime: startFormData.bakingTime || 'N/A',
                        topZones: { ...topZones },
                        bottomZones: { ...bottomZones }
                    };
                    localStorage.setItem(`baking-cycle-${currentCycle}-values`, JSON.stringify(bakingValues));
                    console.log('Saved baking values to localStorage for sync:', bakingValues);
                } catch (e) {
                    console.warn('Failed to persist baking values for offline sync', e);
                }

                // Store minimal marker in Redux for counting and tracking
                const offlineData = {
                    cycleNo: currentCycle,
                    records: [{
                        cycleNum: currentCycle.toString(),
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        sku: '',
                        proof: '',
                        remarks: ''
                    }],
                    files: [], // Add empty files array
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

                // Add the completed cycle to Redux so it shows in completed section
                const completedCycleData = {
                    cycleNum: currentCycle.toString(),
                    product: selectedProduct,
                    executiveName: startFormData.executiveName || 'N/A',
                    bakingTime: startFormData.bakingTime || 'N/A',
                    sku: formData.sku,
                    proof: formData.machineProof,
                    remarks: formData.majorDefectsRemarks,
                    // Include temperature zone data
                    topbakingtempzone1: topZones.zone1 || null,
                    topbakingtempzone2: topZones.zone2 || null,
                    topbakingtempzone3: topZones.zone3 || null,
                    topbakingtempzone4: topZones.zone4 || null,
                    topbakingtempzone5: topZones.zone5 || null,
                    topbakingtempzone6: topZones.zone6 || null,
                    topbakingtempzone7: topZones.zone7 || null,
                    topproducttempafterbaking: topZones.productTempAfter || null,
                    bottombakingtempzone1: bottomZones.zone1 || null,
                    bottombakingtempzone2: bottomZones.zone2 || null,
                    bottombakingtempzone3: bottomZones.zone3 || null,
                    bottombakingtempzone4: bottomZones.zone4 || null,
                    bottombakingtempzone5: bottomZones.zone5 || null,
                    bottombakingtempzone6: bottomZones.zone6 || null,
                    bottombakingtempzone7: bottomZones.zone7 || null,
                    bottomproducttempafterbaking: bottomZones.productTempAfter || null,
                };
                dispatch(setFetchedCycles([...fetchedCycles, completedCycleData]));

                showOfflineSaveAlertForCategory(currentCycle, 'Baking Process Record');
            } else {
                console.log('Processing in online mode...');

                // Use the Baking service to save data
                const { savedData } = await bakingCollect(
                    currentCycle,
                    plantTourId || '',
                    user?.Name || ''
                );

                const result = await bakingSave(savedData as any);
                if (result.success) {
                    console.log('Data saved successfully to API');

                    // Add the completed cycle to Redux so it shows in completed section
                    const completedCycleData = {
                        cycleNum: currentCycle.toString(),
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        bakingTime: startFormData.bakingTime || 'N/A',
                        sku: formData.sku,
                        proof: formData.machineProof,
                        remarks: formData.majorDefectsRemarks,
                        // Include temperature zone data
                        topbakingtempzone1: topZones.zone1 || null,
                        topbakingtempzone2: topZones.zone2 || null,
                        topbakingtempzone3: topZones.zone3 || null,
                        topbakingtempzone4: topZones.zone4 || null,
                        topbakingtempzone5: topZones.zone5 || null,
                        topbakingtempzone6: topZones.zone6 || null,
                        topbakingtempzone7: topZones.zone7 || null,
                        topproducttempafterbaking: topZones.productTempAfter || null,
                        bottombakingtempzone1: bottomZones.zone1 || null,
                        bottombakingtempzone2: bottomZones.zone2 || null,
                        bottombakingtempzone3: bottomZones.zone3 || null,
                        bottombakingtempzone4: bottomZones.zone4 || null,
                        bottombakingtempzone5: bottomZones.zone5 || null,
                        bottombakingtempzone6: bottomZones.zone6 || null,
                        bottombakingtempzone7: bottomZones.zone7 || null,
                        bottomproducttempafterbaking: bottomZones.productTempAfter || null,
                    };
                    dispatch(setFetchedCycles([...fetchedCycles, completedCycleData]));

                    alert(`Cycle ${currentCycle} completed successfully! Moving to Cycle ${currentCycle + 1}`);
                } else {
                    throw new Error(result.message);
                }
            }

            // Reset form data for next cycle
            setFormData({
                sku: '',
                machineProof: '',
                majorDefectsRemarks: ''
            });

            // Reset temperature zones for next cycle
            setTopZones({ zone1: '', zone2: '', zone3: '', zone4: '', zone5: '', zone6: '', zone7: '', productTempAfter: '' });
            setBottomZones({ zone1: '', zone2: '', zone3: '', zone4: '', zone5: '', zone6: '', zone7: '', productTempAfter: '' });

            // Reset session started state to show start form for next cycle
            setIsSessionStarted(false);

            // Reset start form data for next cycle
            setStartFormData({
                executiveName: '',
                bakingTime: ''
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
        console.log('=== BAKING PROCESS RECORD COMPONENT MOUNTED ===');
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
            console.log('No completed cycles found for Baking Process. Starting from cycle 1');
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

            const fetchedData = await bakingFetchCycles(plantTourId);
            console.log('API Response - Fetched cycles from API:', fetchedData);
            console.log('API Response - Data type:', typeof fetchedData);
            console.log('API Response - Is array:', Array.isArray(fetchedData));

            // Ensure the data is properly typed
            const typedData = Array.isArray(fetchedData) ? fetchedData as any[] : [];
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

            {/* Baking Process Record Header */}
            <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Baking Process Record</h1>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="bg-gray-200 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600">{formattedDate}</span>
                            {/* Offline badge removed as requested */}
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
                    {fetchedCycles.map((cycleData: any) => {
                        return (
                            <div key={cycleData.cycleNum} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {cycleData.cycleNum}</h2>
                                    </div>
                                    <button
                                        onClick={() => toggleCompletedCycleExpansion(cycleData.cycleNum)}
                                        className="text-gray-500 hover:text-gray-700"
                                        aria-label={expandedCompletedCycles.has(cycleData.cycleNum) ? 'Collapse' : 'Expand'}
                                    >
                                        <svg className={`w-5 h-5 transform transition-transform ${expandedCompletedCycles.has(cycleData.cycleNum) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Completed Cycle Details */}
                                {expandedCompletedCycles.has(cycleData.cycleNum) && (
                                    <div className="space-y-3">
                                        {/* Header Strip */}
                                        <div className="rounded-lg p-3 sm:p-4 border border-blue-200 bg-blue-50">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-xs text-gray-600">Product</div>
                                                    <div className="text-sm font-semibold text-gray-900">{cycleData.product || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Baking Time</div>
                                                    <div className="text-sm font-semibold text-gray-900">{cycleData.bakingTime || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Executive Name</div>
                                                    <div className="text-sm font-semibold text-gray-900">{cycleData.executiveName || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Summary Table */}
                                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                                            <h3 className="text-sm sm:text-base font-bold text-red-600 mb-3">Summary</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse border border-gray-300 text-center">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Position</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 1</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 2</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 3</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 4</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 5</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 6</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Baking Temp Zone 7</th>
                                                            <th className="border border-gray-300 px-2 py-2 text-xs">Product Temp after Baking</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs font-medium">Top</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone1 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone2 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone3 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone4 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone5 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone6 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topbakingtempzone7 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.topproducttempafterbaking || '-'}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs font-medium">Bottom</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone1 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone2 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone3 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone4 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone5 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone6 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottombakingtempzone7 || '-'}</td>
                                                            <td className="border border-gray-300 px-2 py-2 text-xs">{cycleData.bottomproducttempafterbaking || '-'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
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

                            {/* Baking Time (same width as Product column) */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Baking Time</label>
                                <input
                                    type="time"
                                    value={startFormData.bakingTime}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, bakingTime: e.target.value }))}
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
                        {/* Header summary strip */}
                        <div className="rounded-lg p-3 sm:p-4 mb-6 border border-blue-200 bg-blue-50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs text-gray-600">Product</div>
                                    <div className="text-sm font-semibold text-gray-900">{selectedProduct || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Executive Name</div>
                                    <div className="text-sm font-semibold text-gray-900">{startFormData.executiveName || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Baking Time</div>
                                    <div className="text-sm font-semibold text-gray-900">{startFormData.bakingTime || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Removed SKU, Machine Proof, and Remarks per request */}

                        {/* Top Section */}
                        <div className="border rounded-lg p-3 sm:p-4 bg-white">
                            <div className="font-semibold text-gray-800 mb-3">Top</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 1</label>
                                    <input id={`top-1-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone1} onChange={e => updateTop('zone1', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 2</label>
                                    <input id={`top-2-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone2} onChange={e => updateTop('zone2', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 3</label>
                                    <input id={`top-3-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone3} onChange={e => updateTop('zone3', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 4</label>
                                    <input id={`top-4-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone4} onChange={e => updateTop('zone4', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 5</label>
                                    <input id={`top-5-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone5} onChange={e => updateTop('zone5', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 6</label>
                                    <input id={`top-6-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone6} onChange={e => updateTop('zone6', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 7</label>
                                    <input id={`top-7-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.zone7} onChange={e => updateTop('zone7', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Temp after Baking</label>
                                    <input id={`top-8-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={topZones.productTempAfter} onChange={e => updateTop('productTempAfter', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section */}
                        <div className="border rounded-lg p-3 sm:p-4 bg-white">
                            <div className="font-semibold text-gray-800 mb-3">Bottom</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 1</label>
                                    <input id={`bottom-1-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone1} onChange={e => updateBottom('zone1', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 2</label>
                                    <input id={`bottom-2-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone2} onChange={e => updateBottom('zone2', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 3</label>
                                    <input id={`bottom-3-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone3} onChange={e => updateBottom('zone3', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 4</label>
                                    <input id={`bottom-4-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone4} onChange={e => updateBottom('zone4', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 5</label>
                                    <input id={`bottom-5-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone5} onChange={e => updateBottom('zone5', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 6</label>
                                    <input id={`bottom-6-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone6} onChange={e => updateBottom('zone6', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Baking Temp Zone 7</label>
                                    <input id={`bottom-7-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.zone7} onChange={e => updateBottom('zone7', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Temp after Baking</label>
                                    <input id={`bottom-8-baking-temp-zone-${currentCycle}`} className="w-full border rounded px-3 py-2" placeholder="Enter value" value={bottomZones.productTempAfter} onChange={e => updateBottom('productTempAfter', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Upload Attachment */}
                        <div className="border rounded-lg p-3 sm:p-4 bg-white">
                            <div className="text-sm font-medium mb-3">Upload Image</div>
                            <BakingProcessImageUpload
                                cycleNum={currentCycle}
                                qualityTourId={plantTourId || ''}
                                onUploadSuccess={(imageData) => {
                                    console.log('Image uploaded successfully:', imageData);
                                }}
                                onUploadError={(error) => {
                                    console.error('Image upload failed:', error);
                                    alert(`Upload failed: ${error}`);
                                }}
                            />
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

export default BakingProcessRecord;
