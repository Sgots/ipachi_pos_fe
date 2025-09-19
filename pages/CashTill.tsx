// src/pages/CashTill.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Divider,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import client from "../api/client";
import { API, endpoints } from "../api/endpoints";
import ProductCard from "../components/ProductCard";
import CloseTillDialog from "../components/CloseTillDialog";
import { useAuth } from "../auth/AuthContext";
import type { TillSession, TillSummary } from "../types/till";

type LineItem = { sku: string; name: string; price: number; qty: number };
type ProductItem = { sku: string; name: string; price: number; stock: number; lowStock?: number; img?: string };

type PaymentMethod = "CASH" | "CARD" | "ACCOUNT";

const CashTill: React.FC = () => {
  const { currentUser, terminalId } = useAuth();
  const terminal = terminalId ?? "TERMINAL_001";
  const userId = currentUser?.id ?? 1;

  const [cart, setCart] = useState<LineItem[]>([]);
  const total = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart]);

  const [search, setSearch] = useState("");
  const [scanInProgress, setScanInProgress] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [session, setSession] = useState<TillSession | null>(null);
  const [summary, setSummary] = useState<TillSummary | null>(null);
  const [openOpenDlg, setOpenOpenDlg] = useState(false);
  const [openCloseDlg, setOpenCloseDlg] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closingActual, setClosingActual] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // payment UI
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState<string>(""); // string for input control
  const [paymentRef, setPaymentRef] = useState<string>("");

  // animate map for UI feedback after checkout (optional)
  const [animateMap, setAnimateMap] = useState<Record<string, number>>({});

  const numericTerminal = terminal ? Number(terminal.replace(/\D/g, "")) : null;

  const normalizeProducts = (payload: any[]): ProductItem[] =>
    (payload ?? []).map((p: any) => ({
      sku: p.sku,
      name: p.name ?? p.productName ?? "",
      price: Number(p.sellPrice ?? p.price ?? 0),
      stock: Number(p.availableQuantity ?? p.availableQty ?? p.stock ?? p.quantity ?? 0),
      lowStock: p.lowStock ?? p.low_stock ?? 0,
      img: p.imageUrl ?? p.imageUrlSmall ?? p.image ?? "",
    }));

  const loadAllStock = async () => {
    setLoadingProducts(true);
    try {
      const res = await client.get(`${endpoints.inventory.products}/all`, { headers: { "X-User-Id": userId.toString() } });
      const payload = Array.isArray(res.data?.data ?? res.data) ? res.data.data ?? res.data : res.data.items ?? res.data.content ?? [];
      setProducts(normalizeProducts(payload));
    } catch (err) {
      console.error("Failed to load stock", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const url = search
          ? `${endpoints.inventory.products}?q=${encodeURIComponent(search)}`
          : `${endpoints.inventory.products}/all`;
        const res = await client.get(url, { headers: { "X-User-Id": userId.toString() } });
        const payload = Array.isArray(res.data?.data ?? res.data)
          ? res.data.data ?? res.data
          : res.data.items ?? res.data.content ?? [];
        setProducts(normalizeProducts(payload));
      } catch (err) {
        console.error("Failed to load products", err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, userId]);

  // Refresh till session
  const refreshTill = useCallback(async () => {
    if (!numericTerminal) {
      setSession(null);
      setSummary(null);
      return;
    }

    setRefreshing(true);
    try {
      const res = await client.get(`${API.till.active}?terminalId=${numericTerminal}`, {
        headers: { "X-User-Id": userId.toString() },
      });
      const ses = res.data?.data ?? null;
      setSession(ses);

      if (ses?.id && ses.status === "OPEN") {
        const summaryUrl =
          typeof endpoints.till.summary === "function"
            ? endpoints.till.summary(ses.id)
            : `${endpoints.till.base ?? "/api/tills"}/${ses.id}/summary`;
        const sumRes = await client.get(summaryUrl, { headers: { "X-User-Id": userId.toString() } });
        setSummary(sumRes.data?.data ?? null);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error("Failed to refresh till:", err);
    } finally {
      setRefreshing(false);
    }
  }, [numericTerminal, userId]);

  useEffect(() => {
    refreshTill();
  }, [refreshTill]);

  useEffect(() => {
    if (session?.status === "OPEN") {
      const int = setInterval(() => refreshTill(), 30000);
      return () => clearInterval(int);
    }
  }, [session?.status, refreshTill]);

  // Cart management
  const addToCart = async (sku: string) => {
    if (session?.status !== "OPEN") return;
    try {
      const res = await client.get(endpoints.inventory.lookup(sku), { headers: { "X-User-Id": userId.toString() } });
      const p = res.data?.data ?? res.data ?? {};
      const name = p.name ?? p.productName ?? sku;
      const price = p.sellPrice ?? p.price ?? 0;
      setCart((prev) => {
        const existing = prev.find((x) => x.sku === sku);
        if (existing) return prev.map((x) => (x.sku === sku ? { ...x, qty: x.qty + 1 } : x));
        return [...prev, { sku, name, price, qty: 1 }];
      });
    } catch {
      const local = products.find((x) => x.sku === sku) ?? { sku, name: sku, price: 0 };
      setCart((prev) => {
        const existing = prev.find((x) => x.sku === local.sku);
        if (existing) return prev.map((x) => (x.sku === local.sku ? { ...x, qty: x.qty + 1 } : x));
        return [...prev, { sku: local.sku, name: local.name, price: local.price, qty: 1 }];
      });
    }
  };

  const changeQty = (sku: string, delta: number) =>
    setCart((prev) => prev.map((x) => (x.sku === sku ? { ...x, qty: Math.max(0, x.qty + delta) } : x)).filter((x) => x.qty > 0));
  const removeLine = (sku: string) => setCart((prev) => prev.filter((x) => x.sku !== sku));

  // Payment helpers
  const parsedCashReceived = Number(cashReceived || 0);
  const change = Math.max(0, parsedCashReceived - total);
  const cashSufficient = parsedCashReceived >= total;

  // Checkout: optimistic update + refresh
  const handleCheckout = async () => {
    if (!numericTerminal) {
      alert("Terminal ID not numeric");
      return;
    }
    if (session?.status !== "OPEN") {
      alert("Till must be open to process checkout");
      return;
    }

    // Only cash works in this version
    if (paymentMethod !== "CASH") {
      alert("Only Cash payments are supported in this version. Please select Cash.");
      return;
    }

    if (!cashSufficient) {
      alert("Cash received is less than total. Please enter sufficient amount.");
      return;
    }

    setRefreshing(true);
    try {
      await client.post(
        API.till.checkout,
        {
          items: cart,
          terminalId: numericTerminal,
          userId,
          payment: {
            method: "CASH",
            cashReceived: parsedCashReceived,
            changeGiven: change,
          },
        },
        {
          headers: { "X-User-Id": userId.toString() },
        }
      );

      // animate map and optimistic stock update
      const newAnimate: Record<string, number> = {};
      cart.forEach((line) => {
        newAnimate[line.sku] = (newAnimate[line.sku] ?? 0) - line.qty;
      });

      setProducts((prev) =>
        prev.map((prod) => {
          const delta = newAnimate[prod.sku];
          if (!delta) return prod;
          return { ...prod, stock: Math.max(0, prod.stock + delta) };
        })
      );

      setAnimateMap(newAnimate);
      setCart([]);

      // reset payment inputs
      setCashReceived("");
      setPaymentRef("");

      // Refresh authoritative state from server and product stock
      await refreshTill();
      await loadAllStock();

      setTimeout(() => setAnimateMap({}), 900);
    } catch (err: any) {
      console.error("Checkout failed", err);
      alert(err?.response?.data?.message ?? err?.message ?? "Checkout failed");
      try {
        await loadAllStock();
      } catch {}
    } finally {
      setRefreshing(false);
    }
  };

  const handleScan = async () => {
    setScanInProgress(true);
    setTimeout(() => {
      const sku = products.length > 0 ? products[0].sku : "SKU-001";
      addToCart(sku);
      setScanInProgress(false);
    }, 600);
  };

  // Open till
  const doOpenTill = async () => {
    if (!numericTerminal) {
      alert("Terminal ID not numeric");
      return;
    }
    setOpenOpenDlg(false);
    setRefreshing(true);
    try {
      await client.post(
        API.till.open,
        {
          terminalId: numericTerminal,
          openedByUserId: userId,
          openingFloat: parseFloat(openingFloat || "0"),
          notes: "Opened from UI",
        },
        { headers: { "X-User-Id": userId.toString() } }
      );
      await refreshTill();
      await loadAllStock();
      setOpeningFloat("0");
    } catch (err: any) {
      console.error("Open till failed", err);
      await refreshTill();
    } finally {
      setRefreshing(false);
    }
  };

  // Close till (now accepts expectedCash from dialog)
  const doCloseTill = async (closingCashActualParam?: number, expectedCashParam?: number, notesParam?: string) => {
    if (!session?.id) {
      alert("No active till to close");
      return;
    }
    setOpenCloseDlg(false);
    setRefreshing(true);
    try {
      const body: any = {
        closingCashActual: closingCashActualParam ?? parseFloat(closingActual || "0"),
        notes: notesParam ?? "Closed from UI",
      };
      if (typeof expectedCashParam === "number") body.expectedCash = expectedCashParam;

      await client.post(`/api/tills/${session.id}/close`, body, { headers: { "X-User-Id": userId.toString() } });
      setClosingActual("");
      await refreshTill();
      await loadAllStock();
    } catch (err: any) {
      console.error("Close till failed", err);
      await refreshTill();
      await loadAllStock();
    } finally {
      setRefreshing(false);
    }
  };

  const overShort = useMemo(() => (summary?.expectedCash ?? 0) - Number(closingActual || 0), [closingActual, summary]);

  const handleProductCardQuantityChange = (sku: string, delta: number) => {
    setAnimateMap((prev) => {
      const next = { ...prev };
      delete next[sku];
      return next;
    });
  };

  return (
    <Box className="grid grid-cols-12 gap-4">
      {/* LEFT: Cart + Payment */}
      <Paper
        className="col-span-4 p-4"
        sx={{
          position: "relative",
          // keep the left panel visually above the product grid to avoid overlap
          zIndex: 2,
          // allow the toggle to render cleanly (don't clip visual focus)
          overflow: "visible",
        }}
      >
        <Typography variant="h5" className="mb-4 font-semibold">
          P {total.toFixed(2)}
        </Typography>

        <div className="space-y-2 max-h-[48vh] overflow-auto">
          {cart.map((it) => (
            <div key={it.sku} className="rounded border p-2">
              <div className="flex justify-between text-sm font-medium">
                <span>{it.name}</span>
                <span>{(it.price * it.qty).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600">Unit price: P{it.price.toFixed(2)}</div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="small" variant="outlined" onClick={() => changeQty(it.sku, -1)}>
                  -
                </Button>
                <span className="w-6 text-center">{it.qty}</span>
                <Button size="small" variant="outlined" onClick={() => changeQty(it.sku, 1)}>
                  +
                </Button>
                <IconButton size="small" className="ml-auto" onClick={() => removeLine(it.sku)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No items. Scan or click a product to add.
            </Typography>
          )}
        </div>

        <Divider sx={{ my: 2 }} />

        {/* Payment method selector (ToggleButtonGroup) */}
        <Stack spacing={1} sx={{ width: "100%" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Payment Method
          </Typography>

          <ToggleButtonGroup
            value={paymentMethod}
            exclusive
            onChange={(_, val) => {
              if (!val) return;
              setPaymentMethod(val);
              setCashReceived("");
              setPaymentRef("");
            }}
            aria-label="payment method"
            sx={{
              display: "flex",
              width: "100%",
              overflow: "hidden",          // prevent inner borders from overflowing
              borderRadius: 1,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
              // ensure children divide the width
            }}
          >
            <ToggleButton
              value="CASH"
              aria-label="cash"
              sx={{
                flex: "1 1 0",
                minWidth: 0,
                borderRadius: 0,
                textTransform: "none",
                px: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                "&.Mui-selected": {
                  bgcolor: "success.main",
                  color: "common.white",
                  "&:hover": { bgcolor: "success.dark" },
                },
                // left rounded corner
                "&:first-of-type": { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                "&:last-of-type": { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
              }}
            >
              <AttachMoneyIcon fontSize="small" />
              <Box component="span" sx={{ fontWeight: 600 }}>Cash</Box>
            </ToggleButton>

            <ToggleButton
              value="CARD"
              aria-label="card"
              sx={{
                flex: "1 1 0",
                minWidth: 0,
                borderRadius: 0,
                textTransform: "none",
                px: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                "&.Mui-selected": {
                  bgcolor: "success.main",
                  color: "common.white",
                  "&:hover": { bgcolor: "success.dark" },
                },
              }}
            >
              <CreditCardIcon fontSize="small" />
              <Box component="span">Card</Box>
            </ToggleButton>

            <ToggleButton
              value="ACCOUNT"
              aria-label="account"
              sx={{
                flex: "1 1 0",
                minWidth: 0,
                borderRadius: 0,
                textTransform: "none",
                px: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                "&.Mui-selected": {
                  bgcolor: "success.main",
                  color: "common.white",
                  "&:hover": { bgcolor: "success.dark" },
                },
              }}
            >
              <AccountBalanceIcon fontSize="small" />
              <Box component="span">Account</Box>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Cash inputs */}
          {paymentMethod === "CASH" && (
            <>
              <TextField
                label="Amount Received"
                placeholder="0.00"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">P</InputAdornment> }}
                inputProps={{ inputMode: "decimal", step: "0.01" }}
                fullWidth
                disabled={refreshing}
                sx={{ mt: 1 }}
              />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2">Change</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  P {change.toFixed(2)}
                </Typography>
              </Box>
            </>
          )}

          {/* Card / Account placeholder input (disabled) */}
          {(paymentMethod === "CARD" || paymentMethod === "ACCOUNT") && (
            <TextField
              label={paymentMethod === "CARD" ? "Card Ref (not active)" : "Account Ref (not active)"}
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              fullWidth
              disabled
              sx={{ mt: 1 }}
            />
          )}
        </Stack>

        <Button
          className="mt-6 w-full"
          size="large"
          variant="contained"
          color="success"
          disabled={
            cart.length === 0 ||
            session?.status !== "OPEN" ||
            refreshing ||
            (paymentMethod === "CASH" ? !cashSufficient : false)
          }
          onClick={handleCheckout}
          sx={{ mt: 2 }}
        >
          {refreshing ? <CircularProgress size={24} /> : paymentMethod === "CASH" ? "PAY (Cash)" : "PAY"}
        </Button>

        {paymentMethod !== "CASH" && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Note: only Cash payments are supported in this version — Card/Account will be available later.
          </Typography>
        )}
      </Paper>

      {/* RIGHT: Products */}
      <Box className="col-span-8 space-y-3">
        <Paper className="p-3 flex items-center gap-3 justify-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={terminal.replace("_", " ")} variant="outlined" />
            {refreshing && <CircularProgress size={20} />}
            {session?.status === "OPEN" ? (
              <>
                <Chip color="success" label="TILL: OPEN" />
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  startIcon={<LockIcon />}
                  onClick={() => {
                    setClosingActual("");
                    setOpenCloseDlg(true);
                  }}
                  disabled={refreshing}
                >
                  Close Till
                </Button>
              </>
            ) : (
              <>
                <Chip color="warning" label="TILL: CLOSED" />
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<LockOpenIcon />}
                  onClick={() => {
                    setOpeningFloat("0");
                    setOpenOpenDlg(true);
                  }}
                  disabled={refreshing}
                >
                  Open Till
                </Button>
              </>
            )}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, px: 4 }}>
            <TextField
              placeholder="SEARCH"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              disabled={refreshing}
            />
            <Button
              onClick={handleScan}
              variant="contained"
              color="warning"
              disabled={scanInProgress || refreshing || session?.status !== "OPEN"}
              sx={{ minWidth: 120 }}
            >
              {scanInProgress ? "SCANNING..." : "SCAN"}
            </Button>
          </Stack>
        </Paper>

        <Divider />

        <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-2 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.sku}
              sku={p.sku}
              name={p.name}
              price={p.price}
              stock={p.stock}
              lowStock={p.lowStock}
              img={p.img}
              onAdd={() => {
                if (session?.status === "OPEN" && p.stock > 0) addToCart(p.sku);
              }}
              disabled={session?.status !== "OPEN" || refreshing}
              animateDelta={animateMap[p.sku] ?? 0}
              onQuantityChange={(delta) => handleProductCardQuantityChange(p.sku, delta)}
            />
          ))}
        </div>
      </Box>

      {/* Open Till Dialog */}
      <Dialog open={openOpenDlg} onClose={() => setOpenOpenDlg(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Open Till</DialogTitle>
        <DialogContent>
          <Box className="pt-2">
            <TextField label="Opening Float" type="number" fullWidth value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} disabled={refreshing} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOpenDlg(false)} disabled={refreshing}>
            Cancel
          </Button>
          <Button variant="contained" onClick={doOpenTill} disabled={!openingFloat || refreshing}>
            {refreshing ? <CircularProgress size={20} /> : "Open Till"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Till Dialog - now editable expected cash */}
      <CloseTillDialog
        open={openCloseDlg}
        onClose={() => setOpenCloseDlg(false)}
        expected={summary?.expectedCash ?? 0}
        onSubmit={(closingCashActualVal, expectedCashVal, notes) => {
          void doCloseTill(closingCashActualVal, expectedCashVal, notes);
        }}
      />
    </Box>
  );
};

export default CashTill;
