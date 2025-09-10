import './App.css'
import { Routes, Route } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import ProductQualityIndex from './components/ProductQualityIndex';
import CreamPercentageIndex from './components/CreamPercentageIndex';
import SieveandMagnetoldplant from './components/SieveandMagnetoldplant';
import ProductMonitoringRecord from './components/ProductMonitoringRecord';
import NetWeightMonitoringRecord from './components/NetWeightMonitoringRecord';
import CodeVerificationRecord from './components/CodeVerification';
import OPRPAndCCPRecord from './components/OPRPAndCCPRecord';
import SealIntegrityTest from './components/SealIntegrityTest';
import ALC from './components/ALC';
import BakingProcessRecord from './components/BakingProcessRecord';
import PlantTourSection from './components/PlantTourSection';
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
            path="/debug"
            element={
              <div className="p-4">
                <h1>Debug Page</h1>
                <p>Current URL: {window.location.href}</p>
                <p>Pathname: {window.location.pathname}</p>
                <a href="/" className="text-blue-600 underline">Go to Login Page</a>
                <br />
                <a href="/home" className="text-blue-600 underline">Go to Home Page</a>
              </div>
            }
          />
          <Route
            path="/sieveandmagnetnewplant"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <SieveandMagnetnewplant />
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
          <Route
            path="/netweightmonitoringrecord"
            element={
              <ProtectedRoute>
                <NetWeightMonitoringRecord />
              </ProtectedRoute>
            }
          />
          <Route
            path="/codeverificationrecord"
            element={
              <ProtectedRoute>
                <CodeVerificationRecord />
              </ProtectedRoute>
            }
          />
          <Route
            path="/oprpandccprecord"
            element={
              <ProtectedRoute>
                <OPRPAndCCPRecord />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bakingprocessrecord"
            element={
              <ProtectedRoute>
                <BakingProcessRecord />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sealintegritytest"
            element={
              <ProtectedRoute>
                <SealIntegrityTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alc"
            element={
              <ProtectedRoute>
                <ALC />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plant-tour-section"
            element={
              <ProtectedRoute>
                <PlantTourSection />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </>
  )
}

export default App
