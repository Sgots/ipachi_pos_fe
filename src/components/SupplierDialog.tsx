import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Chip, Autocomplete, Switch, FormControlLabel
} from "@mui/material";
import type { Supplier } from "../types/supplier";

type Mode = "add" | "edit";

interface Props {
  open: boolean;
  mode: Mode;
  initial?: Supplier;
  onClose: () => void;
  onSave: (payload: Partial<Supplier>, mode: Mode) => Promise<void> | void;
}

const tagOptions = ["Food", "Beverage", "Packaging", "Cleaning", "Hardware", "Other"];

const SupplierDialog: React.FC<Props> = ({ open, mode, initial, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [leadTimeDays, setLeadTimeDays] = useState<number | "">("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (!open) return;
    if (mode === "add") {
      setName(""); setContactName(""); setPhone(""); setEmail("");
      setAddress(""); setTags([]); setLeadTimeDays(""); setStatus("active");
    } else if (initial) {
      setName(initial.name ?? "");
      setContactName(initial.contactName ?? "");
      setPhone(initial.phone ?? "");
      setEmail(initial.email ?? "");
      setAddress(initial.address ?? "");
      setTags(initial.tags ?? []);
      setLeadTimeDays(initial.leadTimeDays ?? "");
      setStatus(initial.status ?? "active");
    }
  }, [open, mode, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Supplier> = {
      id: initial?.id,
      name, contactName, phone, email, address,
      tags, leadTimeDays: leadTimeDays === "" ? undefined : Number(leadTimeDays),
      status,
    };
    await onSave(payload, mode);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "add" ? "Add Supplier" : "Edit Supplier"}</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Supplier Name" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Contact Person" fullWidth value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Lead Time (days)" type="number" fullWidth
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value === "" ? "" : Number(e.target.value))}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" fullWidth multiline minRows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={tagOptions}
                value={tags}
                onChange={(_, v) => setTags(v)}
                renderTags={(value: readonly string[], getTagProps) =>
                  value.map((option: string, index: number) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option+index} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="Tags" placeholder="Add tag and press Enter" />}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={status === "active"} onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")} />}
                label={status === "active" ? "Active" : "Inactive"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">{mode === "add" ? "Add" : "Save"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SupplierDialog;
