import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box, Grid, Paper, Typography, TextField, Button, IconButton, InputAdornment, Link
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockRounded from "@mui/icons-material/LockRounded";
import PersonOutline from "@mui/icons-material/PersonOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useAuth } from "../auth/AuthContext";

// ⬇️ bring in api + persist helpers
import { api, setBusinessId, setTerminalId } from "../api/client";

const brand = {
  bgLeft: "#cfe8d8",
  dark: "#0c5b4a",
  accent: "#d5a626",
};

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

  const getStoredUserId = (): string | null => {
    // prefer the header key set by AuthContext.login; fallback to any legacy key you used
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
      if (!uid) return; // AuthContext.login should have set it; if not, skip silently

      // Call the provided endpoint
      const { data: env } = await api.get<BusinessEnvelope>(`/api/users/${uid}/business-profile`);

      // BE returns an envelope with .data; also falls back to env itself if needed
      const d = (env && env.data) ? env.data : (env as any);
      const bid = (d?.businessId ?? d?.id);
      if (bid != null && `${bid}`.trim() !== "") {
        setBusinessId(String(bid)); // <-- persist so interceptor sends X-Business-Id
      }
    } catch {
      // non-blocking; some screens might not need business immediately
    }
  };

  // After login, persist Terminal ID and Business ID so interceptors add headers
  const hydrateContext = async () => {
    await Promise.all([
      fetchAndPersistTerminalId(),
      fetchAndPersistBusinessId(),
    ]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      await hydrateContext(); // ⬅️ persist X-Terminal-Id and X-Business-Id using your BE endpoint
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
                <Box sx={{
                  width: 72, height: 72, borderRadius: "999px",
                  background: "#fff", display: "grid", placeItems: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,.08)"
                }}>
                  <LockRounded sx={{ color: brand.dark }} />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#374151" }}>
                    Ipachi Capital
                  </Typography>
                  <Typography sx={{ color: "#6b7280", fontWeight: 500 }}>
                    Go further
                  </Typography>
                </Box>
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
                <Link component={RouterLink} to="/register" underline="hover" sx={{ color: brand.accent }}>
                  Create Account
                </Link>
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
