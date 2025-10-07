// src/components/ProductDialog.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Paper, Typography,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Select, FormControl, InputLabel
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

type ProductType = "single" | "recipe";
type ProductSaleMode = "PER_UNIT" | "BY_WEIGHT";

type CategoryOpt = { id: number; name: string };
type UnitOpt = { id: number; name: string; abbr?: string };

// Ingredient line: FREE-TEXT measurement, numeric unitCost
type IngredientLine = {
  id: string;
  name: string;
  measurement?: string;        // e.g., "2 cups", "1 pack", "a dash"
  unitCost?: number | null;    // cost for that line
};

interface ProductDraft {
  id?: number;
  // finished product
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: number | null;
  unitId?: number | null;
  lifetime?: number | null;     // shelf life label
  lowStock?: number | null;     // threshold
  buyPrice?: number;            // per-unit cost (for recipes, this is per-unit)
  sellPrice?: number;           // required for both
  imageUrl?: string | null;

  productType?: ProductType;
  saleMode?: ProductSaleMode;
  productsMade?: number | null; // YIELD (how many finished units the batch produces)
  components?: IngredientLine[];

  // additional field we now pass for recipes (per-unit too)
  unitCost?: number;

  // local only
  imageFile?: File | null;
}

const toNumOrNull = (v: string): number | null =>
  v.trim() === "" ? null : Number(v);

const toNumOrUndef = (v: string): number | undefined =>
  v.trim() === "" ? undefined : Number(v);

const toNumMin1 = (v: string): number =>
  Math.max(1, Number(v.trim() === "" ? 1 : Number(v)));

