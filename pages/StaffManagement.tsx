import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

type Role = { id: number; name: string };
type Location = { id: number; name: string };
type Staff = {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  roleId: number;
  roleName?: string;
  locationId: number;
  locationName?: string;
  active?: boolean;
};

type SaveStaffDTO = {
  firstname: string;
  lastname: string;
  email: string;
  roleId: number;
  locationId: number;
  active?: boolean;
};

const emptyStaff: SaveStaffDTO = {
  firstname: "",
  lastname: "",
  email: "",
  roleId: 0,
  locationId: 0,
  active: true,
};

export const StaffManagement: React.FC = () => {
  const [tab, setTab] = useState(0);

  // data
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // search
  const [staffSearch, setStaffSearch] = useState("");

  // add/edit dialogs
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffDraft, setStaffDraft] = useState<SaveStaffDTO>(emptyStaff);

  const [roleDraft, setRoleDraft] = useState<Role>({ id: 0, name: "" });
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const [locationDraft, setLocationDraft] = useState<Location>({ id: 0, name: "" });
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);

  useEffect(() => {
    void fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchStaff(), fetchRoles(), fetchLocations()]);
  };

  const fetchStaff = async () => {
    const res = await axios.get<Staff[]>("/api/staff");
    setStaff(res.data);
  };

  const fetchRoles = async () => {
    const res = await axios.get<Role[]>("/api/roles");
    setRoles(res.data);
  };

  const fetchLocations = async () => {
    const res = await axios.get<Location[]>("/api/locations");
    setLocations(res.data);
  };

  // ---------- Staff handlers ----------
  const openCreateStaff = () => {
    setEditingStaffId(null);
    setStaffDraft(emptyStaff);
    setStaffDialogOpen(true);
  };

  const openEditStaff = (row: Staff) => {
    setEditingStaffId(row.id);
    setStaffDraft({
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email,
      roleId: row.roleId,
      locationId: row.locationId,
      active: row.active ?? true,
    });
    setStaffDialogOpen(true);
  };

  const saveStaff = async () => {
    if (editingStaffId == null) {
      await axios.post("/api/staff", staffDraft);
    } else {
      await axios.put(`/api/staff/${editingStaffId}`, staffDraft);
    }
    setStaffDialogOpen(false);
    await fetchStaff();
  };

  const deleteStaff = async (id: number) => {
    await axios.delete(`/api/staff/${id}`);
    await fetchStaff();
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

  // ---------- Role handlers ----------
  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleDraft({ id: 0, name: "" });
    setRoleDialogOpen(true);
  };

  const openEditRole = (r: Role) => {
    setEditingRoleId(r.id);
    setRoleDraft({ id: r.id, name: r.name });
    setRoleDialogOpen(true);
  };

  const saveRole = async () => {
    if (editingRoleId == null) {
      await axios.post("/api/roles", { name: roleDraft.name });
    } else {
      await axios.put(`/api/roles/${editingRoleId}`, { name: roleDraft.name });
    }
    setRoleDialogOpen(false);
    await fetchRoles();
  };

  const deleteRole = async (id: number) => {
    await axios.delete(`/api/roles/${id}`);
    await fetchRoles();
  };

  // ---------- Location handlers ----------
  const openCreateLocation = () => {
    setEditingLocationId(null);
    setLocationDraft({ id: 0, name: "" });
    setLocationDialogOpen(true);
  };

  const openEditLocation = (l: Location) => {
    setEditingLocationId(l.id);
    setLocationDraft({ id: l.id, name: l.name });
    setLocationDialogOpen(true);
  };

  const saveLocation = async () => {
    if (editingLocationId == null) {
      await axios.post("/api/locations", { name: locationDraft.name });
    } else {
      await axios.put(`/api/locations/${editingLocationId}`, { name: locationDraft.name });
    }
    setLocationDialogOpen(false);
    await fetchLocations();
  };

  const deleteLocation = async (id: number) => {
    await axios.delete(`/api/locations/${id}`);
    await fetchLocations();
  };

  const onRoleSelect = (e: SelectChangeEvent<number>) => {
    setStaffDraft((d) => ({ ...d, roleId: Number(e.target.value) }));
  };
  const onLocationSelect = (e: SelectChangeEvent<number>) => {
    setStaffDraft((d) => ({ ...d, locationId: Number(e.target.value) }));
  };

  return (
    <Box>
      <Typography variant="h5" className="mb-4">Staff Management</Typography>

      <Paper className="p-2 mb-4">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Staff" />
          <Tab label="Roles" />
          <Tab label="Locations" />
        </Tabs>
      </Paper>

      {/* STAFF TAB */}
      {tab === 0 && (
        <Box>
          <Paper className="p-4 mb-4">
            <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems="flex-end">
              <TextField
                label="Search staff"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
              <Button variant="contained" onClick={openCreateStaff}>
                Add Staff
              </Button>
            </Stack>
          </Paper>

          <Paper className="p-4 overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStaff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.firstname}</TableCell>
                    <TableCell>{s.lastname}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.roleName ?? roles.find(r => r.id === s.roleId)?.name ?? "-"}</TableCell>
                    <TableCell>{s.locationName ?? locations.find(l => l.id === s.locationId)?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={s.active ? "Active" : "Inactive"}
                        color={s.active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton aria-label="edit" onClick={() => openEditStaff(s)}><EditIcon /></IconButton>
                      <IconButton aria-label="delete" onClick={() => void deleteStaff(s.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Staff Dialog */}
          <Dialog open={staffDialogOpen} onClose={() => setStaffDialogOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>{editingStaffId == null ? "Add Staff" : "Edit Staff"}</DialogTitle>
            <DialogContent>
              <Stack gap={2} mt={1}>
                <TextField
                  label="First Name"
                  value={staffDraft.firstname}
                  onChange={(e) => setStaffDraft({ ...staffDraft, firstname: e.target.value })}
                  required
                />
                <TextField
                  label="Last Name"
                  value={staffDraft.lastname}
                  onChange={(e) => setStaffDraft({ ...staffDraft, lastname: e.target.value })}
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  value={staffDraft.email}
                  onChange={(e) => setStaffDraft({ ...staffDraft, email: e.target.value })}
                  required
                />
                <FormControl fullWidth>
                  <InputLabel id="role-select">Role</InputLabel>
                  <Select<number>
                    labelId="role-select"
                    label="Role"
                    value={staffDraft.roleId}
                    onChange={onRoleSelect}
                  >
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="loc-select">Location</InputLabel>
                  <Select<number>
                    labelId="loc-select"
                    label="Location"
                    value={staffDraft.locationId}
                    onChange={onLocationSelect}
                  >
                    {locations.map((l) => (
                      <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={saveStaff}>Save</Button>
            </DialogActions>
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
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((r) => (
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

          {/* Role Dialog */}
          <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>{editingRoleId == null ? "Add Role" : "Edit Role"}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Role Name"
                fullWidth
                value={roleDraft.name}
                onChange={(e) => setRoleDraft({ ...roleDraft, name: e.target.value })}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={saveRole}>Save</Button>
            </DialogActions>
          </Dialog>
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

          {/* Location Dialog */}
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
