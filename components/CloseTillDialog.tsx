import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Alert } from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Called when user clicks Close Till.
   * closingCashActual: counted cash
   * expectedCash: expected cash (editable)
   * notes: optional notes
   */
  onSubmit: (closingCashActual: number, expectedCash: number, notes?: string) => void;
  expected: number; // initial expected value
};

const CloseTillDialog: React.FC<Props> = ({ open, onClose, onSubmit, expected }) => {
  // Keep local state so user can edit without mutating summary until submit
  const [actual, setActual] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [expectedEdit, setExpectedEdit] = useState<string>(expected?.toString() ?? "0");

  // sync initial expected when dialog opens / expected prop changes
  useEffect(() => {
    setExpectedEdit((expected ?? 0).toString());
  }, [expected, open]);

  const parsedActual = parseFloat(actual || "0");
  const parsedExpected = parseFloat(expectedEdit || "0");
  const overShort = useMemo(() => {
    const a = isNaN(parsedActual) ? 0 : parsedActual;
    const e = isNaN(parsedExpected) ? 0 : parsedExpected;
    return a - e;
  }, [parsedActual, parsedExpected]);

  const sign = overShort > 0 ? "Over" : overShort < 0 ? "Short" : "Balanced";

  const handleSubmit = () => {
    const closingVal = parseFloat(actual || "0");
    const expectedVal = parseFloat(expectedEdit || "0");
    onSubmit(isNaN(closingVal) ? 0 : closingVal, isNaN(expectedVal) ? 0 : expectedVal, notes || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Close Till</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Editable expected cash */}
          <TextField
            label="Expected Cash"
            type="number"
            value={expectedEdit}
            onChange={(e) => setExpectedEdit(e.target.value)}
            fullWidth
            helperText="Edit expected cash if you want to override the calculated expected amount"
            inputProps={{ inputMode: "decimal", step: "0.01" }}
          />

          <TextField
            label="Counted Cash (Actual)"
            type="number"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            fullWidth
            inputProps={{ inputMode: "decimal", step: "0.01" }}
          />

          <Alert severity={overShort === 0 ? "success" : overShort > 0 ? "info" : "warning"}>
            {sign}: {overShort.toFixed(2)}
          </Alert>

          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={3} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleSubmit}
          disabled={actual.trim() === "" || isNaN(parseFloat(expectedEdit || "0"))}
        >
          Close Till
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloseTillDialog;
