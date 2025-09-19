import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Customers from '../pages/Customers';
import CashTill from '../pages/CashTill';
import Features from '../pages/Features';
import Staff from '../pages/StaffManagement';
import RegisterWizard from "../pages/RegisterWizard";

import Transactions from '../pages/Transactions';
import ProtectedRoute from '../components/ProtectedRoute';
import NavBar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import Account from "../pages/Account";
import Suppliers from "../pages/Suppliers";
import Discounts from "../pages/Discounts";
import Reports from "../pages/Reports";
import InventoryStock from "../pages/InventoryStock";
import InventoryProducts from "../pages/InventoryProducts";
import InventoryMeasurements from "../pages/InventoryMeasurements";
import InventoryCategories from "../pages/InventoryCategories";

const Shell: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="min-h-screen flex" style={{ background: "#f8fafc" }}>
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <NavBar />
      <main className="p-4 md:p-6">{children}</main>
    </div>
  </div>
);


export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              <Navigate to="/cash-till" replace />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Shell>
              <Customers />
            </Shell>
          </ProtectedRoute>
        }
      />



   <Route path="/inventory/stock" element={<ProtectedRoute><Shell><InventoryStock/></Shell></ProtectedRoute>} />
  <Route path="/inventory/products" element={<ProtectedRoute><Shell><InventoryProducts/></Shell></ProtectedRoute>} />
  <Route path="/inventory/measurements" element={<ProtectedRoute><Shell><InventoryMeasurements/></Shell></ProtectedRoute>} />
  <Route path="/inventory/categories" element={<ProtectedRoute><Shell><InventoryCategories/></Shell></ProtectedRoute>} />
<Route
  path="/account"
  element={
    <ProtectedRoute>
      <Shell>
        <Account />
      </Shell>
    </ProtectedRoute>
  }
/>
    <Route path="/register" element={<RegisterWizard />} />

<Route
  path="/staff"
  element={
    <ProtectedRoute>
      <Shell>
        <Staff />
      </Shell>
    </ProtectedRoute>
  }
/>
      <Route
        path="/cash-till"
        element={
          <ProtectedRoute>
            <Shell>
              <CashTill />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/features"
        element={
          <ProtectedRoute>
            <Shell>
              <Features />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Shell>
              <Transactions />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discounts"
        element={
          <ProtectedRoute>
            <Shell>
              <Discounts />
            </Shell>
          </ProtectedRoute>
        }
      />
<Route
  path="/suppliers"
  element={
    <ProtectedRoute>
      <Shell>
        <Suppliers />
      </Shell>
    </ProtectedRoute>
  }
  />
  <Route
    path="/reports"
    element={
      <ProtectedRoute>
        <Shell>
          <Reports />
        </Shell>
      </ProtectedRoute>
    }
  />
      <Route path="*" element={<Navigate to="/cash-till" replace />} />
    </Routes>
  );
};
