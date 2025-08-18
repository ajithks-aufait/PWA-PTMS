import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { addPendingSync, clearPendingSync } from '../store/sieveAndMagnetOldPlantSlice';

const TestComponent: React.FC = () => {
  const dispatch = useDispatch();
  const { pendingSync, completedCycles, isOffline, currentCycle } = useSelector((state: RootState) => state.sieveAndMagnetOldPlant);

  const addTestData = () => {
    const testData = {
      cycleNumber: currentCycle,
      checklistItems: [
        { id: 'test-1', label: 'Test Item 1', status: 'okay', remarks: '' },
        { id: 'test-2', label: 'Test Item 2', status: 'not-okay', remarks: 'Test defect' }
      ],
      formData: { product: 'Test Product', machineNo: 'TEST-001', line: 'Test Line', standardPercentage: '50' },
      remarks: 'Test remarks',
      timestamp: Date.now()
    };
    
    console.log('Adding test data:', testData);
    dispatch(addPendingSync(testData));
  };

  const clearTestData = () => {
    console.log('Clearing test data');
    dispatch(clearPendingSync());
  };

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
      <h3 className="font-bold text-yellow-800 mb-2">Test Component - Old Plant Sync</h3>
      <div className="text-sm text-yellow-700 space-y-2">
        <div>Current Cycle: {currentCycle}</div>
        <div>Is Offline: {isOffline ? 'Yes' : 'No'}</div>
        <div>Completed Cycles: {completedCycles.length}</div>
        <div>Pending Sync: {pendingSync.length}</div>
        <div>Pending Sync Details: {JSON.stringify(pendingSync, null, 2)}</div>
      </div>
      <div className="mt-4 space-x-2">
        <button 
          onClick={addTestData}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
        >
          Add Test Data
        </button>
        <button 
          onClick={clearTestData}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Clear Test Data
        </button>
      </div>
    </div>
  );
};

export default TestComponent;
