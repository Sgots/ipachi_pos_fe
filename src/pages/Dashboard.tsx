import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import client from "../api/client";
import SearchIcon from "@mui/icons-material/Search";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PaymentsIcon from "@mui/icons-material/Payments";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { usePlanAccess } from "../hooks/usePlanAccess";
type BusinessProfile = {
  id: number;
  name: string;
  location?: string;
  logoUrl?: string | null;
  createdAt?: string;
  subscriptionTier?: string | null;
  totalSales?: number;
  gender?: string | null;
};

type DashboardSummary = {
  totalSmes: number;
  totalSales: number;
  growthRate: number;
  businesses: BusinessProfile[];
};

type FilterType = "ALL" | "ACTIVE";
type GenderFilter = "ALL" | "Male" | "Female" | "Other";

const fmtMoney = (value: number | string | null | undefined) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const fmtNumber = (value: number | string | null | undefined) =>
  new Intl.NumberFormat(undefined).format(Number(value ?? 0));

const BusinessListDashboard: React.FC = () => {
  const { businessId: currentBusinessId } = useAuth();
  const navigate = useNavigate();
const { tier, hasActive } = usePlanAccess();

const planTier = String(tier || "").toUpperCase();

const CAN_VIEW_SME_CASH_TILL =
  Boolean(hasActive) &&
  ["INTELLIGENCE", "MONITOR"].includes(planTier);

const isDiscoverPlan = planTier === "DISCOVER";
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalSmes: 0,
    totalSales: 0,
    growthRate: 0,
    businesses: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("ALL");

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();

        if (currentBusinessId) {
          query.set("excludeBusinessId", String(currentBusinessId));
        }

        if (genderFilter !== "ALL") {
          query.set("gender", genderFilter);
        }

        const url = `/api/business-profiles/dashboard-summary${
          query.toString() ? `?${query.toString()}` : ""
        }`;

        const { data } = await client.get<DashboardSummary>(url);

        const payload = data ?? {
          totalSmes: 0,
          totalSales: 0,
          growthRate: 0,
          businesses: [],
        };

        const cleanBusinesses = Array.isArray(payload.businesses) ? payload.businesses : [];

        setSummary({
          totalSmes: Number(payload.totalSmes ?? 0),
          totalSales: Number(payload.totalSales ?? 0),
          growthRate: Number(payload.growthRate ?? 0),
          businesses: cleanBusinesses,
        });

        setBusinesses(cleanBusinesses);
      } catch (err: any) {
        console.error("Failed to fetch business dashboard summary:", err);
        setError("Failed to load business dashboard summary. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardSummary();
  }, [currentBusinessId, genderFilter]);

  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();

      result = result.filter(
        (biz) =>
          biz.name.toLowerCase().includes(term) ||
          Boolean(biz.location && biz.location.toLowerCase().includes(term))
      );
    }

    if (filter === "ACTIVE") {
      result = result.filter(() => true);
    }

    return result;
  }, [businesses, searchTerm, filter]);

