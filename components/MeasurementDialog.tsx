// src/components/MeasurementDialog.tsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from "@mui/material";

export interface UnitDraft { id?: number; name: string; abbr: string; }

const MeasurementDialog: React.FC<{
  open: boolean;
  initial?: Partial<UnitDraft>;
  onClose: () => void;
  onSave: (u: Partial<UnitDraft>) => Promise<void> | void;
}> = ({ open, initial, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<UnitDraft>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(initial ?? {}); setSaving(false); } }, [open, initial]);

  const canSave = !!form.name?.trim() && !!form.abbr?.trim() && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ id: form.id, name: form.name!.trim(), abbr: form.abbr!.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{form.id ? "Edit Measurement" : "Add Measurement"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Measurement name"
                fullWidth
                required
                autoFocus
                value={form.name || ""}
                onChange={e=>setForm({ ...form, name: e.target.value })}
                inputProps={{ maxLength: 64 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Abbreviation"
                fullWidth
                required
                value={form.abbr || ""}
                onChange={e=>setForm({ ...form, abbr: e.target.value })}
                inputProps={{ maxLength: 16 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!canSave}>
            {saving ? "Saving..." : (form.id ? "Save" : "Add")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MeasurementDialog;
