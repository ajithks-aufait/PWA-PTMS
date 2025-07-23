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
import { createOrFetchPlantTour } from "../Services/createOrFetchPlantTour";


export default function HomePage() {
  const { accounts, instance } = useMsal();
  const [employees, setEmployees] = useState<any[]>([]);
  const [tok, setTok] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfflineLoading, setIsOfflineLoading] = useState(false);
  const [isOfflineCompleted, setIsOfflineCompleted] = useState(false);
  const [isOfflineStarted, setIsOfflineStarted] = useState(false); // new state
  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const userState = useSelector((state: any) => state.user);
  const planTourState = useSelector((state: any) => state.planTour);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [isPlantTourLoading, setIsPlantTourLoading] = useState(false);

  const metrics = [
    { label: "5S", icon: <Clock className="text-orange-500" />, count: 0 },
    { label: "Performance", icon: <LineChart className="text-orange-500" />, count: 0 },
    { label: "Safety", icon: <Shield className="text-orange-500" />, count: 0 },
    { label: "Quality", icon: <ClipboardList className="text-orange-500" />, count: 0 },
    { label: "Wastage", icon: <Trash2 className="text-orange-500" />, count: 0 },
  ];

  const simulateApi = (delay: number) =>
    new Promise((resolve) => setTimeout(resolve, delay));

  const handleOfflineTour = async () => {
    setIsOfflineLoading(true);
    setProgress(0);
    setIsOfflineCompleted(false);

    try {
      const delays = [1000, 1200, 1500];
      for (let i = 0; i < delays.length; i++) {
        await simulateApi(delays[i]);
        setProgress(((i + 1) / delays.length) * 100);
      }
      setIsOfflineCompleted(true);
      document.documentElement.classList.add("dark");
      setIsOfflineStarted(true); // mark offline started
    } catch (err) {
      console.error("API error", err);
    } finally {
      setIsOfflineLoading(false);
    }
  };

  const handleCancelOffline = () => {
    setIsOfflineStarted(false);
    setIsOfflineCompleted(false);
    setProgress(0);
  };

  useEffect(() => {
    if (accounts.length > 0) {
      instance
        .acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        })
        .then((response) => {
          setTok(response.accessToken)
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
      const plantTourId = await createOrFetchPlantTour({
        accessToken: tok,
        departmentId: employee.departmentId,
        employeeName: employee.employeeName,
        roleName: employee.roleName,
        plantId: employee.plantId,
        userRoleID: employee.roleId,
      });
      if (plantTourId) {
        dispatch(setPlantTourId(plantTourId));
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to create or fetch plant tour ID", err);
    } finally {
      setIsPlantTourLoading(false);
    }
  };
  console.log(user.DVAccessToken,'user.DVAccessToken',tok);
  

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
                >
                  Plant Tour
                </button>
                <button
                  className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={handleOfflineTour}
                >
                  + Start Offline Mode
                </button>
              </>
            )}

            {isOfflineStarted && (
              <>
                <button
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  onClick={() => setIsModalOpen(true)}
                >
                  + Offline Plant Tour
                </button>
                <button
                  className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={handleCancelOffline}
                >
                  + Synch / Cancel Offline
                </button>
              </>
            )}
          </div>
        </div>
        {/* Metric Cards */}
        <div className="mb-6 overflow-x-auto hide-scrollbar">
          <div className="flex gap-4 min-w-max sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:min-w-full">
            {metrics.map((item, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-800 min-w-[200px] p-4 rounded-lg shadow flex flex-col items-center text-center"
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
