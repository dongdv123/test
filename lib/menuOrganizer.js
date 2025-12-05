/**
 * Extract filter tag numbers from URL
 * Supports multiple formats:
 * - Query string: ?filter=tag:2
 * - Pathname with filter: /collections/frontpage/filter=tag:2
 * - Pathname with number: /collections/frontpage/2
 * @param {string} url - URL string
 * @returns {Array<number>} Array of tag numbers (e.g., [1, 2])
 */
export function extractFilterTagNumbers(url) {
  if (!url || typeof url !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[menuOrganizer] extractFilterTagNumbers: No URL provided');
    }
    return [];
  }
  
  try {
    const tagNumbers = [];
    
    // Method 1: Extract from query string (?filter=tag:2)
    try {
      const urlObj = new URL(url, 'http://localhost');
      const filterParam = urlObj.searchParams.get('filter') || '';
      if (filterParam) {
        const tagMatches = filterParam.match(/tag:(\d+)/g);
        if (tagMatches) {
          tagMatches.forEach(m => {
            const num = parseInt(m.replace('tag:', ''), 10);
            if (!isNaN(num) && num > 0) tagNumbers.push(num);
          });
        }
      }
    } catch {
      // Try regex for query string
      const queryMatch = url.match(/[?&]filter=([^&]+)/);
      if (queryMatch) {
        const filterParam = decodeURIComponent(queryMatch[1]);
        const tagMatches = filterParam.match(/tag:(\d+)/g);
        if (tagMatches) {
          tagMatches.forEach(m => {
            const num = parseInt(m.replace('tag:', ''), 10);
            if (!isNaN(num) && num > 0) tagNumbers.push(num);
          });
        }
      }
    }
    
    // Method 2: Extract from pathname with filter=tag:X (/collections/frontpage/filter=tag:2)
    const pathnameFilterMatch = url.match(/\/filter=tag:(\d+)/);
    if (pathnameFilterMatch) {
      const num = parseInt(pathnameFilterMatch[1], 10);
      if (!isNaN(num) && num > 0 && !tagNumbers.includes(num)) {
        tagNumbers.push(num);
      }
    }
    
    // Method 3: Extract number from end of pathname (/collections/frontpage/2)
    // Only if no filter tag found yet
    if (tagNumbers.length === 0) {
      // Match pattern: /collections/xxx/NUMBER where NUMBER is at the end
      const pathnameNumberMatch = url.match(/\/(\d+)(?:\?|$|#)/);
      if (pathnameNumberMatch) {
        const num = parseInt(pathnameNumberMatch[1], 10);
        if (!isNaN(num) && num > 0 && num <= 10) { // Only accept 1-10 as valid column numbers
          tagNumbers.push(num);
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[menuOrganizer] extractFilterTagNumbers:', {
        url,
        extractedTagNumbers: tagNumbers,
      });
    }
    
    return tagNumbers;
  } catch (error) {
    console.error('[menuOrganizer] Error extracting filter tags:', error);
    return [];
  }
}

/**
 * Get primary filter tag number (first tag number)
 * @param {string} url - URL string
 * @returns {number|null} Primary tag number or null
 */
export function getPrimaryFilterTagNumber(url) {
  const tagNumbers = extractFilterTagNumbers(url);
  return tagNumbers.length > 0 ? tagNumbers[0] : null;
}

/**
 * Check if item is a quick link (e.g., "see all", "mom")
 * @param {string} title - Item title
 * @returns {boolean}
 */
export function isQuickLink(title) {
  if (!title || typeof title !== 'string') return false;
  const normalized = title.toLowerCase().trim();
  const quickLinkPatterns = ['see all', 'see-all', 'mom', 'dad', 'quick link'];
  return quickLinkPatterns.some(pattern => normalized.includes(pattern));
}

/**
 * Organize menu items by filter tags into columns
 * @param {Array} items - Menu items
 * @param {number} maxColumns - Maximum number of columns (from parent item's filter tag)
 * @returns {Object} { quickLinks: Array, columns: Array<{tagNumber: number, title: string, items: Array}>, columnCount: number }
 */
export function organizeMenuItemsByFilterTags(items = [], maxColumns = 4) {
  if (!items || items.length === 0) {
    return { quickLinks: [], columns: [], columnCount: maxColumns };
  }

  // Ensure maxColumns is a valid number between 1 and 10
  const columnCount = Math.max(1, Math.min(10, parseInt(maxColumns, 10) || 4));

  const quickLinks = [];
  const columnMap = new Map(); // Map<number, Array<item>>

  items.forEach((item) => {
    if (!item) return;

    const originalUrl = item.url || item.href || '';
    const tagNumber = getPrimaryFilterTagNumber(originalUrl);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[menuOrganizer] Item: "${item.title}", URL: "${originalUrl}", Tag Number: ${tagNumber}`);
    }

    if (tagNumber !== null && tagNumber > 0 && tagNumber <= columnCount) {
      // Only organize items with tag numbers within the column range
      if (!columnMap.has(tagNumber)) {
        columnMap.set(tagNumber, []);
      }
      columnMap.get(tagNumber).push(item);
    } else if (isQuickLink(item.title)) {
      quickLinks.push(item);
    } else {
      // If no filter tag number and not a quick link, check sub-items
      if (item.items && item.items.length > 0) {
        const subItemsWithTagNumbers = item.items.filter(subItem => {
          const subTagNumber = getPrimaryFilterTagNumber(subItem.url || subItem.href);
          return subTagNumber !== null && subTagNumber > 0 && subTagNumber <= columnCount;
        });

        if (subItemsWithTagNumbers.length > 0) {
          // If sub-items have tag numbers, group them by their tag number
          subItemsWithTagNumbers.forEach(subItem => {
            const subTagNumber = getPrimaryFilterTagNumber(subItem.url || subItem.href);
            if (subTagNumber !== null && subTagNumber > 0 && subTagNumber <= columnCount) {
              if (!columnMap.has(subTagNumber)) {
                columnMap.set(subTagNumber, []);
              }
              columnMap.get(subTagNumber).push(subItem);
            }
          });
        } else {
          // If no tag numbers in sub-items, add to quick links
          quickLinks.push(item);
        }
      } else {
        // No filter tag, no sub-items, not a quick link, add to quick links
        quickLinks.push(item);
      }
    }
  });

  // Create columns array based on columnCount
  const columns = [];
  for (let i = 1; i <= columnCount; i++) {
    if (columnMap.has(i)) {
      columns.push({
        tagNumber: i,
        title: `${i}`, // Header name for the column (just the number)
        items: columnMap.get(i),
      });
    } else {
      // Create empty column to maintain column structure
      columns.push({
        tagNumber: i,
        title: `${i}`,
        items: [],
      });
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[menuOrganizer] Organized menu (${columnCount} columns):`, {
      quickLinks: quickLinks.map(item => item.title),
      columns: columns.map(col => ({ 
        tagNumber: col.tagNumber, 
        title: col.title,
        itemCount: col.items.length,
        titles: col.items.map(i => i.title) 
      })),
    });
  }

  return {
    quickLinks,
    columns,
    columnCount,
  };
}

