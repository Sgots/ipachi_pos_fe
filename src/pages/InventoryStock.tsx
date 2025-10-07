import React, { useEffect, useMemo, useState } from "react";
import {
    Paper, Typography, TextField, Button, IconButton, Tooltip,
    Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogContent, DialogActions, Autocomplete, Snackbar, Alert, Box
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import InventoryTabs from "../components/InventoryTabs";
import StockReceiptDialog from "../components/StockReceiptDialog";
import {
    fetchStock,setProductQuantity, restockProduct, searchReceipts, uploadStockReceipt
} from "../api/inventory";
import { useAuth } from "../auth/AuthContext";

type StockRow = {
    id: number;
    sku: string;
    barcode?: string | null;
    name: string;
    unitId?: number | null;
    unitName?: string | null;
    unitAbbr?: string | null;
    quantity: number;
    lowStock?: number | null;
};

// Styled DialogTitle for a modern, clean look
const StyledDialogTitle = styled(Typography)(({ theme }) => ({
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(2, 3),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: theme.shadows[2],
    "& .title-text": {
        fontWeight: 600,
        fontSize: "1.25rem",
    },
}));

// Styled DialogContent for consistent spacing and modern feel
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    "& .product-info": {
        color: theme.palette.text.secondary,
        marginBottom: theme.spacing(2),
        fontSize: "0.875rem",
    },
}));

// Styled DialogActions for a clean layout
const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
    padding: theme.spacing(2, 3),
    backgroundColor: theme.palette.background.default,
    borderTop: `1px solid ${theme.palette.divider}`,
}));

