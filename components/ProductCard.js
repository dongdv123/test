import { memo } from "react";
import Link from "next/link";
import { useProductCard } from "../hooks/useProductCard";
import WishlistButton from "./WishlistButton";

function ProductCard({ product, index = 0, variant = "simple" }) {
  const card = useProductCard(product, index);

  if (variant === "simple") {
    return (
      <article className="slider-card">
        <div className="product-card-body">
          <img src={card.img} alt={card.title} loading="lazy" width="400" height="400" />
          <div className="slider-card-body">
            <h4>{card.title}</h4>
            {card.price && (
              <div className="collection-price-row">
                <span className="price">{card.price}</span>
              </div>
            )}
            {card.rating && (
              <div className="collection-rating-row">
                <span className="star-icons">{card.rating.stars}</span>
                <span className="rating-count">{card.rating.count}</span>
              </div>
            )}
          </div>
          {card.href && <Link href={card.href} className="card-overlay" aria-label={card.title} />}
        </div>
      </article>
    );
  }

  const cardClasses = ["collection-product-card"];
  if (variant === "flat") {
    cardClasses.push("collection-card-flat");
  }

  return (
    <article className={cardClasses.join(" ")}>
      <div className="collection-card-media">
        <span className="collection-badge-top">{card.badgeTop}</span>
        <WishlistButton product={card} />
        <img src={card.img} alt={card.title} loading="lazy" />
      </div>
      <div className="collection-card-body">
        <span className="collection-card-pill">{card.badgePill}</span>
        <h4>{card.title}</h4>
        {card.price && (
          <div className="collection-price-row">
            <span className="price">{card.price}</span>
          </div>
        )}
        {card.rating && (
          <div className="collection-rating-row">
            <span className="star-icons">{card.rating.stars}</span>
            <span className="rating-count">{card.rating.count}</span>
          </div>
        )}
      </div>
      {card.href && <Link href={card.href} className="card-overlay" aria-label={card.title} />}
    </article>
  );
}

export default memo(ProductCard);

