import React from "react";
import { Button, Box } from "@mui/material";

type PillTabsProps = {
  value: number;
  labels: string[];
  onChange: (newValue: number) => void;
  sx?: any;
};

/**
 * Simple pill-style tabs (matches Inventory look & feel).
 * - Rounded full buttons
 * - "Contained" gold-ish when active, "outlined" when inactive
 */
const PillTabs: React.FC<PillTabsProps> = ({ value, labels, onChange, sx }) => {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", ...sx }}>
      {labels.map((label, idx) => {
        const active = value === idx;
        return (
          <Button
            key={label}
            variant={active ? "contained" : "outlined"}
            size="small"
            onClick={() => onChange(idx)}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              px: 2.5,
              py: 1,
              fontWeight: 600,
              bgcolor: active ? "#caa63d" : undefined,           // gold-ish active
              borderColor: active ? "#caa63d" : undefined,
              color: active ? "#1f2937" : undefined,              // slate-800 text on active
              "&:hover": {
                bgcolor: active ? "#b8932f" : undefined,
                borderColor: active ? "#b8932f" : undefined,
              },
            }}
          >
            {label}
          </Button>
        );
      })}
    </Box>
  );
};

export default PillTabs;
