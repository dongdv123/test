// Lightweight product fields for homepage/collections listing
// Reduces page data size significantly
const PRODUCT_FIELDS_LIGHTWEIGHT = `
  id
  handle
  title
  vendor
  productType
  tags
  featuredImage {
    url
    altText
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
`;

const PRODUCTS_QUERY_LIGHTWEIGHT = `
  query Products($first: Int!) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          ${PRODUCT_FIELDS_LIGHTWEIGHT}
        }
      }
    }
  }
`;

const NEW_PRODUCTS_QUERY_LIGHTWEIGHT = `
  query NewProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          ${PRODUCT_FIELDS_LIGHTWEIGHT}
        }
      }
    }
  }
`;

const COLLECTION_BY_HANDLE_QUERY_LIGHTWEIGHT = `
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
            ${PRODUCT_FIELDS_LIGHTWEIGHT}
          }
        }
      }
    }
  }
`;

import { requestShopifyStorefrontDirect } from './shopify';

export async function fetchShopifyProductsLightweight(first = 20) {
  try {
    const data = await requestShopifyStorefrontDirect(PRODUCTS_QUERY_LIGHTWEIGHT, { first });
    if (!data?.products?.edges) return [];
    
    return data.products.edges.map(({ node }) => ({
      id: node.id,
      handle: node.handle,
      title: node.title,
      vendor: node.vendor,
      productType: node.productType,
      tags: node.tags || [],
      image: node.featuredImage ? {
        src: node.featuredImage.url,
        altText: node.featuredImage.altText
      } : null,
      priceRange: node.priceRange ? {
        min: {
          amount: node.priceRange.minVariantPrice?.amount,
          currencyCode: node.priceRange.minVariantPrice?.currencyCode
        },
        max: {
          amount: node.priceRange.maxVariantPrice?.amount,
          currencyCode: node.priceRange.maxVariantPrice?.currencyCode
        }
      } : null
    }));
  } catch (error) {
    console.error("Failed to fetch lightweight products:", error);
    return [];
  }
}

export async function fetchNewProductsLightweight(first = 10) {
  try {
    const data = await requestShopifyStorefrontDirect(NEW_PRODUCTS_QUERY_LIGHTWEIGHT, { first });
    if (!data?.products?.edges) return [];
    
    return data.products.edges.map(({ node }) => ({
      id: node.id,
      handle: node.handle,
      title: node.title,
      vendor: node.vendor,
      productType: node.productType,
      tags: node.tags || [],
      image: node.featuredImage ? {
        src: node.featuredImage.url,
        altText: node.featuredImage.altText
      } : null,
      priceRange: node.priceRange ? {
        min: {
          amount: node.priceRange.minVariantPrice?.amount,
          currencyCode: node.priceRange.minVariantPrice?.currencyCode
        },
        max: {
          amount: node.priceRange.maxVariantPrice?.amount,
          currencyCode: node.priceRange.maxVariantPrice?.currencyCode
        }
      } : null
    }));
  } catch (error) {
    console.error("Failed to fetch lightweight new products:", error);
    return [];
  }
}

export async function fetchCollectionByHandleLightweight(handle, first = 20) {
  try {
    const data = await requestShopifyStorefrontDirect(COLLECTION_BY_HANDLE_QUERY_LIGHTWEIGHT, { handle, first });
    if (!data?.collectionByHandle) return null;
    
    const collection = data.collectionByHandle;
    return {
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      description: collection.description,
      image: collection.image ? {
        src: collection.image.url,
        altText: collection.image.altText
      } : null,
      products: collection.products?.edges?.map(({ node }) => ({
        id: node.id,
        handle: node.handle,
        title: node.title,
        vendor: node.vendor,
        productType: node.productType,
        tags: node.tags || [],
        image: node.featuredImage ? {
          src: node.featuredImage.url,
          altText: node.featuredImage.altText
        } : null,
        priceRange: node.priceRange ? {
          min: {
            amount: node.priceRange.minVariantPrice?.amount,
            currencyCode: node.priceRange.minVariantPrice?.currencyCode
          },
          max: {
            amount: node.priceRange.maxVariantPrice?.amount,
            currencyCode: node.priceRange.maxVariantPrice?.currencyCode
          }
        } : null
      })) || []
    };
  } catch (error) {
    console.error("Failed to fetch lightweight collection:", error);
    return null;
  }
}

