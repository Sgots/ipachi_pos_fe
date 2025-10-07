import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  Legend,
  LabelList,
} from "recharts";
import { useReactToPrint } from "react-to-print";
import client from "../api/client";
import { useAuth } from "../auth/AuthContext";

type ReportType = "Comprehensive" | "Cash Up" | "Trade Account Statement";

const COLORS = ["#2f7ae5", "#ef6c00", "#6d28d9", "#10b981", "#9ca3af", "#f59e0b", "#ef4444"];
const brand = { dark: "#0c5b4a", pale: "#e7f3ec" };

type ApiResponse<T> = { code: number | string; message: string; data: T };

/* ------------------------------------------------------------------ */
/* Helper utilities                                                   */
/* ------------------------------------------------------------------ */
const toIsoStart = (d: string) => new Date(d + "T00:00:00").toISOString();
const toIsoEnd = (d: string) => new Date(d + "T23:59:59").toISOString();

const fmtMoney = (n: number | string | (number | string)[] | null | undefined) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(Array.isArray(n) ? (n[0] as number | string) : (n ?? 0)));

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
  xs.length <= 1
    ? xs[0] ?? ""
    : xs.length === 2
    ? `${xs[0]} and ${xs[1]}`
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/* ------------------------------------------------------------------ */
/* Types for API payloads                                             */
/* ------------------------------------------------------------------ */
type CashRow = {
  name: string;
  sku: string;
  buyingCash: number;
  profit: number;
  effectiveTotal: number;
};
type CashTotals = {
  totalBuyingCash: number;
  totalProfit: number;
  cashBalance: number;
};

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */
const Reports: React.FC = () => {
  const { can, businessName } = useAuth();
  const CAN_VIEW_REPORTS = can("REPORTS", "VIEW");

  /* ---------- Business-ID handling ---------- */
  const readBiz = () => localStorage.getItem("x.business.id") || "";
  const [bizId, setBizId] = useState<string>(readBiz());

  const applyHeaders = useCallback(() => {
    const headers = (client as any).defaults.headers.common || {};
    const user = localStorage.getItem("x.user.id") || "1";
    const term = localStorage.getItem("x.terminal.id") || "1";

    if (bizId) headers["X-Business-Id"] = bizId;
    else delete headers["X-Business-Id"];
    headers["X-User-Id"] = user;
    headers["X-Terminal-Id"] = term;

    (client as any).defaults.headers.common = headers;
  }, [bizId]);

  useEffect(() => {
    applyHeaders();
  }, [applyHeaders]);

  /* ---------- UI controls ---------- */
  const [reportType, setReportType] = useState<ReportType>("Comprehensive");
  const now = new Date();
  const ytd = `${now.getFullYear()}-01-01`;
  const today = now.toISOString().slice(0, 10);
  const [start, setStart] = useState<string>(ytd);
  const [end, setEnd] = useState<string>(today);

  /* ---------- Data state ---------- */
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<any>({
    customersServed: 0,
    totalSales: 0,
    totalVat: 0,
    overallProfit: 0,
    topProduct: "-",
  });
  const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [bestThree, setBestThree] = useState<any[]>([]);
  const [profitByCategory, setProfitByCategory] = useState<any[]>([]);
  const [salesByLocation, setSalesByLocation] = useState<any[]>([]);
  const [cashRows, setCashRows] = useState<CashRow[]>([]);
  const [cashTotals, setCashTotals] = useState<CashTotals>({
    totalBuyingCash: 0,
    totalProfit: 0,
    cashBalance: 0,
  });
  const [ta, setTA] = useState<any>({
    sales: 0,
    openingStock: 0,
    newStock: 0,
    closingStock: 0,
    costOfSales: 0,
    grossPL: 0,
  });
  const [errNote, setErrNote] = useState<string>("");
  const [currMonthByProduct, setCurrMonthByProduct] = useState<any[]>([]);
  const [prevMonthByProduct, setPrevMonthByProduct] = useState<any[]>([]);

  const params = useMemo(() => ({ start: toIsoStart(start), end: toIsoEnd(end) }), [start, end]);
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);
  const totalBestThree = useMemo(
    () => bestThree.reduce((s, r) => s + Number(r?.value ?? 0), 0),
    [bestThree]
  );
  /* ---------- Data loading ---------- */
  const loadAll = async () => {
    if (!CAN_VIEW_REPORTS) {
      setErrNote("You don't have permission to view Reports.");
      setKpis({ customersServed: 0, totalSales: 0, totalVat: 0, overallProfit: 0, topProduct: "-" });
      setSalesByProduct([]);
      setSalesTrend([]);
      setBestThree([]);
      setProfitByCategory([]);
      setSalesByLocation([]);
      setCashRows([]);
      setCashTotals({ totalBuyingCash: 0, totalProfit: 0, cashBalance: 0 });
      setTA({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
      setCurrMonthByProduct([]);
      setPrevMonthByProduct([]);
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
      setKpis(dash.data ?? kpis);

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
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-product", { params: { start: cmStart, end: cmEnd } }),
        client.get<ApiResponse<any[]>>("/api/reports/sales-by-product", { params: { start: pmStart, end: pmEnd } }),
      ]);

      setSalesByProduct(arr(sbp?.data).map((r: any) => ({ name: r.name, value: Number(r.total) })));
      setSalesTrend(arr(trend?.data).map((r: any) => ({ month: r.period, value: Number(r.total) })));
      setBestThree(arr(top3?.data).map((r: any) => ({ name: r.name, value: Number(r.total) })));
      setProfitByCategory(arr(cat?.data).map((r: any) => ({ name: r.category, value: Number(r.profit) })));
      setSalesByLocation(arr(loc?.data).map((r: any) => ({ name: r.location, value: Number(r.total) })));

      setCurrMonthByProduct(
        arr(curMonth?.data).map((r: any) => ({
          sku: r.sku,
          name: r.name,
          total: Number(r.total ?? 0),
        }))
      );
      setPrevMonthByProduct(
        arr(prevMonth?.data).map((r: any) => ({
          sku: r.sku,
          name: r.name,
          total: Number(r.total ?? 0),
        }))
      );

      if (reportType === "Cash Up" || reportType === "Comprehensive") {
        const { data } = await client.get<ApiResponse<any>>("/api/reports/cashup", { params });
        const rows = Array.isArray(data?.data?.rows) ? data.data.rows : [];
        const totals = data?.data?.totals ?? {};

        setCashRows(
          rows.map((r: any) => ({
            name: r.name,
            sku: r.sku,
            buyingCash: Number(r.buyingCash ?? 0),
            profit: Number(r.profit ?? 0),
            effectiveTotal: Number(r.effectiveTotal ?? 0),
          }))
        );
        setCashTotals({
          totalBuyingCash: Number(totals.totalBuyingCash ?? 0),
          totalProfit: Number(totals.totalProfit ?? 0),
          cashBalance: Number(totals.cashBalance ?? 0),
        });
      } else {
        setCashRows([]);
        setCashTotals({ totalBuyingCash: 0, totalProfit: 0, cashBalance: 0 });
      }

      if (reportType === "Trade Account Statement" || reportType === "Comprehensive") {
        const { data } = await client.get<ApiResponse<any>>("/api/reports/trade-account", { params });
        setTA(data?.data ?? ta);
      } else {
        setTA({ sales: 0, openingStock: 0, newStock: 0, closingStock: 0, costOfSales: 0, grossPL: 0 });
      }
    } catch (e: any) {
      const status = e?.response?.status;
      console.error("Reports loadAll() failed:", status, e?.response?.data || e?.message);
      if (status === 403) setErrNote("Access denied (403). Check headers.");
      else if (status === 400) setErrNote("Bad request (400). Verify dates.");
      else setErrNote("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, params.start, params.end, bizId, CAN_VIEW_REPORTS]);
const computeGrossMarginPct = (taObj: any, kpiObj: any) => {
  const sales = Number(taObj?.sales ?? 0);
  const cogs  = Number(taObj?.costOfSales ?? 0);

  // Prefer Trade Account Statement figures if present
  if (sales > 0) {
    return ((sales - cogs) / sales) * 100;
  }

  // Fallback to dashboard KPIs if TA not available/zero
  const totalSales = Number(kpiObj?.totalSales ?? 0);
  const grossProfit = Number(kpiObj?.overallProfit ?? 0);
  if (totalSales > 0) {
    return (grossProfit / totalSales) * 100;
  }
  return null;
};

  /* ---------- Derived comments ---------- */
  const comments = useMemo(() => {
const grossMarginPct = computeGrossMarginPct(ta, kpis);

    const totalByProducts = salesByProduct.reduce((a, r) => a + Number(r?.value ?? 0), 0);
    const best = salesByProduct.reduce((a, b) => (Number(b?.value) > Number(a?.value) ? b : a), null as any);
    const least = salesByProduct.reduce((a, b) => (!a || Number(b?.value) < Number(a?.value) ? b : a), null as any);
    const bestPct = totalByProducts && best ? (100 * Number(best.value)) / totalByProducts : null;

    let momLine: string | null = null;
    if (prevMonthByProduct.length || currMonthByProduct.length) {
      const prevTotal = prevMonthByProduct.reduce((s, r) => s + Number(r.total ?? 0), 0);
      const currTotal = currMonthByProduct.reduce((s, r) => s + Number(r.total ?? 0), 0);
      if (prevTotal > 0) {
        const delta = currTotal - prevTotal;
        const pct = (delta / prevTotal) * 100;
        const directionPositive = delta >= 0;

        const mapRows = (rows: any[]) => {
          const m = new Map<string, { name: string; total: number }>();
          rows.forEach((r) =>
            m.set(String(r.sku ?? r.name).toLowerCase(), {
              name: r.name,
              total: Number(r.total ?? 0),
            })
          );
          return m;
        };

        const curM = mapRows(currMonthByProduct);
        const preM = mapRows(prevMonthByProduct);
        const keys = new Set([...curM.keys(), ...preM.keys()]);
        const deltas: { name: string; delta: number }[] = [];

        keys.forEach((k) => {
          const c = curM.get(k)?.total ?? 0;
          const p = preM.get(k)?.total ?? 0;
          deltas.push({ name: curM.get(k)?.name ?? preM.get(k)?.name ?? "", delta: c - p });
        });

        const drivers = deltas
          .filter((d) => (directionPositive ? d.delta > 0 : d.delta < 0))
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 2)
          .map((d) => d.name)
          .filter(Boolean);

        const driversText = drivers.length ? `, driven mainly by ${joinWithAnd(drivers)}` : "";
        momLine = `Sales ${directionPositive ? "increased" : "declined"} by ${Math.abs(pct).toFixed(
          0
        )}% compared to the previous month${driversText}.`;
      }
    }

    let turnoverText: string | null = null;
    const opening = Number(ta.openingStock ?? 0);
    const closing = Number(ta.closingStock ?? 0);
    const cogs = Number(ta.costOfSales ?? 0);
    const avgInv = (opening + closing) / 2;
    if (avgInv > 0) {
      const turns = cogs / avgInv;
      turnoverText = `Stock turnover is ${turns.toFixed(2)} times`;
    }

    const list: string[] = [];
    if (momLine) list.push(momLine);
// Prefer Trade Account Statement's Gross P/L; fall back to dashboard KPI if TA missing
const taGrossPL = Number(ta?.grossPL);
const useTAGross = Number.isFinite(taGrossPL);
const grossPLValue = useTAGross ? taGrossPL : Number(kpis?.overallProfit ?? 0);

list.push(
  `Business made a Gross ${grossPLValue >= 0 ? "Profit" : "Loss"} of BWP ${fmtMoney(Math.abs(grossPLValue))}`
);

    if (best && bestPct != null) {
      list.push(`${best.name} is the best performer, contributing ${Math.round(bestPct)}% of total sales.`);
    } else if (kpis.topProduct) {
      list.push(`Best performing product: ${kpis.topProduct}`);
    }
    if (least) list.push(`${least.name} is the least contributor to total sales and may require attention`);
    list.push(`Gross Margin is ${grossMarginPct != null ? `${Math.round(grossMarginPct)}%` : "-"}`);
    if (turnoverText) list.push(turnoverText);

    return list;
  }, [kpis, salesByProduct, currMonthByProduct, prevMonthByProduct, ta, reportType]);

  const handleSaveBiz = () => {
    localStorage.setItem("x.business.id", bizId.trim());
    applyHeaders();
    loadAll();
  };

  /* ---------- Print (exact WYSIWYG, continuous flow) ---------- */
  const [printableReady, setPrintableReady] = useState(false);
  const printableRef = useRef<HTMLDivElement | null>(null);

  // robust callback ref so we always catch the node when it mounts
  const setPrintableRef = useCallback((node: HTMLDivElement | null) => {
    printableRef.current = node;
    setPrintableReady(!!node);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printableRef, // or content: () => printableRef.current
    documentTitle: `${businessName ?? "Business"}'s Comprehensive Report For A Period Starting ${start} to ${end}`,
    onBeforeGetContent: () => new Promise((r) => setTimeout(r, 150)),
    onAfterPrint: () => console.log("Export complete"),
    pageStyle: `
      @page { size: A3 landscape; margin: 12mm; }
      @page { size: 420mm 297mm; }
      @media print {
        * { box-sizing: border-box; }
        html, body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print { display: none !important; }
        .print-row {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: stretch !important;
          gap: 12px !important;
          break-inside: auto !important; /* Allow row to split */
        }
        .print-inline {
          display: block !important;
          max-width: 100% !important;
          break-inside: avoid !important; /* Keep individual charts intact */
        }
        .print-inline.w-66 { flex: 0 0 calc(66.6667% - 6px) !important; }
        .print-inline.w-33 { flex: 0 0 calc(33.3333% - 6px) !important; }
        .print-inline.w-50 { flex: 0 0 calc(50% - 6px) !important; }
        .chart-paper {
          width: 100% !important;
          overflow: visible !important;
          padding-bottom: 8px !important;
        }
        .recharts-tooltip-wrapper, .recharts-default-tooltip {
          display: none !important;
        }
        /* Preserve Trade Account Statement grid layout */
        [data-export="section"][data-title="Trade Account Statement"] .MuiGrid-container {
          display: grid !important;
          grid-template-columns: repeat(6, 1fr) !important;
          gap: 8px !important; /* Adjusted for tighter fit */
          break-inside: avoid !important;
        }
        [data-export="section"][data-title="Trade Account Statement"] .MuiGrid-item {
          width: auto !important;
          max-width: none !important;
          flex: 0 0 calc(16.6667% - 6.4px) !important; /* 1/6th of container minus gap adjustment */
        }
        /* Explicitly enforce inline layout for Profit by Category and Sales by Location */
        [data-export="section"]:nth-child(4) .print-row > .print-inline:nth-child(2),
        [data-export="section"]:nth-child(4) .print-row > .print-inline:nth-child(3) {
          flex: 0 0 calc(50% - 6px) !important;
          max-width: calc(50% - 6px) !important;
        }
      }
    `,
    removeAfterPrint: true,
  } as any);

  /* ---------- Enhanced Pie labels (values on slices, print-optimized) ---------- */
  const renderValueLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value, percent } = props;
    if (Number(value) < 1000) return null; // Hide small labels to avoid clutter

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12} // Slightly larger for print
        fontWeight={700}
        style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }} // Print-friendly shadow
      >
        {`BWP ${fmtMoney(value)}`}
      </text>
    );
  };

  /* ---------- Render ---------- */
  if (!CAN_VIEW_REPORTS) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          You don’t have permission to view Reports.
        </Typography>
      </Box>
    );
  }

  const showCash = reportType === "Cash Up" || reportType === "Comprehensive";
  const showTA = reportType === "Trade Account Statement" || reportType === "Comprehensive";

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5" }}>
      {/* Controls bar (kept outside of printable block by default) */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: brand.dark }}>
        Reports
      </Typography>

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
          <Button
            variant="contained"
            onClick={handleSaveBiz}
            sx={{ bgcolor: brand.dark, "&:hover": { bgcolor: "#094d3e" } }}
          >
            Save
          </Button>
        </Paper>
      )}

      {errNote && (
        <Paper sx={{ p: 2, mb: 3, borderLeft: "4px solid #ef4444", bgcolor: "#fff5f5", borderRadius: 2 }}>
          <Typography color="error" sx={{ fontWeight: 700, mb: 0.5 }}>
            Error
          </Typography>
          <Typography variant="body2">{errNote}</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md="auto">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="rpt-type">Report Type</InputLabel>
              <Select
                labelId="rpt-type"
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                sx={{ bgcolor: "white" }}
              >
                <MenuItem value="Comprehensive">Comprehensive Report</MenuItem>
                <MenuItem value="Cash Up">Cash Up Report</MenuItem>
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
              sx={{ bgcolor: "white" }}
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
              sx={{ bgcolor: "white" }}
            />
          </Grid>
          <Grid item xs />
          <Grid item xs={12} md="auto">
            <Button
              variant="contained"
              className="no-print"
              onClick={handlePrint}
              disabled={loading || !printableReady}
              sx={{ bgcolor: brand.dark, "&:hover": { bgcolor: "#094d3e" } }}
            >
              Export PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 🔽 Everything below will be printed/exported (exactly as seen, continuous) */}
      <div id="print-root" ref={setPrintableRef}>
        <div data-export="section" data-title="Dashboard KPIs">
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card">
            <Grid container spacing={1} sx={{ flexWrap: "nowrap", overflowX: "auto" }}>
              {[
                { label: "Customers Served", value: Number(kpis.customersServed ?? 0).toLocaleString() },
                { label: "Total Sales", value: `BWP ${fmtMoney(kpis.totalSales)}` },
                { label: "Total VAT", value: `BWP ${fmtMoney(kpis.totalVat)}` },
                { label: "Overall Profit", value: `BWP ${fmtMoney(kpis.overallProfit)}` },
                { label: "Top Selling Product", value: kpis.topProduct ?? "-" },
              ].map((kpi, i) => (
                <Grid item xs={2.4} key={i}>
                  <Box sx={{ p: 1, bgcolor: brand.pale, borderRadius: 2, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
                      {kpi.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: brand.dark, mt: 0.5, fontSize: "0.9rem" }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </div>

        <Grid container spacing={2} sx={{ mb: 3 }} className="print-row">
          <Grid item xs={12} md={8} className="print-inline w-66">
            <Paper sx={{ p: 2, height: 360, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card chart-paper">
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
                Sales by Product
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByProduct} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={40} tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => fmtMoney(v)}
                    label={{ value: "BWP", angle: -90, position: "insideLeft", fontSize: 10 }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => `BWP ${fmtMoney(v as number)}`} />
                  <Bar dataKey="value" fill={COLORS[0]} name="Sales" maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4} className="print-inline w-33">
            <Paper sx={{ p: 2, height: 360, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card chart-paper">
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
                Sales Trends
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" interval={0} height={40} tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => fmtMoney(v)}
                    label={{ value: "BWP", angle: -90, position: "insideLeft", fontSize: 10 }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => `BWP ${fmtMoney(v as number)}`} />
                  <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} name="Sales Trend" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }} className="print-row">
          <Grid item xs={12} md={4} className="print-inline w-33">
            <Paper sx={{ p: 2, height: 300, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)", position: "relative" }} className="card chart-paper">
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
                Best 3 Performers
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 36 }}>
                  <Pie data={bestThree} dataKey="value" nameKey="name" outerRadius={80} labelLine={false}>
                    {bestThree.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <LabelList content={renderValueLabel} />
                  </Pie>
                  <Tooltip formatter={(v) => [`${((v as number) / 100).toFixed(1)}%`]} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 8 }}
                    formatter={(value: any, entry: any) => {
                      const v = Number(entry?.payload?.value ?? 0);
                      return <span style={{ fontSize: 11 }}>{`${value} — P ${fmtMoney(v)}`}</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4} className="print-inline w-50">
            <Paper sx={{ p: 2, height: 300, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card chart-paper">
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
                Profit by Category
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitByCategory} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={40} tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => fmtMoney(v)}
                    label={{ value: "BWP", angle: -90, position: "insideLeft", fontSize: 10 }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => `BWP ${fmtMoney(v as number)}`} />
                  <Bar dataKey="value" fill={COLORS[1]} name="Profit" maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4} className="print-inline w-50">
            <Paper sx={{ p: 2, height: 300, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card chart-paper">
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, color: brand.dark }}>
                Sales by Location
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByLocation} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={40} tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => fmtMoney(v)}
                    label={{ value: "BWP", angle: -90, position: "insideLeft", fontSize: 10 }}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => `BWP ${fmtMoney(v as number)}`} />
                  <Bar dataKey="value" fill={COLORS[1]} name="Sales" maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {showCash && (
          <div data-export="section" data-title="Cash-Up Report">
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card">
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: brand.dark }}>
                Cash-Up Report
              </Typography>
              <Divider sx={{ mb: 2, bgcolor: brand.dark }} />
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: brand.pale }}>
                    <TableCell sx={{ fontWeight: 700, color: brand.dark }}>Product</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                      Buying Cash
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                      Profit
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: brand.dark }}>
                      Effective Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashRows.map((r) => (
                    <TableRow key={`${r.sku}-${r.name}`}>
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography>{r.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {r.sku}
                          </Typography>
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
              <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, color: brand.dark }}>Cash Balance</Typography>
                <Chip label={`BWP ${fmtMoney(cashTotals.cashBalance)}`} sx={{ bgcolor: brand.dark, color: "white", fontWeight: 700 }} />
              </Box>
            </Paper>
          </div>
        )}

        {showTA && (
          <div data-export="section" data-title="Trade Account Statement">
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card">
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
                    <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2, bgcolor: brand.pale }} className="card">
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
          </div>
        )}

        <div data-export="section" data-title="General Comments">
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} className="card">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: brand.dark }}>
              General Comments
            </Typography>
            {comments.map((c, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                <Box sx={{ width: 12, height: 12, bgcolor: brand.dark, borderRadius: "50%" }} />
                <Typography variant="body2" sx={{ color: brand.dark }}>
                  {c}
                </Typography>
              </Box>
            ))}
          </Paper>
        </div>
      </div>
    </Box>
  );
};

export default Reports;