const ProductDialog: React.FC<{
  open: boolean;
  initial?: Partial<ProductDraft>;
  categories?: CategoryOpt[];
  units?: UnitOpt[];
  onClose: () => void;
  onSave: (p: Partial<ProductDraft>) => void;
}> = ({
  open,
  initial,
  categories = [],
  units = [],
  onClose,
  onSave
}) => {
  const [form, setForm] = useState<Partial<ProductDraft>>({
    productType: "single",
    saleMode: "PER_UNIT",
    productsMade: 1,     // default yield
    lifetime: null,
    lowStock: null,
    imageFile: null,
  });

  const [lines, setLines] = useState<IngredientLine[]>([]);

  // init on open
  useEffect(() => {
    if (!open) return;
    setForm({
      productType: "single",
      saleMode: "PER_UNIT",
      productsMade: 1,
      lifetime: null,
      lowStock: null,
      imageFile: null,
      ...(initial ?? {}),
    });
    // normalize incoming lines: ensure id, make measurement a string
    const norm = (initial?.components ?? []).map((l: any) => ({
      id: l.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name: l.name || "",
      measurement: l.measurement == null ? "" : String(l.measurement),
      unitCost: typeof l.unitCost === "number" ? l.unitCost : Number(l.unitCost ?? 0),
    }));
    setLines(norm);
  }, [open, initial]);

  // defaults for selects if needed
  useEffect(() => {
    if (!open) return;
    if ((form.categoryId ?? "") === "" && categories.length > 0) {
      setForm(f => ({ ...f, categoryId: categories[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categories]);

  // Sale mode behavior for finished-good unit
  useEffect(() => {
    if (!open) return;
    const mode = form.saleMode ?? "PER_UNIT";
    if (mode === "PER_UNIT") {
      if (form.unitId != null) setForm(f => ({ ...f, unitId: null }));
    } else {
      if (form.unitId == null && units.length > 0) {
        setForm(f => ({ ...f, unitId: units[0].id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.saleMode, units]);

  const isRecipe = (form.productType ?? "single") === "recipe";

  // single-mode profit
  const singleProfit = useMemo(
    () => ((form.sellPrice ?? 0) - (form.buyPrice ?? 0)).toFixed(2),
    [form.sellPrice, form.buyPrice]
  );

  // recipe: total ingredient costs (measurement is free text — not multiplied)
  const batchCost = useMemo(
    () => lines.reduce((sum, l) => sum + Number(l.unitCost || 0), 0),
    [lines]
  );
  const yieldCount = Math.max(1, Number(form.productsMade ?? 1));
  const perUnitCost = useMemo(() => batchCost / yieldCount, [batchCost, yieldCount]);
  const recipeEstimatedProfit = useMemo(
    () => (Number(form.sellPrice || 0) - perUnitCost).toFixed(2),
    [form.sellPrice, perUnitCost]
  );

  const sellPriceLabel =
    (form.saleMode ?? "PER_UNIT") === "BY_WEIGHT"
      ? "Selling price (per weight unit)"
      : "Selling price";

  // helpers
  const genBarcode = () =>
    setForm(f => ({ ...f, barcode: String(Math.floor(100000000 + Math.random() * 900000000)) }));
// imports unchanged ...

// inside the component:
const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

// when dialog opens / initial changes, try to fetch existing image if no new file picked
useEffect(() => {
  let revoked = false;
  let urlToRevoke: string | null = null;

  async function loadExisting() {
    // only try when editing, product has an existing imageUrl, and no new file chosen
    if (!open) return;
    if (!initial?.id) return;
    if (!initial?.imageUrl) return;
    if (form.imageFile) return;
    try {
      // use the authenticated fetcher
      const { fetchProductImage } = await import("../api/inventory");
      const blob = await fetchProductImage(initial.id);
      const url = URL.createObjectURL(blob);
      urlToRevoke = url;
      if (!revoked) setImagePreviewUrl(url);
    } catch {
      // ignore preview errors – user can still upload a new one
      setImagePreviewUrl(null);
    }
  }

  // reset & load
  setImagePreviewUrl(null);
  loadExisting();

  return () => {
    revoked = true;
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, initial, form.imageFile]);

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        name: "",
        measurement: "",
        unitCost: null,
      }
    ]);
  };
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));
  const updateLine = <K extends keyof IngredientLine>(id: string, field: K, value: IngredientLine[K]) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleImage = (file?: File | null) => setForm(f => ({ ...f, imageFile: file ?? null }));

  const handleSave = () => {
    // validation
    const name = (form.name || "").trim();
    if (!name) { alert("Enter finished product name."); return; }
    if (!Number.isFinite(Number(form.sellPrice))) { alert("Enter a valid selling price."); return; }
    if ((form.saleMode ?? "PER_UNIT") === "BY_WEIGHT" && !form.unitId) {
      alert("Please choose a weight unit for by-weight items.");
      return;
    }

    if (isRecipe) {
      if (!lines.length) { alert("Add at least one ingredient line."); return; }
      for (const l of lines) {
        if (!l.name.trim()) { alert("Each ingredient needs a name."); return; }
        if (!Number.isFinite(Number(l.unitCost)) || Number(l.unitCost) < 0) {
          alert("Each ingredient needs an item cost (zero or more)."); return;
        }
      }
      if (!Number.isFinite(Number(form.productsMade)) || Number(form.productsMade) <= 0) {
        alert("Yield (products made) must be at least 1."); return;
      }
    } else {
      if (!Number.isFinite(Number(form.buyPrice))) { alert("Enter a valid buying price."); return; }
    }

    // Always persist per-unit for recipes; also pass unitCost = per-unit.
    const payload: Partial<ProductDraft> =
      isRecipe
        ? {
            ...form,
            productsMade: yieldCount,
            buyPrice: Number(perUnitCost.toFixed(2)), // per-unit only
            unitCost: Number(perUnitCost.toFixed(2)), // pass unitCost (per-unit) to BE instead of any recipe total
            components: lines.map(l => ({
              id: l.id,
              name: l.name.trim(),
              measurement: String(l.measurement ?? ""), // FREE TEXT
              unitCost: Number(l.unitCost || 0),
            })),
          }
        : { ...form, components: undefined };

    onSave(payload);
  };

  const singleBuyingLabel = (form.buyPrice ?? 0).toFixed(2);
  const recipeBuyingLabel = perUnitCost.toFixed(2); // buying price per finished unit

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{form.id ? "Edit Product" : "Add New Product"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Basics */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Product name (finished good)"
              fullWidth
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Category"
              fullWidth
              value={form.categoryId ?? ""}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })
              }
            >
              <MenuItem value="">None</MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Product type */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="ptype">Product type</InputLabel>
              <Select
                labelId="ptype"
                label="Product type"
                value={form.productType ?? "single"}
                onChange={(e) => setForm(f => ({ ...f, productType: e.target.value as ProductType }))}
              >
                <MenuItem value="single">Standard</MenuItem>
                <MenuItem value="recipe">Recipe (made in-house)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sale mode */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="salemode">Sale mode</InputLabel>
              <Select
                labelId="salemode"
                label="Sale mode"
                value={form.saleMode ?? "PER_UNIT"}
                onChange={(e) => setForm(f => ({ ...f, saleMode: e.target.value as ProductSaleMode }))}
              >
                <MenuItem value="PER_UNIT">Per unit / piece</MenuItem>
                <MenuItem value="BY_WEIGHT">By weight (scale)</MenuItem>
              </Select>
            </FormControl>
            {form.saleMode === "BY_WEIGHT" && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                Tip: choose a weight unit (e.g., kg, g, lb) so POS knows the price basis.
              </Typography>
            )}
          </Grid>

          {/* Finished good unit (disabled when PER_UNIT) */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Finished good unit"
              fullWidth
              value={form.unitId ?? ""}
              onChange={(e) =>
                setForm({ ...form, unitId: e.target.value ? Number(e.target.value) : null })
              }
              disabled={(form.saleMode ?? "PER_UNIT") === "PER_UNIT"}
              helperText={
                (form.saleMode ?? "PER_UNIT") === "PER_UNIT"
                  ? "Not required for per-unit items."
                  : "Select the weight unit used at POS (e.g., kg, g, lb)."
              }
            >
              <MenuItem value="">None</MenuItem>
              {units.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}{u.abbr ? ` (${u.abbr})` : ""}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* SKU & barcode */}
          <Grid item xs={12} sm={3}>
            <TextField
              label="SKU"
              fullWidth
              value={form.sku || ""}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Barcode"
              fullWidth
              value={form.barcode || ""}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </Grid>

          {/* Lifetime & Low stock */}
          <Grid item xs={12} sm={3}>
            <TextField
              label="Product lifetime"
              fullWidth
              type="number"
              value={form.lifetime ?? ""}
              onChange={(e) => setForm({ ...form, lifetime: toNumOrNull(e.target.value) })}
              placeholder="e.g., 7"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Low stock threshold"
              type="number"
              fullWidth
              value={form.lowStock ?? ""}
              onChange={(e) =>
                setForm({ ...form, lowStock: toNumOrNull(e.target.value) })}
              inputProps={{ min: 0 }}
            />
          </Grid>

          {/* Pricing */}
          {!isRecipe && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Buying price"
                type="number"
                fullWidth
                value={form.buyPrice ?? ""}
                onChange={(e) =>
                  setForm({ ...form, buyPrice: toNumOrUndef(e.target.value) })}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField
              label={sellPriceLabel}
              type="number"
              fullWidth
              value={form.sellPrice ?? ""}
              onChange={(e) =>
                setForm({ ...form, sellPrice: toNumOrUndef(e.target.value) })}
            />
          </Grid>

          {/* Yield only for recipe */}
          {isRecipe && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Products made (yield)"
                type="number"
                fullWidth
                value={form.productsMade ?? 1}
                onChange={(e) =>
                  setForm({ ...form, productsMade: toNumMin1(e.target.value) })}
                inputProps={{ min: 1 }}
                helperText="How many finished units this batch produces"
              />
            </Grid>
          )}

          {/* Image upload */}
          <Grid item xs={12} sm={6}>
            <input
              id="prod-image-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
            />
            <label htmlFor="prod-image-input">
              <Button variant="outlined" component="span">
                {form.imageFile ? "Change image" : "Upload image"}
              </Button>
              <span style={{ marginLeft: 8, opacity: 0.75 }}>
                {form.imageFile ? form.imageFile.name : "No file selected"}
              </span>
            </label>
          </Grid>
<Grid item xs={12}>
  <div style={{ marginTop: 8 }}>
    {form.imageFile ? (
      <img
        src={URL.createObjectURL(form.imageFile)}
        alt="Preview"
        style={{ maxHeight: 160, borderRadius: 8, display: "block" }}
        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
      />
    ) : imagePreviewUrl ? (
      <img
        src={imagePreviewUrl}
        alt="Current product"
        style={{ maxHeight: 160, borderRadius: 8, display: "block" }}
      />
    ) : (
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        No image uploaded for this product.
      </Typography>
    )}
  </div>
</Grid>

          {/* Quick barcode generator */}
            <Grid item xs={12} sm={6}>
                <Button variant="contained" onClick={genBarcode} sx={{ mt: 0.8 }}>
                    Generate barcode & QR
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                    A QR code PNG will be auto-generated from the barcode and stored on the server.
                </Typography>
            </Grid>

        </Grid>

        {/* Profit display (now includes Buying Price next to Estimated Profit) */}
        {!isRecipe && (
          <div className="mt-3 text-right font-semibold">
            Buying Price: <b>P{singleBuyingLabel}</b> &nbsp;·&nbsp; Estimated Profit: <b>P{singleProfit}</b>
          </div>
        )}
        {isRecipe && (
          <div className="mt-3 text-right font-semibold">
            Buying Price (per unit): <b>P{recipeBuyingLabel}</b> &nbsp;·&nbsp; Estimated Profit: <b>P{recipeEstimatedProfit}</b>
          </div>
        )}

        {/* Recipe builder */}
        {isRecipe && (
          <div className="mt-4">
            <Typography variant="h6" className="mb-2">Ingredients</Typography>

            <Paper className="p-3 mb-3">
              <Button variant="outlined" onClick={addLine}>Add Ingredient</Button>
            </Paper>

            <Paper className="overflow-x-auto">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ingredient Name</TableCell>
                    <TableCell>Measurement (free text)</TableCell>
                    <TableCell>Item Cost</TableCell>
                    <TableCell align="center">Remove</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField
                          size="small"
                          placeholder="e.g., Flour"
                          value={l.name}
                          onChange={(e) => updateLine(l.id, "name", e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          size="small"
                          placeholder="e.g., 2 cups / 1 pack / a dash"
                          value={l.measurement ?? ""}
                          onChange={(e) => updateLine(l.id, "measurement", e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <TextField
                          size="small"
                          type="number"
                          placeholder="e.g., 10"
                          value={l.unitCost ?? ""}
                          onChange={(e) =>
                            updateLine(l.id, "unitCost", e.target.value === "" ? null : Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton color="error" onClick={() => removeLine(l.id)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!lines.length && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No ingredients yet. Click “Add Ingredient”.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </div>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          {form.id ? "Save" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDialog;
