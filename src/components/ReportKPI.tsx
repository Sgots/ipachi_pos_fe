import React from "react";
import { Paper, Typography } from "@mui/material";

interface Props {
  label: string;
  value: string | number;
  delta?: string;        // e.g. "+8% WoW"
  tone?: "default" | "success" | "warning" | "error";
}

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-gray-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700",
};

const ReportKPI: React.FC<Props> = ({ label, value, delta, tone = "default" }) => {
  return (
    <Paper className="p-4 rounded-xl">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {delta && <div className={`text-xs mt-1 ${tones[tone]}`}>{delta}</div>}
    </Paper>
  );
};

export default ReportKPI;
