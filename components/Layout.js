import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { useSiteChrome } from "../hooks/useSiteChrome";
import { useRouteLoading } from "../hooks/useRouteLoading";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const AuthModal = dynamic(() => import("./AuthModal"), { ssr: false });
const RouteSkeleton = dynamic(() => import("./RouteSkeleton"), { ssr: false });

const keepShoppingFor = ["golf", "cat", "puzzle", "advent calendar", "tea advent calendar"];
const trendingSearches = ["advent calendar", "golf", "puzzle", "emotional support desk pets", "cat"];
const popularSearches = ["advent calendar", "golf", "puzzle", "cat"];

function NavItem({ item, isActive, onNavClick, closeMenu }) {
  const [isHovered, setIsHovered] = useState(false);
  const hasSubItems = item.items && item.items.length > 0;

  return (
    <div 
      className="nav-item-wrapper" 
      onMouseEnter={() => hasSubItems && setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.href ? (
        <Link
          href={item.href}
          className={`nav-link ${isActive ? "active" : ""} ${hasSubItems ? "has-dropdown" : ""}`}
          onClick={closeMenu}
        >
          {item.title}
          {hasSubItems && <span className="nav-arrow">▼</span>}
        </Link>
      ) : typeof onNavClick === "function" ? (
        <button
          type="button"
          className={`nav-link ${isActive ? "active" : ""} ${hasSubItems ? "has-dropdown" : ""}`}
          disabled={item.disabled}
          onClick={() => !item.disabled && onNavClick(item)}
        >
          {item.title}
          {hasSubItems && <span className="nav-arrow">▼</span>}
        </button>
      ) : (
        <span className={`nav-link ${hasSubItems ? "has-dropdown" : ""}`}>
          {item.title}
          {hasSubItems && <span className="nav-arrow">▼</span>}
        </span>
      )}
      {hasSubItems && isHovered && (
        <div 
          className="nav-dropdown"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="nav-dropdown-content">
            {item.items.map((subItem) => (
              <div key={subItem.id || subItem.title} className="nav-dropdown-section">
                {subItem.href ? (
                  <Link href={subItem.href} className="nav-dropdown-link" onClick={closeMenu}>
                    {subItem.title}
                  </Link>
                ) : (
                  <span className="nav-dropdown-link">{subItem.title}</span>
                )}
                {subItem.items && subItem.items.length > 0 && (
                  <div className="nav-dropdown-submenu">
                    {subItem.items.map((subSubItem) => (
                      <Link
                        key={subSubItem.id || subSubItem.title}
                        href={subSubItem.href || "#"}
                        className="nav-dropdown-sublink"
                        onClick={closeMenu}
                      >
                        {subSubItem.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ navItems = baseNavLinks, activeNavId, onNavClick, children }) {
  const router = useRouter();
  const { menuOpen, toggleMenu, closeMenu, navItems: computedNavItems, footerSections, handleNavClick } = useSiteChrome({
    navItems,
    onNavClick,
  });
  const { isLoading: routeLoading, targetRoute } = useRouteLoading({ delay: 150, minVisible: 300 });
  const { items: wishlistItems } = useWishlist();
  const { items: cartItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const wishlistCount = wishlistItems.length;
  const hasWishlistItems = wishlistCount > 0;
  const wishlistAriaLabel = hasWishlistItems ? `wish list (${wishlistCount})` : "wish list";
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartBadgeCount = cartCount > 0 ? cartCount : undefined;
  const skeletonPath = targetRoute || router?.asPath || "/";
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const searchWrapperRef = useRef(null);

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
                  <span className="menu-toggle-label">shop</span>
                  <span className="menu-toggle-lines" aria-hidden="true">
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
                <span className="material-icons search-icon" style={{ color: "#0c8a68", fontSize: 20 }}>search</span>
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
                  <div className="search-dropdown-input-wrapper" onMouseDown={(e) => e.preventDefault()}>
                    <span className="material-icons search-icon" style={{ color: "#0c8a68", fontSize: 20 }}>search</span>
                    <input 
                      className="search-dropdown-input"
                      placeholder="search for products or for gift ideas..."
                      value={desktopSearchQuery}
                      onChange={(e) => {
                        e.stopPropagation();
                        setDesktopSearchQuery(e.target.value);
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
                  </div>
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
                          {keepShoppingFor.map((item) => (
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
            <div className="nav-list">{computedNavItems.map(renderNavItem)}</div>
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
                closeMobileSearch();
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
                    autoFocus
                  />
                </div>
                <button type="button" className="mobile-search-clear" onClick={() => setMobileSearchQuery("")}>
                  clear
                </button>
              </div>
              <button type="button" className="mobile-search-close" onClick={closeMobileSearch} aria-label="Close search">
                ✕
              </button>
            </form>
            <div className="mobile-search-body">
              <section className="mobile-search-section">
                <p className="mobile-search-heading">KEEP SHOPPING FOR</p>
                <ul>
                  {keepShoppingFor.map((item) => (
                    <li key={`keep-${item}`}>{item}</li>
                  ))}
                </ul>
              </section>
              <div className="mobile-search-columns">
                <section className="mobile-search-section">
                  <p className="mobile-search-heading">TRENDING</p>
                  <ul>
                    {trendingSearches.map((item) => (
                      <li key={`trend-${item}`}>
                        <span aria-hidden="true" className="mobile-search-trend-icon">
                          📈
                        </span>
                        {item}
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
          <div className="footer-col">
            <h4>Sign up for emails</h4>
            <ul>
              <li>New subscribers get a $5 promo code.</li>
              <li>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    // TODO: Add email subscription functionality
                    alert("Email subscription coming soon!");
                  }}
                  style={{ display: "flex", gap: 8, width: "100%" }}
                >
                  <input
                    type="email"
                    style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10, flex: 1 }}
                    placeholder="Email address"
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "12px 24px", whiteSpace: "nowrap" }}>
                    sign up
                  </button>
                </form>
              </li>
            </ul>
          </div>
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

