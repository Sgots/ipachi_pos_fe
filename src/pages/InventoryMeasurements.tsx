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
import { useAuth } from "../auth/AuthContext"; // <<< permissions

interface UnitRow { id: number; name: string; abbr: string; }

const InventoryMeasurements: React.FC = () => {
  const { can } = useAuth();
  const CAN_VIEW = can("INVENTORY", "VIEW");
  const CAN_CREATE = can("INVENTORY", "CREATE");
  const CAN_EDIT = can("INVENTORY", "EDIT");
  const CAN_DELETE = can("INVENTORY", "DELETE");

  const [rows, setRows] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);

  const refresh = async () => {
    if (!CAN_VIEW) return;
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

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [CAN_VIEW]);

  const filtered = useMemo(
    () => rows.filter(r => (r.name + r.abbr).toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  const handleDelete = async (id: number) => {
    if (!CAN_DELETE) { setErr("You don't have permission to delete measurements."); return; }
    try {
      await deleteMeasurement(id);
      setRows(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to delete measurement");
    }
  };

  if (!CAN_VIEW) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <Typography variant="h6">Inventory &gt; Measurements</Typography>
          <InventoryTabs />
        </div>
        <Paper className="p-4">
          <Typography color="text.secondary">You don’t have permission to view Inventory.</Typography>
        </Paper>
      </div>
    );
  }

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
          {CAN_CREATE && (
            <Button variant="contained" startIcon={<AddIcon/>}
                    onClick={()=>{ setEditing(null); setOpen(true); }}>
              Add measurement
            </Button>
          )}
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
                  <Tooltip title={CAN_EDIT ? "Edit" : "No permission"}>
                    <span>
                      <IconButton size="small"
                        onClick={()=>{ if (CAN_EDIT) { setEditing(u); setOpen(true); } }}
                        disabled={!CAN_EDIT}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={CAN_DELETE ? "Delete" : "No permission"}>
                    <span>
                      <IconButton size="small" color="error"
                        onClick={()=>handleDelete(u.id)}
                        disabled={!CAN_DELETE}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
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
          const name = (val.name || "").trim();
          const abbr = (val.abbr || "").trim();
          if (!name || !abbr) return;

          if (editing && !CAN_EDIT) { setErr("You don't have permission to edit measurements."); return; }
          if (!editing && !CAN_CREATE) { setErr("You don't have permission to create measurements."); return; }

          try {
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
