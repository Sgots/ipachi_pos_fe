// src/components/Sidebar.tsx
import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar, IconButton } from "@mui/material";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import { ReactComponent as Logo } from "../assets/logo.svg";
import { useBusinessLogo } from "../hooks/UseBusinessLogo";
import { usePlanAccess } from "../hooks/usePlanAccess";

const BRAND = {
    emeraldDark: "#064e3b",
    emerald: "#0f766e",
    emeraldLight: "#10b981",
};

const linkBase = "group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors";
const linkActive = "bg-white/10 text-white";
const linkIdle = "text-white/90 hover:text-white";
const linkDisabled = "text-white/40 cursor-not-allowed pointer-events-none";

type Item = {
    to: string;
    label: string;
    icon?: React.ReactNode;
    requireActive?: boolean;
};

const NavItem: React.FC<{
    to: string;
    label: string;
    icon?: React.ReactNode;
    collapsed?: boolean;
    disabled?: boolean;
}> = ({ to, label, icon, collapsed, disabled }) => {
    if (disabled) {
        return (
            <div className={`${linkBase} ${linkDisabled}`} title="Requires active subscription">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          {icon ?? <span className="text-sm font-semibold">{label[0]}</span>}
        </span>
                {!collapsed && <span className="font-medium">{label}</span>}
            </div>
        );
    }
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
        >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
        {icon ?? <span className="text-sm font-semibold">{label[0]}</span>}
      </span>
            {!collapsed && <span className="font-medium">{label}</span>}
        </NavLink>
    );
};

const Sidebar: React.FC = () => {
    const { user, terminalId, businessLogoUrl, businessLogoBlobUrl } = useAuth();
    const { hasActive, loading } = usePlanAccess();
    const [collapsed, setCollapsed] = useState(false);

    // Hide sidebar entirely for platform admin
    const isPlatformAdmin = (user?.username || "").toLowerCase() === "admin";
    if (isPlatformAdmin) return null;

    const hookLogo = useBusinessLogo(businessLogoUrl || undefined, !!businessLogoUrl);
    const logoSrc = businessLogoBlobUrl || hookLogo || "";

    const initials = useMemo(() => {
        const n = user?.username || "";
        return n
            .split(/[.\s_@-]+/g)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("");
    }, [user?.username]);

    const items: Item[] = useMemo(() => {
        const allItems: Item[] = [
            { to: "/cash-till", label: "Cash Till", requireActive: true },
            { to: "/account", label: "Account", requireActive: false },
            { to: "/inventory/stock", label: "Inventory", requireActive: true },
            { to: "/suppliers", label: "Suppliers", requireActive: true },
            { to: "/customers", label: "Customers", requireActive: true },
            { to: "/discounts", label: "Discount & Promo", requireActive: true },
            { to: "/transactions", label: "Transactions", requireActive: true },
            { to: "/staff", label: "Staff Management", requireActive: true },
            { to: "/reports", label: "Reports", requireActive: true },
            { to: "/activate-subscription", label: "Activate Subscription", requireActive: false },
        ];
        if (!hasActive && !loading) {
            return allItems.filter((i) => i.to === "/account" || i.to === "/activate-subscription");
        }
        return allItems;
    }, [hasActive, loading]);

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
            <div className="relative px-4 pt-4 pb-2">
                <IconButton
                    size="small"
                    onClick={() => setCollapsed((c) => !c)}
                    sx={{ color: "white" }}
                    className="!absolute right-3 top-3"
                    title={collapsed ? "Expand" : "Collapse"}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
                </IconButton>

                <div className="mt-2 flex justify-center">
                    <div
                        className={`${collapsed ? "h-16 w-16" : "h-24 w-24"} rounded-full shadow-md ring-1`}
                        style={{
                            backgroundColor: "#ffffff",
                            borderColor: "rgba(0,0,0,0.06)",
                            borderStyle: "solid",
                            borderWidth: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt="Business Logo"
                                className={`${collapsed ? "h-12 w-12" : "h-20 w-20"}`}
                                style={{ objectFit: "contain" }}
                            />
                        ) : (
                            <div className={`${collapsed ? "h-12 w-12" : "h-20 w-20"} flex items-center justify-center`}>
                                <Logo className={`${collapsed ? "h-8 w-8" : "h-12 w-12"}`} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="mt-4 px-3 space-y-1">
                <div className={`px-2 ${collapsed ? "hidden" : "block"} text-xs uppercase tracking-wider text-white/70 mb-1`}>
                    Main
                </div>
                {items.map((it) => {
                    const disabled = !loading && it.requireActive && !hasActive;
                    return (
                        <NavItem
                            key={it.to}
                            to={it.to}
                            label={it.label}
                            collapsed={collapsed}
                            disabled={disabled}
                        />
                    );
                })}
            </nav>

            {/* Footer badge */}
            <div className="mt-auto p-4">
                {!collapsed && (
                    <div className="mb-2 flex items-center gap-2">
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "rgba(255,255,255,0.15)" }}>
                            {initials || "U"}
                        </Avatar>
                        <div className="leading-tight">
                            <div className="text-xs font-medium">{user?.username ?? "User"}</div>
                            <div className="text-[10px] opacity-80">Signed in</div>
                        </div>
                    </div>
                )}
                <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    {!collapsed ? (
                        <div className="flex items-center justify-between">
                            <span className="opacity-90">Terminal</span>
                            <span className="font-semibold">{terminalId ?? ""}</span>
                        </div>
                    ) : (
                        <div className="text-center">{terminalId ?? ""}</div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