const RestockDialog: React.FC<{
  open: boolean;
  row?: StockRow | null;
  onClose: () => void;
  onUpdated: (productId: number, newQty: number) => void;
  canEdit: boolean;
}> = ({ open, row, onClose, onUpdated, canEdit }) => {
  const [qty, setQty] = useState<number | "">("");
  const [receiptQ, setReceiptQ] = useState("");
  const [opts, setOpts] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQty("");
    setReceiptQ("");
    setOpts([]);
    setSel(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        setOpts(await searchReceipts(receiptQ));
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [open, receiptQ]);

  const submit = async () => {
    if (!canEdit) return;
    const delta = Number(qty);
    if (!row?.id || !Number.isFinite(delta) || delta <= 0 || !sel?.id) return;
    setBusy(true);
    try {
      const res = await restockProduct(row.id, delta, sel.id);
      onUpdated(res.productId, Number(res.quantity));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const qtyInvalid = !qty || Number(qty) <= 0;
  const receiptMissing = !sel?.id;

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2, boxShadow: (theme) => theme.shadows[5] } }}
      >
        <StyledDialogTitle>
          <Typography className="title-text">Add Stock to Inventory</Typography>
        </StyledDialogTitle>

        <StyledDialogContent dividers>
          {row && (
            <Typography className="product-info">
              {row.name} (SKU: {row.sku})
            </Typography>
          )}

          <TextField
            autoFocus
            label="Quantity to Add"
            type="number"
            fullWidth
            variant="outlined"
            value={qty}
            onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
            inputProps={{ min: 1 }}
            disabled={!canEdit}
            sx={{ mb: 3 }}
            InputLabelProps={{ shrink: true }}
          />

          <Autocomplete
            options={opts}
            getOptionLabel={(o) => o?.label ?? ""}
            value={sel}
            onChange={(_e, v) => setSel(v)}
            onInputChange={(_e, v) => setReceiptQ(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Link Receipt *"
                placeholder="Search by label or filename"
                variant="outlined"
                error={receiptMissing}
                helperText={receiptMissing ? "Receipt is required." : " "}
              />
            )}
            disabled={!canEdit}
            sx={{ mb: 1 }}
          />
        </StyledDialogContent>

        <StyledDialogActions>
          <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={qtyInvalid || receiptMissing || busy || !canEdit}
            sx={{ textTransform: "none", px: 3 }}
          >
            Add Stock
          </Button>
        </StyledDialogActions>
      </Dialog>

      {/* This uploader belongs to the Restock dialog */}
      <StockReceiptDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={async (label, file, date) => {
          if (!canEdit) return;
          const r = await uploadStockReceipt(label, file, date);
          setSel(r);                       // auto-select the newly uploaded receipt
          setOpts(await searchReceipts(label));
          setUploadOpen(false);
        }}
      />
    </>
  );
};
const EditQuantityDialog: React.FC<{
  open: boolean;
  row?: StockRow | null;
  onClose: () => void;
  onUpdated: (productId: number, newQty: number) => void;
  canEdit: boolean;
}> = ({ open, row, onClose, onUpdated, canEdit }) => {
  // mode: add or remove
  const [mode, setMode] = useState<"add" | "remove">("add");
  // amount to add/subtract
  const [amt, setAmt] = useState<number | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && row) {
      setMode("add");
      setAmt("");
    }
    if (!open) {
      setAmt("");
    }
  }, [open, row]);

  const current = Number(row?.quantity ?? 0);
  const amtNum = typeof amt === "number" ? amt : Number.NaN;
  const amtInvalid = !Number.isFinite(amtNum) || amtNum < 0;
  const newQty = Number.isFinite(amtNum)
    ? (mode === "add" ? current + amtNum : current - amtNum)
    : Number.NaN;
  const newInvalid = !Number.isFinite(newQty) || newQty < 0;

  const submit = async () => {
    if (!canEdit || !row?.id || amtInvalid || newInvalid) return;
    setBusy(true);
    try {
      const note =
        mode === "add"
          ? `Adjusted: +${amtNum} (from ${current} to ${newQty})`
          : `Adjusted: -${amtNum} (from ${current} to ${newQty})`;
      const res = await setProductQuantity(row.id, newQty, note);
      onUpdated(res.productId, Number(res.quantity));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 2, boxShadow: (t) => t.shadows[5] } }}
    >
      <StyledDialogTitle>
        <Typography className="title-text">Edit Stock</Typography>
      </StyledDialogTitle>

      <StyledDialogContent dividers>
        {row && <Box className="product-info">{row.name} (SKU: {row.sku})</Box>}

        {/* Mode switch */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_e, v) => v && setMode(v)}
            size="small"
          >
            <ToggleButton value="add">Add</ToggleButton>
            <ToggleButton value="remove">Remove</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Amount input */}
        <TextField
          autoFocus
          label={mode === "add" ? "Amount to Add" : "Amount to Remove"}
          type="number"
          fullWidth
          variant="outlined"
          value={amt}
          onChange={(e) => setAmt(e.target.value === "" ? "" : Number(e.target.value))}
          inputProps={{ min: 0, step: "any" }}
          disabled={!canEdit}
          sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }}
          error={amtInvalid}
          helperText={amtInvalid ? "Amount must be 0 or more." : " "}
        />

        {/* Live summary */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Current</Typography>
            <Typography variant="h6">{current}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Change</Typography>
            <Typography variant="h6">
              {Number.isFinite(amtNum)
                ? (mode === "add" ? `+${amtNum}` : `-${amtNum}`)
                : "—"}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">New stock</Typography>
            <Typography variant="h6" color={newInvalid ? "error" : "inherit"}>
              {Number.isFinite(newQty) ? newQty : "—"}
            </Typography>
          </Paper>
        </Box>

        {newInvalid && (
          <Typography sx={{ mt: 1 }} color="error" variant="body2">
            New stock cannot be negative.
          </Typography>
        )}
      </StyledDialogContent>

      <StyledDialogActions>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={busy || amtInvalid || newInvalid || !canEdit}
          sx={{ textTransform: "none", px: 3 }}
        >
          Save
        </Button>
      </StyledDialogActions>
    </Dialog>
  );
};

