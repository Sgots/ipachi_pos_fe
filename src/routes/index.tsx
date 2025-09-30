// src/AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Customers from "../pages/Customers";
import CashTill from "../pages/CashTill";
import Staff from "../pages/StaffManagement";
import RegisterWizard from "../pages/RegisterWizard";
import Transactions from "../pages/Transactions";
import ProtectedRoute from "../components/ProtectedRoute";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import Account from "../pages/Account";
import Suppliers from "../pages/Suppliers";
import Discounts from "../pages/Discounts";
import Reports from "../pages/Reports";
import InventoryStock from "../pages/InventoryStock";
import InventoryProducts from "../pages/InventoryProducts";
import InventoryMeasurements from "../pages/InventoryMeasurements";
import InventoryCategories from "../pages/InventoryCategories";
import RestockHistory from "../components/RestockHistory";
import SubscriptionCodes from "../pages/SubscriptionCodes";
import ActivateSubscription from "../pages/ActivateSubscription";
import { SubscriptionGuard } from "../components/SubscriptionGuard";

import { AdminOnlyGuard } from "../components/AdminOnlyGuard";

// ...existing imports...

const Shell: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div className="min-h-screen flex" style={{ background: "#f8fafc" }}>
        {/* Sidebar renders null for username=admin, so we can keep this */}
        <Sidebar />
        <div className="flex-1 flex flex-col">
            <NavBar />
            <main className="p-4 md:p-6">{children}</main>
        </div>
    </div>
);

const GuardedShell: React.FC<React.PropsWithChildren> = ({ children }) => (
    <SubscriptionGuard>
        <AdminOnlyGuard>
            <Shell>{children}</Shell>
        </AdminOnlyGuard>
    </SubscriptionGuard>
);

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterWizard />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Navigate to="/cash-till" replace />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/activate-subscription"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <ActivateSubscription />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/account"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Account />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/cash-till"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <CashTill />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/customers"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Customers />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/suppliers"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Suppliers />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/discounts"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Discounts />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/transactions"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Transactions />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/staff"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Staff />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <Reports />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/inventory/stock"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <InventoryStock />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/inventory/products"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <InventoryProducts />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/inventory/measurements"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <InventoryMeasurements />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/inventory/categories"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <InventoryCategories />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/inventory/history"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <RestockHistory />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/subscriptions"
                element={
                    <ProtectedRoute>
                        <GuardedShell>
                            <SubscriptionCodes />
                        </GuardedShell>
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/cash-till" replace />} />
        </Routes>
    );
};