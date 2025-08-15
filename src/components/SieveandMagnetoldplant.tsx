import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';

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

interface CompletedCycleData {
    cycleNumber: number;
    checklistItems: ChecklistItem[];
    formData: FormData;
    remarks: string;
}

const SieveandMagnetoldplant: React.FC = () => {
    const navigate = useNavigate();
    const { plantTourId, selectedCycle } = useSelector((state: RootState) => state.planTour);

    // Form state for start section
    const [formData, setFormData] = useState<FormData>({
        product: 'Speciality Sauces',
        machineNo: '',
        line: '',
        standardPercentage: ''
    });

    // Session state
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isCycleCompleted, setIsCycleCompleted] = useState(false);
    const [isCycleExpanded, setIsCycleExpanded] = useState(false);
    const [currentCycle, setCurrentCycle] = useState(1);
    const [completedCycles, setCompletedCycles] = useState<CompletedCycleData[]>([]);
    const [expandedCompletedCycles, setExpandedCompletedCycles] = useState<Set<number>>(new Set());
    const [generalRemarks, setGeneralRemarks] = useState('');

    // Checklist items state
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

    const handleSave = () => {
        console.log('Saving checklist data for cycle:', currentCycle, checklistItems);
        // TODO: Implement save functionality
        
        // Add current cycle data to completed cycles
        const completedCycleData: CompletedCycleData = {
            cycleNumber: currentCycle,
            checklistItems: [...checklistItems],
            formData: { ...formData },
            remarks: generalRemarks
        };
        setCompletedCycles(prev => [...prev, completedCycleData]);
        
        // Move to next cycle
        setCurrentCycle(prev => prev + 1);
        
        // Reset checklist items for next cycle
        setChecklistItems(prev => prev.map(item => ({ ...item, status: null, remarks: '' })));
        
        // Reset session started state to show start form for next cycle
        setIsSessionStarted(false);
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

    // Get defects and okays for summary
    const getDefects = () => {
        return checklistItems.filter(item => item.status === 'not-okay');
    };

    const getOkays = () => {
        return checklistItems.filter(item => item.status === 'okay');
    };

    const formattedDate = new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    // Ensure completion screen starts in collapsed state
    useEffect(() => {
        if (isCycleCompleted) {
            setIsCycleExpanded(false);
        }
    }, [isCycleCompleted]);

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
                            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Sieve and Magnet Old Plant</h1>
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
                                                {cycleData.checklistItems.filter(item => item.status === 'not-okay').length > 0 ? (
                                                    <div className="bg-white">
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-300">
                                                            <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Title</div>
                                                            <div className="px-4 py-3 text-sm font-medium text-gray-700">Remarks</div>
                                                        </div>
                                                        {/* Table Rows */}
                                                        {cycleData.checklistItems.filter(item => item.status === 'not-okay').map((item) => (
                                                            <div key={item.id} className="grid grid-cols-2 border-b border-gray-300 last:border-b-0">
                                                                <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">{item.label}</div>
                                                                <div className="px-4 py-3 text-sm text-gray-700">{item.remarks || '-'}</div>
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
                                                        {cycleData.checklistItems.filter(item => item.status === 'okay').length > 0 ? (
                                                            <div className="space-y-2">
                                                                {cycleData.checklistItems.filter(item => item.status === 'okay').map((item) => (
                                                                    <div key={item.id} className="text-sm text-gray-700">
                                                                        • {item.label}
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
                                                        {cycleData.checklistItems.filter(item => item.status === 'not-okay').length > 0 ? (
                                                            <div className="space-y-2">
                                                                {cycleData.checklistItems.filter(item => item.status === 'not-okay').map((item) => (
                                                                    <div key={item.id} className="text-sm text-gray-700">
                                                                        {item.label}
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
                                <option value="Speciality Sauces">Speciality Sauces</option>
                                <option value="Zesty Wasabi">Zesty Wasabi</option>
                                <option value="Product 3">Product 3</option>
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
                     <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle + 1}</h2>
                 </div>
            </DashboardLayout>
        );
    }

    // If cycle is completed, show the completion screen with summary
    if (isCycleCompleted) {
        const defects = getDefects();
        const okays = getOkays();
        
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
                        <div className="text-gray-500 cursor-pointer self-end sm:self-auto">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </div>
                    </div>
                </div>

                                 {/* Completed Cycle Summary */}
                 <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                     {/* Cycle Header with Dropdown Icon */}
                     <div className="flex items-center justify-between mb-4 sm:mb-6">
                         <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle - 1}</h2>
                         <svg
                             className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 cursor-pointer transition-transform ${isCycleExpanded ? 'rotate-180' : ''}`}
                             fill="none"
                             stroke="currentColor"
                             viewBox="0 0 24 24"
                             onClick={() => setIsCycleExpanded(!isCycleExpanded)}
                         >
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                         </svg>
                     </div>

                                         {/* Expandable Content */}
                     {isCycleExpanded && (
                         <div className="space-y-4">
                             {/* Product Info */}
                             <div className="mb-4 sm:mb-6">
                                 <div className="text-sm text-gray-600 mb-2">Selected Product:</div>
                                 <div className="text-base font-medium text-gray-800">{formData.product}</div>
                             </div>
                             
                             {/* Defects Section with Table */}
                             <div className="flex gap-4">
                                 <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
                                     <div className="px-4 py-3">
                                         <h3 className="text-lg font-bold text-red-600">Defects</h3>
                                     </div>
                                     {defects.length > 0 ? (
                                         <div className="bg-white">
                                             {/* Table Header */}
                                             <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-300">
                                                 <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Title</div>
                                                 <div className="px-4 py-3 text-sm font-medium text-gray-700">Remarks</div>
                                             </div>
                                             {/* Table Rows */}
                                             {defects.map((item) => (
                                                 <div key={item.id} className="grid grid-cols-2 border-b border-gray-300 last:border-b-0">
                                                     <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">{item.label}</div>
                                                     <div className="px-4 py-3 text-sm text-gray-700">{item.remarks || '-'}</div>
                                                 </div>
                                             ))}
                                         </div>
                                     ) : (
                                         <div className="px-4 py-3 text-sm text-gray-500">No defects found</div>
                                     )}
                                 </div>
                                 
                                 {/* Remarks Section */}
                                 <div className="w-1/3 border border-gray-300 rounded-lg">
                                     <div className="px-4 py-3 bg-gray-50 border-b border-gray-300">
                                         <h3 className="text-lg font-bold text-gray-700">Remarks</h3>
                                     </div>
                                     <div className="p-4">
                                         <textarea 
                                             className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                             placeholder="Add general remarks about defects..."
                                             value={generalRemarks}
                                             onChange={(e) => setGeneralRemarks(e.target.value)}
                                         />
                                     </div>
                                 </div>
                             </div>

                             {/* Bottom Section - Okays and Defects Summary */}
                             <div className="border border-gray-300 rounded-lg overflow-hidden">
                                 <div className="grid grid-cols-2 divide-x divide-gray-300">
                                     {/* Left Sub-section - Okays */}
                                     <div className="p-4">
                                         <h3 className="text-lg font-bold text-green-800 mb-3">Okays</h3>
                                         {okays.length > 0 ? (
                                             <div className="space-y-2">
                                                 {okays.map((item) => (
                                                     <div key={item.id} className="text-sm text-gray-700">
                                                         • {item.label}
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
                                         {defects.length > 0 ? (
                                             <div className="space-y-2">
                                                 {defects.map((item) => (
                                                     <div key={item.id} className="text-sm text-gray-700">
                                                         {item.label}
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
                     )}
                 </div>

                 {/* Disabled Next Cycle Preview */}
                 <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full mt-4 sm:mt-6 opacity-50">
                     <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle + 1}</h2>
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
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Sieve and Magnet Old Plant</h1>
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
                                            {cycleData.checklistItems.filter(item => item.status === 'not-okay').length > 0 ? (
                                                <div className="bg-white">
                                                    {/* Table Header */}
                                                    <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-300">
                                                        <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Title</div>
                                                        <div className="px-4 py-3 text-sm font-medium text-gray-700">Remarks</div>
                                                    </div>
                                                    {/* Table Rows */}
                                                    {cycleData.checklistItems.filter(item => item.status === 'not-okay').map((item) => (
                                                        <div key={item.id} className="grid grid-cols-2 border-b border-gray-300 last:border-b-0">
                                                            <div className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300">{item.label}</div>
                                                            <div className="px-4 py-3 text-sm text-gray-700">{item.remarks || '-'}</div>
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
                                                    {cycleData.checklistItems.filter(item => item.status === 'okay').length > 0 ? (
                                                        <div className="space-y-2">
                                                            {cycleData.checklistItems.filter(item => item.status === 'okay').map((item) => (
                                                                <div key={item.id} className="text-sm text-gray-700">
                                                                    • {item.label}
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
                                                    {cycleData.checklistItems.filter(item => item.status === 'not-okay').length > 0 ? (
                                                        <div className="space-y-2">
                                                            {cycleData.checklistItems.filter(item => item.status === 'not-okay').map((item) => (
                                                                <div key={item.id} className="text-sm text-gray-700">
                                                                    {item.label}
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
                    <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {currentCycle}</h2>
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
