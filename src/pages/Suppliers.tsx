// src/pages/Suppliers.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, TextField, InputAdornment,
  Button, Menu, MenuItem, Chip, Table, TableHead, TableRow,
  TableCell, TableBody
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext"; // <<< permissions

type OutOfStockRow = {
  id?: number;
  sku: string;
  barcode?: string;
  name: string;
  quantity: number;
  measurement?: string;
  status?: string;
};

type ApiResponse<T> = { code: string; message: string; data: T };

function unwrapArray<T>(payload: any): T[] {
  const p = payload;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.content)) return p.data.content;
  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.products)) return p.products;
  return [];
}

function toMatrix(rows: OutOfStockRow[]) {
  const header = ["SKU", "Barcode", "Product name", "Quantity", "Measurement", "Status"];
  const body = rows.map(r => [
    r.sku ?? "",
    r.barcode ?? "",
    r.name ?? "",
    r.quantity ?? 0,
    r.measurement ?? "",
    r.status ?? "Out of stock",
  ]);
  return { header, body };
}

const Suppliers: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW = can("SUPPLIERS", "VIEW");

  const [rows, setRows] = useState<OutOfStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.sku ?? "").toLowerCase().includes(s) ||
      (r.barcode ?? "").toLowerCase().includes(s) ||
      (r.name ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  // ensure header from localStorage
  useEffect(() => {
    const biz = localStorage.getItem("x.business.id");
    if (biz) {
      (client as any).defaults.headers.common["X-Business-Id"] = biz;
    } else {
      delete (client as any).defaults.headers.common["X-Business-Id"];
    }
  }, []);

  const fetchData = async () => {
    if (!CAN_VIEW) return; // guard
    setLoading(true);
    setErr(null);
    try {
      const { data } = await client.get<ApiResponse<OutOfStockRow[]>>("/api/inventory/out-of-stock");
      const arr = unwrapArray<OutOfStockRow>(data);
      setRows(
        arr.map(r => ({
          ...r,
          quantity: Number(r.quantity ?? 0),
          status: r.status ?? "Out of stock",
        }))
      );
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CAN_VIEW]);

  // ---------- Export / Share ----------
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const { header, body } = toMatrix(filtered);
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Out of stock");
      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(
        new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        "suppliers-out-of-stock.xlsx"
      );
    } catch (e) {
      console.error("xlsx export failed:", e);
    } finally {
      closeMenu();
    }
  };

  const exportPdf = async () => {
    const { header, body } = toMatrix(filtered);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Out of stock - Suppliers", 14, 16);
      autoTable(doc, {
        startY: 22,
        head: [header],
        body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [22, 160, 133] },
      });
      doc.save("suppliers-out-of-stock.pdf");
    } catch (e) {
      console.error("pdf export failed:", e);
    } finally {
      closeMenu();
    }
  };

  const toCsvBlob = (rows: OutOfStockRow[]) => {
    const { header, body } = toMatrix(rows);
    const csv = [header.join(","), ...body.map(r => r.map(v => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
    };

  const shareCsv = async () => {
    try {
      const blob = toCsvBlob(filtered);
      const canShareFile =
        (navigator as any).canShare &&
        (navigator as any).canShare({
          files: [new File([blob], "suppliers-out-of-stock.csv", { type: "text/csv" })],
        });
      if ((navigator as any).share && canShareFile) {
        const file = new File([blob], "suppliers-out-of-stock.csv", { type: "text/csv" });
        await (navigator as any).share({
          title: "Out of stock - Suppliers",
          text: "Export from Ipachi POS Portal",
          files: [file],
        });
      } else {
        downloadBlob(blob, "suppliers-out-of-stock.csv");
      }
    } catch (e) {
      console.error("share failed:", e);
    } finally {
      closeMenu();
    }
  };

  if (!CAN_VIEW) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>Suppliers</Typography>
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">
            You don’t have permission to view Suppliers.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Suppliers</Typography>

      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
        <TextField
          placeholder="Search product"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 720 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <div>
          <Button
            variant="contained"
            color="success"
            onClick={openMenu}
            sx={{ textTransform: "uppercase", px: 2 }}
          >
            Export/Share
          </Button>
          <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
            <MenuItem onClick={exportExcel}>Export to Excel (.xlsx)</MenuItem>
            <MenuItem onClick={exportPdf}>Export to PDF</MenuItem>
            <MenuItem onClick={shareCsv}>Share / Download CSV</MenuItem>
          </Menu>
        </div>
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
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && err && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="error" variant="body2" sx={{ p: 2 }}>
                    {err}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && !err && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
                    No out of stock products.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && !err && filtered.map((r, i) => (
              <TableRow key={`${r.sku}-${i}`} hover>
                <TableCell>{r.sku}</TableCell>
                <TableCell>{r.barcode || "-"}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.measurement || "unit"}</TableCell>
                <TableCell>
                  <Chip
                    label={r.status || "Out of stock"}
                    color="error"
                    variant="outlined"
                    size="small"
                    sx={{ color: "#c00", borderColor: "transparent", fontWeight: 600 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default Suppliers;
