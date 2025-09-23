import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { setAuthToken, setBusinessId, setTerminalId } from "../api/client";

import { endpoints, AuthResponse, RegisterRequest, NewUserSetupRequest } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

import {
  Box, Paper, Typography, Stepper, Step, StepLabel, Grid, TextField,
  Button, Checkbox, FormControlLabel, MenuItem, IconButton, InputAdornment, Chip
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloudUpload from "@mui/icons-material/CloudUpload";

const brand = { dark: "#0c5b4a", accent: "#d5a626" };
const countries = ["Botswana", "Namibia", "Ghana", "Nigeria", "Tanzania", "Lesotho", "Eswatini", "Kenya"];
const titles = ["Mr", "Ms", "Mrs", "Dr"];
const genders = ["Male", "Female", "Other"];
const idTypes = ["NATIONAL_ID", "PASSPORT", "DRIVER_LICENSE"] as const;

type Step1 = {
  name: string; surname: string; email?: string;
  password: string; confirm: string;
  areaCode: string; phone: string;
  remember: boolean; news: boolean;
};

type UploadState = { file?: File; preview?: string };

type Step2 = {
  title?: string; gender?: string; dob?: string;
  idType?: string; idNumber?: string;
  postal?: string; physical?: string; city?: string; country?: string; areaCode?: string;
  picture: UploadState; idDoc: UploadState;
  bizName?: string; bizLocation?: string;
  bizLogo: UploadState;
};

type MeResponse = { id?: number; userId?: number; username?: string; email?: string };
type TerminalDTO = { id: number; name: string; code: string; active: boolean; createdAt?: string; updatedAt?: string; location?: string | null };

// very loose shape to collect a business id regardless of naming
type BusinessDTO = { id?: number | string; businessId?: number | string };

const strength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0..5
};

