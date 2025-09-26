import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext"; // permissions

/** ===== Types matching /api/transactions/combined (extended locally) ===== */
type Line = {
  txId: number;
  date: string; // ISO
  sku: string;
  name: string;
  qty: number;
  grossAmount: number | string;
  vatAmount: number | string;
  profit: number | string;
  createdByUserId: number;
  terminalId: string;
};

type CombinedTxn = {
  txId: number;
  createdAt: string; // ISO
  createdByUserId: number;
  /** optional fields if BE provides them now/soon */
  createdByName?: string | null;
  staffName?: string | null;
  terminalId: string;
  lines: Line[];
};

type ApiResponse<T> = { code: number | string; message: string; data: T };

/** ===== Utilities ===== */
const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "BWP" }).format(n);

const formatDateTime = (iso: string) => new Date(iso).toLocaleString();

const toNum = (v: number | string | null | undefined) => Number(v ?? 0);

/** Debounce helper */
const useDebounced = <T,>(val: T, ms: number) => {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
};

/** ===== Page ===== */
const Transactions: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW = can("TRANSACTIONS", "VIEW");

  const [rows, setRows] = useState<CombinedTxn[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);

  // Ensure X-Business-Id header is set on this axios instance
  useEffect(() => {
    const biz = localStorage.getItem("x.business.id");
    if (biz) (client as any).defaults.headers.common["X-Business-Id"] = biz;
    else delete (client as any).defaults.headers.common["X-Business-Id"];
  }, []);

  // ------------ Filters ------------
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [minQty, setMinQty] = useState<string>("");
  const [maxQty, setMaxQty] = useState<string>("");

  // Debounce text inputs
  const debSku = useDebounced(sku, 400);
  const debName = useDebounced(name, 400);
  const debMinQty = useDebounced(minQty, 400);
  const debMaxQty = useDebounced(maxQty, 400);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = {};
    if (dateFrom) p.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) p.dateTo = new Date(dateTo).toISOString();
    if (debSku.trim()) p.sku = debSku.trim();
    if (debName.trim()) p.name = debName.trim();
    if (debMinQty.trim()) p.minQty = Number(debMinQty);
    if (debMaxQty.trim()) p.maxQty = Number(debMaxQty);
    // NOTE: txId removed from filters per requirement
    return p;
  }, [dateFrom, dateTo, debSku, debName, debMinQty, debMaxQty]);

  const fetchData = async () => {
    if (!CAN_VIEW) return;
    setStatus("loading");
    setError(null);
    try {
      const { data } = await client.get<ApiResponse<CombinedTxn[]>>("/api/transactions/combined", {
        params: queryParams,
      });

      const combined = (data?.data ?? []).map((t) => ({
        ...t,
        lines: (t.lines ?? []).map((ln) => ({
          ...ln,
          qty: toNum(ln.qty),
          grossAmount: toNum(ln.grossAmount),
          vatAmount: toNum(ln.vatAmount),
          profit: toNum(ln.profit),
        })),
      })) as CombinedTxn[];

      setRows(combined);
      setStatus("ok");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || String(e));
      setStatus("error");
    }
  };

  // Auto-fetch whenever filters or permission change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams, CAN_VIEW]);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSku("");
    setName("");
    setMinQty("");
    setMaxQty("");
  };

  // ===== Derived summaries per tx =====
  type TxnSummary = {
    // txId retained internally (not displayed) for stable keys
    txId: number;
    createdAt: string;
    terminalId: string;
    staffId: number | string | null;
    staffName?: string | null;
    totalGross: number;
    totalVat: number;
    totalProfit: number;
    totalNet: number; // gross - vat
    lines: Line[];
  };

  const summaries: TxnSummary[] = useMemo(() => {
    return rows.map((t) => {
      const totalGross = t.lines.reduce((s, l) => s + toNum(l.grossAmount), 0);
      const totalVat = t.lines.reduce((s, l) => s + toNum(l.vatAmount), 0);
      const totalProfit = t.lines.reduce((s, l) => s + toNum(l.profit), 0);
      const totalNet = totalGross - totalVat;

      // Prefer any BE-provided name; fall back to blank
      const staffName = (t.createdByName ?? t.staffName ?? "") || null;

      return {
        txId: t.txId,
        createdAt: t.createdAt,
        terminalId: t.terminalId,
        staffId: t.createdByUserId, // display as Staff ID (renamed from createdByUserId)
        staffName,
        totalGross,
        totalVat,
        totalProfit,
        totalNet,
        lines: t.lines,
      };
    });
  }, [rows]);

  // ===== View Items Dialog =====
  const [openFor, setOpenFor] = useState<TxnSummary | null>(null);

  if (!CAN_VIEW) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>Transactions</Typography>
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">
            You don’t have permission to view Transactions.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" className="mb-4">Transactions</Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <TextField
            type="datetime-local"
            size="small"
            label="Date From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="datetime-local"
            size="small"
            label="Date To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField size="small" label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <TextField size="small" label="Product Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            size="small"
            label="Min Qty"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          />
          <TextField
            size="small"
            label="Max Qty"
            value={maxQty}
            onChange={(e) => setMaxQty(e.target.value)}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          />
          {/* Tx ID filter removed per requirement */}
          <Button variant="outlined" onClick={clearFilters}>Clear</Button>
          <Button variant="contained" onClick={fetchData}>Apply</Button>
        </Stack>

        {status === "loading" && (
          <Typography color="text.secondary" variant="body2">Loading transactions…</Typography>
        )}
        {status === "error" && (
          <Typography color="error" variant="body2">Failed to load transactions: {error}</Typography>
        )}
      </Stack>

      <DataTable<TxnSummary>
        columns={[
          // { key: "txId", header: "TX ID" },  // hidden per requirement
          { key: "createdAt", header: "CREATED", render: (r) => formatDateTime(r.createdAt) },
          { key: "terminalId", header: "TERMINAL" },
          { key: "staffId", header: "STAFF ID", render: (r) => String(r.staffId ?? "") },
          { key: "staffName", header: "STAFF NAME", render: (r) => r.staffName || "—" },
          { key: "totalNet", header: "NET (no VAT)", render: (r) => currency(r.totalNet) },
          { key: "totalGross", header: "GROSS", render: (r) => currency(r.totalGross) },
          { key: "totalVat", header: "VAT", render: (r) => currency(r.totalVat) },
          { key: "totalProfit", header: "PROFIT", render: (r) => currency(r.totalProfit) },
          {
            key: "actions",
            header: "ACTIONS",
            render: (r) => (
              <Button size="small" variant="outlined" onClick={() => setOpenFor(r)}>
                View
              </Button>
            ),
          },
        ]}
        rows={summaries}
        getKey={(r) => String(r.txId)}
      />

      <Dialog open={!!openFor} onClose={() => setOpenFor(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Transaction Details • {openFor ? formatDateTime(openFor.createdAt) : ""}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Terminal: <b>{openFor?.terminalId}</b> • Staff ID: <b>{openFor?.staffId ?? ""}</b> • Staff name: <b>{openFor?.staffName || "—"}</b>
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Selling Price (Net)</TableCell>
                <TableCell align="right">Gross</TableCell>
                <TableCell align="right">VAT</TableCell>
                <TableCell align="right">Profit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openFor?.lines.map((ln, i) => {
                const gross = toNum(ln.grossAmount);
                const vat = toNum(ln.vatAmount);
                const net = gross - vat;
                return (
                  <TableRow key={`${ln.sku}-${i}`}>
                    <TableCell>{ln.sku}</TableCell>
                    <TableCell>{ln.name}</TableCell>
                    <TableCell align="right">{ln.qty}</TableCell>
                    <TableCell align="right">{currency(net)}</TableCell>
                    <TableCell align="right">{currency(gross)}</TableCell>
                    <TableCell align="right">{currency(vat)}</TableCell>
                    <TableCell align="right">{currency(toNum(ln.profit))}</TableCell>
                  </TableRow>
                );
              })}
              {openFor && (
                <TableRow>
                  <TableCell colSpan={3}><b>Totals</b></TableCell>
                  <TableCell align="right"><b>{currency(openFor.totalNet)}</b></TableCell>
                  <TableCell align="right"><b>{currency(openFor.totalGross)}</b></TableCell>
                  <TableCell align="right"><b>{currency(openFor.totalVat)}</b></TableCell>
                  <TableCell align="right"><b>{currency(openFor.totalProfit)}</b></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Transactions;
