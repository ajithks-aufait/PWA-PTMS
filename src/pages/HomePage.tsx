import { useEffect, useState } from "react";
import {
  Clock,
  LineChart,
  Shield,
  ClipboardList,
  Trash2,
} from "lucide-react";
import PlantTourModal from "../components/PlantTourModal";
import { loginRequest } from "../auth/authConfig";
import { useMsal } from "@azure/msal-react";
import { fetchEmployeeList } from "../Services/getEmployeeDetails";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../components/DashboardLayout";
import { setPlantTourId, setEmployeeDetails } from "../store/planTourSlice";
import { setOfflineStarted, setOfflineCompleted, setProgress, resetOfflineState, clearOfflineSubmissions } from "../store/stateSlice.ts";
import { createOrFetchPlantTour } from "../Services/createOrFetchPlantTour";
import { getAccessToken } from "../Services/getAccessToken";
import { saveSectionData } from "../Services/saveSectionData";
import { useNavigate } from "react-router-dom";


export default function HomePage() {
  const { accounts, instance } = useMsal();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfflineLoading, setIsOfflineLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineError, setShowOfflineError] = useState(false);
  const dispatch = useDispatch();
  
  // Get offline state from Redux
  const isOfflineStarted = useSelector((state: any) => state.appState.isOfflineStarted);
  const isOfflineCompleted = useSelector((state: any) => state.appState.isOfflineCompleted);
  const progress = useSelector((state: any) => state.appState.progress);
  const offlineSubmissions = useSelector((state: any) => state.appState.offlineSubmissions);
  const user = useSelector((state: any) => state.user.user);
  const userState = useSelector((state: any) => state.user);
  const planTourState = useSelector((state: any) => state.planTour);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [isPlantTourLoading, setIsPlantTourLoading] = useState(false);
  const navigate = useNavigate();

  const metrics = [
    { label: "5S", icon: <Clock className="text-orange-500" />, count: 0 },
    { label: "Performance", icon: <LineChart className="text-orange-500" />, count: 0 },
    { label: "Safety", icon: <Shield className="text-orange-500" />, count: 0 },
    { label: "Quality", icon: <ClipboardList className="text-orange-500" />, count: 0 },
    { label: "Wastage", icon: <Trash2 className="text-orange-500" />, count: 0 },
  ];


  const handleOfflineTour = async () => {
    // Check if internet is available
    if (!isOnline) {
      setShowOfflineError(true);
      // Hide error message after 5 seconds
      setTimeout(() => setShowOfflineError(false), 5000);
      return;
    }

    setIsOfflineLoading(true);
    dispatch(setProgress(0));
    dispatch(setOfflineCompleted(false));

    try {
      console.log('Starting offline mode setup...');
      
      // Step 1: Get access token first
      const tokenResult = await getAccessToken();
      if (!tokenResult || !tokenResult.token) {
        throw new Error('No access token available');
      }
      console.log('Token generated successfully');

      dispatch(setProgress(20));

      // Step 2: Fetch employee list and store in Redux
      console.log('Fetching employee list...');
      const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
      const employeeList = await fetchEmployeeList(response.accessToken, user?.Name || '');
      if (employeeList && employeeList.length > 0) {
        dispatch(setEmployeeDetails(employeeList[0]));
        console.log('Employee details stored in Redux:', employeeList[0]);
      } else {
        throw new Error('No employee details found');
      }

      dispatch(setProgress(40));

      // Step 3: Create or fetch Plant Tour ID using employee data
      console.log('Creating/fetching Plant Tour ID...');
      const employeeDetails = employeeList[0];
      const plantTourId = await createOrFetchPlantTour({
        accessToken: tokenResult.token,
        departmentId: employeeDetails.departmentId || '135',
        employeeName: employeeDetails.employeeName || user?.Name || '',
        roleName: employeeDetails.roleName || 'QA',
        plantId: employeeDetails.plantId || '1',
        userRoleID: employeeDetails.roleId || '1',
      });

      if (plantTourId) {
        dispatch(setPlantTourId(plantTourId));
        console.log('Plant Tour ID created and stored in Redux:', plantTourId);
      } else {
        throw new Error('Failed to generate Plant Tour ID');
      }

      dispatch(setProgress(60));

      // Step 4: Mark as offline mode
      dispatch(setOfflineCompleted(true));
      dispatch(setOfflineStarted(true));

      dispatch(setProgress(100));
      console.log('Offline mode activated successfully');

    } catch (err) {
      console.error("Error starting offline mode:", err);
      alert('Failed to start offline mode. Please check your connection and try again.');
    } finally {
      setIsOfflineLoading(false);
    }
  };

  const handleCancelOffline = async () => {
    console.log('Attempting to sync/cancel offline mode...');
    
    // Check if internet is available
    if (!isOnline) {
      console.log('No internet connection available for syncing');
      alert('⚠️ Internet connection required to sync offline data. Please check your connection and try again.');
      return;
    }
    
    // Sync offline submissions if any exist
    if (offlineSubmissions.length > 0) {
      console.log('Syncing offline submissions before canceling...');
      try {
        const tokenResult = await getAccessToken();
        const accessToken = tokenResult?.token;
        if (accessToken) {
          for (const submission of offlineSubmissions) {
            await saveSectionData(accessToken, submission.records);
            console.log(`Synced submission for cycle ${submission.cycleNo}`);
          }
          console.log('All offline submissions synced successfully');
          alert('✅ Offline data synced successfully!');
        } else {
          throw new Error('No access token available');
        }
      } catch (error) {
        console.error('Error syncing offline submissions:', error);
        alert('❌ Error syncing offline data. Please check your connection and try again.');
        return;
      }
    } else {
      console.log('No offline submissions to sync');
    }
    
    // Reset all offline-related state using Redux actions
    dispatch(setOfflineStarted(false));
    dispatch(setOfflineCompleted(false));
    dispatch(setProgress(0));
    dispatch(clearOfflineSubmissions());
    setShowOfflineError(false);
    
    // Clear any offline data from localStorage
    try {
      localStorage.removeItem('offlineData');
      localStorage.removeItem('offlineSubmissions');
      console.log('Offline data cleared from localStorage');
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
    
    // Reset Plant Tour ID to allow fresh start
    dispatch(setPlantTourId(''));
    
    console.log('Offline mode canceled, normal plant tour is now available');
  };

  useEffect(() => {
    if (accounts.length > 0) {
      instance
        .acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        })
        .then((response) => {
          fetchEmployeeList(response.accessToken, user?.Name).then((res) => {
            setEmployees(res);
            if (res && res.length > 0) {
              dispatch(setEmployeeDetails(res[0]));
            }
          });
        })
        .catch((error) => {
          console.error("Token acquisition failed", error);
        });
    }
  }, [accounts, instance, user?.Name]);

  const handleLogout = () => {
    instance.logoutPopup();
  };

  function pad(num: number): string {
    return num.toString().padStart(2, "0");
  }

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Internet Connected:', new Date().toISOString());
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('❌ Internet Disconnected:', new Date().toISOString());
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    startTimer();
  }, []);

  function startTimer(): void {
    const timerElement = document.getElementById("timer");

    if (!timerElement) {
      console.error("Timer element not found!");
      return;
    }

    setInterval(() => {
      const now = new Date();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());

      timerElement.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
  }

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  console.log(isOfflineCompleted);

  // Add handler for starting plant tour
  const handleStartPlantTour = async () => {
    console.log('handleStartPlantTour called');
    const employee = planTourState.employeeDetails;
    const selectedTour = planTourState.selectedTour;
    const selectedShift = planTourState.selectedCycle;
    if (!employee || !user || !selectedTour || !selectedShift) return;
    setIsPlantTourLoading(true);
    try {
      const tokenResult = await getAccessToken();
      const accessToken = tokenResult?.token;
      if (!accessToken) throw new Error('No access token available');
      const plantTourId = await createOrFetchPlantTour({
        accessToken,
        departmentId: employee.departmentId,
        employeeName: employee.employeeName,
        roleName: employee.roleName,
        plantId: employee.plantId,
        userRoleID: employee.roleId,
      });
      if (plantTourId) {
        dispatch(setPlantTourId(plantTourId));
        setIsModalOpen(false);
        navigate("/qualityplantour");
      }
    } catch (err) {
      console.error("Failed to create or fetch plant tour ID", err);
    } finally {
      setIsPlantTourLoading(false);
    }
  };
  console.log(user.DVAccessToken,'user.DVAccessToken');
  

  return (
    <DashboardLayout rightContent={<p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{employees[0]?.departmentName}</p>} onLogout={handleLogout}>
      <div>
        {/* Content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-medium">Hello, {user?.Name}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              <span id="timer"></span> {formattedDate}
            </p>
          </div>
          {/* Buttons Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {!isOfflineStarted && (
                <>
                  <button
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    onClick={() => setIsModalOpen(true)}
                    disabled={isPlantTourLoading}
                  >
                    Plant Tour
                  </button>
                  <button
                    className={`w-full sm:w-auto px-4 py-2 rounded-md ${
                      isOnline 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600' 
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                    onClick={handleOfflineTour}
                    disabled={!isOnline}
                    title={!isOnline ? 'Internet connection required to start offline mode' : 'Start offline mode'}
                  >
                    + Start Offline Mode
                  </button>
                  {showOfflineError && (
                    <div className="w-full sm:w-auto text-xs text-red-600 mt-1">
                      ⚠️ Internet connection required to start offline mode
                    </div>
                  )}
                </>
              )}
              {isOfflineStarted && (
                <>
                 <button
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    onClick={() => navigate("/qualityplantour")}
                  >
                    + Offline Plant Tour
                  </button>
                  <button
                    className={`w-full sm:w-auto px-4 py-2 rounded-md ${
                      isOnline 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600' 
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                    onClick={handleCancelOffline}
                    disabled={!isOnline}
                    title={!isOnline ? 'Internet connection required to sync offline data' : 'Sync and cancel offline mode'}
                  >
                    + Sync & Cancel Offline {offlineSubmissions.length > 0 && `(${offlineSubmissions.length})`}
                    {!isOnline && <span className="ml-1 text-xs">(Internet Required)</span>}
                  </button>
                  {offlineSubmissions.length > 0 && !isOnline && (
                    <div className="w-full sm:w-auto text-xs text-orange-600 mt-1">
                      ⚠️ {offlineSubmissions.length} offline submission(s) waiting for internet connection
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
        {/* Metric Cards */}
        <div className="mb-6 overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-0">
            {metrics.map((item, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-800 min-w-[180px] p-4 rounded-lg shadow flex flex-col items-center text-center"
              >
                <div className="bg-orange-100 dark:bg-orange-200 p-2 rounded-full mb-2">
                  {item.icon}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300">{item.label}</p>
                <p className="text-xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <a href="#" className="text-orange-600 text-sm font-medium hover:underline" onClick={e => { e.preventDefault(); setIsViewAllOpen(true); }}>
            View All →
          </a>
          {planTourState.plantTourId && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs font-mono">
              <strong>Plan Tour ID:</strong> {planTourState.plantTourId}
            </div>
          )}
        </div>
        {/* Modal and Progress Bar logic ... */}
        {/* Modal */}
        <PlantTourModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onDone={handleStartPlantTour} isLoading={isPlantTourLoading} />
        {/* Progress Bar */}
        {isOfflineLoading && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-1/3 sm:right-1/3 z-50 bg-white dark:bg-gray-800 border shadow-lg rounded-md px-4 py-2">
            <p className="text-sm mb-1">Syncing data...</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        {/* View All Modal */}
        {isViewAllOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => setIsViewAllOpen(false)}>
                ✕
              </button>
              <h2 className="text-lg font-semibold mb-4">All Redux Data</h2>
              <div className="overflow-auto max-h-[60vh] text-xs">
                <strong>User State:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 mb-2">{JSON.stringify(userState, null, 2)}</pre>
                <strong>Plan Tour State:</strong>
                <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2">{JSON.stringify(planTourState, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
