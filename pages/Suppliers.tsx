import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, IconButton, Chip, Tooltip, Divider, Avatar
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import client from "../api/client";
import { API } from "../api/endpoints";
import type { Supplier } from "../types/supplier";
import SupplierDialog from "../components/SupplierDialog";
import ConfirmDialog from "../components/ConfirmDialog";

const avatarFromName = (name: string) => name
  .split(" ")
  .map((n) => n[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

const Suppliers: React.FC = () => {
  const [items, setItems] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [openForm, setOpenForm] = useState<{ mode: "add" | "edit" | null; item?: Supplier }>({ mode: null });
  const [confirm, setConfirm] = useState<{ open: boolean; item?: Supplier }>({ open: false });

  const fetchItems = async () => {
    setLoading(true);
    try {
      // If your backend doesn’t exist yet, you can return mock data when request fails
      const { data } = await client.get<Supplier[]>(API.suppliers.base);
      setItems(data);
    } catch {
      // mock fallback
      setItems([
        { id: 1, name: "Fresh Foods Ltd", contactName: "Nomsa D.", phone: "267 555 0101",
          email: "orders@freshfoods.example", tags: ["Food"], status: "active", leadTimeDays: 3, balance: 1250.0, lastOrderAt: new Date().toISOString() },
        { id: 2, name: "Bots Packaging", contactName: "John M.", phone: "267 555 0177",
          email: "sales@botspackaging.example", tags: ["Packaging"], status: "active", leadTimeDays: 7, balance: 0 },
        { id: 3, name: "CleanPro", contactName: "Naledi K.", phone: "267 555 0199",
          email: "hello@cleanpro.example", tags: ["Cleaning"], status: "inactive", leadTimeDays: 5, balance: 400.5 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      (i.name ?? "").toLowerCase().includes(q) ||
      (i.contactName ?? "").toLowerCase().includes(q) ||
      (i.phone ?? "").toLowerCase().includes(q) ||
      (i.email ?? "").toLowerCase().includes(q) ||
      (i.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }, [items, query]);

  const handleSave = async (payload: Partial<Supplier>, mode: "add" | "edit") => {
    if (mode === "add") {
      await client.post(API.suppliers.base, payload); // replace with your real endpoint
    } else if (mode === "edit" && payload.id != null) {
      await client.post(API.suppliers.base, payload); // replace with PUT /api/suppliers/:id
    }
    setOpenForm({ mode: null });
    await fetchItems();
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    // replace with DELETE /api/suppliers/:id
    setItems(prev => prev.filter(s => s.id !== id));
    setConfirm({ open: false });
  };

  return (
    <Box>
      <Typography variant="h5" className="mb-3">Suppliers</Typography>

      {/* Toolbar */}
      <Paper className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px]">
            <TextField
              fullWidth
              placeholder="Search suppliers, contacts, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon className="mr-2 opacity-60" />,
              }}
            />
          </div>

          <Tooltip title="Refresh">
            <span><IconButton onClick={fetchItems} disabled={loading}><RefreshIcon /></IconButton></span>
          </Tooltip>

          <Button variant="outlined" startIcon={<Inventory2OutlinedIcon />}>
            Purchase Orders
          </Button>

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm({ mode: "add" })}>
            Add Supplier
          </Button>
        </div>
      </Paper>

      {/* Card grid */}
      <div className="grid 2xl:grid-cols-3 lg:grid-cols-2 grid-cols-1 gap-4">
        {filtered.map((s) => (
          <Paper key={s.id} className="p-4 rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>{avatarFromName(s.name)}</Avatar>
                <div>
                  <Typography variant="subtitle1" className="font-semibold leading-tight">{s.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.contactName || "—"}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-1">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => setOpenForm({ mode: "edit", item: s })}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, item: s })}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            <Divider className="my-2" />

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <PhoneIcon fontSize="small" className="opacity-60" />
                <span>{s.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MailOutlineIcon fontSize="small" className="opacity-60" />
                <span>{s.email || "—"}</span>
              </div>
              <div className="col-span-2">
                <Typography variant="caption" color="text.secondary">{s.address || "No address"}</Typography>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip size="small" label={(s.status ?? "active").toUpperCase()} color={s.status === "inactive" ? "default" : "success"} variant="outlined" />
              {typeof s.leadTimeDays === "number" && <Chip size="small" label={`Lead: ${s.leadTimeDays}d`} variant="outlined" />}
              {typeof s.balance === "number" && <Chip size="small" label={`Balance: P${s.balance.toFixed(2)}`} variant="outlined" />}
              {(s.tags ?? []).map(t => <Chip key={t} size="small" label={t} />)}
            </div>
          </Paper>
        ))}

        {!filtered.length && (
          <Paper className="p-6 text-center text-gray-500">
            {loading ? "Loading…" : "No suppliers match your search."}
          </Paper>
        )}
      </div>

      {/* Dialogs */}
      <SupplierDialog
        open={!!openForm.mode}
        mode={openForm.mode ?? "add"}
        initial={openForm.item}
        onClose={() => setOpenForm({ mode: null })}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete supplier?"
        message={`This will remove “${confirm.item?.name}”. Update the endpoint to use DELETE to persist.`}
        confirmText="Delete"
        confirmColor="error"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={() => handleDelete(confirm.item?.id)}
      />
    </Box>
  );
};

export default Suppliers;
