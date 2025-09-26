// components/RestockHistory.tsx
import React, { useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from "@mui/material";
import { fetchRestockHistory, RestockHistoryRow } from "../api/inventory";

const RestockHistory: React.FC = () => {
  const [history, setHistory] = useState<RestockHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchRestockHistory();
      // Sort by date descending
      setHistory(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Failed to fetch restock history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Group history by date for display
  const groupedHistory = history.reduce((acc, row) => {
    if (!acc[row.date]) {
      acc[row.date] = [];
    }
    acc[row.date].push(row);
    return acc;
  }, {} as Record<string, RestockHistoryRow[]>);

  return (
    <Paper className="p-3">
      <Typography variant="h6" gutterBottom>
        Restocking History
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : Object.keys(groupedHistory).length === 0 ? (
        <Typography>No restocking history available.</Typography>
      ) : (
        Object.entries(groupedHistory).map(([date, rows]) => (
          <div key={date} className="mb-6">
            <Typography variant="subtitle1" className="mb-2">
              {new Date(date).toLocaleDateString()}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell align="right">Opening Stock</TableCell>
                  <TableCell align="right">New Stock</TableCell>
                  <TableCell align="right">Closing Stock</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.date}-${row.productId}`}>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.openingStock}</TableCell>
                    <TableCell align="right">{row.newStock}</TableCell>
                    <TableCell align="right">{row.closingStock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </Paper>
  );
};

export default RestockHistory;