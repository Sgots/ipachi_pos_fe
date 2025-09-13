export interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  tags?: string[];
  leadTimeDays?: number;     // estimated lead time
  status?: "active" | "inactive";
  lastOrderAt?: string;      // ISO
  balance?: number;          // money owed or credit
}
