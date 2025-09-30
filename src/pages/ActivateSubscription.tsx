// src/pages/ActivateSubscription.tsx
import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Button, Alert, Stack } from "@mui/material";
import { useLocation } from "react-router-dom";
import { api } from "../api/client";

type Msg = { type: "success" | "error" | "info"; text: string } | null;

const brand = { dark: "#0c5b4a" };

async function reloginAndReload() {
    try {
        // 1) refresh /me (roles)
        const me = await api.get("/api/auth/me").catch(() => null);
        const roles = me?.data?.roles || [];
        if (Array.isArray(roles)) {
            localStorage.setItem("auth.roles", JSON.stringify(roles));
        }

        // 2) refresh permissions
        const perms = await api.get("/api/me/permissions").catch(() => null);
        const permList = Array.isArray(perms?.data) ? perms?.data : [];
        localStorage.setItem("auth.permissions", JSON.stringify(permList));

        // 3) refresh business profile cache (name/logo/id)
        const uid = localStorage.getItem("x.user.id");
        if (uid) {
            const resp = await api.get(`/api/users/${uid}/business-profile`).catch(() => null);
            const d = resp?.data?.data ?? resp?.data;
            if (d) {
                if (d.name) localStorage.setItem("x.business.name", d.name);
                if (typeof d.logoUrl === "string") localStorage.setItem("x.business.logoUrl", d.logoUrl);
                if (d.businessId != null) localStorage.setItem("x.business.id", String(d.businessId));
            }
        }
    } finally {
        // 4) hard reload so AuthProvider/guards re-hydrate cleanly
        window.location.replace("/cash-till");
    }
}

const ActivateSubscription: React.FC = () => {
    const loc = useLocation();
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);

    const businessId = Number(localStorage.getItem("x.business.id") || 0);
    const userId = Number(localStorage.getItem("x.user.id") || 0);

    useEffect(() => {
        const reason = new URLSearchParams(loc.search).get("reason");
        if (reason === "gate" || reason === "no-plan") {
            setMsg({ type: "info", text: "You need an active subscription or free trial to continue." });
        } else if (reason === "no-business") {
            setMsg({ type: "info", text: "We couldn’t resolve your business. Activate with a code or start a trial." });
        }
    }, [loc.search]);

    const activateCode = async () => {
        if (!code.trim()) return;
        setBusy(true); setMsg(null);
        try {
            await api.post("/api/subscriptions/activate", {
                code: code.trim().toUpperCase(),
                businessId,
            });
            setMsg({ type: "success", text: "Subscription activated. Reloading…" });
            await reloginAndReload();
        } catch (e: any) {
            const text = e?.response?.data?.message || e?.message || "Activation failed";
            setMsg({ type: "error", text });
            setBusy(false);
        }
    };

    const startTrial = async () => {
        setBusy(true); setMsg(null);
        try {
            await api.post("/api/subscriptions/trial/start", {
                businessId,
                activatedByUserId: userId,
            });
            setMsg({ type: "success", text: "Free trial started. Reloading…" });
            await reloginAndReload();
        } catch (e: any) {
            const text = e?.response?.data?.message || e?.message || "Could not start trial";
            setMsg({ type: "error", text });
            setBusy(false);
        }
    };

    return (
        <Box className="flex items-center justify-center" sx={{ minHeight: "60vh" }}>
            <Paper sx={{ p: 4, width: "100%", maxWidth: 520 }}>
                <Typography variant="h6" sx={{ mb: 1, color: brand.dark }}>Activate your Subscription</Typography>
                <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                    Enter a subscription code or start a 7-day Platinum free trial.
                </Typography>

                {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <TextField
                        label="Subscription Code"
                        fullWidth
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="IP-XXXX-XXXX-XXXX"
                        disabled={busy}
                    />
                    <Button variant="contained" onClick={activateCode} disabled={!code.trim() || busy}>
                        Activate Code
                    </Button>
                </Stack>

                <Typography align="center" sx={{ color: "text.secondary", my: 1 }}>— or —</Typography>

                <Button variant="outlined" fullWidth onClick={startTrial} disabled={busy}>
                    Start 7-Day Free Trial (Platinum)
                </Button>
            </Paper>
        </Box>
    );
};

export default ActivateSubscription;
