import { useWishlist } from "../context/WishlistContext";

export default function WishlistButton({ product, className }) {
  const { toggleItem, isInWishlist } = useWishlist();

  if (!product) return null;

  const isActive = product.id ? isInWishlist(product.id) : false;

  const handleClick = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    toggleItem(product);
  };

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


