// src/components/ProductCard.tsx
import React, { useEffect, useState } from "react";
import { Card, CardActionArea, CardContent, Typography, Chip, Box } from "@mui/material";
import client from "../api/client";
import type { AxiosResponse } from "axios";

interface Props {
  sku: string;
  name: string;
  price: number;
  stock: number;
  lowStock?: number;
  img?: string;
  onAdd: () => void;
  userIdHeader?: string;
  authToken?: string;
  disabled?: boolean;               // new
  animateDelta?: number;            // new (positive = incoming stock, negative = sold)
  onQuantityChange?: (delta: number) => void; // new
}

const ProductCard: React.FC<Props> = ({
  sku,
  name,
  price,
  stock,
  lowStock = 0,
  img,
  onAdd,
  userIdHeader,
  authToken,
  disabled = false,
  animateDelta = 0,
  onQuantityChange,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      if (!img) {
        setImageSrc(null);
        return;
      }
      try {
        const res: AxiosResponse<Blob> = await client.get(img, {
          responseType: "blob",
          headers: {
            ...(userIdHeader ? { "X-User-Id": userIdHeader } : {}),
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });
        const blob = res.data;
        objectUrl = URL.createObjectURL(blob);
        if (mounted) setImageSrc(objectUrl);
      } catch (err) {
        if (mounted) setImageSrc(null);
      }
    };

    loadImage();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [img, userIdHeader, authToken]);

  const stockState = stock <= 0 ? "none" : stock <= (lowStock ?? 0) ? "low" : "good";
  const chipColor = stockState === "none" ? "error" : stockState === "low" ? "warning" : "success";
  const chipLabel = stockState === "none" ? `Out` : stockState === "low" ? `Low: ${stock}` : `Available: ${stock}`;

  const clickable = stock > 0 && !disabled;

  // If animateDelta is provided, call onQuantityChange after first render to let parent know (optional).
  useEffect(() => {
    if (animateDelta && onQuantityChange) {
      // give parent a chance to respond
      onQuantityChange(animateDelta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateDelta]);

  const CardInner = (
    <>
      <Box
        sx={{
          height: 112,
          borderRadius: 1,
          bgcolor: "grey.100",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageSrc ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={imageSrc} alt={name} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            No Image
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          bgcolor: "primary.main",
          color: "common.white",
          borderRadius: "999px",
          px: 2,
          py: 0.5,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: 1,
          pointerEvents: "none",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1 }}>
          P{price.toFixed(2)}
        </Typography>
      </Box>

      <CardContent sx={{ px: 0, py: 1, width: "100%" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.1, mb: 0.5 }}>
          {name}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {sku}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
          <Chip size="small" label={chipLabel} variant="outlined" color={chipColor as any} sx={{ fontWeight: 600 }} />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            &nbsp;
          </Typography>
        </Box>
      </CardContent>
    </>
  );

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        position: "relative",
        height: "100%",
        opacity: clickable ? 1 : 0.6,
        pointerEvents: clickable ? "auto" : "none",
        border: stockState === "none" ? "1px solid rgba(220,0,0,0.12)" : undefined,
      }}
    >
      {clickable ? (
        <CardActionArea
          onClick={onAdd}
          sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", height: "100%", p: 2 }}
        >
          {CardInner}
        </CardActionArea>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", height: "100%", p: 2 }}>
          {CardInner}
        </Box>
      )}
    </Card>
  );
};

export default ProductCard;
