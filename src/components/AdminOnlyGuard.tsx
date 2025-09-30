// src/components/AdminOnlyGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export const AdminOnlyGuard: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { currentUser } = useAuth();
    const loc = useLocation();
    const isPlatformAdmin = (currentUser.username || "").toLowerCase() === "admin";

    if (isPlatformAdmin) {
        // Only allow the admin subscriptions page
        if (!loc.pathname.startsWith("/admin/subscriptions")) {
            return <Navigate to="/admin/subscriptions" replace />;
        }
    }

    return <>{children}</>;
};
