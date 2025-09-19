// src/components/TillSummaryCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';  // ← Added Divider to imports
import type { TillSummary } from '../types/till';

interface Props {
  summary: TillSummary | null;
  onCloseTill?: () => void;
}

const TillSummaryCard: React.FC<Props> = ({ summary, onCloseTill }) => {
  if (!summary) {
    return null;
  }

  // Provide defaults for optional properties
  const {
    openingFloat = 0,
    expectedCash = 0,
    salesTotal = 0,
    cashIn = 0,
    cashOut = 0,
    refunds = 0,
    payouts = 0,
    closingCashActual = 0,  // Default to 0
    overShort = 0,
  } = summary;

  const isBalanced = Math.abs(overShort) < 0.01;
  const varianceColor = isBalanced ? 'success' : overShort > 0 ? 'info' : 'error';

  // Only show closing info if closingCashActual is meaningful (not 0 and not undefined)
  const hasClosingData = closingCashActual > 0 || (summary.closingCashActual !== undefined && summary.closingCashActual !== null);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            Till Summary
          </Typography>
          {onCloseTill && (
            <Chip
              label="Close Till"
              color="error"
              size="small"
              onClick={onCloseTill}
              sx={{ cursor: 'pointer' }}
            />
          )}
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          mb: 2
        }}>
          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Opening Float
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{openingFloat.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Expected Cash
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{expectedCash.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Sales Total
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{salesTotal.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Cash In
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{cashIn.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Cash Out
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{cashOut.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Refunds
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{refunds.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Payouts
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₱{payouts.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Only show closing info if we have actual closing data */}
        {hasClosingData && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight={600}>
                Closing Cash Actual: ₱{closingCashActual.toFixed(2)}
              </Typography>
              <Chip
                label={
                  isBalanced
                    ? 'Balanced'
                    : overShort > 0
                    ? `Over ₱${overShort.toFixed(2)}`
                    : `Short ₱${Math.abs(overShort).toFixed(2)}`
                }
                color={varianceColor}
                size="small"
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TillSummaryCard;