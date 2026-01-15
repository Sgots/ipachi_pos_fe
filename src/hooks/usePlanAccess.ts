import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export type PlanSource = "TRIAL" | "SUBSCRIPTION" | "NONE" | null;

export function usePlanAccess() {
    const { businessId, currentUser, permsHydrated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState<PlanSource>(null);

    const isSuperAdmin = localStorage.getItem("x.super.admin") === "true";

    useEffect(() => {
        let cancelled = false;

        console.log("usePlanAccess: Starting effect", {
            businessId,
            permsHydrated,
            username: currentUser?.username,
            isSuperAdmin,
        });

        if (!permsHydrated) {
            setLoading(true);
            return () => { cancelled = true; };
        }

        const run = async () => {
            setLoading(true);
            try {
                // Super admin bypass: always active, no business needed
                if (isSuperAdmin) {
                    console.log("usePlanAccess: Super admin detected → forcing active plan");
                    if (!cancelled) {
                        setSource("SUBSCRIPTION"); // or "SUPER_ADMIN" if you want to distinguish
                        setLoading(false);
                    }
                    return;
                }

                // Normal flow
                if (!businessId) {
                    console.log("usePlanAccess: No businessId, setting source to NONE");
                    if (!cancelled) setSource("NONE");
                } else {
                    console.log("usePlanAccess: Fetching plan for businessId =", businessId);
                    const { data } = await api.get(`/api/subscriptions/business/${businessId}/effective-plan`);
                    console.log("usePlanAccess: API response =", data);
                    if (!cancelled) {
                        const newSource = data?.source ?? "NONE";
                        setSource(newSource);
                    }
                }
            } catch (error) {
                console.error("usePlanAccess: API error =", error);
                if (!cancelled) setSource("NONE");
            } finally {
                if (!cancelled) {
                    console.log("usePlanAccess: Setting loading = false");
                    setLoading(false);
                }
            }
        };

        run();

        return () => {
            console.log("usePlanAccess: Effect cleanup");
            cancelled = true;
        };
    }, [businessId, permsHydrated, isSuperAdmin]); // ← add isSuperAdmin to deps

    // Super admin is always considered admin-like and has active plan
    const isAdmin = isSuperAdmin || (permsHydrated && currentUser?.username === "admin");

    const hasActive = isSuperAdmin || isAdmin || source === "TRIAL" || source === "SUBSCRIPTION";

    console.log("usePlanAccess: Final state", { loading, source, hasActive, isAdmin, isSuperAdmin });

    return { loading, source, hasActive };
}