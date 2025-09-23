// src/api/role.ts
import { api } from "./client";

/** Keep these keys in sync with the backend enum */
export type ModuleKey =
  | "CASH_TILL"
  | "INVENTORY"
  | "SUPPLIERS"
  | "DISCOUNTS"
  | "TRANSACTIONS"
  | "REPORTS";

export type ModulePermission = {
  module: ModuleKey;
  create: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
};

export type RoleDto = {
  id: number;
  name: string;
  permissions: ModulePermission[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRoleRequest = {
  name: string;
  permissions: ModulePermission[];
};

/** Robust unwrapping for AxiosResponse | {data} | {data:{data}} | bare object */
function unwrap<T = any>(val: any): T {
  if (val && typeof val === "object") {
    if (val.data?.data) return val.data.data as T;
    if (val.data) return val.data as T;
  }
  return val as T;
}

/** GET /api/roles/:id → RoleDto */
export async function getRole(id: number): Promise<RoleDto> {
  const res = await api.get(`/api/roles/${id}`);
  const obj = unwrap<RoleDto>(res);
  if (!obj || typeof obj !== "object" || !("id" in obj)) {
    // If your backend returns { code, message, data }, try one more unwrap
    const fallback = unwrap<RoleDto>((res as any)?.data);
    if (!fallback || typeof fallback !== "object" || !("id" in fallback)) {
      console.error("[role.getRole] Unrecognized payload:", res);
      throw new Error("Failed to load role (bad payload)");
    }
    return fallback;
  }
  return obj;
}

/** POST /api/roles */
export async function createRole(body: CreateRoleRequest): Promise<RoleDto> {
  const res = await api.post(`/api/roles`, body);
  const obj = unwrap<RoleDto>(res);
  if (!obj || typeof obj !== "object" || !("id" in obj)) {
    console.error("[role.createRole] Unrecognized payload:", res);
    throw new Error("Failed to create role (bad payload)");
  }
  return obj;
}

/** PUT /api/roles/:id */
export async function updateRole(id: number, body: CreateRoleRequest): Promise<RoleDto> {
  const res = await api.put(`/api/roles/${id}`, body);
  const obj = unwrap<RoleDto>(res);
  if (!obj || typeof obj !== "object" || !("id" in obj)) {
    console.error("[role.updateRole] Unrecognized payload:", res);
    throw new Error("Failed to update role (bad payload)");
  }
  return obj;
}
