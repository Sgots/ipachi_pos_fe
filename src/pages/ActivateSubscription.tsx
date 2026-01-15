// src/pages/ActivateSubscription.tsx
import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Button, Alert, Stack, CircularProgress } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { api, setAuthToken, setUserId, setBusinessId } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isAxiosError } from "axios";

type Msg = { type: "success" | "error" | "info"; text: string } | null;

const brand = { dark: "#0c5b4a" };

const errorText = (e: unknown, fallback: string) => {
  if (isAxiosError(e)) return ((e.response?.data as any)?.message as string) ?? e.message ?? fallback;
  if (e instanceof Error) return e.message || fallback;
  return fallback;
};
  // NEW

const errorStatus = (e: unknown): number | undefined => (isAxiosError(e) ? e.response?.status : undefined);
const errorData = (e: unknown): any => (isAxiosError(e) ? e.response?.data : undefined);
const formatCode = (value: string): string => {
  // Remove all non-alphanumeric characters
  const cleanValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  // Add hyphens after 4th, 8th, and 12th characters
  let formatted = "";
  for (let i = 0; i < cleanValue.length; i++) {
    formatted += cleanValue[i];
    // Add hyphen at positions 3, 7, 11 (after 4th, 8th, 12th characters)
    if (i === 3 || i === 7 || i === 11) {
      formatted += "-";
    }
  }
  return formatted;
};
const ActivateSubscription: React.FC = () => {
  const { currentUser, refreshPermissions } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  // NEW
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  // NEW: state for trial detection
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [planCheckError, setPlanCheckError] = useState<string | null>(null);

  const businessId = Number(localStorage.getItem("x.business.id") || 0);
  const userId = Number(localStorage.getItem("x.user.id") || 0);
useEffect(() => {
  const reason = new URLSearchParams(loc.search).get("reason");

  if (reason === "gate" || reason === "no-plan") {
    setMsg({ type: "info", text: "You need an active subscription or free trial to continue." });
  } else if (reason === "no-business") {
    setMsg({ type: "info", text: "We couldn’t resolve your business. Activate with a code or start a trial." });
  } else if (reason === "trial-expired") {
    // Immediately mark trialExpired so button disables even before plan fetch
    setTrialExpired(true);
    setMsg({ type: "info", text: "Your free trial has expired and cannot be restarted. Activate a subscription code or contact support." });

    // If we have a businessId, try fetching effective-plan to show the exact expiry timestamp
    // (non-blocking; failure doesn't re-enable the button)
    if (businessId && businessId > 0) {
      (async () => {
        setCheckingPlan(true);
        setPlanCheckError(null);
        try {
          const plan = await getEffectivePlan(String(businessId));
          if (plan?.trialEndsAt) {
            setTrialEndsAt(plan.trialEndsAt);
          } else if (plan?.trialEndsAt === null && plan?.trialEndsAt === undefined) {
            // some backends may use validUntil / valid_until / validUntil for expired trial
            const alt = plan?.validUntil ?? plan?.valid_until ?? plan?.expiresAt ?? plan?.expires_at;
            if (alt) setTrialEndsAt(alt);
          }
        } catch (e: unknown) {
          setPlanCheckError(errorText(e, "Could not fetch plan"));
        } finally {
          setCheckingPlan(false);
        }
      })();
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loc.search, businessId]);



  const parseRoles = (me: any): string[] => {
    if (Array.isArray(me?.roles)) return me.roles.map(String);
    if (me?.role) return [String(me.role)];
    // @ts-ignore
    if (Array.isArray(currentUser?.roles)) return (currentUser as any).roles.map(String);
    try {
      const blob = JSON.parse(localStorage.getItem("ipachi_user") || "{}");
      if (Array.isArray(blob?.roles)) return blob.roles.map(String);
    } catch {}
    return [];
  };

  const getEffectivePlan = async (bid: string) => {
    // Prefer subscriptions route; fall back to business route
    try {
      const r1 = await api.get(`/api/subscriptions/business/${bid}/effective-plan`);
      return r1?.data;
    } catch (e: unknown) {
      if (errorStatus(e) === 404) {
        const r2 = await api.get(`/api/business/${bid}/effective-plan`);
        return r2?.data;
      }
      throw e;
    }
  };

  // NEW: helper to decide if trial is expired
  const isPlanTrialExpired = (plan: any): boolean => {
    if (!plan) return false;
    // tolerate different shapes: trialStatus, trial, expiresAt, trialExpiresAt, source etc.
    const s = (plan?.trialStatus ?? plan?.status ?? "").toString().toUpperCase();
    if (s === "EXPIRED") return true;

    // sometimes backend exposes a trialExpiresAt or expiresAt field
    const expires = plan?.trialExpiresAt ?? plan?.trialExpireAt ?? plan?.expiresAt ?? plan?.expires_at;
    if (expires) {
      try {
        const then = new Date(expires);
        if (!isNaN(then.getTime())) {
          return then.getTime() <= Date.now();
        }
      } catch {}
    }

    // fallback: some backends may set source to TRIAL_EXPIRED or similar
    const src = String(plan?.source ?? "").toUpperCase();
    if (src.includes("EXPIRED") && src.includes("TRIAL")) return true;

    return false;
  };

  // NEW: fetch plan on mount and set trialExpired flag
  useEffect(() => {
    let mounted = true;
    if (!businessId || businessId <= 0) return;

    (async () => {
      setCheckingPlan(true);
      setPlanCheckError(null);
      try {
        const plan = await getEffectivePlan(String(businessId));
        if (!mounted) return;
        const expired = isPlanTrialExpired(plan);
        setTrialExpired(expired);
      } catch (e: unknown) {
        console.warn("Failed to check effective plan:", errorText(e, "Unknown"));
        if (!mounted) return;
        setPlanCheckError(errorText(e, "Could not determine plan status"));
        // keep trialExpired false by default on error (safer to allow trial unless explicitly expired)
      } finally {
        if (!mounted) return;
        setCheckingPlan(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const waitForPlan = async (bid: string, timeoutMs = 10000, intervalMs = 800) => {
    const start = Date.now();
    let lastErr: unknown = null;
    while (Date.now() - start < timeoutMs) {
      try {
        const plan = await getEffectivePlan(bid);
        console.log("[plan-check]", plan);
        if (plan?.source && String(plan.source).toUpperCase() !== "NONE") return plan;
      } catch (e: unknown) {
        lastErr = e;
        console.warn("[plan-check] error", errorStatus(e), errorText(e, "Unknown error"));
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    if (lastErr) throw lastErr;
    throw new Error("Timed out waiting for active plan");
  };

  const hardRedirect = (path: string) => {
    try { nav(path, { replace: true }); } catch {}
    setTimeout(() => { window.location.replace(path); }, 50);
  };

  const reloginAndReload = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (!currentUser?.id || !currentUser?.username) {
        throw new Error("Missing user ID or username in AuthContext");
      }

      // 1) Refresh session
      const token = localStorage.getItem("auth.token");
      if (!token) throw new Error("No auth token found");
      const { data: authResp } = await api.post("/api/auth/refresh", { token });
      setAuthToken(authResp.token);
      localStorage.setItem(
        "ipachi_user",
        JSON.stringify({
          username: authResp.username || currentUser.username,
          token: authResp.token,
          roles: authResp.role ? [authResp.role] : (Array.isArray(authResp.roles) ? authResp.roles : []),
        })
      );
      console.log("[refresh] OK");

      // 2) /me + roles
      const { data: me } = await api.get("/api/auth/me");
      const uid = me?.id ?? currentUser.id;
      if (!uid) throw new Error("Could not resolve user id after refresh");
      setUserId(uid);
      const roles = parseRoles(me);
      console.log("[me] uid:", uid, "roles:", roles);

      // 3) Permissions
      if (typeof refreshPermissions !== "function") throw new Error("refreshPermissions is not a function");
      await refreshPermissions();
      const perms = JSON.parse(localStorage.getItem("auth.permissions") || "[]");
      console.log("[perms]", perms);
      if (!Array.isArray(perms) || perms.length === 0) {
        console.warn("[perms] empty; continuing (will rely on hard reload)");
      }

      // 4) Business profile
      const { data: resp } = await api.get(`/api/users/${uid}/business-profile`);
      const d = resp?.data?.data ?? resp?.data ?? resp;
      if (!d?.businessId) throw new Error("No business profile after activation");
      setBusinessId(d.businessId);
      if (d.name) localStorage.setItem("x.business.name", d.name);
      if (typeof d.logoUrl === "string") localStorage.setItem("x.business.logoUrl", d.logoUrl);
      console.log("[biz]", d);

      // 5) Plan (poll to allow backend to finalize)
      const bid = String(d.businessId);
      const plan = await waitForPlan(bid);
      console.log("[plan] active:", plan);

      // 6) Redirect
      const isAdmin = roles.some((r) => String(r).toUpperCase() === "ADMIN" || String(r).toUpperCase() === "ROLE_ADMIN");
      hardRedirect(isAdmin ? "/cash-till" : "/cash-till");
      return;
    } catch (e: unknown) {
      console.error("reloginAndReload failed:", {
        message: errorText(e, "Unknown error"),
        status: errorStatus(e),
        data: errorData(e),
      });
      setMsg({
        type: "error",
        text: `Failed to refresh session: ${errorText(e, "Unknown error")}. Please try again or log out and back in.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const activateCode = async () => {
    if (!code.trim()) {
      setMsg({ type: "error", text: "Please enter a valid subscription code." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api.post("/api/subscriptions/activate", {
        code: code.trim().toUpperCase(),
        businessId,
      });
      setMsg({ type: "success", text: "Subscription activated. Finalizing…" });
      await reloginAndReload();
    } catch (e: unknown) {
      const text = errorText(e, "Activation failed");
      setMsg({ type: "error", text });
      setBusy(false);
    }
  };

// 1) Replace your startTrial function with this
const startTrial = async () => {
  // client-side guard: do not call API if trial already expired
  if (trialExpired) {
    setMsg({
      type: "info",
      text: trialEndsAt
        ? `Your free trial ended on ${new Date(trialEndsAt).toLocaleString()}. It cannot be restarted. Activate a subscription code or contact support.`
        : "Your free trial has expired and cannot be restarted. Activate a subscription code or contact support.",
    });
    return;
  }

  // Also prevent starting while we are still checking plan
  if (checkingPlan) {
    setMsg({ type: "info", text: "Checking plan status — please wait a moment." });
    return;
  }

  setBusy(true);
  setMsg(null);
  try {
    await api.post("/api/subscriptions/trial/start", {
      businessId,
      activatedByUserId: userId,
    });
    setMsg({ type: "success", text: "Free trial started. Finalizing…" });
    await reloginAndReload();
  } catch (e: unknown) {
    // Show friendlier message for 403 (forbidden) which your backend returns when trial cannot be started
    if (errorStatus(e) === 403) {
      setMsg({
        type: "error",
        text:
          "Could not start free trial: your account or business is not eligible. If you think this is wrong, contact support.",
      });
    } else {
      const text = errorText(e, "Could not start trial");
      setMsg({ type: "error", text });
    }
    setBusy(false);
  }
};


  return (
    <Box className="flex items-center justify-center" sx={{ minHeight: "60vh" }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 520 }}>
        <Typography variant="h6" sx={{ mb: 1, color: brand.dark }}>
          Activate your Subscription
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          Enter a subscription code or start a 7-day Platinum free trial.
        </Typography>

        {msg && (
          <Alert severity={msg.type} sx={{ mb: 2 }}>
            {msg.text}
          </Alert>
        )}

        {/* If plan check failed show a subtle warning so user understands why trial may still be available */}
        {planCheckError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not determine current trial status: {planCheckError}
          </Alert>
        )}

        {/* If trial is known expired, show info */}
        {trialExpired && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Your free trial has expired and cannot be restarted. Activate a subscription code or contact support.
          </Alert>
        )}

        <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
                    label="Subscription Code"
                    fullWidth
                    value={code}
                    onChange={(e) => setCode(formatCode(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !busy && code.replace(/-/g, "").trim()) {
                        activateCode();
                      }
                    }}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    disabled={busy}
                    inputProps={{ maxLength: 19 }} // 16 chars + 3 hyphens
                  />

          <Button
            variant="contained"
            onClick={activateCode}
            disabled={!code.trim() || busy}
            startIcon={busy ? <CircularProgress size={20} /> : null}
          >
            {busy ? "Activating..." : "Activate Code"}
          </Button>
        </Stack>

        <Typography align="center" sx={{ color: "text.secondary", my: 1 }}>
          — or —
        </Typography>

       <Button
         variant="outlined"
         fullWidth
         onClick={startTrial}
         disabled={Boolean(busy) || Boolean(trialExpired) || Boolean(checkingPlan)}
         aria-disabled={Boolean(busy) || Boolean(trialExpired) || Boolean(checkingPlan)}
         startIcon={busy ? <CircularProgress size={20} /> : null}
         sx={{
           pointerEvents: (busy || trialExpired || checkingPlan) ? "none" : undefined,
         }}
       >
         {busy ? "Starting Trial..." : "Start 7-Day Free Trial (Platinum)"}
       </Button>

      </Paper>
    </Box>
  );
};

export default ActivateSubscription;
