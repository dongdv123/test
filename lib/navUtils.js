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

