// src/pages/CashTill.tsx
import React, { useMemo, useState, useEffect } from "react";
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
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import client from "../api/client";
import { API, endpoints } from "../api/endpoints";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../auth/AuthContext";

type ProductSaleMode = "PER_UNIT" | "BY_WEIGHT";

type LineItem = {
  sku: string;
  name: string;
  price: number;            // VAT-inclusive price used for totals
  qty: number;              // count (PER_UNIT) or weight amount (BY_WEIGHT)
  saleMode: ProductSaleMode;
  unitId?: number | null;
  unitAbbr?: string | null;
  unitName?: string | null;
};

type ProductItem = {
  sku: string;
  name: string;
  // Display price is now VAT-inclusive
  price: number;
  // Extra (optional) fields from backend for future use
  priceInclVat?: number | null;
  priceExclVat?: number | null;
  vatRateApplied?: number | null;

  stock: number;
  lowStock?: number;
  img?: string;
  saleMode?: ProductSaleMode;
  unitId?: number | null;
  unitAbbr?: string | null;
  unitName?: string | null;
};

type PaymentMethod = "CASH" | "CARD" | "ACCOUNT";

const CashTill: React.FC = () => {
  const { currentUser, terminalId, can } = useAuth(); // <<— use permissions
  const terminal = terminalId ?? "TERMINAL_001";
  const userId = currentUser?.id ?? 1;

  // ===== Role-based FRONTEND block for Admins only =====
  const roles = (currentUser?.roles ?? []).map((r) => String(r).toUpperCase());
  const roleStr = (currentUser as any)?.role ? String((currentUser as any).role).toUpperCase() : null;
  const isAdminRole =
    roles.includes("ADMIN") ||
    roles.includes("ROLE_ADMIN") ||
    roleStr === "ADMIN" ||
    roleStr === "ROLE_ADMIN";

  // Permission flags (then override with Admin block)
  const CAN_VIEW   = (can?.("CASH_TILL", "VIEW")   ?? false) && !isAdminRole;
  const CAN_CREATE = (can?.("CASH_TILL", "CREATE") ?? false) && !isAdminRole; // used for checkout
  const CAN_EDIT   = (can?.("CASH_TILL", "EDIT")   ?? false) && !isAdminRole; // edit qty / add to cart
  const CAN_DELETE = (can?.("CASH_TILL", "DELETE") ?? false) && !isAdminRole; // remove line

  const asStr = (v: string | number | null | undefined) => (v == null ? "" : String(v));

  const [cart, setCart] = useState<LineItem[]>([]);
  const total = useMemo(
    () => cart.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
    [cart],
  );

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // payment UI
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState<string>("");

  // animate map for UI feedback after checkout (optional)
  const [animateMap, setAnimateMap] = useState<Record<string, number>>({});

  const numericTerminal = terminal ? Number(asStr(terminal).replace(/\D/g, "")) : null;

  // Prefer VAT-inclusive price coming from backend (priceInclVat). Fallback to sellPrice/price.
  const normalizeProducts = (payload: any[]): ProductItem[] =>
    (payload ?? []).map((p: any) => {
      const priceIncl = Number(
        p.priceInclVat ??
          p.price_incl_vat ?? // just in case different casing
          p.sellPrice ??
          p.price ??
          0
      );
      const priceExcl =
        p.priceExclVat != null
          ? Number(p.priceExclVat)
          : p.price_excl_vat != null
          ? Number(p.price_excl_vat)
          : undefined;

      const vatRate =
        p.vatRateApplied != null
          ? Number(p.vatRateApplied)
          : p.vat_rate_applied != null
          ? Number(p.vat_rate_applied)
          : undefined;

      return {
        sku: p.sku,
        name: p.name ?? p.productName ?? "",
        price: priceIncl, // <<— bind VAT-inclusive price for display
        priceInclVat: priceIncl,
        priceExclVat: priceExcl ?? null,
        vatRateApplied: vatRate ?? null,

        stock: Number(p.availableQuantity ?? p.availableQty ?? p.stock ?? p.quantity ?? 0),
        lowStock: p.lowStock ?? p.low_stock ?? 0,
        img: p.imageUrl ?? p.imageUrlSmall ?? p.image ?? "",
        saleMode: (p.saleMode as ProductSaleMode) ?? "PER_UNIT",
        unitId: p.unitId ?? p.unit_id ?? null,
        unitAbbr: p.unitAbbr ?? p.unit_abbr ?? p.unitSymbol ?? null,
        unitName: p.unitName ?? p.unit_name ?? null,
      };
    });

  const loadAllStock = async () => {
    if (!CAN_VIEW) return; // prevent calls for blocked users
    setLoadingProducts(true);
    try {
      const res = await client.get(`${endpoints.inventory.products}/all`, {
        headers: { "X-User-Id": userId.toString() },
      });
      const payload = Array.isArray(res.data?.data ?? res.data)
        ? res.data.data ?? res.data
        : res.data.items ?? res.data.content ?? [];
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
    if (!CAN_VIEW) return; // block any network if not allowed
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
  }, [search, userId, CAN_VIEW]);

  // initial load
  useEffect(() => {
    if (!CAN_VIEW) return; // prevent initial fetch if blocked
    void loadAllStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CAN_VIEW]);

  // Cart management
  const addToCart = async (sku: string) => {
    if (!CAN_EDIT) return; // <<— block without EDIT or if admin
    try {
      const res = await client.get(endpoints.inventory.lookup(sku), {
        headers: { "X-User-Id": userId.toString() },
      });
      const p = res.data?.data ?? res.data ?? {};
      const name = p.name ?? p.productName ?? sku;
      // Prefer VAT-inclusive unit price from lookup response; fallback to sellPrice/price
      const price = Number(
        p.priceInclVat ??
          p.price_incl_vat ??
          p.sellPrice ??
          p.price ??
          0
      );
      const saleMode: ProductSaleMode = (p.saleMode as ProductSaleMode) ?? "PER_UNIT";
      const unitId: number | null = p.unitId ?? p.unit_id ?? null;
      const unitAbbr: string | null = p.unitAbbr ?? p.unit_abbr ?? p.unitSymbol ?? null;
      const unitName: string | null = p.unitName ?? p.unit_name ?? null;

      setCart((prev) => {
        const existing = prev.find((x) => x.sku === sku);
        if (existing) return prev;
        return [
          ...prev,
          {
            sku,
            name,
            price, // VAT-inclusive in cart totals
            saleMode,
            unitId,
            unitAbbr,
            unitName,
            qty: saleMode === "BY_WEIGHT" ? 0.1 : 1,
          },
        ];
      });
    } catch {
      // fallback to local cached list item
      const local = products.find((x) => x.sku === sku) ?? {
        sku,
        name: sku,
        price: 0,
        saleMode: "PER_UNIT" as ProductSaleMode,
        unitId: null,
        unitAbbr: null,
        unitName: null,
      };
      setCart((prev) => {
        const existing = prev.find((x) => x.sku === local.sku);
        if (existing) return prev;
        return [
          ...prev,
          {
            sku: local.sku,
            name: local.name,
            price: local.price, // already VAT-inclusive from normalizeProducts
            saleMode: local.saleMode ?? "PER_UNIT",
            unitId: local.unitId ?? null,
            unitAbbr: local.unitAbbr ?? null,
            unitName: local.unitName ?? null,
            qty: (local.saleMode ?? "PER_UNIT") === "BY_WEIGHT" ? 0.1 : 1,
          },
        ];
      });
    }
  };

  const setQty = (sku: string, qtyStr: string) =>
    setCart((prev) =>
      prev
        .map((x) =>
          x.sku === sku
            ? {
                ...x,
                qty: Math.max(0, Number(qtyStr || 0)),
              }
            : x,
        )
        .filter((x) => x.qty > 0),
    );

  const removeLine = (sku: string) => {
    if (!CAN_DELETE) return; // <<— guard delete
    setCart((prev) => prev.filter((x) => x.sku !== sku));
  };

  // Payment helpers
  const parsedCashReceived = Number(cashReceived || 0);
  const change = Math.max(0, parsedCashReceived - total);
  const cashSufficient = parsedCashReceived >= total;

  // Checkout
  const handleCheckout = async () => {
    if (!CAN_CREATE) {
      alert("You don't have permission to perform checkout.");
      return;
    }
    if (paymentMethod !== "CASH") {
      alert("Only Cash payments are supported in this version. Please select Cash.");
      return;
    }
    if (!cashSufficient) {
      alert("Cash received is less than total. Please enter sufficient amount.");
      return;
    }
    if (cart.length === 0) return;

    setRefreshing(true);
    try {
      const body: any = {
        items: cart.map((l) => ({
          sku: l.sku,
          name: l.name,
          price: l.price, // send VAT-inclusive unit price; backend will do authoritative VAT calc
          qty: l.qty,
          saleMode: l.saleMode,
          unitId: l.unitId ?? null,
          unit: l.unitAbbr ?? l.unitName ?? null,
        })),
        userId,
        payment: {
          method: "CASH",
          cashReceived: parsedCashReceived,
          changeGiven: change,
        },
      };
      if (numericTerminal) body.terminalId = numericTerminal;

      await client.post(API.till.checkout, body, {
        headers: { "X-User-Id": userId.toString() },
      });

      // optimistic stock update
      const newAnimate: Record<string, number> = {};
      cart.forEach((line) => {
        newAnimate[line.sku] = (newAnimate[line.sku] ?? 0) - line.qty;
      });

      setProducts((prev) =>
        prev.map((prod) => {
          const delta = newAnimate[prod.sku];
          if (!delta) return prod;
          return { ...prod, stock: Math.max(0, Number((prod.stock + delta).toFixed(3))) };
        }),
      );

      setAnimateMap(newAnimate);
      setCart([]);
      setCashReceived("");
      setPaymentRef("");
      await loadAllStock();
      setTimeout(() => setAnimateMap({}), 900);
    } catch (err: any) {
      console.error("Checkout failed", err);
      alert(err?.response?.data?.message ?? err?.message ?? "Checkout failed");
      try {
        await loadAllStock();
      } catch {
        // ignore
      }
    } finally {
      setRefreshing(false);
    }
  };

  // If user cannot even view the till (including Admin block), block the page
  if (!CAN_VIEW) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          You don't have permission to view Cash Till.
        </Typography>
        {isAdminRole && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Note: Admins are restricted from using Cash Till on this device.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box className="grid grid-cols-12 gap-4">
      {/* LEFT: Payment (top) + Cart (below) */}
      <Paper
        className="col-span-4 p-4 flex flex-col"
        sx={{
          position: "relative",
          zIndex: 2,
          overflow: "hidden",
          height: "calc(100vh - 120px)",
        }}
      >
        {/* PAYMENT AT THE TOP */}
        <Box sx={{ pb: 2 }}>
          <Typography variant="h5" className="mb-4 font-semibold">
            P {total.toFixed(2)}
          </Typography>

          {/* Payment method selector (always selectable; final checkout is permissioned) */}
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
                overflow: "hidden",
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
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
                  "&:first-of-type": { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                  "&:last-of-type": { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
                }}
              >
                <AttachMoneyIcon fontSize="small" />
                <Box component="span" sx={{ fontWeight: 600 }}>
                  Cash
                </Box>
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
            className="mt-4 w-full"
            size="large"
            variant="contained"
            color="success"
            disabled={!CAN_CREATE || cart.length === 0 || refreshing || (paymentMethod === "CASH" ? !cashSufficient : false)} // <<— permission gate
            onClick={handleCheckout}
            sx={{ mt: 2 }}
          >
            {refreshing ? <CircularProgress size={24} /> : paymentMethod === "CASH" ? "PAY (Cash)" : "PAY"}
          </Button>

          {paymentMethod !== "CASH" && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Note: only Cash payments are supported in this version — Card/Account will be available later.
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* SCANNED/ADDED ITEMS BELOW PAYMENT (scrolls) */}
        <Box sx={{ overflowY: "auto", flex: 1, pt: 1 }}>
          {cart.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No items. Scan or click a product to add.
            </Typography>
          )}

          <div className="space-y-2">
            {cart.map((it) => {
              const unitLabel = it.unitId ? (it.unitAbbr ?? it.unitName ?? "qty") : "qty";

              return (
                <div key={it.sku} className="rounded border p-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>
                      {it.name}
                      {it.saleMode === "BY_WEIGHT" && (it.unitAbbr || it.unitName) ? (
                        <span className="text-gray-500"> • {it.unitAbbr ?? it.unitName}</span>
                      ) : null}
                    </span>
                    <span>{(it.price * it.qty).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Price: P{it.price.toFixed(2)}
                    {it.saleMode === "BY_WEIGHT" && (it.unitAbbr || it.unitName)
                      ? ` / ${it.unitAbbr ?? it.unitName}`
                      : ""}
                  </div>

                  {/* Single number input + unit label + delete */}
                  <div className="mt-2 flex items-center gap-2">
                    <TextField
                      type="number"
                      size="small"
                      value={Number.isFinite(it.qty) ? it.qty : 0}
                      onChange={(e) => CAN_EDIT && setQty(it.sku, e.target.value)} // <<— guard edit
                      inputProps={{
                        inputMode: "decimal",
                        step: it.saleMode === "BY_WEIGHT" ? "0.001" : "1",
                        min: 0,
                      }}
                      sx={{ width: 140 }}
                      disabled={!CAN_EDIT}
                    />
                    <Typography variant="body2" sx={{ minWidth: 28 }}>
                      {unitLabel}
                    </Typography>

                    <IconButton
                      size="small"
                      className="ml-auto"
                      onClick={() => removeLine(it.sku)}
                      disabled={!CAN_DELETE}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Box>
      </Paper>

      {/* RIGHT: Products */}
      <Box className="col-span-8 space-y-3">
        {/* Search and Scan Bar */}
        <Paper className="p-3 flex items-center gap-3">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
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
            <Button onClick={() => {}} variant="contained" color="warning" disabled sx={{ minWidth: 120 }}>
              SCAN
            </Button>
          </Stack>
        </Paper>

        <Divider />

        <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-2 gap-4">
          {loadingProducts ? (
            <div className="col-span-full flex justify-center py-6">
              <CircularProgress />
            </div>
          ) : (
            products.map((p) => (
              <ProductCard
                key={p.sku}
                sku={p.sku}
                name={
                  p.saleMode === "BY_WEIGHT" && (p.unitAbbr || p.unitName)
                    ? `${p.name} (${p.unitAbbr ?? p.unitName})`
                    : p.name
                }
                price={p.price} // VAT-inclusive
                stock={p.stock}
                lowStock={p.lowStock}
                img={p.img}
                onAdd={() => {
                  if (p.stock > 0) addToCart(p.sku);
                }}
                disabled={refreshing || p.stock <= 0 || !CAN_EDIT} // <<— prevent add without EDIT / admin
                animateDelta={animateMap[p.sku] ?? 0}
                onQuantityChange={() => {
                  setAnimateMap((prev) => {
                    const next = { ...prev };
                    delete next[p.sku];
                    return next;
                  });
                }}
              />
            ))
          )}
        </div>
      </Box>
    </Box>
  );
};

export default CashTill;
