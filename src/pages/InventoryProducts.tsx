import React, { useEffect, useMemo, useState } from "react";
import {
  Paper, Typography, TextField, Button, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import InventoryTabs from "../components/InventoryTabs";
import ProductDialog from "../components/ProductDialog";
import { useAuth } from "../auth/AuthContext"; // <<< permissions

// API
import {
  listProducts, createProductJSON, createProductMultipart,
  updateProductJSON, updateProductMultipart, deleteProduct,
  allCategories, allMeasurements, componentsOfProduct
} from "../api/inventory";

interface ProductRow {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  category?: string | null;
  categoryId?: number | null;
  unit?: string | null;
  unitId?: number | null;
  buyPrice: number;   // per-unit (always)
  sellPrice: number;
  imageUrl?: string | null;
}

type Option = { id: number; name: string; abbr?: string };

const InventoryProducts: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW = can("INVENTORY", "VIEW");
  const CAN_CREATE = can("INVENTORY", "CREATE");
  const CAN_EDIT = can("INVENTORY", "EDIT");
  const CAN_DELETE = can("INVENTORY", "DELETE");

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  const [catOptions, setCatOptions] = useState<Option[]>([]);
  const [unitOptions, setUnitOptions] = useState<Option[]>([]);

  // Ingredients preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFor, setPreviewFor] = useState<{ id: number; name: string } | null>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadOptions = async () => {
    if (!CAN_VIEW) return;
    const [cats, units] = await Promise.all([allCategories(), allMeasurements()]);
    setCatOptions(cats);
    setUnitOptions(units);
  };

  const refresh = async () => {
    if (!CAN_VIEW) return;
    setLoading(true);
    try {
      if (!catOptions.length || !unitOptions.length) {
        await loadOptions();
      }
      const page = await listProducts(query || undefined, 0, 200);

      const mapped: ProductRow[] = page.content.map((p: any) => {
        const categoryName =
          p.categoryName ??
          (typeof p.categoryId === "number"
            ? catOptions.find(c => c.id === p.categoryId)?.name ?? null
            : null);

        const unitName =
          p.unitName ??
          (typeof p.unitId === "number"
            ? unitOptions.find(u => u.id === p.unitId)?.name ?? null
            : null);
        const unitAbbr =
          p.unitAbbr ??
          (typeof p.unitId === "number"
            ? unitOptions.find(u => u.id === p.unitId)?.abbr ?? null
            : null);
        const unitLabel = unitName ? `${unitName}${unitAbbr ? ` (${unitAbbr})` : ""}` : null;

        const buy = Number(p.buyPrice); // per-unit

        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode ?? null,
          name: p.name,
          category: categoryName ?? null,
          categoryId: p.categoryId ?? null,
          unit: unitLabel,
          unitId: p.unitId ?? null,
          buyPrice: buy,
          sellPrice: Number(p.sellPrice),
          imageUrl: p.imageUrl ?? null,
        };
      });

      setRows(mapped);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CAN_VIEW]);

  useEffect(() => {
    if (open && (!catOptions.length || !unitOptions.length)) {
      loadOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      (r.barcode ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const toRow = (p: any): ProductRow => {
    const unitLabel = p.unitName ? `${p.unitName}${p.unitAbbr ? ` (${p.unitAbbr})` : ""}` : null;
    const buy = Number(p.buyPrice);
    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode ?? null,
      name: p.name,
      category: p.categoryName ?? null,
      categoryId: (p as any).categoryId ?? null,
      unit: unitLabel,
      unitId: (p as any).unitId ?? null,
      buyPrice: buy,
      sellPrice: Number(p.sellPrice),
      imageUrl: p.imageUrl ?? null,
    };
  };

  const openPreview = async (row: ProductRow) => {
    if (!CAN_VIEW) return;
    setPreviewFor({ id: row.id, name: row.name });
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const items = await componentsOfProduct(row.id);
      setPreviewItems(items || []);
    } catch {
      setPreviewItems([]);
      setErr("Failed to load ingredients");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!CAN_DELETE) { setErr("You don't have permission to delete products."); return; }
    try {
      await deleteProduct(id);
      setRows(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to delete product");
    }
  };

  if (!CAN_VIEW) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <Typography variant="h6">Inventory &gt; Products</Typography>
          <InventoryTabs />
        </div>
        <Paper className="p-4">
          <Typography color="text.secondary">You don’t have permission to view Inventory.</Typography>
        </Paper>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Typography variant="h6">Inventory &gt; Products</Typography>
        <InventoryTabs />
      </div>

      <Paper className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <TextField
              fullWidth
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="opacity-60" />
                  </InputAdornment>
                ),
              }}
            />
          </div>
          <Tooltip title="Refresh">
            <span><IconButton onClick={refresh}><RefreshIcon /></IconButton></span>
          </Tooltip>
          {CAN_CREATE && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditing(null); setOpen(true); }}
            >
              New Product
            </Button>
          )}
        </div>
      </Paper>

      <Paper className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell>Product name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Buying Price</TableCell>
              <TableCell>Selling Price</TableCell>
              <TableCell>Estimated Profit</TableCell>
              <TableCell>Image</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} align="center"><CircularProgress size={22} /></TableCell>
              </TableRow>
            )}

            {!loading && filtered.map((p) => {
              const profit = (p.sellPrice - p.buyPrice).toFixed(2);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{p.barcode ?? "—"}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category ?? "—"}</TableCell>
                  <TableCell>{p.unit ?? "—"}</TableCell>
                  <TableCell>{p.buyPrice.toFixed(2)}</TableCell>
                  <TableCell>{p.sellPrice.toFixed(2)}</TableCell>
                  <TableCell>{profit}</TableCell>
                  <TableCell style={{ color: p.imageUrl ? "#2e7d32" : "#d32f2f" }}>
                    {p.imageUrl ? "yes" : "no"}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openPreview(p)}>
                      Preview ingredients
                    </Button>
                    <Tooltip title={CAN_EDIT ? "Edit" : "No permission"}>
                      <span>
                        <IconButton size="small"
                          onClick={() => { if (CAN_EDIT) { setEditing(p); setOpen(true); } }}
                          disabled={!CAN_EDIT}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={CAN_DELETE ? "Delete" : "No permission"}>
                      <span>
                        <IconButton size="small" color="error"
                          onClick={() => handleDelete(p.id)}
                          disabled={!CAN_DELETE}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {!loading && !filtered.length && (
              <TableRow><TableCell colSpan={10} align="center">No products.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Product editor modal */}
      <ProductDialog
        open={open}
        initial={editing ? { ...editing, barcode: editing.barcode ?? undefined } : undefined}
        categories={catOptions}
        units={unitOptions}
        onClose={() => setOpen(false)}
        onSave={async (payload: any) => {
          // write-guard
          if (editing && !CAN_EDIT) { setErr("You don't have permission to edit products."); return; }
          if (!editing && !CAN_CREATE) { setErr("You don't have permission to create products."); return; }

          try {
            const isRecipe =
              payload.productType === "recipe" || payload.productType === "RECIPE";
            const hasImage = !!payload.imageFile;

            if (isRecipe) {
              const body = {
                name: String(payload.name || "").trim(),
                sku: String(payload.sku || "").trim() || undefined,
                barcode: String(payload.barcode || "").trim() || undefined,
                categoryId: payload.categoryId ?? null,
                unitId: payload.unitId ?? null,
                sellPrice: Number(payload.sellPrice),
                buyPrice: Number(payload.buyPrice),
                lifetime: payload.lifetime ?? null,
                lowStock: payload.lowStock ?? null,
                saleMode: payload.saleMode ?? undefined,
                productType: "RECIPE",
                components: (payload.components || []).map((l: any) => ({
                  name: String(l.name || "").trim(),
                  measurement: String(l.measurement ?? ""),
                  unitCost: Number(l.unitCost ?? 0),
                })),
              };

              const created = hasImage
                ? await createProductMultipart(body as any, payload.imageFile)
                : await createProductJSON(body as any);

              setRows(prev => [toRow(created), ...prev]);
            } else {
              const body = {
                sku: String(payload.sku || "").trim(),
                barcode: String(payload.barcode || "").trim() || undefined,
                name: String(payload.name || "").trim(),
                buyPrice: Number(payload.buyPrice),
                sellPrice: Number(payload.sellPrice),
                categoryId: payload.categoryId ?? null,
                unitId: payload.unitId ?? null,
                lifetime: payload.lifetime ?? null,
                lowStock: payload.lowStock ?? null,
                saleMode: payload.saleMode ?? undefined,
              };

              let result: any;
              if (editing) {
                result = hasImage
                  ? await updateProductMultipart(editing.id, body as any, payload.imageFile)
                  : await updateProductJSON(editing.id, body as any);

                setRows(prev => prev.map(r => (r.id === editing.id ? toRow(result) : r)));
              } else {
                result = hasImage
                  ? await createProductMultipart(body as any, payload.imageFile)
                  : await createProductJSON(body as any);

                setRows(prev => [toRow(result), ...prev]);
              }
            }

            setOpen(false);
            setEditing(null);
          } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to save product");
          }
        }}
      />

      {/* Ingredients preview dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Ingredients for “{previewFor?.name}”</DialogTitle>
        <DialogContent dividers>
          {previewLoading && <CircularProgress size={20} />}
          {!previewLoading && (
            <List dense>
              {previewItems.map((item: any, idx: number) => (
                <ListItem key={item.id ?? idx} divider>
                  <ListItemText
                    primary={item.productName || item.name || "Unnamed ingredient"}
                    secondary={[
                      `Measurement: ${item.measurement ?? "—"}`,
                      `Item cost: ${Number(item.unitCost).toFixed(2)}`,
                    ].join(" · ")}
                  />
                </ListItem>
              ))}
              {!previewItems.length && <Typography>No ingredients.</Typography>}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>
      </Snackbar>
    </div>
  );
};

export default InventoryProducts;
