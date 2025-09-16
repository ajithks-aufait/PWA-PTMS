import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { 
  clearOfflineData, 
  selectOfflineDataCount, 
  selectOfflineFilesCount,
  setSyncing,
  clearCycleImages
} from '../store/BakingProcessSlice';
import { syncOfflineFiles, uploadCycleImages } from '../Services/BakingProcesRecord';

interface OfflineSyncManagerProps {
  className?: string;
}

const OfflineSyncManager: React.FC<OfflineSyncManagerProps> = ({ className = "" }) => {
  const dispatch = useDispatch();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const offlineDataCount = useSelector(selectOfflineDataCount);
  const offlineFilesCount = useSelector(selectOfflineFilesCount);
  const isReduxSyncing = useSelector((state: RootState) => state.bakingProcess.isSyncing);

  const hasOfflineData = offlineDataCount > 0 || offlineFilesCount > 0;

  const handleSync = async () => {
    if (isSyncing || isReduxSyncing) return;

    try {
      setIsSyncing(true);
      setSyncMessage(null);

      // Sync offline files first
      if (offlineFilesCount > 0) {
        setSyncMessage('Syncing offline images...');
        const syncResult = await syncOfflineFiles();
        
        if (!syncResult.success) {
          setSyncMessage(`Sync failed: ${syncResult.message}`);
          return;
        }
      }

      // Clear offline data after successful sync
      dispatch(clearOfflineData());
      setSyncMessage('All offline data synced successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel all offline data? This action cannot be undone.')) {
      dispatch(clearOfflineData());
      setSyncMessage('Offline data cancelled successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncMessage(null);
      }, 3000);
    }
  };

  const handleSyncCycle = async (cycleNum: number) => {
    if (isSyncing || isReduxSyncing) return;

    try {
      setIsSyncing(true);
      setSyncMessage(`Syncing images for Cycle ${cycleNum}...`);

      const result = await uploadCycleImages(cycleNum);
      
      if (result.success) {
        setSyncMessage(`Cycle ${cycleNum} images synced successfully!`);
      } else {
        setSyncMessage(`Cycle ${cycleNum} sync failed: ${result.message}`);
      }
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Cycle sync error:', error);
      setSyncMessage(`Cycle ${cycleNum} sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!hasOfflineData) {
    return null;
  }

  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-sm font-medium text-orange-800">Offline Data Pending</h3>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-orange-600">
          <span>{offlineDataCount} data record{offlineDataCount !== 1 ? 's' : ''}</span>
          {offlineDataCount > 0 && offlineFilesCount > 0 && <span>•</span>}
          <span>{offlineFilesCount} image{offlineFilesCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {syncMessage && (
        <div className={`mb-3 p-2 rounded text-sm ${
          syncMessage.includes('success') 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {syncMessage}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleSync}
          disabled={isSyncing || isReduxSyncing}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing || isReduxSyncing ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync Now</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleCancel}
          disabled={isSyncing || isReduxSyncing}
          className="px-3 py-2 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 text-xs text-orange-600">
        <p>• Click "Sync Now" to upload all offline data to the server</p>
        <p>• Click "Cancel" to discard all offline data</p>
        <p>• Ensure you have a stable internet connection before syncing</p>
      </div>
    </div>
  );
};

export default OfflineSyncManager;
