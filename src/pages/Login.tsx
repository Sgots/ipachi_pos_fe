import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box, Grid, Paper, Typography, TextField, Button, IconButton, InputAdornment, Link,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonOutline from "@mui/icons-material/PersonOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useAuth } from "../auth/AuthContext";
import logoUrl from "../assets/ipchi_logo_160.png";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

// ⬇️ bring in api + persist helpers
import { api, setBusinessId, setTerminalId } from "../api/client";

const brand = {
  bgLeft: "#cfe8d8",
  dark: "#0c5b4a",
  accent: "#d5a626",
};

type TerminalDTO = { id: number; name: string; code: string; active: boolean };

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
// Simple green-tick shield (two-tone) matching your sample

const SecureShieldIcon = (props: SvgIconProps) => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
    focusable="false"
    shapeRendering="geometricPrecision"
  >
    {/* Shield outline */}
    <path
      d="M12 2 20 6v6c0 5-3.8 9.1-8 10.5C7.8 21.1 4 17 4 12V6l8-4Z"
      fill="#fff"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Bold tick */}
    <path
      d="M7.8 12.6l3.0 3.0 6.4-7.0"
      fill="none"
      stroke="#35b443"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);


const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const ALLOW_SELF_REGISTER = true;

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

      if (u.toLowerCase() === "admin") {
        nav("/admin/subscriptions");
        return;
      }

      const bid = localStorage.getItem("x.business.id");
      if (!bid) {
        nav("/activate-subscription?reason=no-business");
        return;
      }

      try {
        const { data } = await api.get(`/api/subscriptions/business/${bid}/effective-plan`);
        if (!data || !data.source || data.source === "NONE") {
          nav("/activate-subscription?reason=no-plan");
          return;
        }
      } catch {
        nav("/activate-subscription?reason=no-plan");
        return;
      }

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
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      p: 2
    }}>
      <Paper elevation={8} sx={{
        maxWidth: 1000, // Reduced from 1100px for tighter layout
        width: "100%",
        borderRadius: 4, // Slightly reduced border radius for softer look
        overflow: "hidden"
      }}>
        <Grid container>
          {/* Brand panel */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              background: brand.bgLeft,
              p: { xs: 3, md: 6 }, // Reduced padding to minimize unused space
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: "auto", md: "500px" }, // Adjusted minHeight for compactness
            }}
          >
            {/* Middle: center logo + welcome */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Box sx={{ mb: 1.5 }}> {/* Reduced margin-bottom */}
                <Box
                  component="img"
                  src={logoUrl}
                  alt="Ipachi Capital logo"
                  sx={{ width: 360, height: "auto", display: "block", borderRadius: 2, mx: "auto" }} // Increased logo size
                />
              </Box>

              <Box
                sx={{
                  mt: 1.5, // Reduced margin-top
                  p: 2,
                  px: 3,
                  borderRadius: 4,
                  background: "#e7f3ec",
                  color: brand.dark,
                  display: "inline-block",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Added subtle shadow for depth
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Welcome back
                </Typography>
              </Box>
            </Box>

            {/* Bottom: legal text anchored at the bottom */}
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ color: "#6b7280", fontSize: 12 }}>
                Ipachi Capital is a registered financial services company in Botswana with
                Registration number <b>BW00002431492</b>. Registered office: Plot 69184, Block 8,
                Botswana Innovation Hub Science & Technology Park, Gaborone, Botswana
              </Typography>
            </Box>
          </Grid>

          {/* Form panel */}
          <Grid item xs={12} md={6} sx={{ p: { xs: 3, md: 6 } }}> {/* Reduced padding */}
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}> {/* Reduced margin-bottom */}
              Login your account
            </Typography>

            <Box component="form" onSubmit={onSubmit}>
              {/* Username */}
              <TextField
                placeholder="Enter your username"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#f7f9ff" } }} // Reduced border radius
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
                sx={{ mb: 1, "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#f7f9ff" } }} // Reduced border radius
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

              {/* Create Account + FAQs link */}
              <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}> {/* Reduced gap */}
                {ALLOW_SELF_REGISTER ? (
                  <Link component={RouterLink} to="/register" underline="hover" sx={{ color: brand.accent, fontWeight: 600 }}>
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
                {/* FAQs as a link that opens a scrollable modal */}
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  onClick={() => setFaqOpen(true)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  FAQs
                </Link>
          <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
            <SecureShieldIcon sx={{ fontSize: 26, color: "#1f2937" }} />
            <Typography variant="body2" sx={{ color: "#065f46" }}>
              Your data is safe and encrypted.
            </Typography>
          </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* FAQs Modal */}
      <Dialog
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="faq-dialog-title"
      >
        <DialogTitle id="faq-dialog-title">FAQs</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2">1. Who is Ipachi for?</Typography>
          <Typography variant="body2" paragraph>
            Ipachi is designed for micro, small, medium and large retail &amp; hospitality businesses.
          </Typography>
          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2">2. Why use Ipachi?</Typography>
          <Typography variant="body2" paragraph>
            Ipachi simplifies your business operations by providing a centralized platform for managing sales,
            inventory, payments, and customers. It helps unlock capital, improve efficiency, provides real-time
            insights, and supports data-driven decision-making to grow your business.
          </Typography>
          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2">3. Is there a free trial?</Typography>
          <Typography variant="body2" paragraph>
            Every registered business enjoys a 7-days free trial with complete access to all platinum features.
          </Typography>
          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2">4. What kind of businesses use Ipachi?</Typography>
          <Typography variant="body2" paragraph>
            Ipachi was built for tuckshops, Kiosks, Spaza shops, supermarkets, pharmacies, restaurants,
            boutiques, salons, etc.
          </Typography>
          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2">5. How do you subscribe for Ipachi?</Typography>
          <Typography variant="body2" paragraph>
            Purchase an Ipachi Scratch Card from our trusted agents or resellers, then simply follow instructions
            on the card to activate your chosen subscription package.
          </Typography>
          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2">6. When do I qualify for micro-financing?</Typography>
          <Typography variant="body2" paragraph>
            You must use Ipachi for a minimum of 3 months before becoming eligible for micro-financing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFaqOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;