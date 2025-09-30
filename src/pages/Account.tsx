import React, { useState, useEffect, useCallback } from "react";
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

type SettingsDTO = {
    currency: string;
    abbreviation: string;
    enableVat: boolean;
    pricesIncludeVat: boolean;
    vatRate: number;
};

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

    const roles = (currentUser?.roles ?? []).map((r) => String(r).toUpperCase());
    const roleStr = (currentUser as any)?.role ? String((currentUser as any).role).toUpperCase() : null;
    const isAdmin =
        roles.includes("ADMIN") ||
        roles.includes("ROLE_ADMIN") ||
        roleStr === "ADMIN" ||
        roleStr === "ROLE_ADMIN";

    const bootHeaders = useCallback(async () => {
        if (!isAdmin) return;
        const uid = currentUser?.id;
        const tid = terminalId;
        if (uid != null) client.defaults.headers.common["X-User-Id"] = String(uid);
        else delete client.defaults.headers.common["X-User-Id"];

        if (tid != null && String(tid).trim() !== "") {
            client.defaults.headers.common["X-Terminal-Id"] = String(tid);
        } else {
            delete client.defaults.headers.common["X-Terminal-Id"];
        }

        let bid = (typeof window !== "undefined" && window.localStorage.getItem("x.business.id")) || "";
        if (!bid || bid === "null" || bid === "undefined") {
            try {
                const { data } = await client.get("/api/business-profile");
                const d = data?.data ?? data;
                const id = d?.id ?? d?.businessId ?? d?.business?.id ?? null;
                if (id != null) {
                    bid = String(id);
                    window.localStorage.setItem("x.business.id", bid);
                }
            } catch {
                /* ignore */
            }
        }
        if (bid && bid !== "null" && bid !== "undefined") {
            client.defaults.headers.common["X-Business-Id"] = bid;
        } else {
            delete client.defaults.headers.common["X-Business-Id"];
        }
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
        id: 1,
        name: "",
        location: "",
        hasLogo: true,
    });

    const [settings, setSettings] = useState<SettingsDTO>({
        currency: "PHP",
        abbreviation: "P",
        enableVat: false,
        pricesIncludeVat: false,
        vatRate: 0,
    });

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
        if (/^https?:\/\//.test(path)) return path;
        const axiosBase = (client as any).defaults?.baseURL ?? "";
        if (axiosBase) return axiosBase.replace(/\/$/, "") + path;
        return `${window.location.protocol}//${window.location.hostname}:8080${path}`;
    };

    const authenticatedDownload = async (url: string, suggestedName = "file") => {
        try {
            const { data, headers } = await client.get(resolveAssetUrl(url), { responseType: "blob" });
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

    useEffect(() => {
        if (!isAdmin) return;
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
                    const bid = data?.id ?? data?.businessId ?? data?.business?.id;
                    if (bid != null) {
                        client.defaults.headers.common["X-Business-Id"] = String(bid);
                        window.localStorage.setItem("x.business.id", String(bid));
                    }
                }
            })
            .catch(() => {});

        client
            .get("/api/settings")
            .then((res) => {
                const data = res.data?.data ?? res.data;
                if (data) {
                    const enableVat = !!data.enableVat;
                    setSettings((prev) => ({
                        currency: data.currency ?? prev.currency,
                        abbreviation: data.abbreviation ?? prev.abbreviation,
                        enableVat,
                        pricesIncludeVat: enableVat,
                        vatRate: Number(data.vatRate ?? prev.vatRate) || 0,
                    }));
                }
            })
            .catch(() => {});
    }, [isAdmin]);

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
                    client.defaults.headers.common["X-Business-Id"] = String(bid);
                    window.localStorage.setItem("x.business.id", String(bid));
                }
            }
        });
    };

    const subscribe = async (plan: string) => {
        if (!isAdmin) return;
        await client.post("/api/subscriptions", { plan });
        alert(`Subscribed to ${plan}`);
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
                            client.defaults.headers.common["X-Business-Id"] = String(bid);
                            window.localStorage.setItem("x.business.id", String(bid));
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
                                                    aboutMe.pictureUrl
                                                        ? authenticatedDownload(aboutMe.pictureUrl, "profile-picture")
                                                        : undefined
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
                                                            <Button
                                                                onClick={() => authenticatedDownload(aboutMe.idDocUrl!, "id-document")}
                                                            >
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
                                                    business.logoUrl
                                                        ? authenticatedDownload(business.logoUrl, "business-logo")
                                                        : undefined
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

            {tabValue === 2 && (
                <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Subscriptions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Save 30% by subscribing annually.
                    </Typography>
                    <Grid container spacing={3} justifyContent="center">
                        {[
                            {
                                name: "FREE TRIAL",
                                price: "7 Days Free",
                                features: ["Platinum features access"],
                                iconColor: "#4caf50",
                            },
                            {
                                name: "BRONZE",
                                price: "P99/month",
                                annualPrice: "P832/year",
                                features: ["1 user", "5 QR codes", "Loan up to P1,000", "Inventory, sales & reports"],
                                iconColor: "#cd7f32",
                            },
                            {
                                name: "SILVER",
                                price: "P149/month",
                                annualPrice: "P1252/year",
                                features: ["2 users", "15 QR codes", "Loan up to P5,000", "Inventory, sales & reports"],
                                iconColor: "#c0c0c0",
                            },
                            {
                                name: "GOLD",
                                price: "P249/month",
                                annualPrice: "P2092/year",
                                features: [
                                    "5 users",
                                    "50 QR codes",
                                    "Loan up to P10,000",
                                    "Funeral cover P20,000",
                                    "Inventory, sales & reports",
                                ],
                                iconColor: "#ffd700",
                            },
                            {
                                name: "PLATINUM",
                                price: "P499/month",
                                annualPrice: "P4192/year",
                                features: [
                                    "10 users",
                                    "Unlimited QR codes",
                                    "Loan up to P20,000",
                                    "Funeral cover P50,000",
                                    "Comprehensive reports",
                                    "Priority support",
                                    "Free staff training",
                                ],
                                iconColor: "#e5e4e2",
                            },
                        ].map((plan) => (
                            <Grid item xs={12} sm={6} md={2.4} key={plan.name}>
                                <Card
                                    sx={{
                                        textAlign: "center",
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                        borderRadius: 2,
                                    }}
                                >
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
                                        {plan.features.map((f) => (
                                            <Typography key={f} variant="body2" sx={{ mb: 0.5 }}>
                                                {f}
                                            </Typography>
                                        ))}
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                                        <Button
                                            variant="contained"
                                            sx={{ backgroundColor: "#4caf50", "&:hover": { backgroundColor: "#388e3c" } }}
                                            onClick={() => subscribe(plan.name)}
                                        >
                                            Subscribe
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

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
                                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                label="Select Currency"
                            >
                                <MenuItem value="PHP">PHP</MenuItem>
                                <MenuItem value="USD">USD</MenuItem>
                                <MenuItem value="BWP">BWP</MenuItem>
                                <MenuItem value="ZAR">ZAR</MenuItem>
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