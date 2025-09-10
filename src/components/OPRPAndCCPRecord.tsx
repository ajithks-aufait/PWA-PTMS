import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import { showOfflineSaveAlertForCategory } from '../utils/offlineAlerts';
import { setFetchedCycles, selectFetchedCycles, addOfflineData } from '../store/OPRPAndCCPSlice';
import type { OPRPAndCCPCycleData } from '../Services/OPRPAndCCPRecord';
import { startSessionHandler } from '../Services/OPRPAndCCPRecord';



const OPRPAndCCPRecord: React.FC = () => {
    console.log('OPRPAndCCPRecord component is rendering...');

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

    // Get OPRP/CCP data from Redux
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
    // Start session form state
    const [startFormData, setStartFormData] = useState({
        executiveName: '',
        batchNo: '',
        locationFrequency: '',
        category: 'OPRP Old Plant'
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



    // Checklist items for OPRP/CCP save section UI
    type ChecklistStatus = 'okay' | 'not-okay' | null;
    interface ChecklistItem { id: string; group: string; label: string; status: ChecklistStatus; remarks: string; }
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
        { id: 'fe-centre-1', group: 'FE', label: 'Centre 1st Pass', status: null, remarks: '' },
        { id: 'fe-centre-2', group: 'FE', label: 'Centre 2nd Pass', status: null, remarks: '' },
        { id: 'nfe-centre-1', group: 'NFE', label: 'Centre 1st Pass', status: null, remarks: '' },
        { id: 'nfe-centre-2', group: 'NFE', label: 'Centre 2nd Pass', status: null, remarks: '' },
        { id: 'ss-centre-1', group: 'SS', label: 'Centre 1st Pass', status: null, remarks: '' },
        { id: 'ss-centre-2', group: 'SS', label: 'Centre 2nd Pass', status: null, remarks: '' },
        { id: 'md-sensitivity', group: 'M.D. Sensitivity & Rejection in Time', label: 'M.D. Sensitivity & Rejection in Time', status: null, remarks: '' },
    ]);
    const handleStatusChange = (itemId: string, status: Exclude<ChecklistStatus, null>) => {
        setChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, status } : item));
    };
    const handleRemarksChange = (itemId: string, remarks: string) => {
        setChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, remarks } : item));
    };

    // Function to reset checklist items for new cycle
    const resetChecklistItems = () => {
        setChecklistItems([
            { id: 'fe-centre-1', group: 'FE', label: 'Centre 1st Pass', status: null, remarks: '' },
            { id: 'fe-centre-2', group: 'FE', label: 'Centre 2nd Pass', status: null, remarks: '' },
            { id: 'nfe-centre-1', group: 'NFE', label: 'Centre 1st Pass', status: null, remarks: '' },
            { id: 'nfe-centre-2', group: 'NFE', label: 'Centre 2nd Pass', status: null, remarks: '' },
            { id: 'ss-centre-1', group: 'SS', label: 'Centre 1st Pass', status: null, remarks: '' },
            { id: 'ss-centre-2', group: 'SS', label: 'Centre 2nd Pass', status: null, remarks: '' },
            { id: 'md-sensitivity', group: 'M.D. Sensitivity & Rejection in Time', label: 'M.D. Sensitivity & Rejection in Time', status: null, remarks: '' },
        ]);
    };

    const handleStartSession = async () => {
        console.log('Starting code verification session with product:', selectedProduct, 'executive:', startFormData.executiveName);

        // Validate required fields
        if (!selectedProduct) {
            alert('Please select a product before starting the session.');
            return;
        }

        if (!startFormData.executiveName.trim()) {
            alert('Please enter the executive name before starting the session.');
            return;
        }

        if (!startFormData.batchNo.trim()) {
            alert('Please enter the batch number before starting the session.');
            return;
        }

        if (!startFormData.locationFrequency.trim()) {
            alert('Please enter the location/frequency before starting the session.');
            return;
        }

        try {
            console.log('=== STARTING SESSION ===');
            console.log('Current cycle:', currentCycle, 'Type:', typeof currentCycle);
            console.log('Selected product:', selectedProduct, 'Type:', typeof selectedProduct);
            console.log('Form data:', startFormData);
            console.log('Plant Tour ID:', plantTourId);
            console.log('User:', user?.Name);
            
            // Validate currentCycle is a valid number
            if (typeof currentCycle !== 'number' || currentCycle <= 0) {
                throw new Error(`Invalid currentCycle value: ${currentCycle}`);
            }

            // Ensure shift is available for API save
            try {
                sessionStorage.setItem('shiftValue', selectedCycle || 'Shift 1');
                console.log('Shift value set in sessionStorage:', selectedCycle || 'Shift 1');
            } catch (e) {
                console.warn('Unable to set shiftValue in sessionStorage', e);
            }

            // Use the service to handle start session
            console.log('Using startSessionHandler...');

            console.log('Calling startSessionHandler with parameters:', {
                currentCycle,
                selectedProduct,
                executiveName: startFormData.executiveName,
                batchNo: startFormData.batchNo,
                locationFrequency: startFormData.locationFrequency,
                category: startFormData.category
            });

            const result = await startSessionHandler(
                currentCycle,
                selectedProduct,
                startFormData.executiveName,
                startFormData.batchNo,
                startFormData.locationFrequency,
                startFormData.category
            );

            console.log('startSessionHandler completed successfully:', result);

            // Reset checklist items for new cycle
            resetChecklistItems();
            
            setIsSessionStarted(true);
            setIsExpanded(true);
            console.log('Session started successfully');
        } catch (error) {
            console.error('=== ERROR STARTING SESSION ===');
            console.error('Error details:', error);
            console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            alert('Error starting session. Please try again.');
        }
    };

    const handleSave = async () => {
        console.log('=== HANDLE SAVE STARTED ===');
        console.log('Saving OPRP/CCP data for cycle:', currentCycle, checklistItems);
        console.log('Current offline status:', isOfflineStarted);

        // Build summary from checklist selections
        const okays = checklistItems.filter(ci => ci.status === 'okay').map(ci => `${ci.group} - ${ci.label}`);
        const defects = checklistItems.filter(ci => ci.status === 'not-okay').map(ci => `${ci.group} - ${ci.label}${ci.remarks ? `: ${ci.remarks}` : ''}`);
        const saveFormData = {
            sku: '',
            machineProof: okays.length > 0 ? `Okays: ${okays.join('; ')}` : '',
            majorDefectsRemarks: defects.length > 0 ? `Defects: ${defects.join('; ')}` : 'No defects'
        };
        const hasDataToSave = okays.length > 0 || defects.length > 0;
        if (!hasDataToSave) {
            alert('No data to save. Please select at least one item.');
            return;
        }

        try {
            // Check if we're offline
            if (isOfflineStarted) {
                console.log('Processing in offline mode...');

                // Store data for offline sync in OPRP/CCP slice
                const offlineData = {
                    cycleNo: currentCycle,
                    records: [{
                        cycleNum: currentCycle.toString(),
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        sku: saveFormData.sku,
                        proof: saveFormData.machineProof,
                        remarks: saveFormData.majorDefectsRemarks
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

                // Add the completed cycle to Redux so it shows in completed section
                const completedCycleData = {
                    cycleNum: currentCycle.toString(),
                    product: selectedProduct,
                    executiveName: startFormData.executiveName || 'N/A',
                    sku: saveFormData.sku,
                    proof: saveFormData.machineProof,
                    remarks: saveFormData.majorDefectsRemarks
                };
                dispatch(setFetchedCycles([...fetchedCycles, completedCycleData]));

                showOfflineSaveAlertForCategory(currentCycle, 'OPRP and CCP Record');
            } else {
                console.log('Processing in online mode...');

                // Use the service to save data
                const { collectEstimationDataCycleSave, saveSectionApiCall } = await import('../Services/OPRPAndCCPRecord');
                const { savedData } = await collectEstimationDataCycleSave(
                    currentCycle,
                    saveFormData,
                    plantTourId || '',
                    user?.Name || '',
                    selectedCycle || 'Shift 1'
                );

                const result = await saveSectionApiCall(savedData);
                if (result.success) {
                    console.log('Data saved successfully to API');

                    // Add the completed cycle to Redux so it shows in completed section
                    const completedCycleData = {
                        cycleNum: currentCycle.toString(),
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                        sku: saveFormData.sku,
                        proof: saveFormData.machineProof,
                        remarks: saveFormData.majorDefectsRemarks
                    };
                    dispatch(setFetchedCycles([...fetchedCycles, completedCycleData]));

                    alert(`Cycle ${currentCycle} completed successfully! Moving to Cycle ${currentCycle + 1}`);
                } else {
                    throw new Error(result.message);
                }
            }


            // Reset session started state to show start form for next cycle
            setIsSessionStarted(false);

            // Reset start form data for next cycle
            setStartFormData({
                executiveName: '',
                batchNo: '',
                locationFrequency: '',
                category: 'OPRP Old Plant'
            });

            // Increment cycle number for next cycle
            setCurrentCycle(prevCycle => {
                const nextCycle = prevCycle + 1;
                console.log(`Cycle ${prevCycle} completed. Moving to Cycle ${nextCycle}`);
                return nextCycle;
            });

            // Reset checklist items for the new cycle
            resetChecklistItems();

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
        console.log('=== OPRP AND CCP RECORD COMPONENT MOUNTED ===');
        console.log('Plant Tour ID:', plantTourId);
        console.log('Current cycles in Redux:', cycles.length);
        console.log('Is Offline:', isOfflineStarted);
        console.log('Fetched cycles from Redux:', fetchedCycles.length);

        // Only fetch cycle data if we don't already have data in Redux AND we're not in offline mode
        if (plantTourId && fetchedCycles.length === 0 && !isOfflineStarted) {
            console.log('Plant Tour ID found but no cycles in Redux and not in offline mode, calling fetchCycleDataFromAPI...');
            fetchCycleDataFromAPI();
        } else if (plantTourId && fetchedCycles.length > 0) {
            console.log('Plant Tour ID found and cycles already exist in Redux, skipping fetch');
        } else if (isOfflineStarted) {
            console.log('In offline mode, skipping API fetch');
        } else {
            console.log('No Plant Tour ID found, cannot fetch cycle data');
        }
    }, [plantTourId, fetchedCycles.length, isOfflineStarted]); // Added isOfflineStarted dependency

    // Update current cycle based on fetched cycles from Redux
    useEffect(() => {
        console.log('=== CYCLE MANAGEMENT USEEFFECT ===');
        console.log('fetchedCycles.length:', fetchedCycles.length);
        console.log('fetchedCycles:', fetchedCycles);
        console.log('reduxCurrentCycle:', reduxCurrentCycle);
        console.log('Current local currentCycle:', currentCycle);
        
        if (fetchedCycles.length > 0) {
            // Find the highest cycle number from fetched cycles
            const maxCycleNumber = Math.max(...fetchedCycles.map(cycle => parseInt(cycle.cycleNum)));
            const nextCycleNumber = maxCycleNumber + 1;

            console.log(`Found ${fetchedCycles.length} completed cycles. Highest cycle: ${maxCycleNumber}. Starting next cycle: ${nextCycleNumber}`);

            // Set the current cycle to the next available cycle number
            setCurrentCycle(nextCycleNumber);
        } else {
            // If no cycles found for this section, start from cycle 1
            console.log('No completed cycles found for OPRP/CCP. Starting from cycle 1');
            setCurrentCycle(1);
        }
    }, [fetchedCycles, reduxCurrentCycle]);

    // Update local cycle when Redux cycle changes (only if no fetched cycles from Redux)
    useEffect(() => {
        if (fetchedCycles.length === 0 && reduxCurrentCycle > 0) {
            console.log('No fetched cycles but Redux current cycle is', reduxCurrentCycle, 'setting local cycle to', reduxCurrentCycle);
            setCurrentCycle(reduxCurrentCycle);
        }
    }, [reduxCurrentCycle, fetchedCycles.length]);

    // Reset checklist items whenever currentCycle changes
    useEffect(() => {
        console.log('Current cycle changed to:', currentCycle, '- resetting checklist items');
        resetChecklistItems();
    }, [currentCycle]);

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

            const { fetchCycleData } = await import('../Services/OPRPAndCCPRecord');
            console.log('fetchCycleData function imported successfully');

            const fetchedData = await fetchCycleData(plantTourId);
            console.log('API Response - Fetched cycles from API:', fetchedData);
            console.log('API Response - Data type:', typeof fetchedData);
            console.log('API Response - Is array:', Array.isArray(fetchedData));

            // Ensure the data is properly typed
            const typedData = Array.isArray(fetchedData) ? fetchedData as OPRPAndCCPCycleData[] : [];
            dispatch(setFetchedCycles(typedData));

            if (fetchedData && fetchedData.length > 0) {
                console.log('Successfully fetched', fetchedData.length, 'cycles');
                console.log('Cycle details:', fetchedData);
            } else {
                console.log('No cycles found for this plant tour');
            }
        } catch (error) {
            console.error('Error fetching OPRP/CCP cycle data:', error);
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
                            console.log('Back button clicked, navigating to home page');
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

            {/* OPRP and CCP Record Header */}
            <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">OPRP and CCP Record</h1>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className="bg-gray-200 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600">{formattedDate}</span>
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
                                        {/* Header summary row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-blue-50 rounded-md p-3 mb-4">
                                            <div>
                                                <div className="text-xs text-gray-600">Product</div>
                                                <div className="text-sm font-semibold text-gray-800 truncate">{cycleData.product || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-600">Executive Name</div>
                                                <div className="text-sm font-semibold text-gray-800 truncate">{cycleData.executiveName || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-600">Batch Code</div>
                                                <div className="text-sm font-semibold text-gray-800 truncate">{'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-600">Location & Frequency</div>
                                                <div className="text-sm font-semibold text-gray-800 truncate">{'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-600">Category</div>
                                                <div className="text-sm font-semibold text-gray-800 truncate">{'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Compute statuses from stored proof/remarks */}
                                        {(() => {
                                            const parseList = (s?: string | null) => {
                                                if (!s) return [] as string[];
                                                const cleaned = s.replace(/^Okays:\s*/i, '').replace(/^Defects:\s*/i, '');
                                                return cleaned.split(';').map(x => x.trim()).filter(Boolean);
                                            };
                                            const okays = parseList(cycleData.proof as any);
                                            const defects = parseList(cycleData.remarks as any);
                                            const okaysSet = new Set(okays);
                                            const defectsSet = new Set(defects);
                                            const statusFor = (group: string, label: string) => {
                                                const key = `${group} - ${label}`;
                                                if (okaysSet.has(key)) return 'OK';
                                                if (defectsSet.has(key)) return 'Not Okay';
                                                return '';
                                            };

                                            return (
                                                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                                                    <div className="px-2 sm:px-3 py-2 text-sm font-bold text-red-600">Summary</div>
                                                    <table className="w-full border-collapse border border-gray-300 text-center text-xs sm:text-sm">
                                                        <thead>
                                                            <tr className="bg-gray-50">
                                                                <th className="border border-gray-300 px-2 py-2" colSpan={2}>FE</th>
                                                                <th className="border border-gray-300 px-2 py-2" colSpan={2}>NFE</th>
                                                                <th className="border border-gray-300 px-2 py-2" colSpan={2}>SS</th>
                                                                <th className="border border-gray-300 px-2 py-2">M.D. Sensitivity Rejection in Time</th>
                                                            </tr>
                                                            <tr className="bg-gray-50">
                                                                <th className="border border-gray-300 px-2 py-2">Centre 1st Pass</th>
                                                                <th className="border border-gray-300 px-2 py-2">Centre 2nd Pass</th>
                                                                <th className="border border-gray-300 px-2 py-2">Centre 1st Pass</th>
                                                                <th className="border border-gray-300 px-2 py-2">Centre 2nd Pass</th>
                                                                <th className="border border-gray-300 px-2 py-2">Centre 1st Pass</th>
                                                                <th className="border border-gray-300 px-2 py-2">Centre 2nd Pass</th>
                                                                <th className="border border-gray-300 px-2 py-2">&nbsp;</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('FE', 'Centre 1st Pass')}</td>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('FE', 'Centre 2nd Pass')}</td>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('NFE', 'Centre 1st Pass')}</td>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('NFE', 'Centre 2nd Pass')}</td>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('SS', 'Centre 1st Pass')}</td>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('SS', 'Centre 2nd Pass')}</td>
                                                                <td className="border border-gray-300 px-2 py-2">{statusFor('M.D. Sensitivity & Rejection in Time', 'M.D. Sensitivity & Rejection in Time') || statusFor('M.D. Sensitivity & Rejection in Time', '')}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
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

                            {/* Batch No */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Batch No</label>
                                <input
                                    type="text"
                                    value={startFormData.batchNo}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter Batch No"
                                />
                            </div>

                            {/* Location & Frequency */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Location & Frequency</label>
                                <input
                                    type="text"
                                    value={startFormData.locationFrequency}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, locationFrequency: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter Location & Frequency"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
                                <select
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={startFormData.category}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value="OPRP Old Plant">OPRP Old Plant</option>
                                    <option value="CCP Old Plant">CCP Old Plant</option>
                                    <option value="OPRP New Plant">OPRP New Plant</option>
                                    <option value="CCP New Plant">CCP New Plant</option>
                                </select>
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
                        {/* Header Summary */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="grid grid-cols-1 sm:grid-cols-5 bg-blue-50 px-3 sm:px-4 py-3">
                                <div className="mb-2 sm:mb-0">
                                    <div className="text-xs text-gray-600">Product</div>
                                    <div className="text-sm font-semibold text-gray-800 truncate">{selectedProduct}</div>
                                </div>
                                <div className="mb-2 sm:mb-0">
                                    <div className="text-xs text-gray-600">Executive Name</div>
                                    <div className="text-sm font-semibold text-gray-800 truncate">{startFormData.executiveName || 'N/A'}</div>
                                </div>
                                <div className="mb-2 sm:mb-0">
                                    <div className="text-xs text-gray-600">Batch Code</div>
                                    <div className="text-sm font-semibold text-gray-800 truncate">{startFormData.batchNo || 'N/A'}</div>
                                </div>
                                <div className="mb-2 sm:mb-0">
                                    <div className="text-xs text-gray-600">Location & Frequency</div>
                                    <div className="text-sm font-semibold text-gray-800 truncate">{startFormData.locationFrequency || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Category</div>
                                    <div className="text-sm font-semibold text-gray-800 truncate">{startFormData.category || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Checklist Groups */}
                        {/* FE */}
                        <div className="border rounded-lg p-3 sm:p-4">
                            <div className="font-semibold text-gray-800 mb-2">FE</div>
                            {checklistItems.filter(i => i.group === 'FE').map(item => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white mb-3 last:mb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm sm:text-base font-medium text-gray-800">{item.label}</span>
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(item.id, 'not-okay')}
                                                className={`px-3 py-1 rounded border ${item.status === 'not-okay' ? 'bg-red-100 border-red-600 text-red-600' : 'border-red-400 text-red-500'}`}
                                            >
                                                Not Okay
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(item.id, 'okay')}
                                                className={`px-3 py-1 rounded border ${item.status === 'okay' ? 'bg-green-100 border-green-600 text-green-600' : 'border-green-400 text-green-500'}`}
                                            >
                                                Okay
                                            </button>
                                        </div>
                                    </div>
                                    {item.status === 'not-okay' && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Major Defects and Remarks</label>
                                            <textarea
                                                value={item.remarks}
                                                onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                                                placeholder="Type Here..."
                                                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                rows={4}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* NFE */}
                        <div className="border rounded-lg p-3 sm:p-4">
                            <div className="font-semibold text-gray-800 mb-2">NFE</div>
                            {checklistItems.filter(i => i.group === 'NFE').map(item => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white mb-3 last:mb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm sm:text-base font-medium text-gray-800">{item.label}</span>
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(item.id, 'not-okay')}
                                                className={`px-3 py-1 rounded border ${item.status === 'not-okay' ? 'bg-red-100 border-red-600 text-red-600' : 'border-red-400 text-red-500'}`}
                                            >
                                                Not Okay
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(item.id, 'okay')}
                                                className={`px-3 py-1 rounded border ${item.status === 'okay' ? 'bg-green-100 border-green-600 text-green-600' : 'border-green-400 text-green-500'}`}
                                            >
                                                Okay
                                            </button>
                                        </div>
                                    </div>
                                    {item.status === 'not-okay' && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Major Defects and Remarks</label>
                                            <textarea
                                                value={item.remarks}
                                                onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                                                placeholder="Type Here..."
                                                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                rows={4}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* SS */}
                        <div className="border rounded-lg p-3 sm:p-4">
                            <div className="font-semibold text-gray-800 mb-2">SS</div>
                            {checklistItems.filter(i => i.group === 'SS').map(item => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white mb-3 last:mb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm sm:text-base font-medium text-gray-800">{item.label}</span>
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(item.id, 'not-okay')}
                                                className={`px-3 py-1 rounded border ${item.status === 'not-okay' ? 'bg-red-100 border-red-600 text-red-600' : 'border-red-400 text-red-500'}`}
                                            >
                                                Not Okay
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(item.id, 'okay')}
                                                className={`px-3 py-1 rounded border ${item.status === 'okay' ? 'bg-green-100 border-green-600 text-green-600' : 'border-green-400 text-green-500'}`}
                                            >
                                                Okay
                                            </button>
                                        </div>
                                    </div>
                                    {item.status === 'not-okay' && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Major Defects and Remarks</label>
                                            <textarea
                                                value={item.remarks}
                                                onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                                                placeholder="Type Here..."
                                                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                rows={4}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                         {/* M.D. Sensitivity & Rejection in Time */}
                         <div className="border rounded-lg p-3 sm:p-4">
                             <div className="font-semibold text-gray-800 mb-2">M.D. Sensitivity & Rejection in Time</div>
                             {checklistItems.filter(i => i.id === 'md-sensitivity').map(item => (
                                 <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white mb-3 last:mb-0">
                                     <div className="flex items-center justify-between">
                                         <span className="text-sm sm:text-base font-medium text-gray-800">{item.label}</span>
                                         <div className="flex items-center gap-3 sm:gap-4">
                                             <button
                                                 type="button"
                                                 onClick={() => handleStatusChange(item.id, 'not-okay')}
                                                 className={`px-3 py-1 rounded border ${item.status === 'not-okay' ? 'bg-red-100 border-red-600 text-red-600' : 'border-red-400 text-red-500'}`}
                                             >
                                                 Not Okay
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={() => handleStatusChange(item.id, 'okay')}
                                                 className={`px-3 py-1 rounded border ${item.status === 'okay' ? 'bg-green-100 border-green-600 text-green-600' : 'border-green-400 text-green-500'}`}
                                             >
                                                 Okay
                                             </button>
                                         </div>
                                     </div>
                                     {item.status === 'not-okay' && (
                                         <div className="mt-4 pt-4 border-t border-gray-200">
                                             <label className="block text-sm font-medium text-gray-700 mb-2">Major Defects and Remarks</label>
                                             <textarea
                                                 value={item.remarks}
                                                 onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                                                 placeholder="Type Here..."
                                                 className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                 rows={4}
                                             />
                                         </div>
                                     )}
                                 </div>
                             ))}
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

export default OPRPAndCCPRecord;
