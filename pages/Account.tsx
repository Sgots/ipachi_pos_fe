import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  TextField,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "../auth/AuthContext";
// import client from "../api/client"; // uncomment when wiring backend

const Account: React.FC = () => {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.username ?? "");
  const roles = user?.roles ?? [];

  const tokenPreview = useMemo(() => {
    if (!user?.token) return "—";
    const t = user.token;
    return t.length > 16 ? `${t.slice(0, 8)}…${t.slice(-6)}` : t;
  }, [user?.token]);

  const copyToken = async () => {
    if (!user?.token) return;
    try {
      await navigator.clipboard.writeText(user.token);
    } catch { /* ignore */ }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call your backend (e.g. PUT /api/users/me) to save displayName
    // await client.put('/api/users/me', { displayName });
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: implement in backend, e.g. POST /auth/change-password
    // await client.post('/auth/change-password', { oldPassword, newPassword });
    alert("Change password is not wired to backend yet.");
  };

  return (
    <Box className="grid grid-cols-12 gap-4">
      {/* Profile card */}
      <Paper className="col-span-12 lg:col-span-6 p-5">
        <Typography variant="h6" className="mb-4">Account</Typography>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Typography className="w-36 text-gray-500">Username</Typography>
            <Typography>{user?.username ?? "—"}</Typography>
          </div>

          <div className="flex items-center gap-2">
            <Typography className="w-36 text-gray-500">Roles</Typography>
            <div className="flex flex-wrap gap-2">
              {roles.length ? roles.map(r => <Chip key={r} size="small" label={r} />) : <span>—</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Typography className="w-36 text-gray-500">Token</Typography>
            <div className="flex items-center gap-2">
              <Typography>{tokenPreview}</Typography>
              {user?.token && (
                <Tooltip title="Copy full token">
                  <IconButton size="small" onClick={copyToken}><ContentCopyIcon fontSize="inherit" /></IconButton>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        <Divider className="my-4" />

        <form onSubmit={saveProfile} className="space-y-3">
          <Typography variant="subtitle1">Profile</Typography>
          <TextField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
          />
          <div className="flex gap-2">
            <Button type="submit" variant="contained">Save</Button>
            <Button variant="outlined" color="error" onClick={logout}>Logout</Button>
          </div>
        </form>
      </Paper>

      {/* Security card */}
      <Paper className="col-span-12 lg:col-span-6 p-5">
        <Typography variant="h6" className="mb-4">Security</Typography>
        <form onSubmit={changePassword} className="space-y-3">
          <TextField label="Current password" type="password" fullWidth required />
          <TextField label="New password" type="password" fullWidth required />
          <TextField label="Confirm new password" type="password" fullWidth required />
          <div className="flex gap-2">
            <Button type="submit" variant="contained" color="warning">Change Password</Button>
          </div>
        </form>
      </Paper>
    </Box>
  );
};

export default Account;
