// src/api/inventory.ts
import { api } from "./client";
import { endpoints, type CategoryDTO, type CategoryCreate, type CategoryUpdate,
  type MeasurementDTO, type MeasurementCreate, type MeasurementUpdate,
  type ProductDTO, type ProductCreate, type ProductUpdate } from "./endpoints";

// ---------- Endpoint bases ----------
const PRODUCTS_BASE = endpoints.inventory?.products ?? "/api/inventory/products";
const MEAS_BASE      = endpoints.inventory?.measurements ?? "/api/inventory/measurements";
const CATS_BASE      = endpoints.inventory?.categories ?? "/api/inventory/categories";
const RECEIPTS_BASE  = endpoints.inventory?.receipts ?? "/api/inventory/receipts";
const STOCK_BASE     = endpoints.inventory?.stock ?? "/api/inventory/stock";
const RESTOCK_HISTORY_BASE = endpoints.inventory?.restockHistory ?? "/api/inventory/restock-history"; // New endpoint

const componentsPath = (id: number) =>
  endpoints.inventory?.components?.(id) ?? `${PRODUCTS_BASE}/${id}/components`;

const restockPath = (id: number) =>
  endpoints.inventory?.restock?.(id) ?? `${PRODUCTS_BASE}/${id}/restock`;

// ---------- Restock History (NEW) ----------
export interface RestockHistoryRow {
  date: string; // e.g., "2025-09-26"
  productId: number;
  sku: string;
  name: string;
  openingStock: number;
  newStock: number;
  closingStock: number;
}

export async function fetchRestockHistory(q?: string): Promise<RestockHistoryRow[]> {
  const { data } = await api.get<RestockHistoryRow[]>(RESTOCK_HISTORY_BASE, { params: { q } });
  return data.map(item => ({
    date: item.date,
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    openingStock: Number(item.openingStock),
    newStock: Number(item.newStock),
    closingStock: Number(item.closingStock),
  }));
}

// ---------- Categories ----------
export async function allCategories() {
  const { data } = await api.get<CategoryDTO[]>(`${CATS_BASE}/all`);
  return data;
}
export async function listCategories(q?: string, page = 0, size = 50) {
  const { data } = await api.get<{ content: CategoryDTO[]; totalElements: number; totalPages: number }>(
    CATS_BASE, { params: { q, page, size, sort: "name,asc" } }
  );
  return data;
}
export async function createCategory(body: CategoryCreate) {
  const { data } = await api.post<CategoryDTO>(CATS_BASE, body);
  return data;
}
export async function updateCategory(id: number, body: CategoryUpdate) {
  const { data } = await api.put<CategoryDTO>(`${CATS_BASE}/${id}`, body);
  return data;
}
export async function deleteCategory(id: number) {
  await api.delete(`${CATS_BASE}/${id}`);
}

// ---------- Measurements ----------
export async function allMeasurements() {
  const { data } = await api.get<MeasurementDTO[]>(`${MEAS_BASE}/all`);
  return data;
}
export async function listMeasurements(q?: string, page = 0, size = 50) {
  const { data } = await api.get<{ content: MeasurementDTO[]; totalElements: number; totalPages: number }>(
    MEAS_BASE, { params: { q, page, size, sort: "name,asc" } }
  );
  return data;
}
export async function createMeasurement(body: MeasurementCreate) {
  const { data } = await api.post<MeasurementDTO>(MEAS_BASE, body);
  return data;
}
export async function updateMeasurement(id: number, body: MeasurementUpdate) {
  const { data } = await api.put<MeasurementDTO>(`${MEAS_BASE}/${id}`, body);
  return data;
}
export async function deleteMeasurement(id: number) {
  await api.delete(`${MEAS_BASE}/${id}`);
}

// ---------- Products ----------
export async function listProducts(q?: string, page = 0, size = 50) {
  const { data } = await api.get<{ content: ProductDTO[]; totalElements: number; totalPages: number }>(
    PRODUCTS_BASE, { params: { q, page, size, sort: "name,asc" } }
  );
  return data;
}
export async function allProducts() {
  const { data } = await api.get<ProductDTO[]>(`${PRODUCTS_BASE}/all`);
  return data;
}
export async function createProductJSON(body: ProductCreate) {
  const { data } = await api.post<ProductDTO>(PRODUCTS_BASE, body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}
export async function createProductMultipart(body: ProductCreate, image?: File) {
  const form = new FormData();
  form.append("data", new Blob([JSON.stringify(body)], { type: "application/json" }));
  if (image) form.append("image", image);
  const { data } = await api.post<ProductDTO>(PRODUCTS_BASE, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
export async function updateProductJSON(id: number, body: ProductUpdate) {
  const { data } = await api.put<ProductDTO>(`${PRODUCTS_BASE}/${id}`, body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}
export async function updateProductMultipart(id: number, body: ProductUpdate, image?: File) {
  const form = new FormData();
  form.append("data", new Blob([JSON.stringify(body)], { type: "application/json" }));
  if (image) form.append("image", image);
  const { data } = await api.put<ProductDTO>(`${PRODUCTS_BASE}/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
export async function deleteProduct(id: number) {
  await api.delete(`${PRODUCTS_BASE}/${id}`);
}

// ---------- Product components (ingredients) ----------
export type ProductComponentDTO = {
  id: number;
  productId?: number | null;
  productName?: string | null;
  sku?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  unitAbbr?: string | null;
  measurement: string;
  unitCost: string;
  lineCost: string;
};
export async function componentsOfProduct(id: number) {
  const { data } = await api.get<ProductComponentDTO[]>(componentsPath(id));
  return data;
}

// ---------- Stock ----------
export type StockItemDTO = {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  unitId?: number | null;
  unitName?: string | null;
  unitAbbr?: string | null;
  quantity: string | number;
  lowStock?: number | null;
};
export async function fetchStock(q?: string) {
  const { data } = await api.get<StockItemDTO[]>(STOCK_BASE, { params: { q } });
  return data;
}

// ---------- Stock receipts ----------
export type StockReceiptDTO = {
  id: number;
  label: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
  fileUrl: string;
  createdAt: string;
};
export async function uploadStockReceipt(label: string, file: File, date?: string) {
  const form = new FormData();
  form.append("label", label);
  form.append("file", file);
  if (date) form.append("date", date); // Include date if provided
  const { data } = await api.post<StockReceiptDTO>(RECEIPTS_BASE, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
export async function searchReceipts(q: string) {
  const { data } = await api.get<StockReceiptDTO[]>(RECEIPTS_BASE, { params: { q } });
  return data;
}

// ---------- Restock (returns movement for UI update) ----------
export type RestockResponse = {
  productId: number;
  quantity: string | number;   // new total quantity
  movementId?: number;
};
export async function restockProduct(
  productId: number,
  delta: number,
  receiptId?: number,
  note?: string
) {
  const { data } = await api.post<RestockResponse>(restockPath(productId), {
    quantity: delta,
    receiptId: receiptId ?? null,
    note: note ?? null,
  });
  return data;
}