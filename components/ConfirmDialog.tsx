import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography
} from "@mui/material";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  confirmColor?: "primary" | "error" | "warning" | "success" | "info";
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<Props> = ({
  open, title, message,
  confirmText = "Confirm",
  confirmColor = "primary",
  onCancel, onConfirm
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      {message && (
        <DialogContent>
          <Typography variant="body2">{message}</Typography>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
