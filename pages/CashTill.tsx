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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import client from "../api/client";
import { API } from "../api/endpoints";
import ProductCard from "../components/ProductCard";
import { TillsApi } from "../api/tills"; // uses the shim we added
import type { TillSession, TillSummary } from "../types/till";
import { useAuth } from "../auth/AuthContext";

type LineItem = { sku: string; name: string; price: number; qty: number };

const mockProducts = [
  { sku: "SKU-001", name: "Coke 330mL", price: 9.9, stock: 10, img: "" },
  { sku: "SKU-002", name: "Combo meal", price: 25.5, stock: 7, img: "" },
  { sku: "SKU-003", name: "Snow-white flour, 12.5kg", price: 125, stock: 3, img: "" },
  { sku: "SKU-004", name: "Coke 330mL", price: 99, stock: 10, img: "" },
];

const CashTill: React.FC = () => {
  const { currentUser, terminalId } = useAuth();
  const terminal = terminalId ?? "TERMINAL_001";
  const userId = currentUser?.id ?? 1;

  // --- LEFT: ticket/cart ---
  const [cart, setCart] = useState<LineItem[]>([
    { sku: "SKU-001", name: "Coke, 330mL", price: 9.9, qty: 2 },
    { sku: "SKU-002", name: "Combo meal", price: 25.5, qty: 1 },
    { sku: "SKU-003", name: "Snow-white flour, 12.5kg", price: 125, qty: 1 },
  ]);
  const total = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart]);

  // --- RIGHT: catalog ---
  const [search, setSearch] = useState("");
  const [scanInProgress, setScanInProgress] = useState(false);
  const filtered = useMemo(
    () =>
      mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  // --- Till state ---
  const [session, setSession] = useState<TillSession | null>(null);
  const [summary, setSummary] = useState<TillSummary | null>(null);
  const [openOpenDlg, setOpenOpenDlg] = useState(false);
  const [openCloseDlg, setOpenCloseDlg] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<string>("0");
  const [closingActual, setClosingActual] = useState<string>("");

  const refreshTill = async (seed?: TillSession | null) => {
    const ses = seed ?? (await TillsApi.active(terminal));
    setSession(ses);
    if (ses) {
      const sum = await TillsApi.summary(ses.id);
      setSummary(sum);
    } else {
      setSummary(null);
    }
  };

  useEffect(() => {
    refreshTill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminal]);

  // --- Cart handlers ---
  const addToCart = async (sku: string) => {
    try {
      const res = await client.get(API.inventory.lookup(sku));
      const { name, price } = res.data ?? {};
      const product =
        (name && { sku, name, price }) ||
        mockProducts.find((m) => m.sku === sku) ||
        { sku, name: sku, price: 0 };

      setCart((prev) => {
        const existing = prev.find((x) => x.sku === product.sku);
        if (existing) {
          return prev.map((x) =>
            x.sku === product.sku ? { ...x, qty: x.qty + 1 } : x
          );
        }
        return [...prev, { sku: product.sku, name: product.name, price: product.price, qty: 1 }];
      });
    } catch {
      const product =
        mockProducts.find((m) => m.sku === sku) ?? { sku, name: sku, price: 0 };
      setCart((prev) => [...prev, { sku, name: product.name, price: product.price, qty: 1 }]);
    }
  };

  const changeQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((x) => (x.sku === sku ? { ...x, qty: Math.max(0, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const removeLine = (sku: string) => setCart((prev) => prev.filter((x) => x.sku !== sku));

  const handleCheckout = async () => {
    // keep your existing flow (this posts the sale lines; in real flow you’d also post SALE movements)
    await client.post(API.till.checkout, { items: cart, terminalId: terminal, userId });
    setCart([]);
    // optional: refresh expected cash after sale if till is open
    if (session) await refreshTill(session);
  };

  // --- Scan stub ---
  const handleScan = async () => {
    setScanInProgress(true);
    setTimeout(() => {
      addToCart("SKU-001");
      setScanInProgress(false);
    }, 600);
  };

  // --- Till actions ---
  const doOpenTill = async () => {
    const s = await TillsApi.open({
      terminalId: terminal,
      openedByUserId: userId,
      openingFloat: parseFloat(openingFloat || "0"),
      notes: "Opened from CashTill UI",
    });
    await refreshTill(s);
    setOpenOpenDlg(false);
  };

  const doCloseTill = async () => {
    if (!session) return;
    await TillsApi.close(session.id, {
      closingCashActual: parseFloat(closingActual || "0"),
      notes: "Closed from CashTill UI",
    });
    await refreshTill(null);
    setOpenCloseDlg(false);
  };

  // --- UI ---
  const overShort = useMemo(() => {
    const exp = summary?.expectedCash ?? 0;
    const act = parseFloat(closingActual || "0");
    return act - exp;
  }, [closingActual, summary]);

  return (
    <Box className="grid grid-cols-12 gap-4">
      {/* LEFT: Ticket panel */}
      <Paper className="col-span-4 p-4">
        <Typography variant="h5" className="mb-4 font-semibold">
          P {total.toFixed(2)}
        </Typography>

        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {cart.map((it) => (
            <div key={it.sku} className="rounded border p-2">
              <div className="flex justify-between text-sm font-medium">
                <span>{it.name}</span>
                <span>{(it.price * it.qty).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600">
                Unit price: P{it.price.toFixed(2)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="small" variant="outlined" onClick={() => changeQty(it.sku, -1)}>-</Button>
                <span className="w-6 text-center">{it.qty}</span>
                <Button size="small" variant="outlined" onClick={() => changeQty(it.sku, +1)}>+</Button>
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

        <Button
          className="mt-6 w-full"
          size="large"
          variant="contained"
          color="success"
          disabled={cart.length === 0}
          onClick={handleCheckout}
        >
          PAY
        </Button>
      </Paper>

      {/* RIGHT: Search + header controls + grid */}
      <Box className="col-span-8 space-y-3">
        {/* Header bar: Terminal chip + Open/Close buttons + Search + Scan */}
        <Paper className="p-3 flex items-center gap-3 justify-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={terminal.replace("_", " ")} variant="outlined" />
            {session ? (
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
                >
                  Open Till
                </Button>
              </>
            )}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" className="flex-1 px-4">
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
            />
            <Button
              onClick={handleScan}
              variant="contained"
              color="warning"
              disabled={scanInProgress}
              className="min-w-[120px]"
            >
              {scanInProgress ? "SCANNING..." : "SCAN"}
            </Button>
          </Stack>
        </Paper>

        <Divider />

        <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-2 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.sku}
              sku={p.sku}
              name={p.name}
              price={p.price}
              stock={p.stock}
              img={p.img}
              onAdd={() => addToCart(p.sku)}
            />
          ))}
        </div>
      </Box>

      {/* --- Open Till Dialog --- */}
      <Dialog open={openOpenDlg} onClose={() => setOpenOpenDlg(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Open Till</DialogTitle>
        <DialogContent>
          <Box className="pt-2">
            <TextField
              label="Opening Float"
              type="number"
              fullWidth
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOpenDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={doOpenTill}>Open Till</Button>
        </DialogActions>
      </Dialog>

      {/* --- Close Till Dialog --- */}
      <Dialog open={openCloseDlg} onClose={() => setOpenCloseDlg(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Close Till</DialogTitle>
        <DialogContent>
          <Stack spacing={2} className="pt-2">
            <TextField
              label="Expected Cash"
              value={(summary?.expectedCash ?? 0).toFixed(2)}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Counted Cash (Actual)"
              type="number"
              value={closingActual}
              onChange={(e) => setClosingActual(e.target.value)}
              fullWidth
            />
            <Typography variant="body2" color={overShort === 0 ? "success.main" : overShort > 0 ? "info.main" : "warning.main"}>
              {overShort === 0 ? "Balanced" : overShort > 0 ? "Over" : "Short"}: {overShort.toFixed(2)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCloseDlg(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doCloseTill} disabled={!closingActual}>
            Close Till
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CashTill;
