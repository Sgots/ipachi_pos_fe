import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid
} from "@mui/material";
import type { InventoryItem } from "../types/inventory";

type Mode = "add" | "edit" | "restock";

interface Props {
  open: boolean;
  mode: Mode;
  initial?: InventoryItem;
  onClose: () => void;
  onSave: (payload: Partial<InventoryItem>, mode: Mode) => Promise<void> | void;
}

const InventoryDialog: React.FC<Props> = ({ open, mode, initial, onClose, onSave }) => {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");

  React.useEffect(() => {
    if (!open) return;
    if (mode === "add") {
      setSku("");
      setName("");
      setPrice("");
      setQuantity("");
    } else if (mode === "edit" && initial) {
      setSku(initial.sku);
      setName(initial.name);
      setPrice(initial.price);
      setQuantity(initial.quantity);
    } else if (mode === "restock") {
      setSku(initial?.sku ?? "");
      setName(initial?.name ?? "");
      setPrice(initial?.price ?? "");
      setQuantity("");
    }
  }, [open, mode, initial]);

  const title =
    mode === "add" ? "Add Item" : mode === "edit" ? "Edit Item" : "Restock";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<InventoryItem> = {
      id: initial?.id,
      sku,
      name,
      price: price === "" ? 0 : Number(price),
      quantity: quantity === "" ? 0 : Number(quantity),
    };
    await onSave(payload, mode);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="SKU"
                fullWidth
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Name"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Price"
                type="number"
                fullWidth
                required
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === "" ? "" : Number(e.target.value))
                }
                inputProps={{ step: "0.01", min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={mode === "restock" ? "New Quantity" : "Quantity"}
                type="number"
                fullWidth
                required
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                inputProps={{ step: "1", min: 0 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {mode === "add" ? "Add" : mode === "edit" ? "Save" : "Update"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InventoryDialog;
