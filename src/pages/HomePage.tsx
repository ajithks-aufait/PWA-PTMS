import { useEffect, useState } from "react";
import {
  HomeIcon,
  CogIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";
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


export default function DashboardLayout() {
  const { accounts, instance } = useMsal();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfflineLoading, setIsOfflineLoading] = useState(false);
  const [isOfflineCompleted, setIsOfflineCompleted] = useState(false);
  const [isOfflineStarted, setIsOfflineStarted] = useState(false); // new state
  const [progress, setProgress] = useState(0);
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

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
          fetchEmployeeList(response.accessToken, user?.Name).then((res) => {
            setEmployees(res);
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

  return (
    <div className="flex flex-col sm:flex-row h-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "w-64" : "w-16"}
        sm:flex flex-col hidden fixed sm:static z-40 top-0 bottom-0`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b dark:border-gray-700">
          <span className={`font-bold ${!isSidebarOpen && "hidden"}`}>Menu</span>
          <button onClick={toggleSidebar}>
            {isSidebarOpen ? (
              <ArrowLeftIcon className="w-5 h-5" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          <li className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <HomeIcon className="w-5 h-5 text-blue-600" />
            {isSidebarOpen && <span className="ml-3">Home</span>}
          </li>
          <li className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <CogIcon className="w-5 h-5 text-blue-600" />
            {isSidebarOpen && (
              <button
                className="ml-3 text-left w-full"
                onClick={handleLogout}
              >
                Logout
              </button>
            )}
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col sm:ml-16">
        {/* Navbar */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center sm:px-6">
          <h1 className="text-lg sm:text-xl font-semibold">
            Plant Tour Management System
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{employees[0]?.departmentName}</p>
          <button className="sm:hidden" onClick={toggleSidebar}>
            {isSidebarOpen ? (
              <ArrowLeftIcon className="w-5 h-5" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )}
          </button>
        </nav>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative">
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
                    + Plant Tour
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
            <a href="#" className="text-orange-600 text-sm font-medium hover:underline">
              View All →
            </a>
          </div>
        </main>
      </div>

      {/* Modal */}
      <PlantTourModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

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
    </div>
  );
}
