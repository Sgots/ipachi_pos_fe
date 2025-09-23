// src/pages/Transactions.tsx
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext"; // <<< permissions

type TxnLine = {
  id: number;            // Transaction ID (header)
  date: string;          // ISO date from tx header
  name: string;          // Line name
  sku: string;           // Line SKU
  qty: number;           // Line quantity
  totalAmount: number;   // Line total
  profit: number;        // per-line profit
  remainingStock: number;// stock left for SKU after sale
};

type ApiResponse<T> = { code: string; message: string; data: T };

const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "BWP" }).format(n);

const stockFmt = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(n);

const formatDate = (iso: string) => new Date(iso).toLocaleString();

// small debounce helper
const useDebounced = <T,>(val: T, ms: number) => {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
};

const Transactions: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW = can("TRANSACTIONS", "VIEW");

  const [rows, setRows] = useState<TxnLine[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);

  // Ensure the header is on THIS axios instance too (in case login set it on a different instance)
  useEffect(() => {
    const biz = localStorage.getItem("x.business.id");
    if (biz) {
      (client as any).defaults.headers.common["X-Business-Id"] = biz;
      // console.log("[Transactions] Using X-Business-Id from localStorage:", biz);
    } else {
      delete (client as any).defaults.headers.common["X-Business-Id"];
      // console.warn("[Transactions] No x.business.id in localStorage");
    }
  }, []);

  // ------------ Filters ------------
  const [dateFrom, setDateFrom] = useState<string>("");      // HTML datetime-local value
  const [dateTo, setDateTo] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [minQty, setMinQty] = useState<string>("");
  const [maxQty, setMaxQty] = useState<string>("");
  const [txId, setTxId] = useState<string>("");

  // Debounce text inputs (avoid hammering the API while typing)
  const debSku = useDebounced(sku, 400);
  const debName = useDebounced(name, 400);
  const debMinQty = useDebounced(minQty, 400);
  const debMaxQty = useDebounced(maxQty, 400);
  const debTxId = useDebounced(txId, 400);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = {};
    if (dateFrom) p.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) p.dateTo = new Date(dateTo).toISOString();
    if (debSku.trim()) p.sku = debSku.trim();
    if (debName.trim()) p.name = debName.trim();
    if (debMinQty.trim()) p.minQty = Number(debMinQty);
    if (debMaxQty.trim()) p.maxQty = Number(debMaxQty);
    if (debTxId.trim()) p.txId = Number(debTxId);
    return p;
  }, [dateFrom, dateTo, debSku, debName, debMinQty, debMaxQty, debTxId]);

  const fetchData = async () => {
    if (!CAN_VIEW) return; // guard
    setStatus("loading");
    setError(null);
    try {
      const { data } = await client.get<ApiResponse<TxnLine[]>>("/api/transactions/lines", {
        params: queryParams,
      });

      // Normalize numeric fields in case BE sends strings
      const normalized = (data?.data ?? []).map((r: any) => ({
        ...r,
        qty: Number(r.qty),
        totalAmount: Number(r.totalAmount),
        profit: Number(r.profit ?? 0),
        remainingStock: Number(r.remainingStock ?? 0),
      })) as TxnLine[];

      setRows(normalized);
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

  // Optional: “Clear filters”
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSku("");
    setName("");
    setMinQty("");
    setMaxQty("");
    setTxId("");
  };

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
          <TextField
            size="small"
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <TextField
            size="small"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          <TextField
            size="small"
            label="Tx ID"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          />
          <Button variant="outlined" onClick={clearFilters}>Clear</Button>
          <Button variant="contained" onClick={fetchData}>Apply</Button>
        </Stack>

        {status === "loading" && (
          <Typography color="text.secondary" variant="body2">
            Loading transactions…
          </Typography>
        )}
        {status === "error" && (
          <Typography color="error" variant="body2">
            Failed to load transactions: {error}
          </Typography>
        )}
      </Stack>

      <DataTable<TxnLine>
        columns={[
          { key: "id", header: "ID" },
          { key: "date", header: "DATE", render: (t) => formatDate(t.date) },
          { key: "name", header: "NAME" },
          { key: "sku", header: "SKU" },
          { key: "qty", header: "QTY" },
          { key: "totalAmount", header: "TOTAL AMOUNT", render: (t) => currency(t.totalAmount) },
          { key: "profit", header: "PROFIT", render: (t) => currency(t.profit) },
          { key: "remainingStock", header: "REMAINING STOCK", render: (t) => stockFmt(t.remainingStock) },
        ]}
        rows={rows}
        getKey={(t) => `${t.id}-${t.sku}-${t.date}`}
      />
    </Box>
  );
};

export default Transactions;
