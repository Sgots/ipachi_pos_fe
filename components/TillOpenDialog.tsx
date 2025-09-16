import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack } from "@mui/material";

const TillOpenDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (openingFloat: number, notes?: string) => void;
}> = ({ open, onClose, onSubmit }) => {
  const [openingFloat, setOpeningFloat] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Open Till</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Opening Float" type="number" value={openingFloat} onChange={e=>setOpeningFloat(e.target.value)} />
          <TextField label="Notes" value={notes} onChange={e=>setNotes(e.target.value)} multiline rows={3}/>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={()=>onSubmit(parseFloat(openingFloat||"0"), notes || undefined)}>Open</Button>
      </DialogActions>
    </Dialog>
  );
};
export default TillOpenDialog;
