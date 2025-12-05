import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useRef, useMemo } from "react";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { useSiteChrome } from "../hooks/useSiteChrome";
import { useRouteLoading } from "../hooks/useRouteLoading";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { organizeMenuItemsByFilterTags, getPrimaryFilterTagNumber } from "../lib/menuOrganizer";

const AuthModal = dynamic(() => import("./AuthModal"), { ssr: false });
const RouteSkeleton = dynamic(() => import("./RouteSkeleton"), { ssr: false });

const SEARCH_HISTORY_KEY = "search-history";
const MAX_SEARCH_HISTORY = 5;

const trendingSearches = ["advent calendar", "golf", "puzzle", "emotional support desk pets", "cat"];
const popularSearches = ["advent calendar", "golf", "puzzle", "cat"];

function NavItem({ item, isActive, onNavClick, closeMenu, onSubMenuClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(80);
  const hasSubItems = item.items && item.items.length > 0;
  const headerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleMobileClick = (e) => {
    // Only handle mobile click on mobile devices
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      if (hasSubItems && typeof onSubMenuClick === 'function') {
        e.preventDefault();
        onSubMenuClick(item);
      } else if (item.href) {
        closeMenu();
      }
    } else {
      // Desktop: normal link behavior
      closeMenu();
    }
  };

  // Get number of columns from parent item's filter tag
  const parentColumnCount = useMemo(() => {
    const parentUrl = item.url || item.href || '';
    const tagNumber = getPrimaryFilterTagNumber(parentUrl);
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Layout] Parent item "${item.title}":`, {
        url: item.url,
        href: item.href,
        parentUrl,
        extractedTagNumber: tagNumber,
        willUseColumnCount: tagNumber && tagNumber > 0 ? tagNumber : 4,
      });
    }
    
    // If parent has a filter tag number, use it as column count, otherwise default to 4
    return tagNumber && tagNumber > 0 ? tagNumber : 4;
  }, [item.url, item.href, item.title]);

  // Organize menu items by filter tags into columns
  const organizedMenu = useMemo(() => {
    if (!hasSubItems || !item.items) {
      return { quickLinks: [], columns: [], columnCount: parentColumnCount };
    }
    const organized = organizeMenuItemsByFilterTags(item.items, parentColumnCount);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Layout] Organized menu for "${item.title}" (${parentColumnCount} columns):`, {
        parentUrl: item.url || item.href,
        parentColumnCount,
        returnedColumnCount: organized.columnCount,
        quickLinks: organized.quickLinks.map(i => i.title),
        columns: organized.columns.map(col => ({ 
          tagNumber: col.tagNumber, 
          title: col.title,
          itemCount: col.items.length,
          titles: col.items.map(i => i.title) 
        })),
      });
    }
    return organized;
  }, [item.items, hasSubItems, item.title, item.url, item.href, parentColumnCount]);

  // Calculate header height dynamically and update on scroll
  useEffect(() => {
    const calculateHeaderHeight = () => {
      const headerElement = document.querySelector('.header');
      if (headerElement) {
        // Use getBoundingClientRect to get actual position including promo-primary
        const headerRect = headerElement.getBoundingClientRect();
        // Calculate top position: header bottom (no gap)
        setDropdownTop(headerRect.bottom);
      }
    };

    calculateHeaderHeight();
    window.addEventListener('resize', calculateHeaderHeight);
    // Update on scroll to handle promo-primary hiding
    window.addEventListener('scroll', calculateHeaderHeight, { passive: true });
    return () => {
      window.removeEventListener('resize', calculateHeaderHeight);
      window.removeEventListener('scroll', calculateHeaderHeight);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (hasSubItems) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = (e) => {
    // Check if mouse is moving to dropdown
    const relatedTarget = e.relatedTarget;
    if (dropdownRef.current && dropdownRef.current.contains(relatedTarget)) {
      return; // Mouse is moving to dropdown, don't hide
    }
    // Add delay before hiding dropdown to allow mouse to move to dropdown
    hoverTimeoutRef.current = setTimeout(() => {
      // Double check if mouse is still not in dropdown
      if (dropdownRef.current && !dropdownRef.current.matches(':hover')) {
        setIsHovered(false);
      }
    }, 300); // 300ms delay to allow smooth transition
  };

  return (
    <div 
      className="nav-item-wrapper" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.href ? (
        <Link
          href={item.href}
          className={`nav-link ${isActive ? "active" : ""} ${hasSubItems ? "has-dropdown" : ""}`}
          onClick={handleMobileClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {item.title}
        </Link>
      ) : typeof onNavClick === "function" ? (
        <button
          type="button"
          className={`nav-link ${isActive ? "active" : ""} ${hasSubItems ? "has-dropdown" : ""}`}
          disabled={item.disabled}
          onClick={(e) => {
            // Mobile: handle sub-menu click
            if (typeof window !== 'undefined' && window.innerWidth <= 768) {
              if (hasSubItems && typeof onSubMenuClick === 'function') {
                e.preventDefault();
                onSubMenuClick(item);
                return;
              }
            }
            // Desktop: normal behavior
            if (!item.disabled) {
              onNavClick(item);
            }
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {item.title}
        </button>
      ) : (
        <span 
          className={`nav-link ${hasSubItems ? "has-dropdown" : ""}`}
          onClick={typeof window !== 'undefined' && window.innerWidth <= 768 && hasSubItems && typeof onSubMenuClick === 'function' ? () => onSubMenuClick(item) : undefined}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {item.title}
        </span>
      )}
      {hasSubItems && isHovered && (
        <div 
          ref={dropdownRef}
          className="nav-dropdown"
          style={{ top: `${dropdownTop}px` }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setIsHovered(true);
          }}
          onMouseLeave={(e) => {
            // Check if mouse is moving to parent menu item
            const relatedTarget = e.relatedTarget;
            const navItemWrapper = e.currentTarget.closest('.nav-item-wrapper');
            if (navItemWrapper && navItemWrapper.contains(relatedTarget)) {
              return; // Mouse is moving to parent, don't hide
            }
            hoverTimeoutRef.current = setTimeout(() => {
              // Double check if mouse is still not in dropdown or parent
              if (dropdownRef.current && !dropdownRef.current.matches(':hover')) {
                const wrapper = dropdownRef.current.closest('.nav-item-wrapper');
                if (!wrapper || !wrapper.matches(':hover')) {
                  setIsHovered(false);
                }
              }
            }, 300);
          }}
          onMouseMove={() => {
            // Keep dropdown open when mouse is moving inside, even over gaps
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setIsHovered(true);
          }}
        >
          <div className="nav-dropdown-wrapper">
            <div 
              className="nav-dropdown-content"
              style={{ 
                gridTemplateColumns: `repeat(${organizedMenu.columnCount || parentColumnCount}, 1fr)` 
              }}
              data-column-count={organizedMenu.columnCount || parentColumnCount}
            >
              {/* Quick Links Section */}
              {organizedMenu.quickLinks.length > 0 && (
                <div className="nav-dropdown-quicklinks">
                  {organizedMenu.quickLinks.map((quickItem) => (
                    <div key={quickItem.id || quickItem.title} className="nav-dropdown-column-group">
                      {quickItem.href ? (
                        <Link href={quickItem.href} className="nav-dropdown-link" onClick={closeMenu}>
                          <span>{quickItem.title}</span>
                        </Link>
                      ) : (
                        <span className="nav-dropdown-link">
                          <span>{quickItem.title}</span>
                        </span>
                      )}
                      {quickItem.items && quickItem.items.length > 0 && (
                        <div className="nav-dropdown-column-items">
                          {quickItem.items.map((subItem) => (
                            <Link
                              key={subItem.id || subItem.title}
                              href={subItem.href || "#"}
                              className="nav-dropdown-sublink"
                              onClick={closeMenu}
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 4 Columns organized by filter tag numbers */}
              {organizedMenu.columns.map((column) => (
                <div key={column.tagNumber} className="nav-dropdown-column">
                  <div className="nav-dropdown-column-items">
                    {column.items.map((colItem) => (
                      <div key={colItem.id || colItem.title} className="nav-dropdown-column-group">
                        {/* Main menu item */}
                        {colItem.href ? (
                          <Link href={colItem.href} className="nav-dropdown-link" onClick={closeMenu}>
                            <span>{colItem.title}</span>
                          </Link>
                        ) : (
                          <span className="nav-dropdown-link">
                            <span>{colItem.title}</span>
                          </span>
                        )}
                        {/* Sub-items displayed below the main item */}
                        {colItem.items && colItem.items.length > 0 && (
                          <div className="nav-dropdown-column-items">
                            {colItem.items.map((subItem) => (
                              <Link
                                key={subItem.id || subItem.title}
                                href={subItem.href || "#"}
                                className="nav-dropdown-sublink"
                                onClick={closeMenu}
                              >
                                <span>{subItem.title}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Always show featured image section if parent item has image */}
            {item.image && (
              <div className="nav-dropdown-featured">
                <h3 className="nav-dropdown-featured-title">Gifts for {item.title}</h3>
                <div className="nav-dropdown-featured-image-wrapper">
                  <img 
                    src={typeof item.image === 'string' ? item.image : (item.image.src || item.image.url || item.image)} 
                    alt={typeof item.image === 'string' ? item.title : (item.image.altText || item.title)} 
                    className="nav-dropdown-featured-image"
                    loading="lazy"
                  />
                </div>
                <div className="nav-dropdown-featured-content">
                  <p className="nav-dropdown-featured-label">LEADING LADIES</p>
                  {item.href && (
                    <Link href={item.href} className="nav-dropdown-featured-link" onClick={closeMenu}>
                      shop {item.title}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ navItems = baseNavLinks, activeNavId, onNavClick, children }) {
  const router = useRouter();
  const { menuOpen, toggleMenu, closeMenu: originalCloseMenu, navItems: computedNavItems, footerSections, handleNavClick } = useSiteChrome({
    navItems,
    onNavClick,
  });

  const closeMenu = () => {
    setSubMenuStack([]);
    originalCloseMenu();
  };
  const { isLoading: routeLoading, targetRoute } = useRouteLoading({ delay: 150, minVisible: 300 });
  const { items: wishlistItems } = useWishlist();
  const { items: cartItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Only calculate counts after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const wishlistCount = mounted ? wishlistItems.length : 0;
  const hasWishlistItems = mounted && wishlistCount > 0;
  const wishlistAriaLabel = hasWishlistItems ? `wish list (${wishlistCount})` : "wish list";
  const cartCount = mounted ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const cartBadgeCount = mounted && cartCount > 0 ? cartCount : undefined;
  const skeletonPath = targetRoute || router?.asPath || "/";
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [subMenuStack, setSubMenuStack] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const searchWrapperRef = useRef(null);

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed);
        }
      }
    } catch (error) {
      console.warn("Failed to load search history from storage", error);
    }
  }, []);

  // Save search to history
  const addToSearchHistory = (query) => {
    if (!query || !query.trim()) return;
    
    const trimmedQuery = query.trim().toLowerCase();
    if (typeof window === "undefined") return;

    setSearchHistory((prev) => {
      // Remove duplicates and add to beginning
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmedQuery);
      const updated = [trimmedQuery, ...filtered].slice(0, MAX_SEARCH_HISTORY);
      
      // Save to localStorage
      try {
        window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Failed to save search history to storage", error);
      }
      
      return updated;
    });
  };

  // Get keepShoppingFor from search history (fallback to empty array if no history)
  const keepShoppingFor = searchHistory.length > 0 ? searchHistory : [];

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    body.classList.toggle("search-overlay-open", mobileSearchOpen);
    if (!mobileSearchOpen) {
      setMobileSearchQuery("");
    }
    return () => body.classList.remove("search-overlay-open");
  }, [mobileSearchOpen]);

  const closeMobileSearch = () => setMobileSearchOpen(false);
  const closeAuthModal = () => setAuthModalOpen(false);
  const openAuthModal = (mode = "login") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    body.classList.toggle("auth-modal-open", authModalOpen);
    return () => body.classList.remove("auth-modal-open");
  }, [authModalOpen]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    if (!desktopSearchOpen) return;

    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setDesktopSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [desktopSearchOpen]);

  const handleSubMenuClick = (item) => {
    if (item.items && item.items.length > 0) {
      setSubMenuStack(prev => [...prev, item]);
    }
  };

  const handleBackToMainMenu = () => {
    setSubMenuStack(prev => prev.slice(0, -1));
  };

  const handleBackToRoot = () => {
    setSubMenuStack([]);
  };

  const renderNavItem = (item) => {
    const key = item.id || item.title;
    const isActive = activeNavId && key === activeNavId;
    return (
      <NavItem
        key={key}
        item={item}
        isActive={isActive}
        onNavClick={handleNavClick}
        closeMenu={closeMenu}
        onSubMenuClick={handleSubMenuClick}
      />
    );
  };

  return (
    <>
      <div className="promo-primary">
        <strong>Black Friday:</strong> Get FREE personalization on select items to make your gift <em>extra</em> uncommon.{" "}
        <a href="#">SHOP NOW</a>
      </div>

      <header className="header">
        <div className="container">
          <div className="header-top">
            <button
              type="button"
              className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
              onClick={toggleMenu}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="primary-nav"
            >
              {menuOpen ? (
                <span className="menu-close-icon" aria-hidden="true">
                  ✕
                </span>
              ) : (
                <>
                  <span className="menu-toggle-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </>
              )}
            </button>
            <Link href="/" className="logo" aria-label="Gikzo home" onClick={closeMenu}>
              gikzo
            </Link>
            <div className="search-wrapper" ref={searchWrapperRef}>
              <div className={`search ${desktopSearchOpen ? 'search-active' : ''}`} onClick={() => setDesktopSearchOpen(true)}>
                <span className="material-icons search-icon" style={{ color: "#0c8a68", fontSize: 28 }}>search</span>
                <div className="search-placeholder">
                  {desktopSearchQuery || "search for products or for gift ideas..."}
                </div>
                {desktopSearchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDesktopSearchQuery("");
                      setDesktopSearchOpen(true);
                    }}
                  >
                    clear
                  </button>
                )}
              </div>
              {desktopSearchOpen && (
                <div className="search-dropdown">
                  <form
                    className="search-dropdown-input-wrapper"
                    onMouseDown={(e) => e.preventDefault()}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (desktopSearchQuery.trim()) {
                        addToSearchHistory(desktopSearchQuery.trim());
                        router.push(`/search?q=${encodeURIComponent(desktopSearchQuery.trim())}`);
                        setDesktopSearchOpen(false);
                      }
                    }}
                  >
                    <span className="material-icons search-icon" style={{ color: "#0c8a68", fontSize: 28 }}>search</span>
                    <input 
                      className="search-dropdown-input"
                      type="text"
                      placeholder="search for products or for gift ideas..."
                      value={desktopSearchQuery}
                      onChange={(e) => {
                        e.stopPropagation();
                        setDesktopSearchQuery(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (desktopSearchQuery.trim()) {
                            addToSearchHistory(desktopSearchQuery.trim());
                            router.push(`/search?q=${encodeURIComponent(desktopSearchQuery.trim())}`);
                            setDesktopSearchOpen(false);
                          }
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    {desktopSearchQuery && (
                      <button
                        type="button"
                        className="search-clear"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDesktopSearchQuery("");
                        }}
                      >
                        clear
                      </button>
                    )}
                  </form>
                  {desktopSearchQuery.trim() ? (
                    <div className="search-suggestions">
                      <p className="search-suggestion-label">Search results for "{desktopSearchQuery}"</p>
                      <Link 
                        href={`/search?q=${encodeURIComponent(desktopSearchQuery)}`}
                        className="search-suggestion-item"
                        onClick={() => setDesktopSearchOpen(false)}
                      >
                        <span className="material-icons">search</span>
                        <span>Search for "{desktopSearchQuery}"</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="search-suggestions search-suggestions-columns">
                      <section className="search-suggestion-section">
                        <p className="search-suggestion-label">KEEP SHOPPING FOR</p>
                        <div className="search-suggestion-items">
                          {keepShoppingFor.length > 0 ? (
                            keepShoppingFor.map((item) => (
                              <Link
                                key={item}
                                href={`/search?q=${encodeURIComponent(item)}`}
                                className="search-suggestion-item"
                                onClick={() => {
                                  addToSearchHistory(item);
                                  setDesktopSearchOpen(false);
                                  setDesktopSearchQuery("");
                                }}
                              >
                                {item}
                              </Link>
                            ))
                          ) : (
                            <p style={{ color: '#999', fontSize: '14px', padding: '8px 0' }}>No search history yet</p>
                          )}
                        </div>
                      </section>
                      <section className="search-suggestion-section">
                        <p className="search-suggestion-label">TRENDING</p>
                        <div className="search-suggestion-items">
                          {trendingSearches.map((item) => (
                            <Link
                              key={item}
                              href={`/search?q=${encodeURIComponent(item)}`}
                              className="search-suggestion-item"
                              onClick={() => {
                                setDesktopSearchOpen(false);
                                setDesktopSearchQuery("");
                              }}
                            >
                              <span className="material-icons trending-icon">trending_up</span>
                              <span>{item}</span>
                            </Link>
                          ))}
                        </div>
                      </section>
                      <section className="search-suggestion-section">
                        <p className="search-suggestion-label">MOST POPULAR</p>
                        <div className="search-suggestion-items">
                          {popularSearches.map((item) => (
                            <Link
                              key={item}
                              href={`/search?q=${encodeURIComponent(item)}`}
                              className="search-suggestion-item"
                              onClick={() => {
                                setDesktopSearchOpen(false);
                                setDesktopSearchQuery("");
                              }}
                            >
                              {item}
                            </Link>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="header-mobile-icons">
              <button type="button" aria-label="search" className="mobile-icon-btn" onClick={() => setMobileSearchOpen(true)}>
                <span className="material-icons">search</span>
              </button>
              <Link className="mobile-icon-btn cart-badge" data-count={cartBadgeCount} href="/cart" aria-label="cart">
                <span className="material-icons">shopping_cart</span>
              </Link>
            </div>
            <div className="header-icons">
              {isAuthenticated ? (
                <Link className="header-icon" href="/profile">
                  <span className="material-icons" aria-hidden="true">account_circle</span>
                  <span className="header-icon-label">{user?.name || "profile"}</span>
                </Link>
              ) : (
                <button type="button" className="header-icon" onClick={() => openAuthModal("login")}>
                  <span className="material-icons" aria-hidden="true">person</span>
                  <span className="header-icon-label">sign in</span>
                </button>
              )}
              <Link
                className="header-icon wishlist-link cart-badge"
                href="/wishlist"
                data-count={hasWishlistItems ? wishlistCount : undefined}
                aria-label={wishlistAriaLabel}
              >
                <span className="material-icons" aria-hidden="true">favorite_border</span>
                <span className="header-icon-label">wish list</span>
              </Link>
              <Link href="/gift-finder" className="header-icon">
                <span className="material-icons" aria-hidden="true">card_giftcard</span>
                <span className="header-icon-label">gift finder</span>
              </Link>
              <Link href="/bundle-builder" className="header-icon">
                <span className="material-icons" aria-hidden="true">inventory_2</span>
                <span className="header-icon-label">bundle builder</span>
              </Link>
              <Link className="header-icon cart-badge" data-count={cartBadgeCount} href="/cart">
                <span className="material-icons" aria-hidden="true">shopping_cart</span>
                <span className="header-icon-label">cart</span>
              </Link>
            </div>
          </div>
          <nav className="nav" id="primary-nav">
            <div className="nav-mobile-actions">
              {isAuthenticated ? (
                <Link href="/profile" className="nav-mobile-action">
                  <span className="material-icons" aria-hidden="true">account_circle</span> Hi, {user?.name?.split(" ")[0] || "User"}
                </Link>
              ) : (
                <button type="button" className="nav-mobile-action" onClick={() => openAuthModal("login")}>
                  <span className="material-icons" aria-hidden="true">person</span> sign in
                </button>
              )}
              <Link href="/wishlist" className="nav-mobile-action wishlist-link">
                <span className="material-icons" aria-hidden="true">favorite_border</span> wish list
                {hasWishlistItems && <span className="wishlist-count">{wishlistCount}</span>}
              </Link>
              <Link href="/gift-finder" className="nav-mobile-action" onClick={closeMenu}>
                <span className="material-icons" aria-hidden="true">card_giftcard</span> gift finder
              </Link>
              <Link href="/bundle-builder" className="nav-mobile-action" onClick={closeMenu}>
                <span className="material-icons" aria-hidden="true">inventory_2</span> bundle builder
              </Link>
            </div>
            <div className="nav-list-wrapper">
              <div className={`nav-list ${subMenuStack.length > 0 ? 'nav-list-hidden' : 'nav-list-visible'}`}>
                {computedNavItems.map(renderNavItem)}
              </div>
              {subMenuStack.map((subMenu, index) => {
                const isActive = index === subMenuStack.length - 1;
                return (
                  <div
                    key={`${subMenu.id || subMenu.title}-${index}`}
                    className={`nav-submenu ${isActive ? 'nav-submenu-visible' : 'nav-submenu-hidden'}`}
                  >
                    <button
                      type="button"
                      className="nav-submenu-back"
                      onClick={index === 0 ? handleBackToRoot : handleBackToMainMenu}
                    >
                      <span className="material-icons">arrow_back</span>
                      <span>{subMenu.title}</span>
                    </button>
                    <div className="nav-submenu-list">
                      {subMenu.items && subMenu.items.map((subItem) => {
                        const hasSubItems = subItem.items && subItem.items.length > 0;
                        return hasSubItems ? (
                          <button
                            key={subItem.id || subItem.title}
                            type="button"
                            className="nav-submenu-link nav-submenu-link-with-children"
                            onClick={() => handleSubMenuClick(subItem)}
                          >
                            <span>{subItem.title}</span>
                            <span className="material-icons">chevron_right</span>
                          </button>
                        ) : (
                          <Link
                            key={subItem.id || subItem.title}
                            href={subItem.href || "#"}
                            className="nav-submenu-link"
                            onClick={closeMenu}
                          >
                            {subItem.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="mobile-search-overlay" role="dialog" aria-modal="true">
          <div className="mobile-search-panel">
            <form
              className="mobile-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (mobileSearchQuery.trim()) {
                  addToSearchHistory(mobileSearchQuery.trim());
                  router.push(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
                  closeMobileSearch();
                } else {
                  closeMobileSearch();
                }
              }}
            >
              <div className="mobile-search-input">
                <div className="mobile-search-input-row">
                  <span className="material-icons" aria-hidden="true">search</span>
                  <textarea
                    rows={2}
                    placeholder="geeky husband, budget is $100"
                    value={mobileSearchQuery}
                    onChange={(event) => setMobileSearchQuery(event.target.value)}
                    onKeyDown={(e) => {
                      // Submit on Enter (without Ctrl/Cmd)
                      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault();
                        if (mobileSearchQuery.trim()) {
                          addToSearchHistory(mobileSearchQuery.trim());
                          router.push(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
                          closeMobileSearch();
                        }
                      }
                      // Allow Ctrl+Enter or Cmd+Enter for new line
                    }}
                    autoFocus
                  />
                  <button type="button" className="mobile-search-close" onClick={closeMobileSearch} aria-label="Close search">
                    ✕
                  </button>
                </div>
                <button type="button" className="mobile-search-clear" onClick={() => setMobileSearchQuery("")}>
                  clear
                </button>
              </div>
            </form>
            <div className="mobile-search-body">
              <section className="mobile-search-section">
                <p className="mobile-search-heading">KEEP SHOPPING FOR</p>
                <ul>
                  {keepShoppingFor.length > 0 ? (
                    keepShoppingFor.map((item) => (
                      <li key={`keep-${item}`}>
                        <Link 
                          href={`/search?q=${encodeURIComponent(item)}`}
                          onClick={() => {
                            addToSearchHistory(item);
                            closeMobileSearch();
                          }}
                        >
                          {item}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li style={{ color: '#999', fontSize: '14px' }}>No search history yet</li>
                  )}
                </ul>
              </section>
              <div className="mobile-search-columns">
                <section className="mobile-search-section">
                  <p className="mobile-search-heading">TRENDING</p>
                  <ul>
                    {trendingSearches.map((item) => (
                      <li key={`trend-${item}`}>
                        <Link 
                          href={`/search?q=${encodeURIComponent(item)}`}
                          onClick={() => {
                            addToSearchHistory(item);
                            closeMobileSearch();
                          }}
                        >
                          <span className="material-icons mobile-search-trend-icon">trending_up</span>
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="mobile-search-section">
                  <p className="mobile-search-heading">MOST POPULAR</p>
                  <ul>
                    {popularSearches.map((item) => (
                      <li key={`popular-${item}`}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      <main aria-busy={routeLoading}>
        {routeLoading ? <RouteSkeleton pathname={skeletonPath} /> : children}
      </main>

      <footer className="">
        <div className="footer-email-signup">
          <h4>Sign up for emails</h4>
          <p>New subscribers get a $5 promo code.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const email = formData.get("email");
              
              if (!email) return;

              setEmailSubmitting(true);
              setEmailMessage("");

              try {
                const response = await fetch("/api/newsletter/subscribe", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email }),
                });

                const data = await response.json();

                if (response.ok) {
                  setEmailMessage(data.message || "Successfully subscribed!");
                  e.target.reset();
                } else {
                  setEmailMessage(data.message || "Failed to subscribe. Please try again.");
                }
              } catch (error) {
                console.error("Subscription error:", error);
                setEmailMessage("Something went wrong. Please try again later.");
              } finally {
                setEmailSubmitting(false);
              }
            }}
            className="footer-email-form"
          >
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              disabled={emailSubmitting}
            />
            <button type="submit" className="btn btn-primary" disabled={emailSubmitting}>
              {emailSubmitting ? "signing up..." : "sign up"}
            </button>
          </form>
          {emailMessage && (
            <p className={`footer-email-message ${emailMessage.includes("Successfully") || emailMessage.includes("already subscribed") ? "success" : "error"}`}>
              {emailMessage}
            </p>
          )}
        </div>
        <div className="footer-top">
          {footerSections.map((section) => (
            <div className="footer-col" key={section.title}>
              <h4>{section.title}</h4>
              <ul>
                {section.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="footer-bottom">
          Shipping to: 🇻🇳 · change · ©2025 Uncommon Goods™ LLC · 888-365-0056 · Brooklyn, NY
        </p>
        </footer>

      <AuthModal
        open={authModalOpen}
        mode={authMode}
        onClose={closeAuthModal}
        onSwitch={setAuthMode}
      />
    </>
  );
}

