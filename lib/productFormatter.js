export const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=640&q=80";

export const formatPrice = (value, currency = "USD") => {
  if (!value) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    const number = Number(value);
    if (Number.isNaN(number)) return "";
    return `$${number.toFixed(2)}`;
  }
};

export const normalizeProduct = (product) => {
  if (!product) return null;

  const firstVariant = product.variants?.[0];
  return {
    id: product.id ? String(product.id) : undefined,
    title: product.title || "Shopify product",
    price: firstVariant?.price ? formatPrice(firstVariant.price, firstVariant?.currency_code || "USD") : "",
    rating: null,
    img: product.image?.src || product.images?.[0]?.src || FALLBACK_PRODUCT_IMAGE,
  };
};

