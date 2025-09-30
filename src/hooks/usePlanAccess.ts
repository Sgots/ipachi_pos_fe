import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export type PlanSource = "TRIAL" | "SUBSCRIPTION" | "NONE" | null;

export function usePlanAccess() {
    const { businessId, currentUser, permsHydrated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState<PlanSource>(null);

    useEffect(() => {
        let cancelled = false;

        console.log("usePlanAccess: Starting effect", {
            businessId,
            permsHydrated,
            username: currentUser?.username,
        });

        if (!permsHydrated) {
            console.log("usePlanAccess: permsHydrated is false, waiting...");
            setLoading(true);
            return () => {
                cancelled = true;
            };
        }

        const run = async () => {
            setLoading(true);
            try {
                if (!businessId) {
                    console.log("usePlanAccess: No businessId, setting source to NONE");
                    setSource("NONE");
                } else {
                    console.log("usePlanAccess: Fetching plan for businessId =", businessId);
                    const { data } = await api.get(`/api/subscriptions/business/${businessId}/effective-plan`);
                    console.log("usePlanAccess: API response =", data);
                    if (!cancelled) {
                        const newSource = data?.source ?? "NONE";
                        console.log("usePlanAccess: Setting source =", newSource);
                        setSource(newSource);
                    }
                }
            } catch (error) {
                console.error("usePlanAccess: API error =", error);
                if (!cancelled) {
                    console.log("usePlanAccess: Setting source to NONE due to error");
                    setSource("NONE");
                }
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
    }, [businessId, permsHydrated]);

    // Check if the user is admin based on username
    const isAdmin = permsHydrated && currentUser?.username === "admin";

    const hasActive = isAdmin || source === "TRIAL" || source === "SUBSCRIPTION";

    console.log("usePlanAccess: Final state", { loading, source, hasActive, isAdmin });

    return { loading, source, hasActive };
}