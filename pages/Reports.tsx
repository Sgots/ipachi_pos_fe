import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box, Paper, Typography, Grid, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Divider, Table, TableHead, TableRow, TableCell, TableBody, Chip
} from "@mui/material";
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

type ReportType = "Comprehensive" | "Cash Up" | "Trade Account Statement";

const COLORS = ["#2f7ae5", "#ef6c00", "#6d28d9", "#10b981", "#9ca3af", "#f59e0b", "#ef4444"];
const brand = { dark: "#0c5b4a", pale: "#e7f3ec" };

type ApiResponse<T> = { code: number | string; message: string; data: T };

const toIsoStart = (d: string) => new Date(d + "T00:00:00").toISOString();
const toIsoEnd = (d: string) => new Date(d + "T23:59:59").toISOString();

// === Month helpers for MoM drivers ===
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const monthRange = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toIsoStart(ymd(start)), end: toIsoEnd(ymd(end)) };
};

const prevMonthRange = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const end = new Date(d.getFullYear(), d.getMonth(), 0);
  return { start: toIsoStart(ymd(start)), end: toIsoEnd(ymd(end)) };
};

const joinWithAnd = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

// === Formatting helpers (display numbers exactly; currency -> 2dp) ===
const fmtMoney = (n: number | string | null | undefined) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n ?? 0));

const toFixed2 = (n: number | string | null | undefined) =>
  (Number(n ?? 0)).toFixed(2); // for CSV (no locale separators)

// === Chart formatters (axes/tooltips/labels to 2dp for currency) ===
const fmt2 = (n: number | string | null | undefined) => (Number(n ?? 0)).toFixed(2);
const money2 = (n: number | string | null | undefined) => `BWP ${fmt2(n)}`;
const yTickMoney = (value: any) => fmt2(value);
const tipMoney =
  (name: string) =>
  (value: any) =>
    [money2(value), name]; // [valueText, nameText]

// Cash-Up types
type CashRow = { name: string; sku: string; buyingCash: number; profit: number; effectiveTotal: number };
type CashTotals = { totalBuyingCash: number; totalProfit: number; cashBalance: number };

