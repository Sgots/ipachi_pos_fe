// src/hooks/usePlanAccess.ts
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export type PlanSource = "TRIAL" | "SUBSCRIPTION" | "NONE" | null;

export type EffectivePlanInfo = {
  source: PlanSource;
  tier?: string | null;
  hasActive: boolean;
  isDashboardOnlyPlan: boolean;
  shouldHideDashboard: boolean;
  loading: boolean;
};

export function usePlanAccess(): EffectivePlanInfo {
  const { businessId, currentUser, permsHydrated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<PlanSource>(null);
  const [tier, setTier] = useState<string | null>(null);

  const isSuperAdmin = localStorage.getItem("x.super.admin") === "true";

  useEffect(() => {
    let cancelled = false;

    if (!permsHydrated) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      setLoading(true);

      try {
        if (isSuperAdmin) {
          if (!cancelled) {
            setSource("SUBSCRIPTION");
            setTier("PLATINUM");
          }
          return;
        }

        if (!businessId) {
          if (!cancelled) {
            setSource("NONE");
            setTier(null);
          }
          return;
        }

        const { data } = await api.get(`/api/subscriptions/business/${businessId}/effective-plan`);

        if (!cancelled) {
          const newSource = data?.source ?? "NONE";
          const newTier = data?.tier ?? null;

          setSource(newSource);
          setTier(newTier);
        }
      } catch (error) {
        console.error("usePlanAccess error:", error);

        if (!cancelled) {
          setSource("NONE");
          setTier(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [businessId, permsHydrated, isSuperAdmin]);

  const tierUpper = String(tier || "").toUpperCase();

  const isAdmin = isSuperAdmin || (permsHydrated && currentUser?.username === "admin");

  const hasActive = isSuperAdmin || isAdmin || source === "TRIAL" || source === "SUBSCRIPTION";

  const isDashboardOnlyPlan = ["DISCOVER", "MONITOR", "INTELLIGENCE"].includes(tierUpper);

  // Business plans/subscriptions that must NOT see Dashboard in sidebar
  const shouldHideDashboard = ["PLATINUM", "BRONZE", "GOLD", "SILVER"].includes(tierUpper);

  return {
    loading,
    source,
    tier,
    hasActive,
    isDashboardOnlyPlan,
    shouldHideDashboard,
  };
}