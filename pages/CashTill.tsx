import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import client from "../api/client";
import { API } from "../api/endpoints";
import ProductCard from "../components/ProductCard";

type LineItem = { sku: string; name: string; price: number; qty: number };

const mockProducts = [
  { sku: "SKU-001", name: "Coke 330mL", price: 9.9, stock: 10, img: "" },
  { sku: "SKU-002", name: "Combo meal", price: 25.5, stock: 7, img: "" },
  { sku: "SKU-003", name: "Snow-white flour, 12.5kg", price: 125, stock: 3, img: "" },
  { sku: "SKU-004", name: "Coke 330mL", price: 99, stock: 10, img: "" },
];

const CashTill: React.FC = () => {
  // left ticket
  const [cart, setCart] = useState<LineItem[]>([
    { sku: "SKU-001", name: "Coke, 330mL", price: 9.9, qty: 2 },
    { sku: "SKU-002", name: "Combo meal", price: 25.5, qty: 1 },
    { sku: "SKU-003", name: "Snow-white flour, 12.5kg", price: 125, qty: 1 },
  ]);

  const total = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.qty, 0),
    [cart]
  );

  // right grid
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

  const addToCart = async (sku: string) => {
    // resolve from API (kept for future; currently uses mock list)
    try {
      const res = await client.get(API.inventory.lookup(sku));
      const { name, price } = res.data ?? {};
      const item = name ? { sku, name, price } : null;

      const product =
        item ??
        mockProducts.find((m) => m.sku === sku) ?? { sku, name: sku, price: 0 };

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
      // fallback to mock
      const product =
        mockProducts.find((m) => m.sku === sku) ?? { sku, name: sku, price: 0 };
      setCart((prev) => [...prev, { sku, name: product.name, price: product.price, qty: 1 }]);
    }
  };

  const changeQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((x) => (x.sku === sku ? { ...x, qty: Math.max(1, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const removeLine = (sku: string) => {
    setCart((prev) => prev.filter((x) => x.sku !== sku));
  };

  const handleCheckout = async () => {
    await client.post(API.till.checkout, { items: cart });
    setCart([]);
  };

  const handleScan = async () => {
    // placeholder for barcode/MQTT hook
    setScanInProgress(true);
    setTimeout(() => {
      addToCart("SKU-001");
      setScanInProgress(false);
    }, 600);
  };

  return (
    <Box className="grid grid-cols-12 gap-4">
      {/* LEFT: menu is the global Sidebar, so here we mimic the “ticket” column */}
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

      {/* RIGHT: search + scan + grid */}
      <Box className="col-span-8 space-y-3">
        <Paper className="p-3 flex items-center gap-3 justify-between">
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
    </Box>
  );
};

export default CashTill;
