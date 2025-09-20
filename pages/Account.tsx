// src/pages/Account.tsx - Pill-style tabs to match Inventory (fixed Promise.all syntax)
import React, { useState, useEffect } from "react";
import {
  Box,
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
  CardActions,
  Divider,
  FormControl,
  InputLabel,
  Avatar,
  Link,
  LinearProgress,
} from "@mui/material";
import { AxiosProgressEvent } from "axios";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

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

/** Local pill tabs component (matches Inventory look & feel) */
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
              bgcolor: active ? "#caa63d" : undefined, // gold-ish active
              borderColor: active ? "#caa63d" : undefined,
              color: active ? "#1f2937" : undefined, // slate-800 on active
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
  const { user, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Profile & business state
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
    id: 1,
    name: "Aminaami",
    location: "Aminaami",
    hasLogo: true,
  });

  // Settings / security
  const [settings, setSettings] = useState({
    currency: "PHP",
    abbreviation: "P",
    vat: "12",
    applyVat: false,
  });
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // upload progress
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // blob URLs for authenticated image fetches
  const [profileBlobUrl, setProfileBlobUrl] = useState<string | null>(null);
  const [businessBlobUrl, setBusinessBlobUrl] = useState<string | null>(null);

  // fallback endpoints (if backend does not provide full URLs)
  const userPictureEndpoint = "/api/user-profile/picture";
  const userIdDocEndpoint = "/api/user-profile/id-doc";
  const businessLogoEndpoint = "/api/business-profile/logo";

  // Helper: resolve relative path into absolute using axios baseURL or fallback to localhost:8080
  const resolveAssetUrl = (path?: string | null) => {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path;
    const axiosBase = (client as any).defaults?.baseURL ?? "";
    if (axiosBase) return axiosBase.replace(/\/$/, "") + path;
    return `${window.location.protocol}//${window.location.hostname}:8080${path}`;
  };

  const getUserInitial = (): string | null => {
    if (!user) return null;
    const displayName = (user as ExtendedUser).email || user.username || "";
    return displayName.charAt(0).toUpperCase() || null;
  };

  // Fetch profile & business DTOs on mount
  useEffect(() => {
    client
      .get("/api/user-profile")
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data) {
          setAboutMe((prev) => ({
            ...prev,
            ...data,
            hasPicture: data.hasPicture ?? prev.hasPicture,
            hasIdDoc: data.hasIdDoc ?? prev.hasIdDoc,
            pictureUrl: data.pictureUrl ?? prev.pictureUrl ?? null,
            idDocUrl: data.idDocUrl ?? prev.idDocUrl ?? null,
            createdAt: data.createdAt ?? prev.createdAt,
            updatedAt: data.updatedAt ?? prev.updatedAt,
          }));
        }
      })
      .catch(() => {});

    client
      .get("/api/business-profile")
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data) {
          setBusiness((prev) => ({
            ...prev,
            ...data,
            logoUrl: data.logoUrl ?? prev.logoUrl ?? null,
            createdAt: data.createdAt ?? prev.createdAt,
            updatedAt: data.updatedAt ?? prev.updatedAt,
          }));
        }
      })
      .catch(() => {});

    client
      .get("/api/settings")
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data) setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  // Fetch authenticated profile picture as blob whenever pictureUrl or hasPicture changes
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aboutMe.pictureUrl, aboutMe.hasPicture]);

  // Fetch authenticated business logo as blob whenever logoUrl or hasLogo changes
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.logoUrl, business.hasLogo]);

  const handleTabChange = (_evt: React.SyntheticEvent | null, newValue: number) => {
    setTabValue(newValue);
  };

  // Save handlers
  const saveAboutMe = async (e: React.FormEvent) => {
    e.preventDefault();
    await client.put("/api/user-profile", aboutMe);
    alert("Profile updated");
    client.get("/api/user-profile").then((res) => {
      const data = res.data?.data ?? res.data;
      if (data) setAboutMe((prev) => ({ ...prev, ...data }));
    });
  };

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    await client.put("/api/business-profile", business);
    alert("Business updated");
    client.get("/api/business-profile").then((res) => {
      const data = res.data?.data ?? res.data;
      if (data) setBusiness((prev) => ({ ...prev, ...data }));
    });
  };

  const subscribe = async (plan: string) => {
    await client.post("/api/subscriptions", { plan });
    alert(`Subscribed to ${plan}`);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await client.put("/api/settings", settings);
    alert("Settings saved");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("Passwords don't match");
    await client.post("/api/change-password", { oldPassword, newPassword });
    alert("Password changed");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const deactivate = async () => {
    if (window.confirm("Deactivate account?")) {
      await client.delete("/api/deactivate");
      logout();
    }
  };

  // Upload handlers with correct AxiosProgressEvent type
  const uploadFile = async (endpoint: string, file: File) => {
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

      // ✅ FIXED: Promise.all bracket/comma mismatch
      await Promise.all([
        client
          .get("/api/user-profile")
          .then((r) => setAboutMe((p) => ({ ...p, ...((r.data?.data ?? r.data) || {}) })))
          .catch(() => {}),
        client
          .get("/api/business-profile")
          .then((r) => setBusiness((p) => ({ ...p, ...((r.data?.data ?? r.data) || {}) })))
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
    const f = e.target.files?.[0];
    if (f) uploadFile(userPictureEndpoint, f);
  };
  const onIdDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(userIdDocEndpoint, f);
  };
  const onLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9fafb" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Account
      </Typography>

      {/* Pill-style tabs (Inventory look) */}
      <PillTabs
        value={tabValue}
        onChange={(i) => handleTabChange(null, i)}
        labels={["ABOUT ME", "MY BUSINESS", "SUBSCRIPTIONS", "SETTINGS"]}
        sx={{ mb: 3 }}
      />

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
                      <Link
                        href={resolveAssetUrl(aboutMe.pictureUrl ?? userPictureEndpoint)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        underline="none"
                      >
                        <Button variant="contained" size="small">
                          Download
                        </Button>
                      </Link>
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
                            <Link
                              href={resolveAssetUrl(aboutMe.idDocUrl ?? userIdDocEndpoint)}
                              target="_blank"
                              rel="noreferrer"
                              underline="none"
                            >
                              View
                            </Link>
                            {" • "}
                            <Link
                              href={resolveAssetUrl(aboutMe.idDocUrl ?? userIdDocEndpoint)}
                              target="_blank"
                              rel="noreferrer"
                              download
                            >
                              Download
                            </Link>
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
                      <Link
                        href={resolveAssetUrl(business.logoUrl ?? businessLogoEndpoint)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        underline="none"
                      >
                        <Button variant="contained" size="small">
                          Download
                        </Button>
                      </Link>
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

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {[
            { name: "FREE TRIAL", price: "7 days free", features: ["Platinum features access"], iconColor: "#4caf50" },
            {
              name: "BRONZE",
              price: "P99/month",
              features: ["1 user", "5 QR codes", "Loan up to P1,000", "Inventory, sales & reports"],
              iconColor: "#9e9e9e",
            },
            {
              name: "SILVER",
              price: "P149/month",
              features: ["2 users", "15 QR codes", "Loan up to P5,000", "Inventory, sales & reports"],
              iconColor: "#9e9e9e",
            },
            { name: "GOLD", price: "", features: [], iconColor: "#9e9e9e" },
            { name: "PLATINUM", price: "", features: [], iconColor: "#9e9e9e" },
          ].map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.name}>
              <Card sx={{ textAlign: "center" }}>
                <CardContent>
                  <Box
                    sx={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: plan.iconColor, mx: "auto", mb: 1 }}
                  />
                  <Typography variant="h6">{plan.name}</Typography>
                  <Typography>{plan.price}</Typography>
                  {plan.features.map((f) => (
                    <Typography key={f} variant="body2">
                      {f}
                    </Typography>
                  ))}
                </CardContent>
                <CardActions sx={{ justifyContent: "center" }}>
                  <Button variant="contained" sx={{ backgroundColor: "#4caf50" }} onClick={() => subscribe(plan.name)}>
                    Subscribe
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Payment Settings
          </Typography>
          <form onSubmit={saveSettings}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Currency</InputLabel>
              <Select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                label="Select Currency"
              >
                <MenuItem value="PHP">PHP</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Preferred Abbreviation"
              value={settings.abbreviation}
              onChange={(e) => setSettings({ ...settings, abbreviation: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="VAT"
              value={settings.vat}
              onChange={(e) => setSettings({ ...settings, vat: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.applyVat}
                  onChange={(e) => setSettings({ ...settings, applyVat: e.target.checked })}
                  color="primary"
                />
              }
              label="Apply VAT"
            />
            <Button type="submit" variant="contained" sx={{ backgroundColor: "#4caf50", mt: 2 }}>
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
