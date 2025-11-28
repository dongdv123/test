import Link from "next/link";
import { navLinks as baseNavLinks } from "../lib/siteContent";
import { useSiteChrome } from "../hooks/useSiteChrome";

export default function Layout({ navItems = baseNavLinks, activeNavId, onNavClick, children }) {
  const { menuOpen, toggleMenu, closeMenu, navItems: computedNavItems, footerSections, handleNavClick } =
    useSiteChrome({
      navItems,
      onNavClick,
    });

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
            <div className="logo">
              <span>✶</span> uncommon goods
            </div>
            <label className="search">
              <span style={{ color: "#0c8a68", fontSize: 20 }}>🔍</span>
              <input placeholder="search | gifts for mom who likes beer, books, and gardening" />
            </label>
            <div className="header-mobile-icons">
              <button type="button" aria-label="favorites" className="mobile-icon-btn sparkle">
                ✦
              </button>
              <button type="button" aria-label="search" className="mobile-icon-btn">
                🔍
              </button>
              <a className="mobile-icon-btn cart-badge" data-count="3" href="#" aria-label="cart">
                🛒
              </a>
            </div>
            <div className="header-icons">
              <a className="header-icon" href="#">
                <span aria-hidden="true">👤</span>
                <span className="header-icon-label">sign in</span>
              </a>
              <Link className="header-icon" href="/wishlist">
                <span aria-hidden="true">🤍</span>
                <span className="header-icon-label">wish list</span>
              </Link>
              <a className="header-icon" href="#">
                <span aria-hidden="true">🎁</span>
                <span className="header-icon-label">gift finder</span>
              </a>
              <a className="header-icon cart-badge" data-count="3" href="#">
                <span aria-hidden="true">🛒</span>
                <span className="header-icon-label">cart</span>
              </a>
            </div>
          </div>
          <nav className="nav" id="primary-nav">
            <div className="nav-mobile-actions">
              <a href="#" className="nav-mobile-action">
                <span aria-hidden="true">👤</span> sign in
              </a>
              <Link href="/wishlist" className="nav-mobile-action">
                <span aria-hidden="true">🤍</span> wish list
              </Link>
              <a href="#" className="nav-mobile-action">
                <span aria-hidden="true">🎁</span> gift finder
              </a>
            </div>
            <div className="nav-list">{computedNavItems.map(renderNavItem)}</div>
          </nav>
        </div>
      </header>

      <main>{children}</main>

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
    </>
  );
}

