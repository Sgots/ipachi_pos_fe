// src/api/inventory.ts
import { api } from "./client";
import {
  endpoints,
  type CategoryDTO, type CategoryCreate, type CategoryUpdate,
  type MeasurementDTO, type MeasurementCreate, type MeasurementUpdate,
  type ProductDTO, type ProductCreate, type ProductUpdate, type ProductSaleMode
} from "./endpoints";

// ---------- Endpoint bases ----------
const PRODUCTS_BASE = endpoints.inventory?.products ?? "/api/inventory/products";
const MEAS_BASE      = endpoints.inventory?.measurements ?? "/api/inventory/measurements";
const CATS_BASE      = endpoints.inventory?.categories ?? "/api/inventory/categories";
const RECEIPTS_BASE  = endpoints.inventory?.receipts ?? "/api/inventory/receipts";
const STOCK_BASE     = endpoints.inventory?.stock ?? "/api/inventory/stock";
const RESTOCK_HISTORY_BASE = endpoints.inventory?.restockHistory ?? "/api/inventory/restock-history";

// tiny helper
export const qrDownloadUrl = (id: number) => `${PRODUCTS_BASE}/${id}/qr`;
export type AdjustQuantityResponse = RestockResponse;
const componentsPath = (id: number) =>
  endpoints.inventory?.components?.(id) ?? `${PRODUCTS_BASE}/${id}/components`;

const restockPath = (id: number) =>
  endpoints.inventory?.restock?.(id) ?? `${PRODUCTS_BASE}/${id}/restock`;

// ---------- Restock History (NEW) ----------
export interface ReceiptSummaryRow {
  receiptId: number;
  receiptAt: string;          // ISO datetime
  label: string;
  uploadedBy: string;
  hasFile: boolean;
  fileUrl: string | null;

  openingValue: number;       // using selling price w/out VAT
  newValue: number;
  closingValue: number;
}

export interface ReceiptItemRow {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  value: number;
}
// add near the other helpers
export async function fetchProductImage(id: number): Promise<Blob> {
  const { data } = await api.get(`${PRODUCTS_BASE}/${id}/image`, {
    responseType: "blob",
  });
  return data as Blob;
}
export async function setProductQuantity(
  productId: number,
  quantity: number,
  note?: string
): Promise<AdjustQuantityResponse> {
  const { data } = await api.post<AdjustQuantityResponse>(`${PRODUCTS_BASE}/${productId}/quantity`, {
    quantity,
    note: note ?? null,
  });
  return data;
}
export async function fetchRestockHistory(q?: string, from?: string, to?: string): Promise<ReceiptSummaryRow[]> {
  const { data } = await api.get<ReceiptSummaryRow[]>(RESTOCK_HISTORY_BASE, { params: { q, from, to } });
  return data.map(d => ({
    ...d,
    openingValue: Number(d.openingValue),
    newValue: Number(d.newValue),
    closingValue: Number(d.closingValue),
  }));
}

export async function fetchReceiptItems(receiptId: number): Promise<ReceiptItemRow[]> {
  const { data } = await api.get<ReceiptItemRow[]>(`${RECEIPTS_BASE}/${receiptId}/items`);
  return data.map(x => ({
    ...x,
    quantity: Number(x.quantity),
    unitPrice: Number(x.unitPrice),
    value: Number(x.value),
  }));
}

// Download QR PNG as a Blob (uses axios instance with auth headers)
export async function fetchQrPng(id: number): Promise<Blob> {
  const { data } = await api.get(`${PRODUCTS_BASE}/${id}/qr`, {
    responseType: "blob",
  });
  return data as Blob;
}

// ---------- Receipt file (open with auth) ----------
export async function fetchReceiptFile(receiptId: number): Promise<Blob> {
  const { data } = await api.get(`${RECEIPTS_BASE}/${receiptId}/file`, {
    responseType: "blob",
  });
  return data as Blob;
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
  unitCost: string | number;
  lineCost: string | number;
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
