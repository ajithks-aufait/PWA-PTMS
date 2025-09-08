import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store.ts';
import DashboardLayout from './DashboardLayout.tsx';
import { showOfflineSaveAlertForCategory } from '../utils/offlineAlerts.ts';
import { setFetchedCycles, selectFetchedCycles, addOfflineData } from '../store/ALCSlice';
import type { ALCCycleData } from '../Services/ALC';



const ALC: React.FC = () => {
    console.log('ALC component is rendering...');

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
    const fetchedCycles = useSelector(selectFetchedCycles) as unknown as ALCCycleData[];

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
        executiveName: '',
        lineNo: '',
        preRuning: '',
        runing: ''
    });

    // Session state
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<Set<string>>(new Set());
    const [startTime, setStartTime] = useState('');
    const [statusMap, setStatusMap] = useState<{ [key: string]: 'OK' | 'Not Okay' }>({});

    // Loading state for fetching data
    const [isLoadingCycles, setIsLoadingCycles] = useState(false);

    // Local cycle management
    const [currentCycle, setCurrentCycle] = useState(1);



    const handleStartSession = async () => {
        console.log('Starting code verification session with product:', selectedProduct, 'executive:', startFormData.executiveName);

        try {
            const { startSessionHandler } = await import('../Services/ALC');
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            await startSessionHandler(
                currentCycle,
                selectedProduct,
                startFormData.executiveName,
                currentTime,
                startFormData.lineNo,
                startFormData.preRuning,
                startFormData.runing
            );
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

        // Check if we have any checklist cards rendered for this cycle
        const cardsCount = document.querySelectorAll(`[id^="pr-${currentCycle}-"]`).length;
        const hasDataToSave = cardsCount > 0;
        if (!hasDataToSave) {
            alert('No data to save. Please enter at least one value.');
            return;
        }

        try {

            // Check if we're offline
            if (isOfflineStarted) {
                console.log('Processing in offline mode...');

                // Persist ALC values for later sync
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
                    localStorage.setItem(`alc-cycle-${currentCycle}-values`, JSON.stringify(sitValues));
                    console.log('Saved ALC values to localStorage for sync:', sitValues);
                } catch (e) {
                    console.warn('Failed to persist ALC values for offline sync', e);
                }

                // Build grouped offline data from DOM
                const makeItems = (cycleNum: number) => ([
                    { id: `pr-${cycleNum}-RMStore-1` },
                    { id: `pr-${cycleNum}-RMStore-2` },
                    { id: `pr-${cycleNum}-RMStore-3` },
                    { id: `pr-${cycleNum}-Flour&SugarHandling-1` },
                    { id: `pr-${cycleNum}-Flour&SugarHandling-2` },
                    { id: `pr-${cycleNum}-Flour&SugarHandling-3` },
                    { id: `pr-${cycleNum}-Flour&SugarHandling-4` },
                    { id: `pr-${cycleNum}-Flour&SugarHandling-5` },
                    { id: `pr-${cycleNum}-ChemicalHandlingArea-1` },
                    { id: `pr-${cycleNum}-ChemicalHandlingArea-2` },
                    { id: `pr-${cycleNum}-ChemicalHandlingArea-3` },
                    { id: `pr-${cycleNum}-ChemicalHandlingArea-4` },
                    { id: `pr-${cycleNum}-ChemicalHandlingArea-5` },
                    { id: `pr-${cycleNum}-ChemicalHandlingArea-6` },
                    { id: `pr-${cycleNum}-Mixing-1` },
                    { id: `pr-${cycleNum}-Mixing-2` },
                    { id: `pr-${cycleNum}-Mixing-3` },
                    { id: `pr-${cycleNum}-Mixing-4` },
                    { id: `pr-${cycleNum}-Mixing-5` },
                    { id: `pr-${cycleNum}-Mixing-6` },
                    { id: `pr-${cycleNum}-Mixing-7` },
                    { id: `pr-${cycleNum}-Mixing-8` },
                    { id: `pr-${cycleNum}-Mixing-9` },
                    { id: `pr-${cycleNum}-Mixing-10` },
                    { id: `pr-${cycleNum}-Mixing-11` },
                    { id: `pr-${cycleNum}-Mixing-12` },
                    { id: `pr-${cycleNum}-Mixing-13` },
                    { id: `pr-${cycleNum}-Mixing-14` },
                    { id: `pr-${cycleNum}-Oven-1` },
                    { id: `pr-${cycleNum}-Oven-2` },
                    { id: `pr-${cycleNum}-Oven-3` },
                    { id: `pr-${cycleNum}-PackingArea-1` },
                    { id: `pr-${cycleNum}-PackingArea-2` },
                    { id: `pr-${cycleNum}-PackingArea-3` },
                    { id: `pr-${cycleNum}-PackingArea-4` },
                    { id: `pr-${cycleNum}-PackingArea-5` },
                    { id: `pr-${cycleNum}-PackingArea-6` },
                    { id: `pr-${cycleNum}-PackingArea-7` },
                    { id: `pr-${cycleNum}-PackingArea-8` },
                    { id: `pr-${cycleNum}-PackingArea-9` },
                    { id: `pr-${cycleNum}-PackingArea-10` },
                    { id: `pr-${cycleNum}-PackingArea-11` },
                    { id: `pr-${cycleNum}-BiscuitGrinding-1` },
                    { id: `pr-${cycleNum}-BiscuitGrinding-2` },
                    { id: `pr-${cycleNum}-BiscuitGrinding-3` },
                    { id: `pr-${cycleNum}-BiscuitGrinding-4` },
                ]);

                const areaMap: Record<string, any[]> = {};
                for (const item of makeItems(currentCycle)) {
                    const card = document.getElementById(item.id);
                    if (!card) continue;
                    const selectedBadge = card.querySelector('.badge-fill') as HTMLElement | null;
                    const status = (selectedBadge?.innerText?.trim() || 'OK') as 'OK' | 'Not Okay';
                    const title = (card.querySelector('.bs-card-title') as HTMLElement | null)?.innerText || '';
                    const match = item.id.match(/-(\D+)-/);
                    const thenewarea = match ? match[1] : '';
                    const area = thenewarea.replace(/([a-z])([A-Z])|&/g, '$1 $2').replace(/&/g, ' & ');
                    let categoryValue: string | undefined;
                    let remarkValue: string | undefined;
                    if (status === 'Not Okay') {
                        const idcurrect = item.id.replace('pr-', '');
                        const safeId = (window as any).CSS?.escape ? (window as any).CSS.escape(`not-okay-remarks-${idcurrect}`) : `not-okay-remarks-${idcurrect}`;
                        const remarksInput = document.querySelector(`#${safeId}`) as HTMLTextAreaElement | null;
                        const selectedCategory = card.querySelector(`input[name="not-okay-${idcurrect}"]:checked`) as HTMLInputElement | null;
                        remarkValue = remarksInput?.value || 'No remarks';
                        categoryValue = selectedCategory?.value || '0';
                    }
                    if (!areaMap[area]) areaMap[area] = [];
                    areaMap[area].push({ criteria: title, status, category: categoryValue, remarks: remarkValue });
                }

                const groupedCycleData: any = {
                        cycleNum: currentCycle.toString(),
                        product: selectedProduct,
                        executiveName: startFormData.executiveName || 'N/A',
                    lineno: startFormData.lineNo || 'N/A',
                    previous: startFormData.preRuning || 'N/A',
                    running: startFormData.runing || 'N/A',
                    data: Object.entries(areaMap).map(([area, records]) => ({ area, records }))
                };

                // Store in Redux for count and completed view (replace if same cycle exists)
                try {
                    // offlineSavedData update
                    dispatch(addOfflineData({ cycleNo: currentCycle, records: [groupedCycleData], timestamp: Date.now() } as any));

                    // fetchedCycles replace or append
                    const existingList = (fetchedCycles as any[]) || [];
                    const idx = existingList.findIndex((c: any) => c.cycleNum?.toString() === currentCycle.toString());
                    const newList = [...existingList];
                    if (idx >= 0) {
                        newList[idx] = groupedCycleData;
                    } else {
                        newList.push(groupedCycleData);
                    }
                    dispatch(setFetchedCycles(newList as any));

                    // Auto-expand the just-saved cycle in completed list while offline
                    setExpandedCompletedCycles(prev => new Set([...Array.from(prev), currentCycle.toString()]));
                } catch (e) {
                    console.warn('Failed to update Redux fetchedCycles for ALC', e);
                    dispatch(setFetchedCycles([...(fetchedCycles as any), groupedCycleData] as any));
                }
                console.log('Offline grouped ALC data saved to Redux');
                
                showOfflineSaveAlertForCategory(currentCycle, 'Seal Integrity Test');

                // Build and cache API payload for later sync from grouped data (in case DOM is gone)
                try {
                    const { buildPayloadFromGroupedData } = await import('../Services/ALC');
                    const payload = buildPayloadFromGroupedData(groupedCycleData, plantTourId || 'N/A', user?.Name || 'Current User');
                    localStorage.setItem(`alc-payload-cycle-${currentCycle}`, JSON.stringify(payload));
                } catch (payloadErr) {
                    console.warn('Failed to prepare offline ALC payload for sync', payloadErr);
                }
            } else {
                console.log('Processing in online mode...');

                // Use the service to save data
                const { collectEstimationDataCycleSave, saveSectionApiCall } = await import('../Services/ALC');
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
                executiveName: '',
                lineNo: '',
                preRuning: '',
                runing: ''
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

        // Always refresh from backend when online; if offline, keep existing Redux data
        if (plantTourId) {
            const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
            if (online) {
                console.log('Refreshing ALC completed cycles from backend (online)...');
                fetchCycleDataFromAPI();
            } else if (fetchedCycles.length === 0) {
                console.log('Offline and no cycles in Redux; completed list will be empty until online.');
            }
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
            console.log('No completed cycles found for ALC. Starting from cycle 1');
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

            const { fetchCycleData } = await import('../Services/ALC');
            console.log('fetchCycleData function imported successfully');

            const fetchedData = await fetchCycleData(plantTourId);
            console.log('API Response - Fetched cycles from API:', fetchedData);
            console.log('API Response - Data type:', typeof fetchedData);
            console.log('API Response - Is array:', Array.isArray(fetchedData));

            // Ensure the data is properly typed
            const typedData = Array.isArray(fetchedData) ? (fetchedData as any) : [];
            dispatch(setFetchedCycles(typedData as any));

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
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">AREA LINE CLEARANCE OR CHANGEOVER CHECKLIST</h1>
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

                                {/* Completed Details - Only show when expanded */}
                                {expandedCompletedCycles.has(cycleData.cycleNum) && (
                                    <div className="space-y-4">
                                        {/* Header Strip */}
                                        <div className="rounded-lg p-3 sm:p-4 border border-blue-200 bg-blue-50">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div>
                                                    <div className="text-xs text-gray-600">Product</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{cycleData.product || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Executive Name</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{cycleData.executiveName || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Line No.</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).lineno || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Name Of The Previous Running Variety</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).previous || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-600">Name Of The Running Variety</div>
                                                    <div className="text-sm font-semibold text-gray-900 break-all">{(cycleData as any).running || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quality Tour Summary */}
                                        <div className="border rounded-lg">
                                            <div className="px-3 py-2 font-semibold bg-gray-50 border-b">Quality Tour Summary</div>
                                        <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                            <th className="border px-3 py-2 text-left text-sm">Sr. No.</th>
                                                            <th className="border px-3 py-2 text-left text-sm">Area</th>
                                                            <th className="border px-3 py-2 text-left text-sm">Description</th>
                                                            <th className="border px-3 py-2 text-left text-sm">Status</th>
                                                            <th className="border px-3 py-2 text-left text-sm">Compliance Score</th>
                                                            <th className="border px-3 py-2 text-left text-sm">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                        {Array.isArray((cycleData as any).data) && (cycleData as any).data.map((areaBlock: any, areaIdx: number) => {
                                                            const records = Array.isArray(areaBlock.records) ? areaBlock.records : [];
                                                            return records.map((rec: any, recIdx: number) => {
                                                                const status = rec.status || 'OK';
                                                                const compliance = status === 'OK' ? 2 : (rec.category !== undefined && rec.category !== null && rec.category !== '' ? parseInt(rec.category) : 0);
                                                                const remarks = rec.remarks || 'No remarks';
                                                                return (
                                                                    <tr key={`${areaBlock.area}-${recIdx}`}>
                                                                        {recIdx === 0 && (
                                                                            <td className="border px-3 py-2 align-top" rowSpan={records.length}>{areaIdx + 1}</td>
                                                                        )}
                                                                        {recIdx === 0 && (
                                                                            <td className="border px-3 py-2 align-top" rowSpan={records.length}>{areaBlock.area || 'N/A'}</td>
                                                                        )}
                                                                        <td className="border px-3 py-2">{rec.criteria || ''}</td>
                                                                        <td className="border px-3 py-2">{status}</td>
                                                                        <td className="border px-3 py-2">{compliance}</td>
                                                                        <td className="border px-3 py-2">{remarks}</td>
                                                    </tr>
                                                                );
                                                            });
                                                        })}
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

                            {/* Line No */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Line No</label>
                                <input
                                    type="text"
                                    value={startFormData.lineNo}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, lineNo: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter line number"
                                />
                            </div>

                            {/* Name Of The Previous Running Variety */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Name Of The Previous Running Variety</label>
                                <input
                                    type="text"
                                    value={startFormData.preRuning}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, preRuning: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter previous running variety"
                                />
                            </div>

                            {/* Name Of The Running Variety */}
                            <div className="sm:col-span-2">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Name Of The Running Variety</label>
                                <input
                                    type="text"
                                    value={startFormData.runing}
                                    onChange={(e) => setStartFormData(prev => ({ ...prev, runing: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter running variety"
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

                        {/* Checklist Sections */}
                        {(() => {
                            const sections: Array<{ title: string; key: string; items: string[] }> = [
                                { title: 'RM Store', key: 'RMStore', items: [
                                    'No scrap at RM storage area',
                                    'Floor Condition- To be cleaned',
                                    'Free from Infestations/Sign of infestation like crawling marks etc.'
                                ] },
                                { title: 'Flour & Sugar Handling', key: 'Flour&SugarHandling', items: [
                                    'Maida and Sugar handling area Cleanliness -Floor, wall, ceiling, railing, curving.',
                                    'Sieve Condition- free from damage and Cleanliness',
                                    'Magnet Position and cleanliness.',
                                    'Free from Infestations/Sign of infestation like crawling marks etc.',
                                    'No damage and loose thread in cotton bellows.'
                                ] },
                                { title: 'Chemical Handling Area', key: 'ChemicalHandlingArea', items: [
                                    'All utensils to be clean and free from damage.',
                                    'All sieve condition- Free from damage and cleanliness.',
                                    'All Magnets in place and to be clean.',
                                    'All ingredient trollies to be identified.',
                                    'All trollies to be clean and free from damage.',
                                    'Check for overall area cleanliness.'
                                ] },
                                { title: 'Mixing', key: 'Mixing', items: [
                                    'All gasket to be free from damage',
                                    'Floor condition - to be clean',
                                    'Free from scrap accumulation at mixing',
                                    'No loose nut, bolts, electrical cable on floor/equipment.',
                                    'No damage and loose thread in cotton bellows',
                                    'All utensils are clean and free from damage',
                                    'All catch trays are in place and clean',
                                    'No damage or loose threads in cotton conveyors',
                                    'All previous running variety which will not be used in next running variety should be transferred back to RM store',
                                    'All hoppers and sprinklers should be clean and free from extraneous material',
                                    'Dough trollies in use are properly cleaned',
                                    'Running variety should be displayed on board',
                                    'Mixer should be clean and free from any left over dough',
                                    'Rotary Moulder,Cross Over Conveyor and Feed rollers should be cleaned'
                                ] },
                                { title: 'Oven', key: 'Oven', items: [
                                    'Check for overall area cleanliness',
                                    'Remove all broken from Oven end',
                                    'All trollies used to be clean and free from damage'
                                ] },
                                { title: 'Packing Area', key: 'PackingArea', items: [
                                    'Check for overall area cleanliness',
                                    'Return back all previous laminate/Trays/CBB/Tins and get issued running variety with proper checking',
                                    'All catch trays are in place and clean',
                                    'All ingredient trollies to be identified.',
                                    'No old Biscuits are present in packing area including MD Rejection bin',
                                    'All crates and trollies are clean and free from damage',
                                    'No loose nut, bolts, electrical cable on floor/equipment',
                                    'Conveyor rollers should be cleaned',
                                    'No WIP/Previous variety material to be kept on shopfloor',
                                    'All Packing machines and its contact surfaces should be clean',
                                    'Proper arrangement of RC and identification on the same'
                                ] },
                                { title: 'Biscuit Grinding', key: 'BiscuitGrinding', items: [
                                    'Check for overall area cleanliness',
                                    'All sieve condition- Free from damage and cleanliness',
                                    'All Magnets are in place and to be clean',
                                    'All Trollies used are clean'
                                ] }
                            ];

                            const setStatus = (id: string, value: 'OK' | 'Not Okay') => {
                                setStatusMap(prev => ({ ...prev, [id]: value }));
                            };

                            return (
                                <div className="space-y-6">
                                    {sections.map(section => (
                                        <div key={section.key} className="border rounded-md">
                                            <div className="px-3 py-2 font-semibold bg-gray-50 border-b">{section.title}</div>
                                            <div className="p-3 space-y-3">
                                                {section.items.map((text, idx) => {
                                                    const rawId = `pr-${currentCycle}-${section.key}-${idx + 1}`;
                                                    const idcurrect = rawId.replace('pr-', '');
                                                    const current = statusMap[rawId] || '';
                                                    return (
                                                        <div key={rawId} id={rawId} className="border border-gray-200 rounded-md p-3">
                                                            <div className="bs-card-title text-sm text-gray-800 mb-2">{text}</div>
                                                            <div className="flex items-center gap-2 justify-end w-full">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStatus(rawId, 'Not Okay')}
                                                                    className={`flex items-center gap-2 px-4 py-1 text-xs rounded-full border transition ${current === 'Not Okay' ? 'bg-red-50 text-red-700 border-red-300' : 'text-red-600 border-red-300 hover:bg-red-50'}`}
                                                                >
                                                                    <span className={`w-3 h-3 rounded-full border ${current === 'Not Okay' ? 'bg-red-500 border-red-600' : 'border-red-400'}`}></span>
                                                                    Not Okay
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStatus(rawId, 'OK')}
                                                                    className={`flex items-center gap-2 px-4 py-1 text-xs rounded-full border transition ${current === 'OK' ? 'bg-green-50 text-green-700 border-green-300' : 'text-green-600 border-green-300 hover:bg-green-50'}`}
                                                                >
                                                                    <span className={`w-3 h-3 rounded-full border ${current === 'OK' ? 'bg-green-500 border-green-600' : 'border-green-400'}`}></span>
                                                                    Okay
                                                                </button>
                                                                <span className="badge-fill hidden">{current || 'OK'}</span>
                                                            </div>
                                                            {current === 'Not Okay' && (
                                                                <div className="mt-3 space-y-2">
                                                                    <div className="flex items-center gap-4 text-xs">
                                                                        <label className="flex items-center gap-1"><input type="radio" name={`not-okay-${idcurrect}`} value="0" />Category 0</label>
                                                                        <label className="flex items-center gap-1"><input type="radio" name={`not-okay-${idcurrect}`} value="1" />Category 1</label>
                            </div>
                                                                    <textarea id={`not-okay-remarks-${idcurrect}`} className="w-full border rounded px-3 py-2 text-sm" placeholder="Remarks..." rows={2} />
                            </div>
                                                            )}
                            </div>
                                                    );
                                                })}
                            </div>
                        </div>
                                    ))}
                                </div>
                            );
                        })()}

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

export default ALC;
