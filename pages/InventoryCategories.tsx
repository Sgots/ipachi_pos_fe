// src/pages/InventoryCategories.tsx
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
import CategoryDialog, { CategoryDraft } from "../components/CategoryDialog";
import { allCategories, createCategory, updateCategory, deleteCategory } from "../api/inventory";

interface CategoryRow { id: number; name: string; }

const InventoryCategories: React.FC = () => {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await allCategories(); // [{id,name,createdAt,updatedAt}]
      setRows(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteCategory(id);
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Typography variant="h6">Inventory &gt; Categories</Typography>
        <InventoryTabs />
      </div>

      <Paper className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <TextField
              fullWidth
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon className="mr-2 opacity-60" /> }}
            />
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setOpen(true); }}
          >
            Add category
          </Button>
        </div>
      </Paper>

      <Paper className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  <CircularProgress size={22} />
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => { setEditing(c); setOpen(true); }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(c.id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {!loading && !filtered.length && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No categories.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <CategoryDialog
        open={open}
        initial={editing ?? undefined}
        onClose={() => setOpen(false)}
        onSave={async (val: Partial<CategoryDraft>) => {
          try {
            const name = (val.name || "").trim();
            if (!name) return;

            if (editing) {
              const updated = await updateCategory(editing.id, { name });
              setRows((prev) =>
                prev.map((r) => (r.id === editing.id ? { id: updated.id, name: updated.name } : r))
              );
            } else {
              const created = await createCategory({ name });
              setRows((prev) => [{ id: created.id, name: created.name }, ...prev]);
            }
            setOpen(false);
            setEditing(null);
          } catch (e: any) {
            setErr(e?.response?.data?.message || "Failed to save category");
          }
        }}
      />

      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>
      </Snackbar>
    </div>
  );
};

export default InventoryCategories;
