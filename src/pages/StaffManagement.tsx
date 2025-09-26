// src/pages/StaffManagement.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  IconButton,
  Stack,
  Grid,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { api } from "../api/client";
import AddRoleDialog from "../components/AddRoleDialog";
import type { RoleDto } from "../api/role";
import { useAuth } from "../auth/AuthContext";

/** ---- Types ---- */
type Role = RoleDto;
type Location = { id: number; name: string };

type Staff = {
  id: number;
  firstname: string;
  lastname: string;
  // UI column labelled "Staff Number" -> stored in BE as users.username
  email: string;
  roleId: number;
  roleName?: string;
  locationId: number;
  locationName?: string;
  active?: boolean;
  terminalId?: string;
};

type SaveStaffDTO = {
  firstname: string;
  lastname: string;
  email: string; // carries Staff Number
  roleId: number;
  locationId: number;
  active?: boolean;
  terminalId?: string; // saved to user.terminal_id
};

const emptyStaff: SaveStaffDTO = {
  firstname: "",
  lastname: "",
  email: "",
  roleId: 0,
  locationId: 0,
  active: true,
  terminalId: "",
};

/** Robust array unwrapping from various BE envelopes */
function unwrapArray<T>(payload: any): T[] {
  const p = payload;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.content)) return p.data.content;
  if (Array.isArray(p?.roles)) return p.roles;
  if (Array.isArray(p?.staff)) return p.staff;
  if (Array.isArray(p?.locations)) return p.locations;
  if (Array.isArray(p?.data?.roles)) return p.data.roles;
  if (Array.isArray(p?.data?.staff)) return p.data.staff;
  if (Array.isArray(p?.data?.locations)) return p.data.locations;
  return [];
}

