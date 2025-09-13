import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import { ReactComponent as Logo } from "../assets/logo.svg";

/** Brand emerald (from your mock): */
const BRAND = {
  emeraldDark: "#064e3b",   // emerald-900
  emerald: "#0f766e",       // emerald-700
  emeraldLight: "#10b981",  // emerald-500 (for chips/accents)
};

const linkBase =
  "group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors";
const linkActive =
  "bg-white/10 text-white";
const linkIdle =
  "text-white/90 hover:text-white";

const NavItem: React.FC<{
  to: string;
  label: string;
  icon?: React.ReactNode;
  collapsed?: boolean;
}> = ({ to, label, icon, collapsed }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `${linkBase} ${isActive ? linkActive : linkIdle}`
    }
  >
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
      {icon ?? <span className="text-sm font-semibold">{label[0]}</span>}
    </span>
    {!collapsed && <span className="font-medium">{label}</span>}
  </NavLink>
);

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const initials = useMemo(() => {
    const n = user?.username || "";
    return n
      .split(/[.\s_@-]+/g)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  }, [user?.username]);

  return (
    <aside
      className="relative min-h-screen flex flex-col"
      style={{
        width: collapsed ? 84 : 260,
        background: `linear-gradient(160deg, ${BRAND.emerald} 0%, ${BRAND.emeraldDark} 100%)`,
        color: "white",
      }}
    >
      {/* Header / brand */}
      <div className="p-4 pb-2 flex items-center gap-3">
        <Logo className="h-10 w-10 rounded-xl ring-2 ring-white/20" />
        {!collapsed && (
          <div className="flex-1">
            <div className="text-lg font-semibold tracking-wide">Ipachi POS</div>
            <div className="text-xs text-white/80">Portal</div>
          </div>
        )}
        <Tooltip title={collapsed ? "Expand" : "Collapse"}>
          <IconButton
            size="small"
            onClick={() => setCollapsed((c) => !c)}
            sx={{ color: "white" }}
          >
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-3 space-y-1">
        <div className={`px-2 ${collapsed ? "hidden" : "block"} text-xs uppercase tracking-wider text-white/70 mb-1`}>
          Main
        </div>
        <NavItem to="/cash-till" label="Cash Till" collapsed={collapsed} />
        <NavItem to="/account" label="Account" collapsed={collapsed} />
        <NavItem to="/inventory/stock" label="Inventory" collapsed={collapsed} />
        <NavItem to="/suppliers" label="Suppliers" collapsed={collapsed} />
        <NavItem to="/customers" label="Customers" collapsed={collapsed} />
        <NavItem to="/discounts" label="Discount & Promo" collapsed={collapsed} />
        <NavItem to="/transactions" label="Transactions" collapsed={collapsed} />
        <NavItem to="/staff" label="Staff Management" collapsed={collapsed} />
        <NavItem to="/reports" label="Reports" collapsed={collapsed} />
      </nav>

      {/* Footer badge */}
      <div className="mt-auto p-4">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2">
            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "rgba(255,255,255,0.15)" }}>{initials || "U"}</Avatar>
            <div className="leading-tight">
              <div className="text-xs font-medium">{user?.username ?? "User"}</div>
              <div className="text-[10px] opacity-80">Signed in</div>
            </div>
          </div>
        )}
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <span className="opacity-90">Terminal</span>
              <span className="font-semibold">T-01</span>
            </div>
          ) : (
            <div className="text-center">T-01</div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
