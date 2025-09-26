// src/components/PromoDialog.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Paper, Typography,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

/** ---------- Minimal, self-contained types ---------- */
export type IngredientLine = {
  id: string;
  name: string;
  /** FREE TEXT (e.g., "2 cups", "1 pack", "—") */
  measurement?: string;
  /** Numeric cost for that line (no unit math) */
  unitCost?: number | null;
};

export interface ProductDraft {
  id?: number;
  name?: string;
  sku?: string;
  barcode?: string;

  /** Optional “product-like” metadata some callers already pass around */
  categoryId?: number | null;
  unitId?: number | null;
  lifetime?: string | null;
  lowStock?: number | null;

  /** Pricing fields some callers reuse */
  buyPrice?: number;
  sellPrice?: number;

  /** Recipe-ish lines */
  components?: IngredientLine[];

  /** Local only */
  imageFile?: File | null;
  imageUrl?: string | null;

  /** Optional flags used by some callers */
  productType?: "single" | "recipe";
  productsMade?: number | null;
}

/** ---------- Component props ---------- */
type PromoDialogProps = {
  open: boolean;
  mode?: "add" | "edit";
  initial?: Partial<ProductDraft>;
  onClose: () => void;
  /** Loosen to match different caller payloads (e.g., your Discounts page). */
  onSave: (p: any) => void | Promise<void>;
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PromoDialog: React.FC<PromoDialogProps> = ({
  open,
  mode = "add",
  initial,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<ProductDraft>>({});
  const [lines, setLines] = useState<IngredientLine[]>([]);

  // Initialize from `initial`
  useEffect(() => {
    if (!open) return;
    setForm({ ...(initial ?? {}) });
    const seed = (initial?.components ?? []).map((l: any) => ({
      id: l?.id ?? genId(),
      name: String(l?.name ?? ""),
      measurement:
        l?.measurement == null ? "" : String(l.measurement), // force string
      unitCost: Number(l?.unitCost ?? l?.itemCost ?? 0), // tolerate alt field
    }));
    setLines(seed);
  }, [open, initial]);

  // Sum only item costs (measurement is FREE TEXT)
  const totalItemCosts = useMemo(
    () => lines.reduce((sum, l) => sum + Number(l.unitCost || 0), 0),
    [lines]
  );

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { id: genId(), name: "", measurement: "", unitCost: null },
    ]);
  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id));
  const updateLine = (id: string, patch: Partial<IngredientLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const handleSave = async () => {
    // Basic sanity checks (very light)
    if (!lines.length) {
      // This dialog is used in multiple contexts; keep validation permissive
      // but still prevent obviously empty saves if desired.
      // Remove this guard if you want to allow empty lists.
      // eslint-disable-next-line no-alert
      // alert("Add at least one line or close the dialog.");
      // return;
    }

    const payload = {
      ...form,
      // Convenience: reflect the current total as buyPrice if caller expects it
      buyPrice: totalItemCosts,
      components: lines.map((l) => ({
        id: l.id ?? genId(),
        name: (l.name ?? "").trim(),
        measurement: String(l.measurement ?? ""), // FREE TEXT
        unitCost: Number(l.unitCost || 0),
      })),
    };

    await onSave(payload);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {mode === "edit" ? "Edit Campaign" : "New Campaign"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* These core fields are generic and safe to keep even if caller ignores them */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Name"
              fullWidth
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="SKU (optional)"
              fullWidth
              value={form.sku ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Barcode (optional)"
              fullWidth
              value={form.barcode ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, barcode: e.target.value }))
              }
            />
          </Grid>

          {/* Optional price the caller might want to display / edit */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Selling price (optional)"
              type="number"
              fullWidth
              value={form.sellPrice ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sellPrice:
                    e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
            />
          </Grid>

          {/* Ingredients / cost lines (generic “items” list) */}
          <Grid item xs={12}>
            <Typography variant="h6" className="mb-2">
              Items / Ingredients
            </Typography>
            <Paper className="p-3 mb-3">
              <Button variant="outlined" onClick={addLine}>
                Add Line
              </Button>
            </Paper>

            <Paper className="overflow-x-auto">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
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
                          placeholder="e.g., Flour / Banner print / etc."
                          value={l.name}
                          onChange={(e) =>
                            updateLine(l.id, { name: e.target.value })
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          size="small"
                          placeholder="e.g., 2 cups / 1 pack / n/a"
                          value={l.measurement ?? ""}
                          onChange={(e) =>
                            updateLine(l.id, { measurement: e.target.value })
                          }
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
                            updateLine(l.id, {
                              unitCost:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
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
                        No lines yet. Click “Add Line”.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            <div className="mt-3 flex justify-end">
              <Typography variant="subtitle1">
                Total Item Costs: <b>P{totalItemCosts.toFixed(2)}</b>
              </Typography>
            </div>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          {mode === "edit" ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromoDialog;
