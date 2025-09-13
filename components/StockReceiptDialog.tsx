// src/components/StockReceiptDialog.tsx
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";

const StockReceiptDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onUpload: (label: string, file: File) => Promise<void>;
}> = ({ open, onClose, onUpload }) => {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try { await onUpload(label.trim() || file.name, file); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Upload receipt</DialogTitle>
      <DialogContent dividers>
        <TextField fullWidth label="Label" value={label} onChange={(e)=>setLabel(e.target.value)} className="mb-3" />
        <input type="file" accept="image/*,.pdf" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!file || busy}>Upload</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockReceiptDialog;