const InventoryStock: React.FC = () => {
    const { can } = useAuth();
    const CAN_VIEW = can("INVENTORY", "VIEW");
    const CAN_CREATE = can("INVENTORY", "CREATE");
    const CAN_EDIT = can("INVENTORY", "EDIT");
    const CAN_DELETE = can("INVENTORY", "DELETE");

    const [rows, setRows] = useState<StockRow[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [restockFor, setRestockFor] = useState<StockRow | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
// FIX: track which row is being edited
const [editFor, setEditFor] = useState<StockRow | null>(null);

    const load = async () => {
        if (!CAN_VIEW) return;
        setLoading(true);
        try {
            const data = await fetchStock();
            setRows(data.map(d => ({ ...d, quantity: Number(d.quantity) })));
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [CAN_VIEW]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q) ||
            String(r.barcode ?? "").toLowerCase().includes(q)
        );
    }, [rows, query]);

    const unitOf = (r: StockRow) => r.unitName ? `${r.unitName}${r.unitAbbr ? ` (${r.unitAbbr})` : ""}` : "unit";
    const minOf = (r: StockRow) => Number.isFinite(r.lowStock as any) ? Number(r.lowStock) : 5;
    const status = (qty: number, min: number) =>
        qty <= 0 ? { text: "Out of stock", color: "#d32f2f" } :
            qty <= min ? { text: "Low stock", color: "#f57c00" } :
                { text: "Stock OK", color: "#2e7d32" };

    if (!CAN_VIEW) {
        return (
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Typography variant="h6">Inventory &gt; Stock</Typography>
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
                <Typography variant="h6">Inventory &gt; Stock</Typography>
                <InventoryTabs />
            </div>

            <Paper className="p-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                        <TextField
                            fullWidth
                            placeholder="Search product"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            InputProps={{ startAdornment: <SearchIcon className="mr-2 opacity-60" /> }}
                        />
                    </div>
                    <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<Inventory2OutlinedIcon />}
                        onClick={() => setUploadOpen(true)}
                        disabled={!CAN_EDIT}
                    >
                        Add stock receipt
                    </Button>
                </div>
            </Paper>

            <Paper className="overflow-x-auto">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>SKU</TableCell>
                            <TableCell>Barcode</TableCell>
                            <TableCell>Product name</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell align="right">Minimum Threshold</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map(r => {
                            const min = minOf(r);
                            const st = status(r.quantity, min);
                            return (
                                <TableRow key={r.id}>
                                    <TableCell>{r.sku}</TableCell>
                                    <TableCell>{r.barcode ?? "—"}</TableCell>
                                    <TableCell>{r.name}</TableCell>
                                    <TableCell align="right">{r.quantity}</TableCell>
                                    <TableCell>{unitOf(r)}</TableCell>
                                    <TableCell align="right">{min}</TableCell>
                                    <TableCell>
                    <span
                        style={{
                            color: st.color,
                            fontWeight: 600,
                            border: `1px solid ${st.color}`,
                            padding: "2px 8px",
                            borderRadius: 12,
                        }}
                    >
                      {st.text}
                    </span>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={CAN_EDIT ? "Add stock" : "No permission"}>
                      <span>
                        <IconButton
                            size="small"
                            onClick={() => CAN_EDIT && setRestockFor(r)}
                            disabled={!CAN_EDIT}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </span>
                                        </Tooltip>

                                        {/* EDIT permanently disabled */}
                                    <Tooltip title={CAN_EDIT ? "Edit quantity" : "No permission"}>
                                       <span>
                                         <IconButton
                                           size="small"
                                           onClick={() => CAN_EDIT && setEditFor(r)}
                                           disabled={!CAN_EDIT}
                                         >
                                           <EditIcon fontSize="small" />
                                         </IconButton>
                                       </span>
                                     </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!filtered.length && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    {loading ? "Loading…" : "No items match your search."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>

            <RestockDialog
                open={!!restockFor}
                row={restockFor ?? undefined}
                onClose={() => setRestockFor(null)}
                onUpdated={(productId, newQty) => {
                    setRows(prev =>
                        prev.map(r =>
                            r.id === productId ? { ...r, quantity: Number(newQty) } : r
                        )
                    );
                }}
                canEdit={CAN_EDIT}
            />
<EditQuantityDialog
  open={!!editFor}
  row={editFor ?? undefined}
  onClose={() => setEditFor(null)}
  onUpdated={(productId, newQty) => {
    setRows(prev => prev.map(r => r.id === productId ? { ...r, quantity: Number(newQty) } : r));
  }}
  canEdit={CAN_EDIT}
/>

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
                }}
            />

            <Snackbar
                open={!!toast}
                autoHideDuration={2500}
                onClose={() => setToast(null)}
            >
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

export default InventoryStock;
