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

const brand = {
  bgLeft: "#cfe8d8",
  dark: "#0c5b4a",
  accent: "#d5a626",
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      nav("/cash-till");
    } catch (err) {
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
              {/* Username (placeholder + icon, rounded, soft bg) */}
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

              {/* Password (placeholder + lock icon + eye toggle) */}
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
