import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from "@mui/material";

const CashInOutDialog: React.FC<{
  type: "IN" | "OUT";
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, reference?: string, reason?: string) => void;
}> = ({ type, open, onClose, onSubmit }) => {
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const title = type === "IN" ? "Cash In" : "Cash Out";
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Amount" type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
          <TextField label="Reference" value={reference} onChange={e=>setReference(e.target.value)} />
          <TextField label="Reason" value={reason} onChange={e=>setReason(e.target.value)} multiline rows={3}/>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={()=>onSubmit(parseFloat(amount||"0"), reference || undefined, reason || undefined)} disabled={!amount}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};
export default CashInOutDialog;
