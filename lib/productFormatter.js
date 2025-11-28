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
  const currency =
    firstVariant?.currency_code ||
    product.priceRange?.min?.currencyCode ||
    product.priceRange?.max?.currencyCode ||
    "USD";
  const priceNumbers =
    product.variants?.map((variant) => Number(variant.price)).filter((value) => Number.isFinite(value)) || [];
  const minPrice = priceNumbers.length
    ? Math.min(...priceNumbers)
    : Number(firstVariant?.price || product.priceRange?.min?.amount) || null;
  const maxPrice = priceNumbers.length
    ? Math.max(...priceNumbers)
    : Number(firstVariant?.price || product.priceRange?.max?.amount) || null;

  const priceText =
    minPrice !== null
      ? maxPrice && maxPrice !== minPrice
        ? `${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}`
        : formatPrice(minPrice, currency)
      : firstVariant?.price
      ? formatPrice(firstVariant.price, currency)
      : "";

  return {
    id: product.id ? String(product.id) : undefined,
    title: product.title || "Shopify product",
    price: priceText,
    compareAtPrice:
      firstVariant?.compare_at_price && Number(firstVariant.compare_at_price)
        ? formatPrice(firstVariant.compare_at_price, currency)
        : "",
    rating: null,
    img: product.image?.src || product.images?.[0]?.src || FALLBACK_PRODUCT_IMAGE,
    handle: product.handle || "",
  };
};