const handleViewBusiness = (biz: BusinessProfile) => {
  localStorage.setItem("x.report.business.id", String(biz.id));
  localStorage.setItem("x.report.business.name", biz.name || "Business");

  navigate("/reporting", { replace: true });
};
const handleViewCashTill = (biz: BusinessProfile) => {
  if (!CAN_VIEW_SME_CASH_TILL) return;

  localStorage.setItem("x.cashTill.business.id", String(biz.id));
  localStorage.setItem("x.cashTill.business.name", biz.name || "Business");

  // Keep contexts separate.
  localStorage.removeItem("x.report.business.id");
  localStorage.removeItem("x.report.business.name");

  navigate("/cash-till?viewOnly=1", { replace: true });
};
  const growthIsPositive = Number(summary.growthRate ?? 0) >= 0;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#0c5b4a", fontWeight: 700 }}>
        Select Business
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Choose a business profile to view its dashboards and reports.
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              borderLeft: "6px solid #0c5b4a",
              boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total SMEs
                </Typography>

                <Typography variant="h4" sx={{ color: "#0c5b4a", fontWeight: 800, mt: 1 }}>
                  {fmtNumber(summary.totalSmes)}
                </Typography>


              </Box>

              <Avatar sx={{ bgcolor: "#e7f3ec", color: "#0c5b4a", width: 56, height: 56 }}>
                <StorefrontIcon />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              borderLeft: "6px solid #0c5b4a",
              boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Sales
                </Typography>

                <Typography variant="h4" sx={{ color: "#0c5b4a", fontWeight: 800, mt: 1 }}>
                  BWP {fmtMoney(summary.totalSales)}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Combined sales across filtered businesses
                </Typography>
              </Box>

              <Avatar sx={{ bgcolor: "#e7f3ec", color: "#0c5b4a", width: 56, height: 56 }}>
                <PaymentsIcon />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              borderLeft: `6px solid ${growthIsPositive ? "#10b981" : "#ef4444"}`,
              boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Growth Rate
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: growthIsPositive ? "#10b981" : "#ef4444",
                    fontWeight: 800,
                    mt: 1,
                  }}
                >
                  {growthIsPositive ? "+" : ""}
                  {Number(summary.growthRate ?? 0).toFixed(2)}%
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Current month vs previous month sales
                </Typography>
              </Box>

              <Avatar
                sx={{
                  bgcolor: growthIsPositive ? "#e7f8f1" : "#fff1f2",
                  color: growthIsPositive ? "#10b981" : "#ef4444",
                  width: 56,
                  height: 56,
                }}
              >
                {growthIsPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
              </Avatar>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Search + Filters */}
      <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Search by business name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#0c5b4a" }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 300 }}
          variant="outlined"
        />

        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, newFilter) => newFilter && setFilter(newFilter as FilterType)}
        >
          <ToggleButton value="ALL" sx={{ px: 3 }}>
            All
          </ToggleButton>

          <ToggleButton value="ACTIVE" sx={{ px: 3 }}>
            Active
          </ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={genderFilter}
          exclusive
          onChange={(_, newGender) => newGender && setGenderFilter(newGender as GenderFilter)}
        >
          <ToggleButton value="ALL" sx={{ px: 3 }}>
            All Genders
          </ToggleButton>

          <ToggleButton value="Male" sx={{ px: 3 }}>
            Male
          </ToggleButton>

          <ToggleButton value="Female" sx={{ px: 3 }}>
            Female
          </ToggleButton>

          <ToggleButton value="Other" sx={{ px: 3 }}>
            Other
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {filteredBusinesses.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            No business profiles found for the selected filters
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredBusinesses.map((biz) => (
            <Grid item xs={12} sm={6} md={4} key={biz.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: 8,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar
                      src={biz.logoUrl ?? undefined}
                      sx={{ width: 56, height: 56, bgcolor: "#0c5b4a" }}
                    >
                      {biz.name?.charAt(0)?.toUpperCase() || "B"}
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {biz.name}
                      </Typography>

                      {biz.location && (
                        <Typography variant="body2" color="text.secondary">
                          {biz.location}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                    <Chip label="Active" color="success" size="small" />

                    {biz.subscriptionTier && (
                      <Chip
                        label={biz.subscriptionTier}
                        size="small"
                        sx={{
                          bgcolor: "#e7f3ec",
                          color: "#0c5b4a",
                          fontWeight: 700,
                        }}
                      />
                    )}

                    {biz.gender && (
                      <Chip
                        label={biz.gender}
                        size="small"
                        sx={{
                          bgcolor: "#f3f4f6",
                          color: "#374151",
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Total Sales
                    </Typography>

                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0c5b4a" }}>
                      BWP {fmtMoney(biz.totalSales)}
                    </Typography>
                  </Paper>
                </CardContent>

             <CardActions sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
               <Button
                 fullWidth
                 variant="contained"
                 onClick={() => handleViewBusiness(biz)}
                 sx={{
                   bgcolor: "#0c5b4a",
                   "&:hover": { bgcolor: "#094d3e" },
                   py: 1.2,
                   textTransform: "none",
                 }}
               >
                 View Reports
               </Button>

               <Button
                 fullWidth
                 variant="outlined"
                 disabled={!CAN_VIEW_SME_CASH_TILL}
                 onClick={() => handleViewCashTill(biz)}
                 title={
                   isDiscoverPlan
                     ? "Cash Till viewing is available on Monitor and Intelligence plans only."
                     : undefined
                 }
                 sx={{
                   borderColor: "#0c5b4a",
                   color: "#0c5b4a",
                   "&:hover": {
                     borderColor: "#094d3e",
                     bgcolor: "#e7f3ec",
                   },
                   "&.Mui-disabled": {
                     borderColor: "#d1d5db",
                     color: "#9ca3af",
                     bgcolor: "#f3f4f6",
                   },
                   py: 1.2,
                   textTransform: "none",
                   fontWeight: 700,
                 }}
               >
                 View Cash Till
               </Button>
             </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BusinessListDashboard;