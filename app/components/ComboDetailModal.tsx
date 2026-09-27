"use client";

import ProductDetailModal, { DetailCart } from "./ProductDetailModal";

export interface ComboClothingItem {
  id?: string;
  sku?: string;
  type: string;          // "Sơ mi", "Quần rộng", "Blazer", "Half-Zip"...
  name: string;          // Garment name WITHOUT brand
  price: number;
  priceFormatted: string;
  note?: string;         // e.g. "Bản tiêu chuẩn" or alternatives
  variants?: { id: string; size: string; color: string; stock: number }[];
}

export interface ComboOption {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  includedSkus?: string[];
}

export interface ComboLookData {
  id: string;
  title: string;
  styleName: string;
  estimatedPrice: string;
  totalPrice?: number;
  image: string;
  description: string;
  sizes?: string[];
  options?: ComboOption[];
  items: ComboClothingItem[];
}

interface ComboDetailModalProps {
  combo: ComboLookData | null;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (cart: DetailCart, checkout: boolean) => void;
  onTryOn?: (title: string) => void;
}

export default function ComboDetailModal({ combo, isOpen, ...props }: ComboDetailModalProps) {
  if (!isOpen || !combo) return null;
  return <ProductDetailModal productId={combo.id} combo={combo} {...props} />;
}
