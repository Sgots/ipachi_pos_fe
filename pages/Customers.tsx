import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, TextField, Button, Chip } from "@mui/material";
import DataTable from "../components/DataTable";
import { api } from "../api/client";        // use api and CALL api below
import { API } from "../api/endpoints";
import type { Customer } from "../types/customer";

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});

  const fetchCustomers = async () => {
    const res = await api.get<Customer[]>(API.customers.base);
    setCustomers(res.data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = async () => {
    const res = await api.get<Customer[]>(API.customers.search(searchTerm));
    setCustomers(res.data);
  };

  const handleAddCustomer = async () => {
    await api.post(API.customers.base, newCustomer);
    setNewCustomer({});
    fetchCustomers();
  };

  return (
    <Box>
      <Typography variant="h5" className="mb-4">
        Customers
      </Typography>

      <Paper className="p-4 mb-6">
        <Box className="flex gap-4 items-end flex-wrap">
          <TextField
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
        </Box>
      </Paper>

      <Paper className="p-4 mb-6">
        <Typography variant="h6" className="mb-2">
          Add Customer
        </Typography>
        <Box className="flex gap-4 flex-wrap">
          <TextField
            label="First Name"
            value={newCustomer.firstname || ""}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, firstname: e.target.value })
            }
          />
          <TextField
            label="Last Name"
            value={newCustomer.lastname || ""}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, lastname: e.target.value })
            }
          />
          <TextField
            label="Mobile Number"
            value={newCustomer.mobileNumber || ""}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, mobileNumber: e.target.value })
            }
          />
          <TextField
            label="ID Number"
            value={newCustomer.identificationNumber || ""}
            onChange={(e) =>
              setNewCustomer({
                ...newCustomer,
                identificationNumber: e.target.value,
              })
            }
          />
          <Button variant="contained" onClick={handleAddCustomer}>
            Add
          </Button>
        </Box>
      </Paper>

    <DataTable<Customer>
      columns={[
        { key: "firstname", header: "First Name" },
        { key: "lastname", header: "Last Name" },
        { key: "mobileNumber", header: "Mobile" },
        { key: "identificationNumber", header: "ID Number" },
        {
          key: "availableBalance",
          header: "Available Balance",
          render: (c) => Number(c.availableBalance ?? 0).toFixed(2),
        },
        {
          key: "fingerprintTemplate",
          header: "Fingerprint",
          render: (c) => (
            <Chip
              label={c.fingerprintTemplate ? "AVAILABLE" : "UNAVAILABLE"}
              color={c.fingerprintTemplate ? "success" : "error"}
              size="small"
            />
          ),
        },
      ]}
      rows={customers}
      getKey={(c) => String(c.id)}
    />
    </Box>
  );
};

export default Customers;
