// src/pages/InventoryMeasurements.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Paper, Typography, TextField, Button, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Snackbar, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import InventoryTabs from "../components/InventoryTabs";
import MeasurementDialog, { UnitDraft } from "../components/MeasurementDialog";
import { allMeasurements, createMeasurement, updateMeasurement, deleteMeasurement } from "../api/inventory";

interface UnitRow { id: number; name: string; abbr: string; }

const InventoryMeasurements: React.FC = () => {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await allMeasurements(); // [{id,name,abbr,...}]
      setRows(data.map(u => ({ id: u.id, name: u.name, abbr: u.abbr })));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load measurements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => rows.filter(r => (r.name + r.abbr).toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteMeasurement(id);
      setRows(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to delete measurement");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Typography variant="h6">Inventory &gt; Measurements</Typography>
        <InventoryTabs />
      </div>

      <Paper className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <TextField
              fullWidth placeholder="Search" value={query}
              onChange={(e)=>setQuery(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon className="mr-2 opacity-60" /> }}
            />
          </div>
          <Button variant="contained" startIcon={<AddIcon/>}
                  onClick={()=>{ setEditing(null); setOpen(true); }}>
            Add measurement
          </Button>
        </div>
      </Paper>

      <Paper className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Measurement name</TableCell>
              <TableCell>Abbreviation</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={3} align="center"><CircularProgress size={22}/></TableCell></TableRow>
            )}

            {!loading && filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.abbr}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={()=>{ setEditing(u); setOpen(true); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={()=>handleDelete(u.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {!loading && !filtered.length && (
              <TableRow><TableCell colSpan={3} align="center">No measurements.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <MeasurementDialog
        open={open}
        initial={editing ?? undefined}
        onClose={()=>setOpen(false)}
        onSave={async (val: Partial<UnitDraft>) => {
          try {
            const name = (val.name || "").trim();
            const abbr = (val.abbr || "").trim();
            if (!name || !abbr) return;

            if (editing) {
              const updated = await updateMeasurement(editing.id, { name, abbr });
              setRows(prev => prev.map(r => r.id === editing.id ? { id: updated.id, name: updated.name, abbr: updated.abbr } : r));
            } else {
              const created = await createMeasurement({ name, abbr });
              setRows(prev => [{ id: created.id, name: created.name, abbr: created.abbr }, ...prev]);
            }
            setOpen(false);
            setEditing(null);
          } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to save measurement");
          }
        }}
      />

      <Snackbar open={!!err} autoHideDuration={4000} onClose={()=>setErr(null)}>
        <Alert severity="error" onClose={()=>setErr(null)}>{err}</Alert>
      </Snackbar>
    </div>
  );
};

export default InventoryMeasurements;
