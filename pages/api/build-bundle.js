import { createCart } from "../../lib/shopify";
import { checkRateLimit, getClientIp } from "../../lib/rateLimitRedis";
import crypto from "crypto";

const DEFAULT_API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2023-10";

const sanitizeDomain = (value = "") =>
  value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");

const requestShopifyStorefrontClient = async (query, variables = {}) => {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const domain = sanitizeDomain(rawDomain);
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token) {
    console.error("Shopify Storefront credentials are missing");
    return null;
  }

  const url = `https://${domain}/api/${DEFAULT_API_VERSION}/graphql.json`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Storefront-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error("Shopify API HTTP error:", response.status, response.statusText);
      return null;
    }

    if (payload.errors) {
      console.error("Shopify API GraphQL errors:", payload.errors);
      return null;
    }

    return payload.data;
  } catch (error) {
    console.error("Unable to reach Shopify API:", error);
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  
  // Optional API key check - if provided, validate it
  // If not provided, rely on rate limiting and origin check for security
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.BUNDLE_API_KEY;
  
  if (expectedKey && apiKey && apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Origin check - optional but recommended
  const allowedOrigin = process.env.BUNDLE_ALLOWED_ORIGIN;
  if (allowedOrigin && req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Rate limiting - primary security measure
  const rateOk = await checkRateLimit({ key: `bundle:${ip}`, windowMs: 60_000, max: 30 });
  if (!rateOk) {
    return res.status(429).json({ error: "Too many requests" });
  }

  try {
    const { cartId, variantIds, bundleName } = req.body || {};

    if (!Array.isArray(variantIds) || variantIds.length < 2) {
      return res.status(400).json({ error: "Bundle must contain at least 2 products" });
    }

    if (variantIds.length > 3) {
      return res.status(400).json({ error: "Bundle cannot contain more than 3 products" });
    }

    const sanitizedVariantIds = variantIds
      .filter((v) => typeof v === "string" && v.startsWith("gid://shopify/ProductVariant/"))
      .slice(0, 3);

    if (sanitizedVariantIds.length !== variantIds.length) {
      return res.status(400).json({ error: "Invalid variant IDs" });
    }

    const safeBundleName =
      typeof bundleName === "string" && bundleName.trim().length > 0 && bundleName.trim().length <= 80
        ? bundleName.trim()
        : undefined;

    let currentCartId = cartId;

    // Create cart if doesn't exist
    if (!currentCartId) {
      const newCart = await createCart();
      if (!newCart?.id) {
        return res.status(500).json({ error: "Failed to create cart" });
      }
      currentCartId = newCart.id;
      // Return new cart ID so client can save it
      // Note: Client should save this to localStorage
    }

    // Add all products to cart as bundle
    // Using attributes to mark them as part of a bundle
    const bundleId = `bundle-${crypto.randomUUID()}`;
    const lines = sanitizedVariantIds.map((variantId, index) => ({
      merchandiseId: variantId,
      quantity: 1,
      attributes: [
        {
          key: "_bundle_id",
          value: bundleId,
        },
        {
          key: "_bundle_name",
          value: safeBundleName || `Bundle ${bundleId}`,
        },
        {
          key: "_bundle_item",
          value: `${index + 1}/${variantIds.length}`,
        },
      ],
    }));

    // Add all items at once
    const updatedCart = await addMultipleToCart(currentCartId, lines);

    if (!updatedCart) {
      return res.status(500).json({ error: "Failed to add bundle to cart" });
    }

    return res.status(200).json({
      success: true,
      cart: updatedCart,
      cartId: currentCartId,
      bundleId,
    });
  } catch (error) {
    console.error("Bundle creation error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

// Helper function to add multiple items to cart
async function addMultipleToCart(cartId, lines) {
  const CART_LINES_ADD_MUTATION = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                attributes {
                  key
                  value
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      featuredImage {
                        url
                        altText
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await requestShopifyStorefrontClient(CART_LINES_ADD_MUTATION, {
    cartId,
    lines,
  });

  if (data?.cartLinesAdd?.userErrors?.length > 0) {
    console.error("Shopify cart errors:", data.cartLinesAdd.userErrors);
    return null;
  }

  return data?.cartLinesAdd?.cart || null;
}
