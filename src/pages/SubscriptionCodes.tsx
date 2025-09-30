// src/pages/SubscriptionCodes.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Box, Paper, Typography, Grid, Button, TextField, MenuItem, Chip,
    Table, TableHead, TableRow, TableCell, TableBody, Stack, Snackbar, Alert
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import CancelScheduleSendIcon from "@mui/icons-material/CancelScheduleSend";
import Slide from "@mui/material/Slide";
import { TransitionProps } from "@mui/material/transitions";

const SlideUpTransition = React.forwardRef(function SlideUpTransition(
    props: TransitionProps & { children: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide ref={ref} direction="up" {...props} />;
});

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

type CodeRow = {
    id: number;
    code: string;
    tier: Tier;
    generatedAt: string;
    expiresAt?: string | null;
    usedAt?: string | null;
    redeemedByBusinessId?: number | null;
    cancelledAt?: string | null;
    cancelledReason?: string | null;
};

const tiers: Tier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
const brand = { dark: "#0c5b4a" };

const SubscriptionCodes: React.FC = () => {
    const [rows, setRows] = useState<CodeRow[]>([]);
    const [tier, setTier] = useState<Tier | "">("");
    const [used, setUsed] = useState<"" | "true" | "false">("");
    const [count, setCount] = useState<number>(10);
    const [genTier, setGenTier] = useState<Tier>("BRONZE");
    const [prefix, setPrefix] = useState<string>("IP-");
    const [expiresAt, setExpiresAt] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/subscriptions/codes", {
                params: {
                    tier: tier || undefined,
                    used: used === "" ? undefined : used === "true",
                    page: 0,
                    size: 200
                }
            });
            setRows(res.data.content || []);
        } catch (e: any) {
            setToast({ type: "error", text: e?.response?.data?.message || "Failed to fetch codes" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCodes(); }, []);

    const generate = async () => {
        try {
            await axios.post("/api/subscriptions/codes/generate", {
                tier: genTier, count,
                prefix: prefix || undefined,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
            });
            setToast({ type: "success", text: "Codes generated" });
            await fetchCodes();
        } catch (e: any) {
            setToast({ type: "error", text: e?.response?.data?.message || "Generation failed" });
        }
    };

    const downloadCsv = async (onlyUsed: boolean | null) => {
        const res = await axios.get("/api/subscriptions/codes/export", {
            params: { used: onlyUsed === null ? undefined : onlyUsed, tier: tier || undefined },
            responseType: "blob"
        });
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subscription-codes.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const statusChip = (r: CodeRow) => {
        if (r.cancelledAt) return <Chip label="CANCELLED" color="default" size="small" />;
        return r.usedAt ? <Chip label="USED" color="error" size="small" /> : <Chip label="UNUSED" color="success" size="small" />;
    };

    const cancelCode = async (id: number) => {
        const reason = window.prompt("Enter reason for cancelling this code (optional):") || "";
        try {
            await axios.post(`/api/subscriptions/codes/${id}/cancel`, { reason });
            setToast({ type: "success", text: "Code cancelled" });
            await fetchCodes();
        } catch (e: any) {
            setToast({ type: "error", text: e?.response?.data?.message || "Cancel failed" });
        }
    };

    const terminateByCode = async (id: number) => {
        const reason = window.prompt("Terminate active subscription associated with this code. Reason (optional):") || "";
        try {
            await axios.post(`/api/subscriptions/codes/${id}/terminate-subscription`, { reason });
            setToast({ type: "success", text: "Subscription terminated" });
            await fetchCodes();
        } catch (e: any) {
            setToast({ type: "error", text: e?.response?.data?.message || "Terminate failed" });
        }
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 2, color: brand.dark }}>Subscription Codes</Typography>

            {/* Filters + Export */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            select fullWidth label="Tier (filter)" value={tier}
                            onChange={(e) => setTier(e.target.value as any)}
                        >
                            <MenuItem value="">All</MenuItem>
                            {tiers.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select fullWidth label="Status (filter)" value={used}
                            onChange={(e) => setUsed(e.target.value as any)}
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="false">Unused</MenuItem>
                            <MenuItem value="true">Used</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button type="button" variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCodes} disabled={loading}>
                                Refresh
                            </Button>
                            <Button type="button" variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadCsv(null)}>
                                Export All
                            </Button>
                            <Button type="button" variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadCsv(true)}>
                                Export Used
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* Generator (as a real form to prevent accidental page reloads) */}
            <Paper
                sx={{ p: 2, mb: 3 }}
                component="form"
                onSubmit={(e) => { e.preventDefault(); generate(); }}
            >
                <Typography variant="h6" sx={{ mb: 2 }}>Generate New Codes</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                        <TextField select fullWidth label="Tier" value={genTier} onChange={(e) => setGenTier(e.target.value as Tier)}>
                            {tiers.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            type="number" label="Count" fullWidth value={count}
                            inputProps={{ min: 1, max: 10000 }}
                            onChange={(e) => setCount(Math.max(1, Math.min(10000, Number(e.target.value))))}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField label="Prefix" fullWidth value={prefix} onChange={(e) => setPrefix(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            label="Expires At (optional)"
                            type="datetime-local"
                            fullWidth
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={1} display="flex" alignItems="stretch">
                        <Button fullWidth variant="contained" type="submit">Generate</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <Paper sx={{ p: 0, overflow: "auto" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Tier</TableCell>
                            <TableCell>Generated</TableCell>
                            <TableCell>Expires</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Used At</TableCell>
                            <TableCell>Cancelled At</TableCell>
                            <TableCell>Redeemed By (Business ID)</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(r => {
                            const canCancel = !r.usedAt && !r.cancelledAt;
                            const canTerminate = !!r.usedAt && !r.cancelledAt;
                            return (
                                <TableRow key={r.id}>
                                    <TableCell><strong>{r.code}</strong></TableCell>
                                    <TableCell>{r.tier}</TableCell>
                                    <TableCell>{r.generatedAt?.replace("T", " ").replace("Z", "")}</TableCell>
                                    <TableCell>{r.expiresAt ? r.expiresAt.replace("T", " ").replace("Z", "") : "-"}</TableCell>
                                    <TableCell>{statusChip(r)}</TableCell>
                                    <TableCell>{r.usedAt ? r.usedAt.replace("T", " ").replace("Z", "") : "-"}</TableCell>
                                    <TableCell>{r.cancelledAt ? r.cancelledAt.replace("T", " ").replace("Z", "") : "-"}</TableCell>
                                    <TableCell>{r.redeemedByBusinessId ?? "-"}</TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="outlined"
                                                color="warning"
                                                startIcon={<BlockIcon />}
                                                disabled={!canCancel}
                                                onClick={() => cancelCode(r.id)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<CancelScheduleSendIcon />}
                                                disabled={!canTerminate}
                                                onClick={() => terminateByCode(r.id)}
                                            >
                                                Terminate
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Paper>

            {/* Only render Snackbar when we actually have a toast (avoids children=null type) */}
            {toast && (
                <Snackbar
                    open
                    autoHideDuration={3000}
                    onClose={(_, reason) => {
                        if (reason === "clickaway") return;
                        setToast(null);
                    }}
                    TransitionComponent={SlideUpTransition}
                    TransitionProps={{ timeout: 150 }}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <Alert
                        onClose={() => setToast(null)}
                        severity={toast.type}
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        {toast.text}
                    </Alert>
                </Snackbar>
            )}
        </Box>
    );
};

export default SubscriptionCodes;
