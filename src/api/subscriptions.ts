import client from "./client";

export type EffectivePlan = {
    businessId: number;
    source: "TRIAL" | "SUBSCRIPTION" | "NONE";
    tier: "BRONZE"|"SILVER"|"GOLD"|"PLATINUM";
    usersAllowed: number;
    qrCodeLimit?: number | null;
    trialEndsAt?: string | null;
    subscriptionExpiresAt?: string | null;
};

export const getEffectivePlan = (businessId: number|string) =>
    client.get<EffectivePlan>(`/api/subscriptions/business/${businessId}/effective-plan`);

export const startTrial = (businessId: number|string, activatedByUserId?: number|string) =>
    client.post(`/api/subscriptions/trial/start`, { businessId, activatedByUserId });

export const activateCode = (businessId: number|string, code: string) =>
    client.post(`/api/subscriptions/activate`, { businessId, code });
