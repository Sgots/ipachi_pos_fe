import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
    Box, Grid, Paper, Typography, TextField, Button, IconButton, InputAdornment, Link
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonOutline from "@mui/icons-material/PersonOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useAuth } from "../auth/AuthContext";
import logoUrl from "../assets/ipchi_logo_160.png";

// ⬇️ bring in api + persist helpers
import { api, setBusinessId, setTerminalId } from "../api/client";

const brand = {
    bgLeft: "#cfe8d8",
    dark: "#0c5b4a",
    accent: "#d5a626",
};

// Path where you said the asset lives

type TerminalDTO = { id: number; name: string; code: string; active: boolean };

// FE will accept either envelope.data or raw object
type BusinessEnvelope = {
    code?: string;
    message?: string;
    data?: {
        id?: number | string;
        businessId?: number | string;
        name?: string;
        location?: string;
        logoUrl?: string | null;
        userId?: number;
    };
};

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ALLOW_SELF_REGISTER = true; // toggle to true if you ever want to enable signup

    const getStoredUserId = (): string | null => {
        const a = localStorage.getItem("x.user.id");
        if (a && a !== "null" && a !== "undefined" && a.trim() !== "") return a;
        const b = localStorage.getItem("activeUserId");
        if (b && b !== "null" && b !== "undefined" && b.trim() !== "") return b;
        return null;
    };

    const fetchAndPersistTerminalId = async () => {
        try {
            const { data: terminals } = await api.get<TerminalDTO[]>("/api/terminals");
            if (Array.isArray(terminals) && terminals.length > 0) {
                setTerminalId(terminals[0].id);
            } else {
                const { data: def } = await api.post<TerminalDTO>("/api/terminals/default");
                setTerminalId(def.id);
            }
        } catch {
            // non-blocking
        }
    };

    const fetchAndPersistBusinessId = async () => {
        try {
            const uid = getStoredUserId();
            if (!uid) return;

            const { data: env } = await api.get<BusinessEnvelope>(`/api/users/${uid}/business-profile`);
            const d = (env && env.data) ? env.data : (env as any);
            const bid = (d?.businessId ?? d?.id);
            if (bid != null && `${bid}`.trim() !== "") {
                setBusinessId(String(bid));
            }
        } catch {
            // non-blocking
        }
    };

    const hydrateContext = async () => {
        await Promise.all([fetchAndPersistTerminalId(), fetchAndPersistBusinessId()]);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const u = username.trim();
            await login(u, password);
            await hydrateContext();

            // If platform admin, skip plan check
            if (u.toLowerCase() === "admin") {
                nav("/admin/subscriptions");
                return;
            }

            // Read businessId now that login/hydrate stored it
            const bid = localStorage.getItem("x.business.id");
            if (!bid) {
                // If for some reason we can't resolve business, send to activation anyway
                nav("/activate-subscription?reason=no-business");
                return;
            }

            // Check effective plan
            try {
                const { data } = await api.get(`/api/subscriptions/business/${bid}/effective-plan`);
                // source is "TRIAL" or "SUBSCRIPTION" when active
                if (!data || !data.source || data.source === "NONE") {
                    nav("/activate-subscription?reason=no-plan");
                    return;
                }
            } catch {
                // 404 or any error → treat as no plan
                nav("/activate-subscription?reason=no-plan");
                return;
            }

            // All good → proceed to normal landing
            nav("/cash-till");
        } catch {
            setError("Invalid username or password");
        } finally {
            setLoading(false);
        }
    };


    return (
        <Box sx={{
            minHeight: "100vh",
            background: "linear-gradient(120deg, #f6faf8, #eef7f3)",
            display: "grid",
            placeItems: "center",
            p: 2
        }}>
            <Paper elevation={8} sx={{
                maxWidth: 1100,
                width: "100%",
                borderRadius: 6,
                overflow: "hidden"
            }}>
                <Grid container>
                    {/* Brand panel */}
                    <Grid item xs={12} md={6} sx={{
                        background: brand.bgLeft,
                        p: { xs: 5, md: 8 },
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                    }}>
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                                {/* ⬇️ Your logo */}
                                <Box
                                    component="img"
                                    src={logoUrl}
                                    alt="Ipachi Capital logo"
                                    sx={{ width: 280, height: "300", display: "block", borderRadius: 2 }}
                                />

                            </Box>

                            <Box sx={{
                                mt: 8, p: 2, px: 3, borderRadius: 4,
                                background: "#e7f3ec", color: brand.dark, display: "inline-block"
                            }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Welcome back
                                </Typography>
                            </Box>
                        </Box>

                        <Typography sx={{ color: "#6b7280", fontSize: 13, mt: 10 }}>
                            Your data is safe and encrypted.
                        </Typography>
                    </Grid>

                    {/* Form panel */}
                    <Grid item xs={12} md={6} sx={{ p: { xs: 5, md: 8 } }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                            Login your account
                        </Typography>

                        <Box component="form" onSubmit={onSubmit}>
                            {/* Username */}
                            <TextField
                                placeholder="Enter your username"
                                fullWidth
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                sx={{ mb: 2.5, "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f7f9ff" } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutline sx={{ color: "text.secondary" }} />
                                        </InputAdornment>
                                    ),
                                }}
                                variant="outlined"
                                autoFocus
                                required
                            />

                            {/* Password */}
                            <TextField
                                placeholder="Enter your password"
                                fullWidth
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f7f9ff" } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlined sx={{ color: "text.secondary" }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPw((s) => !s)} edge="end" aria-label="toggle password visibility">
                                                {showPw ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                variant="outlined"
                                required
                            />

                            {error && (
                                <Typography color="error" sx={{ mb: 1 }}>
                                    {error}
                                </Typography>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                fullWidth
                                disabled={loading}
                                sx={{
                                    mt: 1.5,
                                    py: 1.3,
                                    borderRadius: 999,
                                    background: brand.dark,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    "&:hover": { background: "#0a4e40" }
                                }}
                            >
                                Login
                            </Button>

                            <Typography sx={{ mt: 2, color: "#6b7280", fontSize: 12 }}>
                                By continuing, you agree to our Terms & Privacy Policy.
                            </Typography>

                            <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1 }}>
                                {ALLOW_SELF_REGISTER ? (
                                    <Link component={RouterLink} to="/register" underline="hover" sx={{ color: brand.accent }}>
                                        Create Account
                                    </Link>
                                ) : (
                                    <Typography
                                        aria-disabled="true"
                                        sx={{ color: "text.disabled", cursor: "not-allowed", userSelect: "none" }}
                                    >
                                        Create Account
                                    </Typography>
                                )}

                                <Link component={RouterLink} to="/forgot" underline="hover">
                                    Forgot Password?
                                </Link>
                            </Box>

                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default LoginPage;
