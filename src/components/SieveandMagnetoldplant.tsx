import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import { saveSieveAndMagnetOldPlant, collectEstimationDataCycleSave, fetchCycleData } from '../Services/saveSieveAndMagnetOldPlant';
import {
    setCompletedCycles,
    addCompletedCycle,
    addPendingSync,
    setLastFetchTimestamp,
    setIsOffline,
    setCurrentCycle,
} from '../store/sieveAndMagnetOldPlantSlice';

interface ChecklistItem {
    id: string;
    label: string;
    status: 'okay' | 'not-okay' | null;
    remarks: string;
}

interface FormData {
    product: string;
    machineNo: string;
    line: string;
    standardPercentage: string;
}

// Redux state interface for completed cycles
interface ReduxCompletedCycleData {
    cycleNumber: number;
    defects: { title: string; remarks: string }[];
    okays: string[];
    formData: {
        product: string;
        machineNo: string;
        line: string;
        standardPercentage: string;
    };
    remarks: string;
}

const SieveandMagnetoldplant: React.FC = () => {
    console.log('SieveandMagnetoldplant component is rendering...');

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { plantTourId, selectedCycle } = useSelector((state: RootState) => state.planTour);
    const { user } = useSelector((state: RootState) => state.user);
    const {
        completedCycles,
        pendingSync,
        lastFetchTimestamp,
        isOffline,
        currentCycle: reduxCurrentCycle
    } = useSelector((state: RootState) => state.sieveAndMagnetOldPlant);

    console.log('Redux state loaded successfully:', {
        plantTourId,
        selectedCycle,
        user: user?.Name,
        completedCycles: completedCycles.length,
        pendingSync: pendingSync.length,
        isOffline,
        reduxCurrentCycle
    });

    // Form state for start section
    const [formData, setFormData] = useState<FormData>({
        product: '',
        machineNo: '',
        line: '',
        standardPercentage: ''
    });

    // Session state
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<Set<number>>(new Set());
    const [generalRemarks, setGeneralRemarks] = useState('');

    // Checklist items state - Old Plant structure (37 items)
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
        { id: 'sugar-sifter-1', label: 'Sugar Sifter 1', status: null, remarks: '' },
        { id: 'sugar-sifter-2', label: 'Sugar Sifter 2', status: null, remarks: '' },
        { id: 'sugar-grinder-mesh-line-1', label: 'Sugar Grinder Mesh - Line 1', status: null, remarks: '' },
        { id: 'sugar-grinder-mesh-line-2', label: 'Sugar Grinder Mesh - Line 2', status: null, remarks: '' },
        { id: 'sugar-grinder-mesh-line-3', label: 'Sugar Grinder Mesh - Line 3', status: null, remarks: '' },
        { id: 'sugar-grinder-mesh-line-4', label: 'Sugar Grinder Mesh - Line 4', status: null, remarks: '' },
        { id: 'maida-sifter-sieve-line-1', label: 'Maida Sifter Sieve - Line 1', status: null, remarks: '' },
        { id: 'maida-sifter-sieve-line-2', label: 'Maida Sifter Sieve - Line 2', status: null, remarks: '' },
        { id: 'maida-sifter-sieve-line-3', label: 'Maida Sifter Sieve - Line 3', status: null, remarks: '' },
        { id: 'maida-sifter-sieve-line-4', label: 'Maida Sifter Sieve - Line 4', status: null, remarks: '' },
        { id: 'sugar-mesh-rotary-line-1', label: 'Sugar Mesh at Rotary Line-1', status: null, remarks: '' },
        { id: 'biscuits-dust-1', label: 'Biscuits Dust 1', status: null, remarks: '' },
        { id: 'biscuits-dust-2', label: 'Biscuits Dust 2', status: null, remarks: '' },
        { id: 'chemical-sifter-1', label: 'Chemical Sifter 1', status: null, remarks: '' },
        { id: 'chemical-sifter-3', label: 'Chemical Sifter 3', status: null, remarks: '' },
        { id: 'chemical-sifter-5', label: 'Chemical Sifter 5', status: null, remarks: '' },
        { id: 'atta-shifter', label: 'Atta Shifter', status: null, remarks: '' },
        { id: 'maida-seive-sampling', label: 'Maida Seive for Sampling', status: null, remarks: '' },
        { id: 'invert-syrup-bucket-filter', label: 'Invert Syrup - Bucket Filter (Every Batch Change)', status: null, remarks: '' },
        { id: 'palm-oil-olein', label: 'Palm Oil/ Olein (Checked when Oil filled in Silo tank)', status: null, remarks: '' },
        { id: 'dh-room-humidity', label: 'DH Room Humidity Cookies/Cracker', status: null, remarks: '' },
        { id: 'packing-humidity-temp-line-1', label: 'Packing Humidity & Temp Line-1', status: null, remarks: '' },
        { id: 'packing-humidity-temp-line-2', label: 'Packing Humidity & Temp Line-2', status: null, remarks: '' },
        { id: 'packing-humidity-temp-line-3', label: 'Packing Humidity & Temp Line-3', status: null, remarks: '' },
        { id: 'packing-humidity-temp-line-4', label: 'Packing Humidity & Temp Line-4', status: null, remarks: '' },
        { id: 'packing-humidity-temp-line-5', label: 'Packing Humidity & Temp Line-5', status: null, remarks: '' },
        { id: 'cold-room-1-temp', label: 'Cold Room 1 Temperature', status: null, remarks: '' },
        { id: 'cold-room-2-temp', label: 'Cold Room 2 Temperature', status: null, remarks: '' },
        { id: 'cold-room-3-temp', label: 'Cold Room 3 Temperature', status: null, remarks: '' },
        { id: 'deep-freezer-yeast', label: 'Deep Freezer for Yeast', status: null, remarks: '' },
        { id: 'maida-hopper-magnet-line-1', label: 'Maida Hopper Magnet Line-1', status: null, remarks: '' },
        { id: 'maida-hopper-magnet-line-2', label: 'Maida Hopper Magnet Line-2', status: null, remarks: '' },
        { id: 'maida-hopper-magnet-line-3', label: 'Maida Hopper Magnet Line-3', status: null, remarks: '' },
        { id: 'maida-hopper-magnet-line-4', label: 'Maida Hopper Magnet Line-4', status: null, remarks: '' },
        { id: 'sugar-grinder-magnet', label: 'Sugar Grinder Magnet', status: null, remarks: '' },
        { id: 'biscuit-dust-magnet-1', label: 'Biscuit Dust Magnet 1', status: null, remarks: '' },
        { id: 'biscuit-dust-magnet-2', label: 'Biscuit Dust Magnet 2', status: null, remarks: '' }
    ]);


    const [isExpanded, setIsExpanded] = useState(true);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleStartSession = () => {
        console.log('Starting sieve and magnet session with data:', formData);
        setIsSessionStarted(true);
    };


    const handleStatusChange = (itemId: string, status: 'okay' | 'not-okay') => {
        setChecklistItems(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, status } : item
            )
        );
    };

    const handleRemarksChange = (itemId: string, remarks: string) => {
        setChecklistItems(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, remarks } : item
            )
        );
    };

    const handleSave = async () => {
        console.log('=== HANDLE SAVE STARTED ===');
        console.log('Saving checklist data for cycle:', reduxCurrentCycle, checklistItems);
        console.log('Current offline status:', isOffline);

        // Check if we have any data to save
        const hasDataToSave = checklistItems.some(item => item.status !== null);
        if (!hasDataToSave) {
            alert('No data to save. Please select at least one checklist item.');
            return;
        }

        try {
            // Process data locally first (for both online and offline modes)
            const defects: { title: string; remarks: string }[] = [];
            const okays: string[] = [];

            checklistItems.forEach((item) => {
                if (item.status === 'okay') {
                    okays.push(item.label);
                } else if (item.status === 'not-okay') {
                    defects.push({
                        title: item.label,
                        remarks: item.remarks || 'No remarks'
                    });
                }
            });

            // Add to completed cycles for display (both online and offline)
            const completedCycleData: ReduxCompletedCycleData = {
                cycleNumber: reduxCurrentCycle,
                defects: defects,
                okays: okays,
                formData: { ...formData },
                remarks: generalRemarks
            };
            dispatch(addCompletedCycle(completedCycleData));

            // Check if we're offline
            if (isOffline) {
                console.log('Processing in offline mode...');

                // Store data for offline sync - only store the essential data needed for sync
                const pendingData = {
                    cycleNumber: reduxCurrentCycle,
                    checklistItems: [...checklistItems],
                    formData: { ...formData },
                    remarks: generalRemarks,
                    timestamp: Date.now()
                };
                dispatch(addPendingSync(pendingData));

                console.log('Data saved offline. Will sync when connection is restored.');
                alert('Data saved offline. Will sync when connection is restored.');
            } else {
                console.log('Processing in online mode...');

                // Online mode - collect data for API
                const { savedData } = collectEstimationDataCycleSave(
                    reduxCurrentCycle,
                    checklistItems,
                    plantTourId || 'N/A',
                    selectedCycle || 'Shift 1',
                    user?.Name || 'Current User'
                );

                // Call the API to save data
                const response = await saveSieveAndMagnetOldPlant(savedData);

                if (response.success) {
                    console.log('Data saved successfully to API:', response);
                    alert(response.message);
                } else {
                    console.error('Failed to save data to API:', response.message);
                    // If API fails, switch to offline mode
                    const pendingData = {
                        cycleNumber: reduxCurrentCycle,
                        checklistItems: [...checklistItems],
                        formData: { ...formData },
                        remarks: generalRemarks,
                        timestamp: Date.now()
                    };
                    dispatch(addPendingSync(pendingData));
                    dispatch(setIsOffline(true));
                    alert('Network error. Data saved offline. Will sync when connection is restored.');
                }
            }

            // Move to next cycle (both online and offline)
            dispatch(setCurrentCycle(reduxCurrentCycle + 1));

            // Reset checklist items for next cycle
            setChecklistItems(prev => prev.map(item => ({ ...item, status: null, remarks: '' })));

            // Reset session started state to show start form for next cycle
            setIsSessionStarted(false);

            // Reset general remarks
            setGeneralRemarks('');

        } catch (error) {
            console.error('Error saving data:', error);

            // If any error occurs, save offline
            const defects: { title: string; remarks: string }[] = [];
            const okays: string[] = [];

            checklistItems.forEach((item) => {
                if (item.status === 'okay') {
                    okays.push(item.label);
                } else if (item.status === 'not-okay') {
                    defects.push({
                        title: item.label,
                        remarks: item.remarks || 'No remarks'
                    });
                }
            });

            // Store data for offline sync with proper structure
            const pendingData = {
                cycleNumber: reduxCurrentCycle,
                checklistItems: [...checklistItems],
                formData: { ...formData },
                remarks: generalRemarks,
                timestamp: Date.now()
            };
            dispatch(addPendingSync(pendingData));
            dispatch(setIsOffline(true));

            // Add to completed cycles for display
            const completedCycleData: ReduxCompletedCycleData = {
                cycleNumber: reduxCurrentCycle,
                defects: defects,
                okays: okays,
                formData: { ...formData },
                remarks: generalRemarks
            };
            dispatch(addCompletedCycle(completedCycleData));

            // Move to next cycle
            dispatch(setCurrentCycle(reduxCurrentCycle + 1));

            // Reset checklist items for next cycle
            setChecklistItems(prev => prev.map(item => ({ ...item, status: null, remarks: '' })));

            // Reset session started state to show start form for next cycle
            setIsSessionStarted(false);

            // Reset general remarks
            setGeneralRemarks('');

            alert('Network error. Data saved offline. Will sync when connection is restored.');
        }
    };

    const toggleCompletedCycleExpansion = (cycleNum: number) => {
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



    const formattedDate = new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    // Fetch existing cycle data when component mounts
    useEffect(() => {
        const loadExistingData = async () => {
            console.log('=== LOADING EXISTING DATA ===');
            console.log('Plant Tour ID:', plantTourId);
            console.log('Last fetch timestamp:', lastFetchTimestamp);

            if (plantTourId) {
                try {
                    console.log('Fetching existing cycle data from server...');
                    const existingCycles = await fetchCycleData(plantTourId);
                    console.log('Fetched existing cycles:', existingCycles);

                    if (existingCycles.length > 0) {
                        // Convert fetched data to ReduxCompletedCycleData format
                        const completedCyclesData: ReduxCompletedCycleData[] = existingCycles.map((cycle: any) => ({
                            cycleNumber: cycle.cycleNum,
                            defects: cycle.defects,
                            okays: cycle.okays,
                            formData: { product: '', machineNo: '', line: '', standardPercentage: '' }, // Default form data
                            remarks: ''
                        }));

                        console.log('Converted completed cycles data:', completedCyclesData);

                        dispatch(setCompletedCycles(completedCyclesData));
                        dispatch(setLastFetchTimestamp(Date.now()));

                        // Set current cycle to the next cycle number
                        const maxCycle = Math.max(...existingCycles.map((cycle: any) => cycle.cycleNum));
                        dispatch(setCurrentCycle(maxCycle + 1));

                        console.log('Successfully loaded existing cycles. Max cycle:', maxCycle, 'Next cycle:', maxCycle + 1);
                    } else {
                        console.log('No existing cycles found on server.');
                    }
                } catch (error) {
                    console.error('Error loading existing cycle data:', error);
                    console.log('Setting offline mode due to fetch failure.');
                    // If fetch fails, we're offline
                    dispatch(setIsOffline(true));
                }
            } else {
                console.log('No plant tour ID available for fetching existing data.');
            }
        };

        // Only fetch if we don't have data or if it's been more than 5 minutes
        const shouldFetch = !lastFetchTimestamp || (Date.now() - lastFetchTimestamp > 5 * 60 * 1000);
        console.log('Should fetch existing data:', shouldFetch);

        if (shouldFetch) {
            loadExistingData();
        } else {
            console.log('Skipping fetch - data is recent enough.');
        }
    }, [plantTourId, dispatch, lastFetchTimestamp]);

    // Debug effect to log Redux state changes
    useEffect(() => {
        console.log('=== REDUX STATE UPDATE ===');
        console.log('Current cycle:', reduxCurrentCycle);
        console.log('Completed cycles:', completedCycles.length);
        console.log('Pending sync:', pendingSync.length);
        console.log('Is offline:', isOffline);
        console.log('Last fetch timestamp:', lastFetchTimestamp);
    }, [reduxCurrentCycle, completedCycles.length, pendingSync.length, isOffline, lastFetchTimestamp]);



    // If session is not started, show the initial form
    if (!isSessionStarted) {
        return (
            <DashboardLayout>
                {/* Header Section */}
                <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 border-b border-gray-200 w-full">
                    <div className="flex items-center justify-between gap-2">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
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

                {/* Sieve and Magnet Old Plant Header */}
                <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Critical Points(CP) Verification & Monitoring Record (Sieve, Magnet, Rh and Temperature) Old Plant
                            </h1>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="bg-gray-200 rounded-full px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">{selectedCycle || 'Shift 1'}</span>
                                </div>
                                <span className="text-xs sm:text-sm text-gray-600">{formattedDate}</span>
                            </div>
                        </div>
                        <div className="text-gray-500 cursor-pointer">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Completed Cycles Display */}
                {completedCycles.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {completedCycles.map((cycleData) => (
                            <div key={cycleData.cycleNumber} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {cycleData.cycleNumber}</h2>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <svg
                                            className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer transition-transform ${expandedCompletedCycles.has(cycleData.cycleNumber) ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            onClick={() => toggleCompletedCycleExpansion(cycleData.cycleNumber)}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expandable Content for Completed Cycle */}
                                {expandedCompletedCycles.has(cycleData.cycleNumber) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="space-y-4">
                                            {/* Product Info */}
                                            <div className="mb-4 sm:mb-6">
                                                <div className="text-sm text-gray-600 mb-2">Selected Product:</div>
                                                <div className="text-base font-medium text-gray-800">{cycleData.formData.product}</div>
                                            </div>

                                            {/* Defects Section with Table */}
                                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-4 py-3">
                                                    <h3 className="text-lg font-bold text-red-600">Defects</h3>
                                                </div>
                                                {cycleData.defects && cycleData.defects.length > 0 ? (
                                                    <div className="bg-white">
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-300">
                                                            <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Title</div>
                                                            <div className="px-4 py-3 text-sm font-medium text-gray-700">Remarks</div>
                                                        </div>
                                                        {/* Table Rows - Show fetched defects */}
                                                        {cycleData.defects.map((defect, index) => (
                                                            <div key={`defect-${index}`} className="grid grid-cols-2 border-b border-gray-300 last:border-b-0">
                                                                <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">{defect.title}</div>
                                                                <div className="px-4 py-3 text-sm text-gray-700">{defect.remarks || '-'}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-gray-500">No defects found</div>
                                                )}
                                            </div>

                                            {/* Bottom Section - Okays and Defects Summary */}
                                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-2 divide-x divide-gray-300">
                                                    {/* Left Sub-section - Okays */}
                                                    <div className="p-4">
                                                        <h3 className="text-lg font-bold text-green-800 mb-3">Okays</h3>
                                                        {cycleData.okays && cycleData.okays.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {cycleData.okays.map((okay, index) => (
                                                                    <div key={`okay-${index}`} className="text-sm text-gray-700">
                                                                        • {okay}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-gray-700">None</div>
                                                        )}
                                                    </div>

                                                    {/* Right Sub-section - Defects */}
                                                    <div className="p-4">
                                                        <h3 className="text-lg font-bold text-gray-800 mb-3">Defects</h3>
                                                        {cycleData.defects && cycleData.defects.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {cycleData.defects.map((defect, index) => (
                                                                    <div key={`defect-summary-${index}`} className="text-sm text-gray-700">
                                                                        {defect.title}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-gray-700">None</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Content - Cycle Section */}
                <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">Cycle {reduxCurrentCycle}</h2>

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
                    <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {reduxCurrentCycle + 1}</h2>
                </div>
            </DashboardLayout>
        );
    }


    // Session started - show the checklist
    return (
        <DashboardLayout>
            {/* Header Section */}
            <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 border-b border-gray-200 w-full">
                <div className="flex items-center justify-between gap-2">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
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

            {/* Sieve and Magnet Old Plant Header */}
            <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Critical Points(CP) Verification & Monitoring Record (Sieve, Magnet, Rh and Temperature) Old Plant</h1>
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

            {/* Completed Cycles Display */}
            {completedCycles.length > 0 && (
                <div className="space-y-4 mb-6">
                    {completedCycles.map((cycleData) => (
                        <div key={cycleData.cycleNumber} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {cycleData.cycleNumber}</h2>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <svg
                                        className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer transition-transform ${expandedCompletedCycles.has(cycleData.cycleNumber) ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        onClick={() => toggleCompletedCycleExpansion(cycleData.cycleNumber)}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Expandable Content for Completed Cycle */}
                            {expandedCompletedCycles.has(cycleData.cycleNumber) && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="space-y-4">
                                        {/* Product Info */}
                                        <div className="mb-4 sm:mb-6">
                                            <div className="text-sm text-gray-600 mb-2">Selected Product:</div>
                                            <div className="text-base font-medium text-gray-800">{cycleData.formData.product}</div>
                                        </div>

                                        {/* Defects Section with Table */}
                                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                                            <div className="px-4 py-3">
                                                <h3 className="text-lg font-bold text-red-600">Defects</h3>
                                            </div>
                                            {cycleData.defects && cycleData.defects.length > 0 ? (
                                                <div className="bg-white">
                                                    {/* Table Header */}
                                                    <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-300">
                                                        <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Title</div>
                                                        <div className="px-4 py-3 text-sm font-medium text-gray-700">Remarks</div>
                                                    </div>
                                                    {/* Table Rows */}
                                                    {cycleData.defects.map((defect, index) => (
                                                        <div key={`defect-${index}`} className="grid grid-cols-2 border-b border-gray-300 last:border-b-0">
                                                            <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">{defect.title}</div>
                                                            <div className="px-4 py-3 text-sm text-gray-700">{defect.remarks || '-'}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500">No defects found</div>
                                            )}
                                        </div>

                                        {/* Bottom Section - Okays and Defects Summary */}
                                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                                            <div className="grid grid-cols-2 divide-x divide-gray-300">
                                                {/* Left Sub-section - Okays */}
                                                <div className="p-4">
                                                    <h3 className="text-lg font-bold text-green-800 mb-3">Okays</h3>
                                                    {cycleData.okays && cycleData.okays.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {cycleData.okays.map((okay, index) => (
                                                                <div key={`okay-${index}`} className="text-sm text-gray-700">
                                                                    • {okay}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-700">None</div>
                                                    )}
                                                </div>

                                                {/* Right Sub-section - Defects */}
                                                <div className="p-4">
                                                    <h3 className="text-lg font-bold text-gray-800 mb-3">Defects</h3>
                                                    {cycleData.defects && cycleData.defects.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {cycleData.defects.map((defect, index) => (
                                                                <div key={`defect-summary-${index}`} className="text-sm text-gray-700">
                                                                    {defect.title}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-700">None</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Main Content - Checklist Section */}
            <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                {/* Cycle Header with Dropdown Icon */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {reduxCurrentCycle}</h2>
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

                {/* Checklist Items */}
                {isExpanded && (
                    <div className="space-y-3 sm:space-y-4">
                        {checklistItems.map((item) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm sm:text-base font-medium text-gray-800">{item.label}</span>
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        {/* Not Okay Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleStatusChange(item.id, 'not-okay')}
                                            className={`px-3 py-1 rounded border ${item.status === 'not-okay'
                                                ? "bg-red-100 border-red-600 text-red-600"
                                                : "border-red-400 text-red-500"
                                                }`}
                                        >
                                            Not Okay
                                        </button>

                                        {/* Okay Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleStatusChange(item.id, 'okay')}
                                            className={`px-3 py-1 rounded border ${item.status === 'okay'
                                                ? "bg-green-100 border-green-600 text-green-600"
                                                : "border-green-400 text-green-500"
                                                }`}
                                        >
                                            Okay
                                        </button>
                                    </div>
                                </div>

                                {/* Major Defects and Remarks Section - Shows when Not Okay is selected */}
                                {item.status === 'not-okay' && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Major Defects and Remarks
                                        </label>
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
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 sm:mt-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-sm sm:text-base transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium text-sm sm:text-base transition-colors"
                    >
                        Save Checklist
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SieveandMagnetoldplant;
