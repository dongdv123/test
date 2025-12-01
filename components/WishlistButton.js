import { memo, useCallback } from "react";
import { useWishlist } from "../context/WishlistContext";

function WishlistButton({ product, className }) {
  const { toggleItem, isInWishlist } = useWishlist();

  if (!product) return null;

  const isActive = product.id ? isInWishlist(product.id) : false;

  const handleClick = useCallback(
    (event) => {
      event?.preventDefault();
      event?.stopPropagation();
      toggleItem(product);
    },
    [product, toggleItem],
  );

  const classes = ["wishlist-btn", className, isActive ? "active" : ""].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={isActive}
      aria-label={isActive ? "Remove from wishlist" : "Add to wishlist"}
      onClick={handleClick}
    >
      {isActive ? "♥" : "♡"}
    </button>
  );
}

export default memo(WishlistButton);


