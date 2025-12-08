// Default to the stable 2023-10 version; can be overridden via env
const DEFAULT_API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2023-10";
const ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2023-10";

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

const NEW_PRODUCTS_QUERY = `
  query NewProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
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

const requestShopifyStorefront = async (query, variables = {}, options = {}) => {
  const { useCache = true, cacheTTL = 300 } = options;
  
  // Try cache first if enabled
  if (useCache && typeof window === 'undefined') {
    try {
      const { withCache, CACHE_TTL } = await import('./cache');
      return await withCache(
        async () => {
          return await requestShopifyStorefrontDirect(query, variables);
        },
        {
          query,
          variables,
          ttl: cacheTTL,
        }
      );
    } catch (error) {
      // Fallback to direct request if cache fails
      console.warn('[Shopify] Cache error, using direct request:', error.message);
    }
  }
  
  return await requestShopifyStorefrontDirect(query, variables);
};

const requestShopifyStorefrontDirect = async (query, variables = {}) => {
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
      // Remove no-store to allow Next.js caching
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Shopify API returned non-JSON response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url,
        preview: text.substring(0, 200),
      });
      return null;
    }

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

export async function fetchShopifyProducts(limit = 50, options = {}) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(PRODUCTS_QUERY, { first }, {
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 300, // 5 minutes default
  });

  if (!data) return [];

  const edges = data.products?.edges ?? [];
  return edges.map(({ node }) => mapProductNode(node)).filter(Boolean);
}

export async function fetchNewProducts(limit = 20, options = {}) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(NEW_PRODUCTS_QUERY, { first }, {
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 300, // 5 minutes default
  });

  if (!data) return [];

  const edges = data.products?.edges ?? [];
  return edges.map(({ node }) => mapProductNode(node)).filter(Boolean);
}

export async function fetchShopifyCollections(limit = 12, options = {}) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(COLLECTIONS_QUERY, { first }, {
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 1800, // 30 minutes - collections change less frequently
  });

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

/**
 * Fetch menu from Shopify Admin API by handle
 * @param {string} handle - Menu handle (e.g., 'main-menu')
 * @returns {Promise<Object|null>} Menu object or null
 */
async function fetchShopifyMenuByHandleAdmin(handle) {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const domain = sanitizeDomain(rawDomain);
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    console.log("[Shopify] Admin API credentials not available for menu query");
    return null;
  }

  const url = `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

  // Query all menus and filter by handle
  const MENUS_QUERY = `
    query MenusQuery {
      menus(first: 50) {
        edges {
          node {
            id
            title
            handle
            items {
              id
              title
              url
              type
              items {
                id
                title
                url
                type
                items {
                  id
                  title
                  url
                  type
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: MENUS_QUERY,
      }),
      cache: "no-store",
    });

    const payload = await response.json();

    if (!response.ok || payload.errors) {
      console.error("[Shopify] Admin API MenusQuery error:", payload.errors);
      return null;
    }

    const menus = payload.data?.menus?.edges || [];
    const menu = menus.find((edge) => edge.node.handle === handle)?.node || null;
    
    if (menu) {
      console.log("[Shopify] ✅ Menu found via Admin API:", menu.title);
      return menu;
    }

    return null;
  } catch (error) {
    console.error("[Shopify] Admin API MenusQuery error:", error);
    return null;
  }
}

/**
 * Convert Shopify menu items to navItems format
 * @param {Array} items - Menu items array
 * @returns {Array} NavItems array
 */
function convertMenuItemsToNavItems(items = []) {
  return items
    .map((item) => {
      if (!item || !item.title) return null;

      // Extract URL path from full URL - remove query params (filter tags)
      // Filter tags are only used for menu organization, not in href
      // Also remove invalid path segments like /see-all from collection URLs
      let href = null;
      if (item.url) {
        let pathname = null;
        
        // Try to parse as absolute URL first
        try {
          const url = new URL(item.url);
          pathname = url.pathname;
        } catch {
          // If parsing fails, treat as relative URL
          // Remove query params and hash first
          pathname = item.url.split('?')[0].split('#')[0];
        }
        
        // Normalize collection URLs: remove invalid segments like /see-all
        // Collection URLs should only be /collections/{handle}
        if (pathname && pathname.startsWith('/collections/')) {
          const parts = pathname.split('/').filter(Boolean);
          if (parts.length >= 2 && parts[0] === 'collections' && parts[1]) {
            // Only keep /collections/{handle}, remove anything after
            // Ensure handle is not empty
            pathname = `/${parts[0]}/${parts[1]}`;
          } else {
            // Invalid collection URL, set to null
            pathname = null;
          }
        }
        
        // Ensure pathname starts with / and is valid
        if (pathname && pathname.trim()) {
          href = pathname.startsWith("/") ? pathname : `/${pathname}`;
        }
      }

      const navItem = {
        id: item.id || item.title.toLowerCase().replace(/\s+/g, "-"),
        title: item.title.toLowerCase(),
        href: href,
        url: item.url || null, // Keep original URL for filter tag extraction
      };

      // Add nested items if available
      if (item.items && item.items.length > 0) {
        navItem.items = convertMenuItemsToNavItems(item.items);
      }

      return navItem;
    })
    .filter(Boolean);
}

/**
 * Fetch Shopify menu and convert to navItems format
 * @param {string} handle - Menu handle (default: 'main-menu')
 * @returns {Promise<Array>} NavItems array
 */
export async function fetchShopifyMenuAsNavItems(handle = "main-menu", options = {}) {
  // Menu changes rarely, so use longer cache TTL
  const cacheTTL = options.cacheTTL || 1800; // 30 minutes default
  
  if (typeof window === 'undefined' && options.useCache !== false) {
    try {
      const { withCache } = await import('./cache');
      return await withCache(
        async () => {
          const menu = await fetchShopifyMenuByHandleAdmin(handle);
          
          if (!menu || !menu.items || menu.items.length === 0) {
            console.log("[Shopify] No menu items found for handle:", handle);
            return [];
          }

          return convertMenuItemsToNavItems(menu.items);
        },
        {
          key: `menu:${handle}`,
          ttl: cacheTTL,
        }
      );
    } catch (error) {
      console.warn('[Shopify] Menu cache error, using direct fetch:', error.message);
    }
  }
  
  // Direct fetch (no cache or client-side)
  const menu = await fetchShopifyMenuByHandleAdmin(handle);
  
  if (!menu || !menu.items || menu.items.length === 0) {
    console.log("[Shopify] No menu items found for handle:", handle);
    return [];
  }

  return convertMenuItemsToNavItems(menu.items);
}

export async function fetchCollectionByHandle(handle, productsLimit = 24, options = {}) {
  if (!handle) return null;
  const first = Math.max(1, Math.min(productsLimit, 50));
  const data = await requestShopifyStorefront(COLLECTION_BY_HANDLE_QUERY, { handle, first }, {
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 300, // 5 minutes default
  });

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
            products(first: 12) {
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

export async function fetchProductByHandle(handle, options = {}) {
  if (!handle) return null;
  const data = await requestShopifyStorefront(PRODUCT_BY_HANDLE_QUERY, { handle }, {
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 300, // 5 minutes default
  });
  if (!data || !data.productByHandle) return null;
  const product = mapProductNode(data.productByHandle);
  
  // Fetch related products from the first collection (for "Customers also bought")
  const relatedEdges =
    data.productByHandle.collections?.edges?.[0]?.node?.products?.edges ?? [];
  let relatedProducts = relatedEdges
    .map(({ node }) => mapProductNode(node))
    .filter((item) => item && item.id !== product.id);

  // If no related products from collection, try to fetch from all products as fallback
  if (relatedProducts.length === 0) {
    console.log(`[Product ${handle}] No related products from collection, fetching from all products as fallback`);
    try {
      const allProducts = await fetchShopifyProducts(20);
      relatedProducts = allProducts
        .filter((item) => item && item.id !== product.id && item.handle !== handle)
        .slice(0, 10);
    } catch (error) {
      console.error(`[Product ${handle}] Failed to fetch fallback related products:`, error);
    }
  } else {
    // Limit to 10 products
    relatedProducts = relatedProducts.slice(0, 10);
  }

  // Fetch products by same vendor (for "Also by [Vendor]")
  let vendorProducts = [];
  if (product.vendor) {
    try {
      const allProducts = await fetchShopifyProducts(50);
      vendorProducts = allProducts
        .filter((item) => 
          item && 
          item.vendor === product.vendor && 
          item.id !== product.id && 
          item.handle !== handle
        )
        .slice(0, 10);
      console.log(`[Product ${handle}] Found ${vendorProducts.length} products by vendor ${product.vendor}`);
    } catch (error) {
      console.error(`[Product ${handle}] Failed to fetch vendor products:`, error);
    }
  }

  console.log(`[Product ${handle}] Found ${relatedProducts.length} related products`);

  return {
    ...product,
    relatedProducts: relatedProducts || [],
    vendorProducts: vendorProducts || [],
  };
}

export async function fetchAllProductTags(limit = 250, options = {}) {
  const first = Math.max(1, Math.min(limit, 250));
  const data = await requestShopifyStorefront(PRODUCTS_QUERY, { first }, {
    useCache: options.useCache !== false,
    cacheTTL: options.cacheTTL || 1800, // 30 minutes - tags change less frequently
  });

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


