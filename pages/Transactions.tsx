import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { Box, Typography } from '@mui/material';
import client from '../api/client';

interface Txn {
  id: number;
  date: string; // ISO
  customer: string;
  total: number;
}

const Transactions: React.FC = () => {
  const [rows, setRows] = useState<Txn[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await client.get<Txn[]>('/api/transactions');
      setRows(data);
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h5" className="mb-4">Transactions</Typography>
      <DataTable<Txn>
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'date', header: 'Date' },
          { key: 'customer', header: 'Customer' },
          { key: 'total', header: 'Total', render: (t) => t.total.toFixed(2) },
        ]}
        rows={rows}
        getKey={(t) => t.id}
      />
    </Box>
  );
};

export default Transactions;
