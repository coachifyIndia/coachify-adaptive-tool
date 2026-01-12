import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AnalyticsTestingPage from './pages/dashboard/AnalyticsTestingPage';
import SessionPage from './pages/practice/SessionPage';
import PracticeModulesPage from './pages/practice/PracticeModulesPage';
import AdaptiveDrillPage from './pages/practice/AdaptiveDrillPage';
import AdaptiveDrillSummaryPage from './pages/practice/AdaptiveDrillSummaryPage';
import QuestionExplorerPage from './pages/practice/QuestionExplorerPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/practice-questions" 
            element={
              <ProtectedRoute>
                <PracticeModulesPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/practice" 
            element={
              <ProtectedRoute>
                <AdaptiveDrillPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/practice/session/:sessionId" 
            element={
              <ProtectedRoute>
                <SessionPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/practice/drill/:sessionId/summary" 
            element={
              <ProtectedRoute>
                <AdaptiveDrillSummaryPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/explore" 
            element={
              <ProtectedRoute>
                <QuestionExplorerPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/analytics-testing" 
            element={
              <ProtectedRoute>
                <AnalyticsTestingPage />
              </ProtectedRoute>
            } 
          />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
