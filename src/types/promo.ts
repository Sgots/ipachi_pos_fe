export type DiscountType = "percentage" | "fixed" | "bogo";

export interface PromoCampaign {
  id: number;
  name: string;
  code?: string;                 // e.g. “WINTER10”
  type: DiscountType;            // percentage/fixed/BOGO
  value?: number;                // 10 (% or currency)
  buyQty?: number;               // for BOGO (e.g., buy 2)
  getQty?: number;               // for BOGO (e.g., get 1)
  startAt: string;               // ISO
  endAt: string;                 // ISO
  channels: ("in-store" | "online" | "app")[];
  audienceTags: string[];        // “VIP”, “New”, “Loyalty”
  usageLimit?: number;           // total redemptions
  stackable?: boolean;           // can stack with other promos
  status: "draft" | "scheduled" | "active" | "expired";
  banner?: {
    headline?: string;
    subcopy?: string;
    bg?: string;                 // e.g. #0EA5E9
    fg?: string;                 // text color
    cta?: string;                // CTA button text
  };
  abTest?: {
    enabled: boolean;
    split: number;               // % traffic to variant B
    variantB?: Partial<PromoCampaign["banner"]>;
  };
  metrics?: {
    impressions?: number;
    redemptions?: number;
    lift?: number;               // % lift estimate
    revenue?: number;            // attributed revenue
  };
}
