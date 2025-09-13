import React from "react";
import { Card, CardActionArea, CardContent, Typography, Chip } from "@mui/material";

interface Props {
  sku: string;
  name: string;
  price: number;
  stock: number;
  img?: string;
  onAdd: () => void;
}

const ProductCard: React.FC<Props> = ({ sku, name, price, stock, img, onAdd }) => {
  return (
    <Card elevation={0} className="rounded-xl border relative">
      <CardActionArea onClick={onAdd} className="p-3">
        <div className="h-28 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={name} className="object-cover h-full w-full" />
          ) : (
            <div className="text-xs text-gray-400">No Image</div>
          )}
        </div>

        {/* Price pill */}
        <div className="absolute top-3 left-3">
          <div className="bg-emerald-900 text-white rounded-full px-3 py-1 text-sm font-semibold">
            P{price.toFixed(2)}
          </div>
        </div>

        <CardContent className="px-1 pb-2 pt-3">
          <Typography className="leading-tight font-medium">{name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {sku}
          </Typography>
          <div className="mt-1">
            <Chip
              size="small"
              label={`Available ${stock}`}
              variant="outlined"
              color={stock > 0 ? "success" : "default"}
            />
          </div>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ProductCard;
