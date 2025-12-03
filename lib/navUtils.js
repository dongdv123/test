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
      };
    })
    .filter(Boolean);
};

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
    return menuItems;
  }
  
  const collectionNavItems = mapCollectionsToNav(collections);
  if (collectionNavItems.length > 0) {
    return collectionNavItems;
  }
  
  return baseNavLinks;
};

