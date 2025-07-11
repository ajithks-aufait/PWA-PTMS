import React from "react";
import { useNavigate } from "react-router-dom";

interface PlantTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlantTourModal: React.FC<PlantTourModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.66)] z-50 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-6 w-[90%] max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Start Plant Tour</h2>
          <button
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Tour Select */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Tour</label>
          <select className="w-full border rounded px-3 py-2">
            <option>Product Quality Index</option>
            <option>Cream Percentage Index</option>
            <option>Sieves and magnets old plant</option>
            <option>Cream Percentage Index</option>
            <option>Cream Percentage Index</option>
          </select>
        </div>

        {/* Shift Select */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Select Shift</label>
          <select className="w-full border rounded px-3 py-2">
            <option>Shift 1</option>
            <option>Shift 2</option>
          </select>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              navigate('/qualityplantour')
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlantTourModal;
