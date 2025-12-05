export const mapCollectionsToNav = (collections = []) => {
  return collections
    .map((collection) => {
      if (!collection) return null;
      const handle = collection.handle || collection.slug;
      if (!handle) return null;

      return {
        id: collection.id ? String(collection.id) : handle,
        title: collection.title || handle,
        href: `/collections/${handle}`,
        image: collection.image || null,
      };
    })
    .filter(Boolean);
};

/**
 * Normalize href to remove query params (filter tags) and hash
 * Filter tags are only used for menu organization, not in href
 * Also remove invalid path segments like /see-all from collection URLs
 */
function normalizeHref(href) {
  if (!href || typeof href !== 'string') return null;
  
  // Remove query params and hash
  let cleanHref = href.split('?')[0].split('#')[0].trim();
  if (!cleanHref) return null;
  
  // Remove invalid segments like /see-all from collection URLs
  // Collection URLs should only be /collections/{handle}
  if (cleanHref.startsWith('/collections/')) {
    const parts = cleanHref.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'collections' && parts[1]) {
      // Only keep /collections/{handle}, remove anything after
      // Ensure handle is not empty
      cleanHref = `/${parts[0]}/${parts[1]}`;
    } else {
      // Invalid collection URL format
      return null;
    }
  }
  
  return cleanHref.startsWith("/") ? cleanHref : `/${cleanHref}`;
}

/**
 * Merge collection images into menu items if href matches a collection
 * @param {Array} items - Menu items array
 * @param {Array} collections - Collections array
 * @returns {Array} Menu items with images merged
 */
function mergeCollectionImages(items = [], collections = []) {
  if (!items || items.length === 0) return items;
  if (!collections || collections.length === 0) return items;

  // Create a map of collection handle to image
  const collectionImageMap = new Map();
  collections.forEach((collection) => {
    if (collection.handle && collection.image) {
      collectionImageMap.set(collection.handle, collection.image);
    }
  });

  return items.map((item) => {
    const newItem = { ...item };
    
    // Normalize href to remove query params (filter tags) - ensure clean URLs
    if (newItem.href) {
      newItem.href = normalizeHref(newItem.href);
    }

    // Check if href matches a collection (for parent menu items)
    // This will merge the collection image into the parent menu item
    if (newItem.href && newItem.href.startsWith('/collections/')) {
      // Extract handle from normalized href (should already be clean)
      const handle = newItem.href.replace('/collections/', '').split('/')[0].split('#')[0];
      const image = collectionImageMap.get(handle);
      if (image) {
        // Merge image into parent menu item if it doesn't already have one
        if (!newItem.image) {
          newItem.image = image;
        }
      }
    }

    // Recursively merge images for nested items
    if (item.items && item.items.length > 0) {
      newItem.items = mergeCollectionImages(item.items, collections);
    }

    return newItem;
  });
}

/**
 * Get navItems with priority: menu items > collections > baseNavLinks
 * @param {Array} menuItems - Menu items from Shopify Admin API
 * @param {Array} collections - Collections from Shopify
 * @param {Array} baseNavLinks - Fallback nav links
 * @returns {Array} NavItems array
 */
export const getNavItems = (menuItems = [], collections = [], baseNavLinks = []) => {
  // Priority: menu items > collections > baseNavLinks
  if (menuItems && menuItems.length > 0) {
    // Merge collection images into menu items
    return mergeCollectionImages(menuItems, collections);
  }
  
  const collectionNavItems = mapCollectionsToNav(collections);
  if (collectionNavItems.length > 0) {
    return collectionNavItems;
  }
  
  return baseNavLinks;
};

