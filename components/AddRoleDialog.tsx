// src/components/AddRoleDialog.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, TextField, Button, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Tooltip
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import {
  createRole,
  updateRole,
  getRole,
  type CreateRoleRequest,
  type ModulePermission,
  type RoleDto,
  type ModuleKey,
} from "../api/role";

const MODULES: Array<{ key: ModulePermission["module"]; label: string }> = [
  { key: "CASH_TILL", label: "Cash Till" },
  { key: "INVENTORY", label: "Inventory" },
  { key: "SUPPLIERS", label: "Suppliers" },
  { key: "DISCOUNTS", label: "Discounts & Promo" },
  { key: "TRANSACTIONS", label: "Transactions" },
  { key: "REPORTS", label: "Reports" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  roleToEdit?: RoleDto;
  onSaved?: (role: RoleDto) => void;
  onCreated?: (role: RoleDto) => void;
};

const defaultPerms: Record<ModuleKey, Omit<ModulePermission, "module">> = {
  CASH_TILL:    { create: false, view: false, edit: false, delete: false },
  INVENTORY:    { create: false, view: false, edit: false, delete: false },
  SUPPLIERS:    { create: false, view: false, edit: false, delete: false },
  DISCOUNTS:    { create: false, view: false, edit: false, delete: false },
  TRANSACTIONS: { create: false, view: false, edit: false, delete: false },
  REPORTS:      { create: false, view: false, edit: false, delete: false },
};

/* ---------------- Unwrap & normalize helpers ---------------- */
const asBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";

/** Accepts AxiosResponse, {data}, {data:{data}}, or the bare object */
function unwrapPayload<T = any>(val: any): T {
  if (val && typeof val === "object") {
    if (val.data?.data) return val.data.data as T;
    if (val.data) return val.data as T;
  }
  return val as T;
}

function pickPermissionsArray(obj: any): any[] {
  const p = obj?.permissions ?? obj?.data?.permissions;
  return Array.isArray(p) ? p : [];
}

function normalizePerm(p: any) {
  const create = asBool(p?.create ?? p?.canCreate ?? p?.can_create);
  const view   = asBool(p?.view   ?? p?.canView   ?? p?.can_view);
  const edit   = asBool(p?.edit   ?? p?.canEdit   ?? p?.can_edit);
  const del    = asBool(p?.delete ?? p?.canDelete ?? p?.can_delete);
  const module = String(p?.module ?? "").toUpperCase();
  return { module, create, view, edit, delete: del };
}

function normalizeRoleName(r: any): string {
  return String(r?.name ?? r?.roleName ?? r?.data?.name ?? "");
}
/* ----------------------------------------------------------- */

const AddRoleDialog: React.FC<Props> = ({
  open,
  onClose,
  mode = "create",
  roleToEdit,
  onSaved,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Record<ModuleKey, Omit<ModulePermission, "module">>>({ ...defaultPerms });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!open) return;

      if (mode === "edit" && roleToEdit?.id) {
        console.log("[AddRoleDialog] Editing role stub:", roleToEdit);
        try {
          const raw = await getRole(roleToEdit.id);
          console.log("[AddRoleDialog] getRole raw:", raw);
          const full = unwrapPayload(raw);
          console.log("[AddRoleDialog] getRole unwrapped:", full);

          if (!active) return;

          if (!full || typeof full !== "object") {
            throw new Error("Malformed role payload (not an object)");
          }

          const resolvedName = normalizeRoleName(full) || normalizeRoleName(roleToEdit) || "";
          setName(resolvedName);

          const next: Record<string, { create: boolean; view: boolean; edit: boolean; delete: boolean }> = { ...defaultPerms };

          for (const rawPerm of pickPermissionsArray(full)) {
            const np = normalizePerm(rawPerm);
            const key = (np.module as ModuleKey) || "";
            if (key && key in next) {
              next[key] = { create: np.create, view: np.view, edit: np.edit, delete: np.delete };
            }
          }

          console.log("[AddRoleDialog] Mapped permissions:", next);
          setPerms(next as Record<ModuleKey, Omit<ModulePermission, "module">>);
          setError(null);
        } catch (e: any) {
          console.error("[AddRoleDialog] Failed to load role details:", e);
          setName(roleToEdit?.name ?? "");
          setPerms({ ...defaultPerms });
          setError(e?.response?.data?.message || e?.message || "Failed to load role details");
        }
      } else {
        console.log("[AddRoleDialog] Create mode, resetting form");
        setName("");
        setPerms({ ...defaultPerms });
        setError(null);
      }
    }
    load();
    return () => { active = false; };
  }, [open, mode, roleToEdit?.id, roleToEdit?.name]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const toggle = (m: ModuleKey, field: keyof Omit<ModulePermission, "module">) => {
    setPerms(prev => {
      const updated = { ...prev, [m]: { ...prev[m], [field]: !prev[m][field] } };
      console.log("[AddRoleDialog] Toggled", m, field, "→", updated[m]);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const permissions: ModulePermission[] = MODULES.map(({ key }) => ({
        module: key,
        ...perms[key as ModuleKey],
      }));
      const body: CreateRoleRequest = { name: name.trim(), permissions };
      console.log("[AddRoleDialog] Submitting payload:", body);

      const result =
        mode === "edit" && roleToEdit?.id
          ? await updateRole(roleToEdit.id, body)
          : await createRole(body);

      console.log("[AddRoleDialog] Saved role:", result);
      onSaved?.(result);
      onCreated?.(result);
      setSubmitting(false);
      onClose();
    } catch (e: any) {
      console.error("[AddRoleDialog] Save failed:", e);
      setError(e?.response?.data?.message || e?.message || "Failed to save role");
      setSubmitting(false);
    }
  };

  const title = mode === "edit" ? "Edit Role" : "Add Role";
  const cta = mode === "edit" ? "Save" : "Add";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Name"
            placeholder="Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "45%" }}>Modules</TableCell>
              <TableCell align="center">Create</TableCell>
              <TableCell align="center">View</TableCell>
              <TableCell align="center">Edit</TableCell>
              <TableCell align="center">Delete</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MODULES.map(({ key, label }) => {
              const row = perms[key as ModuleKey] || { create: false, view: false, edit: false, delete: false };
              return (
                <TableRow key={key} hover>
                  <TableCell>{label}</TableCell>
                  {(["create", "view", "edit", "delete"] as const).map((col) => {
                    const enabled = row[col];
                    return (
                      <TableCell key={col} align="center">
                        <Tooltip title={enabled ? "Allowed" : "Not allowed"}>
                          <IconButton
                            size="small"
                            onClick={() => toggle(key as ModuleKey, col)}
                            aria-label={`${label} ${col}`}
                            sx={{ "&:hover": { backgroundColor: "transparent" } }}
                          >
                            {enabled
                              ? <CheckCircleOutlineIcon color="success" fontSize="small" />
                              : <CancelIcon color="error" fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {error && <Box sx={{ mt: 2, color: "error.main", fontSize: 14 }}>{error}</Box>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          sx={{ textTransform: "none", minWidth: 96 }}
        >
          {cta}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddRoleDialog;
