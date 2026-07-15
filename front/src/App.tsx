import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { PreWorkshopPage } from './pages/PreWorkshopPage';
import { WaitlistOfferPage } from './pages/WaitlistOfferPage';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
    mutations: { retry: 0 },
  },
});

const ProtectedRoute = ({ children, isPreWorkshop }: { children: ReactNode; isPreWorkshop?: boolean }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (isAuthenticated) {
    return <>{children}</>;
  }
  const redirectPath = isPreWorkshop ? '/pre-workshop/login' : '/login';
  return <Navigate to={redirectPath} replace state={{ from: location }} />;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && user?.admin ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/pre-workshop/login" element={<LoginPage />} />
          <Route path="/pre-workshop/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RegistrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pre-workshop"
            element={
              <ProtectedRoute isPreWorkshop>
                <PreWorkshopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/waitlist/pay"
            element={
              <ProtectedRoute>
                <WaitlistOfferPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <RegistrationPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
