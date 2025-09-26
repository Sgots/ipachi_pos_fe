import { useEffect, useState } from "react";
import client from "../api/client";

/**
 * Resolve and fetch the business logo as an auth-safe blob URL.
 *
 * Priority:
 *   1) explicit logoUrl (absolute or relative)
 *   2) assetId -> /api/business-profile/logo/file/{assetId}
 *   3) hasLogo -> /api/business-profile/logo
 */
export const useBusinessLogo = (
  logoUrl?: string | null,
  hasLogo?: boolean,
  assetId?: string | null
) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const FILE_PREFIX = "/api/business-profile/logo/file/";
  const DEFAULT_ENDPOINT = "/api/business-profile/logo";

  const resolveAssetUrl = (path?: string | null) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path; // already absolute
    const axiosBase = (client as any).defaults?.baseURL ?? "";
    return axiosBase
      ? axiosBase.replace(/\/$/, "") + path
      : `${window.location.protocol}//${window.location.hostname}:8080${path}`;
  };

  const buildPath = () => {
    if (logoUrl && logoUrl.trim()) return logoUrl.trim();
    if (assetId && assetId.trim()) return `${FILE_PREFIX}${assetId.trim()}`;
    if (hasLogo) return DEFAULT_ENDPOINT;
    return null;
  };

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };

    const fetchBlob = async () => {
      cleanup();
      setBlobUrl(null);

      const path = buildPath();
      if (!path) return;

      try {
        // Add a small cache-buster so fresh uploads show immediately
        const url = new URL(resolveAssetUrl(path));
        url.searchParams.set("_", Date.now().toString());

        const resp = await client.get(url.toString(), { responseType: "blob" });
        if (!cancelled) setBlobUrl(URL.createObjectURL(resp.data as Blob));
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    };

    fetchBlob();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl, hasLogo, assetId]);

  // Prefer blob (auth-safe); if fetch failed, fall back to a resolvable URL
  const fallback = buildPath();
  return blobUrl ?? (fallback ? resolveAssetUrl(fallback) : "");
};
