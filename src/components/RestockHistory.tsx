import React, { useEffect, useMemo, useState } from "react";
import {
    Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography,
    TextField, Button, IconButton, Tooltip, Snackbar, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, Stack, InputAdornment
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import { useAuth } from "../auth/AuthContext";
import {
    fetchRestockHistory,
    uploadStockReceipt,
    fetchReceiptItems,
    type RestockHistoryRow
} from "../api/inventory";
import InventoryTabs from "./InventoryTabs";
import StockReceiptDialog from "./StockReceiptDialog";

type ReceiptItemRow = {
    productId: number;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    value: number;
};

const RestockHistory: React.FC = () => {
    const { can } = useAuth();
    const CAN_VIEW = can("INVENTORY", "VIEW");
    const CAN_EDIT = can("INVENTORY", "EDIT");

    const [history, setHistory] = useState<RestockHistoryRow[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    // Date filter
    const [dateDialogOpen, setDateDialogOpen] = useState(false);
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    // Items dialog
    const [itemsOpen, setItemsOpen] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [items, setItems] = useState<ReceiptItemRow[]>([]);
    const [activeReceipt, setActiveReceipt] = useState<{ id: number; label: string } | null>(null);

    const fmt = (n: number | string) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "BWP",
            maximumFractionDigits: 2,
        }).format(typeof n === "string" ? Number(n) : n);

    const loadHistory = async () => {
        if (!CAN_VIEW) return;
        setLoading(true);
        try {
            const data = await fetchRestockHistory(
                query || undefined,
                fromDate || undefined,
                toDate || undefined
            );
            // sort by receiptAt desc (server is already ordered, but keep client safety)
            setHistory(
                [...data].sort(
                    (a, b) => new Date(b.receiptAt).getTime() - new Date(a.receiptAt).getTime()
                )
            );
        } catch (error) {
            console.error("Failed to fetch restock history:", error);
            setToast("Failed to fetch restock history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [CAN_VIEW, query, fromDate, toDate]);

    const clearDates = () => {
        setFromDate("");
        setToDate("");
    };

    const openItems = async (receiptId: number, label: string) => {
        setActiveReceipt({ id: receiptId, label });
        setItemsOpen(true);
        setItemsLoading(true);
        try {
            const rows = await fetchReceiptItems(receiptId);
            setItems(rows);
        } catch (e) {
            console.error("Failed to load receipt items", e);
            setToast("Failed to load receipt items");
            setItems([]);
        } finally {
            setItemsLoading(false);
        }
    };

    if (!CAN_VIEW) {
        return (
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Typography variant="h6">Inventory &gt; Restocking History</Typography>
                    <InventoryTabs />
                </div>
                <Paper className="p-4">
                    <Typography color="text.secondary">You don’t have permission to view Inventory.</Typography>
                </Paper>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <Typography variant="h6">Inventory &gt; Restocking History</Typography>
                <InventoryTabs />
            </div>

            <Paper className="p-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                        <TextField
                            fullWidth
                            placeholder="Search by label or filename"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </div>

                    <Button
                        variant="outlined"
                        startIcon={<CalendarMonthOutlinedIcon />}
                        onClick={() => setDateDialogOpen(true)}
                    >
                        Date range
                    </Button>

                    {(fromDate || toDate) && (
                        <Stack direction="row" spacing={1} alignItems="center">
                            {fromDate && <Chip label={`From: ${fromDate}`} size="small" />}
                            {toDate && <Chip label={`To: ${toDate}`} size="small" />}
                            <IconButton aria-label="clear dates" onClick={clearDates}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    )}

                    <Tooltip title="Refresh">
            <span>
              <IconButton onClick={loadHistory} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
                    </Tooltip>


                </div>
            </Paper>

            <Paper className="p-3">
                <Typography variant="h6" gutterBottom>
                    Restocking History
                </Typography>

                {loading ? (
                    <Typography>Loading...</Typography>
                ) : history.length === 0 ? (
                    <Typography>No restocking history available.</Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Label</TableCell>
                                <TableCell align="right">Opening (BWP)</TableCell>
                                <TableCell align="right">New (BWP)</TableCell>
                                <TableCell align="right">Closing (BWP)</TableCell>
                                <TableCell>Added by</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((r) => (
                                <TableRow key={r.receiptId}>
                                    <TableCell>{new Date(r.receiptAt).toLocaleString()}</TableCell>
                                    <TableCell>{r.label}</TableCell>
                                    <TableCell align="right">{fmt(r.openingValue)}</TableCell>
                                    <TableCell align="right">{fmt(r.newValue)}</TableCell>
                                    <TableCell align="right">{fmt(r.closingValue)}</TableCell>
                                    <TableCell>{r.uploadedBy}</TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => openItems(r.receiptId, r.label)}
                                            >
                                                View items
                                            </Button>
                                            {r.hasFile && r.fileUrl && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    href={r.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View receipt
                                                </Button>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            {/* Upload dialog */}
            <StockReceiptDialog
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                onUpload={async (label, file, date) => {
                    if (!CAN_EDIT) {
                        setToast("You don't have permission to upload receipts.");
                        return;
                    }
                    await uploadStockReceipt(label, file, date);
                    setUploadOpen(false);
                    setToast("Receipt uploaded");
                    loadHistory();
                }}
            />

            {/* Date Range Dialog */}
            <Dialog open={dateDialogOpen} onClose={() => setDateDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Select date range</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="From"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField
                            label="To"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDateDialogOpen(false)}>Close</Button>
                    <Button
                        onClick={() => {
                            setDateDialogOpen(false);
                            loadHistory();
                        }}
                        variant="contained"
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Items Dialog */}
            <Dialog open={itemsOpen} onClose={() => setItemsOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Stock added — {activeReceipt?.label}</DialogTitle>
                <DialogContent dividers>
                    {itemsLoading ? (
                        <Typography>Loading...</Typography>
                    ) : items.length === 0 ? (
                        <Typography>No items on this receipt.</Typography>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>SKU</TableCell>
                                    <TableCell>Product</TableCell>
                                    <TableCell align="right">Qty</TableCell>
                                    <TableCell align="right">Unit (BWP)</TableCell>
                                    <TableCell align="right">Value (BWP)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((it) => (
                                    <TableRow key={it.productId}>
                                        <TableCell>{it.sku}</TableCell>
                                        <TableCell>{it.name}</TableCell>
                                        <TableCell align="right">{it.quantity}</TableCell>
                                        <TableCell align="right">{fmt(it.unitPrice)}</TableCell>
                                        <TableCell align="right">{fmt(it.value)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setItemsOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)}>
                <Alert
                    severity={toast?.toLowerCase().includes("permission") ? "error" : "success"}
                    onClose={() => setToast(null)}
                >
                    {toast}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default RestockHistory;
