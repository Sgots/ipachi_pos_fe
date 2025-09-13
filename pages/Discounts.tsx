import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, IconButton, Tooltip, Tabs, Tab, Chip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import client from "../api/client";
import { API } from "../api/endpoints";
import type { PromoCampaign } from "../types/promo";
import PromoDialog from "../components/PromoDialog";
import PromoCard from "../components/PromoCard";
import ConfirmDialog from "../components/ConfirmDialog";

const statusFilters = ["all","active","scheduled","expired","draft"] as const;

const Discounts: React.FC = () => {
  const [rows, setRows] = useState<PromoCampaign[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof statusFilters)[number]>("all");
  const [loading, setLoading] = useState(false);

  const [openForm, setOpenForm] = useState<{ mode: "add" | "edit" | null; item?: PromoCampaign }>({ mode: null });
  const [confirm, setConfirm] = useState<{ open: boolean; item?: PromoCampaign }>({ open: false });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await client.get<PromoCampaign[]>(API.promos.base);
      setRows(data);
    } catch {
      // mock when backend not present
      const now = new Date().toISOString();
      setRows([
        {
          id: 1,
          name: "VIP Winter 10%",
          code: "WINTER10",
          type: "percentage",
          value: 10,
          startAt: now,
          endAt: new Date(Date.now()+7*86400000).toISOString(),
          channels: ["in-store","online"],
          audienceTags: ["VIP","Loyalty"],
          usageLimit: 1000,
          stackable: false,
          status: "active",
          banner: { headline: "VIP save 10%", subcopy: "Members only", bg: "#0EA5E9", fg: "#FFFFFF", cta: "Shop" },
          metrics: { impressions: 1400, redemptions: 210, lift: 8, revenue: 5200 }
        },
        {
          id: 2,
          name: "Combo BOGO",
          type: "bogo",
          buyQty: 2, getQty: 1,
          startAt: now,
          endAt: new Date(Date.now()+3*86400000).toISOString(),
          channels: ["in-store"],
          audienceTags: ["New"],
          stackable: true,
          status: "scheduled",
          banner: { headline: "Buy 2 Get 1", subcopy: "On select items", bg: "#111827", fg: "#FFFFFF", cta: "Add to cart" },
          abTest: { enabled: true, split: 50, variantB: { headline: "3 for 2", bg: "#0F766E", fg: "#FFFFFF", cta: "Grab deal" } },
          metrics: { impressions: 0, redemptions: 0, lift: 0, revenue: 0 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      const matchesQ = !q || [r.name, r.code, r.banner?.headline, ...(r.audienceTags||[])].some(s => (s || "").toLowerCase().includes(q));
      const matchesTab = tab === "all" ? true : r.status === tab;
      return matchesQ && matchesTab;
    });
  }, [rows, query, tab]);

  const handleSave = async (payload: Partial<PromoCampaign>, mode: "add" | "edit") => {
    if (mode === "add") {
      await client.post(API.promos.base, payload); // replace with real POST
    } else if (mode === "edit" && payload.id != null) {
      await client.post(API.promos.base, payload); // replace with PUT /api/promos/:id
    }
    setOpenForm({ mode: null });
    await fetchRows();
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    // replace with DELETE /api/promos/:id
    setRows(prev => prev.filter(p => p.id !== id));
    setConfirm({ open: false });
  };

  const toggleActive = async (item: PromoCampaign) => {
    const next: PromoCampaign = { ...item, status: item.status === "active" ? "scheduled" : "active" };
    // replace with PUT call
    setRows(prev => prev.map(p => p.id === item.id ? next : p));
  };

  return (
    <Box>
      <Typography variant="h5" className="mb-3">Discount & Promo</Typography>

      {/* Marketing toolbar */}
      <Paper className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px]">
            <TextField
              fullWidth
              placeholder="Search campaigns, codes, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon className="mr-2 opacity-60" /> }}
            />
          </div>

          <Tabs
            value={statusFilters.indexOf(tab)}
            onChange={(_, idx) => setTab(statusFilters[idx])}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {statusFilters.map((s) => <Tab key={s} label={s.toUpperCase()} />)}
          </Tabs>

          <Tooltip title="Refresh">
            <span><IconButton onClick={fetchRows} disabled={loading}><RefreshIcon /></IconButton></span>
          </Tooltip>

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm({ mode: "add" })}>
            New Campaign
          </Button>
        </div>
      </Paper>

      {/* KPI snapshot */}
      <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4 mb-4">
        <Paper className="p-4 rounded-xl">
          <div className="text-xs text-gray-500">Active</div>
          <div className="text-2xl font-semibold">{rows.filter(r => r.status === "active").length}</div>
        </Paper>
        <Paper className="p-4 rounded-xl">
          <div className="text-xs text-gray-500">Scheduled</div>
          <div className="text-2xl font-semibold">{rows.filter(r => r.status === "scheduled").length}</div>
        </Paper>
        <Paper className="p-4 rounded-xl">
          <div className="text-xs text-gray-500">Total Redemptions</div>
          <div className="text-2xl font-semibold">
            {rows.reduce((a, b) => a + (b.metrics?.redemptions ?? 0), 0)}
          </div>
        </Paper>
        <Paper className="p-4 rounded-xl">
          <div className="text-xs text-gray-500">Attributed Revenue</div>
          <div className="text-2xl font-semibold">
            P{rows.reduce((a, b) => a + (b.metrics?.revenue ?? 0), 0).toFixed(2)}
          </div>
        </Paper>
      </div>

      {/* Grid */}
      <div className="grid 2xl:grid-cols-3 lg:grid-cols-2 grid-cols-1 gap-4">
        {filtered.map((c) => (
          <PromoCard
            key={c.id}
            data={c}
            onEdit={() => setOpenForm({ mode: "edit", item: c })}
            onDelete={() => setConfirm({ open: true, item: c })}
            onToggleActive={() => toggleActive(c)}
          />
        ))}
        {!filtered.length && (
          <Paper className="p-6 text-center text-gray-500">{loading ? "Loading…" : "No campaigns match your filters."}</Paper>
        )}
      </div>

      {/* Dialogs */}
  <PromoDialog
    open={!!openForm.mode}
    mode={openForm.mode ?? "add"}
    initial={openForm.item}
    onClose={() => setOpenForm({ mode: null })}
    onSave={(payload) => handleSave(payload as any, openForm.mode ?? "add")}
  />


      <ConfirmDialog
        open={confirm.open}
        title="Delete campaign?"
        message={`This will remove “${confirm.item?.name}”. Update your backend to persist with DELETE.`}
        confirmText="Delete"
        confirmColor="error"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={() => handleDelete(confirm.item?.id)}
      />
    </Box>
  );
};

export default Discounts;
