// src/components/CategoryDialog.tsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from "@mui/material";

export interface CategoryDraft { id?: number; name: string }

const CategoryDialog: React.FC<{
  open: boolean;
  initial?: Partial<CategoryDraft>;
  onClose: () => void;
  onSave: (c: Partial<CategoryDraft>) => Promise<void> | void; // allow async
}> = ({ open, initial, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<CategoryDraft>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(initial ?? {}); setSaving(false); }
  }, [open, initial]);

  const canSave = !!form.name && form.name.trim().length > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ id: form.id, name: form.name!.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{form.id ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Category Name"
                fullWidth
                required
                autoFocus
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                inputProps={{ maxLength: 64 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!canSave}>
            {saving ? "Saving..." : form.id ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryDialog;
