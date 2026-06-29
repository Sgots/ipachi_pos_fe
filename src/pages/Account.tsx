import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Tooltip,
  IconButton,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Avatar,
  LinearProgress,
  Alert,
  Chip,
} from "@mui/material";
import { AxiosProgressEvent } from "axios";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
type UserProfileDTO = {
  id?: number;
  title?: string;
  gender?: string;
  dob?: string | null;
  idType?: string;
  idNumber?: string;
  postalAddress?: string;
  physicalAddress?: string;
  city?: string;
  country?: string;
  areaCode?: string;
  phone?: string;
  hasPicture?: boolean;
  hasIdDoc?: boolean;
  pictureUrl?: string | null;
  idDocUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BusinessProfileDTO = {
  id?: number;
  name?: string;
  location?: string;
  hasLogo?: boolean;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

interface ExtendedUser {
  id?: number;
  username: string;
  email?: string;
  roles?: string[];
  token?: string;
}

type SettingsDTO = {
  currency: string;
  abbreviation: string;
  enableVat: boolean;
  pricesIncludeVat: boolean;
  vatRate: number;
  dataSharingEnabled: boolean;
};
// ✅ Paste this near the top of your file (or in utils/currency.ts)

// A reasonably complete list of *active* ISO 4217 currency codes (2025).
// Excludes special/fund/legacy codes (e.g., XAU, CHW, HRK) on purpose.
const CURRENCY_CODES: string[] = [
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN",
  "BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BRL",
  "BSD","BTN","BWP","BYN","BZD","CAD","CDF","CHF","CLP","CNY",
  "COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP",
  "ERN","ETB","EUR","FJD","FKP","GBP","GEL","GGP","GHS","GIP",
  "GMD","GNF","GTQ","GYD","HKD","HNL","HTG","HUF","IDR","ILS",
  "IMP","INR","IQD","IRR","ISK","JEP","JMD","JOD","JPY","KES",
  "KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP",
  "LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT",
  "MOP","MRU","MUR","MVR","MWK","MXN","MYR","MZN","NAD","NGN",
  "NIO","NOK","NPR","NZD","OMR","PAB","PEN","PGK","PHP","PKR",
  "PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR",
  "SDG","SEK","SGD","SHP","SLE","SOS","SRD","SSP","STN","SYP",
  "SZL","THB","TJS","TMT","TND","TOP","TRY","TTD","TVD","TWD",
  "TZS","UAH","UGX","USD","UYU","UZS","VED","VES","VND","VUV",
  "WST","XAF","XCD","XOF","XPF","YER","ZAR","ZMW","ZWL"
];

// Try to get a readable currency name ("Botswanan Pula").
// Falls back to the code itself if DisplayNames isn't available.
function currencyName(code: string, locale = "en"): string {
  try {
    // @ts-ignore
    const dn = (Intl as any).DisplayNames ? new Intl.DisplayNames([locale], { type: "currency" }) : null;
    return dn?.of(code) || code;
  } catch {
    return code;
  }
}

// Best-effort symbol extractor, e.g., "$", "€", "R", "₱", "₦".
// If we can’t extract a symbol, we just return the code as a fallback.
function currencySymbol(code: string, locale = "en"): string {
  try {
    const fmt = new Intl.NumberFormat(locale, { style: "currency", currency: code, currencyDisplay: "symbol" });
    // Format a simple amount and pull the symbol (characters that aren't digits, decimal/grouping, or space).
    const sample = fmt.format(0);
    // Remove digits, minus, decimal/grouping, and spaces; keep currency glyphs/letters.
    const sym = sample.replace(/[-0-9\s.,]/g, "").trim();
    return sym || code;
  } catch {
    return code;
  }
}

export type CurrencyOption = { code: string; name: string; symbol: string; label: string };

/** Hook: returns [{ code, name, symbol, label }...] sorted by name */
export function useCurrencies(locale: string = "en"): CurrencyOption[] {
  return React.useMemo(() => {
    // If the environment supports it, you *could* discover currencies via
    // Intl.supportedValuesOf('currency'). We keep a static list for reliability across servers.
    // @ts-ignore
    const codes: string[] = CURRENCY_CODES.slice();

    const list = codes.map((code) => {
      const name = currencyName(code, locale);
      const symbol = currencySymbol(code, locale);
      // Example label: "BWP — Botswanan Pula (P)"
      const label = `${code} — ${name}${symbol && symbol !== code ? ` (${symbol})` : ""}`;
      return { code, name, symbol, label };
    });

    // Stable locale-insensitive sort by name (then code)
    return list.sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  }, [locale]);
}

// ---- Effective plan view (matches backend)
type EffectivePlanView = {
  source?: "TRIAL" | "SUBSCRIPTION" | "NONE" | string;
  tier?: string | null;
  planTier?: string | null;
  subscriptionTier?: string | null;
  usersAllowed?: number | null;
  qrCodeLimit?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  trialActive?: boolean;
  trialEndsAt?: string | null;
  plan?: {
    tier?: string | null;
    name?: string | null;
  } | null;
};
/** Local pill tabs */
const PillTabs: React.FC<{
  value: number;
  labels: string[];
  onChange: (index: number) => void;
  sx?: any;
}> = ({ value, labels, onChange, sx }) => {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", ...sx }}>
      {labels.map((label, idx) => {
        const active = value === idx;
        return (
          <Button
            key={label}
            variant={active ? "contained" : "outlined"}
            size="small"
            onClick={() => onChange(idx)}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              px: 2.5,
              py: 1,
              fontWeight: 600,
              bgcolor: active ? "#caa63d" : undefined,
              borderColor: active ? "#caa63d" : undefined,
              color: active ? "#1f2937" : undefined,
              "&:hover": {
                bgcolor: active ? "#b8932f" : undefined,
                borderColor: active ? "#b8932f" : undefined,
              },
            }}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );
};

const Account: React.FC = () => {
  const { user, logout, currentUser, terminalId } = useAuth();
  const [tabValue, setTabValue] = useState(0);
const currencies = useCurrencies("en");

  const roles = (currentUser?.roles ?? []).map((r) => String(r).toUpperCase());
  const roleStr = (currentUser as any)?.role ? String((currentUser as any).role).toUpperCase() : null;
  const isAdmin =
    roles.includes("ADMIN") ||
    roles.includes("ROLE_ADMIN") ||
    roleStr === "ADMIN" ||
    roleStr === "ROLE_ADMIN";

 const bootHeaders = useCallback(() => {
   if (!isAdmin) return;

   const uid = currentUser?.id;
   const tid = terminalId;

   if (uid != null) {
     client.defaults.headers.common["X-User-Id"] = String(uid);
   } else {
     delete client.defaults.headers.common["X-User-Id"];
   }

   if (tid != null && String(tid).trim() !== "") {
     client.defaults.headers.common["X-Terminal-Id"] = String(tid);
   } else {
     delete client.defaults.headers.common["X-Terminal-Id"];
   }

   // Important:
   // Account must not inherit the SME report context.
   delete client.defaults.headers.common["X-Business-Id"];
 }, [currentUser?.id, terminalId, isAdmin]);

  useEffect(() => {
    void bootHeaders();
  }, [bootHeaders]);

  const [aboutMe, setAboutMe] = useState<UserProfileDTO>({
    title: "Mr",
    gender: "Male",
    dob: "2025-02-05",
    idType: "NATIONAL_ID",
    idNumber: "552524",
    postalAddress: "Gaborone",
    physicalAddress: "12134",
    city: "Gaborone",
    country: "Botswana",
    areaCode: "234",
    phone: "+267574050",
    hasPicture: true,
    hasIdDoc: true,
  });

const [business, setBusiness] = useState<BusinessProfileDTO>({
  name: "",
  location: "",
  hasLogo: true,
});

const [ownBusinessId, setOwnBusinessId] = useState<string>("");
const [settings, setSettings] = useState<SettingsDTO>({
  currency: "BWP",
  abbreviation: "P",
  enableVat: false,
  pricesIncludeVat: false,
  vatRate: 0,
  dataSharingEnabled: true,
});

  // ---- NEW: effective plan
  const [effectivePlan, setEffectivePlan] = useState<EffectivePlanView | null>(null);

  // ---- NEW: code redemption UI
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [profileBlobUrl, setProfileBlobUrl] = useState<string | null>(null);
  const [businessBlobUrl, setBusinessBlobUrl] = useState<string | null>(null);

  const userPictureEndpoint = "/api/user-profile/picture";
  const userIdDocEndpoint = "/api/user-profile/id-doc";
  const businessLogoEndpoint = "/api/business-profile/logo/file";

const resolveAssetUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path; // absolute stays absolute

  const base = (client as any).defaults?.baseURL;
  if (typeof base === "string" && base.trim() !== "") {
    return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
  }
  // same-origin (nginx on 80/443 will proxy /api)
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
};


 const authenticatedDownload = async (url: string, suggestedName = "file") => {
   try {
     // keep relative paths relative (same-origin), pass absolute URLs through
     const requestUrl = /^https?:\/\//i.test(url)
       ? url
       : url.startsWith("/")
         ? url
         : `/${url}`;

     const { data, headers } = await client.get(requestUrl, { responseType: "blob" });
     const blob = new Blob([data], { type: headers["content-type"] || "application/octet-stream" });
     const objectUrl = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = objectUrl;
     const cd = headers["content-disposition"] as string | undefined;
     const m = cd && /filename="([^"]+)"/i.exec(cd);
     a.download = m?.[1] || suggestedName;
     document.body.appendChild(a);
     a.click();
     a.remove();
     URL.revokeObjectURL(objectUrl);
   } catch (e) {
     console.error("Download failed:", e);
     alert("Download failed");
   }
 };


  const getUserInitial = (): string | null => {
    if (!user) return null;
    const displayName = (user as ExtendedUser).email || user.username || "";
    return displayName.charAt(0).toUpperCase() || null;
  };

  // Load profile, business, settings
   // Load profile, business, settings
   useEffect(() => {
     if (!isAdmin) return;

     let cancelled = false;

     const loadAccountData = async () => {
       try {
         bootHeaders();

         // Account must always start clean, not from selected SME report.
         delete client.defaults.headers.common["X-Business-Id"];

         const userProfileRes = await client.get("/api/user-profile");
         const userProfileData = userProfileRes.data?.data ?? userProfileRes.data;

         if (!cancelled && userProfileData) {
           setAboutMe((prev) => ({
             ...prev,
             ...userProfileData,
             hasPicture: userProfileData.hasPicture ?? prev.hasPicture,
             hasIdDoc: userProfileData.hasIdDoc ?? prev.hasIdDoc,
             pictureUrl: userProfileData.pictureUrl ?? prev.pictureUrl ?? null,
             idDocUrl: userProfileData.idDocUrl ?? prev.idDocUrl ?? null,
             createdAt: userProfileData.createdAt ?? prev.createdAt,
             updatedAt: userProfileData.updatedAt ?? prev.updatedAt,
           }));
         }

         const businessRes = await client.get("/api/business-profile");
         const businessData = businessRes.data?.data ?? businessRes.data;

         if (!cancelled && businessData) {
           setBusiness((prev) => ({
             ...prev,
             ...businessData,
             logoUrl: businessData.logoUrl ?? prev.logoUrl ?? null,
             createdAt: businessData.createdAt ?? prev.createdAt,
             updatedAt: businessData.updatedAt ?? prev.updatedAt,
           }));

           const bid =
             businessData?.id ??
             businessData?.businessId ??
             businessData?.business?.id ??
             null;

           if (bid != null) {
             const ownId = String(bid);

             setOwnBusinessId(ownId);

             // Store logged-in user's own business separately.
             window.localStorage.setItem("x.own.business.id", ownId);

             // Account now uses the logged-in user's business context.
             client.defaults.headers.common["X-Business-Id"] = ownId;
           }
         }

         const settingsRes = await client.get("/api/settings");
         const settingsData = settingsRes.data?.data ?? settingsRes.data;

         if (!cancelled && settingsData) {
           const enableVat = !!settingsData.enableVat;

          setSettings((prev) => ({
            currency: settingsData.currency ?? prev.currency,
            abbreviation: settingsData.abbreviation ?? prev.abbreviation,
            enableVat,
            pricesIncludeVat: enableVat,
            vatRate: Number(settingsData.vatRate ?? prev.vatRate) || 0,

            // Default ON if backend has not returned the field yet.
            dataSharingEnabled:
              settingsData.dataSharingEnabled === undefined ||
              settingsData.dataSharingEnabled === null
                ? true
                : Boolean(settingsData.dataSharingEnabled),
          }));
         }
       } catch (error) {
         console.error("Failed to load account data:", error);
       }
     };

     void loadAccountData();

     return () => {
       cancelled = true;
     };
   }, [isAdmin, bootHeaders]);

   // ---- Load effective plan using /api/subscriptions/business/{businessId}/effective-plan
   const loadEffectivePlan = useCallback(async () => {
     if (!isAdmin) return;

     const bid =
       ownBusinessId ||
       localStorage.getItem("x.own.business.id") ||
       (business?.id != null ? String(business.id) : "");

     if (!bid || bid === "null" || bid === "undefined") {
       setEffectivePlan(null);
       return;
     }

     try {
       client.defaults.headers.common["X-Business-Id"] = bid;

       const res = await client.get(`/api/subscriptions/business/${bid}/effective-plan`);
       const payload = res.data?.data ?? res.data ?? null;

       console.log("Effective plan loaded for own business:", bid, payload);

       setEffectivePlan(payload);
     } catch (error) {
       console.error("Failed to load effective plan:", error);
       setEffectivePlan(null);
     }
   }, [isAdmin, ownBusinessId, business?.id]);

   useEffect(() => {
     void loadEffectivePlan();
   }, [loadEffectivePlan]);

  // Fetch blobs
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const cleanup = () => {
      if (profileBlobUrl) URL.revokeObjectURL(profileBlobUrl);
    };

    const fetchProfilePicture = async () => {
      cleanup();
      setProfileBlobUrl(null);

      const path = aboutMe.pictureUrl ?? (aboutMe.hasPicture ? userPictureEndpoint : null);
      if (!path) return;

      const fullUrl = resolveAssetUrl(path);
      try {
        const resp = await client.get(fullUrl, { responseType: "blob" });
        if (cancelled) return;
        const blob = resp.data as Blob;
        const blobUrl = URL.createObjectURL(blob);
        setProfileBlobUrl(blobUrl);
      } catch (err) {
        console.error("Failed to fetch profile picture blob:", err);
        setProfileBlobUrl(null);
      }
    };

    fetchProfilePicture();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [aboutMe.pictureUrl, aboutMe.hasPicture, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const cleanup = () => {
      if (businessBlobUrl) URL.revokeObjectURL(businessBlobUrl);
    };

    const fetchBusinessLogo = async () => {
      cleanup();
      setBusinessBlobUrl(null);

      const path = business.logoUrl ?? (business.hasLogo ? businessLogoEndpoint : null);
      if (!path) return;

      const fullUrl = resolveAssetUrl(path);
      try {
        const resp = await client.get(fullUrl, { responseType: "blob" });
        if (cancelled) return;
        const blob = resp.data as Blob;
        const blobUrl = URL.createObjectURL(blob);
        setBusinessBlobUrl(blobUrl);
      } catch (err) {
        console.error("Failed to fetch business logo blob:", err);
        setBusinessBlobUrl(null);
      }
    };

    fetchBusinessLogo();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [business.logoUrl, business.hasLogo, isAdmin]);

  const handleTabChange = (_evt: React.SyntheticEvent | null, newValue: number) => {
    setTabValue(newValue);
  };

  const saveAboutMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await client.put("/api/user-profile", aboutMe);
    alert("Profile updated");
    client.get("/api/user-profile").then((res) => {
      const data = res.data?.data ?? res.data;
      if (data) setAboutMe((prev) => ({ ...prev, ...data }));
    });
  };

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await client.put("/api/business-profile", business);
    alert("Business updated");
    client.get("/api/business-profile").then((res) => {
      const data = res.data?.data ?? res.data;
      if (data) {
        setBusiness((prev) => ({ ...prev, ...data }));
        const bid = data?.id ?? data?.businessId ?? data?.business?.id;
        if (bid != null) {
         const ownId = String(bid);

         setOwnBusinessId(ownId);
         client.defaults.headers.common["X-Business-Id"] = ownId;
         window.localStorage.setItem("x.own.business.id", ownId);
        }
      }
    });
  };

  const normalizedVatRate = (v: number) => {
    if (!Number.isFinite(v)) return 0;
    const clamped = Math.max(0, Math.min(99.99, v));
    return Math.round(clamped * 100) / 100;
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const enableVat = !!settings.enableVat;

  const body = {
    currency: settings.currency,
    abbreviation: settings.abbreviation,
    enableVat,
    pricesIncludeVat: enableVat,
    vatRate: normalizedVatRate(Number(settings.vatRate)),
    dataSharingEnabled: Boolean(settings.dataSharingEnabled),
  };
    await client.put("/api/settings", body);
    alert("Settings saved");
    client.get("/api/settings").then((res) => {
      const data = res.data?.data ?? res.data;
      if (data) {
        const enableVatSrv = !!data.enableVat;
        setSettings({
          currency: data.currency ?? body.currency,
          abbreviation: data.abbreviation ?? body.abbreviation,
          enableVat: enableVatSrv,
          pricesIncludeVat: enableVatSrv,
          vatRate: Number(data.vatRate ?? body.vatRate) || 0,
          dataSharingEnabled:
            data.dataSharingEnabled === undefined || data.dataSharingEnabled === null
              ? body.dataSharingEnabled
              : Boolean(data.dataSharingEnabled),
        });
      }
    });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (newPassword !== confirmPassword) return alert("Passwords don't match");
    await client.post("/api/change-password", { oldPassword, newPassword });
    alert("Password changed");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const deactivate = async () => {
    if (!isAdmin) return;
    if (window.confirm("Deactivate account?")) {
      await client.delete("/api/deactivate");
      logout();
    }
  };

  const uploadFile = async (endpoint: string, file: File) => {
    if (!isAdmin) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploadProgress(0);
    try {
      await client.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      await Promise.all([
        client
          .get("/api/user-profile")
          .then((r) => setAboutMe((p) => ({ ...p, ...((r.data?.data ?? r.data) || {}) })))
          .catch(() => {}),
        client
          .get("/api/business-profile")
          .then((r) => {
            const data = (r.data?.data ?? r.data) || {};
            setBusiness((p) => ({ ...p, ...data }));
            const bid = data?.id ?? data?.businessId ?? data?.business?.id;
            if (bid != null) {
             const ownId = String(bid);

             setOwnBusinessId(ownId);
             client.defaults.headers.common["X-Business-Id"] = ownId;
             window.localStorage.setItem("x.own.business.id", ownId);
            }
          })
          .catch(() => {}),
      ]);

      alert("Upload successful");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploadProgress(null);
    }
  };

  const onPictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const f = e.target.files?.[0];
    if (f) uploadFile(userPictureEndpoint, f);
  };
  const onIdDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const f = e.target.files?.[0];
    if (f) uploadFile(userIdDocEndpoint, f);
  };
  const onLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const f = e.target.files?.[0];
    if (f) uploadFile(businessLogoEndpoint, f);
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d as string;
    }
  };

  // ---- Helpers for plan UI
  const src = String(effectivePlan?.source || "").toUpperCase();
  const tier = String(effectivePlan?.tier || "").toUpperCase();
  const isTrial = src === "TRIAL";
  const activeBannerLabel = isTrial ? "FREE TRIAL (Platinum features)" : tier || null;
  const activeExpiry = effectivePlan?.validUntil || effectivePlan?.trialEndsAt || null;

  // Highlight FREE TRIAL (not Premium) when on trial
  const cardIsActive = (planName: string) => {
    if (!effectivePlan) return false;
    if (isTrial) return planName.toUpperCase() === "FREE TRIAL";
    return planName.toUpperCase() === tier;
  };

  const daysLeft = activeExpiry
    ? Math.max(
        0,
        Math.ceil((new Date(activeExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;
type SubscriptionPlanCard = {
  name: string;
  displayName?: string;
  price: string;
  annualPrice?: string;
  features: string[];
  iconColor: string;
};

const REPORTING_PLAN_TIERS = ["INTELLIGENCE", "DISCOVER", "MONITOR"];

const showReportingPlansOnly = REPORTING_PLAN_TIERS.includes(tier);
const isSmePlan = !REPORTING_PLAN_TIERS.includes(tier);
const reportingPlans: SubscriptionPlanCard[] = [
  {
    name: "DISCOVER",
    displayName: "Ipachi Discover Plan",
    price: "P5,000/month",
    features: [
      "SME Directory",
      "Search & Filters",
      "100 Dashboard Views",
      "100 Report Downloads (Chart Analytics)",
      "Standard Support",
    ],
    iconColor: "#2f7ae5",
  },
  {
    name: "MONITOR",
    displayName: "Ipachi Monitor Plan",
    price: "P15,000/month",
    features: [
      "Everything in Discover plus:",
      "Live SME Monitoring",
      "Business Performance Trends",
      "500 Dashboard Views",
      "500 Report Downloads (Comprehensive Reports)",
      "Alerts & Notifications",
      "Priority Support",
    ],
    iconColor: "#10b981",
  },
  {
    name: "INTELLIGENCE",
    displayName: "Ipachi Intelligence Plan",
    price: "P30,000/month",
    features: [
      "Everything in Ipachi Monitor plus:",
      "Unlimited Views",
      "Unlimited Downloads",
      "Automated Risk Scoring",
      "Credit Recommendations",
      "Portfolio Monitoring",
      "API Access",
      "Dedicated Relationship Manager",
      "Advanced Analytics",
    ],
    iconColor: "#6d28d9",
  },
];
const smeSubscriptionPlans: SubscriptionPlanCard[] = [
  {
    name: "FREE TRIAL",
    price: "7 Days Free",
    features: ["Platinum features access"],
    iconColor: "#4caf50",
  },
  {
    name: "BRONZE",
    price: "P50/month",
    features: ["1 user", "Loan up to P1,000", "Inventory, sales & reports"],
    iconColor: "#cd7f32",
  },
  {
    name: "SILVER",
    price: "P100/month",
    features: ["2 users", "Loan up to P2,500", "Inventory, sales & reports"],
    iconColor: "#c0c0c0",
  },
  {
    name: "GOLD",
    price: "P150/month",
    features: [
      "5 users",
      "Loan up to P5,000",
      "Funeral cover P10,000",
      "Inventory, sales & reports",
    ],
    iconColor: "#ffd700",
  },
  {
    name: "PLATINUM",
    price: "P250/month",
    features: [
      "10 users",
      "Loan up to P10,000",
      "Funeral cover P25,000",
      "Comprehensive reports",
      "Priority support",
      "Free staff training",
    ],
    iconColor: "#e5e4e2",
  },
];

const visibleSubscriptionPlans = showReportingPlansOnly
  ? reportingPlans
  : smeSubscriptionPlans;
  // ---- Code formatting & redemption
const getBusinessId = (): number | null => {
  const ownId =
    ownBusinessId ||
    localStorage.getItem("x.own.business.id") ||
    "";

  if (ownId && ownId !== "null" && ownId !== "undefined") {
    return Number(ownId);
  }

  if (business?.id != null) {
    return Number(business.id);
  }

  return null;
};

const normalizeCode = (raw: string) => {
  // Remove all non-alphanumeric characters and uppercase
  const cleanValue = (raw || "").replace(/[^A-Z0-9]/g, "").toUpperCase();
  // Group into chunks of 4 and join with hyphens
  let formatted = cleanValue.match(/.{1,4}/g)?.join("-") || cleanValue;
  // Append a hyphen after full groups of 4 (i.e., at length 4, 8, 12)
  if (cleanValue.length > 0 && cleanValue.length % 4 === 0 && cleanValue.length <= 12) {
    formatted += "-";
  }
  return formatted;
};
// --- Code formatter: identical logic to ActivateSubscription.tsx
const formatCode = (value: string): string => {
  // Remove all non-alphanumeric characters and uppercase
  const cleanValue = (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  // Add hyphens after 4th, 8th, and 12th characters
  let formatted = "";
  for (let i = 0; i < cleanValue.length; i++) {
    formatted += cleanValue[i];
    if (i === 3 || i === 7 || i === 11) {
      formatted += "-";
    }
  }
  return formatted;
};

  const redeemCode = async () => {
    setCodeMsg(null);
    const businessId = getBusinessId();
    if (!businessId) {
      setCodeMsg({ type: "error", text: "Business not found. Please refresh and try again." });
      return;
    }
    const cleanCode = codeInput.replace(/-/g, "");
    if (!cleanCode || cleanCode.length < 12) {
      setCodeMsg({ type: "error", text: "Enter a valid code (e.g., XXXX-XXXX-XXXX-XXXX)." });
      return;
    }

    setCodeBusy(true);
    try {
      await client.post("/api/subscriptions/activate", { code: cleanCode, businessId });
      setCodeMsg({ type: "success", text: "Subscription activated successfully." });
      setCodeInput("");
      // Refresh effective plan
      await loadEffectivePlan();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "Activation failed. Check your code and try again.";
      setCodeMsg({ type: "error", text: String(msg) });
    } finally {
      setCodeBusy(false);
    }
  };

const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setCodeInput(formatCode(e.target.value));
};

  // ---- Start free trial (once-off; backend enforces once-ever)
  const [trialBusy, setTrialBusy] = useState(false);
  const startTrial = async () => {
    setCodeMsg(null);
    const businessId = getBusinessId();
    if (!businessId) {
      setCodeMsg({ type: "error", text: "Business not found. Please refresh and try again." });
      return;
    }
    setTrialBusy(true);
    try {
      await client.post("/api/subscriptions/trial/start", {
        businessId,
        activatedByUserId: currentUser?.id ?? null,
        ip: undefined,
      });
      await loadEffectivePlan();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "Could not start a free trial.";
      setCodeMsg({ type: "error", text: String(msg) });
    } finally {
      setTrialBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Access denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Only administrators can view or modify Account settings on this device.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9fafb" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Account
      </Typography>

      <PillTabs
        value={tabValue}
        onChange={(i) => handleTabChange(null, i)}
        labels={["ABOUT ME", "MY BUSINESS", "SUBSCRIPTIONS", "SETTINGS"]}
        sx={{ mb: 3 }}
      />

      {/* ABOUT ME */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">About Me</Typography>

          <form onSubmit={saveAboutMe}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 1 }}>
                  <Avatar
                    src={
                      profileBlobUrl ??
                      (aboutMe.pictureUrl
                        ? resolveAssetUrl(aboutMe.pictureUrl)
                        : aboutMe.hasPicture
                        ? resolveAssetUrl(userPictureEndpoint)
                        : "")
                    }
                    alt={aboutMe.title ?? "User"}
                    sx={{ width: 120, height: 120, bgcolor: "#e0e0e0" }}
                  >
                    {!aboutMe.hasPicture && getUserInitial()}
                  </Avatar>

                  {aboutMe.hasPicture ? (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() =>
                          aboutMe.pictureUrl ? authenticatedDownload(aboutMe.pictureUrl, "profile-picture") : undefined
                        }
                      >
                        Download
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No profile picture
                    </Typography>
                  )}

                  <input id="profile-pic" type="file" accept="image/*" style={{ display: "none" }} onChange={onPictureSelect} />
                  <label htmlFor="profile-pic">
                    <Button component="span" sx={{ mt: 1 }}>
                      Upload / Replace Picture
                    </Button>
                  </label>
                  {uploadProgress !== null && (
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ width: "100%", mt: 1 }} />
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Title</InputLabel>
                      <Select
                        value={aboutMe.title ?? ""}
                        label="Title"
                        onChange={(e) => setAboutMe({ ...aboutMe, title: e.target.value as string })}
                      >
                        <MenuItem value="">—</MenuItem>
                        <MenuItem value="Mr">Mr</MenuItem>
                        <MenuItem value="Ms">Ms</MenuItem>
                        <MenuItem value="Dr">Dr</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Gender</InputLabel>
                      <Select
                        value={aboutMe.gender ?? ""}
                        label="Gender"
                        onChange={(e) => setAboutMe({ ...aboutMe, gender: e.target.value as string })}
                      >
                        <MenuItem value="">—</MenuItem>
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Date of Birth"
                      type="date"
                      value={aboutMe.dob ? aboutMe.dob.substring(0, 10) : ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, dob: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>ID Type</InputLabel>
                      <Select
                        value={aboutMe.idType ?? ""}
                        onChange={(e) => setAboutMe({ ...aboutMe, idType: e.target.value as string })}
                        label="ID Type"
                      >
                        <MenuItem value="">—</MenuItem>
                        <MenuItem value="NATIONAL_ID">National ID</MenuItem>
                        <MenuItem value="PASSPORT">Passport</MenuItem>
                        <MenuItem value="DRIVER_LICENSE">Driver License</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="ID Number"
                      value={aboutMe.idNumber ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, idNumber: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      value={aboutMe.phone ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, phone: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Postal Address"
                      value={aboutMe.postalAddress ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, postalAddress: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Physical Address"
                      value={aboutMe.physicalAddress ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, physicalAddress: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="City"
                      value={aboutMe.city ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, city: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Country"
                      value={aboutMe.country ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, country: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Area / Postal Code"
                      value={aboutMe.areaCode ?? ""}
                      onChange={(e) => setAboutMe({ ...aboutMe, areaCode: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        ID document:{" "}
                        {aboutMe.hasIdDoc ? (
                          <>
                            {aboutMe.idDocUrl && (
                              <Button onClick={() => authenticatedDownload(aboutMe.idDocUrl!, "id-document")}>
                                Download
                              </Button>
                            )}
                          </>
                        ) : (
                          "not provided"
                        )}
                      </Typography>

                      <Box>
                        <input id="id-doc" type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={onIdDocSelect} />
                        <label htmlFor="id-doc">
                          <Button component="span">Upload / Replace ID Document</Button>
                        </label>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sx={{ display: "flex", gap: 2 }}>
                    <Button type="submit" variant="contained" sx={{ backgroundColor: "#4caf50" }}>
                      Update Profile
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Created
                        </Typography>
                        <Typography>{formatDate(aboutMe.createdAt)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Last updated
                        </Typography>
                        <Typography>{formatDate(aboutMe.updatedAt)}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      {/* MY BUSINESS */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">My Business</Typography>

          <form onSubmit={saveBusiness}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 1 }}>
                  <Avatar
                    src={
                      businessBlobUrl ??
                      (business.logoUrl
                        ? resolveAssetUrl(business.logoUrl)
                        : business.hasLogo
                        ? resolveAssetUrl(businessLogoEndpoint)
                        : "")
                    }
                    sx={{ width: 120, height: 120, bgcolor: "#e0e0e0" }}
                  >
                    {!business.hasLogo && business.name ? business.name.charAt(0).toUpperCase() : "B"}
                  </Avatar>

                  {business.hasLogo ? (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() =>
                          business.logoUrl ? authenticatedDownload(business.logoUrl, "business-logo") : undefined
                        }
                      >
                        Download
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No logo uploaded
                    </Typography>
                  )}

                  <input id="business-logo" type="file" accept="image/*" style={{ display: "none" }} onChange={onLogoSelect} />
                  <label htmlFor="business-logo">
                    <Button component="span" sx={{ mt: 1 }}>
                      Upload / Replace Logo
                    </Button>
                  </label>
                  {uploadProgress !== null && (
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ width: "100%", mt: 1 }} />
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Business Name"
                      value={business.name ?? ""}
                      onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Location / Address"
                      value={business.location ?? ""}
                      onChange={(e) => setBusiness({ ...business, location: e.target.value })}
                      fullWidth
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ display: "flex", gap: 2 }}>
                    <Button type="submit" variant="contained" sx={{ backgroundColor: "#4caf50" }}>
                      Update Business
                    </Button>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Created
                        </Typography>
                        <Typography>{formatDate(business.createdAt)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Last updated
                        </Typography>
                        <Typography>{formatDate(business.updatedAt)}</Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      {/* SUBSCRIPTIONS */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Subscriptions
          </Typography>

          {/* Active plan banner */}
          {effectivePlan && src !== "NONE" ? (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              <strong>Active:</strong> {activeBannerLabel ? activeBannerLabel : "—"} —{" "}
              <strong>Expiry:</strong> {activeExpiry ? formatDate(activeExpiry) : "No expiry set"}
              {daysLeft !== null && daysLeft <= 5 && (
                <span style={{ marginLeft: 12, fontWeight: 600 }}>
                  • Heads up: {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                </span>
              )}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              You don’t have an active subscription yet.
            </Alert>
          )}

          {/* Redeem code + Start trial */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Have a subscription code?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Enter your code to activate a plan, upgrade from a trial, or renew an expiring subscription.
                </Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
               <TextField
                 label="Subscription Code"
                 placeholder="XXXX-XXXX-XXXX-XXXX"
                 value={codeInput}
                 onChange={handleCodeChange}
                 onKeyDown={(e) => {
                   if (e.key === "Enter") {
                     e.preventDefault();
                     redeemCode();
                   }
                 }}
                 // ⬇️ keep maxLength at 19 (16 chars + 3 hyphens)
                 inputProps={{ maxLength: 19, type: "text", inputMode: "text" }}
                 disabled={codeBusy}
                 sx={{ minWidth: 260 }}
                 // ⬇️ (nice-to-have) ensure pasted text is also normalized
                 onPaste={(evt) => {
                   evt.preventDefault();
                   const pasted = (evt.clipboardData || (window as any).clipboardData).getData("text");
                   setCodeInput(formatCode(pasted));
                 }}
               />

                  <Button
                    variant="contained"
                    onClick={redeemCode}
                    disabled={codeBusy || !codeInput.replace(/-/g, "").trim()}
                  >
                    {codeBusy ? "Applying..." : "Apply Code"}
                  </Button>
                  {isTrial && (
                    <Chip
                      color="success"
                      size="small"
                      label="You're on a FREE TRIAL"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Box>
                {codeMsg && (
                  <Alert
                    severity={codeMsg.type}
                    sx={{ mt: 1, borderRadius: 2 }}
                    onClose={() => setCodeMsg(null)}
                  >
                    {codeMsg.text}
                  </Alert>
                )}
              </Grid>

              <Grid item xs={12} md={5}>
                {(!effectivePlan || src === "NONE") && (
                  <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      New here?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Try the platform with a 7-day FREE TRIAL (Platinum features).
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={startTrial}
                      disabled={trialBusy}
                      sx={{ fontWeight: 600 }}
                    >
                      {trialBusy ? "Starting..." : "Start Free Trial"}
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Save 30% by subscribing annually.
          </Typography>

        <Grid container spacing={3} justifyContent="center">
          {visibleSubscriptionPlans.map((plan) => {
            const isActiveCard = cardIsActive(plan.name);

            return (
              <Grid
                item
                xs={12}
                sm={6}
                md={showReportingPlansOnly ? 4 : 2.4}
                key={plan.displayName ?? plan.name}
              >
                <Card
                  sx={{
                    textAlign: "center",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    borderRadius: 2,
                    position: "relative",
                    ...(isActiveCard
                      ? {
                          border: "2px solid #4caf50",
                          boxShadow: "0 6px 18px rgba(76,175,80,0.25)",
                          transform: "scale(1.02)",
                        }
                      : {}),
                  }}
                >
                  {isActiveCard && (
                    <Chip
                      label={isTrial ? "TRIAL" : "ACTIVE"}
                      color="success"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  <CardContent>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: plan.iconColor,
                        mx: "auto",
                        mb: 2,
                      }}
                    />

                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {plan.name}
                    </Typography>

                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {plan.price}
                    </Typography>

                    {plan.annualPrice && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        or {plan.annualPrice} (Save 30%)
                      </Typography>
                    )}

                    {plan.features.map((feature) => (
                      <Typography key={feature} variant="body2" sx={{ mb: 0.5 }}>
                        {feature}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        </Box>
      )}

      {/* SETTINGS */}
      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Business & Tax Settings
          </Typography>
          <form onSubmit={saveSettings}>
           <FormControl fullWidth sx={{ mb: 2 }}>
             <InputLabel>Select Currency</InputLabel>
             <Select
               value={settings.currency}
               label="Select Currency"
               onChange={(e) => {
                 const code = e.target.value as string;
                 const found = currencies.find((c) => c.code === code);
                 setSettings((prev) => ({
                   ...prev,
                   currency: code,
                   // Auto-fill/refresh the abbreviation to the symbol when currency changes
                   abbreviation: found?.symbol || code,
                 }));
               }}
               renderValue={(val) => {
                 const found = currencies.find((c) => c.code === val);
                 return found ? found.label : String(val);
               }}
               MenuProps={{ PaperProps: { style: { maxHeight: 420 } } }}
             >
               {currencies.map((c) => (
                 <MenuItem key={c.code} value={c.code}>
                   {c.label}
                 </MenuItem>
               ))}
             </Select>
           </FormControl>
            <TextField
              label="Preferred Abbreviation"
              value={settings.abbreviation}
              onChange={(e) => setSettings({ ...settings, abbreviation: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              VAT
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={!!settings.enableVat}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      enableVat: e.target.checked,
                      pricesIncludeVat: e.target.checked,
                    }))
                  }
                  color="primary"
                />
              }
              label="Enable VAT"
              sx={{ mb: 2 }}
            />

            <TextField
              label="VAT Rate (%)"
              value={String(settings.vatRate ?? 0)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  vatRate: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0,
                })
              }
              InputProps={{ inputMode: "decimal" }}
              fullWidth
              disabled={!settings.enableVat}
              helperText="Example: 14 for 14% (max 99.99)"
              sx={{ mb: 2 }}
            />
{isSmePlan && (
  <>
    <Divider sx={{ my: 2 }} />

    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
      Business Data Sharing
    </Typography>

    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        bgcolor: "#f9fafb",
        border: "1px solid #e5e7eb",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>
            Allow authorized service providers to discover and assess my business
          </Typography>

          <Tooltip
            arrow
            placement="top"
            title={
              settings.dataSharingEnabled
                ? "I agree to securely share my business data with authorized service providers so they can assess my business and offer relevant financial and business services. My data will only be accessed with my consent and in accordance with Ipachi's Privacy Policy."
                : "Turning off data sharing means banks, lenders, investors, insurers, and other authorized service providers will not be able to discover your business or assess your reports. As a result, you may not receive certain funding opportunities, business services, or personalized offers."
            }
          >
            <IconButton size="small" aria-label="Business data sharing information">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Switch
          checked={settings.dataSharingEnabled}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              dataSharingEnabled: e.target.checked,
            }))
          }
          color="primary"
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {settings.dataSharingEnabled
          ? "Data sharing is currently ON. Authorized service providers may discover your business and assess your reports with your consent."
          : "Data sharing is currently OFF. Your business will not be visible for service-provider assessment or offers."}
      </Typography>
    </Box>
  </>
)}
            <Button type="submit" variant="contained" sx={{ backgroundColor: "#4caf50", mt: 1 }}>
              Update
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Security
          </Typography>
          <form onSubmit={changePassword}>
            <TextField
              label="Old Password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" sx={{ backgroundColor: "#4caf50" }}>
              Update
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Account
          </Typography>
          <Button variant="contained" color="error" onClick={deactivate}>
            Deactivate
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Account;