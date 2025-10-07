import React, { useState } from "react";
import { Box, Paper, Typography, TextField, Button, Stack, Alert, InputAdornment, Link } from "@mui/material";
import PhoneIphoneOutlined from "@mui/icons-material/PhoneIphoneOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { api } from "../api/client";

type Phase = "MOBILE" | "OTP" | "RESET";
const brand = { dark: "#0c5b4a" };

const ForgotPassword: React.FC = () => {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("MOBILE");

  // UI collects separately:
  const [areaCode, setAreaCode] = useState("+267");
  const [phone, setPhone] = useState(""); // digits only preferred

  // Still keep OTP + passwords:
  const [otp, setOtp] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // --- Normalizers ---
  const normalizeAreaCode = (ac: string) => {
    let s = (ac || "").trim().replace(/\s+/g, "");
    s = s.replace(/[^\d+]/g, "");
    if (!s) return s;
    if (!s.startsWith("+")) s = `+${s}`;
    return s;
  };
  const normalizePhoneDigits = (p: string) => (p || "").trim().replace(/[^\d]/g, "");
  /** What we SEND: a SINGLE combined phone (MSISDN) like +267574050 */
  const msisdn = () => {
    const ac = normalizeAreaCode(areaCode);
    const pn = normalizePhoneDigits(phone);
    return ac && pn ? `${ac}${pn}` : "";
  };

  // --- Guards ---
  const phoneOk = () => /^\+\d{6,}$/.test(msisdn());
  const otpOk = () => /^\d{4,8}$/.test(otp);
  const pwOk = () => pw1.length >= 6 && pw1 === pw2;

  // --- API actions (send ONE combined "phone") ---
  const sendOtp = async () => {
    if (!phoneOk()) return setMsg({ type: "error", text: "Enter a valid number (e.g. +267 74 605 050)" });
    setMsg(null); setLoading(true);
    try {
      await api.post("/api/auth/forgot/send-otp", { phone: msisdn() });
      setMsg({ type: "success", text: "OTP sent. Check your phone." });
      setPhase("OTP");
    } catch (e: any) {
      setMsg({ type: "error", text: e?.response?.data?.message || "Failed to send OTP" });
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!otpOk()) return setMsg({ type: "error", text: "Enter the 4–8 digit OTP." });
    setMsg(null); setLoading(true);
    try {
      await api.post("/api/auth/forgot/verify", { phone: msisdn(), otp: otp.trim() });
      setMsg({ type: "success", text: "OTP verified. Set your new password." });
      setPhase("RESET");
    } catch (e: any) {
      setMsg({ type: "error", text: e?.response?.data?.message || "Invalid or expired OTP" });
    } finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (!pwOk()) return setMsg({ type: "error", text: "Passwords must match and be at least 6 characters." });
    setMsg(null); setLoading(true);
    try {
      await api.post("/api/auth/forgot/reset", { phone: msisdn(), otp: otp.trim(), newPassword: pw1 });
      setMsg({ type: "success", text: "Password updated. Redirecting to login..." });
      setTimeout(() => nav("/login"), 900);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.response?.data?.message || "Reset failed" });
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2, background: "linear-gradient(120deg,#f6faf8,#eef7f3)" }}>
      <Paper elevation={6} sx={{ width: "100%", maxWidth: 520, p: 4, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Reset Password</Typography>
          <Link component={RouterLink} to="/login" underline="hover"><ArrowBack sx={{ mr: 0.5, verticalAlign: "middle" }} /> Login</Link>
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          {phase === "MOBILE" && "Enter your mobile number. We’ll send you a one-time code (OTP)."}
          {phase === "OTP" && "Enter the OTP you received to verify your number."}
          {phase === "RESET" && "Create a new password for your account."}
        </Typography>

        {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

        {phase === "MOBILE" && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Area Code"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                sx={{ width: 140 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIphoneOutlined /></InputAdornment> }}
                helperText="e.g. +267"
              />
              <TextField
                label="Mobile Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                helperText="Digits only"
              />
            </Stack>
            <Button onClick={sendOtp} disabled={loading} variant="contained" sx={{ py: 1.2, borderRadius: 999, background: brand.dark, "&:hover": { background: "#0a4e40" } }}>
              Send OTP
            </Button>
          </Stack>
        )}

        {phase === "OTP" && (
          <Stack spacing={2}>
            <TextField
              label="OTP Code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
              InputProps={{ startAdornment: <InputAdornment position="start"><ShieldOutlined /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setPhase("MOBILE")} disabled={loading}>Back</Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={sendOtp} disabled={loading} variant="outlined">Resend OTP</Button>
              <Button onClick={verifyOtp} disabled={loading} variant="contained" sx={{ background: brand.dark, "&:hover": { background: "#0a4e40" }}}>
                Verify
              </Button>
            </Stack>
          </Stack>
        )}

        {phase === "RESET" && (
          <Stack spacing={2}>
            <TextField
              label="New Password"
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment> }}
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setPhase("OTP")} disabled={loading}>Back</Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={resetPassword} disabled={loading} variant="contained" sx={{ background: brand.dark, "&:hover": { background: "#0a4e40" }}}>
                Update Password
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default ForgotPassword;
