const DEFAULT_API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2023-10";

const sanitizeDomain = (value = "") =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  vendor
  productType
  tags
  featuredImage {
    url
    altText
  }
  images(first: 8) {
    edges {
      node {
        id
        url
        altText
      }
    }
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
    }
  }
  options(first: 10) {
    name
    values
  }
  variants(first: 20) {
    edges {
      node {
        id
        title
        availableForSale
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        image {
          url
          altText
        }
        selectedOptions {
          name
          value
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
      price: variantNode.price?.amount ?? null,
      currency_code: variantNode.price?.currencyCode ?? null,
      compare_at_price: variantNode.compareAtPrice?.amount ?? null,
      compare_at_currency: variantNode.compareAtPrice?.currencyCode ?? null,
      available: variantNode.availableForSale,
      image: variantNode.image ? { src: variantNode.image.url, altText: variantNode.image.altText ?? null } : null,
      selectedOptions: variantNode.selectedOptions || [],
    })) ?? [];

  return {
    ...node,
    handle: node.handle,
    vendor: node.vendor,
    productType: node.productType,
    tags: node.tags || [],
    descriptionHtml: node.descriptionHtml,
    image: node.featuredImage ? { src: node.featuredImage.url, altText: node.featuredImage.altText ?? null } : null,
    images,
    variants,
    options: node.options || [],
    priceRange: {
      min: {
        amount: node.priceRange?.minVariantPrice?.amount ?? null,
        currencyCode: node.priceRange?.minVariantPrice?.currencyCode ?? null,
      },
      max: {
        amount: node.priceRange?.maxVariantPrice?.amount ?? null,
        currencyCode: node.priceRange?.maxVariantPrice?.currencyCode ?? null,
      },
    },
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

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      ${PRODUCT_FIELDS}
      collections(first: 1) {
        edges {
          node {
            handle
            title
            products(first: 8) {
              edges {
                node {
                  ${PRODUCT_FIELDS}
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchProductByHandle(handle) {
  if (!handle) return null;
  const data = await requestShopifyStorefront(PRODUCT_BY_HANDLE_QUERY, { handle });
  if (!data || !data.productByHandle) return null;
  const product = mapProductNode(data.productByHandle);
  const relatedEdges =
    data.productByHandle.collections?.edges?.[0]?.node?.products?.edges ?? [];
  const relatedProducts = relatedEdges
    .map(({ node }) => mapProductNode(node))
    .filter((item) => item && item.id !== product.id);

  return {
    ...product,
    relatedProducts,
  };
}

export async function fetchAllProductTags(limit = 250) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(PRODUCTS_QUERY, { first });

  if (!data) return [];

  const edges = data.products?.edges ?? [];
  const allTags = new Set();

  edges.forEach(({ node }) => {
    if (node.tags && Array.isArray(node.tags)) {
      node.tags.forEach((tag) => {
        if (tag && typeof tag === "string") {
          // Normalize tag: lowercase, trim, replace spaces with hyphens
          const normalized = tag.trim().toLowerCase().replace(/\s+/g, "-");
          if (normalized) {
            allTags.add(normalized);
          }
        }
      });
    }
  });

  // Convert to array and sort alphabetically
  return Array.from(allTags).sort();
}

// Shopify Cart API
const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        lines(first: 100) {
          edges {
            node {
              id
              quantity
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

const CART_LINES_UPDATE_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
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

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
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

const CART_QUERY = `
  query cart($id: ID!) {
    cart(id: $id) {
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
  }
`;

// Client-side request function (for browser)
const requestShopifyStorefrontClient = async (query, variables = {}) => {
  const rawDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
  const domain = sanitizeDomain(rawDomain);
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN || process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!domain || !token) {
    console.error("Shopify Storefront credentials are missing. Set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN and NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN");
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
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error("Shopify Storefront API HTTP error:", response.status, response.statusText);
      console.error("Response:", payload);
      return null;
    }

    if (payload.errors) {
      console.error("Shopify Storefront API GraphQL errors:", payload.errors);
      return null;
    }

    return payload.data;
  } catch (error) {
    console.error("Unable to reach Shopify Storefront API:", error);
    return null;
  }
};

export async function createCart() {
  const data = await requestShopifyStorefrontClient(CART_CREATE_MUTATION, {
    input: {},
  });

  if (data?.cartCreate?.userErrors?.length > 0) {
    console.error("Shopify cart create errors:", data.cartCreate.userErrors);
    return null;
  }

  if (!data?.cartCreate?.cart) {
    console.error("No cart returned from createCart");
    return null;
  }

  return data.cartCreate.cart;
}

export async function addToCart(cartId, variantId, quantity = 1) {
  // Ensure variantId is in correct format (gid://shopify/ProductVariant/...)
  let formattedVariantId = variantId;
  if (variantId && !variantId.startsWith("gid://")) {
    // If it's just a number or base64 ID, try to construct the GID
    // Shopify variant IDs are typically in format: gid://shopify/ProductVariant/{id}
    // But the ID from API might be base64 encoded
    formattedVariantId = variantId;
  }

  const data = await requestShopifyStorefrontClient(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [
      {
        merchandiseId: formattedVariantId,
        quantity,
      },
    ],
  });

  if (data?.cartLinesAdd?.userErrors?.length > 0) {
    console.error("Shopify cart errors:", data.cartLinesAdd.userErrors);
    return null;
  }

  if (!data?.cartLinesAdd?.cart) {
    console.error("No cart returned from Shopify");
    return null;
  }

  return data.cartLinesAdd.cart;
}

export async function updateCartLine(cartId, lineId, quantity) {
  const data = await requestShopifyStorefrontClient(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [
      {
        id: lineId,
        quantity,
      },
    ],
  });

  if (data?.cartLinesUpdate?.userErrors?.length > 0) {
    console.error("Shopify cart update errors:", data.cartLinesUpdate.userErrors);
    return null;
  }

  if (!data?.cartLinesUpdate?.cart) {
    console.error("No cart returned from updateCartLine");
    return null;
  }

  return data.cartLinesUpdate.cart;
}

export async function removeCartLine(cartId, lineId) {
  const data = await requestShopifyStorefrontClient(CART_LINES_REMOVE_MUTATION, {
    cartId,
    lineIds: [lineId],
  });

  if (data?.cartLinesRemove?.userErrors?.length > 0) {
    console.error("Shopify cart remove errors:", data.cartLinesRemove.userErrors);
    return null;
  }

  if (!data?.cartLinesRemove?.cart) {
    console.error("No cart returned from removeCartLine");
    return null;
  }

  return data.cartLinesRemove.cart;
}

export async function getCart(cartId) {
  const data = await requestShopifyStorefrontClient(CART_QUERY, {
    id: cartId,
  });

  return data?.cart || null;
}

