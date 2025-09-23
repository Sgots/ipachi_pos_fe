// src/pages/DiscountPromo.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, Stack, TextField, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Switch
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext"; // <<< permissions

type PromoItem = {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  quantity?: number;
  measurement?: string;
  lifetimeDays?: number | null;
  inStockForDays?: number | null;
  buyPrice?: number;
  sellPrice?: number;
  onSpecial?: boolean;
};

type ApiResponse<T> = { code: string; message: string; data: T };

const currency = (n?: number) =>
  typeof n === "number"
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "BWP" }).format(n)
    : "-";

const DiscountPromo: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW = can("DISCOUNTS", "VIEW");
  const CAN_EDIT = can("DISCOUNTS", "EDIT");

  const [rows, setRows] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // ensure header
  useEffect(() => {
    const biz = localStorage.getItem("x.business.id");
    if (biz) (client as any).defaults.headers.common["X-Business-Id"] = biz;
    else delete (client as any).defaults.headers.common["X-Business-Id"];
  }, []);

  const fetchData = async () => {
    if (!CAN_VIEW) return; // guard
    setLoading(true); setErr(null);
    try {
      const { data } = await client.get<ApiResponse<PromoItem[]>>(
        "/api/promotions/expired-shelflife",
        { params: { q } }
      );
      const arr = (data?.data ?? []).map((r: any) => ({
        ...r,
        quantity: r.quantity != null ? Number(r.quantity) : undefined,
        lifetimeDays: r.lifetimeDays != null ? Number(r.lifetimeDays) : undefined,
        inStockForDays: r.inStockForDays != null ? Number(r.inStockForDays) : undefined,
        buyPrice: r.buyPrice != null ? Number(r.buyPrice) : undefined,
        sellPrice: r.sellPrice != null ? Number(r.sellPrice) : undefined,
        onSpecial: !!r.onSpecial,
      })) as PromoItem[];
      setRows(arr);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [q, CAN_VIEW]);

  const displayRows = useMemo(() => rows, [rows]);

  // ---------- Edit dialog ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PromoItem | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [flagSpecial, setFlagSpecial] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const openEdit = (row: PromoItem) => {
    if (!CAN_EDIT) return;
    setEditing(row);
    setNewPrice("");
    setFlagSpecial(!!row.onSpecial);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing || !CAN_EDIT) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (newPrice.trim() !== "") payload.newSellPrice = Number(newPrice);
      payload.onSpecial = flagSpecial;
      const { data } = await client.put<ApiResponse<PromoItem>>(`/api/promotions/${editing.id}`, payload);
      const updated = data?.data;
      setRows(prev => prev.map(r => (r.id === editing.id ? { ...r, ...updated } : r)));
      setEditOpen(false);
    } catch (e) {
      // optional: toast or error handling
    } finally {
      setSaving(false);
    }
  };

  if (!CAN_VIEW) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>Discount & Promo</Typography>
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">
            You don’t have permission to view Discounts.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Discount & Promo</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search product"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={fetchData}>Refresh</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 0, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell>Product name</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Measurement</TableCell>
              <TableCell>Lifetime (days)</TableCell>
              <TableCell>In stock for (days)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} sx={{ p: 2 }}>Loading…</TableCell></TableRow>
            )}
            {!loading && err && (
              <TableRow><TableCell colSpan={8} sx={{ p: 2, color: "error.main" }}>{err}</TableCell></TableRow>
            )}
            {!loading && !err && displayRows.length === 0 && (
              <TableRow><TableCell colSpan={8} sx={{ p: 2, color: "text.secondary" }}>No items found.</TableCell></TableRow>
            )}
            {!loading && !err && displayRows.map(r => (
              <TableRow key={r.id} hover>
                <TableCell>{r.sku}</TableCell>
                <TableCell>{r.barcode || "-"}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.quantity ?? 0}</TableCell>
                <TableCell>{r.measurement || "unit"}</TableCell>
                <TableCell>{r.lifetimeDays ?? "-"}</TableCell>
                <TableCell sx={{ color: "error.main", fontWeight: 600 }}>
                  {r.inStockForDays ?? "-"}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => openEdit(r)}
                    disabled={!CAN_EDIT}
                    title={CAN_EDIT ? "Edit" : "No permission"}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Edit Sell Price Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Sell Price</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={1} sx={{ fontSize: 14, mb: 2 }}>
              <div>SKU : <b>{editing.sku}</b></div>
              <div>Barcode : <b>{editing.barcode || "-"}</b></div>
              <div>Product : <b>{editing.name}</b></div>
              <div>Buy Price : <b>{currency(editing.buyPrice)}</b></div>
              <div>Sell Price : <b>{currency(editing.sellPrice)}</b></div>
            </Stack>
          )}

          <TextField
            fullWidth
            placeholder="new sell price"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            inputProps={{ inputMode: "decimal", pattern: "[0-9.]*" }}
            sx={{ mb: 2 }}
            disabled={!CAN_EDIT}
          />

          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch checked={flagSpecial} onChange={(_, v) => setFlagSpecial(v)} disabled={!CAN_EDIT} />
            <Typography>Label “On Special”</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={saving || !CAN_EDIT}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscountPromo;
