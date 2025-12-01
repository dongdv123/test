import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

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

  const renderNavItem = (item) => {
    const key = item.id || item.title;
    const isActive = activeNavId && key === activeNavId;

    if (typeof onNavClick === "function" && !item.href) {
      const disabled = item.disabled;
      return (
        <button
          key={key}
          type="button"
          className={`nav-link ${isActive ? "active" : ""}`}
          disabled={disabled}
          onClick={() => !disabled && handleNavClick(item)}
        >
          {item.title}
        </button>
      );
    }

    if (item.href) {
      return (
        <Link
          key={key}
          href={item.href}
          className={`nav-link ${isActive ? "active" : ""}`}
          onClick={closeMenu}
        >
          {item.title}
        </Link>
      );
    }

    return (
      <span key={key} className="nav-link">
        {item.title}
      </span>
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
            <label className="search">
              <span style={{ color: "#0c8a68", fontSize: 20 }}>🔍</span>
              <input placeholder="search | gifts for mom who likes beer, books, and gardening" />
            </label>
            <div className="header-mobile-icons">
              <button type="button" aria-label="search" className="mobile-icon-btn" onClick={() => setMobileSearchOpen(true)}>
                🔍
              </button>
              <Link className="mobile-icon-btn cart-badge" data-count={cartBadgeCount} href="/cart" aria-label="cart">
                🛒
              </Link>
            </div>
            <div className="header-icons">
              {isAuthenticated ? (
                <Link className="header-icon" href="/profile">
                  <span aria-hidden="true">📇</span>
                  <span className="header-icon-label">{user?.name || "profile"}</span>
                </Link>
              ) : (
                <button type="button" className="header-icon" onClick={() => openAuthModal("login")}>
                  <span aria-hidden="true">👤</span>
                  <span className="header-icon-label">sign in</span>
                </button>
              )}
              <Link
                className="header-icon wishlist-link cart-badge"
                href="/wishlist"
                data-count={hasWishlistItems ? wishlistCount : undefined}
                aria-label={wishlistAriaLabel}
              >
                <span aria-hidden="true">🤍</span>
                <span className="header-icon-label">wish list</span>
              </Link>
              <a className="header-icon" href="#">
                <span aria-hidden="true">🎁</span>
                <span className="header-icon-label">gift finder</span>
              </a>
              <Link className="header-icon cart-badge" data-count={cartBadgeCount} href="/cart">
                <span aria-hidden="true">🛒</span>
                <span className="header-icon-label">cart</span>
              </Link>
            </div>
          </div>
          <nav className="nav" id="primary-nav">
            <div className="nav-mobile-actions">
              {isAuthenticated ? (
                <Link href="/profile" className="nav-mobile-action">
                  <span aria-hidden="true">👤</span> Hi, {user?.name?.split(" ")[0] || "User"}
                </Link>
              ) : (
                <button type="button" className="nav-mobile-action" onClick={() => openAuthModal("login")}>
                  <span aria-hidden="true">👤</span> sign in
                </button>
              )}
              <Link href="/wishlist" className="nav-mobile-action wishlist-link">
                <span aria-hidden="true">🤍</span> wish list
                {hasWishlistItems && <span className="wishlist-count">{wishlistCount}</span>}
              </Link>
              <a href="#" className="nav-mobile-action">
                <span aria-hidden="true">🎁</span> gift finder
              </a>
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
                  <span aria-hidden="true">🔍</span>
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
                <input
                  style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 10, width: "100%" }}
                  placeholder="Email address"
                />
              </li>
              <li>
                <button className="btn btn-primary" style={{ padding: "12px 24px" }}>
                  sign up
                </button>
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

