import React from "react";
import { Paper, Typography, Chip, IconButton, Tooltip, LinearProgress } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import type { PromoCampaign } from "../types/promo";

interface Props {
  data: PromoCampaign;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void; // start/stop
}

const PromoCard: React.FC<Props> = ({ data, onEdit, onDelete, onToggleActive }) => {
  const active = data.status === "active";
  return (
    <Paper className="p-4 rounded-xl space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <Typography variant="subtitle1" className="font-semibold leading-tight">{data.name}</Typography>
          <Typography variant="caption" color="text.secondary">{data.code || "No code"}</Typography>
        </div>
        <div className="flex gap-1">
          <Tooltip title={active ? "Pause" : "Start"}>
            <IconButton size="small" color={active ? "warning" : "success"} onClick={onToggleActive}>
              {active ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={onDelete}><DeleteOutlineIcon fontSize="small" /></IconButton>
          </Tooltip>
        </div>
      </div>

      {/* creative banner thumbnail */}
      <div className="rounded-lg p-3" style={{ background: data.banner?.bg ?? "#E5E7EB", color: data.banner?.fg ?? "#111827" }}>
        <div className="text-xs opacity-80 mb-1">Preview</div>
        <div className="font-semibold">{data.banner?.headline || "Headline"}</div>
        <div className="text-sm opacity-90">{data.banner?.subcopy || "Subcopy"}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip size="small" label={data.status.toUpperCase()} color={active ? "success" : data.status === "scheduled" ? "warning" : "default"} variant="outlined" />
        <Chip size="small" label={data.type.toUpperCase()} variant="outlined" />
        <Chip size="small" label={data.channels.join(", ")} variant="outlined" />
        {data.audienceTags.slice(0,3).map(t => <Chip key={t} size="small" label={t} />)}
        {data.audienceTags.length > 3 && <Chip size="small" label={`+${data.audienceTags.length-3}`} />}
      </div>

      {/* mini-metrics */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Redemptions</div>
        <LinearProgress variant="determinate" value={Math.min(100, (data.metrics?.redemptions ?? 0) % 101)} />
        <div className="mt-1 text-xs text-gray-600">
          Impr: {data.metrics?.impressions ?? 0} · Redeem: {data.metrics?.redemptions ?? 0} · Rev: P{(data.metrics?.revenue ?? 0).toFixed(2)}
        </div>
      </div>
    </Paper>
  );
};

export default PromoCard;
