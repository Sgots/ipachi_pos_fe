// src/components/NavBar.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Tooltip,
  Chip,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuth } from "../auth/AuthContext";
import { useBusinessLogo } from "../hooks/UseBusinessLogo";

const BRAND = { bar: "#f8fafc", text: "#0f172a", emerald: "#0f766e" };

const NavBar: React.FC = () => {
  const { user, terminalId, businessName, businessLogoUrl, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Use the stored business logo URL (if any)
  const logoSrc = useBusinessLogo(businessLogoUrl || undefined, !!businessLogoUrl);

  const initials = (user?.username ?? "U")
    .split(/[.\s_@-]+/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  // SHOW NOTHING when terminalId is null/empty (no fallback)
  const showTerminalChip =
    terminalId !== null && terminalId !== undefined && String(terminalId).trim() !== "";

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ background: BRAND.bar, color: BRAND.text, borderBottom: "1px solid #e5e7eb" }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 3 } }}>
        {/* Left: Title / Terminal */}
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
        >

          {/* If we have a business name, show it; otherwise keep it blank (no fallback "Business") */}
          {businessName ? `${businessName} Portal` : ""}
        </Typography>

        {showTerminalChip && (
          <Chip
            size="small"
            sx={{ ml: 2, bgcolor: "#fde68a", color: "#92400e", fontWeight: 600 }}
            label={`TERMINAL : ${String(terminalId)}`}
          />
        )}

        {/* Right: User name + avatar/menu */}
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>{user?.username ?? "User"}</Typography>

          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              sx={{
                borderRadius: 3,
                px: 1,
                "&:hover": { backgroundColor: "rgba(15,118,110,0.08)" },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: BRAND.emerald,
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
              <KeyboardArrowDownIcon sx={{ ml: 0.5 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton color="inherit" onClick={logout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem disabled>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{user?.username ?? "User"}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.roles?.join(" • ") || "Member"}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Account</MenuItem>
          <MenuItem onClick={logout}>
            <LogoutIcon fontSize="small" style={{ marginRight: 8 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
