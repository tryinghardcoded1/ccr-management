/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './store/authStore';
import Login from './pages/Login';
// We'll create these pages next
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Vehicles from './pages/Vehicles';
import Reservations from './pages/Reservations';
import ReservationDetail from './pages/ReservationDetail';
import Payments from './pages/Payments';
import ChargeManagement from './pages/ChargeManagement';
import Reports from './pages/Reports';
import Archive from './pages/Archive';
import SystemUsers from './pages/SystemUsers';
import KnowledgeBase from './pages/KnowledgeBase';
import Contracts from './pages/Contracts';
import EmailTemplate from './pages/EmailTemplate';

import NewReservationPage from './pages/NewReservationPage';
import CustomerVoicePortal from './pages/CustomerVoicePortal';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-widest">Loading Access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="reservations/new" element={<NewReservationPage />} />
          <Route path="reservations/:id" element={<ReservationDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="charges" element={<ChargeManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<SystemUsers />} />
          <Route path="archive" element={<Archive />} />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="email-template" element={<EmailTemplate />} />
        </Route>
        <Route path="/portal" element={<CustomerVoicePortal />} />
      </Routes>
    </BrowserRouter>
  );
}