export const StaffManagement: React.FC = () => {
  const { currentUser } = useAuth();

  // ===== Frontend access control: ONLY ADMIN/ROLE_ADMIN allowed =====
  const roles = (currentUser?.roles ?? []).map((r) => String(r).toUpperCase());
  const roleStr = (currentUser as any)?.role ? String((currentUser as any).role).toUpperCase() : null;
  const isAdmin =
    roles.includes("ADMIN") ||
    roles.includes("ROLE_ADMIN") ||
    roleStr === "ADMIN" ||
    roleStr === "ROLE_ADMIN";

  const [tab, setTab] = useState(0);

  // data
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rolesList, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // status
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingLocs, setLoadingLocs] = useState(false);

  // search
  const [staffSearch, setStaffSearch] = useState("");

  // add/edit dialogs (staff)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffDraft, setStaffDraft] = useState<SaveStaffDTO>(emptyStaff);

  // role dialog (create/edit)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // location dialog
  const [locationDraft, setLocationDraft] = useState<Location>({ id: 0, name: "" });
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);

  // password reveal/reset
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwValue, setPwValue] = useState<string>("");
  const [pwWho, setPwWho] = useState<string>("");

  useEffect(() => {
    if (!isAdmin) return; // block all network for non-admins
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchAll = async () => {
    await Promise.all([fetchStaff(), fetchRoles(), fetchLocations()]);
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await api.get("/api/staff");
      console.log("[Staff] payload:", res.data);
      setStaff(unwrapArray<Staff>(res.data));
    } catch (e) {
      console.error("[Staff] fetch failed:", e);
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await api.get("/api/roles");
      console.log("[Roles] payload:", res.data);
      setRoles(unwrapArray<Role>(res.data));
    } catch (e) {
      console.error("[Roles] fetch failed:", e);
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchLocations = async () => {
    setLoadingLocs(true);
    try {
      const res = await api.get("/api/locations");
      console.log("[Locations] payload:", res.data);
      setLocations(unwrapArray<Location>(res.data));
    } catch (e) {
      console.error("[Locations] fetch failed:", e);
      setLocations([]);
    } finally {
      setLoadingLocs(false);
    }
  };

  // ---------- Staff handlers ----------
  const openCreateStaff = () => {
    if (!isAdmin) return;
    setEditingStaffId(null);
    setStaffDraft(emptyStaff);
    setStaffDialogOpen(true);
  };

  const openEditStaff = (row: Staff) => {
    if (!isAdmin) return;
    setEditingStaffId(row.id);
    setStaffDraft({
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email, // Staff Number
      roleId: row.roleId,
      locationId: row.locationId,
      active: row.active ?? true,
      terminalId: row.terminalId ?? "",
    });
    setStaffDialogOpen(true);
  };

  const saveStaff = async () => {
    if (!isAdmin) return;
    const payload = {
      firstname: staffDraft.firstname,
      lastname: staffDraft.lastname,
      email: staffDraft.email, // BE maps -> username
      roleId: staffDraft.roleId,
      locationId: staffDraft.locationId,
      active: staffDraft.active,
      terminalId: staffDraft.terminalId, // saved to users.terminal_id
    };

    if (editingStaffId == null) {
      const res = await api.post("/api/staff", payload);
      const pwd = res?.data?.password ?? res?.data?.data?.password;
      const created = res?.data?.staff ?? res?.data?.data?.staff;
      if (pwd) {
        setPwValue(pwd);
        const name = created
          ? `${created.firstname ?? ""} ${created.lastname ?? ""}`.trim()
          : `${payload.firstname} ${payload.lastname}`.trim();
        setPwWho(name || payload.email);
        setPwDialogOpen(true);
      }
    } else {
      await api.put(`/api/staff/${editingStaffId}`, payload);
    }
    setStaffDialogOpen(false);
    await fetchStaff();
  };

  const deleteStaff = async (id: number) => {
    if (!isAdmin) return;
    await api.delete(`/api/staff/${id}`);
    await fetchStaff();
  };

  const resetPassword = async (row: Staff) => {
    if (!isAdmin) return;
    const res = await api.post(`/api/staff/${row.id}/reset-password`, {});
    const pwd = res?.data?.password ?? res?.data?.data?.password;
    if (pwd) {
      setPwValue(pwd);
      setPwWho(`${row.firstname ?? ""} ${row.lastname ?? ""}`.trim() || row.email);
      setPwDialogOpen(true);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.firstname.toLowerCase().includes(q) ||
        s.lastname.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.roleName ?? "").toLowerCase().includes(q) ||
        (s.locationName ?? "").toLowerCase().includes(q)
    );
  }, [staff, staffSearch]);

  // ---------- Roles ----------
  const openCreateRole = () => {
    if (!isAdmin) return;
    setEditingRole(null);
    setRoleDialogOpen(true);
  };

  const openEditRole = (r: Role) => {
    if (!isAdmin) return;
    setEditingRole(r);
    setRoleDialogOpen(true);
  };

  const deleteRole = async (id: number) => {
    if (!isAdmin) return;
    await api.delete(`/api/roles/${id}`);
    await fetchRoles();
  };

  // ---------- Locations ----------
  const openCreateLocation = () => {
    if (!isAdmin) return;
    setEditingLocationId(null);
    setLocationDraft({ id: 0, name: "" });
    setLocationDialogOpen(true);
  };

  const openEditLocation = (l: Location) => {
    if (!isAdmin) return;
    setEditingLocationId(l.id);
    setLocationDraft({ id: l.id, name: l.name });
    setLocationDialogOpen(true);
  };

  const saveLocation = async () => {
    if (!isAdmin) return;
    if (editingLocationId == null) {
      await api.post("/api/locations", { name: locationDraft.name });
    } else {
      await api.put(`/api/locations/${editingLocationId}`, { name: locationDraft.name });
    }
    setLocationDialogOpen(false);
    await fetchLocations();
  };

  const deleteLocation = async (id: number) => {
    if (!isAdmin) return;
    await api.delete(`/api/locations/${id}`);
    await fetchLocations();
  };

  // ---------- MUI Select handlers (relaxed generics) ----------
  const onRoleSelect = (e: SelectChangeEvent) => {
    setStaffDraft((d) => ({ ...d, roleId: Number(e.target.value) }));
  };
  const onLocationSelect = (e: SelectChangeEvent) => {
    setStaffDraft((d) => ({ ...d, locationId: Number(e.target.value) }));
  };

  const copyPwd = async () => {
    try {
      await navigator.clipboard.writeText(pwValue);
    } catch {
      /* noop */
    }
  };

  // ===== Early return for non-admins =====
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Access denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Only administrators can access Staff Management.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" className="mb-4">Staff Management</Typography>

      <Paper className="p-2 mb-4">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Staff ${loadingStaff ? "…" : `(${staff.length})`}`} />
          <Tab label={`Roles ${loadingRoles ? "…" : `(${rolesList.length})`}`} />
          <Tab label={`Locations ${loadingLocs ? "…" : `(${locations.length})`}`} />
        </Tabs>
      </Paper>

      {/* STAFF TAB */}
      {tab === 0 && (
        <Box>
          <Paper className="p-4 mb-4">
            <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="flex-end">
              <TextField
                placeholder="Search"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260 }}
              />
              <Button variant="contained" onClick={openCreateStaff}>
                New Staff
              </Button>
            </Stack>
          </Paper>

          <Paper className="p-4 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStaff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.email || "-"}</TableCell>
                    <TableCell>{`${s.firstname ?? ""} ${s.lastname ?? ""}`.trim()}</TableCell>
                    <TableCell>{s.roleName ?? rolesList.find((r) => r.id === s.roleId)?.name ?? "-"}</TableCell>
                    <TableCell>{s.locationName ?? locations.find((l) => l.id === s.locationId)?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Chip label={s.active ? "Active" : "Inactive"} color={s.active ? "success" : "default"} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View / Reset Password">
                        <IconButton aria-label="view-password" onClick={() => void resetPassword(s)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton aria-label="edit" onClick={() => openEditStaff(s)}><EditIcon /></IconButton>
                      <IconButton aria-label="delete" onClick={() => void deleteStaff(s.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Staff Dialog */}
          <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 600 }}>
              {editingStaffId == null ? "Add Staff" : "Edit Staff"}
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Grid container spacing={2} mt={0.5}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth placeholder="Name" label="Name" value={staffDraft.firstname}
                    onChange={(e) => setStaffDraft({ ...staffDraft, firstname: e.target.value })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth placeholder="Surname" label="Surname" value={staffDraft.lastname}
                    onChange={(e) => setStaffDraft({ ...staffDraft, lastname: e.target.value })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth placeholder="Staff Number" label="Staff Number" value={staffDraft.email}
                    onChange={(e) => setStaffDraft({ ...staffDraft, email: e.target.value })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="role-select">Select Role</InputLabel>
                    <Select labelId="role-select" label="Select Role" value={String(staffDraft.roleId)} onChange={onRoleSelect}>
                      {rolesList.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="loc-select">Select Location</InputLabel>
                    <Select labelId="loc-select" label="Select Location" value={String(staffDraft.locationId)} onChange={onLocationSelect}>
                      {locations.map((l) => <MenuItem key={l.id} value={String(l.id)}>{l.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth placeholder="Terminal ID" label="Terminal ID" value={staffDraft.terminalId ?? ""}
                    onChange={(e) => setStaffDraft({ ...staffDraft, terminalId: e.target.value })} />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setStaffDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
              <Button variant="contained" onClick={saveStaff} sx={{ minWidth: 96 }}>
                {editingStaffId == null ? "Add" : "Save"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Password reveal dialog */}
          <Dialog open={pwDialogOpen} onClose={() => setPwDialogOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>Password</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 1 }}>{pwWho ? `User: ${pwWho}` : "New password"}</Typography>
              <Paper sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }} variant="outlined">
                <Typography sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>{pwValue}</Typography>
                <Tooltip title="Copy"><IconButton onClick={copyPwd}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
              </Paper>
              <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
                Keep this password safe. It’s only shown once. Use “View / Reset Password” later to generate a new one.
              </Typography>
            </DialogContent>
            <DialogActions><Button onClick={() => setPwDialogOpen(false)}>Close</Button></DialogActions>
          </Dialog>
        </Box>
      )}

      {/* ROLES TAB */}
      {tab === 1 && (
        <Box>
          <Paper className="p-4 mb-4 flex justify-between gap-2 flex-wrap">
            <Typography variant="h6">Roles</Typography>
            <Button variant="contained" onClick={openCreateRole}>Add Role</Button>
          </Paper>
          <Paper className="p-4 overflow-x-auto">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {loadingRoles ? "Loading roles…" : `Loaded ${rolesList.length} roles`}
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rolesList.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => openEditRole(r)}><EditIcon /></IconButton>
                      <IconButton onClick={() => void deleteRole(r.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <AddRoleDialog
            open={roleDialogOpen}
            onClose={() => { setRoleDialogOpen(false); setEditingRole(null); }}
            mode={editingRole ? "edit" : "create"}
            roleToEdit={editingRole ?? undefined}
            onSaved={async () => {
              await fetchRoles();
              setRoleDialogOpen(false);
              setEditingRole(null);
            }}
          />
        </Box>
      )}

      {/* LOCATIONS TAB */}
      {tab === 2 && (
        <Box>
          <Paper className="p-4 mb-4 flex justify-between gap-2 flex-wrap">
            <Typography variant="h6">Locations</Typography>
            <Button variant="contained" onClick={openCreateLocation}>Add Location</Button>
          </Paper>
          <Paper className="p-4 overflow-x-auto">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {loadingLocs ? "Loading locations…" : `Loaded ${locations.length} locations`}
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.name}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => openEditLocation(l)}><EditIcon /></IconButton>
                      <IconButton onClick={() => void deleteLocation(l.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Dialog open={locationDialogOpen} onClose={() => setLocationDialogOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>{editingLocationId == null ? "Add Location" : "Edit Location"}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Location Name"
                fullWidth
                value={locationDraft.name}
                onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLocationDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={saveLocation}>Save</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default StaffManagement;
