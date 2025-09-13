import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ReportType = "Sales" | "Profit" | "Inventory";

const COLORS = ["#2f7ae5", "#ef6c00", "#6d28d9", "#10b981", "#9ca3af", "#f59e0b", "#ef4444"];

const brand = {
  dark: "#0c5b4a",
  pale: "#e7f3ec",
  pill: "#f6faf8",
};

const Reports: React.FC = () => {
  // Filters (stub – wire to your API as needed)
  const [reportType, setReportType] = useState<ReportType>("Sales");
  const [start, setStart] = useState<string>("2025-08-01");
  const [end, setEnd] = useState<string>("2025-08-31");

  // ---- MOCK DATA (replace with API) ----
  const kpis = {
    customersServed: 1250,
    totalSales: 520000,
    overallProfit: 230000,
    topProduct: "Beans",
  };

  const salesByProduct = [
    { name: "Coke 350ml", value: 10500 },
    { name: "Maize 12.5kg", value: 1500 },
    { name: "Beans", value: 13500 },
    { name: "Magwinya", value: 5000 },
    { name: "Tomato", value: 1200 },
    { name: "Onion", value: 2500 },
    { name: "Carrot", value: 14000 },
    { name: "Chilli sauce", value: 5800 },
    { name: "Corn flake", value: 900 },
    { name: "Water", value: 1200 },
    { name: "Candy", value: 11000 },
    { name: "Koo Beans", value: 14500 },
    { name: "Beef", value: 7000 },
    { name: "Pork", value: 800 },
    { name: "Chicken", value: 1300 },
  ];

  const salesTrend = [
    { month: "Jan", value: 100000 },
    { month: "Feb", value: 125000 },
    { month: "Mar", value: 80000 },
    { month: "Apr", value: 200000 },
    { month: "May", value: 170000 },
    { month: "Jun", value: 50000 },
    { month: "Jul", value: 15000 },
    { month: "Aug", value: 90000 },
    { month: "Sep", value: 10000 },
  ];

  const bestThree = [
    { name: "Coke 350ml", value: 36 },
    { name: "Beans", value: 45 },
    { name: "Magwinya", value: 19 },
  ];

  const profitByCategory = [
    { name: "Beverages", value: 25 },
    { name: "Breakfast", value: 15 },
    { name: "Lunch", value: 5 },
    { name: "Clothes", value: 10 },
    { name: "Snacks", value: 45 },
  ];

  const salesByLocation = [
    { name: "Gaborone", value: 9000 },
    { name: "Mapoka", value: 16000 },
    { name: "Mochudi", value: 1200 },
    { name: "Selibe Phikwe", value: 6000 },
  ];

  const cashUp = [
    { product: "Coke 350ml", cash: 1000, profit: 300 },
    { product: "Maize 12.5Kg", cash: 200, profit: 60 },
    { product: "Beans", cash: 800, profit: 240 },
    { product: "Magwinya", cash: 500, profit: 150 },
    { product: "Tomato Sauce", cash: 450, profit: 135 },
    { product: "Mayonnaise", cash: 450, profit: 135 },
  ];

  const totals = useMemo(() => {
    const cash = cashUp.reduce((s, r) => s + r.cash, 0);
    const profit = cashUp.reduce((s, r) => s + r.profit, 0);
    return { cash, profit };
  }, [cashUp]);

  const tradeAccount = {
    sales: 25000,
    openingStock: 10000,
    newStock: 50000,
    closingStock: 50000,
    costOfSales: 10000,
    grossPL: 15000,
  };

  const comments = [
    { text: "Sales declined by 12% compared to the previous month, driven mainly by Beans and Coke", strong: ["12%", "Beans", "Coke"] },
    { text: "Business made a Gross Profit of BWP1500", strong: ["BWP1500"] },
    { text: "Beans is the best performer, contributing 35% of total sales.", strong: ["Beans", "35%"] },
    { text: "Maize 12.5kg is the least contributor to total sales and may require your attention", strong: ["Maize 12.5kg"] },
    { text: "Gross Margin is 65%", strong: ["65%"] },
    { text: "Stock turnover is 2.15 times", strong: ["2.15 times"] },
  ];

  // ---- EXPORT (simple CSV) ----
  const exportCSV = () => {
    const rows: string[] = [];
    rows.push("Section,Metric,Value");
    rows.push(`KPIs,Customers Served,${kpis.customersServed}`);
    rows.push(`KPIs,Total Sales (BWP),${kpis.totalSales}`);
    rows.push(`KPIs,Overall Profit (BWP),${kpis.overallProfit}`);
    rows.push(`KPIs,Top Product,${kpis.topProduct}`);
    rows.push("");
    rows.push("Sales by Product,Item,BWP");
    salesByProduct.forEach((r) => rows.push(`Sales by Product,${r.name},${r.value}`));
    rows.push("");
    rows.push("Sales Trend,Month,BWP");
    salesTrend.forEach((r) => rows.push(`Sales Trend,${r.month},${r.value}`));
    rows.push("");
    rows.push("Sales by Location,Location,BWP");
    salesByLocation.forEach((r) => rows.push(`Sales by Location,${r.name},${r.value}`));
    rows.push("");
    rows.push("Cash-Up Report,Product,Cash,Profit");
    cashUp.forEach((r) => rows.push(`Cash-Up Report,${r.product},${r.cash},${r.profit}`));
    rows.push("");
    rows.push("Trade Account Statement,Metric,Value");
    Object.entries(tradeAccount).forEach(([k, v]) => rows.push(`Trade Account Statement,${k},${v}`));

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${start}_to_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Reports
      </Typography>

      {/* Filters row */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md="auto">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="rpt-type">Select report type</InputLabel>
              <Select labelId="rpt-type" label="Select report type" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="Profit">Profit</MenuItem>
                <MenuItem value="Inventory">Inventory</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md="auto">
            <TextField size="small" type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} />
          </Grid>
          <Grid item xs={12} md="auto">
            <TextField size="small" type="date" label="End Date" InputLabelProps={{ shrink: true }} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Grid>
          <Grid item xs={12} md="auto">
            <Button variant="contained" sx={{ bgcolor: brand.dark, "&:hover": { bgcolor: "#0a4e40" } }}>
              GO
            </Button>
          </Grid>
          <Grid item xs />
          <Grid item xs={12} md="auto">
            <Button variant="contained" color="warning" onClick={exportCSV}>
              EXPORT REPORT
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">Customers Served</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{kpis.customersServed.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">BWP</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>BWP {kpis.totalSales.toLocaleString()}</Typography>
            <Typography variant="body2" color="text.secondary">Total Sales</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline">BWP</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>BWP {kpis.overallProfit.toLocaleString()}</Typography>
            <Typography variant="body2" color="text.secondary">Overall Profit</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: brand.dark, borderRadius: "50%" }} />
            <Box>
              <Typography variant="overline">Top Selling Product</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{kpis.topProduct}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Sales by Product</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByProduct} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Sales Trends</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 330 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Best 3 Performers</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bestThree} dataKey="value" nameKey="name" outerRadius={100} label>
                  {bestThree.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 330 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Profit by Category</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={profitByCategory} dataKey="value" nameKey="name" outerRadius={100} label>
                  {profitByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 330 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Sales by Location</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByLocation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Trade Account Statement */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Trade Account Statement
        </Typography>
        <Grid container spacing={2}>
          {[
            { label: "Sales", value: tradeAccount.sales },
            { label: "Opening Stock", value: tradeAccount.openingStock },
            { label: "New Stock", value: tradeAccount.newStock },
            { label: "Closing Stock", value: tradeAccount.closingStock },
            { label: "Cost of Sales", value: tradeAccount.costOfSales },
            { label: "Gross Profit/Loss", value: tradeAccount.grossPL },
          ].map((k) => (
            <Grid item xs={12} md={2} key={k.label}>
              <Paper sx={{ p: 2, textAlign: "center", borderRadius: 3 }}>
                <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                  {k.value.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Cash-Up + Comments */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Cash-Up Report</Typography>
            <Divider sx={{ mb: 1 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Cash</TableCell>
                  <TableCell align="right">Profit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashUp.map((r) => (
                  <TableRow key={r.product}>
                    <TableCell>{r.product}</TableCell>
                    <TableCell align="right">{r.cash}</TableCell>
                    <TableCell align="right">{r.profit}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.cash}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{totals.profit}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Typography sx={{ mt: 2, fontWeight: 700 }}>Cash Balance Survey</Typography>
            <Chip label="4420" sx={{ mt: 1, bgcolor: brand.pale, color: brand.dark, fontWeight: 700 }} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: brand.pale }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              General Comments
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ pl: 1 }}>
              {comments.map((c, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.2 }}>
                  <Box sx={{ width: 10, height: 10, bgcolor: brand.dark, borderRadius: "50%", mt: 1 }} />
                  <Typography sx={{ lineHeight: 1.6 }}>
                    {c.text.split(" ").map((w, i) => {
                      const t = w.replace(/[,\.]/g, "");
                      const strong = c.strong.some((s) => t.includes(s.replace(/[,\.]/g, "")));
                      return (
                        <Box key={i} component="span" sx={{ fontWeight: strong ? 700 : 400 }}>
                          {w}{" "}
                        </Box>
                      );
                    })}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
