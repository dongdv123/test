import { useMemo } from "react";

const PLACEHOLDER_IMAGE = "/images/product-placeholder.svg";

const badgePresets = [
  {
    top: "Customer favorite",
    pill: "experience",
    rating: { stars: "★★★★★", count: "34" },
  },
  {
    top: "Trending now",
    pill: "experience",
    rating: { stars: "★★★★★", count: "23" },
  },
  {
    top: "Limited-time deal",
    pill: "experience",
    rating: { stars: "★★★★★", count: "14" },
  },
];

export const useProductCard = (item, index = 0) => {
  return useMemo(() => {
    const preset = badgePresets[index % badgePresets.length];
    const imgSrc = item.img || item.image?.src || PLACEHOLDER_IMAGE;

    return {
      id: item.id || item.handle || item.title,
      title: item.title || "Shopify product",
      price: item.price || "",
      img: imgSrc,
      handle: item.handle || "",
      badgeTop: item.badges?.top || preset.top,
      badgePill: item.badges?.pill || preset.pill,
      rating: preset.rating,
      href: item.handle ? `/products/${item.handle}` : undefined,
    };
  }, [item, index]);
};

