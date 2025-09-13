import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
}

function DataTable<T>({ columns, rows, getKey }: Props<T>) {
  return (
    <Paper className="p-4 overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={String(c.key)}>{c.header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={getKey(r)}>
              {columns.map((c) => (
                <TableCell key={String(c.key)}>{c.render ? c.render(r) : (r as any)[c.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default DataTable;
