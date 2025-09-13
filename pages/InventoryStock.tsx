// src/pages/InventoryStock.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Paper, Typography, TextField, Button, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle,
  DialogContent, DialogActions, Autocomplete, Snackbar, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import InventoryTabs from "../components/InventoryTabs";
import ConfirmDialog from "../components/ConfirmDialog";
import StockReceiptDialog from "../components/StockReceiptDialog";
import {
  fetchStock, restockProduct, searchReceipts, uploadStockReceipt
} from "../api/inventory";

type StockRow = {
  id: number; sku: string; barcode?: string | null; name: string;
  unitId?: number | null; unitName?: string | null; unitAbbr?: string | null;
  quantity: number; lowStock?: number | null;
};

const RestockDialog: React.FC<{
  open: boolean;
  row?: StockRow | null;
  onClose: () => void;
  onUpdated: (productId: number, newQty: number) => void;
}> = ({ open, row, onClose, onUpdated }) => {
  const [qty, setQty] = useState<number | "">("");
  const [receiptQ, setReceiptQ] = useState("");
  const [opts, setOpts] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setQty(""); setReceiptQ(""); setOpts([]); setSel(null); }, [open]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try { setOpts(await searchReceipts(receiptQ)); } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [open, receiptQ]);

  const submit = async () => {
    const delta = Number(qty);
    if (!row?.id || !Number.isFinite(delta) || delta <= 0) return;
    setBusy(true);
    try {
      // ✅ THIS is the only call on “Add” here — restock endpoint
      const res = await restockProduct(row.id, delta, sel?.id);
      onUpdated(res.productId, Number(res.quantity));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>Add stock</DialogTitle>
        <DialogContent dividers>
          <div className="mb-2 text-sm opacity-75">
            {row ? `${row.name} (SKU: ${row.sku})` : ""}
          </div>
          <TextField
            autoFocus label="Quantity to add" type="number" fullWidth className="mb-4"
            value={qty} onChange={(e)=>setQty(e.target.value === "" ? "" : Number(e.target.value))}
            inputProps={{ min: 1 }}
          />
          <Autocomplete
            options={opts}
            getOptionLabel={(o)=>o?.label ?? ""}
            value={sel}
            onChange={(_e,v)=>setSel(v)}
            onInputChange={(_e,v)=>setReceiptQ(v)}
            renderInput={(p)=><TextField {...p} label="Link receipt (optional)" placeholder="Search by label or filename" />}
          />
          <div className="mt-2">
            <Button size="small" onClick={()=>setUploadOpen(true)}>Upload new receipt…</Button>
            {sel?.fileUrl && (
              <Button size="small" onClick={()=>window.open(sel.fileUrl, "_blank")}>Open selected</Button>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!qty || Number(qty) <= 0 || busy}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Inline uploader to create a receipt, then link it */}
      <StockReceiptDialog
        open={uploadOpen}
        onClose={()=>setUploadOpen(false)}
        onUpload={async (label, file) => {
          const r = await uploadStockReceipt(label, file); // ✅ /receipts
          setSel(r);                          // link the just-uploaded receipt
          setOpts(await searchReceipts(label));
          setUploadOpen(false);
        }}
      />
    </>
  );
};

const InventoryStock: React.FC = () => {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; row?: StockRow }>({ open: false });
  const [restockFor, setRestockFor] = useState<StockRow | null>(null);

  // Top-level upload receipt only
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchStock();
      setRows(data.map(d => ({ ...d, quantity: Number(d.quantity) })));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

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
  const minOf  = (r: StockRow) => Number.isFinite(r.lowStock as any) ? Number(r.lowStock) : 5;
  const status = (qty: number, min: number) =>
    qty <= 0 ? { text: "Out of stock", color: "#d32f2f" } :
    qty <= min ? { text: "Low stock", color: "#f57c00" } :
                 { text: "Stock OK", color: "#2e7d32" };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Typography variant="h6">Inventory &gt; Stock</Typography>
        <InventoryTabs />
      </div>

      <Paper className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <TextField fullWidth placeholder="Search product" value={query}
              onChange={(e)=>setQuery(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon className="mr-2 opacity-60" /> }} />
          </div>
          <Tooltip title="Refresh"><span><IconButton onClick={load} disabled={loading}><RefreshIcon/></IconButton></span></Tooltip>

          {/* ✅ ONLY uploads a receipt (no quantity) */}
          <Button
            variant="outlined"
            startIcon={<Inventory2OutlinedIcon />}
            onClick={()=>setUploadOpen(true)}
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
                    <span style={{ color: st.color, fontWeight: 600, border: `1px solid ${st.color}`, padding: "2px 8px", borderRadius: 12 }}>
                      {st.text}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Add stock">
                      <IconButton size="small" onClick={()=>setRestockFor(r)}><AddIcon fontSize="small"/></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small"><EditIcon fontSize="small"/></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error"><DeleteOutlineIcon fontSize="small"/></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow><TableCell colSpan={8} align="center">{loading ? "Loading…" : "No items match your search."}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <ConfirmDialog
        open={confirm.open}
        title="Delete item?"
        message={`This will remove “${confirm.row?.name}”.`}
        confirmText="Delete"
        confirmColor="error"
        onCancel={()=>setConfirm({ open: false })}
        onConfirm={()=>setConfirm({ open: false })}
      />

      {/* Per-product restock (quantity + optional receipt link/upload) */}
      <RestockDialog
        open={!!restockFor}
        row={restockFor ?? undefined}
        onClose={()=>setRestockFor(null)}
        onUpdated={(productId, newQty) => {
          setRows(prev => prev.map(r => r.id === productId ? { ...r, quantity: Number(newQty) } : r));
        }}
      />

      {/* Upload a receipt only (top button) */}
      <StockReceiptDialog
        open={uploadOpen}
        onClose={()=>setUploadOpen(false)}
        onUpload={async (label, file) => {
          await uploadStockReceipt(label, file);   // ✅ /receipts
          setUploadOpen(false);
          setToast("Receipt uploaded");
        }}
      />

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={()=>setToast(null)}>
        <Alert severity="success" onClose={()=>setToast(null)}>{toast}</Alert>
      </Snackbar>
    </div>
  );
};

export default InventoryStock;