const RegisterWizard: React.FC = () => {
  const nav = useNavigate();
  const { login } = useAuth();

  const [active, setActive] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [savingS1, setSavingS1] = useState(false);
  const [savingS2, setSavingS2] = useState(false);
  const [errS1, setErrS1] = useState<string | null>(null);
  const [errS2, setErrS2] = useState<string | null>(null);

  const [s1, setS1] = useState<Step1>({
    name: "", surname: "", email: "", password: "", confirm: "",
    areaCode: "+267", phone: "", remember: true, news: true
  });
  const [s2, setS2] = useState<Step2>({
    country: "Botswana",
    picture: {}, idDoc: {}, bizLogo: {}
  });

  const pwScore = useMemo(() => strength(s1.password), [s1.password]);
  const pwHelper = ["Too short", "Weak", "Okay", "Good", "Strong", "Very strong"][pwScore];

  const back = () => setActive((a) => a - 1);

  // basic validation
  const step1Valid = Boolean(s1.name && s1.surname && s1.password && s1.password === s1.confirm && s1.phone);
  const step2Valid = Boolean(s2.idType && s2.idNumber && s2.picture.file && s2.idDoc.file);

  const attach =
    (key: "picture" | "idDoc" | "bizLogo") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setS2((prev) => ({ ...prev, [key]: { file, preview: url } }));
    };

  async function bootstrapContextAfterLogin() {
    // 1) get user id from /auth/me (or similar)
    try {
      const { data: me } = await api.get<MeResponse>(endpoints.auth.me);
      const uid = (me?.id ?? me?.userId);
      if (uid != null) {
        localStorage.setItem("activeUserId", String(uid));
        // also store for headers via helper (kept in your Auth flow elsewhere)
        // setUserId(uid)  // usually done in AuthContext.login already
      }
    } catch {
      // ignore
    }

    // 2) ensure default terminal exists; then persist for headers
    try {
      let { data: terms } = await api.get<TerminalDTO[]>("/api/terminals");
      if (!Array.isArray(terms) || terms.length === 0) {
        const { data: def } = await api.post<TerminalDTO>("/api/terminals/default");
        setTerminalId(def.id); // <-- persist to x.terminal.id so interceptor sends X-Terminal-Id
      } else {
        setTerminalId(terms[0].id); // <-- persist first terminal
      }
    } catch {
      // ignore; backend may infer terminal some other way
    }
  }

  // Step 1 -> register user, then sign in, then bootstrap terminal
  const registerStep1 = async () => {
    setErrS1(null); setSavingS1(true);
    setAuthToken(null);
    try {
      // choose a username strategy; prefer email, else phone
      const username = (s1.email && s1.email.trim()) || s1.phone.trim();
      const body: RegisterRequest = { username, email: s1.email ?? "", password: s1.password };
      await api.post<AuthResponse>(endpoints.auth.register, body);

      // Immediately sign in so we can call the protected setup endpoint
      await login(username, s1.password);

      // Bootstrap: set activeUserId & persist Terminal ID for headers
      await bootstrapContextAfterLogin();

      setActive(1);
    } catch (e: any) {
      setErrS1(e?.response?.data?.message || "Failed to register. Please check details.");
    } finally {
      setSavingS1(false);
    }
  };

  // Try to persist Business ID from response or by fetching the first available business
  async function persistBusinessIdFromServer(hint?: unknown) {
    // 1) If the setup response had a business id in common shapes, use it
    try {
      const h = (hint ?? {}) as any;
      const possible = h?.businessId ?? h?.businessID ?? h?.bizId ?? h?.business?.id ?? h?.id;
      if (possible != null && `${possible}`.trim() !== "") {
        setBusinessId(String(possible));
        return;
      }
    } catch { /* ignore */ }

    // 2) Fallback endpoints: try a couple of common ones; ignore errors quietly
    const candidates = ["/api/businesses/mine", "/api/businesses", "/api/business/me", "/api/business/current"];
    for (const path of candidates) {
      try {
        const { data } = await api.get<any>(path);
        // support array or single object
        const first: BusinessDTO | undefined = Array.isArray(data) ? data[0] : data;
        const bid = first?.businessId ?? first?.id;
        if (bid != null && `${bid}`.trim() !== "") {
          setBusinessId(String(bid)); // <-- persist to x.business.id so interceptor sends X-Business-Id
          return;
        }
      } catch {
        // continue to next
      }
    }
    // If none worked, leave it unset; backend may not require it for your next route.
  }

  // Step 2 -> multipart (JSON + files) + persist Business ID
  const submit = async () => {
    setErrS2(null); setSavingS2(true);
    try {
      const payload: NewUserSetupRequest = {
        title: s2.title, gender: s2.gender, dob: s2.dob || undefined,
        idType: s2.idType, idNumber: s2.idNumber,
        postalAddress: s2.postal, physicalAddress: s2.physical,
        city: s2.city, country: s2.country, areaCode: s2.areaCode,
        phone: `${s1.areaCode}${s1.phone}`,
        bizName: s2.bizName, bizLocation: s2.bizLocation,
      };

      const form = new FormData();
      form.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      if (s2.picture.file) form.append("picture", s2.picture.file);
      if (s2.idDoc.file)  form.append("idDoc", s2.idDoc.file);
      if (s2.bizLogo.file) form.append("bizLogo", s2.bizLogo.file);

      // Post setup
      const { data: setupResp } = await api.post(endpoints.user.setup, form);

      // Persist BusinessId from response or via fallbacks
      await persistBusinessIdFromServer(setupResp);

      // Done — go to your next screen
      nav("/customers");
    } catch (e: any) {
      setErrS2(e?.response?.data?.message || "Failed to complete setup.");
    } finally {
      setSavingS2(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2,
      background: "linear-gradient(120deg, #f6faf8, #eef7f3)" }}>
      <Paper elevation={8} sx={{ width: "100%", maxWidth: 1100, p: { xs: 4, md: 6 }, borderRadius: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {active === 0 ? "Register New Account" : "Complete Registration"}
          </Typography>
          <Chip label={`step ${active + 1} of 2`} sx={{ bgcolor: brand.dark, color: "#fff", fontWeight: 700 }} />
        </Box>

        <Stepper activeStep={active} sx={{ mb: 4 }}>
          <Step><StepLabel>Account</StepLabel></Step>
          <Step><StepLabel>Profile & Business</StepLabel></Step>
        </Stepper>

        {active === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField label="Name" fullWidth value={s1.name} onChange={(e)=>setS1({...s1, name: e.target.value})} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Surname" fullWidth value={s1.surname} onChange={(e)=>setS1({...s1, surname: e.target.value})} /></Grid>
            <Grid item xs={12}><TextField label="Email (optional)" fullWidth value={s1.email} onChange={(e)=>setS1({...s1, email: e.target.value})} /></Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Password"
                fullWidth
                type={showPw ? "text" : "password"}
                value={s1.password}
                onChange={(e)=>setS1({...s1, password: e.target.value})}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={()=>setShowPw(p=>!p)}>{showPw ? <VisibilityOff/> : <Visibility/>}</IconButton>
                    </InputAdornment>
                  )
                }}
                helperText={s1.password ? `Strength: ${pwHelper}` : "Use 8+ characters with a mix of letters, numbers & symbols."}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Confirm Password"
                fullWidth
                type={showPw2 ? "text" : "password"}
                value={s1.confirm}
                onChange={(e)=>setS1({...s1, confirm: e.target.value})}
                error={!!s1.confirm && s1.password !== s1.confirm}
                helperText={!!s1.confirm && s1.password !== s1.confirm ? "Passwords do not match" : " "}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={()=>setShowPw2(p=>!p)}>{showPw2 ? <VisibilityOff/> : <Visibility/>}</IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}><TextField label="Area code" fullWidth value={s1.areaCode} onChange={e=>setS1({...s1, areaCode: e.target.value})} /></Grid>
            <Grid item xs={12} md={8}><TextField label="Phone Number" fullWidth value={s1.phone} onChange={e=>setS1({...s1, phone: e.target.value})} /></Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={s1.remember} onChange={(e)=>setS1({...s1, remember: e.target.checked})} />} label="Remember Me" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={s1.news} onChange={(e)=>setS1({...s1, news: e.target.checked})} />} label="Subscribe to Newsletter" />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={registerStep1}
                disabled={!step1Valid || savingS1}
                sx={{ mt: 1, py: 1.3, borderRadius: 999, bgcolor: brand.dark, "&:hover": { bgcolor: "#0a4e40" } }}
                fullWidth
              >
                {savingS1 ? "Registering..." : "REGISTER"}
              </Button>
              {errS1 && <Typography color="error" sx={{ mt: 1 }}>{errS1}</Typography>}
            </Grid>
          </Grid>
        )}

        {active === 1 && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: brand.accent }}>About Me</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><TextField label="Title" select fullWidth value={s2.title ?? ""} onChange={e=>setS2({...s2, title: e.target.value})}>{titles.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={3}><TextField label="Gender" select fullWidth value={s2.gender ?? ""} onChange={e=>setS2({...s2, gender: e.target.value})}>{genders.map(g=><MenuItem key={g} value={g}>{g}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={3}><TextField label="Date of Birth" type="date" fullWidth InputLabelProps={{ shrink: true }} value={s2.dob ?? ""} onChange={e=>setS2({...s2, dob: e.target.value})} /></Grid>
              <Grid item xs={12} md={3}><TextField label="Identification Type" select fullWidth value={s2.idType ?? ""} onChange={e=>setS2({...s2, idType: e.target.value})}>{idTypes.map(t=><MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>

              <Grid item xs={12} md={6}><TextField label="Document Number" fullWidth value={s2.idNumber ?? ""} onChange={e=>setS2({...s2, idNumber: e.target.value})} /></Grid>
              <Grid item xs={12} md={6}><TextField label="City/Town/Village" fullWidth value={s2.city ?? ""} onChange={e=>setS2({...s2, city: e.target.value})} /></Grid>

              <Grid item xs={12} md={6}><TextField label="Postal Address" fullWidth value={s2.postal ?? ""} onChange={e=>setS2({...s2, postal: e.target.value})} /></Grid>
              <Grid item xs={12} md={6}><TextField label="Physical Address" fullWidth value={s2.physical ?? ""} onChange={e=>setS2({...s2, physical: e.target.value})} /></Grid>

              <Grid item xs={12} md={6}><TextField label="Country" select fullWidth value={s2.country ?? ""} onChange={e=>setS2({...s2, country: e.target.value})}>{countries.map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={6}><TextField label="Area Code" fullWidth value={s2.areaCode ?? ""} onChange={e=>setS2({...s2, areaCode: e.target.value})} /></Grid>

              <Grid item xs={12} md={6}>
                <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ borderRadius: 2 }}>
                  Upload Identity Document
                  <input hidden type="file" accept="image/*,application/pdf" onChange={attach("idDoc")} />
                </Button>
                {s2.idDoc.file && <Typography sx={{ mt: .5, fontSize: 13 }}>{s2.idDoc.file.name}</Typography>}
              </Grid>
              <Grid item xs={12} md={6}>
                <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ borderRadius: 2 }}>
                  Personal Picture
                  <input hidden type="file" accept="image/*" onChange={attach("picture")} />
                </Button>
                {s2.picture.preview && (
                  <Box component="img" src={s2.picture.preview} alt="Preview" sx={{ mt: 1, width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}/>
                )}
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ fontWeight: 800, my: 2, color: brand.accent }}>My Business</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField label="Business Name" fullWidth value={s2.bizName ?? ""} onChange={e=>setS2({...s2, bizName: e.target.value})} /></Grid>
              <Grid item xs={12} md={6}><TextField label="Business Location" fullWidth value={s2.bizLocation ?? ""} onChange={e=>setS2({...s2, bizLocation: e.target.value})} /></Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" startIcon={<CloudUpload />} sx={{ borderRadius: 2 }}>
                  Business Logo
                  <input hidden type="file" accept="image/*" onChange={attach("bizLogo")} />
                </Button>
                {s2.bizLogo.file && <Typography sx={{ mt: .5, fontSize: 13 }}>{s2.bizLogo.file.name}</Typography>}
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
              <Button variant="outlined" onClick={back} sx={{ borderRadius: 999, px: 4 }}>Back</Button>
              <Button
                variant="contained"
                onClick={submit}
                disabled={!step2Valid || savingS2}
                sx={{ borderRadius: 999, px: 4, bgcolor: brand.dark, "&:hover": { bgcolor: "#0a4e40" } }}
              >
                {savingS2 ? "Submitting..." : "Submit"}
              </Button>
              {errS2 && <Typography color="error" sx={{ mt: 1 }}>{errS2}</Typography>}
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default RegisterWizard;
