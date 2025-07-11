import './App.css'
import { Routes, Route } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import ProductQualityIndex from './components/ProductQualityIndex';
import DashboardLayout from './pages/HomePage';


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
        </Routes>
      </Router>
    </>
  )
}

export default App
