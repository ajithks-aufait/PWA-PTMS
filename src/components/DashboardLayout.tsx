import React, { useState } from "react";
import {
  HomeIcon,
  CogIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowRightOnRectangleIcon, // logout icon
} from "@heroicons/react/24/solid";

interface DashboardLayoutProps {
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  onLogout?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, rightContent, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

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
        <ul className="mt-4 space-y-2 flex-1">
          <li className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <HomeIcon className="w-5 h-5 text-blue-600" />
            {isSidebarOpen && <span className="ml-3">Home</span>}
          </li>
          <li className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <CogIcon className="w-5 h-5 text-blue-600" />
            {isSidebarOpen && <span className="ml-3">Settings</span>}
          </li>
        </ul>
        {/* Logout Button at Bottom */}
        <button
          className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700 mt-auto"
          onClick={onLogout}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          {isSidebarOpen && <span className="ml-3">Logout</span>}
        </button>
      </aside>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center sm:px-6">
          <h1 className="text-lg sm:text-xl font-semibold">
            Plant Tour Management System
          </h1>
          {rightContent || <div></div>}
          <button className="sm:hidden" onClick={toggleSidebar}>
            {isSidebarOpen ? (
              <ArrowLeftIcon className="w-5 h-5" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )}
          </button>
        </nav>
        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 