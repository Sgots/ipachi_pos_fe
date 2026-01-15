import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  MenuItem,
  Select,
  SelectChangeEvent,
  FormControl,     // ✅ ADD
  InputLabel,     // ✅ ADD
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonOutline from "@mui/icons-material/PersonOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useAuth } from "../auth/AuthContext";
import logoUrl from "../assets/ipchi_logo_160.png";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

// API helpers
import { api, setBusinessId, setTerminalId } from "../api/client";
const SUPER_ADMIN_MSISDN = "+26770000123";
const brand = {
  bgLeft: "#cfe8d8",
  dark: "#0c5b4a",
  accent: "#d5a626",
};

// ──────────────────────────────────────────────────────────────
//          Country codes - focused on Africa + popular globals
// ──────────────────────────────────────────────────────────────
const countryCodes = [
  { code: "+267", label: "BW Botswana" },
  { code: "+260", label: "ZM Zambia" },
  { code: "+263", label: "ZW Zimbabwe" },
  { code: "+27", label: "ZA South Africa" },
  { code: "+264", label: "NA Namibia" },
  { code: "+258", label: "MZ Mozambique" },
  { code: "+255", label: "TZ Tanzania" },
  { code: "+254", label: "KE Kenya" },
  { code: "+256", label: "UG Uganda" },
  { code: "+250", label: "RW Rwanda" },
  { code: "+257", label: "BI Burundi" },
  { code: "+251", label: "ET Ethiopia" },
  { code: "+252", label: "SO Somalia" },
  { code: "+249", label: "SD Sudan" },
  { code: "+211", label: "SS South Sudan" },
  { code: "+266", label: "LS Lesotho" },
  { code: "+268", label: "SZ Eswatini" },
  { code: "+265", label: "MW Malawi" },
  { code: "+261", label: "MG Madagascar" },
  { code: "+244", label: "AO Angola" },
  { code: "+234", label: "NG Nigeria" },
  { code: "+233", label: "GH Ghana" },
  { code: "+231", label: "LR Liberia" },
  { code: "+232", label: "SL Sierra Leone" },
  { code: "+221", label: "SN Senegal" },
  { code: "+225", label: "CI Côte d'Ivoire" },
  { code: "+228", label: "TG Togo" },
  { code: "+229", label: "BJ Benin" },
  { code: "+226", label: "BF Burkina Faso" },
  { code: "+223", label: "ML Mali" },
  { code: "+224", label: "GN Guinea" },
  { code: "+220", label: "GM Gambia" },
  { code: "+1", label: "US/Canada" },
  { code: "+44", label: "GB United Kingdom" },
  { code: "+971", label: "AE UAE" },
  { code: "+966", label: "SA Saudi Arabia" },
  { code: "+91", label: "IN India" },
  { code: "+86", label: "CN China" },
  { code: "+81", label: "JP Japan" },
  { code: "+61", label: "AU Australia" },
  { code: "+55", label: "BR Brazil" },
  { code: "+33", label: "FR France" },
  { code: "+49", label: "DE Germany" },
  { code: "+351", label: "PT Portugal" },
  // Add more if needed...
] as const;

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

const SecureShieldIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24" focusable="false" shapeRendering="geometricPrecision">
    <path
      d="M12 2 20 6v6c0 5-3.8 9.1-8 10.5C7.8 21.1 4 17 4 12V6l8-4Z"
      fill="#fff"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
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
const ALLOW_SELF_REGISTER = true;
  const [loginType, setLoginType] = useState<"admin" | "staff">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+267");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);

  const handleLoginTypeChange = (event: SelectChangeEvent<"admin" | "staff">) => {
    setLoginType(event.target.value as "admin" | "staff");
    setUsername(""); // reset input when switching type
    setError(null);
  };

  const handleCountryChange = (event: SelectChangeEvent<string>) => {
    setCountryCode(event.target.value);
  };

 const getNormalizedIdentifier = () => {
    const input = username.trim();
    if (!input) return "";

    if (loginType === "staff") {
      return input.toUpperCase();
    }

    // Admin → mobile number
    const cleaned = input.replace(/\D/g, "");
    if (cleaned.startsWith("00") || cleaned.startsWith("+")) {
      return "+" + cleaned.replace(/^00/, "");
    }
    return `${countryCode}${cleaned}`;
  };
  
  const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  try {
    const identifier = getNormalizedIdentifier();
    if (!identifier) throw new Error("Identifier is required");

    console.log("[LOGIN] Raw input:", username);
    console.log("[LOGIN] Normalized identifier:", identifier);
    console.log("[LOGIN] Is super admin number?", identifier === SUPER_ADMIN_MSISDN);

    // Clear flag – always
    localStorage.removeItem("x.super.admin");

    // Attempt login
    console.log("[LOGIN] Calling auth.login with:", identifier);
    await login(identifier, password);
    console.log("[LOGIN] login() succeeded");

    // ────────────────────────────────────────────────
    // SUPER ADMIN CHECK – must stop everything else
    // ────────────────────────────────────────────────
    if (identifier === SUPER_ADMIN_MSISDN) {
      console.log("[LOGIN] SUPER ADMIN DETECTED → setting flag & redirecting");
      localStorage.setItem("x.super.admin", "true");
      nav("/admin/subscriptions", { replace: true });
      return; // ← this MUST prevent any further code from running
    }

    console.log("[LOGIN] Not super admin → continuing normal flow");

    // Normal flow only
    const uid = localStorage.getItem("x.user.id");
    console.log("[LOGIN] User ID from storage:", uid);

    if (uid) {
      console.log("[LOGIN] Fetching business profile...");
      await api.get(`/api/users/${uid}/business-profile`).catch((err) => {
        console.warn("[LOGIN] Business profile fetch failed:", err);
      });
    }

    const bid = localStorage.getItem("x.business.id");
    console.log("[LOGIN] Business ID from storage:", bid);

    // Safety net (should never be reached for super admin)
    if (localStorage.getItem("x.super.admin") === "true") {
      console.log("[LOGIN] Unexpected super-admin flag found → redirecting anyway");
      nav("/admin/subscriptions", { replace: true });
      return;
    }

    if (!bid) {
      console.log("[LOGIN] No business ID → going to activation");
      nav("/activate-subscription?reason=no-business", { replace: true });
      return;
    }

    console.log("[LOGIN] Checking subscription plan...");
    try {
      const { data: plan } = await api.get(`/api/subscriptions/business/${bid}/effective-plan`);
      console.log("[LOGIN] Plan data:", plan);

      if (!plan || plan.source === "NONE") {
        nav("/activate-subscription?reason=no-plan", { replace: true });
        return;
      }
    } catch (planErr) {
      console.warn("[LOGIN] Plan check failed:", planErr);
      nav("/activate-subscription?reason=no-plan", { replace: true });
      return;
    }

    console.log("[LOGIN] All checks passed → cash-till");
    nav("/cash-till", { replace: true });
  } catch (err: any) {
    console.error("[LOGIN] Error during login flow:", err);
    const msg = err?.response?.data?.message?.toLowerCase() || "";

    if (msg.includes("staff")) {
      setError("Invalid staff number or password");
    } else if (msg.includes("mobile") || msg.includes("phone")) {
      setError("Invalid mobile number or password");
    } else {
      setError("Login failed: " + (err.message || "Unknown error"));
    }
  } finally {
    setLoading(false);
  }
};
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #f6faf8, #eef7f3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 1000,
          width: "100%",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Grid container>
          {/* Brand panel - unchanged */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              background: brand.bgLeft,
              p: { xs: 3, md: 6 },
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: "auto", md: "500px" },
            }}
          >
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
              <Box sx={{ mb: 1.5 }}>
                <Box
                  component="img"
                  src={logoUrl}
                  alt="Ipachi Capital logo"
                  sx={{ width: 360, height: "auto", borderRadius: 2, mx: "auto" }}
                />
              </Box>
              <Box
                sx={{
                  mt: 1.5,
                  p: 2,
                  px: 3,
                  borderRadius: 4,
                  background: "#e7f3ec",
                  color: brand.dark,
                  display: "inline-block",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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

          {/* Login Form */}
          <Grid item xs={12} md={6} sx={{ p: { xs: 3, md: 6 } }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.5 }}>
              Login your account
            </Typography>

            <Box component="form" onSubmit={onSubmit}>
              {/* Login Type Selector */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="login-type-label">Login as</InputLabel>
                <Select
                  labelId="login-type-label"
                  value={loginType}
                  label="Login as"
                  onChange={handleLoginTypeChange}
                >
                  <MenuItem value="admin">Admin (Mobile Number)</MenuItem>
                  <MenuItem value="staff">Staff (Staff ID/Code)</MenuItem>
                </Select>
              </FormControl>

              {/* Identifier Field */}
              <TextField
                fullWidth
                placeholder={
                  loginType === "admin"
                    ? "74665135 (your mobile number)"
                    : "ST12345 / EMP-028 (your staff ID)"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#f7f9ff" },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline sx={{ color: "text.secondary", mr: 1 }} />
                      {loginType === "admin" && (
                        <Select
                          value={countryCode}
                          onChange={handleCountryChange}
                          variant="standard"
                          disableUnderline
                          sx={{
                            minWidth: 100,
                            "& .MuiSelect-select": { py: 0.5, pl: 1, pr: 3 },
                          }}
                        >
                          {countryCodes.map((c) => (
                            <MenuItem key={c.code} value={c.code}>
                              {c.code}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </InputAdornment>
                  ),
                  endAdornment:
                    loginType === "admin" ? (
                      <InputAdornment position="end" sx={{ color: "text.secondary" }}>
                        {countryCode}
                      </InputAdornment>
                    ) : null,
                }}
                variant="outlined"
                autoFocus
                required
                helperText={
                  loginType === "admin"
                    ? "Enter your mobile number (without country code)"
                    : "Enter your staff ID or employee code"
                }
              />

              {/* Password */}
              <TextField
                placeholder="Enter your password"
                fullWidth
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{
                  mb: 1,
                  "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#f7f9ff" },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw(!showPw)}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPw ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                required
              />

              {error && (
                <Typography color="error" sx={{ mb: 1, mt: 1 }}>
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
                  mt: 2,
                  py: 1.3,
                  borderRadius: 999,
                  background: brand.dark,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { background: "#0a4e40" },
                }}
              >
                {loading ? "Signing in..." : "Login"}
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

      {/* FAQs Dialog - keep your existing content */}
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