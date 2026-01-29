import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
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
import {
  AdminLoginPage,
  AdminDashboardPage,
  AdminQuestionsPage,
  AdminQuestionFormPage,
  AdminQuestionViewPage,
  AdminImportPage,
  AdminAuditPage,
  AdminUsersPage,
  AdminLayout,
  AdminProtectedRoute,
} from './pages/admin';

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

// Admin Routes Component
function AdminRoutes() {
  return (
    <Router>
      <Routes>
        {/* Admin Login - No layout */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Protected Routes with Layout */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="questions" element={<AdminQuestionsPage />} />
          <Route path="questions/new" element={<AdminQuestionFormPage />} />
          <Route path="questions/:id" element={<AdminQuestionViewPage />} />
          <Route path="questions/:id/edit" element={<AdminQuestionFormPage />} />
          <Route path="import" element={<AdminImportPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  // Check if we're on an admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <AdminAuthProvider>
        <AdminRoutes />
      </AdminAuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
