import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';

interface MeasurementData {
    operating: string;
    centre: string;
    nonOperating: string;
}

interface FormData {
    dryWeightOvenEnd: MeasurementData;
    dimension: MeasurementData;
    gauge: MeasurementData;
    moisture: {
        operating: string;
    };
}

const ProductMonitoringRecord: React.FC = () => {
    const navigate = useNavigate();
    const { plantTourId, selectedCycle } = useSelector((state: RootState) => state.planTour);

    // Form state
    const [formData, setFormData] = useState<FormData>({
        dryWeightOvenEnd: { operating: '', centre: '', nonOperating: '' },
        dimension: { operating: '', centre: '', nonOperating: '' },
        gauge: { operating: '', centre: '', nonOperating: '' },
        moisture: { operating: '' }
    });

    // Session state
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isCycleCompleted, setIsCycleCompleted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('Speciality Sauces');
    const [currentCycle, setCurrentCycle] = useState(1);
    const [completedCycles, setCompletedCycles] = useState<FormData[]>([]);

    const handleInputChange = (category: keyof FormData, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    };

    const handleStartSession = () => {
        console.log('Starting product monitoring session with product:', selectedProduct);
        setIsSessionStarted(true);
        setIsExpanded(true);
    };

    const handleSave = () => {
        console.log('Saving product monitoring data for cycle:', currentCycle, formData);
        // TODO: Implement save functionality
        
        // Add current cycle data to completed cycles
        setCompletedCycles(prev => [...prev, formData]);
        
        // Move to next cycle
        setCurrentCycle(prev => prev + 1);
        
        // Reset form data for next cycle
        setFormData({
            dryWeightOvenEnd: { operating: '', centre: '', nonOperating: '' },
            dimension: { operating: '', centre: '', nonOperating: '' },
            gauge: { operating: '', centre: '', nonOperating: '' },
            moisture: { operating: '' }
        });
        
        // Reset session started state to show start form for next cycle
        setIsSessionStarted(false);
    };

    const formattedDate = new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

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

            {/* Product Monitoring Record Header */}
            <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Product Monitoring Record</h1>
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
                    {completedCycles.map((cycleData, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6 w-full">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h2 className="text-base sm:text-lg font-bold text-gray-800">Cycle {index + 1}</h2>
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            
                            {/* Summary Section */}
                            <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                                <h3 className="text-sm sm:text-base font-bold text-red-600 mb-3">Summary</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Dry Weight Oven End</th>
                                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Dimension</th>
                                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Gauges</th>
                                                <th className="border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700">Moisture %</th>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Operating</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Operating</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Operating</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Operating</th>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Centre</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Centre</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Centre</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600"></th>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Non Operating</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Non Operating</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600">Non Operating</th>
                                                <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.dryWeightOvenEnd.operating || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.dimension.operating || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.gauge.operating || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.moisture.operating || 'null'}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.dryWeightOvenEnd.centre || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.dimension.centre || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.gauge.centre || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700"></td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.dryWeightOvenEnd.nonOperating || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.dimension.nonOperating || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700">{cycleData.gauge.nonOperating || 'null'}</td>
                                                <td className="border border-gray-300 px-2 py-2 text-xs text-gray-700"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Content - Current Cycle Section */}
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
                )}

                {/* Form Content - Save Section */}
                {isSessionStarted && (
                    <div className="space-y-4">
                        {/* Dry Weight Oven End */}
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3">Dry Weight Oven End</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.dryWeightOvenEnd.operating}
                                        onChange={(e) => handleInputChange('dryWeightOvenEnd', 'operating', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Centre</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.dryWeightOvenEnd.centre}
                                        onChange={(e) => handleInputChange('dryWeightOvenEnd', 'centre', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Non-Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.dryWeightOvenEnd.nonOperating}
                                        onChange={(e) => handleInputChange('dryWeightOvenEnd', 'nonOperating', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dimension */}
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3">Dimension</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.dimension.operating}
                                        onChange={(e) => handleInputChange('dimension', 'operating', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Centre</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.dimension.centre}
                                        onChange={(e) => handleInputChange('dimension', 'centre', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Non-Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.dimension.nonOperating}
                                        onChange={(e) => handleInputChange('dimension', 'nonOperating', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gauge */}
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3">Gauge</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.gauge.operating}
                                        onChange={(e) => handleInputChange('gauge', 'operating', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Centre</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.gauge.centre}
                                        onChange={(e) => handleInputChange('gauge', 'centre', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Non-Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.gauge.nonOperating}
                                        onChange={(e) => handleInputChange('gauge', 'nonOperating', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Moisture */}
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3">Moisture</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Operating</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter value"
                                        value={formData.moisture.operating}
                                        onChange={(e) => handleInputChange('moisture', 'operating', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {isSessionStarted && (
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
                            Save Session
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ProductMonitoringRecord;
