import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { setAuthToken, setBusinessId, setTerminalId } from "../api/client";
import { endpoints, AuthResponse, RegisterRequest, NewUserSetupRequest } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

import {
  Box, Paper, Typography, Stepper, Step, StepLabel, Grid, TextField,
  Button, Checkbox, FormControlLabel, MenuItem, IconButton, InputAdornment, Chip, Link, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Alert
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloudUpload from "@mui/icons-material/CloudUpload";

/* -------------------------------- Countries hook & helpers -------------------------------- */

// ✅ All-countries hook with robust fallback (no extra deps)
function useCountries(locale: string = "en") {
  return React.useMemo(() => {
    const fromIntl = (() => {
      try {
        const maybe = (Intl as any).supportedValuesOf?.("region") ?? [];
        if (Array.isArray(maybe) && maybe.length) return maybe as string[];
      } catch { /* ignore */ }
      return null;
    })();

    const FALLBACK_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");

    const codes = (fromIntl ?? FALLBACK_CODES).filter((c) => /^[A-Z]{2}$/.test(c));
    const dn = new Intl.DisplayNames([locale, "en"], { type: "region" });

    const list = Array.from(
      new Map(
        codes
          .map((code) => {
            const name = dn.of(code) as string | undefined;
            return name ? [code, { code, name }] : null;
          })
          .filter(Boolean) as [string, { code: string; name: string }][]
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return list.length ? list : [{ code: "BW", name: "Botswana" }];
  }, [locale]);
}

// (optional) tiny helper: 🇧🇼 flag next to names
const flagEmoji = (cc: string) =>
  cc && cc.length === 2
    ? String.fromCodePoint(...cc.toUpperCase().split("").map(c => 0x1F1E6 + (c.charCodeAt(0) - 65)))
    : "";

/* -------------------------------- Page constants -------------------------------- */

const brand = { dark: "#0c5b4a", accent: "#d5a626" };
const titles = ["Mr", "Ms", "Mrs", "Dr"];
const genders = ["Male", "Female", "Other"];
const idTypes = ["NATIONAL_ID", "PASSPORT", "DRIVER_LICENSE"] as const;

/* -------------------------------- Policy Dialogs -------------------------------- */

type PolicyDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onAccept: () => void;
  requireScroll?: boolean;
  children: React.ReactNode;
};

function PolicyDialog({ open, title, onClose, onAccept, requireScroll = true, children }: PolicyDialogProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(false);

  const handleScroll = () => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (bottom) setAtBottom(true);
  };

  const canAccept = requireScroll ? atBottom : true;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="policy-dialog-title">
      <DialogTitle id="policy-dialog-title" sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent
        dividers
        onScroll={handleScroll}
        ref={contentRef}
        sx={{
          maxHeight: { xs: "60vh", md: "70vh" },
          "& h3": { fontSize: 18, fontWeight: 800, mt: 2, mb: .5 },
          "& h4": { fontSize: 16, fontWeight: 700, mt: 1.5, mb: .5 },
          "& p, & li": { lineHeight: 1.6 }
        }}
      >
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {requireScroll && !atBottom && (
          <Typography sx={{ mr: "auto" }} variant="body2" color="text.secondary">
            Scroll to the bottom to enable Accept.
          </Typography>
        )}
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => { onAccept(); onClose(); }}
          disabled={!canAccept}
          sx={{ bgcolor: brand.dark, "&:hover": { bgcolor: "#0a4e40" } }}
        >
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* -------------------------------- Policy Content -------------------------------- */

function DataPrivacyContent() {
  return (
    <Box>
      <Typography fontWeight={800}>Ipachi Capital Data & Privacy Policy</Typography>
      <Typography variant="body2" color="text.secondary">Effective Date: 30 January 2025 • Reviewed: Annually • Approved by: Management, Ipachi Capital</Typography>
      <Divider sx={{ my: 2 }} />
      <h3>1. Introduction</h3>
      <Typography>
        Ipachi Capital is committed to protecting the privacy and data of our customers in full compliance with the
        Botswana Data Protection Act (Act 18 of 2024) and other applicable regulations. This policy explains how we
        collect, use, share, protect, and respect customer information while providing innovative financial solutions.
      </Typography>
      <ul>
        <li>Data Protection Policy: Compliance with legal requirements on handling personal data.</li>
        <li>Privacy Policy: Transparency on how customer information is handled.</li>
      </ul>
      <h3>2. Scope</h3>
      <Typography>
        Applies to all employees, contractors, systems, and processes at Ipachi Capital that collect, process, or store
        customer data across our apps, POS systems, and integrated platforms.
      </Typography>
      <h3>3. Principles of Data & Privacy</h3>
      <ul>
        <li>Lawfulness, Fairness & Transparency</li>
        <li>Purpose Limitation</li>
        <li>Data Minimization</li>
        <li>Accuracy</li>
        <li>Storage Limitation</li>
        <li>Integrity & Confidentiality</li>
        <li>Accountability</li>
      </ul>
      <h3>4. Types of Data Collected</h3>
      <ul>
        <li><b>Personal:</b> Names, national IDs, phone numbers, addresses.</li>
        <li><b>Financial:</b> Sales records, payments, loans, mobile money transactions.</li>
        <li><b>Business:</b> Transactions, stock levels, customer traffic patterns.</li>
        <li><b>Technical:</b> Device identifiers, IP addresses, app usage logs.</li>
      </ul>
      <h3>5. Use of Data</h3>
      <ol>
        <li>Assess creditworthiness and provide microfinancing.</li>
        <li>Improve credit scoring accuracy.</li>
        <li>Monitor business performance and provide advisory services.</li>
        <li>Enhance customer experience on Ipachi platforms.</li>
        <li>Fulfil legal and regulatory obligations.</li>
      </ol>
      <h3>6. Data Sharing with Third Parties</h3>
      <ul>
        <li><b>Banks & Financial Institutions:</b> Creditworthiness and financing.</li>
        <li><b>FMCG Companies:</b> Anonymized insights to provide discounted stock offers (no personal identifiers).</li>
      </ul>
      <Typography>All sharing is governed by strict contracts per the Botswana Data Protection Act.</Typography>
      <h3>7. Data Subject Rights</h3>
      <ul>
        <li>Access, correction, deletion (subject to regulation), restriction, objection (incl. marketing), portability, and transparency on automated decisions.</li>
        <li>Requests: via app/web or our DPO.</li>
      </ul>
      <h3>8. Data Security</h3>
      <ul>
        <li>Encryption in transit and at rest</li>
        <li>Role-based access controls</li>
        <li>Secure auth (biometrics/2FA)</li>
        <li>Security audits & penetration tests</li>
        <li>Staff training</li>
      </ul>
      <h3>9. Data Retention</h3>
      <Typography>
        Retained only as long as necessary for services, regulatory compliance, and continuity. Then securely deleted or anonymized.
      </Typography>
      <h3>10. International Data Transfers</h3>
      <ul>
        <li>Adequate protection in destination countries</li>
        <li>Legally binding contracts</li>
        <li>Local copy retained in Botswana as required</li>
      </ul>
      <h3>11. Data Breach Management</h3>
      <ul>
        <li>Notify the Information & Data Protection Commission within 72 hours</li>
        <li>Inform affected customers where high risk exists</li>
        <li>Remedial actions to prevent recurrence</li>
      </ul>
      <h3>12. Privacy Notice</h3>
      <Typography>
        Provided at collection points: what data we collect, why, how it’s used, who it’s shared with, and rights. Available in-app, on our website, and upon request.
      </Typography>
      <h3>13. Governance & Oversight</h3>
      <ul>
        <li>Appointed DPO</li>
        <li>Regular DPIAs</li>
        <li>Annual policy reviews</li>
      </ul>
      <h3>14. Policy Updates</h3>
      <Typography>
        We may update this policy to reflect legal/technical/business changes. Significant updates will be communicated.
      </Typography>
    </Box>
  );
}

function TermsContent() {
  return (
    <Box>
      <Typography fontWeight={800}>Ipachi Capital Terms & Conditions</Typography>
      <Divider sx={{ my: 2 }} />
      <h3>Introduction & Agreement</h3>
      <Typography>
        These Terms govern your use of the Ipachi Capital mobile application and services. By creating an account, you
        agree to be bound by them. Ipachi provides business digitization tools; financing is offered via licensed partners or by Ipachi when applicable.
      </Typography>
      <h3>Services Provided</h3>
      <Typography>
        Subscription-based tools for sales recording, inventory, VAS (airtime/electricity resale), credit scoring, and performance reports.
      </Typography>
      <h3>Subscriptions & Payments</h3>
      <ul>
        <li>Monthly or annual subscriptions</li>
        <li>Non-payment → suspension until settled</li>
        <li>Fees non-refundable unless required by law</li>
      </ul>
      <h3>Account Management & Termination</h3>
      <ul>
        <li>Users may delete accounts; a copy of data will be provided</li>
        <li>We may suspend/terminate for fraud, money laundering, illegal use, or breach</li>
      </ul>
      <h3>Data & Privacy</h3>
      <Typography>
        We process personal data per our Data & Privacy Policy. Data may be shared with banks/licensed non-banks for financing, and anonymized with FMCGs for stock offers. No personal info is disclosed to FMCGs.
      </Typography>
      <h3>System Availability & Downtime</h3>
      <Typography>
        High availability is a goal but not guaranteed; we are not liable for losses due to downtime.
      </Typography>
      <h3>User Obligations</h3>
      <ol>
        <li>Provide complete and accurate information</li>
        <li>Keep credentials confidential</li>
        <li>Use lawfully (no fraud/money laundering)</li>
        <li>Use responsibly without disrupting services</li>
        <li>Cooperate with investigations</li>
        <li>Pay fees on time</li>
      </ol>
      <h3>Prohibited Activities</h3>
      <Typography>
        Fraud, money laundering, unlawful use, reverse engineering, or tampering with Ipachi systems.
      </Typography>
      <h3>Limitation of Liability</h3>
      <Typography>
        Services are provided “as-is”. We are not liable for indirect or consequential damages; liability is capped at the prior month’s subscription fees.
      </Typography>
      <h3>Third-Party Services</h3>
      <Typography>
        Some features rely on third parties (banks, FMCGs). We are not responsible for their quality, accuracy, or reliability.
      </Typography>
      <h3>Intellectual Property</h3>
      <Typography>
        All IP in the platform remains Ipachi’s. Users receive a limited, non-transferable, non-exclusive license for business use.
      </Typography>
      <h3>Dispute Resolution</h3>
      <Typography>
        Governed by Botswana law. Disputes proceed to arbitration/mediation under Botswana law before litigation.
      </Typography>
      <h3>Amendments</h3>
      <Typography>
        We may update these Terms and will notify users via website, email, or other channels. Continued use constitutes acceptance.
      </Typography>
      <h3>Contact</h3>
      <Typography>
        Ipachi Capital, Plot 69184, Block 8, Botswana Innovation Hub Science & Technology Park, Gaborone, Botswana.
        Email: info@ipachi.co.bw • Social: Ipachi Capital
      </Typography>
    </Box>
  );
}

/* -------------------------------- Types & helpers -------------------------------- */

type Step1 = { name: string; surname: string; email: string; password: string; confirm: string; areaCode: string; phone: string; remember: boolean; news: boolean; };

// NOTE: we store ISO country code in `country`
type Step2 = {
  title?: string; gender?: string; dob?: string;
  idType?: string; idNumber?: string;
  postal?: string; physical?: string; city?: string; country?: string; // ISO-2 code
  picture: UploadState; idDoc: UploadState; bizLogo: UploadState;
  bizName?: string; bizLocation?: string;
};

type UploadState = { file?: File; preview?: string };
type MeResponse = { id?: number; userId?: number; username?: string; email?: string };
type TerminalDTO = { id: number; name: string; code: string; active: boolean; createdAt?: string; updatedAt?: string; location?: string | null };
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

/* -------------------------------- Main Component -------------------------------- */

const RegisterWizard: React.FC = () => {
  const nav = useNavigate();
  const { login } = useAuth();

  // All country options (code + localized name)
  const countryOptions = useCountries();

  const [active, setActive] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [savingS1, setSavingS1] = useState(false);
  const [savingS2, setSavingS2] = useState(false);
  const [errS1, setErrS1] = useState<string | null>(null);
  const [errS2, setErrS2] = useState<string | null>(null);

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const [otpOpen, setOtpOpen] = useState(false);

  // Policy/Terms gating (100% frontend)
  const [policyOpen, setPolicyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyViewed, setPolicyViewed] = useState(false);
  const [termsViewed, setTermsViewed] = useState(false);

  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  React.useEffect(() => {
    setOtp(""); setOtpSent(false); setOtpVerified(false); setOtpMsg(null);
  }, [ /* reset when number changes */ ]);

  const [s1, setS1] = useState<Step1>({
    name: "", surname: "", email: "", password: "", confirm: "",
    areaCode: "+267", phone: "", remember: true, news: true
  });

  const [s2, setS2] = useState<Step2>({
    country: "BW",          // ⬅️ store ISO-2 code
    picture: {}, idDoc: {}, bizLogo: {}
  });

  const pwScore = useMemo(() => strength(s1.password), [s1.password]);
  const pwHelper = ["Too short", "Weak", "Okay", "Good", "Strong", "Very strong"][pwScore];

  const back = () => setActive((a) => a - 1);

  const step1ValidCore = Boolean(s1.name && s1.surname && s1.password && s1.password === s1.confirm && s1.phone);
  const step1Valid = step1ValidCore && policyAccepted && termsAccepted;
  const step2Valid = Boolean(s2.idType && s2.idNumber && s2.picture.file && s2.idDoc.file);

  const canSendOtp =
    /^\+?\d{1,4}$/.test((s1.areaCode || "").trim()) &&
    /^\d{5,15}$/.test((s1.phone || "").trim());
  const msisdn = `${s1.areaCode}${s1.phone}`.replace(/\s+/g, "");

  const attach =
    (key: "picture" | "idDoc" | "bizLogo") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setS2((prev) => ({ ...prev, [key]: { file, preview: url } }));
      };

  async function bootstrapContextAfterLogin() {
    try {
      const { data: me } = await api.get<MeResponse>(endpoints.auth.me);
      const uid = (me?.id ?? me?.userId);
      if (uid != null) localStorage.setItem("activeUserId", String(uid));
    } catch { /* ignore */ }

    try {
      let { data: terms } = await api.get<TerminalDTO[]>("/api/terminals");
      if (!Array.isArray(terms) || terms.length === 0) {
        const { data: def } = await api.post<TerminalDTO>("/api/terminals/default");
        setTerminalId(def.id);
      } else {
        setTerminalId(terms[0].id);
      }
    } catch { /* ignore */ }
  }

 async function sendOtp(): Promise<boolean> {
   if (!canSendOtp) {
     setOtpMsg("Enter a valid area code and phone first.");
     return false;
   }
   if (otpCooldown > 0 || sendingOtp) return false;

   try {
     setSendingOtp(true);
     setOtp("");
     setOtpVerified(false);

     await api.post("/api/otp/request", {
       phone: msisdn,
       type: "REGISTRATION",
     });

     setOtpSent(true);
     setOtpCooldown(30);
     setOtpMsg("OTP sent via SMS. Enter it below.");
     return true; // ✅ OTP sent
   } catch (e: any) {
       const msg =
         e?.response?.data?.message ||
         "Failed to send OTP.";

       setOtpSent(false);
       setOtpMsg(msg);   // still useful for dialog / resend
       setErrS1(msg);    // ✅ THIS is what the user will see
       return false;
   } finally {
     setSendingOtp(false);
   }
 }


  async function doRegistration() {
    setSavingS1(true);
    setAuthToken(null);
    try {
const username = `${s1.areaCode}${s1.phone}`.replace(/\s+/g, "");
      const body: RegisterRequest = {
        username,
email: s1.email?.trim() || null,
        password: s1.password,
        areaCode: s1.areaCode,
        phone: s1.phone,
        otp, // server double-check
      } as any;

      await api.post<AuthResponse>(endpoints.auth.register, body);
      await login(username, s1.password);
      await bootstrapContextAfterLogin();
      setActive(1);
    } catch (e: any) {
      setErrS1(e?.response?.data?.message || "Failed to register. Please check details.");
    } finally {
      setSavingS1(false);
    }
  }

  async function verifyOtpThenRegister() {
    setOtpMsg(null);
    if (!otp) { setOtpMsg("Enter the OTP you received."); return; }
    try {
      setVerifyingOtp(true);
      setOtpMsg("Completing registration…");
      await doRegistration();
      setOtpVerified(true);
      setOtpOpen(false);
    } catch (e: any) {
      setOtpVerified(false);
      setOtpMsg(e?.response?.data?.message || "Registration failed.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function registerStep1() {
    setErrS1(null);
    if (!step1ValidCore) {
      setErrS1("Fill in all required fields and ensure passwords match.");
      return;
    }
    if (!policyAccepted || !termsAccepted) {
      setErrS1("You must open and accept the Data & Privacy Policy and the Terms & Conditions to continue.");
      return;
    }
    if (!canSendOtp) {
      setErrS1("Enter a valid mobile number (area code + phone).");
      return;
    }
   if (!otpSent) {
     const ok = await sendOtp();
     if (ok) {
       setOtpOpen(true);   // ✅ only open when OTP sent
     }
     return;
   }

    if (!otp) {
      setOtpMsg("Enter the OTP you received.");
      setOtpOpen(true);
      return;
    }
    await doRegistration();
  }

  async function persistBusinessIdFromServer(hint?: unknown) {
    try {
      const h = (hint ?? {}) as any;
      const possible = h?.businessId ?? h?.businessID ?? h?.bizId ?? h?.business?.id ?? h?.id;
      if (possible != null && `${possible}`.trim() !== "") {
        setBusinessId(String(possible));
        return;
      }
    } catch { /* ignore */ }

    const candidates = ["/api/businesses/mine", "/api/businesses", "/api/business/me", "/api/business/current"];
    for (const path of candidates) {
      try {
        const { data } = await api.get<any>(path);
        const first: BusinessDTO | undefined = Array.isArray(data) ? data[0] : data;
        const bid = first?.businessId ?? first?.id;
        if (bid != null && `${bid}`.trim() !== "") {
          setBusinessId(String(bid));
          return;
        }
      } catch { /* try next */ }
    }
  }

  function clearSession() {
    try { setAuthToken(null); setBusinessId(null); setTerminalId(null); } catch {}
    try {
      localStorage.removeItem("activeUserId");
      localStorage.removeItem("x.business.id");
      localStorage.removeItem("x.terminal.id");
      localStorage.removeItem("auth.token");
      localStorage.removeItem("auth.user");
      sessionStorage.clear();
    } catch {}
  }

  const submit = async () => {
    setErrS2(null); setSavingS2(true);
    try {
      const chosen = countryOptions.find(x => x.code === s2.country);
      const payload: NewUserSetupRequest = {
        title: s2.title, gender: s2.gender, dob: s2.dob || undefined,
        idType: s2.idType, idNumber: s2.idNumber,
        postalAddress: s2.postal, physicalAddress: s2.physical,
        city: s2.city,
        country: chosen?.name ?? s2.country,  // human-readable (optional)
        // @ts-ignore – add to your backend DTO if you want to persist it
        countryCode: s2.country,              // machine-stable ISO-2
        phone: `${s1.areaCode}${s1.phone}`,
        bizName: s2.bizName, bizLocation: s2.bizLocation,
      };

      const form = new FormData();
      form.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      if (s2.picture.file) form.append("picture", s2.picture.file);
      if (s2.idDoc.file)  form.append("idDoc", s2.idDoc.file);
      if (s2.bizLogo.file) form.append("bizLogo", s2.bizLogo.file);

      const { data: setupResp } = await api.post(endpoints.user.setup, form);
      await persistBusinessIdFromServer(setupResp);

      clearSession();
      nav("/login", { replace: true });
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
<Grid item xs={12}>
<TextField
  label="Email (optional)"
  type="email"
  fullWidth
  value={s1.email}
  onChange={(e)=>setS1({...s1, email: e.target.value})}
/>
</Grid>
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
                     <IconButton onClick={()=>setShowPw(p=>!p)}>
                       {showPw ? <VisibilityOff/> : <Visibility/>}
                     </IconButton>
                   </InputAdornment>
                 )
               }}
               helperText={s1.password ? " " : "Enter a password and confirm it below."}
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

            {/* Policies gating UI */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 1 }}>
                You must open and accept the <b>Data & Privacy Policy</b> and the <b>Terms & Conditions</b> to continue.
              </Alert>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Box sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
                  <Typography fontWeight={700} sx={{ mb: .5 }}>Data & Privacy Policy</Typography>
                  <Link component="button" type="button" onClick={() => { setPolicyOpen(true); setPolicyViewed(true); }}>
                    View Data & Privacy Policy
                  </Link>
                  <FormControlLabel
                    sx={{ display: "block", mt: 1 }}
                    control={
                      <Checkbox
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        disabled={!policyViewed}
                      />
                    }
                    label="I have read and accept the Data & Privacy Policy"
                  />
                </Box>

                <Box sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
                  <Typography fontWeight={700} sx={{ mb: .5 }}>Terms & Conditions</Typography>
                  <Link component="button" type="button" onClick={() => { setTermsOpen(true); setTermsViewed(true); }}>
                    View Terms & Conditions
                  </Link>
                  <FormControlLabel
                    sx={{ display: "block", mt: 1 }}
                    control={
                      <Checkbox
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        disabled={!termsViewed}
                      />
                    }
                    label="I have read and accept the Terms & Conditions"
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={registerStep1}
                disabled={!step1Valid || savingS1 || sendingOtp || verifyingOtp}
                sx={{ mt: 1, py: 1.3, borderRadius: 999, bgcolor: brand.dark, "&:hover": { bgcolor: "#0a4e40" } }}
                fullWidth
              >
                {savingS1 ? "Registering..." : "REGISTER"}
              </Button>

              {(!policyAccepted || !termsAccepted) && (
                <Typography color="warning.main" sx={{ mt: 1 }} variant="body2">
                  Please open and accept both documents to enable registration.
                </Typography>
              )}
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

              <Grid item xs={12} md={6}>
                <TextField
                  label="Country"
                  select
                  fullWidth
                  value={s2.country ?? ""}
                  onChange={(e) => setS2({ ...s2, country: e.target.value })}
                >
                  {countryOptions.map((c) => (
                    <MenuItem key={c.code} value={c.name}>
                      <span style={{ marginRight: 8 }}>{flagEmoji(c.code)}</span>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

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

        {/* OTP Dialog */}
        {otpOpen && (
          <Box
            sx={{
              position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)",
              display: "grid", placeItems: "center", zIndex: 1300
            }}
          >
            <Paper sx={{ p: 3, width: "100%", maxWidth: 520, borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Verify your mobile
              </Typography>
              <Typography sx={{ mb: 2 }}>
                We sent an OTP to <b>{msisdn}</b>. Enter it below to continue.
              </Typography>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  autoFocus
                  label="Enter OTP"
                  value={otp}
                  onChange={(e)=>setOtp(e.target.value)}
                  inputProps={{ inputMode: "numeric", maxLength: 8 }}
                  fullWidth
                  disabled={verifyingOtp}
                />
                <Button
                  variant="contained"
                  onClick={verifyOtpThenRegister}
                  disabled={!otp || verifyingOtp}
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  {verifyingOtp ? "Checking…" : "Verify"}
                </Button>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={sendOtp}
                  disabled={!canSendOtp || sendingOtp || otpCooldown > 0}
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  {sendingOtp ? "Sending…" : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                </Button>
                <Button variant="text" onClick={()=> setOtpOpen(false)} sx={{ ml: "auto" }}>
                  Cancel
                </Button>
              </Box>

              {otpMsg && (
                <Typography sx={{ mt: 1 }} color={otpVerified ? "success.main" : "text.secondary"}>
                  {otpMsg}
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Paper>

      {/* DATA & PRIVACY POLICY DIALOG */}
      <PolicyDialog
        open={policyOpen}
        title="Data & Privacy Policy"
        onClose={() => setPolicyOpen(false)}
        onAccept={() => setPolicyAccepted(true)}
        requireScroll
      >
        <DataPrivacyContent />
      </PolicyDialog>

      {/* TERMS & CONDITIONS DIALOG */}
      <PolicyDialog
        open={termsOpen}
        title="Terms & Conditions"
        onClose={() => setTermsOpen(false)}
        onAccept={() => setTermsAccepted(true)}
        requireScroll
      >
        <TermsContent />
      </PolicyDialog>
    </Box>
  );
};

export default RegisterWizard;
