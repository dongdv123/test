import { useEffect, useMemo, useState } from "react";
import { footerSections } from "../lib/siteContent";

export const useSiteChrome = ({ navItems = [], onNavClick } = {}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  const computedNavItems = useMemo(() => navItems, [navItems]);

  const handleNavClick = (item) => {
    if (typeof onNavClick === "function") {
      onNavClick(item);
    }
    setMenuOpen(false);
  };

  return {
    menuOpen,
    toggleMenu: () => setMenuOpen((prev) => !prev),
    closeMenu: () => setMenuOpen(false),
    navItems: computedNavItems,
    footerSections,
    handleNavClick,
  };
};