const Reports: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW_REPORTS = can("REPORTS", "VIEW");

  // === Header wiring ===
  const readBiz = () => localStorage.getItem("x.business.id") || "";
  const [bizId, setBizId] = useState<string>(readBiz());

  const applyHeaders = useCallback(() => {
    const headers = (client as any).defaults.headers.common || {};
    const user = localStorage.getItem("x.user.id") || "1";
    const term = localStorage.getItem("x.terminal.id") || "1";

    if (bizId) headers["X-Business-Id"] = bizId; else delete headers["X-Business-Id"];
    headers["X-User-Id"] = user;
    headers["X-Terminal-Id"] = term;

    (client as any).defaults.headers.common = headers;
  }, [bizId]);

  useEffect(() => {
    applyHeaders();
  }, [applyHeaders]);

  const [reportType, setReportType] = useState<ReportType>("Comprehensive");
  const now = new Date();
  const ytd = `${now.getFullYear()}-01-01`;
  const today = now.toISOString().slice(0, 10);

  const [start, setStart] = useState<string>(ytd);
  const [end, setEnd] = useState<string>(today);

  // data
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<any>({ customersServed: 0, totalSales: 0, overallProfit: 0, topProduct: "-" });
  const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [bestThree, setBestThree] = useState<any[]>([]);
  const [profitByCategory, setProfitByCategory] = useState<any[]>([]);
  const [salesByLocation, setSalesByLocation] = useState<any[]>([]);
  const [cashRows, setCashRows] = useState<CashRow[]>([]);
  const [cashTotals, setCashTotals] = useState<CashTotals>({ totalBuyingCash: 0, totalProfit: 0, cashBalance: 0 });
  const [ta, setTA] = useState<any>({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
  const [errNote, setErrNote] = useState<string>("");

  // NEW: product totals for current month vs previous month (for MoM drivers)
  const [currMonthByProduct, setCurrMonthByProduct] = useState<any[]>([]);
  const [prevMonthByProduct, setPrevMonthByProduct] = useState<any[]>([]);

  const params = useMemo(() => ({ start: toIsoStart(start), end: toIsoEnd(end) }), [start, end]);
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);

  const loadAll = async () => {
    if (!CAN_VIEW_REPORTS) {
      setErrNote("You don't have permission to view Reports.");
      setKpis({ customersServed: 0, totalSales: 0, overallProfit: 0, topProduct: "-" });
      setSalesByProduct([]); setSalesTrend([]); setBestThree([]); setProfitByCategory([]); setSalesByLocation([]);
      setCashRows([]); setCashTotals({ totalBuyingCash: 0, totalProfit: 0, cashBalance: 0 });
      setTA({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
      setCurrMonthByProduct([]); setPrevMonthByProduct([]);
      return;
    }

    if (!bizId) {
      setErrNote("Business ID is required to fetch reports.");
      return;
    }
    setErrNote("");
    setLoading(true);
    try {
      const { data: dash } = await client.get<ApiResponse<any>>("/api/reports/dashboard", { params });
      setKpis(dash.data ?? { customersServed: 0, totalSales: 0, overallProfit: 0, topProduct: "-" });

      // NEW: month windows (based on End Date)
      const { start: cmStart, end: cmEnd } = monthRange(end);
      const { start: pmStart, end: pmEnd } = prevMonthRange(end);

      const [
        { data: sbp },
        { data: trend },
        { data: top3 },
        { data: cat },
        { data: loc },
        { data: curMonth },
        { data: prevMonth },
      ] = await Promise.all([
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-product", { params }),
        client.get<ApiResponse<any[]>>("/api/reports/monthly-trend", { params }),
        client.get<ApiResponse<any[]>>("/api/reports/best-performers", { params: { ...params, top: 3 } }),
        client.get<ApiResponse<any[]>>("/api/reports/profit-by-category", { params }),
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-location", { params }),
        // MoM slices
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-product", { params: { start: cmStart, end: cmEnd } }),
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-product", { params: { start: pmStart, end: pmEnd } }),
      ]);

      // Keep values as returned; only coerce to Number for charts where needed
      setSalesByProduct(arr(sbp?.data).map((r: any) => ({ name: r.name, value: Number(r.total) })));
      setSalesTrend(arr(trend?.data).map((r: any) => ({ month: r.period, value: Number(r.total) })));
      setBestThree(arr(top3?.data).map((r: any) => ({ name: r.name, value: Number(r.total) })));
      setProfitByCategory(arr(cat?.data).map((r: any) => ({ name: r.category, value: Number(r.profit) })));
      setSalesByLocation(arr(loc?.data).map((r: any) => ({ name: r.location, value: Number(r.total) })));

      // NEW: raw per-product for MoM drivers
      setCurrMonthByProduct(arr(curMonth?.data).map((r: any) => ({
        sku: r.sku, name: r.name, total: Number(r.total ?? 0),
      })));
      setPrevMonthByProduct(arr(prevMonth?.data).map((r: any) => ({
        sku: r.sku, name: r.name, total: Number(r.total ?? 0),
      })));

      if (reportType === "Cash Up") {
        const { data } = await client.get<ApiResponse<any>>("/api/reports/cashup", { params });

        const rows = Array.isArray(data?.data?.rows) ? data.data.rows : [];
        const totals = data?.data?.totals ?? {};

        // Store numeric for charts/math but display with fmtMoney
        setCashRows(rows.map((r: any) => ({
          name: r.name,
          sku: r.sku,
          buyingCash: Number(r.buyingCash ?? 0),
          profit: Number(r.profit ?? 0),
          effectiveTotal: Number(r.effectiveTotal ?? 0),
        })));

        setCashTotals({
          totalBuyingCash: Number(totals.totalBuyingCash ?? 0),
          totalProfit: Number(totals.totalProfit ?? 0),
          cashBalance: Number(totals.cashBalance ?? 0),
        });
      } else {
        setCashRows([]);
        setCashTotals({ totalBuyingCash: 0, totalProfit: 0, cashBalance: 0 });
      }

      if (reportType === "Trade Account Statement") {
        const { data } = await client.get<ApiResponse<any>>("/api/reports/trade-account", { params });
        setTA(data?.data ?? { sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
      } else {
        setTA({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      console.error("Reports loadAll() failed:", status, body || e?.message);
      if (status === 403) {
        setErrNote("Access denied (403). Check X-User-Id, X-Terminal-Id, and X-Business-Id headers.");
      } else if (status === 400) {
        setErrNote("Bad request (400). Verify date range and parameters.");
      } else {
        setErrNote("Failed to load reports. See console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, params.start, params.end, bizId, CAN_VIEW_REPORTS]);

  const comments = useMemo(() => {
    // ---- Gross margin from KPIs
    const grossMarginPct = Number(kpis.totalSales)
      ? (100 * (Number(kpis.overallProfit) / Number(kpis.totalSales)))
      : null;

    // ---- Best / least performer + contribution %
    const totalByProducts = salesByProduct.reduce((acc: number, r: any) => acc + Number(r?.value ?? 0), 0);
    const best = salesByProduct.reduce((a: any, b: any) => (Number(b?.value ?? 0) > Number(a?.value ?? 0) ? b : a), null as any);
    const least = salesByProduct.reduce((a: any, b: any) => (a == null || Number(b?.value ?? 0) < Number(a?.value ?? 0) ? b : a), null as any);
    const bestPct = totalByProducts > 0 && best ? (100 * Number(best.value) / totalByProducts) : null;

    // ---- MoM (use monthly product slices)
    let momLine: string | null = null;
    if (prevMonthByProduct.length || currMonthByProduct.length) {
      const prevTotal = prevMonthByProduct.reduce((s, r) => s + Number(r.total ?? 0), 0);
      const currTotal = currMonthByProduct.reduce((s, r) => s + Number(r.total ?? 0), 0);

      if (prevTotal > 0) {
        const deltaTotal = currTotal - prevTotal;
        const pct = (deltaTotal / prevTotal) * 100;

        // per-product deltas (union by SKU/name key)
        const asMap = (rows: any[]) => {
          const m = new Map<string, { name: string; total: number }>();
          rows.forEach(r => m.set(String(r.sku ?? r.name).toLowerCase(), { name: r.name, total: Number(r.total ?? 0) }));
          return m;
        };
        const curM = asMap(currMonthByProduct);
        const preM = asMap(prevMonthByProduct);

        const keys = new Set<string>([...curM.keys(), ...preM.keys()]);
        const deltas: { name: string; delta: number }[] = [];
        keys.forEach(k => {
          const c = curM.get(k)?.total ?? 0;
          const p = preM.get(k)?.total ?? 0;
          deltas.push({ name: curM.get(k)?.name ?? preM.get(k)?.name ?? "", delta: c - p });
        });

        // choose drivers in the same direction as the total change
        const directionPositive = deltaTotal >= 0;
        const drivers = deltas
          .filter(d => directionPositive ? d.delta > 0 : d.delta < 0)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 2)
          .map(d => d.name)
          .filter(Boolean);

        const driversText = drivers.length ? `, driven mainly by ${joinWithAnd(drivers)}` : "";
        momLine = `Sales ${directionPositive ? "increased" : "declined"} by ${Math.abs(pct).toFixed(0)}% compared to the previous month${driversText}.`;
      }
    }

    // ---- Stock turnover (available when Trade Account Statement was loaded)
    let turnoverText: string | null = null;
      const opening = Number(ta.openingStock ?? 0);
      const closing = Number(ta.closingStock ?? 0);
      const cogs = Number(ta.costOfSales ?? 0);
      const avgInv = (opening + closing) / 2;
      if (avgInv > 0) {
        const turns = cogs / avgInv;
        turnoverText = `Stock turnover is ${turns.toFixed(2)} times`;

    }

    // Build comments list (skip nulls)
    const list: { text: string }[] = [];

    if (momLine) list.push({ text: momLine });

    list.push({
      text: `Business made a Gross ${Number(kpis.overallProfit) >= 0 ? "Profit" : "Loss"} of BWP ${fmtMoney(Math.abs(Number(kpis.overallProfit)))}`,
    });

    if (best && bestPct != null) {
      list.push({ text: `${best.name} is the best performer, contributing ${Math.round(bestPct)}% of total sales.` });
    } else {
      if (kpis.topProduct) list.push({ text: `Best performing product: ${kpis.topProduct}` });
    }

    if (least) {
      list.push({ text: `${least.name} is the least contributor to total sales and may require your attention` });
    }

    list.push({
      text: `Gross Margin is ${grossMarginPct != null ? `${Math.round(grossMarginPct)}%` : "-"}`,
    });

    if (turnoverText) list.push({ text: turnoverText });

    return list;
  }, [kpis, salesByProduct, currMonthByProduct, prevMonthByProduct, ta, reportType]);

  const exportCSV = () => {
    if (!CAN_VIEW_REPORTS) return;
    const rows: string[] = [];
    rows.push("Section,Metric,Value");
    rows.push(`KPIs,Customers Served,${kpis.customersServed}`); // count as-is
    rows.push(`KPIs,Total Sales,BWP ${toFixed2(kpis.totalSales)}`); // currency 2dp
    rows.push(`KPIs,Overall Profit,BWP ${toFixed2(kpis.overallProfit)}`); // currency 2dp
    rows.push(`KPIs,Top Product,${kpis.topProduct}`);
    rows.push("");
    rows.push("Sales by Product,Item,BWP");
    salesByProduct.forEach(r => rows.push(`Sales by Product,${r.name},${toFixed2(r.value)}`)); // currency 2dp
    rows.push("");
    rows.push("Sales Trend,Month,BWP");
    salesTrend.forEach(r => rows.push(`Sales Trend,${r.month},${toFixed2(r.value)}`)); // currency 2dp
    rows.push("");
    rows.push("Profit by Category,Category,BWP");
    profitByCategory.forEach(r => rows.push(`Profit by Category,${r.name},${toFixed2(r.value)}`)); // currency 2dp
    rows.push("");
    rows.push("Sales by Location,Location,BWP");
    salesByLocation.forEach(r => rows.push(`Sales by Location,${r.name},${toFixed2(r.value)}`)); // currency 2dp

    if (reportType === "Cash Up") {
      rows.push("");
      rows.push("Cash-Up Report,Product,SKU,Buying Cash,Profit,Effective Total");
      cashRows.forEach(r =>
        rows.push(`Cash-Up Report,${r.name},${r.sku},${toFixed2(r.buyingCash)},${toFixed2(r.profit)},${toFixed2(r.effectiveTotal)}`)
      );
      rows.push(`Cash-Up Totals,Total Buying Cash,,${toFixed2(cashTotals.totalBuyingCash)}`);
      rows.push(`Cash-Up Totals,Total Profit,,${toFixed2(cashTotals.totalProfit)}`);
      rows.push(`Cash-Up Totals,Cash Balance,,${toFixed2(cashTotals.cashBalance)}`);
    }

    if (reportType === "Trade Account Statement") {
      rows.push("");
      rows.push("Trade Account Statement,Metric,Value");
      Object.entries(ta).forEach(([k, v]) =>
        rows.push(`Trade Account Statement,${k},${toFixed2(v as any)}`) // currency-like metrics -> 2dp
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report_${start}_to_${end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveBiz = () => {
    localStorage.setItem("x.business.id", bizId.trim());
    applyHeaders();
    loadAll();
  };

  if (!CAN_VIEW_REPORTS) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          You don’t have permission to view Reports.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: brand.dark }}>Reports</Typography>

      {!bizId && (
        <Paper sx={{ p: 2, mb: 3, borderLeft: `4px solid ${brand.dark}`, bgcolor: brand.pale, borderRadius: 2 }}>
          <Typography sx={{ mb: 1, fontWeight: 700 }}>Business ID required</Typography>
          <TextField
            size="small"
            label="Business ID"
            value={bizId}
            onChange={(e) => setBizId(e.target.value)}
            sx={{ mr: 1 }}
          />
          <Button variant="contained" onClick={handleSaveBiz} sx={{ bgcolor: brand.dark, '&:hover': { bgcolor: '#094d3e' } }}>
            Save
          </Button>
        </Paper>
      )}

      {errNote && (
        <Paper sx={{ p: 2, mb: 3, borderLeft: "4px solid #ef4444", bgcolor: "#fff5f5", borderRadius: 2 }}>
          <Typography color="error" sx={{ fontWeight: 700, mb: 0.5 }}>Error</Typography>
          <Typography variant="body2">{errNote}</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md="auto">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="rpt-type">Report Type</InputLabel>
              <Select
                labelId="rpt-type"
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                sx={{ bgcolor: 'white' }}
              >
                <MenuItem value="Comprehensive">Comprehensive (YTD)</MenuItem>
                <MenuItem value="Cash Up">Cash Up</MenuItem>
                <MenuItem value="Trade Account Statement">Trade Account Statement</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md="auto">
            <TextField
              size="small"
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              sx={{ bgcolor: 'white' }}
            />
          </Grid>
          <Grid item xs={12} md="auto">
            <TextField
              size="small"
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              sx={{ bgcolor: 'white' }}
            />
          </Grid>
          <Grid item xs />
          <Grid item xs={12} md="auto">
            <Button
              variant="contained"
              sx={{ bgcolor: brand.dark, '&:hover': { bgcolor: '#094d3e' } }}
              onClick={exportCSV}
              disabled={loading || !CAN_VIEW_REPORTS}
            >
              Export Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <Grid container spacing={2} alignItems="center">
          {[
            { label: "Customers Served", value: Number(kpis.customersServed ?? 0).toLocaleString(), unit: "" }, // count as-is
            { label: "Total Sales", value: `BWP ${fmtMoney(kpis.totalSales)}`, unit: "" }, // currency 2dp
            { label: "Overall Profit", value: `BWP ${fmtMoney(kpis.overallProfit)}`, unit: "" }, // currency 2dp
            { label: "Top Selling Product", value: kpis.topProduct ?? "-", unit: "" },
          ].map((kpi, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Box sx={{ p: 2, bgcolor: brand.pale, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{kpi.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: brand.dark, mt: 0.5 }}>
                  {kpi.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
              Sales by Product
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesByProduct}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={yTickMoney}
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={tipMoney("Sales")} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="value" fill={COLORS[0]} name="Sales" maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 400, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
              Sales Trends
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesTrend}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={yTickMoney}
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={tipMoney("Sales Trend")} />
                <Legend verticalAlign="bottom" height={36} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                  name="Sales Trend"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          {/* Best 3 Performers */}
          <Paper sx={{ p: 2, height: 360, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
              Best 3 Performers
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <Pie
                  data={bestThree}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={false}
                  labelLine={false}
                >
                  {bestThree.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tipMoney("Value")} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 360, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
              Profit by Category
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={profitByCategory}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={yTickMoney}
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={tipMoney("Profit")} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="value" fill={COLORS[1]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 360, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
              Sales by Location
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesByLocation}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={yTickMoney}
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={tipMoney("Sales")} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="value" fill={COLORS[1]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Cash-Up Report */}
      {reportType === "Cash Up" && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: brand.dark }}>
            Cash-Up Report
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: brand.dark }} />
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: brand.pale }}>
                <TableCell sx={{ fontWeight: 700, color: brand.dark }}>Product</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>Buying Cash</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>Effective Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cashRows.map((r) => (
                <TableRow key={`${r.sku}-${r.name}`}>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary">SKU: {r.sku}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">BWP {fmtMoney(r.buyingCash)}</TableCell>
                  <TableCell align="right">BWP {fmtMoney(r.profit)}</TableCell>
                  <TableCell align="right">BWP {fmtMoney(r.effectiveTotal)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: brand.pale }}>
                <TableCell sx={{ fontWeight: 700, color: brand.dark }}>Totals</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                  BWP {fmtMoney(cashTotals.totalBuyingCash)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                  BWP {fmtMoney(cashTotals.totalProfit)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                  BWP {fmtMoney(cashTotals.totalBuyingCash + cashTotals.totalProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, color: brand.dark }}>Cash Balance</Typography>
            <Chip
              label={`BWP ${fmtMoney(cashTotals.cashBalance)}`}
              sx={{ bgcolor: brand.dark, color: 'white', fontWeight: 700 }}
            />
          </Box>
        </Paper>
      )}

      {/* Trade Account Statement */}
      {reportType === "Trade Account Statement" && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: brand.dark }}>
            Trade Account Statement
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: brand.dark }} />
          <Grid container spacing={2}>
            {[
              { label: "Sales", value: ta.sales },
              { label: "Opening Stock", value: ta.openingStock },
              { label: "New Stock", value: ta.newStock },
              { label: "Closing Stock", value: ta.closingStock },
              { label: "Cost of Sales", value: ta.costOfSales },
              { label: "Gross Profit/Loss", value: ta.grossPL },
            ].map((k) => (
              <Grid item xs={12} md={2} key={k.label}>
                <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2, bgcolor: brand.pale }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {k.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: brand.dark, mt: 0.5 }}>
                    BWP {fmtMoney(k.value)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Comments */}
      <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: brand.dark }}>
          General Comments
        </Typography>
        {comments.map((c, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
            <Box sx={{ width: 12, height: 12, bgcolor: brand.dark, borderRadius: "50%" }} />
            <Typography variant="body2" sx={{ color: brand.dark }}>{c.text}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default Reports;
