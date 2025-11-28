const DEFAULT_API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2023-10";

const sanitizeDomain = (value = "") =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

const PRODUCT_FIELDS = `
  id
  title
  description
  featuredImage {
    url
    altText
  }
  images(first: 4) {
    edges {
      node {
        id
        url
        altText
      }
    }
  }
  variants(first: 4) {
    edges {
      node {
        id
        title
        price {
          amount
          currencyCode
        }
      }
    }
  }
`;

const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          ${PRODUCT_FIELDS}
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query Collections($first: Int!) {
    collections(first: $first, sortKey: UPDATED_AT) {
      edges {
        node {
          id
          title
          handle
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

const COLLECTION_BY_HANDLE_QUERY = `
  query CollectionByHandle($handle: String!, $first: Int!) {
    collectionByHandle(handle: $handle) {
      id
      title
      handle
      description
      image {
        url
        altText
      }
      products(first: $first) {
        edges {
          node {
            ${PRODUCT_FIELDS}
          }
        }
      }
    }
  }
`;

const requestShopifyStorefront = async (query, variables = {}) => {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const domain = sanitizeDomain(rawDomain);
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token) {
    console.warn("Shopify Storefront credentials are missing. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.");
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
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    });

    const payload = await response.json();

    if (!response.ok || payload.errors) {
      console.error("Shopify Storefront API error:", payload.errors || response.statusText);
      return null;
    }

    return payload.data;
  } catch (error) {
    console.error("Unable to reach Shopify Storefront API:", error);
    return null;
  }
};

const mapProductNode = (node) => {
  if (!node) return null;

  const images =
    node.images?.edges?.map(({ node: imageNode }) => ({
      src: imageNode.url,
      altText: imageNode.altText ?? null,
    })) ?? [];

  const variants =
    node.variants?.edges?.map(({ node: variantNode }) => ({
      id: variantNode.id,
      title: variantNode.title,
      price: variantNode.price?.amount,
      currency_code: variantNode.price?.currencyCode,
    })) ?? [];

  return {
    ...node,
    image: node.featuredImage ? { src: node.featuredImage.url, altText: node.featuredImage.altText ?? null } : null,
    images,
    variants,
  };
};

export async function fetchShopifyProducts(limit = 50) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(PRODUCTS_QUERY, { first });

  if (!data) return [];

  const edges = data.products?.edges ?? [];
  return edges.map(({ node }) => mapProductNode(node)).filter(Boolean);
}

export async function fetchShopifyCollections(limit = 12) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(COLLECTIONS_QUERY, { first });

  if (!data) return [];

  const edges = data.collections?.edges ?? [];
  return edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    image: node.image ? { src: node.image.url, altText: node.image.altText ?? null } : null,
  }));
}

export async function fetchCollectionByHandle(handle, productsLimit = 24) {
  if (!handle) return null;
  const first = Math.max(1, Math.min(productsLimit, 50));
  const data = await requestShopifyStorefront(COLLECTION_BY_HANDLE_QUERY, { handle, first });

  if (!data || !data.collectionByHandle) return null;

  const collection = data.collectionByHandle;
  const products =
    collection.products?.edges?.map(({ node }) => mapProductNode(node)).filter(Boolean) ?? [];

  return {
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    description: collection.description,
    image: collection.image ? { src: collection.image.url, altText: collection.image.altText ?? null } : null,
    products,
  };
}

