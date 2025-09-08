import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { setSelectedTour, setSelectedCycle } from "../store/planTourSlice";

interface PlantTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone?: (selectedTour: string, selectedShift: string) => void;
  isLoading?: boolean;
}

const PlantTourModal: React.FC<PlantTourModalProps> = ({ isOpen, onClose, onDone, isLoading }) => {
  const [selectedTour, setSelectedTourLocal] = useState("Product Quality Index");
  const [selectedShift, setSelectedShiftLocal] = useState("Shift 1");
  const dispatch = useDispatch();
  if (!isOpen) return null;

  const handleDone = () => {
    console.log('PlantTourModal handleDone called with:', { selectedTour, selectedShift });
    dispatch(setSelectedTour(selectedTour));
    dispatch(setSelectedCycle(selectedShift));
    console.log('Redux state updated, calling onDone callback');
    if (onDone) onDone(selectedTour, selectedShift);
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.66)] z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-6 w-[90%] max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Start Plant Tour</h2>
          <button
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            onClick={onClose}
            disabled={isLoading}
          >
            &times;
          </button>
        </div>

        {/* Tour Select */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Tour</label>
          <select className="w-full border rounded px-3 py-2" value={selectedTour} onChange={e => setSelectedTourLocal(e.target.value)} disabled={isLoading}>
            <option>Product Quality Index</option>
            <option>Cream Percentage Index</option>
            <option>Sieves and magnets old plant</option>
            <option>Sieves and magnets new plant</option>
            <option>Product Monitoring Record</option>
            <option>Net Weight Monitoring Record</option>
            <option>Code Verification Record</option>
            <option>OPRP and CCP Record</option>
            <option>Baking Process Record</option>
            <option>Seal Integrity Test</option>
            <option>ALC</option>
          </select>
        </div>

        {/* Shift Select */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Select Shift</label>
          <select className="w-full border rounded px-3 py-2" value={selectedShift} onChange={e => setSelectedShiftLocal(e.target.value)} disabled={isLoading}>
            <option>Shift 1</option>
            <option>Shift 2</option>
          </select>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center mb-4">
            <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-blue-600 text-sm">Generating Plan Tour ID...</span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleDone}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlantTourModal;
