export const endpoints = {
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    me: "/api/auth/me",
  },
  user: {
    setup: "/api/users/setup",
  },
  inventory: {
    categories: "/api/inventory/categories",
    measurements: "/api/inventory/measurements",
    products: "/api/inventory/products",
    components: (id: number | string) => `/api/inventory/products/${id}/components`,
    lookup: (sku: string) => `/api/inventory/lookup?sku=${encodeURIComponent(sku)}`,
    // NEW:
    receipts: "/api/inventory/receipts",
    stock: "/api/inventory/stock",
    restock: (id: number | string) => `/api/inventory/products/${id}/restock`,
      restockHistory: "/api/inventory/restock-history",

  },
  customers: {
    base: "/api/customers",
    search: (q: string) => `/api/customers?search=${encodeURIComponent(q)}`,
  },
  promos: {
    base: "/api/promos",
    search: (q: string) => `/api/promos?search=${encodeURIComponent(q)}`,
  },
  suppliers: {
    base: "/api/suppliers",
    search: (q: string) => `/api/suppliers?search=${encodeURIComponent(q)}`,
  },
// Till endpoints - COMPLETE DEFINITION
  till: {
    base: '/api/tills',                    // Base URL
    active: '/api/tills/active',           // Get active till
    open: '/api/tills/open',               // Open new till
    close: (id: string | number) => `/api/tills/${id}/close`,  // Close till
    summary: (id: string | number) => `/api/tills/${id}/summary`, // Till summary
    cashIn: (id: string | number) => `/api/tills/${id}/cash-in`,   // Cash in
    cashOut: (id: string | number) => `/api/tills/${id}/cash-out`, // Cash out
    recordSale: (id: string | number) => `/api/tills/${id}/record-sale`, // Record sale
    refund: (id: string | number) => `/api/tills/${id}/refund`,    // Process refund
    checkout: '/api/cash-till/checkout',   // Checkout endpoint
  },
  transactions: {
    base: "/api/transactions",
  },
  features: {
    global: "/features/global",
    customer: (id: string | number) => `/features/customer/${id}`,
  },
} as const;

// Back-compat shim
export const API = {
  auth: { login: endpoints.auth.login },
  customers: { ...endpoints.customers },
  features: { ...endpoints.features },
  inventory: {
    base: "/api/inventory",
    lookup: endpoints.inventory.lookup,
    categories: endpoints.inventory.categories,
  },
  promos: endpoints.promos,
  suppliers: endpoints.suppliers,
  till: endpoints.till,
  transactions: endpoints.transactions,
} as const;

/** ---- DTOs ---- */
export type CategoryDTO = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};
export type CategoryCreate = { name: string };
export type CategoryUpdate = { name: string };

export type MeasurementDTO = {
  id: number;
  name: string;
  abbr: string;
  createdAt: string;
  updatedAt: string;
};
export type MeasurementCreate = { name: string; abbr: string };
export type MeasurementUpdate = { name: string; abbr: string };

export type ProductDTO = {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  buyPrice: string;
  sellPrice: string;

  categoryId?: number | null;
  categoryName?: string | null;

  // add these so TS stops complaining in the UI
  unitId?: number | null;
  unitName?: string | null;
  unitAbbr?: string | null;

  hasImage: boolean;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;

  productType?: "SINGLE" | "RECIPE";
  recipeCost?: string | null;
};

export type ProductCreate = {
  sku?: string;
  barcode?: string;
  name: string;
  buyPrice?: number; // SINGLE only
  sellPrice: number;
  categoryId?: number | null;
  unitId?: number | null;
  productType?: "SINGLE" | "RECIPE";
  components?: Array<{
    unitId?: number | null;
    measurement: number | string;
    unitCost?: number | string | null;
  }>;
};
export type ProductUpdate = ProductCreate & { id?: number };

/** ---- Auth & user setup types (used by AuthContext / RegisterWizard) ---- */
export type AuthResponse = {
  token: string;
  username?: string;
  role?: string;
};

export type RegisterRequest = {
  username: string;   // email or phone (your app accepts either)
  email?: string;     // optional if username is phone
  password: string;
};

/** JSON part of the multipart payload for /api/users/setup */
export type NewUserSetupRequest = {
  // Personal
  title?: string;         // "Mr" | "Ms" | "Dr" | ...
  gender?: string;        // "Male" | "Female" | "Other" | ...
  dob?: string;           // ISO date (YYYY-MM-DD)

  // ID
  idType?: string;        // "NATIONAL_ID" | "PASSPORT" | "DRIVER_LICENSE" | ...
  idNumber?: string;

  // Addresses & contact
  postalAddress?: string;
  physicalAddress?: string;
  city?: string;
  country?: string;
  areaCode?: string;
  phone?: string;         // you concatenate area code + phone in UI

  // Business
  bizName?: string;
  bizLocation?: string;
};

export interface RestockHistoryRow {
    date: string; // e.g., "2025-09-26"
    productId: number;
    sku: string;
    name: string;
    openingStock: number;
    newStock: number;
    closingStock: number;
}
