import React from "react";
import { Paper, Typography, IconButton, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

interface Props {
  title: string;
  subtitle?: string;
  onExport?: () => void;
  children: React.ReactNode;
}

const ChartCard: React.FC<Props> = ({ title, subtitle, onExport, children }) => {
  return (
    <Paper className="p-4 rounded-xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Typography variant="subtitle1" className="font-semibold leading-tight">{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </div>
        {onExport && (
          <Tooltip title="Export CSV">
            <IconButton size="small" onClick={onExport}><DownloadIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </div>
      {children}
    </Paper>
  );
};

export default ChartCard;
