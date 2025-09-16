import React from "react";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import { TillSession, TillSummary } from "../types/till";

const Row: React.FC<{ label: string; value?: number }> = ({ label, value }) => (
  <Grid container>
    <Grid item xs={6}><Typography color="text.secondary">{label}</Typography></Grid>
    <Grid item xs={6} textAlign="right"><Typography>{(value ?? 0).toFixed(2)}</Typography></Grid>
  </Grid>
);

const TillSummaryCard: React.FC<{ session: TillSession; summary: TillSummary | null }> = ({ session, summary }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Till Session #{session.id} • {session.status}</Typography>
        <Row label="Opening Float" value={summary?.openingFloat} />
        <Row label="Sales" value={summary?.sales} />
        <Row label="Refunds" value={summary?.refunds} />
        <Row label="Cash In" value={summary?.cashIn} />
        <Row label="Cash Out" value={summary?.cashOut} />
        <Row label="Payouts" value={summary?.payouts} />
        <Row label="Expected Cash" value={summary?.expectedCash} />
        {summary?.closingCashActual !== undefined && (
          <>
            <Row label="Counted (Actual)" value={summary.closingCashActual ?? undefined} />
            <Row label="Over/Short" value={summary.overShort ?? undefined} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
export default TillSummaryCard;
