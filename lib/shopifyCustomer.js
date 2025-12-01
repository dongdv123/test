const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2023-10";

export const shopifyCustomerRequest = async (query, variables = {}) => {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error("Missing Shopify credentials. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.");
  }

  const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();

  if (!response.ok || payload.errors) {
    const message = payload?.errors?.[0]?.message || response.statusText;
    throw new Error(message);
  }

  return payload.data;
};

