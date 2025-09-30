// src/components/SubscriptionGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePlanAccess } from "../hooks/usePlanAccess";

const ALLOW_WHEN_INACTIVE = ["/activate-subscription", "/account", "/logout"];

const Spinner: React.FC = () => (
    <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
        Checking subscription…
    </div>
);

export const SubscriptionGuard: React.FC<React.PropsWithChildren> = ({
                                                                         children,
                                                                     }) => {
    const { loading, hasActive } = usePlanAccess();
    const loc = useLocation();

    if (loading) return <Spinner />;

    if (!hasActive) {
        const path = loc.pathname.toLowerCase();
        const allowed = ALLOW_WHEN_INACTIVE.some((p) => path.startsWith(p));
        if (!allowed) {
            // Preserve the reason query parameter if it exists
            const reason = new URLSearchParams(loc.search).get("reason") || "gate";
            return <Navigate to={`/activate-subscription?reason=${reason}`} replace />;
        }
    }

    return <>{children}</>;
};