import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@mui/material";

const pill = {
    base: "rounded-full px-5 py-2 text-sm font-medium",
};

const TabButton: React.FC<{ to: string; label: string }> = ({ to, label }) => {
    const { pathname } = useLocation();
    const active = pathname.startsWith(to);
    return (
        <NavLink to={to} className="inline-block">
            <Button
                variant={active ? "contained" : "outlined"}
                size="small"
                className={pill.base}
                sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    bgcolor: active ? "#caa63d" : undefined,
                    borderColor: active ? "#caa63d" : undefined,
                    color: active ? "#1f2937" : undefined,
                    '&:hover': { bgcolor: active ? "#b8932f" : undefined, borderColor: active ? "#b8932f" : undefined }
                }}
            >
                {label}
            </Button>
        </NavLink>
    );
};

const InventoryTabs: React.FC = () => (
    <div className="flex gap-3 items-center">
        <TabButton to="/inventory/stock" label="STOCK" />
        <TabButton to="/inventory/history" label="RESTOCKING HISTORY" />
        <TabButton to="/inventory/products" label="PRODUCTS" />
        <TabButton to="/inventory/measurements" label="MEASUREMENTS" />
        <TabButton to="/inventory/categories" label="CATEGORIES" />
    </div>
);

export default InventoryTabs;