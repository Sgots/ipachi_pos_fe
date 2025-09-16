import React, { useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Alert } from "@mui/material";

const CloseTillDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (closingCashActual: number, notes?: string) => void;
  expected: number;
}> = ({ open, onClose, onSubmit, expected }) => {
  const [actual, setActual] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const overShort = useMemo(() => {
    const a = parseFloat(actual || "0");
    return isNaN(a) ? 0 : a - (expected || 0);
  }, [actual, expected]);
  const sign = overShort > 0 ? "Over" : overShort < 0 ? "Short" : "Balanced";
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Close Till</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">Expected Cash: {expected.toFixed(2)}</Alert>
          <TextField label="Counted Cash (Actual)" type="number" value={actual} onChange={e=>setActual(e.target.value)} />
          <Alert severity={overShort===0 ? "success" : (overShort>0 ? "info" : "warning")}>
            {sign}: {overShort.toFixed(2)}
          </Alert>
          <TextField label="Notes" value={notes} onChange={e=>setNotes(e.target.value)} multiline rows={3}/>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={()=>onSubmit(parseFloat(actual||"0"), notes || undefined)} disabled={!actual}>Close Till</Button>
      </DialogActions>
    </Dialog>
  );
};
export default CloseTillDialog;
