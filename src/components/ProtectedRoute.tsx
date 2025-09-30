// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { user, hydrated, permsHydrated } = useAuth();
    const location = useLocation();

    // If there is no token at all, bounce to /login immediately (don't wait on hydration/perms)
    const lsToken = localStorage.getItem("auth.token");
    const authed = !!(user?.token || lsToken);

    if (!authed) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // User is authenticated → only now do we wait for hydration/perms to avoid flicker
    if (!hydrated || !permsHydrated) {
        return null; // or a minimal spinner/skeleton
    }

    return <>{children}</>;
};

export default ProtectedRoute;
