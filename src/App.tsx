import './App.css'
import { Routes, Route } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import ProductQualityIndex from './components/ProductQualityIndex';
import CreamPercentageIndex from './components/CreamPercentageIndex';
import SieveandMagnetoldplant from './components/SieveandMagnetoldplant';
import ProductMonitoringRecord from './components/ProductMonitoringRecord';
import DashboardLayout from './pages/HomePage';
import SieveandMagnetnewplant from './components/SieveandMagnetnewplant';
import ErrorBoundary from './components/ErrorBoundary';
import TestComponent from './components/TestComponent';


function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qualityplantour"
            element={
              <ProtectedRoute>
                <ProductQualityIndex />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creampercentage"
            element={
              <ProtectedRoute>
                <CreamPercentageIndex />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sieveandmagnetoldplant"
            element={
              <ProtectedRoute>
                <SieveandMagnetoldplant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test"
            element={<TestComponent />}
          />
          <Route
            path="/sieveandmagnetnewplant"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <div>
                    <h1>Test Route - SieveandMagnetnewplant</h1>
                    <SieveandMagnetnewplant />
                  </div>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sieveandmagnetnewplant-debug"
            element={
              <ErrorBoundary>
                <div>
                  <h1>Debug Route - SieveandMagnetnewplant (No Auth)</h1>
                  <SieveandMagnetnewplant />
                </div>
              </ErrorBoundary>
            }
          />
          <Route
            path="/productmonitoringrecord"
            element={
              <ProtectedRoute>
                <ProductMonitoringRecord />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </>
  )
}

export default App
