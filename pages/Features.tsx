import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, FormControlLabel, Switch, TextField, Button } from '@mui/material';
import client from '../api/client';
import { API } from '../api/endpoints';
import { FeatureFlags } from '../types/features';

const Features: React.FC = () => {
  const [globalFlags, setGlobalFlags] = useState<FeatureFlags>({ advanceCash: false, airtime: false, electricity: false, demoMode: false });
  const [customerId, setCustomerId] = useState('');
  const [customerFlags, setCustomerFlags] = useState<FeatureFlags | null>(null);

  const fetchGlobalFlags = async () => {
    const res = await client.get<FeatureFlags>(API.features.global);
    setGlobalFlags(res.data);
  };

  useEffect(() => { fetchGlobalFlags(); }, []);

  const toggleGlobalFlag = async (flag: string) => {
    const updated = { ...globalFlags, [flag]: !globalFlags[flag] } as FeatureFlags;
    setGlobalFlags(updated);
    await client.put(API.features.global, updated);
  };

  const handleFetchCustomerFlags = async () => {
    const res = await client.get<FeatureFlags>(API.features.customer(customerId));
    setCustomerFlags(res.data);
  };

  const toggleCustomerFlag = async (flag: string) => {
    if (!customerFlags) return;
    const updated = { ...customerFlags, [flag]: !customerFlags[flag] } as FeatureFlags;
    setCustomerFlags(updated);
    await client.put(API.features.customer(customerId), updated);
  };

  return (
    <Box>
      <Typography variant="h5" className="mb-4">Feature Toggles</Typography>

      <Paper className="p-4 mb-6">
        <Typography variant="h6" className="mb-2">Global Features</Typography>
        <div className="flex flex-col">
          {Object.keys(globalFlags).map((flag) => (
            <FormControlLabel key={flag} control={<Switch checked={globalFlags[flag]} onChange={() => toggleGlobalFlag(flag)} />} label={flag} />
          ))}
        </div>
      </Paper>

      <Paper className="p-4 mb-6">
        <Typography variant="h6" className="mb-2">Customer Features</Typography>
        <Box className="flex gap-4 mb-4">
          <TextField label="Customer ID" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          <Button variant="outlined" onClick={handleFetchCustomerFlags}>Fetch</Button>
        </Box>
        {customerFlags && (
          <Box>
            {Object.keys(customerFlags).map((flag) => (
              <FormControlLabel key={flag} control={<Switch checked={customerFlags[flag]} onChange={() => toggleCustomerFlag(flag)} />} label={flag} />
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Features;
