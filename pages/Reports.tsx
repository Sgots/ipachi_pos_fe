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

type ApiResponse<T> = { code: string; message: string; data: T };

const toIsoStart = (d: string) => new Date(d + "T00:00:00").toISOString();
const toIsoEnd = (d: string) => new Date(d + "T23:59:59").toISOString();

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
  const [cashRows, setCashRows] = useState<any[]>([]);
  const [cashTotals, setCashTotals] = useState<any>({ totalCash: 0, totalProfit: 0, cashBalance: 0 });
  const [ta, setTA] = useState<any>({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
  const [errNote, setErrNote] = useState<string>("");

  const params = useMemo(() => ({ start: toIsoStart(start), end: toIsoEnd(end) }), [start, end]);
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);

  const loadAll = async () => {
    if (!CAN_VIEW_REPORTS) {
      setErrNote("You don't have permission to view Reports.");
      setKpis({ customersServed: 0, totalSales: 0, overallProfit: 0, topProduct: "-" });
      setSalesByProduct([]); setSalesTrend([]); setBestThree([]); setProfitByCategory([]); setSalesByLocation([]);
      setCashRows([]); setCashTotals({ totalCash: 0, totalProfit: 0, cashBalance: 0 }); setTA({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
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

      const [
        { data: sbp },
        { data: trend },
        { data: top3 },
        { data: cat },
        { data: loc },
      ] = await Promise.all([
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-product", { params }),
        client.get<ApiResponse<any[]>>("/api/reports/monthly-trend", { params }),
        client.get<ApiResponse<any[]>>("/api/reports/best-performers", { params: { ...params, top: 3 } }),
        client.get<ApiResponse<any[]>>("/api/reports/profit-by-category", { params }),
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-location", { params }),
      ]);

      setSalesByProduct(arr(sbp?.data).map((r: any) => ({ name: r.name, value: Number(r.total) })));
      setSalesTrend(arr(trend?.data).map((r: any) => ({ month: r.period, value: Number(r.total) })));
      setBestThree(arr(top3?.data).map((r: any) => ({ name: r.name, value: Number(r.total) })));
      setProfitByCategory(arr(cat?.data).map((r: any) => ({ name: r.category, value: Number(r.profit) })));
      setSalesByLocation(arr(loc?.data).map((r: any) => ({ name: r.location, value: Number(r.total) })));

      if (reportType === "Cash Up") {
        const { data } = await client.get<ApiResponse<any>>("/api/reports/cashup", { params });
        setCashRows(arr(data?.data?.rows).map((r: any) => ({
          product: r.product, cash: Number(r.cash), profit: Number(r.profit),
        })));
        setCashTotals({
          totalCash: Number(data?.data?.totals?.totalCash ?? 0),
          totalProfit: Number(data?.data?.totals?.totalProfit ?? 0),
          cashBalance: Number(data?.data?.totals?.cashBalance ?? 0),
        });
      } else {
        setCashRows([]);
        setCashTotals({ totalCash: 0, totalProfit: 0, cashBalance: 0 });
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
  }, [reportType, params.start, params.end, bizId, CAN_VIEW_REPORTS]);

  const comments = useMemo(() => {
    const grossMargin = kpis.totalSales ? (100 * (kpis.overallProfit / kpis.totalSales)).toFixed(1) + "%" : "-";
    return [
      { text: `Business made a Gross ${kpis.overallProfit >= 0 ? "Profit" : "Loss"} of BWP ${Math.abs(kpis.overallProfit).toLocaleString()}` },
      { text: `Best performing product: ${kpis.topProduct}` },
      { text: `Gross Margin is ${grossMargin}` },
    ];
  }, [kpis]);

  const exportCSV = () => {
    if (!CAN_VIEW_REPORTS) return;
    const rows: string[] = [];
    rows.push("Section,Metric,Value");
    rows.push(`KPIs,Customers Served,${kpis.customersServed}`);
    rows.push(`KPIs,Total Sales,${kpis.totalSales}`);
    rows.push(`KPIs,Overall Profit,${kpis.overallProfit}`);
    rows.push(`KPIs,Top Product,${kpis.topProduct}`);
    rows.push("");
    rows.push("Sales by Product,Item,BWP");
    salesByProduct.forEach(r => rows.push(`Sales by Product,${r.name},${r.value}`));
    rows.push("");
    rows.push("Sales Trend,Month,BWP");
    salesTrend.forEach(r => rows.push(`Sales Trend,${r.month},${r.value}`));
    rows.push("");
    rows.push("Profit by Category,Category,BWP");
    profitByCategory.forEach(r => rows.push(`Profit by Category,${r.name},${r.value}`));
    rows.push("");
    rows.push("Sales by Location,Location,BWP");
    salesByLocation.forEach(r => rows.push(`Sales by Location,${r.name},${r.value}`));
    if (reportType === "Cash Up") {
      rows.push("");
      rows.push("Cash-Up Report,Product,Cash,Profit");
      cashRows.forEach(r => rows.push(`Cash-Up Report,${r.product},${r.cash},${r.profit}`));
      rows.push(`Cash-Up Totals,Total Cash,${cashTotals.totalCash}`);
      rows.push(`Cash-Up Totals,Total Profit,${cashTotals.totalProfit}`);
      rows.push(`Cash-Up Totals,Cash Balance,${cashTotals.cashBalance}`);
    }
    if (reportType === "Trade Account Statement") {
      rows.push("");
      rows.push("Trade Account Statement,Metric,Value");
      Object.entries(ta).forEach(([k, v]) => rows.push(`Trade Account Statement,${k},${v}`));
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
            { label: "Customers Served", value: Number(kpis.customersServed || 0).toLocaleString(), unit: "" },
            { label: "Total Sales", value: Number(kpis.totalSales || 0).toLocaleString(), unit: "BWP" },
            { label: "Overall Profit", value: Number(kpis.overallProfit || 0).toLocaleString(), unit: "BWP" },
            { label: "Top Selling Product", value: kpis.topProduct, unit: "" },
          ].map((kpi, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Box sx={{ p: 2, bgcolor: brand.pale, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{kpi.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: brand.dark, mt: 0.5 }}>
                  {kpi.unit ? `${kpi.unit} ${kpi.value}` : kpi.value}
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
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
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
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
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
                  label={{ fontSize: 12 }}
                >
                  {bestThree.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
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
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
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
                  label={{ value: "BWP", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
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
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>Cash</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>Profit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cashRows.map((r) => (
                <TableRow key={r.product}>
                  <TableCell>{r.product}</TableCell>
                  <TableCell align="right">{Math.round(r.cash).toLocaleString()}</TableCell>
                  <TableCell align="right">{Math.round(r.profit).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: brand.pale }}>
                <TableCell sx={{ fontWeight: 700, color: brand.dark }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                  {Math.round(cashTotals.totalCash).toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                  {Math.round(cashTotals.totalProfit).toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Typography sx={{ mt: 2, fontWeight: 700, color: brand.dark }}>Cash Balance</Typography>
          <Chip
            label={Math.round(cashTotals.cashBalance).toLocaleString()}
            sx={{ mt: 1, bgcolor: brand.dark, color: 'white', fontWeight: 700 }}
          />
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
                    {Math.round(Number(k.value || 0)).toLocaleString()}
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